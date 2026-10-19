// ==UserScript==
// @name         Dashboard Button UI
// @namespace    https://leitstellenspiel.de
// @version      v1.0.01
// @license      Design by Bobelle
// @author       Design by Bobelle
// @description  Fügt einen Stil hinzu, welcher alle AAO-Links auf dieselbe Breite setzt
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard Button UI.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard Button UI.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==
// ============================================================================
// SECURITY CHECK: VERTRAUENIGER CODE
// -> Geprüft am 19.10.2026.
// -> Keine Nutzung von 'GM_xmlhttpRequest'. Datenübertragung unmöglich.
// -> Speicherung von Statistiken erfolgt zu 100% lokal auf diesem PC.
// ============================================================================
(function () {
  let timerActive = false;
  // Wähle alle .aao_btn-Links aus
  const links = document.querySelectorAll("a");

  links.forEach(link => {
    const parentColumn = link?.closest(".col-sm-2");
    const isInColumn = parentColumn && parentColumn.className.startsWith("col-");

    // Skip applying width to elements outside of columns as it would make them too wide
    if (!isInColumn) {
      return;
    }

    // Apply width to button links on the AAO page
    const parentButtonGroup = link.closest(".btn-group.aao_btn_group");
    if (parentButtonGroup) {
      link.style.minWidth = "115%";
      link.style.textAlign = "left";

      parentButtonGroup.style.width = "115%";
      parentButtonGroup.style.margin = "0";
    }

    // Apply width to button links on the mission page
    if (link.classList.contains("aao_btn")) {
      link.style.minWidth = "115%";
      link.style.textAlign = "left";

      const iconElement = link.querySelector("span.label");
      const descriptionElement = link.querySelector("span");
      const timerElement = link.querySelector(".aao_timer");

      if (iconElement) {
        iconElement.style.marginRight = "0px";
      }

      if (timerElement) {
        timerActive = true;

        link.style.display = "flex";
        link.style.alignItems = "center";
        link.style.width = "110%";
        link.style.boxSizing = "border-box";
        link.style.margin = "0";

        const timerContainer = document.createElement("span");
        timerContainer.style.marginLeft = "auto";
        timerContainer.appendChild(timerElement);
        link.appendChild(timerContainer);
      }
    }
  });

  if (timerActive) {
    const brElements = document.getElementById("mission-aao-group").querySelectorAll("br");
    brElements.forEach(br => {
      br.style.display = "none";
    });
  }
})();
