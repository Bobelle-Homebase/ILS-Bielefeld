// ==UserScript==
// @name         Dashboard Credits Counter
// @namespace    https://leitstellenspiel.de/dashboard
// @version      v1.0.13
// @author       Design by Bobelle
// @description  Zeigt Tageszähler, Credits-Bilanz und Dienstgrad im Navbar-Bereich
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Credits%20Counter.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Credits%20Counter.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ========================================================
  // Helfer
  // ========================================================
  const IS_TOP = window.top === window;

  // Trailing Slashes ignorieren (/map/ == /map)
  const isMainPage = () => {
    if (!IS_TOP) return false;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/' || path === '/index.php' || path === '/map';
  };

  // Sicherer localStorage-Zugriff (voller / blockierter Speicher wirft sonst Exceptions)
  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); return true; } catch { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
  };

  const getNavbarBrand = () =>
    document.querySelector('.navbar .navbar-brand') || document.querySelector('.navbar-brand');

  const NAV_ORDER = { DAILY: 20, CREDITS: 30 };

  const normalizeText = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  // LOKALES Datum (nicht UTC!) -> YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const getTodayKey = getTodayString;

  // Kalendertage zwischen zwei YYYY-MM-DD-Strings (zeitumstellungssicher)
  const diffInDays = (a, b) => {
    const toUtc = (s) => {
      const [y, m, d] = s.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    };
    return Math.round((toUtc(b) - toUtc(a)) / 86400000);
  };

  const formatNumber = (num) => Number(num).toLocaleString('de-DE');

  // =========================================================
  // Tab-Titel fix (nur im Hauptfenster)
  // =========================================================
  const TARGET_TITLE = 'Leitstelle Bielefeld';

  function initTitleFix() {
    if (!IS_TOP) return;
    try {
      let titleEl = document.querySelector('title');
      if (!titleEl) {
        titleEl = document.createElement('title');
        document.head.appendChild(titleEl);
      }
      titleEl.textContent = TARGET_TITLE;

      const observer = new MutationObserver(() => {
        if (titleEl.textContent !== TARGET_TITLE) titleEl.textContent = TARGET_TITLE;
      });
      observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    } catch (e) {
      console.error('Titel-Fix Fehler:', e);
    }
  }

  // =========================================================
  // Navbar-Wrapper
  // =========================================================
  function getBielefeldWrapper() {
    if (!isMainPage()) return null;

    const brand = getNavbarBrand();
    if (!brand) return null;

    let wrapper = document.getElementById('bielefeld-navbar-wrapper');
    if (wrapper) return wrapper;

    let origContainer = document.getElementById('bielefeld-original-brand');
    if (!origContainer) {
      origContainer = document.createElement('span');
      origContainer.id = 'bielefeld-original-brand';
      while (brand.firstChild) origContainer.appendChild(brand.firstChild);
      brand.appendChild(origContainer);
    }

    Object.assign(origContainer.style, {
      opacity: '1',
      pointerEvents: 'auto',
      position: 'static',
      width: 'auto',
      height: 'auto',
      overflow: 'visible',
      display: 'flex',
      alignItems: 'center'
    });

    Object.assign(brand.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginLeft: '0',
      padding: '0 5px',
      position: 'relative',
      gap: '10px'
    });

    wrapper = document.createElement('div');
    wrapper.id = 'bielefeld-navbar-wrapper';
    Object.assign(wrapper.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      columnGap: '10px'
    });

    brand.appendChild(wrapper);
    return wrapper;
  }

  // =========================================================
  // 1) Tageszähler
  // =========================================================
  const DAILY_CONFIG = {
    storageKey: 'lss_daily_mission_counter',
    labelToday: 'Einsätze heute:',
    labelRecord: 'Gestern:',
    align: 'left',
    width: '130px',
    height: 'auto',
    columnGap: '0px',

    line1FontSize: '13px',
    line1Color: 'yellow',
    line2FontSize: '11px',
    line2Color: '#ffffff',
    line1NumberColor: '#ffffff',
    line1NumberFontSize: '14px',
    line2NumberColor: '#ffffff',
    line2NumberFontSize: '12px',
    numberFontWeight: 'bold',

    // Der Alarm im Spiel läuft meist als Formular-Submit im Einsatz-iFrame
    // (kein fetch/XHR). Deshalb bleibt der Klick-Zähler aktiv, ist aber
    // jetzt exakt (Text muss GENAU einem Eintrag entsprechen).
    useClickCounter: true,
    buttons: ['alarmieren', 'einsatz starten', 'mission starten', 'alarmieren und zurück', 'alarmieren und zum nächsten einsatz'],

    // Mindestabstand zwischen zwei Zählungen (verhindert Doppelzählung
    // durch Klick + Netzwerk-Hook für denselben Alarm)
    dedupeMs: 4000
  };

  const DAILY_STORAGE_KEY = DAILY_CONFIG.storageKey;

  function loadDailyState() {
    const today = getTodayString();
    const empty = { date: today, count: 0, prevDate: null, prevCount: 0 };
    try {
      const data = JSON.parse(store.get(DAILY_STORAGE_KEY));
      return data && data.date ? data : empty;
    } catch {
      return empty;
    }
  }

  let dailyState = loadDailyState();
  const dailyUi = { count: null, record: null };

  function saveDailyState() {
    store.set(DAILY_STORAGE_KEY, JSON.stringify(dailyState));
  }

  function updateDailyDisplay() {
    if (dailyUi.count) dailyUi.count.textContent = String(dailyState.count);
    if (dailyUi.record) dailyUi.record.textContent = String(dailyState.prevCount);
  }

  function checkDailyDayReset() {
    // Frischen Stand holen (iFrame und Hauptfenster teilen sich localStorage)
    dailyState = loadDailyState();

    const today = getTodayString();
    if (dailyState.date === today) return;

    if (diffInDays(dailyState.date, today) === 1) {
      dailyState.prevDate = dailyState.date;
      dailyState.prevCount = dailyState.count;
    } else {
      dailyState.prevDate = null;
      dailyState.prevCount = 0;
    }

    dailyState.date = today;
    dailyState.count = 0;
    saveDailyState();
    updateDailyDisplay();
  }

  function injectDailyStyles() {
    if (document.getElementById('lss-daily-counter-style')) return;

    const textAlign =
      DAILY_CONFIG.align === 'right' ? 'right' :
      DAILY_CONFIG.align === 'center' ? 'center' : 'left';

    const line1NumSize = DAILY_CONFIG.line1NumberFontSize || DAILY_CONFIG.line1FontSize;
    const line2NumSize = DAILY_CONFIG.line2NumberFontSize || DAILY_CONFIG.line2FontSize;

    const css = `
      #lss-daily-counter {
        display: inline-grid;
        grid-template-columns: auto max-content;
        column-gap: ${DAILY_CONFIG.columnGap};
        row-gap: 0;
        align-items: baseline;
        margin: 0;
        width: ${DAILY_CONFIG.width};
        height: ${DAILY_CONFIG.height};
        line-height: 1.2;
        cursor: help;
        text-align: ${textAlign};
      }
      .lss-dc-label.line1 { color: ${DAILY_CONFIG.line1Color}; font-size: ${DAILY_CONFIG.line1FontSize}; }
      .lss-dc-label.line2 { color: ${DAILY_CONFIG.line2Color}; font-size: ${DAILY_CONFIG.line2FontSize}; }
      .lss-dc-val {
        font-weight: ${DAILY_CONFIG.numberFontWeight};
        text-align: right;
        min-width: 30px;
      }
      .lss-dc-val.line1-val { color: ${DAILY_CONFIG.line1NumberColor}; font-size: ${line1NumSize}; }
      .lss-dc-val.line2-val { color: ${DAILY_CONFIG.line2NumberColor}; font-size: ${line2NumSize}; }
      @media (max-width: 767px) { #lss-daily-counter { font-size: 0.8em; } }
    `;

    const style = document.createElement('style');
    style.id = 'lss-daily-counter-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildDailyUI(attempt = 0) {
    if (!isMainPage()) return;

    const wrapper = getBielefeldWrapper();
    if (!wrapper) {
      if (attempt < 40) setTimeout(() => buildDailyUI(attempt + 1), 300); // max. ~12 s
      return;
    }
    if (document.getElementById('lss-daily-counter')) return;

    injectDailyStyles();

    const container = document.createElement('div');
    container.id = 'lss-daily-counter';
    container.title = 'Zählt alarmierte/gestartete Einsätze (inkl. AAO/AOO)';
    container.style.order = NAV_ORDER.DAILY;

    const label1 = document.createElement('div');
    label1.className = 'lss-dc-label line1';
    label1.textContent = DAILY_CONFIG.labelToday;

    dailyUi.count = document.createElement('div');
    dailyUi.count.className = 'lss-dc-val line1-val';
    dailyUi.count.textContent = String(dailyState.count);

    const label2 = document.createElement('div');
    label2.className = 'lss-dc-label line2';
    label2.textContent = DAILY_CONFIG.labelRecord;

    dailyUi.record = document.createElement('div');
    dailyUi.record.className = 'lss-dc-val line2-val';
    dailyUi.record.textContent = String(dailyState.prevCount);

    container.append(label1, dailyUi.count, label2, dailyUi.record);
    wrapper.appendChild(container);
  }

  let lastDailyCountAt = 0;
  function countDailyOnce() {
    const now = Date.now();
    if (now - lastDailyCountAt < DAILY_CONFIG.dedupeMs) return;
    lastDailyCountAt = now;

    checkDailyDayReset(); // lädt auch den aktuellen Stand
    dailyState.count++;
    saveDailyState();
    updateDailyDisplay();
  }

  const DAILY_TRIGGERS = new Set(DAILY_CONFIG.buttons.map(normalizeText));

  function urlLooksLikeAlarm(url) {
    try {
      const u = new URL(url, location.origin);
      const p = (u.pathname || '').toLowerCase();

      if (/\/missions?\/\d+\/alarm/.test(p)) return true;
      if (p.includes('aao') && p.includes('alarm')) return true;

      return false;
    } catch {
      return false;
    }
  }

  // Hooks laufen bewusst auch im Einsatz-iFrame (dort passiert der Alarm).
  function hookFetchAlarmCounter() {
    if (!window.fetch || window.fetch.__bielefeldDailyWrapped) return;

    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const res = await originalFetch.apply(this, arguments);

      try {
        const url =
          typeof input === 'string' ? input :
          (input && input.url) ? input.url : '';

        const method = (init && init.method ? init.method : (input && input.method) || 'GET').toUpperCase();

        if (method !== 'GET' && urlLooksLikeAlarm(url) && res && res.ok) {
          countDailyOnce();
        }
      } catch { /* ignore */ }

      return res;
    };

    window.fetch.__bielefeldDailyWrapped = true;
  }

  function hookXHRAlarmCounter() {
    if (XMLHttpRequest.prototype.__bielefeldDailyWrapped) return;

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      try {
        this.__bielefeld_method = method ? String(method).toUpperCase() : 'GET';
        this.__bielefeld_url = url ? String(url) : '';
      } catch { /* ignore */ }
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      try {
        this.addEventListener('load', () => {
          try {
            const method = this.__bielefeld_method || 'GET';
            const url = this.__bielefeld_url || '';

            if (method === 'GET') return;
            if (!urlLooksLikeAlarm(url)) return;

            if (this.status >= 200 && this.status < 400) countDailyOnce();
          } catch { /* ignore */ }
        });
      } catch { /* ignore */ }

      return origSend.apply(this, arguments);
    };

    XMLHttpRequest.prototype.__bielefeldDailyWrapped = true;
  }

  // Exakter Treffer statt "includes": "Alarmierungsregeln" o. ä. zählt nicht mehr.
  function handleDailyClickFallback(e) {
    const el = e.target.closest && e.target.closest('a, button, input[type="submit"], input[type="button"]');
    if (!el) return;

    const candidates = [el.textContent, el.value, el.getAttribute('aria-label')]
      .filter(Boolean)
      .map(normalizeText);

    if (candidates.some(t => DAILY_TRIGGERS.has(t))) {
      countDailyOnce();
    }
  }

  function scheduleDailyReset() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    setTimeout(() => {
      checkDailyDayReset();
      scheduleDailyReset();
    }, Math.max(1000, next.getTime() - now.getTime()));
  }

  function initDailyCounterModule() {
    // Zähl-Hooks überall (Hauptfenster + iFrames)
    hookFetchAlarmCounter();
    hookXHRAlarmCounter();
    if (DAILY_CONFIG.useClickCounter) {
      document.addEventListener('click', handleDailyClickFallback, true);
    }

    // Anzeige nur im Hauptfenster
    if (!IS_TOP) return;

    checkDailyDayReset();
    buildDailyUI();
    scheduleDailyReset();

    window.addEventListener('storage', (e) => {
      if (e.key !== DAILY_STORAGE_KEY) return;
      dailyState = loadDailyState();
      updateDailyDisplay();
    });
  }

  // =========================================================
  // 2) Credits
  // =========================================================
  const CREDITS_CONFIG = {
    resetHour: 0,
    resetMinute: 0,
    clickOpensDaily: true,
    removeAllBadges: false,
    scale: 1.0,

    // Zeile 1 (Label)
    line1FontSize: '12px',
    line1Color: 'yellow',
    line1FontWeight: 'normal',

    // Zeile 2 (Wert)
    line2FontSize: '12px',
    line2FontWeight: 'bold',

    // Abstand Zeile1 -> Zeile2
    lineGap: '2px',

    // Hilfe
    showHelp: true,
    helpText: {
      bilanz: 'Zeile 1: line1FontSize / line1Color\nZeile 2: line2FontSize + Farben unten',
      einnahme: 'Zeile 1: line1FontSize / line1Color\nZeile 2: line2FontSize + Farben unten',
      ausgabe: 'Zeile 1: line1FontSize / line1Color\nZeile 2: line2FontSize + Farben unten'
    },

    bilanzPositiveColor: '#40ff00',
    bilanzNegativeColor: '#ff3333',
    einnahmeColor: '#40ff00',
    ausgabeColor: '#ff3333',

    // OPTIONAL: fixe Farben (überschreiben dynamisch)
    // line2BilanzColor: '#ffffff',
    // line2EinColor: '#ffffff',
    // line2AusColor: '#ffffff',

    boxWidth: '210px',
    boxHeight: 'auto',
    boxPadding: '4px 8px',

    refreshIntervalMs: 300000
  };

  const CREDITS_CACHE_KEY = 'credits_daily_cache';
  const CREDITS_LAST_RESET_KEY = 'credits_daily_last_reset';

  function resetCreditsDailyDataIfNeeded() {
    const now = new Date();
    const todayKey = getTodayKey();
    const lastReset = store.get(CREDITS_LAST_RESET_KEY);

    const resetToday = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(),
      CREDITS_CONFIG.resetHour, CREDITS_CONFIG.resetMinute, 0, 0
    );

    if (lastReset === todayKey) return false;
    if (now < resetToday) return false;

    store.remove(CREDITS_CACHE_KEY);
    store.set(CREDITS_LAST_RESET_KEY, todayKey);
    return true;
  }

  function removeCreditsBox() {
    document.getElementById('lss-credits-draggable-box')?.remove();
  }

  function removeNavbarWatermarks() {
    if (!isMainPage()) return;
    const navbar = document.querySelector('#navbar-main-collapse');
    if (!navbar) return;

    navbar.querySelectorAll('.watermark, .nav-watermark, .lssm-watermark').forEach(el => el.remove());
    navbar.querySelectorAll('img[alt*="Wasserzeichen"], img[src*="watermark"]').forEach(el => el.remove());

    if (CREDITS_CONFIG.removeAllBadges) {
      navbar.querySelectorAll('.badge, .label').forEach(el => el.remove());
    }
  }

  // Baut ein Label/Wert-Paar per DOM-API (kein innerHTML, kein Escaping-Problem)
  function buildCreditsItem(label, valueText, valueColor, helpText) {
    const item = document.createElement('div');
    Object.assign(item.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      lineHeight: '1.1'
    });
    if (helpText) item.setAttribute('title', helpText);

    const l = document.createElement('span');
    Object.assign(l.style, {
      fontSize: CREDITS_CONFIG.line1FontSize,
      color: CREDITS_CONFIG.line1Color,
      fontWeight: CREDITS_CONFIG.line1FontWeight,
      textTransform: 'uppercase',
      marginBottom: CREDITS_CONFIG.lineGap
    });
    l.textContent = label;

    const v = document.createElement('span');
    Object.assign(v.style, {
      fontSize: CREDITS_CONFIG.line2FontSize,
      fontWeight: CREDITS_CONFIG.line2FontWeight,
      color: valueColor
    });
    v.textContent = valueText;

    item.append(l, v);
    return item;
  }

  function createOrUpdateCreditsBox(einnahme, ausgabe, differenz) {
    if (!isMainPage()) {
      removeCreditsBox();
      return;
    }

    const wrapper = getBielefeldWrapper();
    if (!wrapper) return;

    let box = document.getElementById('lss-credits-draggable-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'lss-credits-draggable-box';

      Object.assign(box.style, {
        order: String(NAV_ORDER.CREDITS),
        backgroundColor: 'transparent',
        border: 'none',
        padding: CREDITS_CONFIG.boxPadding,
        color: '#ffffff',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: CREDITS_CONFIG.line2FontSize,
        fontWeight: '600',
        textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 3px black',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '16px',
        whiteSpace: 'nowrap',
        transform: `scale(${CREDITS_CONFIG.scale})`,
        transformOrigin: 'left center',
        cursor: CREDITS_CONFIG.clickOpensDaily ? 'pointer' : 'default',
        width: CREDITS_CONFIG.boxWidth,
        height: CREDITS_CONFIG.boxHeight,
        transition: 'background-color 0.2s'
      });

      box.addEventListener('mouseenter', () => { box.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; });
      box.addEventListener('mouseleave', () => { box.style.backgroundColor = 'transparent'; });

      if (CREDITS_CONFIG.clickOpensDaily) {
        box.addEventListener('click', () => window.open('/credits/daily', '_blank'));
      }

      wrapper.appendChild(box);
    }

    const diffIcon = differenz >= 0 ? '▲' : '▼';
    const help = (key) => (CREDITS_CONFIG.showHelp && CREDITS_CONFIG.helpText?.[key]) || '';

    const bilanzColor =
      CREDITS_CONFIG.line2BilanzColor ??
      (differenz >= 0 ? CREDITS_CONFIG.bilanzPositiveColor : CREDITS_CONFIG.bilanzNegativeColor);
    const einColor = CREDITS_CONFIG.line2EinColor ?? CREDITS_CONFIG.einnahmeColor;
    const ausColor = CREDITS_CONFIG.line2AusColor ?? CREDITS_CONFIG.ausgabeColor;

    box.replaceChildren(
      buildCreditsItem('Bilanz', `${diffIcon} ${formatNumber(differenz)}`, bilanzColor, help('bilanz')),
      buildCreditsItem('Ein', `+${formatNumber(einnahme)}`, einColor, help('einnahme')),
      buildCreditsItem('Aus', `-${formatNumber(Math.abs(ausgabe))}`, ausColor, help('ausgabe'))
    );
  }

  // Zahl aus einer Tabellenzelle lesen: data-sort-value bevorzugt,
  // sonst Text. Vorzeichen (auch Unicode-Minus) wird nur am Anfang akzeptiert.
  function parseCreditsCell(cell) {
    const sortVal = cell.getAttribute('data-sort-value') ?? cell.getAttribute('sortvalue');
    if (sortVal !== null && /^\s*-?\d+\s*$/.test(sortVal)) return parseInt(sortVal, 10);

    const text = (cell.textContent || '').replace(/\u2212|\u2013/g, '-');
    const m = text.match(/(-?)\s*(\d{1,3}(?:\.\d{3})*|\d+)/);
    if (!m) return NaN;

    const num = parseInt(m[2].replace(/\./g, ''), 10);
    return m[1] === '-' ? -num : num;
  }

  async function updateCreditsHeader() {
    if (!isMainPage()) {
      removeCreditsBox();
      return;
    }

    resetCreditsDailyDataIfNeeded();

    const todayKey = getTodayKey();
    const cacheRaw = store.get(CREDITS_CACHE_KEY);
    if (cacheRaw) {
      try {
        const cache = JSON.parse(cacheRaw);
        if (cache && cache.date === todayKey) {
          createOrUpdateCreditsBox(cache.einnahme, cache.ausgabe, cache.differenz);
        }
      } catch { /* ignore */ }
    }

    try {
      const response = await fetch('/credits/daily', { credentials: 'same-origin' });
      if (!response.ok) return;

      const html = await response.text();
      if (html.includes('login-form')) return;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tbody tr');

      let einnahme = 0;
      let ausgabe = 0;

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        // Zelle mit Sortierwert bevorzugen, sonst Spalte 3 (bisheriges Verhalten)
        const cell = row.querySelector('td[data-sort-value], td[sortvalue]') || cells[2];
        if (!cell) return;

        const val = parseCreditsCell(cell);
        if (Number.isNaN(val)) return;

        if (val > 0) einnahme += val;
        else ausgabe += val;
      });

      const differenz = einnahme + ausgabe;

      store.set(CREDITS_CACHE_KEY, JSON.stringify({
        date: todayKey, einnahme, ausgabe, differenz, timestamp: Date.now()
      }));

      createOrUpdateCreditsBox(einnahme, ausgabe, differenz);
    } catch (err) {
      console.error('CreditsHeader Fehler:', err);
    }
  }

  let creditsBodyObserver = null;
  function setupCreditsBodyObserver() {
    if (creditsBodyObserver || !document.body) return;

    creditsBodyObserver = new MutationObserver(() => {
      if (document.querySelector('#navbar-main-collapse')) removeNavbarWatermarks();
    });

    creditsBodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function hookCreditsUpdate(attempt = 0) {
    if (typeof window.creditsUpdate !== 'function') {
      if (attempt < 60) setTimeout(() => hookCreditsUpdate(attempt + 1), 1000); // max. 60 s
      return;
    }
    if (window.creditsUpdate.__bielefeldWrapped) return;

    const original = window.creditsUpdate;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      setTimeout(updateCreditsHeader, 500);
      return result;
    };
    wrapped.__bielefeldWrapped = true;
    window.creditsUpdate = wrapped;
  }

  function initCreditsModule() {
    if (!isMainPage()) return; // andere Seiten / iFrames: nichts installieren

    setupCreditsBodyObserver();
    hookCreditsUpdate();

    resetCreditsDailyDataIfNeeded();
    updateCreditsHeader();
    removeNavbarWatermarks();

    setInterval(() => {
      if (document.hidden) return; // im Hintergrund-Tab keine Requests
      resetCreditsDailyDataIfNeeded();
      updateCreditsHeader();
    }, CREDITS_CONFIG.refreshIntervalMs);

    // Beim Zurückkehren in den Tab sofort aktualisieren
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateCreditsHeader();
    });
  }

  // =========================================================
  // Init
  // =========================================================
  function initAll() {
    try {
      initTitleFix();
      initDailyCounterModule();
      initCreditsModule();
    } catch (e) {
      console.error('Init Fehler:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }
})();