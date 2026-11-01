// ==UserScript==
// @name         Dashboard_Einsatz_Credits
// @namespace    https://leitstellenspiel.de
// @version      1.0.02
// @author       Design by Bobelle
// @description  Zeigt die durchschnittlichen Credits je Einsatz in der Einsatzliste an
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/
// @match        https://www.leitstellenspiel.de/?*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // Nur im Hauptfenster, nicht in iFrames/Unterseiten
  if (window.top !== window.self) return;
  if (window.location.pathname !== "/") return;

  // Doppelte Ausführung verhindern
  if (window.__dashboardEinsatzCreditsLoaded) return;
  window.__dashboardEinsatzCreditsLoaded = true;

  const STORAGE_KEY = "dashboardEinsatzCredits_missions";
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 Stunden

  let missionMap = null; // Map: Einsatztyp-ID -> average_credits

  // ---------- Daten laden / cachen ----------

  function readCache() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.value)) return null;
      if (data.lastUpdate < Date.now() - MAX_AGE_MS) return null;
      return data.value;
    } catch (e) {
      return null;
    }
  }

  async function loadMissions() {
    let list = readCache();

    if (!list) {
      try {
        const res = await fetch("/einsaetze.json", { credentials: "same-origin" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        list = await res.json();
        try {
          window.sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lastUpdate: Date.now(), value: list })
          );
        } catch (e) {
          /* Storage voll oder gesperrt - egal, wir arbeiten im Speicher weiter */
        }
      } catch (e) {
        console.warn("[Einsatz_Credits] einsaetze.json konnte nicht geladen werden:", e);
        return false;
      }
    }

    missionMap = new Map();
    list.forEach((m) => {
      missionMap.set(String(m.id), m.average_credits);
    });
    return true;
  }

  function getCredits(missionTypeId) {
    if (!missionMap) return undefined;
    const id = String(missionTypeId);
    if (missionMap.has(id)) return missionMap.get(id);

    // Fallback: Overlay-/Zusatzteile in der ID abschneiden (z. B. "12-1" oder "12_1")
    const base = id.split(/[-_]/)[0];
    if (missionMap.has(base)) return missionMap.get(base);

    return undefined;
  }

  // ---------- DOM ----------

  function createCreditsElement(missionId, credits) {
    const el = document.createElement("span");
    el.id = "mission_credits_" + missionId;

    if (credits === null || credits === undefined) {
      el.innerText = "🚑";
      return el;
    }

    el.innerText = credits;

    if (credits >= 10000) el.className = "label label-primary";
    else if (credits >= 7000) el.className = "label label-info";
    else if (credits >= 4000) el.className = "label label-success";
    else el.className = "label label-default";

    return el;
  }

  function applyToEntry(entry) {
    const missionId = entry.getAttribute("mission_id");
    const missionTypeId = entry.getAttribute("mission_type_id");
    if (!missionId || missionTypeId === null || missionTypeId === "") return;

    const credits = getCredits(missionTypeId);
    if (credits === undefined) return; // unbekannter Einsatztyp

    const newEl = createCreditsElement(missionId, credits);
    const existing = document.getElementById("mission_credits_" + missionId);

    if (existing) {
      existing.replaceWith(newEl);
      return;
    }

    const heading =
      entry.querySelector(".panel-heading") ||
      (entry.firstElementChild && entry.firstElementChild.firstElementChild);
    if (!heading) return;

    heading.insertBefore(
      newEl,
      heading.firstChild ? heading.firstChild.nextSibling : null
    );
  }

  function applyToAll() {
    document.querySelectorAll(".missionSideBarEntry").forEach(applyToEntry);
  }

  function applyToMission(missionId) {
    const entry = document.querySelector(
      '.missionSideBarEntry[mission_id="' + missionId + '"]'
    );
    if (entry) applyToEntry(entry);
  }

  // ---------- Hook auf missionMarkerAdd ----------

  function hookMissionMarkerAdd() {
    if (typeof window.missionMarkerAdd !== "function") return false;
    if (window.missionMarkerAdd.__creditsHooked) return true;

    const original = window.missionMarkerAdd;

    const wrapped = function (mission) {
      const result = original.apply(this, arguments);
      try {
        if (mission && mission.id !== undefined) {
          // kurz warten, bis das Spiel den Listeneintrag erzeugt hat
          setTimeout(() => applyToMission(mission.id), 50);
        }
      } catch (e) {
        console.warn("[Einsatz_Credits] Fehler im Hook:", e);
      }
      return result;
    };
    wrapped.__creditsHooked = true;

    window.missionMarkerAdd = wrapped;
    return true;
  }

  // ---------- Start ----------

  async function init() {
    const ok = await loadMissions();
    if (!ok) return;

    applyToAll();

    // missionMarkerAdd ist evtl. noch nicht definiert -> kurz warten
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (hookMissionMarkerAdd() || tries > 40) clearInterval(timer);
    }, 500);
  }

  init();
})();
