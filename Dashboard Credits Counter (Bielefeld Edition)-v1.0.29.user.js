// ==UserScript==
// @name         Dashboard Credits Counter (Bielefeld Edition)
// @namespace    https://leitstellenspiel.de/bielefeld
// @version      v1.0.29
// @license      Design by Bobelle
// @author       Design by Bobelle
// @description  Zeigt Tageszähler, Credits-Bilanz und Dienstgrad im Navbar-Bereich
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard.User.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard.User.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // =========================================================
  // 0) Tab-Titel fix
  // =========================================================
  const TARGET_TITLE = 'Leitstelle Bielefeld';

  function initTitleFix() {
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
  // Helfer
  // =========================================================
  const isMainPage = () => {
    const path = window.location.pathname;
    return path === '/' || path === '/index.php' || path === '/map';
  };

  const getNavbarBrand = () =>
    document.querySelector('.navbar .navbar-brand') || document.querySelector('.navbar-brand');

  const NAV_ORDER = { DAILY: 20, CREDITS: 30 };

  function getBielefeldWrapper() {
    if (!isMainPage()) return null;

    const brand = getNavbarBrand();
    if (!brand) return null;

    let wrapper = document.getElementById('bielefeld-navbar-wrapper');
    if (wrapper) return wrapper;

    // Original-Inhalt in Container verschieben (bleibt sichtbar)
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

  const normalizeText = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  const getTodayString = () => new Date().toISOString().slice(0, 10);
  const getTodayKey = () => new Date().toISOString().split('T')[0];
  const formatNumber = (num) => Number(num).toLocaleString('de-DE');

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

    buttons: ['alarmieren', 'einsatz starten', 'mission starten', 'alarmieren und zurück', 'alarmieren und zum nächsten einsatz']
  };

  const DAILY_STORAGE_KEY = DAILY_CONFIG.storageKey;

  function loadDailyState() {
    const today = getTodayString();
    const empty = { date: today, count: 0, prevDate: null, prevCount: 0 };
    try {
      const data = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY));
      return data && data.date ? data : empty;
    } catch {
      return empty;
    }
  }

  let dailyState = loadDailyState();
  const dailyUi = { count: null, record: null };

  function saveDailyState() {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(dailyState));
  }

  function updateDailyDisplay() {
    if (dailyUi.count) dailyUi.count.textContent = String(dailyState.count);
    if (dailyUi.record) dailyUi.record.textContent = String(dailyState.prevCount);
  }

  function checkDailyDayReset() {
    const today = getTodayString();
    if (dailyState.date === today) return;

    const lastDate = new Date(dailyState.date);
    const currDate = new Date(today);
    const oneDay = 24 * 60 * 60 * 1000;

    if (currDate - lastDate === oneDay) {
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
      DAILY_CONFIG.align === 'right'
        ? 'right'
        : DAILY_CONFIG.align === 'center'
          ? 'center'
          : 'left';

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

  function buildDailyUI() {
    if (!isMainPage()) return;

    const wrapper = getBielefeldWrapper();
    if (!wrapper) {
      setTimeout(buildDailyUI, 300);
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
    if (now - lastDailyCountAt < 900) return;
    lastDailyCountAt = now;

    checkDailyDayReset();
    dailyState.count++;
    saveDailyState();
    updateDailyDisplay();
  }

  const DAILY_TRIGGERS = Array.from(new Set(DAILY_CONFIG.buttons.map(normalizeText)));

  function urlLooksLikeAlarm(url) {
    try {
      const u = new URL(url, location.origin);
      const p = (u.pathname || '').toLowerCase();

      if (p.includes('alarm') && (p.includes('mission') || p.includes('missions'))) return true;
      if (p.includes('aao') && p.includes('alarm')) return true;

      return false;
    } catch {
      return false;
    }
  }

  function hookFetchAlarmCounter() {
    if (!window.fetch || window.fetch.__bielefeldDailyWrapped) return;

    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const res = await originalFetch.apply(this, arguments);

      try {
        if (!isMainPage()) return res;

        const url =
          typeof input === 'string' ? input :
            (input && input.url) ? input.url : '';

        const method = init && init.method ? String(init.method).toUpperCase() : 'GET';

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
        this.__bielefeld_url = url || '';
      } catch { /* ignore */ }
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      try {
        this.addEventListener('load', () => {
          try {
            if (!isMainPage()) return;

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

  function handleDailyClickFallback(e) {
    const el = e.target.closest('a, button, input[type="submit"], input[type="button"]');
    if (!el) return;

    const combined = normalizeText([
      el.textContent,
      el.value,
      el.getAttribute('aria-label'),
      el.getAttribute('title')
    ].filter(Boolean).join(' '));

    if (combined && DAILY_TRIGGERS.some(t => combined.includes(t))) {
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
    checkDailyDayReset();
    buildDailyUI();
    scheduleDailyReset();

    hookFetchAlarmCounter();
    hookXHRAlarmCounter();

    window.addEventListener('storage', (e) => {
      if (e.key !== DAILY_STORAGE_KEY) return;
      dailyState = loadDailyState();
      updateDailyDisplay();
    });

    document.addEventListener('click', handleDailyClickFallback, true);
  }

  // =========================================================
  // 2) Credits (Zeile1/Zeile2 frei einstellbar + Abstand + Hilfe)
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
    boxPadding: '4px 8px'
  };

  const CREDITS_CACHE_KEY = 'credits_daily_cache';
  const CREDITS_LAST_RESET_KEY = 'credits_daily_last_reset';

  function resetCreditsDailyDataIfNeeded() {
    const now = new Date();
    const todayKey = getTodayKey();
    const lastReset = localStorage.getItem(CREDITS_LAST_RESET_KEY);

    const resetToday = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(),
      CREDITS_CONFIG.resetHour, CREDITS_CONFIG.resetMinute, 0, 0
    );

    if (lastReset === todayKey) return false;
    if (now < resetToday) return false;

    localStorage.removeItem(CREDITS_CACHE_KEY);
    localStorage.setItem(CREDITS_LAST_RESET_KEY, todayKey);
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
      box.style.order = NAV_ORDER.CREDITS;

      Object.assign(box.style, {
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

    const itemStyle = 'display:flex;flex-direction:column;align-items:center;line-height:1.1;';

    const labelStyle =
      `font-size:${CREDITS_CONFIG.line1FontSize};` +
      `color:${CREDITS_CONFIG.line1Color};` +
      `font-weight:${CREDITS_CONFIG.line1FontWeight};` +
      `text-transform:uppercase;` +
      `margin-bottom:${CREDITS_CONFIG.lineGap};`;

    const valBaseStyle =
      `font-size:${CREDITS_CONFIG.line2FontSize};` +
      `font-weight:${CREDITS_CONFIG.line2FontWeight};`;

    const helpBilanz = (CREDITS_CONFIG.showHelp && CREDITS_CONFIG.helpText?.bilanz) ? CREDITS_CONFIG.helpText.bilanz : '';
    const helpEin = (CREDITS_CONFIG.showHelp && CREDITS_CONFIG.helpText?.einnahme) ? CREDITS_CONFIG.helpText.einnahme : '';
    const helpAus = (CREDITS_CONFIG.showHelp && CREDITS_CONFIG.helpText?.ausgabe) ? CREDITS_CONFIG.helpText.ausgabe : '';

    const bilanzValColor =
      (CREDITS_CONFIG.line2BilanzColor ?? null) ??
      (differenz >= 0 ? CREDITS_CONFIG.bilanzPositiveColor : CREDITS_CONFIG.bilanzNegativeColor);

    const einValColor = (CREDITS_CONFIG.line2EinColor ?? null) ?? CREDITS_CONFIG.einnahmeColor;
    const ausValColor = (CREDITS_CONFIG.line2AusColor ?? null) ?? CREDITS_CONFIG.ausgabeColor;

    box.innerHTML = `
      <div style="${itemStyle}" title="${helpBilanz}">
        <span style="${labelStyle}">Bilanz</span>
        <span style="${valBaseStyle};color:${bilanzValColor};">${diffIcon} ${formatNumber(differenz)}</span>
      </div>
      <div style="${itemStyle}" title="${helpEin}">
        <span style="${labelStyle}">Ein</span>
        <span style="${valBaseStyle};color:${einValColor};">+${formatNumber(einnahme)}</span>
      </div>
      <div style="${itemStyle}" title="${helpAus}">
        <span style="${labelStyle}">Aus</span>
        <span style="${valBaseStyle};color:${ausValColor};">-${formatNumber(Math.abs(ausgabe))}</span>
      </div>
    `;
  }

  async function updateCreditsHeader() {
    if (!isMainPage()) {
      removeCreditsBox();
      return;
    }

    resetCreditsDailyDataIfNeeded();

    const todayKey = getTodayKey();
    const cacheRaw = localStorage.getItem(CREDITS_CACHE_KEY);
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
      const html = await response.text();
      if (html.includes('login-form')) return;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tbody tr');

      let einnahme = 0;
      let ausgabe = 0;

      rows.forEach(row => {
        const cell =
          row.querySelector('td[data-sort-value], td[sortvalue]') ||
          row.querySelectorAll('td')[2];
        if (!cell) return;

        const raw = (cell.getAttribute('data-sort-value') || cell.textContent || '')
          .replace(/\./g, '')
          .replace(/[^\d-]/g, '');

        const val = parseInt(raw, 10);
        if (Number.isNaN(val)) return;

        if (val > 0) einnahme += val;
        else ausgabe += val;
      });

      const differenz = einnahme + ausgabe;

      localStorage.setItem(CREDITS_CACHE_KEY, JSON.stringify({
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
      if (isMainPage() && document.querySelector('#navbar-main-collapse')) removeNavbarWatermarks();
      if (!isMainPage()) removeCreditsBox();
    });

    creditsBodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  function hookCreditsUpdate() {
    if (window.creditsUpdate?.__bielefeldWrapped) return;

    const tryHook = () => {
      if (typeof window.creditsUpdate !== 'function') {
        setTimeout(tryHook, 1000);
        return;
      }
      if (window.creditsUpdate.__bielefeldWrapped) return;

      const original = window.creditsUpdate;
      window.creditsUpdate = function (...args) {
        const result = original.apply(this, args);
        if (isMainPage()) setTimeout(updateCreditsHeader, 500);
        return result;
      };
      window.creditsUpdate.__bielefeldWrapped = true;
    };

    tryHook();
  }

  function initCreditsModule() {
    setupCreditsBodyObserver();
    hookCreditsUpdate();

    if (isMainPage()) {
      resetCreditsDailyDataIfNeeded();
      updateCreditsHeader();
      removeNavbarWatermarks();
    } else {
      removeCreditsBox();
    }

    setInterval(() => {
      if (!isMainPage()) return;
      resetCreditsDailyDataIfNeeded();
      updateCreditsHeader();
    }, 300000);
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
