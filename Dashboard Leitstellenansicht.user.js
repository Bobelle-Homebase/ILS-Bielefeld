// ==UserScript==
// @name         Dashboard Leitstellenansicht
// @namespace    https://leitstellenspiel.de/dashboard
// @version      1.0.16
// @author       Design by Bobelle
// @description  Leitstellenansicht: Übersicht aller Fahrzeuge nach Gebäuden mit Live-Status
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Leitstellenansicht.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Leitstellenansicht.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Hauptfenster der Startseite ausführen
    if (window.top !== window.self) return;
    if (window.location.pathname !== '/') return;

    // ==================================================================
    // Konstanten
    // ==================================================================
    const LS_KEY = 'lsd_settings_v4';
    const OLD_LS_KEY = 'lsd_settings_v3';
    const SINCE_KEY = 'lsd_since_v1';
    const HIST_KEY = 'lsd_hist_v1';
    const ICON_KEY = 'lsd_icon_pos';
    const ICON_SIZE = 44;
    const OPEN_HASH = '#leitstellenansicht';

    // Sprachcode für die LSS-Manager-Fahrzeugliste je Spielversion
    const HOST_LOCALE = {
        'leitstellenspiel.de': 'de_DE', 'missionchief.com': 'en_US', 'missionchief.co.uk': 'en_GB',
        'missionchief-australia.com': 'en_AU', 'meldkamerspel.com': 'nl_NL', 'larmcentralen-spelet.se': 'sv_SE',
        'operatorratunkowy.pl': 'pl_PL', 'operacni-stredisko.cz': 'cs_CZ'
    };
    const LOCALE = HOST_LOCALE[window.location.hostname.replace(/^www\./, '')] || 'de_DE';

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

    const TABS = [
        { id: 'wachen',    label: 'Wachen' },
        { id: 'einsaetze', label: 'Einsätze' },
        { id: 'karte',     label: 'Karte' },
        { id: 'verband',   label: 'Verband' },
        { id: 'kliniken',  label: 'Krankenhäuser' },
        { id: 'verlauf',   label: 'Verlauf' },
        { id: 'protokoll', label: 'Protokoll' }
    ];

    const CUSTOM_COLORS = ['#16a085', '#8e44ad', '#d35400', '#27ae60', '#c0392b', '#2c3e50', '#b8860b', '#e84393'];

    // Fahrzeugkategorien: "Name=Regex" pro Zeile, erste passende Zeile gewinnt, Rest = "Sonderfahrzeuge"
    const DEFAULT_VEHCATS = [
        'THW=^(?:GKW|MTW-TZ|MzGW|BRmG|FGr|THW|MLW|LKW K)',
        'Rettungsmittel=^(?:RTW|NEF|NAW|KTW|RTH|ITW|ITH|GRTW|LNA|OrgL|MTF|SEG)',
        'Polizeifahrzeuge=^(?:FuStW|GefKw|Streife|MEK|SEK|BePo|PHuBS|Polizei|Wasserwerfer|Sonderwagen)',
        'Führungsfahrzeuge=^(?:ELW|KdoW|FüKW|Führ)',
        'Löschfahrzeuge=^(?:LF|HLF|TLF|TSF|MLF|KLF|VLF|TroLF|DLK|TM|SW|WLF|RW|AB)'
    ].join('\n');

    const DEFAULTS = {
        theme: 'dark',
        minCard: 340,
        fontSize: 14,
        compact: false,
        clock: true,
        poll: 60,
        sound: true,
        notify: false,
        autoScroll: false,
        scrollSpeed: 30,
        groupIds: { fw: '0,1,18', rd: '2,3,5,12,20', pol: '6,8,11,13,17,19', thw: '9,10' },
        requirements: { fw: '', rd: 'RTW', pol: '', thw: '' },
        vehCats: DEFAULT_VEHCATS,
        dwell: { 4: 45, 5: 3, 6: 120 },   // Minuten, 0 = aus
        minStaff: 2,                       // Personal pro Fahrzeug, 0 = aus
        collapsed: {},
        favs: {},
        hidden: {},
        custom: {},                        // Gebäude-ID -> eigene Kategorie
        ui: { cat: '', sort: 'name', status: [], type: '', leit: '', vcat: '', tab: 'wachen',
              showHidden: false, msort: 'urgency', monly: false, hrange: 6 }
    };

    function mergeCfg(raw) {
        const d = JSON.parse(JSON.stringify(DEFAULTS));
        if (!raw || typeof raw !== 'object') return d;
        for (const k of Object.keys(d)) {
            if (!(k in raw)) continue;
            if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) {
                d[k] = { ...d[k], ...(raw[k] && typeof raw[k] === 'object' ? raw[k] : {}) };
            } else {
                d[k] = raw[k];
            }
        }
        return d;
    }

    function loadJSON(key, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            return v == null ? fallback : v;
        } catch (e) { return fallback; }
    }

    function saveJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignorieren */ }
    }

    let cfg = mergeCfg(loadJSON(LS_KEY, null) || loadJSON(OLD_LS_KEY, null));
    const saveSettings = () => saveJSON(LS_KEY, cfg);

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
        vmap: new Map(),
        vehicles: [],
        byBuilding: new Map(),
        buildings: new Map(),
        missions: [],
        missionById: new Map(),
        alliance: null,
        typeNames: {},
        log: [],
        flash: {},                         // Fahrzeug-ID -> Zeitpunkt des letzten Wechsels (für Aufleuchten)
        ack: new Set(),                    // quittierte Sprechwünsche
        statusFilter: new Set(cfg.ui.status || []),
        search: ''
    };

    let since = loadJSON(SINCE_KEY, {});   // Fahrzeug-ID -> [Status, Zeitstempel]
    let hist = loadJSON(HIST_KEY, []);
    if (!Array.isArray(hist)) hist = [];

    let overlay = null;
    let modalEl = null;
    let renderTimer = null;
    let sinceSaveTimer = null;
    let typeSig = '', leitSig = '', vcatSig = '';
    let map = null, mapLayer = null, mapFitted = false;
    let timers = {};
    let scrollPauseUntil = 0, bottomSince = 0;
    let audioCtx = null;
    let pollCount = 0;
    let origTitle = document.title;
    let iconReposition = () => {};

    // ==================================================================
    // Hilfsfunktionen
    // ==================================================================
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
    const pad2 = n => String(n).padStart(2, '0');
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

    const customColor = name => {
        let h = 0;
        for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        return CUSTOM_COLORS[h % CUSTOM_COLORS.length];
    };

    function freeCount(buildingId) {
        return (S.byBuilding.get(buildingId) || []).filter(isFree).length;
    }

    function inCategory(b) {
        const c = cfg.ui.cat;
        if (!c) return true;
        if (c.startsWith('c:')) return cfg.custom[b.id] === c.slice(2);
        return groupKeyOf(b) === c;
    }

    function reqRegexes() {
        const res = {};
        for (const key of Object.keys(GROUPS)) {
            const src = (cfg.requirements[key] || '').trim();
            if (!src) continue;
            try { res[key] = { re: new RegExp(src, 'i'), label: src }; } catch (e) { /* ungültig */ }
        }
        return res;
    }

    // Fahrzeugkategorien (aus Textfeld)
    let vcCache = { src: null, list: [] };
    function vehCatList() {
        if (vcCache.src === cfg.vehCats) return vcCache.list;
        const list = [];
        String(cfg.vehCats || '').split('\n').forEach(line => {
            const i = line.indexOf('=');
            if (i < 1) return;
            try { list.push({ name: line.slice(0, i).trim(), re: new RegExp(line.slice(i + 1).trim(), 'i') }); }
            catch (e) { /* ungültige Zeile ignorieren */ }
        });
        vcCache = { src: cfg.vehCats, list };
        return list;
    }
    function vehCatOf(v) {
        const label = typeLabel(v);
        for (const c of vehCatList()) if (c.re.test(label)) return c.name;
        return 'Sonderfahrzeuge';
    }

    // Zeit seit Statuswechsel
    function sinceTs(v) { const s = since[v.id]; return s ? s[1] : null; }
    function fmtAgo(ms) {
        const m = Math.floor(ms / 60000);
        if (m < 1) return '<1 min';
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} h ${pad2(m % 60)}`;
        return `${Math.floor(h / 24)} d ${h % 24} h`;
    }
    function dwellOver(v) {
        const thr = Number(cfg.dwell[vehicleFms(v)]) || 0;
        const ts = sinceTs(v);
        return thr > 0 && ts != null && (Date.now() - ts) > thr * 60000;
    }
    function saveSinceSoon() {
        clearTimeout(sinceSaveTimer);
        sinceSaveTimer = setTimeout(() => saveJSON(SINCE_KEY, since), 3000);
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
            overflow-y:auto; font-family:inherit; font-size:14px; display:none; }
        #lsd-overlay.light { --bg:#f2f4f7; --panel:#ffffff; --panel2:#eef1f5; --line:#d5dae1; --text:#1d232b;
            --muted:#5d6775; --hover:#e9edf2; }
        #lsd-overlay.open { display:block; }
        #lsd-overlay * { box-sizing:border-box; }
        #lsd-overlay a { color:inherit; }

        #lsd-header { position:sticky; top:0; z-index:1100; background:var(--panel); border-bottom:1px solid var(--line);
            padding:10px 20px 0; }
        .lsd-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
        #lsd-header h3 { margin:0; font-size:1.4em; color:var(--text); }
        .lsd-sub { color:var(--muted); font-size:.93em; }
        #lsd-clock { display:none; flex-direction:column; line-height:1.1; text-align:center; padding:0 8px; }
        #lsd-clock.on { display:flex; }
        #lsd-clock b { font-size:1.9em; font-variant-numeric:tabular-nums; }
        #lsd-clock span { color:var(--muted); font-size:.86em; }
        #lsd-search { margin-left:auto; min-width:240px; }
        #lsd-overlay input[type=text], #lsd-overlay input[type=number], #lsd-overlay select, #lsd-overlay textarea {
            padding:5px 9px; border-radius:4px; border:1px solid var(--line); background:var(--bg); color:var(--text);
            height:auto; font-size:inherit; }
        .lsd-btn { background:var(--panel2); color:var(--text); border:1px solid var(--line); border-radius:4px;
            padding:5px 11px; cursor:pointer; font-size:.93em; }
        .lsd-btn:hover { background:var(--hover); }
        .lsd-btn.lsd-danger { background:#DB1111; border-color:#DB1111; color:#fff; }
        .lsd-btn.lsd-primary { background:#2980b9; border-color:#2980b9; color:#fff; }
        .lsd-check { display:inline-flex; align-items:center; gap:5px; font-size:.93em; color:var(--muted); cursor:pointer;
            margin:0; font-weight:normal; }

        .lsd-chip { border:1px solid var(--line); background:var(--panel2); color:var(--text); border-radius:14px;
            padding:3px 11px; cursor:pointer; font-size:.93em; }
        .lsd-chip b { margin-right:4px; }
        .lsd-chip.on { background:var(--sc, #2980b9); border-color:var(--sc, #2980b9); color:#fff; }
        .lsd-chip.lsd-s5.pulse { animation:lsd-blink 1s infinite; }

        .lsd-cat { display:inline-flex; align-items:center; gap:7px; border:1px solid var(--line); background:var(--panel2);
            color:var(--text); border-radius:6px; padding:5px 12px; cursor:pointer; font-size:.93em; }
        .lsd-cat:hover { background:var(--hover); }
        .lsd-cat.on { background:var(--cc, #2980b9); border-color:var(--cc, #2980b9); color:#fff; font-weight:600; }
        .lsd-cat .lsd-dot { box-shadow:0 0 0 1px rgba(255,255,255,.5); }
        .lsd-cat small { opacity:.8; font-size:.86em; }

        .lsd-tabs { display:flex; gap:2px; flex-wrap:wrap; }
        .lsd-tab { background:transparent; border:0; border-bottom:3px solid transparent; color:var(--muted);
            padding:8px 14px; cursor:pointer; font-size:1em; }
        .lsd-tab.on { color:var(--text); border-bottom-color:#DB1111; font-weight:600; }

        #lsd-body { padding:16px 20px 40px; }
        .lsd-pane { display:none; }
        .lsd-pane.on { display:block; }
        #lsd-pane-wachen.on { display:grid; gap:14px; grid-template-columns:repeat(auto-fill, minmax(var(--lsd-min), 1fr));
            align-items:start; }
        .lsd-empty { grid-column:1 / -1; text-align:center; color:var(--muted); padding:40px; }

        .lsd-grouphead { grid-column:1 / -1; display:flex; align-items:center; gap:8px; font-size:1.07em; font-weight:600;
            padding:6px 2px 2px; border-bottom:2px solid var(--gc, var(--line)); margin-top:6px; }
        .lsd-grouphead small { color:var(--muted); font-weight:normal; }

        .lsd-card { background:var(--panel); border:1px solid var(--line); border-radius:6px; overflow:hidden; }
        .lsd-card.warn { border-color:#c0392b; }
        .lsd-card.fav { box-shadow:inset 3px 0 0 #f1c40f; }
        .lsd-card.ishidden { opacity:.5; }
        .lsd-card-head { display:flex; gap:7px; align-items:center; padding:8px 10px; background:var(--panel2);
            cursor:pointer; user-select:none; }
        .lsd-caret { color:var(--muted); width:12px; flex:none; font-size:.8em; }
        .lsd-dot { width:10px; height:10px; border-radius:50%; flex:none; display:inline-block; }
        .lsd-card-head a { font-weight:600; text-decoration:none; flex:1; overflow:hidden; text-overflow:ellipsis;
            white-space:nowrap; }
        .lsd-card-head a:hover { text-decoration:underline; }
        .lsd-count { font-size:.86em; color:var(--muted); white-space:nowrap; }
        .lsd-ico { cursor:pointer; color:var(--muted); font-size:.93em; padding:0 2px; flex:none; }
        .lsd-ico:hover { color:var(--text); }
        .lsd-ico.starred { color:#f1c40f; }
        .lsd-meta { padding:4px 10px; font-size:.86em; color:var(--muted); border-top:1px solid var(--line);
            display:flex; gap:10px; flex-wrap:wrap; }
        .lsd-tag { color:#fff; border-radius:3px; padding:0 6px; }
        .lsd-warnbadge { color:#e74c3c; font-weight:600; }
        .lsd-vehicles { display:flex; flex-direction:column; border-top:1px solid var(--line); }
        .lsd-vehicle { display:flex; align-items:center; gap:10px; padding:5px 10px; text-decoration:none !important;
            border-bottom:1px solid var(--line); }
        .lsd-vehicle:last-child { border-bottom:0; }
        .lsd-vehicle:hover { background:var(--hover); }
        .lsd-vehicle.sprech { background:rgba(201,168,0,.18); animation:lsd-blink 1.2s infinite; }
        .lsd-vehicle.sprech.acked { animation:none; }
        .lsd-vehicle.flash { animation:lsd-flash 5s ease-out 1; }
        .lsd-vname { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .lsd-vname small { display:block; color:var(--muted); font-size:.8em; overflow:hidden; text-overflow:ellipsis; }
        .lsd-type { color:var(--muted); font-size:.86em; width:72px; text-align:right; overflow:hidden;
            text-overflow:ellipsis; white-space:nowrap; }
        .lsd-time { color:var(--muted); font-size:.86em; width:62px; text-align:right; flex:none; white-space:nowrap; }
        .lsd-time.dwell { color:#e74c3c; font-weight:700; }
        .lsd-ack { background:#c9a800; color:#111; border-radius:3px; padding:0 6px; font-weight:700; cursor:pointer; flex:none; }
        @keyframes lsd-blink { 50% { opacity:.45; } }
        @keyframes lsd-flash { 0% { background:rgba(52,152,219,.65); } 100% { background:transparent; } }

        #lsd-overlay.compact .lsd-vehicle { padding:2px 10px; gap:8px; }
        #lsd-overlay.compact .lsd-card-head { padding:5px 8px; }
        #lsd-overlay.compact .lsd-meta { padding:2px 8px; }
        #lsd-overlay.compact .lsd-status { height:18px; line-height:18px; min-width:22px; }
        #lsd-overlay.compact #lsd-pane-wachen.on { gap:8px; }

        .lsd-status { min-width:26px; height:22px; line-height:22px; text-align:center; border-radius:3px; font-weight:700;
            font-size:.93em; color:#fff; background:var(--sc, #6b7280); flex:none; padding:0 4px; display:inline-block; }
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
        .lsd-muted { color:var(--muted); font-size:.86em; }
        .lsd-badge { background:#c0392b; color:#fff; border-radius:3px; padding:0 6px; font-size:.8em; margin-left:6px; }
        .lsd-vchips { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
        .lsd-vchip { display:inline-flex; gap:5px; align-items:center; background:var(--panel2); border:1px solid var(--line);
            border-radius:4px; padding:1px 6px 1px 1px; font-size:.86em; text-decoration:none !important; }
        .lsd-vchip .lsd-status { height:18px; line-height:18px; min-width:20px; font-size:.8em; }

        .lsd-logrow { display:flex; gap:10px; align-items:center; padding:4px 8px; border-bottom:1px solid var(--line);
            font-size:.93em; }
        .lsd-logrow .lsd-time { width:46px; }
        .lsd-logrow .arrow { color:var(--muted); }

        #lsd-map { height:calc(100vh - 260px); min-height:420px; border-radius:6px; border:1px solid var(--line); }
        #lsd-overlay:not(.light) #lsd-map .leaflet-tile-pane { filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9); }

        .lsd-chart { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:8px; max-width:1100px; }
        .lsd-chart svg { width:100%; height:auto; display:block; }
        .lsd-legend { display:flex; gap:14px; flex-wrap:wrap; margin-top:8px; font-size:.93em; }
        .lsd-legend span { display:inline-flex; align-items:center; gap:6px; }

        .lsd-modal-bg { position:fixed; inset:0; z-index:1200; background:rgba(0,0,0,.55); display:flex;
            align-items:flex-start; justify-content:center; padding:40px 16px; overflow-y:auto; }
        .lsd-modal { background:var(--panel); border:1px solid var(--line); border-radius:8px; width:100%; max-width:680px;
            padding:18px 22px; }
        .lsd-modal h4 { margin:0 0 12px; font-size:1.25em; }
        .lsd-modal fieldset { border:1px solid var(--line); border-radius:6px; padding:8px 12px 12px; margin:0 0 12px; }
        .lsd-modal legend { font-size:.93em; color:var(--muted); width:auto; border:0; margin:0; padding:0 6px; }
        .lsd-field { display:flex; align-items:center; gap:10px; margin:6px 0; }
        .lsd-field label { flex:1; margin:0; font-weight:normal; }
        .lsd-field input[type=text] { width:220px; }
        .lsd-field input[type=number] { width:90px; }
        .lsd-modal textarea { width:100%; min-height:120px; font-family:monospace; font-size:.86em; }
        .lsd-modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:8px; flex-wrap:wrap; }
        .lsd-keys { display:grid; grid-template-columns:90px 1fr; gap:6px 12px; }
        .lsd-keys kbd { background:var(--panel2); border:1px solid var(--line); border-radius:4px; padding:1px 8px;
            font-family:monospace; text-align:center; color:var(--text); }

        #lsd-floating-btn { position:fixed; z-index:9999; width:44px; height:44px; padding:0; margin:0; border:0;
            background:transparent; cursor:grab; touch-action:none; user-select:none; -webkit-user-select:none;
            filter:drop-shadow(0 1px 3px rgba(0,0,0,.85)); opacity:.92; }
        #lsd-floating-btn:hover { opacity:1; transform:scale(1.08); }
        #lsd-floating-btn.dragging { cursor:grabbing; transform:scale(1.12); opacity:1; }
        #lsd-floating-btn svg { width:100%; height:100%; display:block; pointer-events:none; }
    `;
    document.head.appendChild(style);

    // ==================================================================
    // Daten laden & zusammenführen
    // ==================================================================
    async function loadTypeNames() {
        if (Object.keys(S.typeNames).length) return;
        try {
            const data = await getJSON(`https://api.lss-manager.de/${LOCALE}/vehicles`);
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

    function syncSince() {
        const now = Date.now();
        const next = {};
        for (const v of S.vehicles) {
            const f = vehicleFms(v);
            const s = since[v.id];
            next[v.id] = s && s[0] === f ? s : [f, now];
        }
        since = next;
        saveSinceSoon();
    }

    async function loadBuildings() {
        const bs = await getJSON('/api/buildings');
        S.buildings = new Map(bs.map(b => [b.id, b]));
    }

    async function loadAll() {
        const [vs] = await Promise.all([
            getJSON('/api/vehicles'),
            loadBuildings(),
            loadTypeNames()
        ]);
        S.vmap = new Map(vs.map(v => [v.id, v]));
        rebuildIndex();
        syncSince();
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

    // Statuswechsel verarbeiten (Zeit, Log, Ton, Benachrichtigung)
    function onFmsChange(v, oldFms, newFms) {
        since[v.id] = [newFms, Date.now()];
        saveSinceSoon();
        S.flash[v.id] = Date.now();
        setTimeout(scheduleRender, 5300);
        if (oldFms === 5 && newFms !== 5) S.ack.delete(v.id);

        const b = S.buildings.get(v.building_id);
        const bName = b ? b.caption : '';
        S.log.unshift({ t: nowTime(), name: v.caption, bname: bName, from: oldFms, to: newFms });
        if (S.log.length > 200) S.log.length = 200;

        const hidden = b && cfg.hidden[b.id];
        if (newFms === 5 && oldFms !== 5 && !hidden) {
            beep();
            notify('Sprechwunsch', `${v.caption}${bName ? ' (' + bName + ')' : ''}`, 'lsd-sw-' + v.id);
        }
        if (b && !hidden) {
            const newFree = freeCount(v.building_id);
            const oldFree = newFree - (isFreeFms(newFms) ? 1 : 0) + (isFreeFms(oldFms) ? 1 : 0);
            if (oldFree > 0 && newFree === 0) notify('Keine freien Fahrzeuge', b.caption, 'lsd-empty-' + b.id);
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
        for (const f of fresh) {
            seen.add(f.id);
            const old = S.vmap.get(f.id);
            if (!old) {
                S.vmap.set(f.id, f);
                since[f.id] = [vehicleFms(f), Date.now()];
            } else {
                const oldFms = vehicleFms(old);
                Object.assign(old, f);
                const newFms = vehicleFms(old);
                if (oldFms !== newFms) onFmsChange(old, oldFms, newFms);
            }
        }
        for (const id of [...S.vmap.keys()]) {
            if (!seen.has(id)) { S.vmap.delete(id); delete since[id]; S.ack.delete(id); }
        }
        rebuildIndex();
        saveSinceSoon();
    }

    async function poll() {
        hookRadioMessage();
        try {
            pollCount++;
            if (pollCount % 5 === 0) await loadBuildings();
            const [fresh, missions] = await Promise.all([getJSON('/api/vehicles'), fetchMissions()]);
            mergeVehicles(fresh);
            setMissions(missions);
            if (S.tab === 'verband' || cfg.ui.tab === 'verband') await loadAlliance();
            scheduleRender();
        } catch (e) {
            console.warn('[Leitstellenansicht] Abgleich fehlgeschlagen:', e);
        }
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
    // Verlauf (Historie freier Fahrzeuge)
    // ==================================================================
    let histSaved = 0;
    function sampleHist(force) {
        if (!S.vehicles.length) return;
        const now = Date.now();
        const last = hist[hist.length - 1];
        if (!force && last && now - last.t < 30000) return;
        const row = { t: now, total: 0 };
        for (const k of Object.keys(GROUPS)) row[k] = 0;
        for (const [bid, list] of S.byBuilding) {
            const b = S.buildings.get(bid);
            if (!b) continue;
            const f = list.filter(isFree).length;
            row[groupKeyOf(b)] += f;
            row.total += f;
        }
        hist.push(row);
        const cutoff = now - 24 * 3600 * 1000;
        while (hist.length && hist[0].t < cutoff) hist.shift();
        if (hist.length > 1600) hist.splice(0, hist.length - 1600);
        if (++histSaved % 5 === 0 || force) saveJSON(HIST_KEY, hist);
    }

    // ==================================================================
    // Rendering – Grundgerüst
    // ==================================================================
    function scheduleRender() {
        if (renderTimer) return;
        renderTimer = setTimeout(render, 150);
    }

    function render() {
        renderTimer = null;
        if (!overlay || !overlay.classList.contains('open')) return;
        updateHeader();
        switch (cfg.ui.tab) {
            case 'wachen':    renderWachen(); break;
            case 'einsaetze': renderMissions(); break;
            case 'karte':     renderMap(); break;
            case 'verband':   renderAlliance(); break;
            case 'kliniken':  renderHospitals(); break;
            case 'verlauf':   renderHistory(); break;
            case 'protokoll': renderLog(); break;
        }
    }

    function unackedSprech() {
        return S.vehicles.filter(v => vehicleFms(v) === 5 && !S.ack.has(v.id) &&
            !(S.buildings.get(v.building_id) && cfg.hidden[v.building_id])).length;
    }

    function updateHeader() {
        const counts = {};
        for (const v of S.vehicles) { const f = vehicleFms(v); counts[f] = (counts[f] || 0) + 1; }
        const total = S.vehicles.length;
        const avail = (counts[1] || 0) + (counts[2] || 0);
        overlay.querySelector('#lsd-sub').textContent = `${avail}/${total} Fahrzeuge verfügbar (S1/S2)`;

        // Tab-Titel mit Sprechwunsch-Zähler
        const sw = unackedSprech();
        document.title = sw > 0 ? `(${sw}) Sprechwunsch – ${origTitle}` : origTitle;

        // Status-Chips
        let chips = '';
        for (let n = 1; n <= 9; n++) {
            const c = counts[n] || 0;
            const on = S.statusFilter.has(n);
            if (!c && !on) continue;
            chips += `<button type="button" class="lsd-chip lsd-s${n}${on ? ' on' : ''}${n === 5 && sw > 0 ? ' pulse' : ''}"
                data-status="${n}" title="${esc(STATUS_LABEL[n])}"><b>${c}</b>S${n}</button>`;
        }
        if (S.statusFilter.size) chips += `<button type="button" class="lsd-chip" data-status="all">Filter zurücksetzen</button>`;
        if (sw > 0) chips += `<button type="button" class="lsd-chip" data-act="ackall" title="Taste Q">✓ ${sw} Sprechwunsch quittieren</button>`;
        overlay.querySelector('#lsd-chips').innerHTML = chips;

        // Kategorien: Organisationen + eigene
        const stats = {};
        const add = (key, list) => {
            const st = stats[key] || (stats[key] = { total: 0, free: 0 });
            st.total += list.length;
            st.free += list.filter(isFree).length;
        };
        for (const [bid, list] of S.byBuilding) {
            const b = S.buildings.get(bid);
            if (!b) continue;
            add(groupKeyOf(b), list);
            if (cfg.custom[bid]) add('c:' + cfg.custom[bid], list);
        }
        if (cfg.ui.cat && !stats[cfg.ui.cat]) cfg.ui.cat = '';
        const orgKeys = Object.keys(GROUPS).filter(k => stats[k]);
        const customKeys = Object.keys(stats).filter(k => k.startsWith('c:')).sort(collator);
        const catHtml = k => {
            const color = k.startsWith('c:') ? customColor(k.slice(2)) : GROUPS[k].color;
            const name = k.startsWith('c:') ? k.slice(2) : GROUPS[k].name;
            return `<button type="button" class="lsd-cat${cfg.ui.cat === k ? ' on' : ''}" data-cat="${esc(k)}" style="--cc:${color}">
                <span class="lsd-dot" style="background:${color}"></span>${esc(name)} <small>${stats[k].free}/${stats[k].total} frei</small></button>`;
        };
        let cats = '';
        if (orgKeys.length + customKeys.length > 1) {
            cats = `<button type="button" class="lsd-cat${cfg.ui.cat ? '' : ' on'}" data-cat="">Alle Kategorien <small>${total}</small></button>` +
                orgKeys.map(catHtml).join('') + customKeys.map(catHtml).join('');
        }
        overlay.querySelector('#lsd-cats').innerHTML = cats;

        // Fahrzeugtyp-Filter
        const types = [...new Set(S.vehicles.map(typeLabel))].sort(collator);
        const sig = types.join('|');
        const sel = overlay.querySelector('#lsd-type');
        if (sig !== typeSig) {
            typeSig = sig;
            sel.innerHTML = `<option value="">Alle Fahrzeugtypen</option>` +
                types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
            sel.value = cfg.ui.type;
            cfg.ui.type = sel.value;
        }

        // Fahrzeugkategorie-Filter
        const vcats = [...new Set(S.vehicles.map(vehCatOf))].sort(collator);
        const vsig = vcats.join('|');
        const vsel = overlay.querySelector('#lsd-vcat');
        if (vsig !== vcatSig) {
            vcatSig = vsig;
            vsel.innerHTML = `<option value="">Alle Fahrzeugkategorien</option>` +
                vcats.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
            vsel.value = cfg.ui.vcat;
            cfg.ui.vcat = vsel.value;
        }

        // Leitstellen-Filter (nur bei mehreren Leitstellen)
        const leits = new Map();
        for (const [bid] of S.byBuilding) {
            const b = S.buildings.get(bid);
            if (b && b.leitstelle_building_id != null) leits.set(String(b.leitstelle_building_id), true);
        }
        const lsel = overlay.querySelector('#lsd-leit');
        const lids = [...leits.keys()].sort();
        const lsig = lids.join('|');
        if (lsig !== leitSig) {
            leitSig = lsig;
            lsel.innerHTML = `<option value="">Alle Leitstellen</option>` + lids.map(id => {
                const lb = S.buildings.get(Number(id));
                return `<option value="${esc(id)}">${esc(lb ? lb.caption : 'Leitstelle ' + id)}</option>`;
            }).join('');
            lsel.value = cfg.ui.leit;
            cfg.ui.leit = lsel.value;
        }
        lsel.style.display = lids.length > 1 ? '' : 'none';

        // Versteckte Wachen
        const hiddenCount = Object.keys(cfg.hidden).filter(id => S.byBuilding.has(Number(id))).length;
        const hbtn = overlay.querySelector('[data-act="togglehidden"]');
        hbtn.style.display = hiddenCount ? '' : 'none';
        hbtn.textContent = cfg.ui.showHidden ? `Ausgeblendete verbergen (${hiddenCount})` : `Ausgeblendete zeigen (${hiddenCount})`;

        // Tabs & Panes
        overlay.querySelectorAll('.lsd-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === cfg.ui.tab));
        overlay.querySelectorAll('.lsd-pane').forEach(p => p.classList.toggle('on', p.id === 'lsd-pane-' + cfg.ui.tab));
        overlay.querySelector('#lsd-filters').style.display = cfg.ui.tab === 'wachen' ? '' : 'none';
        overlay.querySelector('#lsd-cats').style.display = cfg.ui.tab === 'wachen' || cfg.ui.tab === 'karte' ? '' : 'none';
        overlay.querySelector('#lsd-chips').style.display = cfg.ui.tab === 'wachen' || cfg.ui.tab === 'protokoll' ? '' : 'none';
    }

    // Keyed-Abgleich: nur geänderte Karten werden im DOM ersetzt
    function setEmpty(pane, html) {
        pane.innerHTML = html;
        pane._keyed = new Map();
    }

    function reconcile(pane, items) {
        const old = pane._keyed || new Map();
        const next = new Map();
        for (const it of items) {
            let el = old.get(it.key);
            if (!el || el._html !== it.html) {
                const tpl = document.createElement('template');
                tpl.innerHTML = it.html.trim();
                el = tpl.content.firstElementChild;
                el._html = it.html;
            }
            next.set(it.key, el);
        }
        for (const [k, el] of old) if (next.get(k) !== el && el.parentNode === pane) el.remove();
        [...pane.children].forEach(c => { if (!c._html) c.remove(); });
        let cursor = pane.firstElementChild;
        for (const el of next.values()) {
            if (el === cursor) cursor = cursor.nextElementSibling;
            else pane.insertBefore(el, cursor);
        }
        pane._keyed = next;
    }

    // ---- Wachen --------------------------------------------------------
    function renderWachen() {
        const pane = overlay.querySelector('#lsd-pane-wachen');
        const term = S.search.trim().toLowerCase();
        const filtersActive = !!(S.statusFilter.size || cfg.ui.type || cfg.ui.vcat || cfg.ui.cat || cfg.ui.leit || term);
        const reqs = reqRegexes();
        const now = Date.now();

        const passFilters = v =>
            (!S.statusFilter.size || S.statusFilter.has(vehicleFms(v))) &&
            (!cfg.ui.type || typeLabel(v) === cfg.ui.type) &&
            (!cfg.ui.vcat || vehCatOf(v) === cfg.ui.vcat);
        const vText = v => `${v.caption} ${typeLabel(v)}`.toLowerCase();

        const cards = [];
        for (const [bid, list] of S.byBuilding) {
            const b = S.buildings.get(bid);
            if (!b || !inCategory(b)) continue;
            if (cfg.ui.leit && String(b.leitstelle_building_id) !== cfg.ui.leit) continue;
            const isHidden = !!cfg.hidden[bid];
            if (isHidden && !cfg.ui.showHidden) continue;

            const gk = groupKeyOf(b);
            const g = GROUPS[gk];
            const custom = cfg.custom[bid] || '';
            const bMatch = !term || `${g.terms} ${b.caption} ${custom}`.toLowerCase().includes(term);
            const shown = list.filter(v => passFilters(v) && (bMatch || vText(v).includes(term)));
            if (!shown.length && filtersActive) continue;

            const freeList = list.filter(isFree);
            const warnings = [];
            if (freeList.length === 0) warnings.push('keine Fahrzeuge frei');
            const req = reqs[gk];
            if (req && list.some(v => req.re.test(typeLabel(v))) && !freeList.some(v => req.re.test(typeLabel(v)))) {
                warnings.push(`kein ${req.label} frei`);
            }
            const ratio = Number(cfg.minStaff) || 0;
            if (ratio > 0 && b.personal_count != null && Number(b.personal_count) < list.length * ratio) {
                warnings.push(`wenig Personal (${b.personal_count} für ${list.length} Fz.)`);
            }
            const overdue = list.filter(dwellOver).length;
            if (overdue) warnings.push(`${overdue}× Verweildauer überschritten`);

            cards.push({ b, gk, g, list, shown, free: freeList.length, warnings, custom, isHidden, fav: !!cfg.favs[bid] });
        }

        const sorters = {
            name:     (x, y) => collator(x.b.caption, y.b.caption),
            group:    (x, y) => collator(x.g.name, y.g.name) || collator(x.b.caption, y.b.caption),
            free:     (x, y) => (y.free - x.free) || collator(x.b.caption, y.b.caption),
            free_asc: (x, y) => (x.free - y.free) || collator(x.b.caption, y.b.caption)
        };
        const sorter = sorters[cfg.ui.sort] || sorters.name;
        cards.sort((x, y) => (Number(y.fav) - Number(x.fav)) || sorter(x, y));

        if (!cards.length) {
            setEmpty(pane, `<div class="lsd-empty">${S.vehicles.length ? 'Keine Treffer für die aktuelle Filterung.' : 'Keine Fahrzeuge gefunden.'}</div>`);
            return;
        }

        const groupKey = c => c.fav ? '★' : c.gk;
        const items = [];
        let lastGroup = null;
        for (const c of cards) {
            if (cfg.ui.sort === 'group' && groupKey(c) !== lastGroup) {
                lastGroup = groupKey(c);
                const inGroup = cards.filter(x => groupKey(x) === lastGroup);
                const gFree = inGroup.reduce((n, x) => n + x.free, 0);
                const gTotal = inGroup.reduce((n, x) => n + x.list.length, 0);
                const gName = c.fav ? 'Favoriten' : c.g.name;
                const gColor = c.fav ? '#f1c40f' : c.g.color;
                items.push({ key: 'h:' + lastGroup, html: `<div class="lsd-grouphead" style="--gc:${gColor}">
                    <span class="lsd-dot" style="background:${gColor}"></span>${esc(gName)}
                    <small>${inGroup.length} Wachen · ${gFree}/${gTotal} Fahrzeuge frei</small></div>` });
            }
            items.push({ key: 'c:' + c.b.id, html: cardHtml(c, now) });
        }
        reconcile(pane, items);
    }

    function cardHtml(c, now) {
        const { b, g, list, shown, free, warnings, custom, isHidden, fav } = c;
        const collapsed = !!cfg.collapsed[b.id];
        const meta = [];
        if (custom) meta.push(`<span class="lsd-tag" style="background:${customColor(custom)}">${esc(custom)}</span>`);
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
            const sw = fms === 5;
            const acked = S.ack.has(v.id);
            const ts = sinceTs(v);
            const ago = ts != null ? fmtAgo(now - ts) : '–';
            const flash = S.flash[v.id] && now - S.flash[v.id] < 5000;
            const since_t = ts != null ? new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
            return `<a href="/vehicles/${v.id}" target="_blank" class="lsd-vehicle${sw ? (acked ? ' sprech acked' : ' sprech') : ''}${flash ? ' flash' : ''}">
                <span class="lsd-status lsd-s${fms}" title="${esc(STATUS_LABEL[fms] || '')}">${fms}</span>
                <span class="lsd-vname">${esc(v.caption)}${m ? `<small>${esc(m.caption)}</small>` : ''}</span>
                ${sw && !acked ? `<span class="lsd-ack" data-ack="${v.id}" title="Sprechwunsch quittieren">✓</span>` : ''}
                <span class="lsd-type">${esc(typeLabel(v))}</span>
                <span class="lsd-time${dwellOver(v) ? ' dwell' : ''}" title="Seit ${esc(since_t)} Uhr in diesem Status">${esc(ago)}</span>
            </a>`;
        }).join('')}</div>`;

        return `<div class="lsd-card${warnings.length ? ' warn' : ''}${fav ? ' fav' : ''}${isHidden ? ' ishidden' : ''}" data-bid="${b.id}">
            <div class="lsd-card-head">
                <span class="lsd-caret">${collapsed ? '▸' : '▾'}</span>
                <span class="lsd-dot" style="background:${g.color}" title="${esc(g.name)}"></span>
                <a href="/buildings/${b.id}" target="_blank">${esc(b.caption)}</a>
                <span class="lsd-count">${free}/${list.length} frei</span>
                <span class="lsd-ico${fav ? ' starred' : ''}" data-fav="${b.id}" title="Favorit (steht immer oben)">${fav ? '★' : '☆'}</span>
                <span class="lsd-ico" data-tag="${b.id}" title="Eigene Kategorie zuweisen">🏷</span>
                <span class="lsd-ico" data-hide="${b.id}" title="${isHidden ? 'Wieder einblenden' : 'Ausblenden'}">${isHidden ? '↺' : '✕'}</span>
            </div>
            ${meta.length ? `<div class="lsd-meta">${meta.join('<span>·</span>')}</div>` : ''}
            ${rows}
        </div>`;
    }

    // ---- Einsätze ------------------------------------------------------
    function renderMissions() {
        const pane = overlay.querySelector('#lsd-pane-einsaetze');
        const toolbar = `<div class="lsd-row">
            <select data-ctl="msort">
                <option value="urgency"${cfg.ui.msort === 'urgency' ? ' selected' : ''}>Sortierung: Dringlichkeit</option>
                <option value="name"${cfg.ui.msort === 'name' ? ' selected' : ''}>Sortierung: Name</option>
            </select>
            <label class="lsd-check"><input type="checkbox" data-ctl="monly"${cfg.ui.monly ? ' checked' : ''}> nur Einsätze mit Fehlbedarf</label>
            <span class="lsd-sub">${S.missions.length} Einsätze</span></div>`;

        let list = S.missions.slice();
        if (cfg.ui.monly) list = list.filter(m => m.missing_text || m.vehicle_state === 0);
        list.sort(cfg.ui.msort === 'name'
            ? (a, b) => collator(a.caption || '', b.caption || '')
            : (a, b) => ((a.vehicle_state ?? 3) - (b.vehicle_state ?? 3)) ||
                (Number(!!b.missing_text) - Number(!!a.missing_text)) || collator(a.caption || '', b.caption || ''));

        if (!list.length) {
            pane.innerHTML = toolbar + `<div class="lsd-empty">Keine passenden Einsätze (oder Einsätze konnten nicht geladen werden).</div>`;
            return;
        }
        const assigned = new Map();
        for (const v of S.vehicles) {
            if (!isMissionTarget(v)) continue;
            if (!assigned.has(v.target_id)) assigned.set(v.target_id, []);
            assigned.get(v.target_id).push(v);
        }
        pane.innerHTML = toolbar + `<div class="lsd-list">${list.map(m => {
            const vs = (assigned.get(m.id) || []).sort((a, b) => collator(a.caption, b.caption));
            const info = [];
            if (m.address) info.push(esc(m.address));
            if (m.patients_count) info.push(`${esc(m.patients_count)} Patient(en)`);
            return `<div class="lsd-mission m${esc(m.vehicle_state)}">
                <div class="lsd-mhead"><b>${esc(m.caption)}${m.missing_text ? '<span class="lsd-badge">Fehlbedarf</span>' : ''}</b>
                    <span class="lsd-muted">${info.join(' · ')}</span></div>
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
            if (!b || b.latitude == null || b.longitude == null || !inCategory(b)) continue;
            if (cfg.hidden[bid] && !cfg.ui.showHidden) continue;
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

    // ---- Krankenhäuser -------------------------------------------------
    function renderHospitals() {
        const pane = overlay.querySelector('#lsd-pane-kliniken');
        const hospitals = [...S.buildings.values()].filter(b => Number(b.building_type) === 4)
            .sort((a, b) => collator(a.caption, b.caption));
        if (!hospitals.length) {
            pane.innerHTML = `<div class="lsd-empty">Keine Krankenhäuser gefunden.</div>`;
            return;
        }
        const heading = new Map();
        for (const v of S.vehicles) {
            if (String(v.target_type || '').toLowerCase() !== 'building' || v.target_id == null) continue;
            if (!heading.has(v.target_id)) heading.set(v.target_id, []);
            heading.get(v.target_id).push(v);
        }
        let anyBedData = false;
        const html = hospitals.map(h => {
            const facts = [];
            if (h.level != null) facts.push(`Stufe: ${esc(h.level)}`);
            for (const [k, val] of Object.entries(h)) {
                if (/bed|bett|patient/i.test(k) && (typeof val === 'number' || typeof val === 'string')) {
                    facts.push(`${esc(k)}: ${esc(val)}`);
                    anyBedData = true;
                }
            }
            const vs = (heading.get(h.id) || []).sort((a, b) => collator(a.caption, b.caption));
            return `<div class="lsd-mission">
                <div class="lsd-mhead"><b><a href="/buildings/${h.id}" target="_blank">${esc(h.caption)}</a></b>
                    <span class="lsd-muted">${facts.join(' · ')}</span></div>
                <div class="lsd-vchips">${vs.length ? vs.map(v => {
                    const f = vehicleFms(v);
                    return `<a class="lsd-vchip" href="/vehicles/${v.id}" target="_blank">
                        <span class="lsd-status lsd-s${f}">${f}</span>${esc(v.caption)}</a>`;
                }).join('') : '<span class="lsd-muted">Keine Fahrzeuge unterwegs oder vor Ort</span>'}</div>
            </div>`;
        }).join('');
        pane.innerHTML = `<div class="lsd-list">
            ${anyBedData ? '' : '<div class="lsd-muted">Hinweis: Die Spiel-API liefert für Krankenhäuser keine Bettendaten – angezeigt werden die Fahrzeuge, die ein Krankenhaus als Ziel haben.</div>'}
            ${html}</div>`;
    }

    // ---- Verlauf -------------------------------------------------------
    function renderHistory() {
        const pane = overlay.querySelector('#lsd-pane-verlauf');
        const range = Number(cfg.ui.hrange) || 6;
        const toolbar = `<div class="lsd-row">
            <select data-ctl="hrange">${[1, 6, 24].map(h =>
                `<option value="${h}"${h === range ? ' selected' : ''}>Letzte ${h} ${h === 1 ? 'Stunde' : 'Stunden'}</option>`).join('')}</select>
            <span class="lsd-sub">Freie Fahrzeuge (S1/S2), 1 Messpunkt pro Minute, nur solange die Ansicht geöffnet war</span></div>`;

        const t1 = Date.now();
        const t0 = t1 - range * 3600 * 1000;
        const pts = hist.filter(r => r.t >= t0);
        if (pts.length < 2) {
            pane.innerHTML = toolbar + `<div class="lsd-empty">Noch zu wenig Daten – lass die Ansicht einige Minuten geöffnet.</div>`;
            return;
        }
        const W = 1000, H = 320, pl = 46, pr = 14, pt = 14, pb = 30;
        const maxY = Math.max(1, ...pts.map(r => r.total));
        const x = t => pl + (t - t0) / (t1 - t0) * (W - pl - pr);
        const y = v => pt + (1 - v / maxY) * (H - pt - pb);

        const series = [{ key: 'total', name: 'Gesamt', color: 'var(--text)', dash: '5 4' }]
            .concat(Object.keys(GROUPS).filter(k => pts.some(r => r[k] > 0))
                .map(k => ({ key: k, name: GROUPS[k].name, color: GROUPS[k].color })));

        const path = key => {
            let d = '', prev = null;
            for (const r of pts) {
                d += (prev && r.t - prev.t <= 4 * 60000 ? 'L' : 'M') + x(r.t).toFixed(1) + ' ' + y(r[key] || 0).toFixed(1) + ' ';
                prev = r;
            }
            return d;
        };

        let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verlauf freier Fahrzeuge">`;
        for (let i = 0; i <= 4; i++) {
            const val = Math.round(maxY * i / 4);
            svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(val)}" y2="${y(val)}" style="stroke:var(--line)"/>
                <text x="${pl - 6}" y="${y(val) + 4}" text-anchor="end" font-size="11" style="fill:var(--muted)">${val}</text>`;
        }
        for (let i = 0; i <= 6; i++) {
            const t = t0 + (t1 - t0) * i / 6;
            const d = new Date(t);
            svg += `<text x="${x(t)}" y="${H - 8}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${pad2(d.getHours())}:${pad2(d.getMinutes())}</text>`;
        }
        for (const s of series) {
            svg += `<path d="${path(s.key)}" fill="none" stroke-width="${s.key === 'total' ? 2 : 2.2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}
                style="stroke:${s.color}" stroke-linejoin="round"/>`;
        }
        svg += '</svg>';

        const last = pts[pts.length - 1];
        const legend = series.map(s => `<span><span class="lsd-dot" style="background:${s.color}"></span>${esc(s.name)}: <b>${last[s.key] || 0}</b></span>`).join('');
        pane.innerHTML = toolbar + `<div class="lsd-chart">${svg}<div class="lsd-legend">${legend}</div></div>`;
    }

    // ---- Protokoll -----------------------------------------------------
    function renderLog() {
        const pane = overlay.querySelector('#lsd-pane-protokoll');
        const toolbar = `<div class="lsd-row"><button type="button" class="lsd-btn" data-act="csv-log">⬇ Protokoll als CSV</button>
            <span class="lsd-sub">${S.log.length} Einträge seit dem Öffnen der Ansicht</span></div>`;
        if (!S.log.length) {
            pane.innerHTML = toolbar + `<div class="lsd-empty">Noch keine Statuswechsel seit dem Öffnen der Ansicht.</div>`;
            return;
        }
        const term = S.search.trim().toLowerCase();
        const rows = S.log.filter(l =>
            (!S.statusFilter.size || S.statusFilter.has(l.to)) &&
            (!term || `${l.name} ${l.bname}`.toLowerCase().includes(term)));
        pane.innerHTML = toolbar + `<div class="lsd-list">${rows.map(l => `<div class="lsd-logrow">
            <span class="lsd-time">${esc(l.t)}</span>
            <span class="lsd-status lsd-s${l.from}">${l.from}</span><span class="arrow">→</span>
            <span class="lsd-status lsd-s${l.to}">${l.to}</span>
            <b>${esc(l.name)}</b><span class="lsd-muted">${esc(l.bname)}</span></div>`).join('')}</div>`;
    }

    // ==================================================================
    // Export (CSV, Einstellungen)
    // ==================================================================
    function downloadFile(name, text, mime, bom) {
        const blob = new Blob([(bom ? '\ufeff' : '') + text], { type: mime + ';charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    const csvCell = v => {
        const s = String(v ?? '');
        return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const toCsv = rows => rows.map(r => r.map(csvCell).join(';')).join('\r\n');
    const dateStamp = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`; };

    function exportVehiclesCsv() {
        const rows = [['ID', 'Fahrzeug', 'Typ', 'Fahrzeugkategorie', 'Wache', 'Organisation', 'Eigene Kategorie', 'Status', 'Seit (Minuten)']];
        for (const v of S.vehicles) {
            const b = S.buildings.get(v.building_id);
            const ts = sinceTs(v);
            rows.push([v.id, v.caption, typeLabel(v), vehCatOf(v), b ? b.caption : '', b ? GROUPS[groupKeyOf(b)].name : '',
                b ? cfg.custom[b.id] || '' : '', vehicleFms(v), ts != null ? Math.floor((Date.now() - ts) / 60000) : '']);
        }
        downloadFile(`fahrzeuge_${dateStamp()}.csv`, toCsv(rows), 'text/csv', true);
    }

    function exportLogCsv() {
        const rows = [['Uhrzeit', 'Fahrzeug', 'Wache', 'Von', 'Nach']];
        for (const l of S.log) rows.push([l.t, l.name, l.bname, l.from, l.to]);
        downloadFile(`protokoll_${dateStamp()}.csv`, toCsv(rows), 'text/csv', true);
    }

    function exportSettings() {
        const payload = { script: 'Leitstellenansicht', version: 4, cfg, iconPos: loadJSON(ICON_KEY, null) };
        downloadFile(`leitstellenansicht_einstellungen_${dateStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json', false);
    }

    function importSettings(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const obj = JSON.parse(String(reader.result));
                cfg = mergeCfg(obj.cfg || obj);
                if (obj.iconPos && Number.isFinite(obj.iconPos.x)) { saveJSON(ICON_KEY, obj.iconPos); iconReposition(); }
                saveSettings();
                afterSettingsChange();
                closeModal();
                window.alert('Einstellungen importiert.');
            } catch (e) {
                window.alert('Die Datei konnte nicht gelesen werden: ' + e.message);
            }
        };
        reader.readAsText(file);
    }

    // ==================================================================
    // Einstellungen & Hilfe
    // ==================================================================
    function applyTheme() {
        if (!overlay) return;
        overlay.classList.toggle('light', cfg.theme === 'light');
        overlay.classList.toggle('compact', !!cfg.compact);
        overlay.style.fontSize = `${Math.max(10, Math.min(24, Number(cfg.fontSize) || 14))}px`;
        overlay.style.setProperty('--lsd-min', `${Math.max(220, Math.min(700, Number(cfg.minCard) || 340))}px`);
        const clock = overlay.querySelector('#lsd-clock');
        if (clock) clock.classList.toggle('on', !!cfg.clock);
        const sortSel = overlay.querySelector('#lsd-sort');
        if (sortSel) sortSel.value = cfg.ui.sort;
    }

    function afterSettingsChange() {
        buildTypeMap();
        vcCache = { src: null, list: [] };
        typeSig = vcatSig = leitSig = '';
        S.statusFilter = new Set(cfg.ui.status || []);
        applyTheme();
        startTimers();
        if (cfg.notify && 'Notification' in window && Notification.permission === 'default') {
            try { Notification.requestPermission(); } catch (e) { /* ignorieren */ }
        }
        if (overlay) overlay.querySelector('#lsd-pane-wachen')._keyed = new Map();
        scheduleRender();
    }

    function openSettings() {
        if (modalEl) return;
        const gi = k => `<div class="lsd-field"><label>${esc(GROUPS[k].name)}</label>
            <input type="text" data-g="${k}" value="${esc(cfg.groupIds[k])}" placeholder="z. B. 0,1,18"></div>`;
        const rq = k => `<div class="lsd-field"><label>${esc(GROUPS[k].name)}</label>
            <input type="text" data-r="${k}" value="${esc(cfg.requirements[k])}" placeholder="z. B. RTW oder LF|HLF"></div>`;
        const num = (key, min, max, step) => `<input type="number" data-s="${key}" min="${min}" max="${max}" step="${step}" value="${esc(cfg[key])}">`;
        const chk = key => `<input type="checkbox" data-s="${key}" ${cfg[key] ? 'checked' : ''}>`;

        modalEl = document.createElement('div');
        modalEl.className = 'lsd-modal-bg';
        modalEl.innerHTML = `<div class="lsd-modal">
            <h4>Einstellungen</h4>
            <fieldset><legend>Darstellung</legend>
                <div class="lsd-field"><label>Design</label>
                    <select data-s="theme"><option value="dark">Dunkel</option><option value="light">Hell</option></select></div>
                <div class="lsd-field"><label>Schriftgröße (px)</label>${num('fontSize', 10, 24, 1)}</div>
                <div class="lsd-field"><label>Kompakt-Modus (kleinere Zeilen)</label>${chk('compact')}</div>
                <div class="lsd-field"><label>Große Uhr mit Datum im Header</label>${chk('clock')}</div>
                <div class="lsd-field"><label>Mindestbreite der Wachen-Karten (px)</label>${num('minCard', 220, 700, 10)}</div>
                <div class="lsd-field"><label>Aktualisierung per API (Sekunden, min. 15)</label>${num('poll', 15, 600, 5)}</div>
            </fieldset>
            <fieldset><legend>Warnungen</legend>
                <div class="lsd-field"><label>Ton bei Sprechwunsch</label>${chk('sound')}</div>
                <div class="lsd-field"><label>Desktop-Benachrichtigungen (Sprechwunsch, Wache ohne freie Fahrzeuge)</label>${chk('notify')}</div>
                <div class="lsd-field"><label>Verweildauer Status 4 (Am Einsatzort) – Warnung nach Minuten, 0 = aus</label>
                    <input type="number" data-d="4" min="0" step="5" value="${esc(cfg.dwell[4])}"></div>
                <div class="lsd-field"><label>Verweildauer Status 5 (Sprechwunsch) – Warnung nach Minuten, 0 = aus</label>
                    <input type="number" data-d="5" min="0" step="1" value="${esc(cfg.dwell[5])}"></div>
                <div class="lsd-field"><label>Verweildauer Status 6 (Nicht einsatzbereit) – Warnung nach Minuten, 0 = aus</label>
                    <input type="number" data-d="6" min="0" step="10" value="${esc(cfg.dwell[6])}"></div>
                <div class="lsd-field"><label>Personal-Warnung: weniger als X Personal pro Fahrzeug, 0 = aus</label>${num('minStaff', 0, 20, 1)}</div>
            </fieldset>
            <fieldset><legend>Wandanzeige</legend>
                <div class="lsd-field"><label>Automatisch durch die Wachen scrollen</label>${chk('autoScroll')}</div>
                <div class="lsd-field"><label>Scroll-Geschwindigkeit (Pixel pro Sekunde)</label>${num('scrollSpeed', 20, 400, 10)}</div>
            </fieldset>
            <fieldset><legend>Gebäudetyp-IDs je Organisation (kommagetrennt)</legend>
                ${['fw', 'rd', 'pol', 'thw'].map(gi).join('')}
            </fieldset>
            <fieldset><legend>Bedarfsanalyse: Fahrzeugtyp (Regex), der pro Wache mind. 1× frei sein soll</legend>
                ${['fw', 'rd', 'pol', 'thw'].map(rq).join('')}
            </fieldset>
            <fieldset><legend>Fahrzeugkategorien (eine Zeile pro Kategorie: Name=Regex, erste passende gewinnt)</legend>
                <textarea data-vc spellcheck="false">${esc(cfg.vehCats)}</textarea>
                <div class="lsd-muted">Nicht passende Fahrzeuge landen in „Sonderfahrzeuge". Der Regex wird auf den Fahrzeugtyp angewendet (z. B. „LF 20", „RTW").</div>
            </fieldset>
            <fieldset><legend>Daten</legend>
                <div class="lsd-modal-actions" style="justify-content:flex-start;margin:0">
                    <button type="button" class="lsd-btn" data-act="cfg-export">⬇ Einstellungen exportieren</button>
                    <button type="button" class="lsd-btn" data-act="cfg-import">⬆ Einstellungen importieren</button>
                    <input type="file" id="lsd-import-file" accept="application/json,.json" style="display:none">
                </div>
            </fieldset>
            <div class="lsd-modal-actions">
                <button type="button" class="lsd-btn" data-act="settings-reset">Zurücksetzen</button>
                <button type="button" class="lsd-btn" data-act="modal-close">Abbrechen</button>
                <button type="button" class="lsd-btn lsd-primary" data-act="settings-save">Speichern</button>
            </div></div>`;
        overlay.appendChild(modalEl);
        modalEl.querySelector('[data-s="theme"]').value = cfg.theme;
        modalEl.querySelector('#lsd-import-file').addEventListener('change', e => {
            if (e.target.files && e.target.files[0]) importSettings(e.target.files[0]);
        });
    }

    function openHelp() {
        if (modalEl) return;
        const keys = [
            ['/', 'Suche fokussieren'], ['1 – 7', 'Tabs wechseln (Wachen, Einsätze, Karte, Verband, Krankenhäuser, Verlauf, Protokoll)'],
            ['Q', 'Alle Sprechwünsche quittieren'], ['F', 'Vollbild ein/aus'], ['C', 'Kompakt-Modus ein/aus'],
            ['S', 'Einstellungen öffnen'], ['?', 'Diese Hilfe'], ['Esc', 'Fenster/Ansicht schließen']
        ];
        modalEl = document.createElement('div');
        modalEl.className = 'lsd-modal-bg';
        modalEl.innerHTML = `<div class="lsd-modal"><h4>Tastenkürzel &amp; Hinweise</h4>
            <div class="lsd-keys">${keys.map(([k, t]) => `<kbd>${esc(k)}</kbd><span>${esc(t)}</span>`).join('')}</div>
            <p class="lsd-muted" style="margin-top:12px">Auf einer Wachen-Karte: ☆ Favorit (steht oben), 🏷 eigene Kategorie, ✕ ausblenden.
            Ein Klick auf die Kopfzeile klappt die Karte ein. ✓ am Fahrzeug quittiert einen Sprechwunsch.</p>
            <div class="lsd-modal-actions"><button type="button" class="lsd-btn lsd-primary" data-act="modal-close">Schließen</button></div></div>`;
        overlay.appendChild(modalEl);
    }

    function closeModal() {
        if (modalEl) { modalEl.remove(); modalEl = null; }
    }

    function saveSettingsFromModal() {
        const next = JSON.parse(JSON.stringify(cfg));
        modalEl.querySelectorAll('[data-s]').forEach(el => {
            const k = el.dataset.s;
            if (el.type === 'checkbox') next[k] = el.checked;
            else if (el.type === 'number') next[k] = el.value === '' ? DEFAULTS[k] : Number(el.value);
            else next[k] = el.value;
        });
        modalEl.querySelectorAll('[data-g]').forEach(el => { next.groupIds[el.dataset.g] = el.value; });
        modalEl.querySelectorAll('[data-r]').forEach(el => { next.requirements[el.dataset.r] = el.value; });
        modalEl.querySelectorAll('[data-d]').forEach(el => {
            next.dwell[el.dataset.d] = el.value === '' ? DEFAULTS.dwell[el.dataset.d] : Math.max(0, Number(el.value));
        });
        next.vehCats = modalEl.querySelector('[data-vc]').value;
        next.poll = Math.max(15, next.poll);
        cfg = next;
        saveSettings();
        afterSettingsChange();
        closeModal();
    }

    // ==================================================================
    // Timer, Auto-Scroll, Vollbild
    // ==================================================================
    function tickClock() {
        const el = overlay && overlay.querySelector('#lsd-clock');
        if (!el || !cfg.clock) return;
        const d = new Date();
        el.innerHTML = `<b>${d.toLocaleTimeString('de-DE')}</b><span>${esc(d.toLocaleDateString('de-DE',
            { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }))}</span>`;
    }

    function startTimers() {
        stopTimers();
        timers.poll = setInterval(poll, Math.max(15, Number(cfg.poll) || 60) * 1000);
        timers.hist = setInterval(() => sampleHist(false), 60000);
        timers.tick = setInterval(scheduleRender, 30000);
        timers.clock = setInterval(tickClock, 1000);
        tickClock();
        if (cfg.autoScroll) {
            timers.scroll = setInterval(() => {
                if (!overlay || !overlay.classList.contains('open') || cfg.ui.tab !== 'wachen' || modalEl) return;
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
    }

    function stopTimers() {
        Object.values(timers).forEach(clearInterval);
        timers = {};
    }

    function toggleFullscreen() {
        try {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (overlay.requestFullscreen) overlay.requestFullscreen();
        } catch (e) { /* ignorieren */ }
    }

    // ==================================================================
    // Aktionen
    // ==================================================================
    function saveUi() {
        cfg.ui.status = [...S.statusFilter];
        saveSettings();
    }

    function switchTab(id) {
        if (!TABS.some(t => t.id === id)) return;
        cfg.ui.tab = id;
        saveSettings();
        scrollPauseUntil = 0;
        if (id === 'verband' && !S.alliance) loadAlliance().then(scheduleRender);
        if (id === 'karte') mapFitted = false;
        render();
    }

    function ackAll() {
        for (const v of S.vehicles) if (vehicleFms(v) === 5) S.ack.add(v.id);
        scheduleRender();
    }

    function tagBuilding(bid) {
        const b = S.buildings.get(bid);
        if (!b) return;
        const names = [...new Set(Object.values(cfg.custom))].sort(collator);
        const input = window.prompt(
            `Eigene Kategorie für „${b.caption}“\n(leer lassen = Zuordnung entfernen)` +
            (names.length ? `\nVorhandene Kategorien: ${names.join(', ')}` : ''),
            cfg.custom[bid] || '');
        if (input === null) return;
        const name = input.trim();
        if (name) cfg.custom[bid] = name; else delete cfg.custom[bid];
        saveSettings();
        scheduleRender();
    }

    function onClick(e) {
        const t = e.target;

        const act = t.closest('[data-act]');
        if (act) {
            switch (act.dataset.act) {
                case 'close': closeOverlay(); break;
                case 'settings': openSettings(); break;
                case 'help': openHelp(); break;
                case 'modal-close': closeModal(); break;
                case 'settings-save': saveSettingsFromModal(); break;
                case 'settings-reset':
                    cfg = JSON.parse(JSON.stringify(DEFAULTS));
                    saveSettings(); afterSettingsChange(); closeModal();
                    break;
                case 'cfg-export': exportSettings(); break;
                case 'cfg-import': modalEl.querySelector('#lsd-import-file').click(); break;
                case 'newtab': window.open(window.location.origin + '/' + OPEN_HASH, '_blank'); break;
                case 'fullscreen': toggleFullscreen(); break;
                case 'collapse':
                    for (const id of S.byBuilding.keys()) cfg.collapsed[id] = true;
                    saveSettings(); scheduleRender();
                    break;
                case 'expand': cfg.collapsed = {}; saveSettings(); scheduleRender(); break;
                case 'togglehidden': cfg.ui.showHidden = !cfg.ui.showHidden; saveSettings(); scheduleRender(); break;
                case 'ackall': ackAll(); break;
                case 'csv-veh': exportVehiclesCsv(); break;
                case 'csv-log': exportLogCsv(); break;
            }
            return;
        }

        const ack = t.closest('[data-ack]');
        if (ack) { e.preventDefault(); S.ack.add(Number(ack.dataset.ack)); scheduleRender(); return; }

        const fav = t.closest('[data-fav]');
        if (fav) {
            e.preventDefault();
            const id = fav.dataset.fav;
            if (cfg.favs[id]) delete cfg.favs[id]; else cfg.favs[id] = true;
            saveSettings(); scheduleRender();
            return;
        }
        const tag = t.closest('[data-tag]');
        if (tag) { e.preventDefault(); tagBuilding(Number(tag.dataset.tag)); return; }
        const hide = t.closest('[data-hide]');
        if (hide) {
            e.preventDefault();
            const id = hide.dataset.hide;
            if (cfg.hidden[id]) delete cfg.hidden[id]; else cfg.hidden[id] = true;
            saveSettings(); scheduleRender();
            return;
        }

        const tab = t.closest('[data-tab]');
        if (tab) { switchTab(tab.dataset.tab); return; }

        const cat = t.closest('[data-cat]');
        if (cat) {
            cfg.ui.cat = cat.dataset.cat;
            if (cfg.ui.tab === 'karte') mapFitted = false;
            saveSettings(); scheduleRender();
            return;
        }

        const chip = t.closest('[data-status]');
        if (chip) {
            if (chip.dataset.status === 'all') S.statusFilter.clear();
            else {
                const n = Number(chip.dataset.status);
                if (S.statusFilter.has(n)) S.statusFilter.delete(n); else S.statusFilter.add(n);
            }
            saveUi(); scheduleRender();
            return;
        }

        const head = t.closest('.lsd-card-head');
        if (head && !t.closest('a')) {
            const bid = head.parentElement.dataset.bid;
            if (cfg.collapsed[bid]) delete cfg.collapsed[bid]; else cfg.collapsed[bid] = true;
            saveSettings(); scheduleRender();
        }
    }

    function onChange(e) {
        const c = e.target.closest('[data-ctl]');
        if (!c) return;
        switch (c.dataset.ctl) {
            case 'msort': cfg.ui.msort = c.value; break;
            case 'monly': cfg.ui.monly = c.checked; break;
            case 'hrange': cfg.ui.hrange = Number(c.value); break;
        }
        saveSettings();
        scheduleRender();
    }

    function onKeydown(e) {
        if (!overlay || !overlay.classList.contains('open')) return;
        if (e.key === 'Escape') {
            if (modalEl) closeModal(); else closeOverlay();
            return;
        }
        const tag = (e.target.tagName || '').toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey || modalEl) return;
        const k = e.key;
        if (k === '/') { e.preventDefault(); overlay.querySelector('#lsd-search').focus(); }
        else if (/^[1-7]$/.test(k)) switchTab(TABS[Number(k) - 1].id);
        else if (k === 'f' || k === 'F') toggleFullscreen();
        else if (k === 'c' || k === 'C') { cfg.compact = !cfg.compact; saveSettings(); applyTheme(); }
        else if (k === 'q' || k === 'Q') ackAll();
        else if (k === 's' || k === 'S') openSettings();
        else if (k === '?') openHelp();
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
                    <div id="lsd-clock"></div>
                    <span class="lsd-sub" id="lsd-sub">Lade Daten …</span>
                    <input type="text" id="lsd-search" placeholder="Suche (Gebäude, Fahrzeug, FW, RD, Pol …)  [ / ]">
                    <button type="button" class="lsd-btn" data-act="help" title="Tastenkürzel">?</button>
                    <button type="button" class="lsd-btn" data-act="settings" title="Einstellungen (S)">⚙ Einstellungen</button>
                    <button type="button" class="lsd-btn" data-act="newtab" title="In neuem Tab öffnen (z. B. für zweiten Monitor)">⧉ Neuer Tab</button>
                    <button type="button" class="lsd-btn" data-act="fullscreen" title="Vollbild (F)">⛶ Vollbild</button>
                    <button type="button" class="lsd-btn lsd-danger" data-act="close">Schließen (Esc)</button>
                </div>
                <div class="lsd-row" id="lsd-cats"></div>
                <div class="lsd-row" id="lsd-chips"></div>
                <div class="lsd-row" id="lsd-filters">
                    <select id="lsd-leit" style="display:none"><option value="">Alle Leitstellen</option></select>
                    <select id="lsd-vcat"><option value="">Alle Fahrzeugkategorien</option></select>
                    <select id="lsd-type"><option value="">Alle Fahrzeugtypen</option></select>
                    <select id="lsd-sort">
                        <option value="name">Sortierung: Name</option>
                        <option value="group">Sortierung: Organisation</option>
                        <option value="free">Sortierung: meiste freie</option>
                        <option value="free_asc">Sortierung: wenigste freie</option>
                    </select>
                    <button type="button" class="lsd-btn" data-act="collapse">Alle einklappen</button>
                    <button type="button" class="lsd-btn" data-act="expand">Alle ausklappen</button>
                    <button type="button" class="lsd-btn" data-act="togglehidden" style="display:none"></button>
                    <button type="button" class="lsd-btn" data-act="csv-veh">⬇ Fahrzeuge (CSV)</button>
                </div>
                <div class="lsd-tabs">${TABS.map(t => `<button type="button" class="lsd-tab" data-tab="${t.id}">${t.label}</button>`).join('')}</div>
            </div>
            <div id="lsd-body">
                ${TABS.map(t => `<div class="lsd-pane" id="lsd-pane-${t.id}">${t.id === 'wachen' ? '<div class="lsd-empty">Lade Daten …</div>' : ''}</div>`).join('')}
            </div>`;
        document.body.appendChild(overlay);
        applyTheme();

        overlay.addEventListener('click', onClick);
        overlay.addEventListener('change', onChange);
        overlay.querySelector('#lsd-search').addEventListener('input', e => { S.search = e.target.value; scheduleRender(); });
        overlay.querySelector('#lsd-type').addEventListener('change', e => { cfg.ui.type = e.target.value; saveSettings(); scheduleRender(); });
        overlay.querySelector('#lsd-vcat').addEventListener('change', e => { cfg.ui.vcat = e.target.value; saveSettings(); scheduleRender(); });
        overlay.querySelector('#lsd-leit').addEventListener('change', e => { cfg.ui.leit = e.target.value; saveSettings(); scheduleRender(); });
        overlay.querySelector('#lsd-sort').addEventListener('change', e => { cfg.ui.sort = e.target.value; saveSettings(); scheduleRender(); });

        document.addEventListener('keydown', onKeydown);
        ['wheel', 'touchstart', 'mousedown', 'keydown'].forEach(ev =>
            overlay.addEventListener(ev, () => { scrollPauseUntil = Date.now() + 15000; }, { passive: true }));
    }

    async function openOverlay() {
        if (!overlay) buildOverlay();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        origTitle = document.title.replace(/^\(\d+\) Sprechwunsch – /, '');
        hookRadioMessage();
        try {
            await loadAll();
            sampleHist(true);
            render();
        } catch (e) {
            console.error('[Leitstellenansicht]', e);
            setEmpty(overlay.querySelector('#lsd-pane-wachen'),
                `<div class="lsd-empty">Daten konnten nicht geladen werden (${esc(e.message)}).</div>`);
            updateHeader();
        }
        startTimers();
    }

    function closeOverlay() {
        closeModal();
        sampleHist(true);
        saveJSON(SINCE_KEY, since);
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        document.title = origTitle;
        stopTimers();
        try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* ignorieren */ }
    }

    // ==================================================================
    // Verschiebbares Icon
    // ==================================================================
    function addButton() {
        const btn = document.createElement('button');
        btn.id = 'lsd-floating-btn';
        btn.type = 'button';
        btn.title = 'Leitstellenansicht öffnen (zum Verschieben ziehen)';
        btn.setAttribute('aria-label', 'Leitstellenansicht');
        btn.innerHTML = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="#ffffff">
            <rect x="5" y="5" width="17" height="17" rx="3"/>
            <rect x="26" y="5" width="17" height="10" rx="3"/>
            <rect x="26" y="19" width="17" height="24" rx="3"/>
            <rect x="5" y="26" width="17" height="17" rx="3"/>
        </svg>`;
        document.body.appendChild(btn);

        const loadPos = () => {
            const p = loadJSON(ICON_KEY, null);
            if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
            return { x: window.innerWidth - ICON_SIZE - 16, y: window.innerHeight - ICON_SIZE - 16 };
        };
        const place = p => {
            const x = Math.min(Math.max(0, p.x), Math.max(0, window.innerWidth - ICON_SIZE));
            const y = Math.min(Math.max(0, p.y), Math.max(0, window.innerHeight - ICON_SIZE));
            btn.style.left = x + 'px';
            btn.style.top = y + 'px';
            return { x, y };
        };
        let pos = place(loadPos());
        iconReposition = () => { pos = place(loadPos()); };

        let drag = null;
        btn.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            drag = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
            try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignorieren */ }
        });
        btn.addEventListener('pointermove', e => {
            if (!drag) return;
            const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
            if (!drag.moved && Math.hypot(dx, dy) < 5) return;
            drag.moved = true;
            btn.classList.add('dragging');
            pos = place({ x: drag.ox + dx, y: drag.oy + dy });
        });
        btn.addEventListener('pointerup', e => {
            if (!drag) return;
            const moved = drag.moved;
            drag = null;
            btn.classList.remove('dragging');
            try { btn.releasePointerCapture(e.pointerId); } catch (err) { /* ignorieren */ }
            if (moved) saveJSON(ICON_KEY, pos); else openOverlay();
        });
        btn.addEventListener('pointercancel', () => { drag = null; btn.classList.remove('dragging'); });
        btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openOverlay(); } });
        window.addEventListener('resize', () => { pos = place(pos); });
    }

    addButton();
    if (window.location.hash === OPEN_HASH) openOverlay();
})();
