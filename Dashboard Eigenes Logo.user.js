// ==UserScript==
// @name         Dashboard Eigenes Logo
// @namespace    https://leitstellenspiel.de/bielefeld
// @version      v1.0.35
// @license      Design by Bobelle
// @author       Design by Bobelle
// @description  Blendet das Original-Logo aus und legt ein eigenes darüber
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';

    // >>> HIER deine Logo-URL eintragen:
    const CUSTOM_LOGO_URL = 'https://deine-domain.de/dein_logo.png';

    GM_addStyle(`
        /* Container um das Original-Logo als Bezug für das Overlay verwenden */
        #bielefeld-original-brand {
            position: relative !important;   /* übersteuert das inline "position: static" */
            display: inline-flex !important; /* bleibt schön ausgerichtet */
            align-items: center;
        }

        /* Original-Logo unsichtbar machen, bleibt aber im Layout */
        #bielefeld-original-brand img.logoSmall {
            opacity: 0 !important;
        }

        /* Eigenes Logo darüber legen */
        #bielefeld-original-brand::after {
            content: "";
            position: absolute;
            inset: 0;                        /* füllt den gesamten Span aus */
            background-image: url("${CUSTOM_LOGO_URL}");
            background-repeat: no-repeat;
            background-position: center;     /* nach Wunsch: center left / center right etc. */
            background-size: contain;
            pointer-events: none;            /* Klicks gehen weiter an den Link */
            z-index: 10;
        }
    `);
})();

