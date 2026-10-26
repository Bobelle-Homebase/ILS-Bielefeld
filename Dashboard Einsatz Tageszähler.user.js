// ==UserScript==
// @name         Dashboard Einsatz Tageszähler
// @namespace    https://leitstellenspiel.de/
// @version      2.3.0
// @author       Design by Bobelle
// @description  Tageszähler für eigene Einsätze und Krankentransporte
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Einsatz%20Tageszähler.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Einsatz%20Tageszähler.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window) return; // Nur im Hauptfenster ausführen

  // =======================================================
  // Speicher & Konfiguration
  // =======================================================
  const STORAGE_KEY = 'lss_eigen_ktw_counter_v2';
  const POS_KEY = 'lss_eigen_ktw_pos_v2';

  const getTodayString = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const store = {
    get() {
      const today = getTodayString();
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (data && data.date === today) {
          return { count: 0, ktw: 0, ids: [], prevCount: 0, prevKtw: 0, ...data };
        }
        return {
          date: today, count: 0, ktw: 0, ids: [],
          prevDate: data?.date || null,
          prevCount: data?.count || 0,
          prevKtw: data?.ktw || 0
        };
      } catch {
        return { date: today, count: 0, ktw: 0, ids: [], prevDate: null, prevCount: 0, prevKtw: 0 };
      }
    },
    set(s) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
    }
  };

  let state = store.get();

  // =======================================================
  // UI (frei verschiebbares weißes Icon)
  // =======================================================
  const titleText = () =>
    `Eigene Einsätze / KTW heute\nGestern: ${state.prevCount || 0} / ${state.prevKtw || 0}`;

  function createFloatingCounter() {
    if (document.getElementById('lss-floating-counter')) return;

    const el = document.createElement('div');
    el.id = 'lss-floating-counter';

    let savedPos = { x: 20, y: 70 };
    try { savedPos = JSON.parse(localStorage.getItem(POS_KEY)) || savedPos; } catch {}

    Object.assign(el.style, {
      position: 'fixed',
      left: `${savedPos.x}px`,
      top: `${savedPos.y}px`,
      zIndex: '999999',
      backgroundColor: 'transparent',
      color: '#ffffff',
      border: 'none',
      padding: '4px 6px',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: '12px',
      fontWeight: 'bold',
      // Dunkler Schatten, damit die Schrift auf jedem Hintergrund lesbar bleibt
      textShadow: '0 0 3px #000, 0 0 3px #000, 1px 1px 2px #000',
      cursor: 'grab',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '2px',
      whiteSpace: 'nowrap'
    });

    el.title = titleText();
    const rowStyle = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
    el.innerHTML =
      `<div style="${rowStyle}"><span>Einsätze</span><span id="lss-fc-val">${state.count}</span></div>` +
      `<div style="${rowStyle}"><span>KTW</span><span id="lss-fc-ktw">${state.ktw}</span></div>`;

    document.body.appendChild(el);

    // Drag & Drop
    let isDragging = false;
    let startX, startY, initialX, initialY;

    el.addEventListener('mousedown', (e) => {
      isDragging = true;
      el.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;
      initialX = el.offsetLeft;
      initialY = el.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      el.style.left = `${initialX + e.clientX - startX}px`;
      el.style.top = `${initialY + e.clientY - startY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      el.style.cursor = 'grab';
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({ x: el.offsetLeft, y: el.offsetTop }));
      } catch {}
    });
  }

  function updateDisplay() {
    const v = document.getElementById('lss-fc-val');
    const k = document.getElementById('lss-fc-ktw');
    const el = document.getElementById('lss-floating-counter');
    if (v) v.textContent = state.count;
    if (k) k.textContent = state.ktw;
    if (el) el.title = titleText();
  }

  // =======================================================
  // Zähl-Logik
  // =======================================================
  function incrementCount(missionId, isKtw) {
    const today = getTodayString();
    if (state.date !== today) {
      state = {
        date: today, count: 0, ktw: 0, ids: [],
        prevDate: state.date, prevCount: state.count, prevKtw: state.ktw
      };
    }
    if (state.ids.includes(missionId)) return; // jeden Einsatz nur einmal pro Tag
    state.ids.push(missionId);
    if (isKtw) state.ktw++; else state.count++;
    store.set(state);
    updateDisplay();
  }

  function isKtwMission(id) {
    const cap = document.getElementById('mission_caption_' + id);
    return !!cap && /^\s*(Krankentransport|Intensivverlegung)/i.test(cap.textContent);
  }

  // IDs aller eigenen Einsätze (inkl. Krankentransporte), bei denen alarmiert wurde.
  // Verbandslisten werden ausgeschlossen.
  function getParticipatingIds() {
    const ids = new Set();
    document
      .querySelectorAll('[id^="mission_participant_"]:not([id^="mission_participant_new_"])')
      .forEach((el) => {
        if (el.closest('#mission_list_alliance, #mission_list_alliance_event')) return;
        if (!el.classList.contains('hidden')) {
          ids.add(el.id.replace('mission_participant_', ''));
        }
      });
    return ids;
  }

  function initObserverAndListeners() {
    let seen = null;
    let timer = null;

    const check = () => {
      const current = getParticipatingIds();
      if (seen === null) { seen = current; return; } // Startzustand nicht mitzählen
      current.forEach((id) => {
        if (!seen.has(id)) incrementCount(id, isKtwMission(id));
      });
      seen = current;
    };

    const start = () => {
      const root = document.getElementById('missions') || document.body;
      check(); // Startzustand
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(check, 200); // gebündelt, damit es nicht ständig feuert
      }).observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class']
      });
    };

    setTimeout(start, 3000); // warten, bis die Listen geladen sind
  }

  // =======================================================
  // Initialisierung
  // =======================================================
  function init() {
    createFloatingCounter();
    initObserverAndListeners();

    // Tageswechsel-Prüfung
    setInterval(() => {
      if (state.date !== getTodayString()) {
        state = store.get();
        updateDisplay();
      }
    }, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
