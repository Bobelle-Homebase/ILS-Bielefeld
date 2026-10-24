// ==UserScript==
// @name         Dashboard Eigenes Logo
// @namespace    https://leitstellenspiel.de/dashboard
// @version      v1.0
// @author       Design by Bobelle
// @description  Blendet das Original-Logo aus und legt ein eigenes darüber
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Eigenes%20Logo.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Eigenes%20Logo.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CUSTOM_LOGO_URL = 'https://DEINE-ECHTE-URL/dein_logo.png';

    const style = document.createElement('style');
    style.textContent = `
        #bielefeld-original-brand {
            position: relative !important;
            display: inline-flex !important;
            align-items: center;
        }

        #bielefeld-original-brand img.logoSmall {
            opacity: 0 !important;
        }

        #bielefeld-original-brand::after {
            content: "";
            position: absolute;
            inset: 0;
            background-image: url("${CUSTOM_LOGO_URL}");
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            pointer-events: none;
            z-index: 10;
        }
    `;
    document.head.appendChild(style);
})();