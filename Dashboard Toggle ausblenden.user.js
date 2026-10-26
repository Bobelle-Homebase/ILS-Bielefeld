// ==UserScript==
// @name         Dashboard Toggle ausblenden
// @namespace    https://leitstellenspiel.de/dashboard
// @version      1.0.01
// @author       Design by Bobelle
// @description  Blendet das Original-Logo aus und legt ein eigenes darüber
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    const style = document.createElement('style');
    style.innerHTML = '.navbar-brand, header nav a.navbar-brand, .navbar-header a { display: none !important; }';
    document.head.appendChild(style);
})();
