// ==UserScript==
// @name         Dashboard_Credits_Counter
// @namespace    https://leitstellenspiel.de
// @version      1.1.01
// @author       Design by Bobelle (Fixed)
// @description  Zeigt Credits-Bilanz frei verschiebbar im Navbar-Bereich
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const DEBUG = true; // Zum Testen auf true gestellt, damit man Logs in der F12-Konsole sieht
  const log = (...a) => { if (DEBUG) console.log('[Credits]', ...a); };

  // =======================================================
  // Helfer
  // =======================================================
  const IS_TOP = window.top === window;

  const isMainPage = () => {
    if (!IS_TOP) return false;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/' || path === '/index.php' || path === '/map';
  };

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

  const getTodayString = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const formatNumber = (num) => {
    const n = Math.round(Number(num) || 0);
    const sign = n < 0 ? '-' : '';
    return sign + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // =========================================================
  // Tab-Titel fix
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
  // Credits Modul
  // =========================================================
  const CREDITS_CONFIG = {
    resetHour: 0,
    resetMinute: 0,
    clickOpensDaily: true,
    removeAllBadges: false,
    scale: 1.0,

    offsetRight: 30,
    fallbackLeft: 300,
    fallbackTop: 6,

    line1FontSize: '11px',
    line1Color: '#ffeb3b',
    line1FontWeight: 'normal',

    line2FontSize: '13px',
    line2FontWeight: 'bold',

    lineGap: '2px',

    showHelp: true,
    helpText: {
      bilanz: 'Heutige Credits-Bilanz',
      einnahme: 'Heutige Einnahmen',
      ausgabe: 'Heutige Ausgaben'
    },

    bilanzPositiveColor: '#40ff00',
    bilanzNegativeColor: '#ff3333',
    einnahmeColor: '#40ff00',
    ausgabeColor: '#ff3333',

    refreshIntervalMs: 300000
  };

  const CREDITS_CACHE_KEY = 'credits_daily_cache_v3';
  const CREDITS_LAST_RESET_KEY = 'credits_daily_last_reset_v3';
  const CREDITS_POS_KEY = 'credits_box_pos_v1';
  const BOX_ID = 'lss-credits-draggable-box';

  function resetCreditsDailyDataIfNeeded() {
    const now = new Date();
    const todayKey = getTodayString();
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
    document.getElementById(BOX_ID)?.remove();
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

  function loadSavedPos() {
    try {
      const raw = store.get(CREDITS_POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p.left === 'number' && typeof p.top === 'number') return p;
    } catch { /* ignore */ }
    return null;
  }

  function clampPos(box, left, top) {
    const r = box.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - r.width);
    const maxTop = Math.max(0, window.innerHeight - r.height);
    return {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop)
    };
  }

  function applyPos(box, left, top) {
    const p = clampPos(box, left, top);
    box.style.left = `${p.left}px`;
    box.style.top = `${p.top}px`;
    return p;
  }

  function getDefaultPos(box) {
    const brand = getNavbarBrand();
    if (brand) {
      const br = brand.getBoundingClientRect();
      if (br.width > 0) {
        const bh = box.getBoundingClientRect().height;
        return {
          left: br.right + CREDITS_CONFIG.offsetRight,
          top: Math.max(0, br.top + (br.height - bh) / 2)
        };
      }
    }
    return { left: CREDITS_CONFIG.fallbackLeft, top: CREDITS_CONFIG.fallbackTop };
  }

  function positionBox(box) {
    const saved = loadSavedPos();
    if (saved) {
      applyPos(box, saved.left, saved.top);
    } else {
      const d = getDefaultPos(box);
      applyPos(box, d.left, d.top);
    }
  }

  function enableDragging(box) {
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;
    let dragging = false;
    let moved = false;

    box.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const r = box.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = r.left;
      startTop = r.top;
      dragging = true;
      moved = false;
      try { box.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      box.style.cursor = 'grabbing';
      e.preventDefault();
    });

    box.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      moved = true;
      applyPos(box, startLeft + dx, startTop + dy);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try { box.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      box.style.cursor = 'grab';

      if (moved) {
        const r = box.getBoundingClientRect();
        store.set(CREDITS_POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
      } else if (CREDITS_CONFIG.clickOpensDaily) {
        window.open('/credits/daily', '_blank');
      }
    };

    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);

    box.addEventListener('dblclick', (e) => {
      e.preventDefault();
      store.remove(CREDITS_POS_KEY);
      const d = getDefaultPos(box);
      applyPos(box, d.left, d.top);
    });

    window.addEventListener('resize', () => {
      const r = box.getBoundingClientRect();
      applyPos(box, r.left, r.top);
    });
  }

  function buildCreditsItem(label, valueText, valueColor, helpText) {
    const item = document.createElement('div');
    Object.assign(item.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      lineHeight: '1.15',
      whiteSpace: 'nowrap'
    });
    if (helpText) item.setAttribute('title', helpText);

    const l = document.createElement('span');
    Object.assign(l.style, {
      fontSize: CREDITS_CONFIG.line1FontSize,
      color: CREDITS_CONFIG.line1Color,
      fontWeight: CREDITS_CONFIG.line1FontWeight,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: CREDITS_CONFIG.lineGap
    });
    l.textContent = label;

    const v = document.createElement('span');
    Object.assign(v.style, {
      fontSize: CREDITS_CONFIG.line2FontSize,
      fontWeight: CREDITS_CONFIG.line2FontWeight,
      color: valueColor,
      fontVariantNumeric: 'tabular-nums'
    });
    v.textContent = valueText;

    item.append(l, v);
    return item;
  }

  function createBox() {
    const box = document.createElement('div');
    box.id = BOX_ID;

    Object.assign(box.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      zIndex: '99999',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '18px',
      padding: '4px 12px',
      width: 'max-content',
      color: '#ffffff',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: '600',
      textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 3px black',
      background: 'transparent',
      border: 'none',
      boxShadow: 'none',
      transform: `scale(${CREDITS_CONFIG.scale})`,
      transformOrigin: 'top left',
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none'
    });

    enableDragging(box);
    document.body.appendChild(box);
    return box;
  }

  function createOrUpdateCreditsBox(einnahme, ausgabe, differenz) {
    if (!isMainPage()) {
      removeCreditsBox();
      return;
    }
    if (!document.body) return;

    let box = document.getElementById(BOX_ID);
    const isNew = !box;
    if (isNew) box = createBox();

    const diffIcon = differenz >= 0 ? '▲' : '▼';
    const help = (key) => (CREDITS_CONFIG.showHelp && CREDITS_CONFIG.helpText?.[key]) || '';
    const bilanzColor = differenz >= 0 ? CREDITS_CONFIG.bilanzPositiveColor : CREDITS_CONFIG.bilanzNegativeColor;

    box.replaceChildren(
      buildCreditsItem('Bilanz', `${diffIcon} ${formatNumber(Math.abs(differenz))}`, bilanzColor, help('bilanz')),
      buildCreditsItem('Ein', `+${formatNumber(einnahme)}`, CREDITS_CONFIG.einnahmeColor, help('einnahme')),
      buildCreditsItem('Aus', `-${formatNumber(Math.abs(ausgabe))}`, CREDITS_CONFIG.ausgabeColor, help('ausgabe'))
    );

    if (isNew) {
      positionBox(box);
    } else {
      const r = box.getBoundingClientRect();
      applyPos(box, r.left, r.top);
    }
  }

  // Verbesserte Parsing-Funktion für die Credits-Spalte
  function parseCreditsCell(cell) {
    const sortVal = cell.getAttribute('data-sort-value') ?? cell.getAttribute('sortvalue');
    if (sortVal !== null && !isNaN(sortVal)) {
      return parseInt(sortVal, 10);
    }

    const text = (cell.textContent || '').trim().replace(/\u2212|\u2013/g, '-');
    // Sucht nach Zahlen mit optionalem Minus- oder Pluszeichen und Tausenderpunkten
    const cleanText = text.replace(/\./g, '').replace(/[^\d\-+]/g, '');
    const num = parseInt(cleanText, 10);
    return isNaN(num) ? 0 : num;
  }

  async function updateCreditsHeader(forceFetch = false) {
    if (!isMainPage()) {
      removeCreditsBox();
      return;
    }

    resetCreditsDailyDataIfNeeded();

    const todayKey = getTodayString();
    const cacheRaw = store.get(CREDITS_CACHE_KEY);

    if (!forceFetch && cacheRaw) {
      try {
        const cache = JSON.parse(cacheRaw);
        if (cache && cache.date === todayKey) {
          createOrUpdateCreditsBox(cache.einnahme, cache.ausgabe, cache.differenz);
          return;
        }
      } catch { /* ignore */ }
    }

    try {
      const response = await fetch('/credits/daily', { credentials: 'same-origin' });
      if (!response.ok) {
        log('Fetch fehlgeschlagen, Status:', response.status);
        return;
      }

      const html = await response.text();
      if (html.includes('login-form')) {
        log('Nicht eingeloggt');
        return;
      }

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const rows = doc.querySelectorAll('table tbody tr');

      let einnahme = 0;
      let ausgabe = 0;

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 0) return;

        // Versuche die Spalte zu finden, die die Credits enthält (meistens die letzte oder vorletzte oder Index 2)
        // Wir suchen in allen Zellen der Zeile nach einer gültigen Credit-Zahl, falls sich das Layout geändert hat
        let val = NaN;
        for (let i = 0; i < cells.length; i++) {
          const candidate = parseCreditsCell(cells[i]);
          // Wenn die Zelle plausibel eine Zahl enthält (nicht 0 oder wenn es explizit eine Transaktion ist)
          // Normalerweise haben die Zeilen auf /credits/daily eine Spalte mit Beträgen.
          if (!isNaN(candidate) && candidate !== 0) {
            val = candidate;
            break;
          }
        }

        if (Number.isNaN(val)) return;

        if (val > 0) einnahme += val;
        else ausgabe += val;
      });

      const differenz = einnahme + ausgabe;
      log({ rows: rows.length, einnahme, ausgabe, differenz });

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
      if (attempt < 60) setTimeout(() => hookCreditsUpdate(attempt + 1), 1000);
      return;
    }
    if (window.creditsUpdate.__bielefeldWrapped) return;

    const original = window.creditsUpdate;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      setTimeout(() => updateCreditsHeader(true), 400);
      return result;
    };
    wrapped.__bielefeldWrapped = true;
    window.creditsUpdate = wrapped;
  }

  function initCreditsModule() {
    if (!isMainPage()) return;

    setupCreditsBodyObserver();
    hookCreditsUpdate();

    resetCreditsDailyDataIfNeeded();
    updateCreditsHeader(false);
    removeNavbarWatermarks();

    setInterval(() => {
      if (document.hidden) return;
      resetCreditsDailyDataIfNeeded();
      updateCreditsHeader(true);
    }, CREDITS_CONFIG.refreshIntervalMs);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateCreditsHeader(false);
    });
  }

  function initAll() {
    try {
      initTitleFix();
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
