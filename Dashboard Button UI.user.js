// ==UserScript==
// @name         Dashboard Button UI
// @namespace    https://leitstellenspiel.de/dashboard
// @version      1.0.16
// @author       Design by Bobelle
// @description  Setzt alle AAO-Buttons auf dieselbe Breite
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Button%20UI.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20Button%20UI.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  function apply() {
    let timerActive = false;

    // AAO-Buttons und Links in AAO-Button-Gruppen auswählen
    document.querySelectorAll("a.aao_btn, .aao_btn_group a").forEach(link => {
      // Bereits bearbeitete Links überspringen
      if (link.dataset.uiApplied) return;

      // Elemente außerhalb der Spalten überspringen (wären sonst zu breit)
      if (!link.closest(".col-sm-2")) return;

      link.dataset.uiApplied = "1";

      // Buttons auf der AAO-Seite
      const group = link.closest(".btn-group.aao_btn_group");
      if (group) {
        link.style.minWidth = "115%";
        link.style.textAlign = "left";

        group.style.width = "115%";
        group.style.margin = "0";
      }

      // Buttons auf der Einsatzseite
      if (link.classList.contains("aao_btn")) {
        link.style.minWidth = "115%";
        link.style.textAlign = "left";

        const icon = link.querySelector("span.label");
        if (icon) icon.style.marginRight = "0";

        const timer = link.querySelector(".aao_timer");
        if (timer) {
          timerActive = true;

          Object.assign(link.style, {
            display: "flex",
            alignItems: "center",
            boxSizing: "border-box",
            margin: "0"
          });

          const container = document.createElement("span");
          container.style.marginLeft = "auto";
          container.appendChild(timer);
          link.appendChild(container);
        }
      }
    });

    // Zeilenumbrüche ausblenden, wenn Timer aktiv sind
    const aaoGroup = document.getElementById("mission-aao-group");
    if (timerActive && aaoGroup) {
      aaoGroup.querySelectorAll("br").forEach(br => {
        br.style.display = "none";
      });
    }
  }

  // Erstanwendung
  apply();

  // Nachträglich geladene Inhalte (AJAX) ebenfalls bearbeiten
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
