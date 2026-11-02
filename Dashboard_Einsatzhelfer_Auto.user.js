// ==UserScript==
// @name         Dashboard_Einsatzhelfer_Auto
// @namespace    https://leitstellenspiel.de
// @version      1.5.0
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
        debug: true,
        posKey: 'eh_auto_pos_v2'
    };

    const log = (...a) => CFG.debug && console.log('[Einsatzhelfer-Auswahl]', ...a);
    const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, '');

    // ---------- 1) Fehlende Fahrzeuge aus dem Einsatzhelfer lesen ----------
    function readMissing() {
        const list = [];
        document.querySelectorAll('li[data-amount], #mission-help-vehicle-container li, .mission_help_vehicle_list li').forEach(li => {
            if (li.closest('#eh-auto-box')) return;
            const amountAttr = li.getAttribute('data-amount');
            let amount = amountAttr ? parseInt(amountAttr, 10) : 0;
            if (!amount) {
                const match = li.textContent.match(/(\d+)\s*x/);
                if (match) amount = parseInt(match[1], 10);
            }
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
    function captionOf(cb) {
        const tr = cb.closest('tr');
        if (!tr) return '';
        return tr.getAttribute('vehicle_type') ||
               tr.getAttribute('data-vehicle-name') ||
               (tr.querySelector('.vehicle_type_caption') ? tr.querySelector('.vehicle_type_caption').textContent : '') ||
               tr.textContent;
    }

    function isUsable(cb) {
        if (cb.disabled || cb.checked) return false;
        const tr = cb.closest('tr');
        return !(tr && (tr.style.display === 'none' || tr.hidden));
    }

    function selectMissing() {
        const missing = readMissing();
        const boxes = Array.from(document.querySelectorAll('input.vehicle_checkbox'));
        let picked = 0;
        const notFound = [];

        missing.forEach(need => {
            let left = need.amount;
            const target = norm(need.name);

            [
                (c) => norm(c) === target,
                (c) => norm(c).includes(target) || target.includes(norm(c))
            ].forEach(match => {
                boxes.forEach(cb => {
                    if (left <= 0 || !isUsable(cb)) return;
                    const cap = captionOf(cb);
                    if (cap && match(cap)) {
                        cb.click();
                        left--;
                        picked++;
                    }
                });
            });

            if (left > 0) notFound.push(`${left}x ${need.name}`);
        });

        log('fehlend:', missing, 'gewählt:', picked, 'nicht verfügbar:', notFound);
        return { missing, picked, notFound };
    }

    // ---------- 3) Freischwebendes UI erzeugen & Drag & Drop ----------
    function loadPos() {
        try { return JSON.parse(localStorage.getItem(CFG.posKey)); } catch (e) { return null; }
    }
    function savePos(left, top) {
        try { localStorage.setItem(CFG.posKey, JSON.stringify({ left, top })); } catch (e) {}
    }
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
            startX = e.clientX; startY = e.clientY;
            startL = r.left; startT = r.top;
            handle.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        handle.addEventListener('pointermove', e => {
            if (!dragging) return;
            const p = clamp(box, startL + e.clientX - startX, startT + e.clientY - startY);
            box.style.left = p.left + 'px';
            box.style.top = p.top + 'px';
            box.style.right = 'auto';
            box.style.bottom = 'auto';
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
        // Nur anzeigen, wenn ein Einsatz / Fahrzeug-Checkboxen da sind
        if (!document.querySelector('input.vehicle_checkbox')) return;
        if (document.getElementById('eh-auto-box')) return;

        const box = document.createElement('div');
        box.id = 'eh-auto-box';
        box.style.cssText =
            'position:fixed;right:20px;bottom:20px;z-index:99999;display:flex;align-items:center;gap:6px;' +
            'background:#222;color:#fff;border-radius:6px;padding:6px 10px;' +
            'font:12px sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.5);user-select:none;';

        const handle = document.createElement('span');
        handle.id = 'eh-auto-handle';
        handle.textContent = '⠿';
        handle.title = 'Zum Verschieben ziehen';
        handle.style.cssText =
            'cursor:move;font-size:18px;line-height:1;padding:2px 4px;touch-action:none;color:#aaa;';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'eh-auto-btn';
        btn.className = 'btn btn-xs btn-success';
        btn.textContent = 'Fehlende wählen';
        btn.addEventListener('click', run);

        const span = document.createElement('span');
        span.id = 'eh-auto-msg';
        span.style.cssText = 'color:#ddd;font-size:11px;margin-left:4px;';

        box.append(handle, btn, span);
        document.body.appendChild(box);

        // Position wiederherstellen falls gespeichert
        const saved = loadPos();
        if (saved) {
            const p = clamp(box, saved.left, saved.top);
            box.style.left = p.left + 'px';
            box.style.top = p.top + 'px';
            box.style.bottom = 'auto';
            box.style.right = 'auto';
        }

        makeDraggable(box, handle);
        log('Floating Button erstellt.');
    }

    function msg(t) {
        const el = document.getElementById('eh-auto-msg');
        if (el) el.textContent = t;
    }

    function run() {
        const r = selectMissing();
        if (!r.missing.length) return msg('Keine fehlenden Fahrzeuge gefunden');
        msg(r.picked + ' gewählt' + (r.notFound.length ? ' – fehlt: ' + r.notFound.join(', ') : ''));
    }

    // ---------- Prüfen und Erstellen bei DOM-Änderungen ----------
    setInterval(() => {
        buildUI();
    }, 400);

    if (CFG.auto) {
        let n = 0;
        const t = setInterval(() => {
            n++;
            const ready = document.querySelector('input.vehicle_checkbox') && readMissing().length;
            if (ready) {
                clearInterval(t);
                run();
            } else if (n >= CFG.tries) {
                clearInterval(t);
                msg('Einsatzhelfer nicht gefunden');
            }
        }, CFG.interval);
    }
})();
