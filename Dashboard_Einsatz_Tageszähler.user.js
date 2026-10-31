// ==UserScript==
// @name         Dashboard_Einsatz_Tageszähler
// @namespace    https://leitstellenspiel.de
// @version      1.0.15
// @author       Design by Bobelle
// @description  Tageszähler für eigene Einsätze und Krankentransporte
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window) return; // Nur im Hauptfenster ausführen
  if (window.location.pathname !== '/') return; // Nur auf der Hauptseite ausführen

  // =======================================================
  // >>>>>>>>>>>>>>>>>  EINSTELLUNGEN (HIER ÄNDERN)  <<<<<<<<<<<<<<<<<
  // =======================================================
  const ZEILEN_ABSTAND = '0px'; // <-- Abstand zwischen den Zeilen (z. B. '0px', '4px', '10px')
  const TEXT_FARBE = '#ffffff'; // <-- Textfarbe (z. B. '#ffffff' weiß, '#000000' schwarz, 'yellow')
  const SCHRIFT_GROESSE = '12px'; // <-- Schriftgröße
  // =======================================================
  // >>>>>>>>>>>>>>>>>  ENDE EINSTELLUNGEN  <<<<<<<<<<<<<<<<<
  // =======================================================

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
  // Aktive Einsätze (Live-Zähler)
  // =======================================================
  // Aktiv: +1, sobald bei einem Einsatz ein eigenes Fahrzeug unterwegs oder vor Ort ist.
  //        -1, sobald der Einsatz beendet ist (Eintrag aus der Einsatzliste verschwunden).
  const activeIds = new Set();

  function missionStillInList(id) {
    return !!(
      document.getElementById('mission_' + id) ||
      document.getElementById('mission_caption_' + id) ||
      document.getElementById('mission_participant_' + id)
    );
  }

  function countActiveMissions() {
    // Bevorzugt: Zähler des Spiel-Buttons "Gestartete Einsätze" (#mission_select_started)
    const gameCounter = document.querySelector('#mission_select_started .counter');
    if (gameCounter) {
      const n = parseInt(gameCounter.textContent, 10);
      if (Number.isFinite(n)) return n;
    }

    // Ersatz, falls der Spiel-Button nicht gefunden wird:
    // +1: Einsätze, an denen man mit eigenen Fahrzeugen beteiligt ist
    // (gleiche Erkennung wie bei den Tageszählern)
    getParticipatingIds().forEach((id) => activeIds.add(id));

    // -1: beendete Einsätze (nicht mehr in der Einsatzliste) entfernen
    activeIds.forEach((id) => {
      if (!missionStillInList(id)) activeIds.delete(id);
    });

    return activeIds.size;
  }

  function updateActiveCounter() {
    const a = document.getElementById('lss-fc-active');
    if (a) a.textContent = String(countActiveMissions());
  }

  // =======================================================
  // UI (frei verschiebbares Icon)
  // =======================================================
  const titleText = () =>
    `Eigene Einsätze / KTW heute\nGestern: ${state.prevCount || 0} / ${state.prevKtw || 0}`;

  function makeRow(label, valueId, value, valueClass) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('span');
    v.id = valueId;
    if (valueClass) v.className = valueClass;
    v.textContent = String(value);
    row.append(l, v);
    return row;
  }

  // Erzeugt: Aktiv <a ...><span class="counter">5</span></a> (transparent, ohne Icon)
  function makeActiveRow(valueId, value) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
    const l = document.createElement('span');
    l.textContent = 'Aktiv';
    // Button wie im Spiel: "Gestartete Einsätze" (Klick löst den Original-Button aus)
    const right = document.createElement('a');
    right.id = 'lss-fc-started';
    right.style.cssText =
      'background:transparent;border:0;padding:0;margin:0;box-shadow:none;' +
      'color:inherit;font:inherit;line-height:inherit;text-decoration:none;cursor:pointer;';
    right.href = '#';
    right.title = 'Gestartete Einsätze';
    right.setAttribute('role', 'button');
    right.setAttribute('aria-label', 'Gestartete Einsätze');
    right.setAttribute('data-participation-filter', 'started');
    right.addEventListener('click', (e) => {
      e.preventDefault();
      const g = document.getElementById('mission_select_started');
      if (g) g.click();
    });
    const v = document.createElement('span');
    v.id = valueId;
    v.className = 'counter';
    v.textContent = String(value);
    right.append(v);
    row.append(l, right);
    return row;
  }

  function createFloatingCounter() {
    if (document.getElementById('lss-floating-counter')) return;

    const el = document.createElement('div');
    el.id = 'lss-floating-counter';

    // Gespeicherte Position laden und auf sichtbaren Bereich begrenzen
    let savedPos = { x: 20, y: 70 };
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY));
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) savedPos = p;
    } catch {}
    savedPos.x = Math.min(Math.max(0, savedPos.x), Math.max(0, window.innerWidth - 60));
    savedPos.y = Math.min(Math.max(0, savedPos.y), Math.max(0, window.innerHeight - 40));

    Object.assign(el.style, {
      position: 'fixed',
      left: `${savedPos.x}px`,
      top: `${savedPos.y}px`,
      zIndex: '999999',
      backgroundColor: 'transparent',
      color: TEXT_FARBE,
      border: 'none',
      padding: '4px 6px',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: SCHRIFT_GROESSE,
      fontWeight: 'bold',
      lineHeight: '1.2',
      textShadow: '0 0 3px #000, 0 0 3px #000, 1px 1px 2px #000',
      cursor: 'grab',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: ZEILEN_ABSTAND,
      whiteSpace: 'nowrap'
    });

    el.title = titleText();

    // Kein innerHTML (Trusted-Types-sicher)
    // Letzte Zeile: "Aktiv" + <span class="counter">5</span>
    el.append(
      makeRow('Einsätze', 'lss-fc-val', state.count),
      makeRow('KTW', 'lss-fc-ktw', state.ktw),
      makeActiveRow('lss-fc-active', countActiveMissions())
    );

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
    updateActiveCounter();
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
    if (state.ids.includes(missionId)) return;
    state.ids.push(missionId);
    if (isKtw) state.ktw++; else state.count++;
    store.set(state);
    updateDisplay();
  }

  function isKtwMission(id) {
    const cap = document.getElementById('mission_caption_' + id);
    return !!cap && /^\s*(Krankentransport|Intensivverlegung)/i.test(cap.textContent);
  }

  function getParticipatingIds() {
    const ids = new Set();
    document
      .querySelectorAll('[id^="mission_participant_"]:not([id^="mission_participant_new_"])')
      .forEach((el) => {
        // Verbandseinsätze zählen mit, sobald man selbst beteiligt ist
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
      if (seen === null) { seen = current; return; }
      current.forEach((id) => {
        if (!seen.has(id)) incrementCount(id, isKtwMission(id));
      });
      seen = current;
    };

    const start = () => {
      const root = document.getElementById('missions') || document.body;
      check();
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(check, 200);
      }).observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class']
      });
    };

    setTimeout(start, 3000);
  }

  // Beobachtet die Einsatzliste und aktualisiert den Zähler "Aktiv"
  function initActiveCounterObserver() {
    let t = null;
    const attach = () => {
      const list = document.getElementById('mission_list');
      if (!list) return false;
      new MutationObserver(() => {
        clearTimeout(t);
        t = setTimeout(updateActiveCounter, 200);
      }).observe(list, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      updateActiveCounter();
      return true;
    };

    if (!attach()) {
      // Liste ist evtl. noch nicht geladen: kurz erneut versuchen
      let tries = 0;
      const retry = setInterval(() => {
        tries++;
        if (attach() || tries >= 20) clearInterval(retry);
      }, 500);
    }
  }

  // =======================================================
  // Initialisierung
  // =======================================================
  function init() {
    try {
      createFloatingCounter();
    } catch (e) {
      console.error('[Einsatz-Tageszähler] Anzeige konnte nicht erstellt werden:', e);
    }
    initObserverAndListeners();
    initActiveCounterObserver();

    // Zähler des Spiel-Buttons beobachten, damit "Aktiv" sofort mitzieht
    const gameBtn = document.getElementById('mission_select_started');
    if (gameBtn) {
      new MutationObserver(updateActiveCounter).observe(gameBtn, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    // Absicherung: Zähler "Aktiv" alle 2 Sekunden neu lesen (zeigt 0, wenn nichts aktiv ist)
    setInterval(updateActiveCounter, 2000);

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