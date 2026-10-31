// ==UserScript==
// @name         Dashboard_Toggle_ausblenden
// @namespace    https://leitstellenspiel.de
// @version      1.0.01
// @author       Design by Bobelle
// @description  Blendet das Original-Logo aus und bindet ein eigenes ein
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @include      https://www.leitstellenspiel.de/*
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const style = document.createElement('style');
    style.innerHTML = `
        /* Originales Logo komplett ausblenden und Platz freigeben */
        a.navbar-brand {
            display: none !important;
        }

        /* Beispiel für dein eigenes Logo (Pfad oder URL anpassen!) */
        /*
        .navbar > .container-fluid {
            background-image: url('DEINE_BILD_URL_HIER');
            background-repeat: no-repeat;
            background-size: contain;
        }
        */
    `;
    document.head.appendChild(style);
})();