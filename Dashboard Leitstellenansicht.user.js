// ==UserScript==
// @name         Dashboard Leitstellenansicht
// @namespace    https://leitstellenspiel.de/bielefeld
// @version      v1.0.05
// @license      Design by Bobelle
// @author       Design by Bobelle
// @description  Leitstellenansicht: Übersicht aller Fahrzeuge nach Gebäuden mit Live-Status
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard Leitstellenansicht.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard Leitstellenansicht.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* global $ */

(function () {
    'use strict';
 
    // Nur im Hauptfenster der Startseite ausführen
    if (window.top !== window.self) return;
    if (window.location.pathname !== '/') return;
 
    // ==================================================================
    // Konstanten & Einstellungen
    // ==================================================================
    const LS_KEY = 'lsd_settings_v3';
    const OPEN_HASH = '#leitstellenansicht';
 
    const GROUPS = {
        fw:    { name: 'Feuerwehr',      color: '#DB1111', terms: 'feuerwehr fw' },
        rd:    { name: 'Rettungsdienst', color: '#F36F22', terms: 'rettungsdienst rd' },
        pol:   { name: 'Polizei',        color: '#2980b9', terms: 'polizei pol' },
        thw:   { name: 'THW',            color: '#3b6ea5', terms: 'thw technisches hilfswerk' },
        other: { name: 'Sonstige',       color: '#8a8f98', terms: 'sonstige' }
    };
 
    const STATUS_LABEL = {
        1: 'Einsatzbereit (Funk)', 2: 'Einsatzbereit (Wache)', 3: 'Anfahrt', 4: 'Am Einsatzort',
        5: 'Sprechwunsch', 6: 'Nicht einsatzbereit', 7: 'Patient aufgenommen', 8: 'Am Transportziel', 9: 'Status 9'
    };
 
    const DEFAULTS = {
        theme: 'dark',
        minCard: 340,
        poll: 60,
        sound: true,
        notify: false,
        autoScroll: false,
        scrollSpeed: 30,
        // Gebäudetyp-IDs je Gruppe (alles andere = Sonstige)
        groupIds: { fw: '0,1,18', rd: '2,3,5,12,20', pol: '6,8,11,13,17,19', thw: '9,10' },
        // Bedarfsanalyse: Fahrzeugtyp (Regex) je Gruppe, der pro Wache mind. 1x frei sein soll
        requirements: { fw: '', rd: 'RTW', pol: '', thw: '' },
        collapsed: {}
    };
 
    function loadSettings() {
        try {
            const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            return {
                ...DEFAULTS, ...raw,
                groupIds: { ...DEFAULTS.groupIds, ...(raw.groupIds || {}) },
                requirements: { ...DEFAULTS.requirements, ...(raw.requirements || {}) },
                collapsed: { ...(raw.collapsed || {}) }
            };
        } catch (e) {
            return JSON.parse(JSON.stringify(DEFAULTS));
        }
    }
 
    function saveSettings() {
        try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch (e) { /* ignorieren */ }
    }
 
    let cfg = loadSettings();
    let typeGroup = {};
 
    function buildTypeMap() {
        typeGroup = {};
        for (const key of Object.keys(GROUPS)) {
            if (key === 'other') continue;
            String(cfg.groupIds[key] || '').split(',').map(s => s.trim()).filter(Boolean)
                .forEach(id => { typeGroup[id] = key; });
        }
    }
    buildTypeMap();
 
    // ==================================================================
    // Zustand
    // ==================================================================
    const S = {
        vmap: new Map(),          // id -> Fahrzeug
        vehicles: [],
        byBuilding: new Map(),    // building_id -> [Fahrzeuge]
        buildings: new Map(),
        missions: [],
        missionById: new Map(),
        alliance: null,
        typeNames: {},
        lastChange: {},           // Fahrzeug-ID -> Uhrzeit des letzten Wechsels
        log: [],
        statusFilter: new Set(),
        typeFilter: '',
        sort: 'name',
        search: '',
        tab: 'wachen'
    };
 
    let overlay = null;
    let pollTimer = null;
    let renderTimer = null;
    let typeSig = '';
    let modalEl = null;
    let map = null;
    let mapLayer = null;
    let mapFitted = false;
    let scrollTimer = null;
    let scrollPauseUntil = 0;
    let bottomSince = 0;
    let audioCtx = null;
 
    // ==================================================================
    // Hilfsfunktionen
    // ==================================================================
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
 
    const nowTime = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const collator = (a, b) => String(a).localeCompare(String(b), 'de', { sensitivity: 'base', numeric: true });
 
    async function getJSON(url) {
        const r = await fetch(url, { credentials: 'same-origin' });
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json();
    }
 
    const vehicleFms = v => Number(v.fms_real ?? v.fms_show ?? 6);
    const isFreeFms = f => f === 1 || f === 2;
    const isFree = v => isFreeFms(vehicleFms(v));
    const typeLabel = v => v.vehicle_type_caption || S.typeNames[v.vehicle_type] || `Typ ${v.vehicle_type}`;
    const groupKeyOf = b => typeGroup[String(b.building_type)] || 'other';
    const isMissionTarget = v => String(v.target_type || '').toLowerCase() === 'mission' && v.target_id != null;
 
    function freeCount(buildingId) {
        return (S.byBuilding.get(buildingId) || []).filter(isFree).length;
    }
 
    function reqRegexes() {
        const res = {};
        for (const key of Object.keys(GROUPS)) {
            const src = (cfg.requirements[key] || '').trim();
            if (!src) continue;
            try { res[key] = { re: new RegExp(src, 'i'), label: src }; } catch (e) { /* ungültig -> ignorieren */ }
        }
        return res;
    }
 
    // ==================================================================
    // Ton & Benachrichtigungen
    // ==================================================================
    function beep() {
        if (!cfg.sound) return;
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.value = 880;
            g.gain.value = 0.08;
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start();
            o.stop(audioCtx.currentTime + 0.25);
        } catch (e) { /* Browser blockt Ton bis zur ersten Interaktion */ }
    }
 
    function notify(title, body, tag) {
        if (!cfg.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
        try { new Notification(title, { body, tag }); } catch (e) { /* ignorieren */ }
    }
 
    // ==================================================================
    // Styles
    // ==================================================================
    const style = document.createElement('style');
    style.textContent = `
        #lsd-overlay { --bg:#12151a; --panel:#1a1e25; --panel2:#20252d; --line:#2b313b; --text:#e6e8eb;
            --muted:#9aa3af; --hover:#242a33; --lsd-min:340px;
            position:fixed; inset:0; z-index:99999; background:var(--bg); color:var(--text);
            overflow-y:auto; font-family:inherit; display:none; }
        #lsd-overlay.light { --bg:#f2f4f7; --panel:#ffffff; --panel2:#eef1f5; --line:#d5dae1; --text:#1d232b;
            --muted:#5d6775; --hover:#e9edf2; }
        #lsd-overlay.open { display:block; }
        #lsd-overlay * { box-sizing:border-box; }
        #lsd-overlay a { color:inherit; }
 
        #lsd-header { position:sticky; top:0; z-index:1100; background:var(--panel); border-bottom:1px solid var(--line);
            padding:10px 20px 0; }
        .lsd-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
        #lsd-header h3 { margin:0; font-size:20px; color:var(--text); }
        .lsd-sub { color:var(--muted); font-size:13px; }
        #lsd-search { margin-left:auto; min-width:240px; }
        #lsd-overlay input[type=text], #lsd-overlay input[type=number], #lsd-overlay select {
            padding:5px 9px; border-radius:4px; border:1px solid var(--line); background:var(--bg); color:var(--text);
            height:auto; }
        .lsd-btn { background:var(--panel2); color:var(--text); border:1px solid var(--line); border-radius:4px;
            padding:5px 11px; cursor:pointer; font-size:13px; }
        .lsd-btn:hover { background:var(--hover); }
        .lsd-btn.lsd-danger { background:#DB1111; border-color:#DB1111; color:#fff; }
        .lsd-btn.lsd-primary { background:#2980b9; border-color:#2980b9; color:#fff; }
 
        .lsd-chip { border:1px solid var(--line); background:var(--panel2); color:var(--text); border-radius:14px;
            padding:3px 11px; cursor:pointer; font-size:13px; }
        .lsd-chip b { margin-right:4px; }
        .lsd-chip.on { background:var(--sc, #2980b9); border-color:var(--sc, #2980b9); color:#fff; }
        .lsd-chip.lsd-s5.pulse { animation:lsd-blink 1s infinite; }
 
        .lsd-tabs { display:flex; gap:2px; flex-wrap:wrap; }
        .lsd-tab { background:transparent; border:0; border-bottom:3px solid transparent; color:var(--muted);
            padding:8px 14px; cursor:pointer; font-size:14px; }
        .lsd-tab.on { color:var(--text); border-bottom-color:#DB1111; font-weight:600; }
 
        #lsd-body { padding:16px 20px 40px; }
        .lsd-pane { display:none; }
        .lsd-pane.on { display:block; }
        #lsd-pane-wachen.on { display:grid; gap:14px; grid-template-columns:repeat(auto-fill, minmax(var(--lsd-min), 1fr));
            align-items:start; }
        .lsd-empty { grid-column:1 / -1; text-align:center; color:var(--muted); padding:40px; }
 
        .lsd-card { background:var(--panel); border:1px solid var(--line); border-radius:6px; overflow:hidden; }
        .lsd-card.warn { border-color:#c0392b; }
        .lsd-card-head { display:flex; gap:8px; align-items:center; padding:8px 10px; background:var(--panel2);
            cursor:pointer; user-select:none; }
        .lsd-caret { color:var(--muted); width:12px; flex:none; font-size:11px; }
        .lsd-dot { width:10px; height:10px; border-radius:50%; flex:none; }
        .lsd-card-head a { font-weight:600; text-decoration:none; flex:1; overflow:hidden; text-overflow:ellipsis;
            white-space:nowrap; }
        .lsd-card-head a:hover { text-decoration:underline; }
        .lsd-count { font-size:12px; color:var(--muted); white-space:nowrap; }
        .lsd-meta { padding:4px 10px; font-size:12px; color:var(--muted); border-top:1px solid var(--line);
            display:flex; gap:10px; flex-wrap:wrap; }
        .lsd-warnbadge { color:#e74c3c; font-weight:600; }
        .lsd-vehicles { display:flex; flex-direction:column; border-top:1px solid var(--line); }
        .lsd-vehicle { display:flex; align-items:center; gap:10px; padding:5px 10px; text-decoration:none !important;
            border-bottom:1px solid var(--line); }
        .lsd-vehicle:last-child { border-bottom:0; }
        .lsd-vehicle:hover { background:var(--hover); }
        .lsd-vehicle.sprech { background:rgba(201,168,0,.18); animation:lsd-blink 1.2s infinite; }
        .lsd-vname { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .lsd-vname small { display:block; color:var(--muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; }
        .lsd-type { color:var(--muted); font-size:12px; width:72px; text-align:right; overflow:hidden;
            text-overflow:ellipsis; white-space:nowrap; }
        .lsd-time { color:var(--muted); font-size:12px; width:42px; text-align:right; flex:none; }
        @keyframes lsd-blink { 50% { opacity:.45; } }
 
        .lsd-status { min-width:26px; height:22px; line-height:22px; text-align:center; border-radius:3px; font-weight:700;
            font-size:13px; color:#fff; background:var(--sc, #6b7280); flex:none; padding:0 4px; display:inline-block; }
        .lsd-s1 { --sc:#2e9e3e; } .lsd-s2 { --sc:#1f7a2e; } .lsd-s3 { --sc:#e08a00; } .lsd-s4 { --sc:#c46a00; }
        .lsd-s5 { --sc:#c9a800; } .lsd-s6 { --sc:#4b5563; } .lsd-s7 { --sc:#c0392b; } .lsd-s8 { --sc:#8e44ad; }
        .lsd-s9 { --sc:#2980b9; }
        .lsd-status.lsd-s5 { color:#111; }
 
        .lsd-list { display:flex; flex-direction:column; gap:8px; max-width:1100px; }
        .lsd-mission { background:var(--panel); border:1px solid var(--line); border-left:5px solid #6b7280; border-radius:6px;
            padding:8px 12px; }
        .lsd-mission.m0 { border-left-color:#c0392b; } .lsd-mission.m1 { border-left-color:#e0b400; }
        .lsd-mission.m2 { border-left-color:#2e9e3e; }
        .lsd-mission .lsd-mhead { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; }
        .lsd-muted { color:var(--muted); font-size:12px; }
        .lsd-vchips { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
        .lsd-vchip { display:inline-flex; gap:5px; align-items:center; background:var(--panel2); border:1px solid var(--line);
            border-radius:4px; padding:1px 6px 1px 1px; font-size:12px; text-decoration:none !important; }
        .lsd-vchip .lsd-status { height:18px; line-height:18px; min-width:20px; font-size:11px; }
 
        .lsd-logrow { display:flex; gap:10px; align-items:center; padding:4px 8px; border-bottom:1px solid var(--line);
            font-size:13px; }
        .lsd-logrow .lsd-time { width:46px; }
        .lsd-logrow .arrow { color:var(--muted); }
 
        #lsd-map { height:calc(100vh - 230px); min-height:420px; border-radius:6px; border:1px solid var(--line); }
        #lsd-overlay:not(.light) #lsd-map .leaflet-tile-pane { filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9); }
 
        .lsd-modal-bg { position:fixed; inset:0; z-index:1200; background:rgba(0,0,0,.55); display:flex;
            align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto; }
        .lsd-modal { background:var(--panel); border:1px solid var(--line); border-radius:8px; width:100%; max-width:640px;
            padding:18px 22px; }
        .lsd-modal h4 { margin:0 0 12px; font-size:18px; }
        .lsd-modal fieldset { border:1px solid var(--line); border-radius:6px; padding:8px 12px 12px; margin:0 0 12px; }
        .lsd-modal legend { font-size:13px; color:var(--muted); width:auto; border:0; margin:0; padding:0 6px; }
        .lsd-field { display:flex; align-items:center; gap:10px; margin:6px 0; }
        .lsd-field label { flex:1; margin:0; font-weight:normal; }
        .lsd-field input[type=text] { width:220px; }
        .lsd-field input[type=number] { width:90px; }
        .lsd-modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:8px; }
 
        #lsd-floating-btn { position:fixed; right:14px; bottom:14px; z-index:9999; background:#DB1111; color:#fff; border:0;
            border-radius:4px; padding:8px 14px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.4); }
        #lsd-floating-btn:hover { background:#b80d0d; }
    `;
    document.head.appendChild(style);
 
    // ==================================================================
    // Daten laden & zusammenführen
    // ==================================================================
    async function loadTypeNames() {
        if (Object.keys(S.typeNames).length) return;
        try {
            const data = await getJSON('https://api.lss-manager.de/de_DE/vehicles');
            for (const [id, t] of Object.entries(data)) S.typeNames[id] = t.short_name || t.caption;
        } catch (e) {
            console.warn('[Leitstellenansicht] Fahrzeugtyp-Namen nicht geladen:', e);
        }
    }
 
    async function fetchMissions() {
        try {
            const m = await getJSON('/api/missions');
            return Array.isArray(m) ? m : [];
        } catch (e) {
            console.warn('[Leitstellenansicht] Einsätze nicht geladen:', e);
            return [];
        }
    }
 
    function setMissions(list) {
        S.missions = list;
        S.missionById = new Map(list.map(m => [m.id, m]));
    }
 
    function rebuildIndex() {
        S.vehicles = [...S.vmap.values()];
        S.byBuilding = new Map();
        for (const v of S.vehicles) {
            if (!S.byBuilding.has(v.building_id)) S.byBuilding.set(v.building_id, []);
            S.byBuilding.get(v.building_id).push(v);
        }
    }
 
    async function loadAll() {
        const [vs, bs] = await Promise.all([
            getJSON('/api/vehicles'),
            getJSON('/api/buildings'),
            loadTypeNames()
        ]);
        S.buildings = new Map(bs.map(b => [b.id, b]));
        S.vmap = new Map(vs.map(v => [v.id, v]));
        rebuildIndex();
        setMissions(await fetchMissions());
    }
 
    async function loadAlliance() {
        const [info, blds] = await Promise.allSettled([
            getJSON('/api/allianceinfo'),
            getJSON('/api/alliance_buildings')
        ]);
        S.alliance = {
            info: info.status === 'fulfilled' ? info.value : null,
            buildings: blds.status === 'fulfilled' && Array.isArray(blds.value) ? blds.value : null
        };
    }
 
    // Statuswechsel verarbeiten (Log, Ton, Benachrichtigung)
    function onFmsChange(v, oldFms, newFms) {
        S.lastChange[v.id] = nowTime();
        const b = S.buildings.get(v.building_id);
        const bName = b ? b.caption : '';
 
        S.log.unshift({ t: nowTime(), name: v.caption, bname: bName, from: oldFms, to: newFms });
        if (S.log.length > 200) S.log.length = 200;
 
        if (newFms === 5 && oldFms !== 5) {
            beep();
            notify('Sprechwunsch', `${v.caption}${bName ? ' (' + bName + ')' : ''}`, 'lsd-sw-' + v.id);
        }
 
        if (b) {
            const newFree = freeCount(v.building_id);
            const oldFree = newFree - (isFreeFms(newFms) ? 1 : 0) + (isFreeFms(oldFms) ? 1 : 0);
            if (oldFree > 0 && newFree === 0) {
                notify('Keine freien Fahrzeuge', b.caption, 'lsd-empty-' + b.id);
            }
        }
    }
 
    function applyFmsMessage(id, fms) {
        const v = S.vmap.get(id);
        if (!v || !Number.isFinite(fms)) return;
        const old = vehicleFms(v);
        if (old === fms) return;
        v.fms_real = fms;
        onFmsChange(v, old, fms);
        scheduleRender();
    }
 
    function mergeVehicles(fresh) {
        const seen = new Set();
        let structural = false;
        for (const f of fresh) {
            seen.add(f.id);
            const old = S.vmap.get(f.id);
            if (!old) {
                S.vmap.set(f.id, f);
                structural = true;
            } else {
                const oldFms = vehicleFms(old);
                Object.assign(old, f);
                const newFms = vehicleFms(old);
                if (oldFms !== newFms) onFmsChange(old, oldFms, newFms);
            }
        }
        for (const id of [...S.vmap.keys()]) {
            if (!seen.has(id)) { S.vmap.delete(id); structural = true; }
        }
        rebuildIndex();
        return structural;
    }
 
    async function poll() {
        hookRadioMessage();
        try {
            const [fresh, missions] = await Promise.all([getJSON('/api/vehicles'), fetchMissions()]);
            mergeVehicles(fresh);
            setMissions(missions);
            if (S.tab === 'alliance') await loadAlliance();
            scheduleRender();
        } catch (e) {
            console.warn('[Leitstellenansicht] Abgleich fehlgeschlagen:', e);
        }
    }
 
    function restartPoll() {
        clearInterval(pollTimer);
        pollTimer = setInterval(poll, Math.max(15, Number(cfg.poll) || 60) * 1000);
    }
 
    // Live-Updates über die radioMessage-Funktion des Spiels
    function hookRadioMessage() {
        if (typeof window.radioMessage !== 'function' || window.radioMessage.__lsd) return;
        const orig = window.radioMessage;
        const wrapped = function (msg) {
            try {
                if (msg && msg.type === 'vehicle_fms' && overlay && overlay.classList.contains('open')) {
                    const fms = Number(msg.fms_real ?? msg.fms);
                    if (msg.id != null) applyFmsMessage(Number(msg.id), fms);
                }
            } catch (e) { /* das Spiel nie stören */ }
            return orig.apply(this, arguments);
        };
        wrapped.__lsd = true;
        window.radioMessage = wrapped;
    }
 
    // ==================================================================
    // Rendering
    // ==================================================================
    function scheduleRender() {
        if (renderTimer) return;
        renderTimer = setTimeout(render, 150);
    }
 
    function render() {
        renderTimer = null;
        if (!overlay || !overlay.classList.contains('open')) return;
        updateHeader();
        switch (S.tab) {
            case 'wachen':   renderWachen(); break;
            case 'einsaetze': renderMissions(); break;
            case 'karte':    renderMap(); break;
            case 'verband':  renderAlliance(); break;
            case 'protokoll': renderLog(); break;
        }
    }
 
    function updateHeader() {
        // Status-Chips
        const counts = {};
        for (const v of S.vehicles) { const f = vehicleFms(v); counts[f] = (counts[f] || 0) + 1; }
        const total = S.vehicles.length;
        const avail = (counts[1] || 0) + (counts[2] || 0);
        overlay.querySelector('#lsd-sub').textContent = `${avail}/${total} Fahrzeuge verfügbar (S1/S2)`;
 
        let chips = '';
        for (let n = 1; n <= 9; n++) {
            const c = counts[n] || 0;
            const on = S.statusFilter.has(n);
            if (!c && !on) continue;
            chips += `<button type="button" class="lsd-chip lsd-s${n}${on ? ' on' : ''}${n === 5 && c ? ' pulse' : ''}"
                data-status="${n}" title="${esc(STATUS_LABEL[n])}"><b>${c}</b>S${n}</button>`;
        }
        if (S.statusFilter.size) chips += `<button type="button" class="lsd-chip" data-status="all">Filter zurücksetzen</button>`;
        overlay.querySelector('#lsd-chips').innerHTML = chips;
 
        // Typ-Filter
        const types = [...new Set(S.vehicles.map(typeLabel))].sort(collator);
        const sig = types.join('|');
        const sel = overlay.querySelector('#lsd-type');
        if (sig !== typeSig) {
            typeSig = sig;
            sel.innerHTML = `<option value="">Alle Fahrzeugtypen</option>` +
                types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
            sel.value = S.typeFilter;
            S.typeFilter = sel.value;
        }
 
        // Tabs & Panes
        overlay.querySelectorAll('.lsd-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === S.tab));
        overlay.querySelectorAll('.lsd-pane').forEach(p => p.classList.toggle('on', p.id === 'lsd-pane-' + S.tab));
        overlay.querySelector('#lsd-filters').style.display = S.tab === 'wachen' ? '' : 'none';
        overlay.querySelector('#lsd-chips').style.display = S.tab === 'wachen' || S.tab === 'protokoll' ? '' : 'none';
    }
 
    // ---- Wachen --------------------------------------------------------
    function renderWachen() {
        const pane = overlay.querySelector('#lsd-pane-wachen');
        const term = S.search.trim().toLowerCase();
        const filtersActive = !!(S.statusFilter.size || S.typeFilter || term);
        const reqs = reqRegexes();
 
        const passFilters = v =>
            (!S.statusFilter.size || S.statusFilter.has(vehicleFms(v))) &&
            (!S.typeFilter || typeLabel(v) === S.typeFilter);
        const vText = v => `${v.caption} ${typeLabel(v)}`.toLowerCase();
 
        const cards = [];
        for (const [bid, list] of S.byBuilding) {
            const b = S.buildings.get(bid);
            if (!b) continue;
            const gk = groupKeyOf(b);
            const g = GROUPS[gk];
            const bMatch = !term || `${g.terms} ${b.caption}`.toLowerCase().includes(term);
            const shown = list.filter(v => passFilters(v) && (bMatch || vText(v).includes(term)));
            if (!shown.length && filtersActive) continue;
 
            const freeList = list.filter(isFree);
            const warnings = [];
            if (freeList.length === 0) warnings.push('keine Fahrzeuge frei');
            const req = reqs[gk];
            if (req && list.some(v => req.re.test(typeLabel(v))) && !freeList.some(v => req.re.test(typeLabel(v)))) {
                warnings.push(`kein ${req.label} frei`);
            }
            cards.push({ b, gk, g, list, shown, free: freeList.length, warnings });
        }
 
        const sorters = {
            name:     (x, y) => collator(x.b.caption, y.b.caption),
            group:    (x, y) => collator(x.g.name, y.g.name) || collator(x.b.caption, y.b.caption),
            free:     (x, y) => (y.free - x.free) || collator(x.b.caption, y.b.caption),
            free_asc: (x, y) => (x.free - y.free) || collator(x.b.caption, y.b.caption)
        };
        cards.sort(sorters[S.sort] || sorters.name);
 
        if (!cards.length) {
            pane.innerHTML = `<div class="lsd-empty">${S.vehicles.length ? 'Keine Treffer für die aktuelle Filterung.' : 'Keine Fahrzeuge gefunden.'}</div>`;
            return;
        }
 
        pane.innerHTML = cards.map(c => {
            const { b, g, list, shown, free, warnings } = c;
            const collapsed = !!cfg.collapsed[b.id];
            const meta = [];
            if (b.personal_count != null) meta.push(`Personal: ${esc(b.personal_count)}`);
            if (b.level != null) meta.push(`Stufe: ${esc(b.level)}`);
            if (Array.isArray(b.extensions)) meta.push(`Ausbauten: ${b.extensions.length}`);
            warnings.forEach(w => meta.push(`<span class="lsd-warnbadge">⚠ ${esc(w)}</span>`));
 
            const vsorted = shown.slice().sort((x, y) => {
                const sx = vehicleFms(x) === 5 ? 0 : 1, sy = vehicleFms(y) === 5 ? 0 : 1;
                return (sx - sy) || collator(x.caption, y.caption);
            });
 
            const rows = collapsed ? '' : `<div class="lsd-vehicles">${vsorted.map(v => {
                const fms = vehicleFms(v);
                const m = isMissionTarget(v) ? S.missionById.get(v.target_id) : null;
                return `<a href="/vehicles/${v.id}" target="_blank" class="lsd-vehicle${fms === 5 ? ' sprech' : ''}">
                    <span class="lsd-status lsd-s${fms}" title="${esc(STATUS_LABEL[fms] || '')}">${fms}</span>
                    <span class="lsd-vname">${esc(v.caption)}${m ? `<small>${esc(m.caption)}</small>` : ''}</span>
                    <span class="lsd-type">${esc(typeLabel(v))}</span>
                    <span class="lsd-time" title="Letzter Statuswechsel (seit Öffnen der Ansicht)">${esc(S.lastChange[v.id] || '–')}</span>
                </a>`;
            }).join('')}</div>`;
 
            return `<div class="lsd-card${warnings.length ? ' warn' : ''}" data-bid="${b.id}">
                <div class="lsd-card-head">
                    <span class="lsd-caret">${collapsed ? '▸' : '▾'}</span>
                    <span class="lsd-dot" style="background:${g.color}" title="${esc(g.name)}"></span>
                    <a href="/buildings/${b.id}" target="_blank">${esc(b.caption)}</a>
                    <span class="lsd-count">${free}/${list.length} frei</span>
                </div>
                ${meta.length ? `<div class="lsd-meta">${meta.join('<span>·</span>')}</div>` : ''}
                ${rows}
            </div>`;
        }).join('');
    }
 
    // ---- Einsätze ------------------------------------------------------
    function renderMissions() {
        const pane = overlay.querySelector('#lsd-pane-einsaetze');
        if (!S.missions.length) {
            pane.innerHTML = `<div class="lsd-empty">Keine laufenden Einsätze (oder Einsätze konnten nicht geladen werden).</div>`;
            return;
        }
        const assigned = new Map();
        for (const v of S.vehicles) {
            if (!isMissionTarget(v)) continue;
            if (!assigned.has(v.target_id)) assigned.set(v.target_id, []);
            assigned.get(v.target_id).push(v);
        }
        const list = S.missions.slice().sort((a, b) => collator(a.caption || '', b.caption || ''));
        pane.innerHTML = `<div class="lsd-list">${list.map(m => {
            const vs = (assigned.get(m.id) || []).sort((a, b) => collator(a.caption, b.caption));
            const info = [];
            if (m.address) info.push(esc(m.address));
            if (m.patients_count) info.push(`${esc(m.patients_count)} Patient(en)`);
            return `<div class="lsd-mission m${esc(m.vehicle_state)}">
                <div class="lsd-mhead"><b>${esc(m.caption)}</b><span class="lsd-muted">${info.join(' · ')}</span></div>
                ${m.missing_text ? `<div class="lsd-muted">Fehlt: ${esc(m.missing_text)}</div>` : ''}
                <div class="lsd-vchips">${vs.length ? vs.map(v => {
                    const f = vehicleFms(v);
                    return `<a class="lsd-vchip" href="/vehicles/${v.id}" target="_blank">
                        <span class="lsd-status lsd-s${f}">${f}</span>${esc(v.caption)}</a>`;
                }).join('') : '<span class="lsd-muted">Keine Fahrzeuge zugewiesen</span>'}</div>
            </div>`;
        }).join('')}</div>`;
    }
 
    // ---- Karte ---------------------------------------------------------
    function renderMap() {
        const pane = overlay.querySelector('#lsd-pane-karte');
        const L = window.L;
        if (!L || typeof L.map !== 'function') {
            pane.innerHTML = `<div class="lsd-empty">Die Kartenbibliothek (Leaflet) ist im Spiel nicht verfügbar.</div>`;
            return;
        }
        if (!map) {
            pane.innerHTML = `<div id="lsd-map"></div>`;
            map = L.map(pane.querySelector('#lsd-map'), { zoomControl: true }).setView([51.0, 10.0], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18, attribution: '© OpenStreetMap'
            }).addTo(map);
            mapLayer = L.layerGroup().addTo(map);
        }
        setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* ignorieren */ } }, 50);
 
        const reqs = reqRegexes();
        mapLayer.clearLayers();
        const pts = [];
 
        for (const [bid, list] of S.byBuilding) {
            const b = S.buildings.get(bid);
            if (!b || b.latitude == null || b.longitude == null) continue;
            const gk = groupKeyOf(b);
            const free = list.filter(isFree).length;
            let warn = free === 0;
            const req = reqs[gk];
            if (req && list.some(v => req.re.test(typeLabel(v))) && !list.some(v => isFree(v) && req.re.test(typeLabel(v)))) warn = true;
            L.circleMarker([b.latitude, b.longitude], {
                radius: 8, color: warn ? '#e74c3c' : '#ffffff', weight: warn ? 3 : 1,
                fillColor: GROUPS[gk].color, fillOpacity: 0.9
            }).bindPopup(`<b>${esc(b.caption)}</b><br>${esc(GROUPS[gk].name)}<br>${free}/${list.length} Fahrzeuge frei`)
              .addTo(mapLayer);
            pts.push([b.latitude, b.longitude]);
        }
 
        const mColors = { 0: '#c0392b', 1: '#e0b400', 2: '#2e9e3e' };
        for (const m of S.missions) {
            if (m.latitude == null || m.longitude == null) continue;
            L.circleMarker([m.latitude, m.longitude], {
                radius: 5, color: '#111', weight: 1, fillColor: mColors[m.vehicle_state] || '#999', fillOpacity: 0.95
            }).bindPopup(`<b>${esc(m.caption)}</b><br>${esc(m.address || '')}`).addTo(mapLayer);
        }
 
        if (!mapFitted && pts.length) {
            try { map.fitBounds(pts, { padding: [30, 30] }); mapFitted = true; } catch (e) { /* ignorieren */ }
        }
    }
 
    // ---- Verband -------------------------------------------------------
    function renderAlliance() {
        const pane = overlay.querySelector('#lsd-pane-verband');
        if (!S.alliance) {
            pane.innerHTML = `<div class="lsd-empty">Lade Verbandsdaten …</div>`;
            loadAlliance().then(scheduleRender);
            return;
        }
        const { info, buildings } = S.alliance;
        if (!info && !buildings) {
            pane.innerHTML = `<div class="lsd-empty">Verbandsdaten nicht verfügbar (bist du in einem Verband?).</div>`;
            return;
        }
        let html = '<div class="lsd-list">';
        if (info) {
            const users = Array.isArray(info.users) ? info.users : null;
            const online = users ? users.filter(u => u.online).length : null;
            html += `<div class="lsd-mission"><b>${esc(info.name || 'Verband')}</b>
                <div class="lsd-muted">${users ? `${users.length} Mitglieder` : ''}${online != null ? ` · ${online} online` : ''}</div></div>`;
        }
        if (buildings) {
            const term = S.search.trim().toLowerCase();
            const counts = {};
            for (const b of buildings) { const k = groupKeyOf(b); counts[k] = (counts[k] || 0) + 1; }
            html += `<div class="lsd-mission"><b>Verbandsgebäude: ${buildings.length}</b>
                <div class="lsd-vchips">${Object.keys(GROUPS).filter(k => counts[k]).map(k =>
                    `<span class="lsd-vchip" style="padding:2px 8px"><span class="lsd-dot" style="background:${GROUPS[k].color}"></span>${esc(GROUPS[k].name)}: ${counts[k]}</span>`
                ).join('')}</div></div>`;
            const rows = buildings
                .filter(b => !term || `${b.caption} ${GROUPS[groupKeyOf(b)].terms}`.toLowerCase().includes(term))
                .sort((a, b) => collator(a.caption || '', b.caption || ''));
            const LIMIT = 300;
            html += rows.slice(0, LIMIT).map(b => {
                const g = GROUPS[groupKeyOf(b)];
                return `<div class="lsd-logrow"><span class="lsd-dot" style="background:${g.color}"></span>
                    <b>${esc(b.caption)}</b><span class="lsd-muted">${esc(g.name)}</span></div>`;
            }).join('');
            if (rows.length > LIMIT) html += `<div class="lsd-muted">… und ${rows.length - LIMIT} weitere (Suche nutzen)</div>`;
        }
        html += '</div>';
        pane.innerHTML = html;
    }
 
    // ---- Protokoll -----------------------------------------------------
    function renderLog() {
        const pane = overlay.querySelector('#lsd-pane-protokoll');
        if (!S.log.length) {
            pane.innerHTML = `<div class="lsd-empty">Noch keine Statuswechsel seit dem Öffnen der Ansicht.</div>`;
            return;
        }
        const term = S.search.trim().toLowerCase();
        const rows = S.log.filter(l =>
            (!S.statusFilter.size || S.statusFilter.has(l.to)) &&
            (!term || `${l.name} ${l.bname}`.toLowerCase().includes(term)));
        pane.innerHTML = `<div class="lsd-list">${rows.map(l => `<div class="lsd-logrow">
            <span class="lsd-time">${esc(l.t)}</span>
            <span class="lsd-status lsd-s${l.from}">${l.from}</span><span class="arrow">→</span>
            <span class="lsd-status lsd-s${l.to}">${l.to}</span>
            <b>${esc(l.name)}</b><span class="lsd-muted">${esc(l.bname)}</span></div>`).join('')}</div>`;
    }
 
    // ==================================================================
    // Einstellungen
    // ==================================================================
    function applyTheme() {
        if (!overlay) return;
        overlay.classList.toggle('light', cfg.theme === 'light');
        overlay.style.setProperty('--lsd-min', `${Math.max(220, Math.min(700, Number(cfg.minCard) || 340))}px`);
    }
 
    function openSettings() {
        if (modalEl) return;
        const gi = k => `<div class="lsd-field"><label>${esc(GROUPS[k].name)}</label>
            <input type="text" data-g="${k}" value="${esc(cfg.groupIds[k])}" placeholder="z. B. 0,1,18"></div>`;
        const rq = k => `<div class="lsd-field"><label>${esc(GROUPS[k].name)}</label>
            <input type="text" data-r="${k}" value="${esc(cfg.requirements[k])}" placeholder="z. B. RTW oder LF|HLF"></div>`;
 
        modalEl = document.createElement('div');
        modalEl.className = 'lsd-modal-bg';
        modalEl.innerHTML = `<div class="lsd-modal">
            <h4>Einstellungen</h4>
            <fieldset><legend>Darstellung</legend>
                <div class="lsd-field"><label>Design</label>
                    <select data-s="theme"><option value="dark">Dunkel</option><option value="light">Hell</option></select></div>
                <div class="lsd-field"><label>Mindestbreite der Wachen-Karten (px)</label>
                    <input type="number" data-s="minCard" min="220" max="700" step="10" value="${esc(cfg.minCard)}"></div>
                <div class="lsd-field"><label>Aktualisierung per API (Sekunden, min. 15)</label>
                    <input type="number" data-s="poll" min="15" step="5" value="${esc(cfg.poll)}"></div>
            </fieldset>
            <fieldset><legend>Warnungen</legend>
                <div class="lsd-field"><label>Ton bei Sprechwunsch</label>
                    <input type="checkbox" data-s="sound" ${cfg.sound ? 'checked' : ''}></div>
                <div class="lsd-field"><label>Desktop-Benachrichtigungen (Sprechwunsch, Wache ohne freie Fahrzeuge)</label>
                    <input type="checkbox" data-s="notify" ${cfg.notify ? 'checked' : ''}></div>
            </fieldset>
            <fieldset><legend>Wandanzeige</legend>
                <div class="lsd-field"><label>Automatisch durch die Wachen scrollen</label>
                    <input type="checkbox" data-s="autoScroll" ${cfg.autoScroll ? 'checked' : ''}></div>
                <div class="lsd-field"><label>Scroll-Geschwindigkeit (Pixel pro Sekunde)</label>
                    <input type="number" data-s="scrollSpeed" min="20" max="400" step="10" value="${esc(cfg.scrollSpeed)}"></div>
            </fieldset>
            <fieldset><legend>Gebäudetyp-IDs je Organisation (kommagetrennt)</legend>
                ${['fw', 'rd', 'pol', 'thw'].map(gi).join('')}
            </fieldset>
            <fieldset><legend>Bedarfsanalyse: Fahrzeugtyp (Regex), der pro Wache mind. 1× frei sein soll</legend>
                ${['fw', 'rd', 'pol', 'thw'].map(rq).join('')}
            </fieldset>
            <div class="lsd-modal-actions">
                <button type="button" class="lsd-btn" data-act="settings-reset">Zurücksetzen</button>
                <button type="button" class="lsd-btn" data-act="settings-cancel">Abbrechen</button>
                <button type="button" class="lsd-btn lsd-primary" data-act="settings-save">Speichern</button>
            </div></div>`;
        overlay.appendChild(modalEl);
        modalEl.querySelector('[data-s="theme"]').value = cfg.theme;
    }
 
    function closeSettings() {
        if (modalEl) { modalEl.remove(); modalEl = null; }
    }
 
    function saveSettingsFromModal() {
        const next = JSON.parse(JSON.stringify(cfg));
        modalEl.querySelectorAll('[data-s]').forEach(el => {
            const k = el.dataset.s;
            if (el.type === 'checkbox') next[k] = el.checked;
            else if (el.type === 'number') next[k] = Number(el.value) || DEFAULTS[k];
            else next[k] = el.value;
        });
        modalEl.querySelectorAll('[data-g]').forEach(el => { next.groupIds[el.dataset.g] = el.value; });
        modalEl.querySelectorAll('[data-r]').forEach(el => { next.requirements[el.dataset.r] = el.value; });
        next.poll = Math.max(15, next.poll);
        cfg = next;
        saveSettings();
        buildTypeMap();
        applyTheme();
        restartPoll();
        startAutoScroll();
        if (cfg.notify && 'Notification' in window && Notification.permission === 'default') {
            try { Notification.requestPermission(); } catch (e) { /* ignorieren */ }
        }
        closeSettings();
        scheduleRender();
    }
 
    // ==================================================================
    // Auto-Scroll, Vollbild
    // ==================================================================
    function stopAutoScroll() {
        clearInterval(scrollTimer);
        scrollTimer = null;
    }
 
    function startAutoScroll() {
        stopAutoScroll();
        if (!cfg.autoScroll) return;
        scrollTimer = setInterval(() => {
            if (!overlay || !overlay.classList.contains('open') || S.tab !== 'wachen' || modalEl) return;
            if (Date.now() < scrollPauseUntil) return;
            const max = overlay.scrollHeight - overlay.clientHeight;
            if (max <= 0) return;
            if (overlay.scrollTop >= max - 1) {
                if (!bottomSince) bottomSince = Date.now();
                if (Date.now() - bottomSince > 4000) { overlay.scrollTop = 0; bottomSince = Date.now() + 4000; }
                return;
            }
            bottomSince = 0;
            overlay.scrollTop += Math.max(1, Math.round((Number(cfg.scrollSpeed) || 30) * 0.05));
        }, 50);
    }
 
    function toggleFullscreen() {
        try {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (overlay.requestFullscreen) overlay.requestFullscreen();
        } catch (e) { /* ignorieren */ }
    }
 
    // ==================================================================
    // Overlay
    // ==================================================================
    function buildOverlay() {
        overlay = document.createElement('div');
        overlay.id = 'lsd-overlay';
        overlay.innerHTML = `
            <div id="lsd-header">
                <div class="lsd-row">
                    <h3>Leitstellenansicht</h3>
                    <span class="lsd-sub" id="lsd-sub">Lade Daten …</span>
                    <input type="text" id="lsd-search" placeholder="Suche (Gebäude, Fahrzeug, FW, RD, Pol …)">
                    <button type="button" class="lsd-btn" data-act="settings" title="Einstellungen">⚙ Einstellungen</button>
                    <button type="button" class="lsd-btn" data-act="newtab" title="In neuem Tab öffnen (z. B. für zweiten Monitor)">⧉ Neuer Tab</button>
                    <button type="button" class="lsd-btn" data-act="fullscreen" title="Vollbild">⛶ Vollbild</button>
                    <button type="button" class="lsd-btn lsd-danger" data-act="close">Schließen (Esc)</button>
                </div>
                <div class="lsd-row" id="lsd-chips"></div>
                <div class="lsd-row" id="lsd-filters">
                    <select id="lsd-type"><option value="">Alle Fahrzeugtypen</option></select>
                    <select id="lsd-sort">
                        <option value="name">Sortierung: Name</option>
                        <option value="group">Sortierung: Organisation</option>
                        <option value="free">Sortierung: meiste freie</option>
                        <option value="free_asc">Sortierung: wenigste freie</option>
                    </select>
                    <button type="button" class="lsd-btn" data-act="collapse">Alle einklappen</button>
                    <button type="button" class="lsd-btn" data-act="expand">Alle ausklappen</button>
                </div>
                <div class="lsd-tabs">
                    <button type="button" class="lsd-tab on" data-tab="wachen">Wachen</button>
                    <button type="button" class="lsd-tab" data-tab="einsaetze">Einsätze</button>
                    <button type="button" class="lsd-tab" data-tab="karte">Karte</button>
                    <button type="button" class="lsd-tab" data-tab="verband">Verband</button>
                    <button type="button" class="lsd-tab" data-tab="protokoll">Protokoll</button>
                </div>
            </div>
            <div id="lsd-body">
                <div class="lsd-pane on" id="lsd-pane-wachen"><div class="lsd-empty">Lade Daten …</div></div>
                <div class="lsd-pane" id="lsd-pane-einsaetze"></div>
                <div class="lsd-pane" id="lsd-pane-karte"></div>
                <div class="lsd-pane" id="lsd-pane-verband"></div>
                <div class="lsd-pane" id="lsd-pane-protokoll"></div>
            </div>`;
        document.body.appendChild(overlay);
        applyTheme();
 
        overlay.addEventListener('click', onClick);
        overlay.querySelector('#lsd-search').addEventListener('input', e => { S.search = e.target.value; scheduleRender(); });
        overlay.querySelector('#lsd-type').addEventListener('change', e => { S.typeFilter = e.target.value; scheduleRender(); });
        overlay.querySelector('#lsd-sort').addEventListener('change', e => { S.sort = e.target.value; scheduleRender(); });
 
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                if (modalEl) closeSettings(); else closeOverlay();
            }
        });
        ['wheel', 'touchstart', 'mousedown', 'keydown'].forEach(ev =>
            overlay.addEventListener(ev, () => { scrollPauseUntil = Date.now() + 15000; }, { passive: true }));
    }
 
    function onClick(e) {
        const t = e.target;
 
        const act = t.closest('[data-act]');
        if (act) {
            switch (act.dataset.act) {
                case 'close': closeOverlay(); break;
                case 'settings': openSettings(); break;
                case 'settings-cancel': closeSettings(); break;
                case 'settings-save': saveSettingsFromModal(); break;
                case 'settings-reset':
                    cfg = JSON.parse(JSON.stringify(DEFAULTS));
                    saveSettings(); buildTypeMap(); applyTheme(); restartPoll(); startAutoScroll();
                    closeSettings(); scheduleRender();
                    break;
                case 'newtab': window.open(window.location.origin + '/' + OPEN_HASH, '_blank'); break;
                case 'fullscreen': toggleFullscreen(); break;
                case 'collapse':
                    for (const id of S.byBuilding.keys()) cfg.collapsed[id] = true;
                    saveSettings(); scheduleRender();
                    break;
                case 'expand':
                    cfg.collapsed = {};
                    saveSettings(); scheduleRender();
                    break;
            }
            return;
        }
 
        const tab = t.closest('[data-tab]');
        if (tab) {
            S.tab = tab.dataset.tab;
            scrollPauseUntil = 0;
            if (S.tab === 'verband' && !S.alliance) loadAlliance().then(scheduleRender);
            render();
            return;
        }
 
        const chip = t.closest('[data-status]');
        if (chip) {
            if (chip.dataset.status === 'all') S.statusFilter.clear();
            else {
                const n = Number(chip.dataset.status);
                if (S.statusFilter.has(n)) S.statusFilter.delete(n); else S.statusFilter.add(n);
            }
            scheduleRender();
            return;
        }
 
        const head = t.closest('.lsd-card-head');
        if (head && !t.closest('a')) {
            const bid = head.parentElement.dataset.bid;
            if (cfg.collapsed[bid]) delete cfg.collapsed[bid]; else cfg.collapsed[bid] = true;
            saveSettings();
            scheduleRender();
        }
    }
 
    async function openOverlay() {
        if (!overlay) buildOverlay();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        hookRadioMessage();
        try {
            await loadAll();
            render();
        } catch (e) {
            console.error('[Leitstellenansicht]', e);
            overlay.querySelector('#lsd-pane-wachen').innerHTML =
                `<div class="lsd-empty">Daten konnten nicht geladen werden (${esc(e.message)}).</div>`;
        }
        restartPoll();
        startAutoScroll();
    }
 
    function closeOverlay() {
        closeSettings();
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        clearInterval(pollTimer);
        stopAutoScroll();
        try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ignorieren */ }
    }
 
    // ==================================================================
    // Start: fester Button
    // ==================================================================
    function addButton() {
        const btn = document.createElement('button');
        btn.id = 'lsd-floating-btn';
        btn.type = 'button';
        btn.textContent = 'Leitstellenansicht';
        btn.addEventListener('click', openOverlay);
        document.body.appendChild(btn);
    }
 
    addButton();
    if (window.location.hash === OPEN_HASH) openOverlay();
})();
