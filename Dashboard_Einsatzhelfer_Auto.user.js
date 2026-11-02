// ==UserScript==
// @name         Dashboard_Einsatzhelfer_Auto
// @namespace    https://leitstellenspiel.de
// @version      1.6.01
// @author       Design by Bobelle
// @description  Übernimmt fehlende Fahrzeuge aus dem Einsatzhelfer und wählt sie vor (Frei verschiebbarer Button)
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @include      https://www.leitstellenspiel.de/*
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CFG = {
        auto: true, // beim Öffnen automatisch vorwählen
        tries: 40, // Versuche auf den Einsatzhelfer zu warten
        interval: 500, // ms zwischen Versuchen
        settleDelay: 700, // ms Wartezeit, bis der Einsatzhelfer fertig befüllt ist
        debug: true,
        posKey: 'eh_auto_pos_v2'
    };

    // Allgemeine Anforderungsnamen -> passende Fahrzeugtypen (alles klein, ohne Leerzeichen).
    // Hier kannst du selbst ergänzen: [Regex für Anforderung, [Regexe für Fahrzeugtypen]]
    const ALIASES = [
        [/^löschfahrzeug|^löschgruppen/, [/^(h|t|s)?lf/, /^löschfahrzeug/]],
        [/^drehleiter/, [/^dlk/, /^dl\d/, /^drehleiter/]],
        [/^rettungswagen/,  [/^rtw/]],
        [/^notarzt(einsatz)?fahrzeug|^notarzt/, [/^nef/]],
        [/^krankentransport/, [/^ktw/]],
        [/^funkstreifenwagen|^streifenwagen/, [/^fustw/, /^funkstreifenwagen/]],
        [/^mannschaftstransport/,  [/^mtw/]],
        [/^rüstwagen/, [/^rw/]],
        [/^schlauchwagen/, [/^sw/]]
    ];

    const log = (...a) => CFG.debug && console.log('[Einsatzhelfer-Auswahl]', ...a);
    const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, '');

    const aliasTypes = target => {
        for (const [req, types] of ALIASES) if (req.test(target)) return types;
        return null;
    };

    // ---------- 1) Fehlende Fahrzeuge aus dem Einsatzhelfer lesen ----------
    function parseAmount(li) {
        const attr = parseInt(li.getAttribute('data-amount'), 10);
        if (attr > 0) return attr;
        const t = li.textContent.replace(/\s+/g, ' ').trim();
        let m = t.match(/^\s*(\d+)\s*x?\s*\D/i) || t.match(/(\d+)\s*x\b/i) || t.match(/\bx\s*(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
    }

    function readMissing() {
        const list = [];
        document.querySelectorAll('li[data-amount], #mission-help-vehicle-container li, .mission_help_vehicle_list li').forEach(li => {
            if (li.closest('#eh-auto-box')) return;
            if (li.querySelector('li')) return; // verschachtelte Listen nicht doppelt zählen
            const amount = parseAmount(li);
            if (amount <= 0) return;
            const name = li.textContent
                .replace(/\d+\s*%/g, '')
                .replace(/^\s*\d+\s*x?\s*/i, '')
                .replace(/\s+/g, ' ')
                .trim();
            if (name) list.push({ name, amount });
        });
        return list;
    }

    // ---------- 2) Fahrzeuge in der Alarmliste vorwählen ----------
    // Bezeichnungen des Fahrzeugtyps (präzise Quellen zuerst)
    function captions(cb) {
        const tr = cb.closest('tr');
        const src = [
            cb.getAttribute('vehicle_type'),
            cb.getAttribute('vehicle_type_caption'),
            cb.getAttribute('data-vehicle-type'),
            tr && tr.getAttribute('vehicle_type'),
            tr && tr.getAttribute('data-vehicle-type'),
            tr && tr.querySelector('.vehicle_type_caption') && tr.querySelector('.vehicle_type_caption').textContent
        ];
        return src.filter(Boolean).map(norm).filter(Boolean);
    }

    function rowText(cb) {
        const tr = cb.closest('tr');
        return norm(tr ? tr.textContent : '');
    }

    function isUsable(cb) {
        if (cb.disabled || cb.checked) return false;
        const tr = cb.closest('tr');
        return !(tr && (tr.style.display === 'none' || tr.hidden));
    }

    function matchers(target) {
        const types = aliasTypes(target);
        const m = [
            caps => caps.some(c => c === target),                                        // exakt
            caps => types && caps.some(c => types.some(rx => rx.test(c))),               // Zuordnung
            caps => caps.some(c => c.length >= 2 && (c.includes(target) || target.includes(c))) // ähnlich
        ];
        return m;
    }

    function selectMissing() {
        const missing = readMissing();
        const boxes = Array.from(document.querySelectorAll('input.vehicle_checkbox'));
        let picked = 0;
        const notFound = [];

        // Spezifische Namen zuerst, allgemeine (Zuordnung) zuletzt
        const ordered = missing.slice().sort((a, b) =>
            (aliasTypes(norm(a.name)) ? 1 : 0) - (aliasTypes(norm(b.name)) ? 1 : 0));

        ordered.forEach(need => {
            let left = need.amount;
            const target = norm(need.name);

            matchers(target).forEach(match => {
                boxes.forEach(cb => {
                    if (left <= 0 || !isUsable(cb)) return;
                    const caps = captions(cb);
                    if (caps.length && match(caps)) { cb.click(); left--; picked++; }
                });
            });

            // Notfalls Zeilentext, wenn die Checkbox keine Typ-Attribute hat
            if (left > 0) {
                boxes.forEach(cb => {
                    if (left <= 0 || !isUsable(cb) || captions(cb).length) return;
                    if (rowText(cb).includes(target)) { cb.click(); left--; picked++; }
                });
            }

            if (left > 0) notFound.push(`${left}x ${need.name}`);
        });

        log('gelesen:', missing.map(m => `${m.amount}x ${m.name}`),
            '| gewählt:', picked, '| nicht gefunden:', notFound,
            '| Beispiel-Typen:', boxes.slice(0, 5).map(captions));
        return { missing, picked, notFound };
    }

    // ---------- 3) Freischwebendes UI & Drag & Drop ----------
    function loadPos() { try { return JSON.parse(localStorage.getItem(CFG.posKey)); } catch (e) { return null; } }
    function savePos(left, top) { try { localStorage.setItem(CFG.posKey, JSON.stringify({ left, top })); } catch (e) {} }
    function clamp(box, left, top) {
        const maxL = Math.max(0, window.innerWidth - box.offsetWidth);
        const maxT = Math.max(0, window.innerHeight - box.offsetHeight);
        return { left: Math.min(Math.max(0, left), maxL), top: Math.min(Math.max(0, top), maxT) };
    }

    function makeDraggable(box, handle) {
        let startX, startY, startL, startT, dragging = false;
        handle.addEventListener('pointerdown', e => {
            dragging = true;
            const r = box.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY; startL = r.left; startT = r.top;
            handle.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        handle.addEventListener('pointermove', e => {
            if (!dragging) return;
            const p = clamp(box, startL + e.clientX - startX, startT + e.clientY - startY);
            box.style.left = p.left + 'px'; box.style.top = p.top + 'px';
            box.style.right = 'auto'; box.style.bottom = 'auto';
        });
        const end = e => {
            if (!dragging) return;
            dragging = false;
            try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
            const r = box.getBoundingClientRect();
            savePos(r.left, r.top);
        };
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
    }

    function buildUI() {
        if (!document.querySelector('input.vehicle_checkbox')) return;
        if (document.getElementById('eh-auto-box')) return;

        const box = document.createElement('div');
        box.id = 'eh-auto-box';
        box.style.cssText =
            'position:fixed;right:20px;bottom:20px;z-index:99999;display:flex;align-items:center;gap:6px;' +
            'background:#222;color:#fff;border-radius:6px;padding:6px 10px;max-width:90vw;' +
            'font:12px sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.5);user-select:none;';

        const handle = document.createElement('span');
        handle.textContent = '⠿';
        handle.title = 'Zum Verschieben ziehen';
        handle.style.cssText = 'cursor:move;font-size:18px;line-height:1;padding:2px 4px;touch-action:none;color:#aaa;';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-xs btn-success';
        btn.textContent = 'Fehlende wählen';
        btn.addEventListener('click', run);

        const span = document.createElement('span');
        span.id = 'eh-auto-msg';
        span.style.cssText = 'color:#ddd;font-size:11px;margin-left:4px;';

        box.append(handle, btn, span);
        document.body.appendChild(box);

        const saved = loadPos();
        if (saved) {
            const p = clamp(box, saved.left, saved.top);
            box.style.left = p.left + 'px'; box.style.top = p.top + 'px';
            box.style.bottom = 'auto'; box.style.right = 'auto';
        }
        makeDraggable(box, handle);
    }

    function msg(t, title) {
        const el = document.getElementById('eh-auto-msg');
        if (!el) return;
        el.textContent = t;
        el.title = title || '';
    }

    function run() {
        const r = selectMissing();
        const gelesen = r.missing.map(m => `${m.amount}x ${m.name}`).join(', ');
        if (!r.missing.length) return msg('Keine fehlenden Fahrzeuge gelesen');
        msg(r.picked + ' gewählt' + (r.notFound.length ? ' – nicht gefunden: ' + r.notFound.join(', ') : ''),
            'Gelesen: ' + gelesen);
    }

    // ---------- Start ----------
    setInterval(buildUI, 400);

    if (CFG.auto) {
        let n = 0;
        const t = setInterval(() => {
            n++;
            const ready = document.querySelector('input.vehicle_checkbox') && readMissing().length;
            if (ready) {
                clearInterval(t);
                setTimeout(run, CFG.settleDelay);
            } else if (n >= CFG.tries) {
                clearInterval(t);
                msg('Einsatzhelfer nicht gefunden');
            }
        }, CFG.interval);
    }
})();
