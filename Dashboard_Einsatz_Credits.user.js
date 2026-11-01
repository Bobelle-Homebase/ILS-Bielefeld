// ==UserScript==
// @name         Dashboard_Einsatz_Credits
// @namespace    https://leitstellenspiel.de
// @version      1.0.06
// @author       Design by Bobelle
// @description  Zeigt die durchschnittlichen Credits je Einsatz in der Einsatzliste an
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @include      https://www.leitstellenspiel.de/*
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-end
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
  let scheduled = false;

  // ---------- Daten laden / cachen ----------

  function buildMap(list) {
    const map = new Map();
    list.forEach((m) => map.set(String(m.id), m.average_credits));
    return map;
  }

  function readCache() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.value)) return null;
      if (data.lastUpdate < Date.now() - MAX_AGE_MS) return null;
      return data.value;
    } catch (e) {
      return null;
    }
  }

  async function fetchMissions() {
    try {
      const res = await fetch("/einsaetze.json", { credentials: "same-origin" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const list = await res.json();
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ lastUpdate: Date.now(), value: list })
        );
      } catch (e) {
        /* Storage voll oder gesperrt - egal */
      }
      return list;
    } catch (e) {
      console.warn("[Einsatz_Credits] einsaetze.json konnte nicht geladen werden:", e);
      return null;
    }
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
    el.className = "dec-credits label ";
    el.textContent = credits;

    if (credits >= 10000) el.className += "label-primary";
    else if (credits >= 7000) el.className += "label-info";
    else if (credits >= 4000) el.className += "label-success";
    else el.className += "label-default";

    return el;
  }

  function applyToEntry(entry) {
    const missionId = entry.getAttribute("mission_id");
    const typeId = entry.getAttribute("mission_type_id");
    if (!missionId || typeId === null || typeId === "" || typeId === "null") return;

    const credits = getCredits(typeId);
    if (credits === undefined) return; // unbekannter Einsatztyp -> später erneut versuchen

    const existing = entry.querySelector(".dec-credits");
    const wantsLabel = credits !== null && credits !== undefined;

    // Nichts zu tun, wenn der Zustand schon stimmt
    if (entry.dataset.decType === typeId && !!existing === wantsLabel) return;

    entry.dataset.decType = typeId;

    if (!wantsLabel) {
      if (existing) existing.remove();
      return;
    }

    const newEl = createCreditsElement(missionId, credits);

    if (existing) {
      existing.replaceWith(newEl);
      return;
    }

    const heading =
      entry.querySelector(".panel-heading") ||
      (entry.firstElementChild && entry.firstElementChild.firstElementChild);
    if (!heading) {
      delete entry.dataset.decType; // später erneut versuchen
      return;
    }

    heading.insertBefore(
      newEl,
      heading.firstChild ? heading.firstChild.nextSibling : null
    );
  }

  function processAll() {
    scheduled = false;
    if (!missionMap) return;
    document.querySelectorAll(".missionSideBarEntry").forEach(applyToEntry);
  }

  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(processAll);
  }

  // ---------- Beobachter: reagiert sofort auf neue/geänderte Einsätze ----------

  function startObserver() {
    const observer = new MutationObserver(scheduleProcess);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["mission_type_id"],
    });
  }

  // ---------- Start ----------

  async function init() {
    startObserver();

    // Aus dem Cache sofort anzeigen, sonst erst laden
    let list = readCache();
    if (!list) list = await fetchMissions();
    if (!list) return;

    missionMap = buildMap(list);
    processAll();
  }

  init();
})();
