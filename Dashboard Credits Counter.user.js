// ==UserScript==
// @name         Dashboard Credits Counter
// @namespace    https://leitstellenspiel.de/dashboard
// @version      1.0.01
// @author       Design by Bobelle
// @description  Zeigt Credits-Bilanz im Navbar-Bereich
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Credits%20Counter.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Credits%20Counter.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

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
  const getTodayKey = getTodayString;

  const formatNumber = (num) => Number(num).toLocaleString('de-DE');

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
  // Credits Modul
  // =========================================================
  const CREDITS_CONFIG = {
    resetHour: 0,
    resetMinute: 0,
    clickOpensDaily: true,
    removeAllBadges: false,
    scale: 1.0,

    line1FontSize: '12px',
    line1Color: 'yellow',
    line1FontWeight: 'normal',

    line2FontSize: '12px',
    line2FontWeight: 'bold',

    lineGap: '2px',

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
        order: '20',
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
      if (attempt < 60) setTimeout(() => hookCreditsUpdate(attempt + 1), 1000);
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
    if (!isMainPage()) return;

    setupCreditsBodyObserver();
    hookCreditsUpdate();

    resetCreditsDailyDataIfNeeded();
    updateCreditsHeader();
    removeNavbarWatermarks();

    setInterval(() => {
      if (document.hidden) return;
      resetCreditsDailyDataIfNeeded();
      updateCreditsHeader();
    }, CREDITS_CONFIG.refreshIntervalMs);

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
