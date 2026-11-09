// ==UserScript==
// @name         Dashboard_mit_Statistik
// @namespace    https://leitstellenspiel.de
// @version      4.8.3
// @author       Design by Bobelle
// @description  Full All in One mit_Statistik
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Lokaler Speicheradapter: keine GM-Berechtigungen und keine globalen Hilfsfunktionen.
    // Der bisherige Schluessel-Praefix bleibt fuer bestehende Einstellungen erhalten.
    const GM_getValue = (key, fallback) => {
        try { return localStorage.getItem(`fzgm_${key}`) ?? fallback; }
        catch { return fallback; }
    };
    const GM_setValue = (key, value) => {
        try { localStorage.setItem(`fzgm_${key}`, value); }
        catch (error) { console.warn('[Bobelle Dashboard] Speichern fehlgeschlagen:', error); }
    };


    // v4.7: Escaping fuer dynamische Inhalte in HTML-Templates.
    const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[char]));

    // KONFIGURATION & KONSTANTEN
    const CFG = { zIndex: 99999 };

    const VEHICLE_MATCH_CACHE = {
        _map: new Map(),
        _max: 2000,
        get(key) { return this._map.get(key); },
        set(key, val) {
            if (this._map.size >= this._max) {
                const keysToDelete = Array.from(this._map.keys()).slice(0, 500);
                keysToDelete.forEach(k => this._map.delete(k));
            }
            this._map.set(key, val);
        }
    };

    const ICONS = {
        patient: "👨‍⚕️", prisoner: "👮", alarm: "🚨", ktp: "🚑", supply: "🥘",
        person: "👤", target: "⌖", alliance: "🤝", event: "🎉", water: "💧", heli: "🚁", school: "🎓"
    };

    const C_FW ="#b00000", C_RD = "#FF9D0A", C_POL = "#54B509", C_THW = "#00387b";
    const C_SEG = "#FFD7A8", C_WR = "#004F9F", C_SR = "#004F9F";
    const C_LUFT = "#5e879e", C_RES = "#5a5a5a", C_AUS = "#7b3fa0";

    const CAT_COLORS = {
        "Luft": C_LUFT, "FW": C_FW, "RD": C_RD, "POL": C_POL, "THW": C_THW, "SEG": C_SEG,
        "WerkFW": "#b00000", "FlugFW": "#b00000", "UAS": "#9b9b9b", "BergRett": "#B0AC97",
        "WasserRett": C_WR, "SeenotRett": C_SR, "BahnRett": "#5a5a5a",
        "Ressourcen": C_RES, "Ausbildung": C_AUS
    };

    const CAT_DISPLAY_NAMES = {
        "Luft": "Luftlagezentrum", "FW": "Feuerwehr", "RD": "Rettungsdienst", "POL": "Polizei",
        "THW": "Technisches Hilfswerk", "SEG": "Schnelleinsatzgruppe", "WerkFW": "Werkfeuerwehr",
        "FlugFW": "Flughafenfeuerwehr", "UAS": "UAS", "WasserRett": "Wasserrettung",
        "SeenotRett": "Seenotrettung", "BergRett": "Bergrettung", "BahnRett": "Bahnrettung",
        "Ausbildung":"Ausbildung & Lehrgänge"
    };

    const CATEGORY_ORDER = [
        "Luft","FW","RD","POL","THW","SEG","WerkFW","FlugFW","UAS",
        "BergRett","WasserRett","SeenotRett","BahnRett","Ausbildung"
    ];

    const AAO_TILES_RAW = [
        { n:"RTH [Christoph 13 (Bielefeld)]", id:31, c:C_LUFT, cat:"Luft", s:["rth"]},
        { n:"RTH mit Winde", id:157, c:C_LUFT, cat:"Luft", s:["rth mit winde"]},
        { n:"Polizeihubschrauber", id:61, c:C_POL, cat:"Luft", s:["polizeihubschrauber"]},
        { n:"Polizeihubschrauber mit Winde", id:156, c:C_POL, cat:"Luft", s:["polizeihubschrauber mit winde","polizeihubschrauber w"]},
        { n:"LF20", id: 0, c:C_FW, cat:"FW", s:["lf 20","lf20"]},
        { n:"HLF20", id:30, c:C_FW, cat:"FW", s:["hlf 20","hlf20"]},
        { n:"DLK23", id:2, c:C_FW, cat:"FW", s:["dlk"]},
        { n:"Rüstwagen", id:4, c:C_FW, cat:"FW", s:["rw","rüstwagen"]},
        { n:"Schlauchwagen", id:[13,14,15], c:C_FW, cat:"FW", s:["schlauchwagen","sw 1000","sw 2000","sw 2000tr"]},
        { n:"Kleintankwagen", id:118, c:C_FW, cat:"FW", s:["kleintankwagen"]},
        { n:"Tankwagen", id:120, c:C_FW, cat:"FW", s:["tankwagen"]},
        { n:"TLF", id:[17,18], c:C_FW, cat:"FW", s:["tlf"]},
        { n:"TLF3000W", id:[187,188], c:C_FW, cat:"FW", s:["tlfw"]},
        { n:"GTLF", id:121, c:C_FW, cat:"FW", s:["gtlf"]},
        { n:"GTLF1000W", id:189, c:C_FW, cat:"FW", s:["gtlf-w"]},
        { n:"PTLF 4000", id:166, c:C_FW, cat:"FW", s:["ptlf4000","ptlf"]},
        { n:"FwK", id:57, c:C_FW, cat:"FW", s:["fwk","kran"]},
        { n:"ELW 1", id:3, c:C_FW, cat:"FW", s:["elw 1"]},
        { n:"ELW 2", id:34, c:C_FW, cat:"FW", s:["elw 2"]},
        { n:"MTW", id:36, c:C_FW, cat:"FW", s:["mtw"]},
        { n:"MTF-Logistik", id:106, c:C_FW, cat:"FW", s:["mtf-l"]},
        { n:"MTW-Verpflegung", id:140, c:C_FW, cat:"FW", s:["mtw-v"]},
        { n:"SLF", id:167, c:C_FW, cat:"FW", s:["slf","sonderlöschfahrzeug"]},
        { n:"Dekon-P", id:53, c:C_FW, cat:"FW", s:["dekon-p"]},
        { n:"GW-Lüfter", id:114, c:C_FW, cat:"FW", s:["gw-lüfter"]},
        { n:"GW-Tierrettung", id:185, c:C_FW, cat:"FW", s:["gw-Tier"]},
        { n:"GW-Atemschutz", id:5, c:C_FW, cat:"FW", s:["gw-a"]},
        { n:"GW-Öl", id:10, c:C_FW, cat:"FW", s:["gw-öl"]},
        { n:"GW-Messtechnik", id:12, c:C_FW, cat:"FW", s:["gw-mess"]},
        { n:"GW-Gefahrgut", id:27, c:C_FW, cat:"FW", s:["gw-gefahr"]},
        { n:"GW-Waldbrand", id:190, c:C_FW, cat:"FW", s:["gw-wald"]},
        { n:"GW-L1", id:104, c:C_FW, cat:"FW", s:["gw-l1"]},
        { n:"GW-L2", id:105, c:C_FW, cat:"FW", s:["gw-l2"]},
        { n:"GW-Höhenrettung", id:33, c:C_FW, cat:"FW", s:["gw-höhen fw"]},
        { n:"GW-Verpflegung", id:138, c:C_FW, cat:"FW", s:["gw-verpflegung"]},
        { n:"GW-Küche", id:139, c:C_FW, cat:"FW", s:["gw-küche"]},
        { n:"WLF", id:46, c:C_FW, cat:"FW", s:["wlf","wechsellader"]},
        { n:"AB-Einsatzleitung", id:78, c:C_FW, cat:"FW", s:["ab-el"]},
        { n:"AB-Atemschutz", id:48, c:C_FW, cat:"FW", s:["ab-atemschutz"]},
        { n:"AB-Öl", id:49, c:C_FW, cat:"FW", s:["ab-öl"]},
        { n:"AB-Rüst", id:47, c:C_FW, cat:"FW", s:["ab-rüst"]},
        { n:"AB-Schlauch", id:62, c:C_FW, cat:"FW", s:["ab-schlauch"]},
        { n:"AB-Wasser/Schaum", id:170, c:C_FW, cat:"FW", s:["ab-wasser"]},
        { n:"AB-Dekon-P", id:54, c:C_FW, cat:"FW", s:["ab-dekon-p"]},
        { n:"AB-Gefahrgut", id:77, c:C_FW, cat:"FW", s:["ab-gefahr"]},
        { n:"AB-Waldbrand", id:192, c:C_FW, cat:"FW", s:["ab-wald"]},
        { n:"AB-Tank", id:117, c:C_FW, cat:"FW", s:["ab-tank"]},
        { n:"AB-Lösch", id:119, c:C_FW, cat:"FW", s:["ab-lösch"]},
        { n:"AB-Sonderlöschmittel", id:169, c:C_FW, cat:"FW", s:["ab-sonderlöschmittel"]},
        { n:"AB-MzB", id:71, c:C_FW, cat:"FW", s:["ab-mzb"]},
        { n:"AB-Küche", id:142, c:C_FW, cat:"FW", s:["ab-küche"]},
        { n:"AB-Lüfter", id:116, c:C_FW, cat:"FW", s:["ab-lüfter"]},
        { n:"AB-Logistik", id:108, c:C_FW, cat:"FW", s:["ab-logistik"]},
        { n:"AB-NEA50 (FW)", id:179, c:C_FW, cat:"FW", s:["ab-nea50"]},
        { n:"AB-NEA200 (FW)", id:180, c:C_FW, cat:"FW", s:["ab-nea200"]},
        { n:"Anh Tierrettungl", id:186, c:C_FW, cat:"FW", s:["anh tier"]},
        { n:"Anh Schlauch", id:143, c:C_FW, cat:"FW", s:["anh schlauch"]},
        { n:"Anh Waldbrand", id:191, c:C_FW, cat:"FW", s:["anh wald"]},
        { n:"Anh Sonderlöschmittel", id:168, c:C_FW, cat:"FW", s:["anh sonderlöschmittel"]},
        { n:"Anh Lüfter", id:115, c:C_FW, cat:"FW", s:["anh lüfter"]},
        { n:"RTW", id:28, c:C_RD, cat:"RD", s:["rtw"]},
        { n:"NEF", id:29, c:C_RD, cat:"RD", s:["nef"]},
        { n:"KTW", id:38, c:C_RD, cat:"RD", s:["ktw"]},
        { n:"NAW", id:74, c:C_RD, cat:"RD", s:["naw"]},
        { n:"ITW", id:97, c:C_RD, cat:"RD", s:["itw"]},
        { n:"KdoW-LNA", id:55, c:C_RD, cat:"RD", s:["lna"]},
        { n:"KdoW-OrgL", id:56, c:C_RD, cat:"RD", s:["orgl"]},
        { n:"GRTW", id:73, c:C_RD, cat:"RD", s:["grtw basis","grtw standard","grossraumrettungswagen"]},
        { n:"FuStW", id:32, c:C_POL, cat:"POL", s:["fustw","streifenwagen"]},
        { n:"FuStW (AB)", id:184, c:C_POL, cat:"POL", s:["fustw","streifenwagen"]},
        { n:"FuStW (DGL)", id:103, c:C_POL, cat:"POL", s:["dgl"]},
        { n:"GruKw", id:50, c:C_POL, cat:"POL", s:["grukw"]},
        { n:"LauKw", id:165, c:C_POL, cat:"POL", s:["laukw"]},
        { n:"LeBefKw", id:35, c:C_POL, cat:"POL", s:["lebefkw"]},
        { n:"GefKw", id:52, c:C_POL, cat:"POL", s:["gefkw"]},
        { n:"WaWe 10", id:72, c:C_POL, cat:"POL", s:["wawe"]},
        { n:"SEK-ZF", id:79, c:C_POL, cat:"POL", s:["sek - zf","sek-zf"]},
        { n:"SEK-MTF", id:80, c:C_POL, cat:"POL", s:["sek - mtf","sek-mtf"]},
        { n:"MEK-ZF", id:81, c:C_POL, cat:"POL", s:["mek - zf","mek-zf"]},
        { n:"MEK-MTF", id:82, c:C_POL, cat:"POL", s:["mek - mtf","mek-mtf"]},
        { n:"FüKW (Polizei)", id:51, c:C_POL, cat:"POL", s:["fükw"]},
        { n:"DHuFüKW", id:94, c:C_POL, cat:"POL", s:["diensthund","dhufükw"]},
        { n:"Polizeimotorrad", id:95, c:C_POL, cat:"POL", s:["motorrad"]},
        { n:"Zivilstreifenwagen", id:98, c:C_POL, cat:"POL", s:["zivil"]},
        { n:"Pferdetransporter klein", id:134, c:C_POL, cat:"POL", s:["pferdetransporter klein","pferdetr. klein"]},
        { n:"Pferdetransporter groß", id:135, c:C_POL, cat:"POL", s:["pferdetransporter groß","pferdetr. groß"]},
        { n:"Anh Pferdetransport", id:136, c:C_POL, cat:"POL", s:["anh pferde","anh pferdetransport"]},
        { n:"Zugfahrzeug Pferdetransport", id:137, c:C_POL, cat:"POL", s:["zugfahrzeug pferd"]},
        { n:"Außenlastbehälter", id:96, c:C_LUFT, cat:"Luft", s:["außenlast"]},
        { n:"MTF Drohne", id:126, c:"#9b9b9b", cat:"UAS", s:["mtf drohne","drohne"]},
        { n:"ELW Drohne", id:128, c:"#9b9b9b", cat:"UAS", s:["elw drohne"]},
        { n:"ELW 2 Drohne", id:129, c:"#9b9b9b", cat:"UAS", s:["elw 2 drohne"]},
        { n:"GW-UAS (Pilot Bobelle)", id:127, c:"#9b9b9b", cat:"SEG", s:["gw-uas"]},
        { n:"FLF", id:75, c:"#721c24", cat:"FlugFW", s:["flf","flugfeldlöschfahrzeug"]},
        { n:"Rettungstreppe", id:76, c:"#721c24", cat:"FlugFW", s:["rt","rettungstreppe"]},
        { n:"GW-Werkfeuerwehr", id:83, c:"#5a1a1f", cat:"WerkFW", s:["gw-werk"]},
        { n:"ULF mit Löscharm", id:84, c:"#5a1a1f", cat:"WerkFW", s:["ulf"]},
        { n:"TM 50", id:85, c:"#5a1a1f", cat:"WerkFW", s:["tm 50"]},
        { n:"Turbolöscher", id:86, c:"#5a1a1f", cat:"WerkFW", s:["turbo"]},
        //{ n:"Schmutzwasserpumpen", id:[17,18], c:C_THW, cat:"THW", s:["schmutzwasserpumpen","schmutzwasserpumpe","swpu","swpufzg","swpu-fzg","wasserpumpen","wasserpumpe","wasser pumpen","schmutz wasser","pumpen fahrzeug"]},
        //{ n:"Feuerlöschpumpen", id:30, c:C_THW, cat:"THW", s:["feuerlöschpumpen","feuerlöschpumpe","fpfzg","fp-fzg","löschpumpen","löschpumpe","lösch pumpen","feuer lösch","feuerlösch pumpe"]},
        { n:"Tauchkraftwagen", id:69, c:C_THW, cat:"THW", s:["tauchkraftwagen"]},
        { n:"Mobilkran", id:182, c:C_THW, cat:"THW", s:["mobilkran"]},
        { n:"MzGW (FGr N)", id:41, c:C_THW, cat:"THW", s:["mzgw fgr n"]},
        { n:"MzGW (FGr BrB)", id:181, c:C_THW, cat:"THW", s:["mzgw fgr brb"]},
        { n:"MzGW SB", id:109, c:C_THW, cat:"THW", s:["mzgw sb"]},
        { n:"FüKW (THW)", id:144, c:C_THW, cat:"THW", s:["fükw thw","fükw (thw)"]},
        { n:"FüKomKW", id:145, c:C_THW, cat:"THW", s:["fükomkw"]},
        { n:"FmKW", id:147, c:C_THW, cat:"THW", s:["fmkw"]},
        { n:"GKW", id:39, c:C_THW, cat:"THW", s:["gkw"]},
        { n:"LKW K 9", id:42, c:C_THW, cat:"THW", s:["lkw k 9"]},
        { n:"BRmG R", id:43, c:C_THW, cat:"THW", s:["brmg","radlader"]},
        { n:"MLW 4", id:100, c:C_THW, cat:"THW", s:["mlw 4"]},
        { n:"MLW 5", id:45, c:C_THW, cat:"THW", s:["mlw 5"]},
        { n:"LKW 7 Lkr 19 tm", id:65, c:C_THW, cat:"THW", s:["lkw 7 lkr"]},
        { n:"LKW 7 Lbw (FGr WP)", id:123, c:C_THW, cat:"THW", s:["lkw 7 lbw wp","lkw 7 lbw (fgr wp)"]},
        { n:"LKW 7 Lbw (FGr Log-V)", id:176, c:C_THW, cat:"THW", s:["lkw 7 lbw log","lkw 7 lbw (fgr log-v)"]},
        { n:"LKW 7 Lbw (FGr E)", id:122, c:C_THW, cat:"THW", s:["lkw 7 lbw e","lkw 7 lbw (fgr e)"]},
        { n:"MTW-TZ", id:40, c:C_THW, cat:"THW", s:["mtw-tz"]},
        { n:"MTW-OV", id:124, c:C_THW, cat:"THW", s:["mtw-ov","ov thw","mtw ov"]},
        { n:"MTW-O", id:93, c:C_THW, cat:"THW", s:["mtw-o","o thw","mtw o"]},
        { n:"MTW-FGr K", id:148, c:C_THW, cat:"THW", s:["mtw-fgr k","mtw fgr k"]},
        { n:"MTW-Tr UL (Pilot Bobelle)", id:125, c:C_THW, cat:"THW", s:["mtw-tr ul"]},
        { n:"MTW-FGr (Log-V)", id:177, c:C_THW, cat:"THW", s:["mtw-fgr log"]},
        { n:"Anh Hund", id:92, c:C_THW, cat:"THW", s:["anh Hund"]},
        { n:"Anh 7", id:102, c:C_THW, cat:"THW", s:["anh 7 thw","anh fp thw"]},
        { n:"Anh SwPu", id:101, c:C_THW, cat:"THW", s:["anh swpu thw","anh swpu"]},
        { n:"Anh FüLa", id:146, c:C_THW, cat:"THW", s:["anh füla"]},
        { n:"Anh MzB", id:66, c:C_THW, cat:"THW", s:["anh mzb"]},
        { n:"Anh MzAB", id:68, c:C_THW, cat:"THW", s:["anh mzab"]},
        { n:"Anh SchlB", id:67, c:C_THW, cat:"THW", s:["anh schlb"]},
        { n:"Anh DLE", id:44, c:C_THW, cat:"THW", s:["anh dle"]},
        { n:"Anh 12 Lbw (FGr Log-V)", id:178, c:C_THW, cat:"THW", s:["anh 12 lbw"]},
        { n:"Anh Plattform (FGr BrB)", id:183, c:C_THW, cat:"THW", s:["anh plattform"]},
        { n:"ELW 1 (SEG)", id:59, c:C_SEG, cat:"SEG", s:["elw 1 (seg)","elw 1 seg"]},
        { n:"KTW Typ B", id:58, c:C_SEG, cat:"SEG", s:["ktw b","ktw typ b","nktw"]},
        { n:"GW-San", id:60, c:C_SEG, cat:"SEG", s:["gw-san"]},
        { n:"Rettungshundefahrzeug", id:91, c:C_SEG, cat:"SEG", s:["rettungshunde"]},
        { n:"Bt-Kombi", id:131, c:C_SEG, cat:"SEG", s:["bt-kombi"]},
        { n:"GW-Bt", id:130, c:C_SEG, cat:"SEG", s:["gw-bt"]},
        { n:"Bt LKW", id:133, c:C_SEG, cat:"SEG", s:["bt lkw"]},
        { n:"GW-TeSi", id:171, c:C_SEG, cat:"SEG", s:["gw-tesi"]},
        { n:"LKW Technik", id:172, c:C_SEG, cat:"SEG", s:["lkw technik"]},
        { n:"MTW-TeSi", id:173, c:C_SEG, cat:"SEG", s:["mtw-tesi"]},
        { n:"Anh TeSi", id:174, c:C_SEG, cat:"SEG", s:["anh tesi"]},
        { n:"Anh FKH", id:132, c:C_SEG, cat:"SEG", s:["anh fkh"]},
        { n:"Anh NEA50 (SEG)", id:175, c:C_SEG, cat:"SEG", s:["anh nea50 seg"]},
        { n:"Anh NEA50 (THW)", id:110, c:C_THW, cat:"THW", s:["anh nea50 thw"]},
        { n:"Anh NEA200 (THW)", id:112, c:C_THW, cat:"THW", s:["anh nea200 thw"]},
        { n:"Anh NEA50 (FW)", id:111, c:C_FW, cat:"FW", s:["anh nea50 fw"]},
        { n:"Anh NEA200 (FW)", id:113, c:C_FW, cat:"FW", s:["anh nea200 fw"]},
        { n:"ELW Bergrettung", id:151, c:"#B0AC97", cat:"BergRett", s:["elw berg"]},
        { n:"GW-Bergrettung", id:150, c:"#B0AC97", cat:"BergRett", s:["gw-bergrettung","gw-berg"]},
        { n:"GW-Höhenrettung (Bergrettung)", id:158, c:"#B0AC97", cat:"BergRett", s:["gw-höhen"]},
        { n:"GW-Bergrettung (NEF)", id:149, c:"#B0AC97", cat:"BergRett", s:["gw-bergnef","gw-berg nef","gw-bergrettung nef"]},
        { n:"ATV", id:152, c:"#B0AC97", cat:"BergRett", s:["atv"]},
        { n:"Schneefahrzeug", id:154, c:"#B0AC97", cat:"BergRett", s:["schnee"]},
        { n:"Hundestaffel (Bergrettung)", id:153, c:"#B0AC97", cat:"BergRett", s:["hunde berg","hundestaffel berg"]},
        { n:"Anh Höhenrettung (Bergrettung)", id:155, c:"#B0AC97", cat:"BergRett", s:["höhe"]},
        { n:"GW-Wasserrettung", id:64, c:C_WR, cat:"WasserRett", s:["gw-wasser"]},
        { n:"GW-Taucher", id:63, c:C_WR, cat:"WasserRett", s:["gw-taucher"]},
        { n:"MZB", id:70, c:C_WR, cat:"WasserRett", s:["mzb","boot"]},
        { n:"SAR Boot", id:160, c:C_SR, cat:"SeenotRett", s:["seenotrettungsboot","sar boot"]},
        { n:"SAR Kreuzer", id:159, c:C_SR, cat:"SeenotRett", s:["seenotrettungskreuzer","sar kreuzer"]},
        { n:"SAR Hubschrauber", id:161, c:C_LUFT, cat:"Luft", s:["sar hubschrauber"]},
        { n:"RW-Schiene", id:162, c:"#5a5a5a", cat:"BahnRett", s:["rw schiene","rw-schiene"]},
        { n:"HLF Schiene", id:163, c:"#5a5a5a", cat:"BahnRett", s:["hlf schiene"]},
        { n:"AB-Schiene", id:164, c:"#5a5a5a", cat:"BahnRett", s:["ab-schiene"]},
        { n:"Laufende Lehrgänge", id:[], c:C_AUS, cat:"Ausbildung", s:[]},
        { n:"Aktive Lehrgänge", id:[], c:C_AUS, cat:"Ausbildung", s:[]},
    ];

    const SVGS = {
        dashboard:`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
        eye:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        building:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="2" x2="9" y2="22"></line><line x1="15" y1="2" x2="15" y2="22"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="17" x2="20" y2="17"></line></svg>`,
        collapse:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 11 12 6 17 11"></polyline><polyline points="7 13 12 18 17 13"></polyline></svg>`,
        settings:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
        popout:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
        minimize:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        maximize:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`,
        anchor:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path></svg>`
    };

    const DEFAULTS = {
        columns:4, autoHideSeconds:5, clickIncrement:1, compactMode:false,
        winMaxHeight:700, winTop:60, winBg:"#f8f9fa", winBorderC:"#e9ecef", winBorderW:1, winRadius:0,
        headBg:"#e9ecef", headColor:"#343a40", headSize:15, headAlign:"left",
        catHeaderMode:"category", catHeaderBgColor:"#000000", catHeaderTextColor:"#ffffff",
        catHeaderSize:12, catHeaderPadding:5,
        catStatusTextColor:"#ffffff", catStatusTextSize:10,
        tileBgColor:"#ffffff", tileTextColor:"#000000", resourceTileBgColor:"#c8c8c8",
        barColor:"#0000ff", tileMinHeight:65, tileGap:0,
        tileColumnWidth:0, tilePaddingX:4, tilePaddingY:2, tileBorderWidth:1,
        tileNameSize:13, tileNameWeight:"normal",
        badgeSize:12, badgeAlign:"left", badgeTopMargin:2,
        tileCounterSize:17, numTodayColor:"#0000ff",
        numYdayColor:"#6c757d", resCounterColor:"#000000", resCounterSize:16,
        tileColorInUse:"#f7f46c", tileColorEmpty:"#fc483b",
        statsMissionsColor:"#000000", statsMissionsSize:12,
        statsKtpColor:"#000000", statsKtpSize:12,
        statsActiveColor:"#00cc00", statsActiveSize:12,
        subStatusSize:10, subStatusWeight:"normal", subStatusColorOk:"#00cc00", subStatusColorErr:"#ff0000",
        subUpdateSize:10, subUpdateWeight:"normal", subUpdateColor:"#b57900",
        subDispSize:10, subDispWeight:"normal", subDispColor:"#555555",
        headerElementSize:12, pillBgColor:"#ffffff", pillTextColor:"#000000",
        creditsGap:6, creditsFontSize:13, creditsLabelColor:"#333333", creditsValueColor:"#00cc00",
        funkalarmText:"Alarmierung", funkalarmSize:10, funkalarmColor:"#555555", funkalarmBold:false,
        funkalarmBlinkColor:"#ff0000", funkalarmBlinkDuration:120,
        toggleBtnSize:44, toggleBtnBg:"#f01606", toggleBtnBorderC:"#f3f035", toggleBtnBorderW:2,
        fmsFontSize:11, fmsHeight:1, fmsGap:4, debugMode:false, apiInterval:60,
        tileIdPrefix:"ID: ", tileIdSize:10, tileIdColor:"#999999", tileIdAlign:"right",
        tileStatsMode:"both", showTileYday:true,
        resourceCounterMode:"all", numAlign:"right", tileSortOrder:"category",
        activeCategoryFilter:"all", searchFilter:"", collapsedCats:[], collapsedTilesCats:[],
        footerText:"Design & Optimized by Bobelle", footerColor:"#1e90ff", footerSize:12, footerAlign:"center",
        schoolingApiInterval:180
    };

    const MISSION_SELECTORS = {
        emergency:"#mission_select_emergency",
        ktp:"#mission_select_krankentransport",
        started:"#mission_select_started"
    };

    const STORAGE = {
        COUNTS_TODAY:"fz_v9_counts_today",
        COUNTS_TOTAL:"fz_v9_counts_total",
        DETAILS_TODAY:"fz_v9_details",
        YDAY_COUNTS:"fz_v9_yday",
        HISTORY_7DAYS:"fz_v12_history",
        DAYSTAMP:"fz_v9_daystamp",
        UISETTINGS:"fz_ui_settings_v9_ultra",
        SYNC_SIGNAL:"fz_v9_sync_signal_ls",
        CREDITS_DATA:"fz_v28_credits_data",
        CUSTOM_STOCK:"fz_v31_custom_stock",
        TOGGLE_BTN_POS:"fz_toggle_btn_pos"
    };

    // VARIABLEN & STATUS
    const TYPE_ID_MAPPING = {};
    AAO_TILES_RAW.forEach(tile => {
        if (tile.id !== undefined && tile.id !== null) {
            const ids = Array.isArray(tile.id) ? tile.id : [tile.id];
            ids.forEach(i => {
                if (i === null || i === undefined) return;
                if (!TYPE_ID_MAPPING[i]) TYPE_ID_MAPPING[i] = [];
                TYPE_ID_MAPPING[i].push(tile.n);
            });
        }
    });

    // V4.5: Eindeutige Fahrzeugzuordnung und nachvollziehbare Diagnose.
    // Manuelle Korrekturen gelten fuer eine offizielle Typ-ID, nicht fuer einzelne Fahrzeugnamen.
    const MATCH_OVERRIDE_KEY = "fz_v45_vehicle_type_overrides";
    let manualTypeMappings = jsonLoadTypeOverrides();
    let vehicleMatchDiagnostics = {total:0, matched:0, ambiguous:[], unknown:[], manual:0};
    function jsonLoadTypeOverrides(){
        try {
            const data = JSON.parse(localStorage.getItem("fzgm_" + MATCH_OVERRIDE_KEY) || "{}");
            return data && typeof data === "object" && !Array.isArray(data) ? data : {};
        } catch { return {}; }
    }
    function saveTypeOverrides(){
        try { localStorage.setItem("fzgm_" + MATCH_OVERRIDE_KEY, JSON.stringify(manualTypeMappings)); }
        catch(e){ console.warn("[Bobelle] Typzuordnungen nicht gespeichert",e); }
    }
    function resolveVehicleTile(v, typeId){
        const id = typeId === null || !Number.isFinite(typeId) ? null : typeId;
        const typeName = normalize(v.vehicle_type_caption || v.vehicle_type_name || "");
        const idKey = id === null ? null : String(id);
        if(idKey !== null && Object.prototype.hasOwnProperty.call(manualTypeMappings,idKey)){
            const key = manualTypeMappings[idKey];
            // Manuelle Korrekturen nur auf echte Fahrzeugkacheln zulassen.
            if(tileMetaByKey[key] && !RESOURCE_TILE_NAMES.has(key)) return {key, source:"manual"};
        }
        const override = id === null ? null : VEHICLE_TYPE_OVERRIDES[id];
        if(override && Array.isArray(override.add) && override.add.length === 1 && tileMetaByKey[override.add[0]] && !RESOURCE_TILE_NAMES.has(override.add[0])){
            return {key:override.add[0],source:"official-override"};
        }
        const candidates = id === null ? [] : [...new Set(TYPE_ID_MAPPING[id] || [])];
        // Eindeutige offizielle ID ist verlaesslicher als frei gewaehlte Fahrzeugnamen.
        if(candidates.length === 1) return {key:candidates[0],source:"id"};
        // Mehrdeutige IDs nur durch eindeutige offizielle Typbezeichnung aufloesen.
        const pool = candidates.length ? candidates : TILE_LIST.filter(t => !RESOURCE_TILE_NAMES.has(t.n)).map(t=>t.n);
        const exact = pool.filter(k => {
            const tile = tileMetaByKey[k];
            return typeName && (normalize(k) === typeName || (tile.s || []).some(alias => normalize(alias) === typeName));
        });
        if(exact.length === 1) return {key:exact[0],source:"type"};
        if(candidates.length > 1) return {key:null,source:"ambiguous",candidates};
        // Bei unbekannter ID nur eindeutig exakte offizielle Bezeichnungen akzeptieren.
        return {key:null,source:"unknown",candidates:exact};
    }

    const VEHICLE_TYPE_OVERRIDES = {
        32:  { del: ["FuStW", "FuStW (DGL)", "Zivilstreifenwagen", "LauKw", "LeBefKw"], add: ["FuStW"] },
        50:  { del: ["GruKw", "Zugfahrzeug Pferdetransport", "Pferdetransporter klein", "Pferdetransporter groß", "Anh Pferdetransport"], add: ["GruKw"] },
        31:  { del: ["RTH [Christoph 13 (Bielefeld)]"], add: ["RTH [Christoph 13 (Bielefeld)]"] },
        61:  { del: ["Polizeihubschrauber"], add: ["Polizeihubschrauber"] },
        91:  { del: ["GW-San", "Rettungshundefahrzeug", "Hundestaffel (Bergrettung)"], add: ["Rettungshundefahrzeug"] },
        126: { del: ["MTF Drohne"], add: ["MTF Drohne"] },
        140: { del: ["MTW-Verpflegung", "MTW-TeSi"], add: ["MTW-Verpflegung"] },
        93:  { del: ["MTW-O", "MTW-OV", "KTW Typ B", "OV Mannschaftstransportwagen"], add: ["MTW-O"] },
        58:  { del: ["KTW Typ B"], add: ["KTW Typ B"] },
        73:  { del: ["GRTW"], add: ["GRTW"] },
        100: { del: ["FüKW (THW)", "MLW 4", "FüKomKW"], add: ["MLW 4"] },
        132: { del: ["Anh FKH"], add: ["Anh FKH"] },
        157: { del: ["RTH [Christoph 13 (Bielefeld)]", "RTH mit Winde"], add: ["RTH mit Winde"] },
        156: { del: ["Polizeihubschrauber", "Polizeihubschrauber mit Winde"], add: ["Polizeihubschrauber mit Winde"] },
        3:   { del: ["ELW 1", "ELW 1 (SEG)"], add: ["ELW 1"] },
        59:  { del: ["ELW 1", "ELW 1 (SEG)"], add: ["ELW 1 (SEG)"] },
        33:  { del: ["GW-Höhenrettung", "GW-Höhenrettung (Bergrettung)"], add: ["GW-Höhenrettung"] },
        158: { del: ["GW-Höhenrettung", "GW-Höhenrettung (Bergrettung)"], add: ["GW-Höhenrettung (Bergrettung)"] },
        51:  { del: ["FüKW (Polizei)", "FüKW (THW)"], add: ["FüKW (Polizei)"] },
        144: { del: ["FüKW (Polizei)", "FüKW (THW)"], add: ["FüKW (THW)"] },
        166: { del: ["TLF", "PTLF 4000"], add: ["PTLF 4000"] },
        17:  { del: ["TLF", "PTLF 4000"], add: ["TLF"] },
        18:  { del: ["TLF", "PTLF 4000"], add: ["TLF"] },
        87:  { del: ["TLF", "PTLF 4000"], add: ["TLF"] },
        149: { del: ["GW-Bergrettung", "GW-Bergrettung (NEF)"], add: ["GW-Bergrettung (NEF)"] },
        150: { del: ["GW-Bergrettung", "GW-Bergrettung (NEF)"], add: ["GW-Bergrettung"] }
    };

    const pathLoc = window.location.pathname;
    const isMainPage = ((pathLoc==="/"||pathLoc==="/index"||pathLoc.length<2)||pathLoc.includes("/leitstellenansicht"));

    const NORM_REGEX = /[^a-z0-9äöü]/g;
    const normalize = (s) => (s||"").toLowerCase().replace(NORM_REGEX,"");

    const TILE_LIST = AAO_TILES_RAW.map(t=>({...t, norm:normalize(t.n), search:(t.s||[]).map(normalize), cat:t.cat}));
    const KEYS = AAO_TILES_RAW.map(t=>t.n);
    const tileMetaByKey = Object.fromEntries(AAO_TILES_RAW.map(t=>[t.n,t]));

    // Pre-build search index for faster lookups
    const SEARCH_INDEX = {};
    TILE_LIST.forEach(t => {
        SEARCH_INDEX[t.norm] = t;
        t.search.forEach(s => {
            if(!SEARCH_INDEX[s]) SEARCH_INDEX[s] = [];
            if(!Array.isArray(SEARCH_INDEX[s])) SEARCH_INDEX[s] = [SEARCH_INDEX[s]];
            SEARCH_INDEX[s].push(t);
        });
    });

    const RESOURCE_TILE_NAMES = new Set([
        "Patienten","Gefangene","Wasserbedarf","Betreuung/Versorgung","Krankentransporte",
        "Helikopter","Krankenhausbetten","Gefängniszellen","Laufende Lehrgänge","Aktive Lehrgänge"
    ]);

    const SCHOOLING_TILE_NAMES = new Set(["Laufende Lehrgänge","Aktive Lehrgänge"]);

    const CAT_TILE_MAP = {};
    const CAT_VEHICLE_MAP = {};
    CATEGORY_ORDER.forEach(cat => {
        CAT_TILE_MAP[cat] = TILE_LIST.filter(t => t.cat === cat);
        CAT_VEHICLE_MAP[cat] = TILE_LIST.filter(t => t.cat === cat && !RESOURCE_TILE_NAMES.has(t.n));
    });

    const BUILDING_ID_TILE_MAP = {};
    AAO_TILES_RAW.forEach(t => {
        if(t.building_ids && t.building_ids.length > 0){
            t.building_ids.forEach(bid => {
                if(!BUILDING_ID_TILE_MAP[bid]) BUILDING_ID_TILE_MAP[bid] = [];
                BUILDING_ID_TILE_MAP[bid].push(t.n);
            });
        }
    });

    const FMS_COLORS = {1:"#007bff",2:"#28a745",3:"#ffc107",4:"#dc3545",5:"#17a2b8",6:"#6c757d",7:"#fd7e14",8:"#20c997"};

    let apiTimer=null, schoolingTimer=null;
    let sysReady=true, lastUpdateStr="--:--:--", isUpdating=false;
    let lastSuccessfulVehicleFetch = null; // Nur nach erfolgreichem API-Abruf
    let lastCreditsUpdate=0;
    let creditsData={ein:0,aus:0,bilanz:0,date:""};

    const tileCache={}, nameCache={}, vehicleStateCache={}, alarmTimers={};
    let lastAlarmTime={}, saveTimeout=null;

    const heliAlreadyCountedThisSession=new Set();
    const ktpAlreadyCountedThisSession=new Set(); // Kompatibilitaet mit aelteren Sitzungsdaten
    const dispatchEventGuard = new Map();
    const dispatchSeenWindowMs = 15000;
    function registerDispatchEvent(vehicleId, kind){
        const key = `${String(vehicleId)}:${kind}`;
        const now = Date.now();
        for(const [k,t] of dispatchEventGuard) if(now-t > dispatchSeenWindowMs) dispatchEventGuard.delete(k);
        if(dispatchEventGuard.has(key)) return false;
        dispatchEventGuard.set(key, now);
        return true;
    }
    function validFms(value){
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null;
    }

    let schoolingsData=[];
    let buildingNameCache={};
    let lastSchoolingsUpdate=0;
    let _restzeitTimerId=null;
    let _buildingsFullyLoaded=false;

    // HILFSFUNKTIONEN
    function formatRestzeit(finishAtMs) {
        const diff = finishAtMs - Date.now();
        if(diff <= 0) return "✅ Fertig";
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    function parseTwoNumbers(text) {
        const m = (text||"").match(/(\d+)\s*\/\s*(\d+)/);
        return m ? { a: parseInt(m[1],10), b: parseInt(m[2],10) } : { a: 0, b: 0 };
    }

    function getCounts(sel){
        const el = document.querySelector(sel);
        return el ? parseTwoNumbers(el.textContent) : { a: 0, b: 0 };
    }

    function getStartedCount(sel){
        const el = document.querySelector(sel);
        if(!el) return 0;
        const c = el.querySelector(".counter");
        const txt = (c ? c.textContent : el.textContent) || "0";
        const m = txt.replace(/\s+/g,"").match(/\d+/);
        return m ? parseInt(m[0],10) : 0;
    }

    function getMissionStatsHTML(){
        const em = getCounts(MISSION_SELECTORS.emergency);
        const ktp = getCounts(MISSION_SELECTORS.ktp);
        const started = getStartedCount(MISSION_SELECTORS.started);
        return `<span class="fzHeaderPill" style="color:${uiSettings.statsMissionsColor};font-size:${uiSettings.statsMissionsSize}px;font-weight:bold;">Einsätze: ${em.a}/${em.b}</span>
               <span class="fzHeaderPill" style="color:${uiSettings.statsKtpColor};font-size:${uiSettings.statsKtpSize}px;font-weight:bold;">KTW: ${ktp.a}/${ktp.b}</span>
               <span class="fzHeaderPill" style="color:${uiSettings.statsActiveColor};font-size:${uiSettings.statsActiveSize}px;font-weight:bold;">Aktiv: ${started}</span>`;
    }

    const json = {
        load(key, fallback){
            try {
                const v = GM_getValue(key, "");
                return v === "" ? fallback : (JSON.parse(v) || fallback);
            } catch {
                return fallback;
            }
        },
        save(key, val){ GM_setValue(key, JSON.stringify(val)); }
    };

    const store = {
        load: (key) => {
            const o = json.load(key, {});
            KEYS.forEach(k => { if(o[k] == null) o[k] = 0; });
            return o;
        },
        save: () => {
            if(saveTimeout) clearTimeout(saveTimeout);
            const saveDay = getTodayString();
            saveTimeout = setTimeout(() => {
                if(saveDay !== getTodayString() || GM_getValue(STORAGE.DAYSTAMP, "") !== saveDay) return;
                json.save(STORAGE.COUNTS_TODAY, state.today);
                json.save(STORAGE.COUNTS_TOTAL, state.total);
                json.save(STORAGE.DETAILS_TODAY, state.det);
                localStorage.setItem(STORAGE.SYNC_SIGNAL, Date.now().toString());
            }, 800);
        }
    };

    // INITIALISIERUNG
    creditsData = json.load(STORAGE.CREDITS_DATA, {ein:0, aus:0, bilanz:0, date:""});
    const customStock = json.load(STORAGE.CUSTOM_STOCK, {});

    let uiSettings = {...DEFAULTS, ...json.load(STORAGE.UISETTINGS, {})};
    for (const k in DEFAULTS) { if (uiSettings[k] === undefined) uiSettings[k] = DEFAULTS[k]; }
    if (!Array.isArray(uiSettings.collapsedTilesCats)) uiSettings.collapsedTilesCats = [];

    const saveUI = () => json.save(STORAGE.UISETTINGS, uiSettings);
    const getTodayString = () => new Date().toLocaleDateString("de-DE");

    let vehicleAvailability={}, vehicleExists={}, vehicleInUseCount={}, vehicleTotalCount={}, vehicleFreeCount={};
    let hasFreeCountData=false, vehicleLists={};
    let formattedVehicleUpdateTime = "Stand: --:--:--";


    let state = {
        today: store.load(STORAGE.COUNTS_TODAY),
        total: store.load(STORAGE.COUNTS_TOTAL),
        yday: store.load(STORAGE.YDAY_COUNTS),
        history: json.load(STORAGE.HISTORY_7DAYS, {}),
        det: json.load(STORAGE.DETAILS_TODAY, {})
    };
    if (state.today["Wasserbedarf"] && state.today["Wasserbedarf"] < 500) { state.today["Wasserbedarf"]=0; store.save(); }

    let fzWrapper, uiRoot, tileEls={}, extWin=null, cssContent="", lastCSSHash="";
    let animFrameId=null, hideStartTime=null, hideDuration=0, safeHideTimer=null, isHovering=false;
    let redrawGrid = () => {};
    let cachedCapacities = {beds:0, cells:0, bedsUsed:0, cellsUsed:0};
    let lastBuildingUpdate = 0;

    function _setEl(id, html){
        const el = document.getElementById(id);
        if(el && el.innerHTML !== html){
            el.innerHTML = html;
            return true;
        }
        return false;
    }

    // GEBÄUDE & LEHRGÄNGE
    let buildingNamesPromise = null;
    async function ensureBuildingNames(buildingIds){
        if(_buildingsFullyLoaded || buildingIds.length === 0) return;
        const missingIds = buildingIds.filter(id => !buildingNameCache[id]);
        if(missingIds.length === 0) return;
        try {
            if(!buildingNamesPromise){
                buildingNamesPromise = fetch("/api/buildings", {credentials: "same-origin"})
                    .then(r => { if(!r.ok) throw new Error("Buildings HTTP " + r.status); return r.json(); })
                    .finally(() => { buildingNamesPromise = null; });
            }
            const buildings = await buildingNamesPromise;
            if(Array.isArray(buildings)){
                buildings.forEach(b => { buildingNameCache[b.id] = b.caption || ("Wache #" + b.id); });
                _buildingsFullyLoaded = true;
            }
        } catch(e) { console.warn("[Bobelle] Gebäude-Fetch fehlgeschlagen:", e); }
    }

    let schoolingPending = null;
    async function fetchSchoolings(){
        if(schoolingPending) return schoolingPending;
        schoolingPending = fetchSchoolingsImpl().finally(() => { schoolingPending = null; });
        return schoolingPending;
    }
    async function fetchSchoolingsImpl(){
        try {
            const ownRes = await fetch("/api/schoolings", {credentials:"same-origin"});
            let own = [];
            if(ownRes.ok){
                try {
                    const data = await ownRes.json();
                    own = Array.isArray(data) ? data : (data && typeof data === "object" ? Object.values(data).find(v => Array.isArray(v)) || [] : []);
                } catch(e) { own = []; }
            }
            const buildingIds = [...new Set(own.map(s => s.building_id).filter(Boolean))];
            await ensureBuildingNames(buildingIds);
            const now = Date.now();

            schoolingsData = own.map(s => ({
                id: s.id,
                caption: s.caption || s.name || "Lehrgang/Schulung",
                description: s.description || s.schooling_description || s.type_name || "",
                buildingId: s.building_id,
                buildingName: buildingNameCache[s.building_id] || ("Wache #" + (s.building_id || "?")),
                finishAt: s.finish_at ? new Date(s.finish_at).getTime() : (s.end_time ? new Date(s.end_time).getTime() : null),
                startAt: s.start_at ? new Date(s.start_at).getTime() : null,
                source: "eigen",
                participantCount: s.participant_count || s.attendee_count || 0
            })).filter(s => !s.finishAt || s.finishAt > now - 60000);

            lastSchoolingsUpdate = now;
            updateSchoolingTiles();
        } catch(e) {
            console.warn("[Bobelle] Schoolings fetch error:", e);
        }
    }

    function updateSchoolingTiles(){
        if(_restzeitTimerId) clearTimeout(_restzeitTimerId);
        const now = Date.now();
        const active = schoolingsData.filter(s => !s.finishAt || s.finishAt > now);
        const count = active.length;

        ["Laufende Lehrgänge", "Aktive Lehrgänge"].forEach(key => {
            const cached = tileCache[key];
            if(!cached) return;
            const badge = cached.schoolingBadge;
            const sub = cached.schoolingSub;
            if(badge) badge.textContent = `${ICONS.school} ${count} aktiv`;
            if(sub){
                if(active.length === 0){
                    sub.textContent = "Keine Lehrgänge aktiv";
                } else {
                    const earliest = active.reduce((a,b) => (a.finishAt && b.finishAt) ? (a.finishAt < b.finishAt ? a : b) : (a.finishAt ? a : b));
                    const label = key === "Aktive Lehrgänge" ? "Nächster" : "Nächster Abschluss";
                    sub.textContent = `${label}: ${formatRestzeit(earliest.finishAt)}`;
                }
            }

            const namesEl = cached.schoolingNames;
            if(namesEl){
                namesEl.textContent = "";
                const groups = {};
                active.forEach(s => {
                    const g = groups[s.caption] || (groups[s.caption] = { caption: s.caption, n: 0, fin: null });
                    g.n++;
                    if(s.finishAt && (g.fin === null || s.finishAt < g.fin)) g.fin = s.finishAt;
                });
                const list = Object.values(groups).sort((a,b) => (a.fin || Infinity) - (b.fin || Infinity));
                const MAX_LINES = 3;
                list.slice(0, MAX_LINES).forEach(g => {
                    const line = document.createElement("div");
                    line.textContent = `• ${g.caption}${g.n > 1 ? " ×" + g.n : ""}${g.fin ? " · " + formatRestzeit(g.fin) : ""}`;
                    namesEl.appendChild(line);
                });
                if(list.length > MAX_LINES){
                    const more = document.createElement("div");
                    more.style.color = "#777";
                    more.textContent = `+ ${list.length - MAX_LINES} weitere`;
                    namesEl.appendChild(more);
                }
                cached.el.title = active.map(s => `${s.caption} – ${s.buildingName}${s.finishAt ? " – " + formatRestzeit(s.finishAt) : ""}`).join("\n");
            }
        });

        _restzeitTimerId = setTimeout(updateSchoolingTiles, 30000);
    }

    function createSchoolingTile(key){
        const meta = tileMetaByKey[key];
        const color = meta?.c || C_AUS;
        const div = document.createElement("div");
        div.className = "fzTile fzResource fzSchoolingTile";
        div.dataset.key = key;
        div.style.borderLeftColor = color;
        div.style.cursor = "pointer";

        const badge = document.createElement("span");
        badge.className = "fzSchoolingBadge";
        badge.style.cssText = `font-size:12px;font-weight:normal;color:#000;`;
        badge.textContent = `${ICONS.school} Lade...`;

        const sub = document.createElement("div");
        sub.className = "fzSchoolingSub";
        sub.style.cssText = "font-size:10px;color:#666;margin-top:2px;";
        sub.textContent = "Bitte warten...";

        const nameSpan = document.createElement("span");
        nameSpan.className = "fzTileName";
        nameSpan.style.cssText = `font-weight:normal;color:#000;`;
        nameSpan.textContent = key;

        const topRow = document.createElement("div");
        topRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:3px;";

        const iconSpan = document.createElement("span");
        iconSpan.style.fontSize = "16px";
        iconSpan.textContent = ICONS.school;

        topRow.appendChild(iconSpan);
        topRow.appendChild(nameSpan);

        const wrapper = document.createElement("div");
        wrapper.className = "fzContentWrapper";
        wrapper.style.cssText = "justify-content:flex-start;padding:4px 0;";
        wrapper.appendChild(topRow);
        wrapper.appendChild(badge);
        wrapper.appendChild(sub);

        const names = document.createElement("div");
        names.className = "fzSchoolingNames";
        names.style.cssText = "font-size:10px;color:#333;margin-top:3px;line-height:1.25;";
        wrapper.appendChild(names);

        div.appendChild(wrapper);
        div.onclick = () => showSchoolingDetails();

        tileEls[key] = div;
        tileCache[key] = { el: div, lastState: null, schoolingBadge: badge, schoolingSub: sub, schoolingNames: names };
        return div;
    }

    function showSchoolingDetails(){
        const now = Date.now();
        const active = schoolingsData.filter(s => !s.finishAt || s.finishAt > now);
        const done = schoolingsData.filter(s => s.finishAt && s.finishAt <= now);

        const renderRow = (s) => {
            const rest = s.finishAt ? formatRestzeit(s.finishAt) : "–";
            const isUrgent = s.finishAt && (s.finishAt - now) < 3600000;
            const isDone = s.finishAt && s.finishAt <= now;
            const restColor = isDone ? "#28a745" : (isUrgent ? "#dc3545" : "#28a745");
            let progressHtml = "";

            if(s.startAt && s.finishAt && !isDone){
                const total = s.finishAt - s.startAt;
                const elapsed = now - s.startAt;
                const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
                progressHtml = `<div style="margin-top:4px;height:4px;background:#e0e0e0;border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${C_AUS};border-radius:2px;"></div></div><div style="font-size:9px;color:#999;margin-top:1px;">${pct}% abgeschlossen</div>`;
            }

            const typBadge = s.description ? `<span style="font-size:9px;background:rgba(123,63,160,0.15);color:${C_AUS};padding:1px 5px;border-radius:3px;margin-left:5px;font-weight:bold;">${escapeHTML(s.description)}</span>` : "";
            const pCount = s.participantCount > 0 ? `<span style="font-size:10px;color:#888;margin-left:6px;">${ICONS.person} ${s.participantCount}</span>` : "";

            return `<div style="padding:8px 10px;border-radius:5px;margin-bottom:6px;background:rgba(123,63,160,0.07);border-left:3px solid ${C_AUS};"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;"><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:bold;">${escapeHTML(s.caption)}${typBadge}</div><div style="font-size:10px;color:#555;margin-top:2px;">📍 ${escapeHTML(s.buildingName)}${pCount}</div>${progressHtml}</div><div style="font-size:13px;font-weight:bold;color:${restColor};flex-shrink:0;">${rest}</div></div></div>`;
        };

        const ol = document.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = (e) => { if(e.target === ol) ol.remove(); };

        const updStr = lastSchoolingsUpdate ? new Date(lastSchoolingsUpdate).toLocaleTimeString("de-DE") : "–";
        const captionGroups = {};
        active.forEach(s => { if(!captionGroups[s.caption]) captionGroups[s.caption] = 0; captionGroups[s.caption]++; });

        ol.innerHTML = `<div class="fzModal" style="max-width:620px;width:92%;"><h3>${ICONS.school} Eigene Lehrgänge</h3><div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;"><div class="fzStatBox"><div class="fzStatVal" style="color:${C_AUS};">${active.length}</div><div class="fzStatLbl">Aktiv</div></div><div class="fzStatBox"><div class="fzStatVal" style="color:#6c757d;">${Object.keys(captionGroups).length}</div><div class="fzStatLbl">Verschiedene Typen</div></div><div class="fzStatBox"><div class="fzStatVal" style="color:#28a745;">${done.length}</div><div class="fzStatLbl">Heute fertig</div></div><div class="fzStatBox"><div class="fzStatVal" style="font-size:13px;color:#555;">${updStr}</div><div class="fzStatLbl">Letztes Update</div></div></div>${active.length > 0 ? `<div class="fzSectionTitle">Aktive Lehrgänge (${active.length})</div><div style="max-height:340px;overflow-y:auto;">${active.sort((a,b) => (a.finishAt || Infinity) - (b.finishAt || Infinity)).map(renderRow).join("")}</div>` : `<div style="padding:20px;text-align:center;color:#999;">Keine aktiven Lehrgänge.</div>`}${done.length > 0 ? `<div class="fzSectionTitle" style="margin-top:12px;">Heute abgeschlossen (${done.length})</div><div style="max-height:150px;overflow-y:auto;">${done.map(renderRow).join("")}</div>` : ""}<div style="margin-top:10px;display:flex;gap:8px;"><button class="fzBtn" style="flex:1;" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button><button class="fzBtn" style="flex:1;" onclick="window.open('/schoolings','_blank')">📋 Alle Lehrgänge</button><button class="fzBtn" style="background:#edf3ff;flex:0.5;" id="fzSchoolingRefreshBtn">🔄</button></div></div>`;

        setTimeout(() => {
            const rb = ol.querySelector("#fzSchoolingRefreshBtn");
            if(rb) rb.onclick = async () => {
                rb.textContent = "⏳";
                await fetchSchoolings();
                rb.textContent = "✅";
                setTimeout(() => { rb.textContent = "🔄"; }, 2000);
            };
        }, 50);

        getTargetBody().appendChild(ol);
    }

    // UI UPDATES & STATUS
    function updateSubHeaderInfo(){
        const sysEl = document.getElementById("fzSysStatus");
        const dispEl = document.getElementById("fzDispatcher");
        if(!sysEl || !dispEl) return;

        sysEl.textContent = sysReady ? "Leitstelle betriebsbereit" : "Leitstelle offline / inaktiv";
        sysEl.style.color = sysReady ? uiSettings.subStatusColorOk : uiSettings.subStatusColorErr;

        const rankEl = document.getElementById("current_level");
        dispEl.innerHTML = `Disposition: Bobelle <span style="margin-left:5px;">${escapeHTML(rankEl ? (rankEl.innerText || rankEl.textContent).trim() : "Unbekannt")}</span>`;
    }

    // Tageswechsel vor jeder Buchung und jedem API-Durchlauf pruefen.
    function checkVehicleDayReset(currentState){
        const today = getTodayString();
        if(GM_getValue(STORAGE.DAYSTAMP, "") === today) return false;
        if(saveTimeout){ clearTimeout(saveTimeout); saveTimeout = null; }
        // Storage ist nicht transaktional. Der erneute Stempelcheck minimiert
        // konkurrierende Tageswechsel mehrerer geoeffneter Tabs.
        if(GM_getValue(STORAGE.DAYSTAMP, "") === today) return false;
        const oldToday = store.load(STORAGE.COUNTS_TODAY);
        const hist = json.load(STORAGE.HISTORY_7DAYS, {});
        for(const k of KEYS){
            if(!Array.isArray(hist[k])) hist[k] = [];
            hist[k].unshift(Number(oldToday[k]) || 0);
            hist[k] = hist[k].slice(0,7);
        }
        json.save(STORAGE.HISTORY_7DAYS, hist);
        json.save(STORAGE.YDAY_COUNTS, oldToday);
        json.save(STORAGE.COUNTS_TODAY, {});
        json.save(STORAGE.DETAILS_TODAY, {});
        GM_setValue(STORAGE.DAYSTAMP, today);
        if(currentState){
            currentState.history = hist;
            currentState.today = store.load(STORAGE.COUNTS_TODAY);
            currentState.yday = store.load(STORAGE.YDAY_COUNTS);
            currentState.det = {};
        }
        heliAlreadyCountedThisSession.clear();
        ktpAlreadyCountedThisSession.clear();
        dispatchEventGuard.clear();
        return true;
    }

    function getWasserbedarfLiter(activeEl){
        if(!activeEl) return 0;
        const fullText = ((activeEl.textContent||"") + " " + (activeEl.title||"") + " " + (activeEl.getAttribute("search_attribute")||"") + " " + (activeEl.getAttribute("data-aao-text")||"")).replace(/\./g,"").toLowerCase();
        const matchLiter = fullText.match(/(\d{3,6})\s*(?:liter|ltr|li\b|l\b)/i);
        if(matchLiter){
            const val = parseInt(matchLiter[1],10);
            if(val >= 500) return val;
        }
        // Ohne explizite Literangabe keine geschaetzte Menge verbuchen.
        return 0;
    }

    function incrementTileCount(vehicleKey, activeEl){
        if(!vehicleKey) return;
        checkVehicleDayReset(state);
        let inc = ["Patienten", "Gefangene", "Krankentransporte", "Helikopter"].includes(vehicleKey) ? 1 : uiSettings.clickIncrement;
        if(vehicleKey === "Wasserbedarf"){
            inc = getWasserbedarfLiter(activeEl);
            if(inc === 0) return;
        }

        state.today[vehicleKey] = (state.today[vehicleKey] || 0) + inc;
        state.total[vehicleKey] = (state.total[vehicleKey] || 0) + inc;
        state.det[vehicleKey] = state.det[vehicleKey] || {};
        const detailName = (normalize(activeEl ? activeEl.textContent : vehicleKey) || vehicleKey).slice(0,60);
        state.det[vehicleKey][detailName] = (state.det[vehicleKey][detailName] || 0) + inc;
        store.save();

        if(isMainPage){
            requestAnimationFrame(() => {
                if(tileEls[vehicleKey]) updateTile(vehicleKey, state);
                updateCategoryHeaders();
                updateHeaderStats();
                if(fzWrapper) fzWrapper.classList.remove("fzHidden");
                resetCountdown();
            });
        }
    }

    function updateHeaderStats(){
        const statsEl = document.getElementById("fzMissionStats");
        if(statsEl) statsEl.innerHTML = getMissionStatsHTML();
    }

    let _cachedHeaderElements = {};
    let _headerCacheExpiry = 0;

    function updateCategoryHeaders(){
        const now = Date.now();
        // Refresh cache if needed (every 1 minute)
        if(now - _headerCacheExpiry > 60000) {
            _cachedHeaderElements = {};
            _headerCacheExpiry = now;
        }

        const pV = state.today["Patienten"] || 0;
        let kV = 0;
        ["KTW","KTW Typ B","ITW","RTH [Christoph 13 (Bielefeld)]","RTH mit Winde","NAW"].forEach(k => { kV += (state.today[k] || 0); });

        _setEl("fzBadge_RD_Pat", `${ICONS.patient} ${pV}`);
        _setEl("fzBadge_RD_KTW", `${ICONS.ktp} ${kV}`);

        const beds = cachedCapacities.beds || 0, bedsUsed = cachedCapacities.bedsUsed || 0;
        const rdB = _cachedHeaderElements.bed || document.getElementById("fzBadge_RD_Betten");
        if(rdB){
            _cachedHeaderElements.bed = rdB;
            const bFree = Math.max(0, beds - bedsUsed);
            const newHTML = `🏥 ${bFree}/${beds}`;
            if(rdB.innerHTML !== newHTML) {
                rdB.innerHTML = newHTML;
                rdB.style.background = bFree < 3 ? "rgba(220,53,69,0.5)" : "rgba(40,167,69,0.3)";
            }
        }

        const gef = state.today["Gefangene"] || 0;
        _setEl("fzBadge_POL_Gef", `${ICONS.prisoner} ${gef}`);

        const cells = cachedCapacities.cells || 0;
        const polZ = _cachedHeaderElements.cells || document.getElementById("fzBadge_POL_Zellen");
        if(polZ){
            _cachedHeaderElements.cells = polZ;
            const cFree = Math.max(0, cells - gef);
            const newHTML = `🔒 ${cFree}/${cells}`;
            if(polZ.innerHTML !== newHTML) {
                polZ.innerHTML = newHTML;
                polZ.style.background = cFree < 2 ? "rgba(220,53,69,0.5)" : "rgba(40,167,69,0.3)";
            }
        }

        const wasser = state.today["Wasserbedarf"] || 0;
        _setEl("fzBadge_FW_Was", `${ICONS.water} ${wasser.toLocaleString('de-DE')} L`);

        const betr = state.today["Betreuung/Versorgung"] || 0;
        _setEl("fzBadge_Vers_Bet", `${ICONS.supply} ${betr}`);

        const heli = state.today["Helikopter"] || 0;
        _setEl("fzBadge_Luft_Heli", `${ICONS.heli} ${heli}`);

        const schCount = schoolingsData.filter(s => !s.finishAt || s.finishAt > Date.now()).length;
        _setEl("fzBadge_Aus_Count", `${ICONS.school} ${schCount}`);

        CATEGORY_ORDER.forEach(cat => {
            const el = _cachedHeaderElements[cat + "_util"] || document.getElementById("fzBadge_Util_" + cat);
            if(!el) return;
            _cachedHeaderElements[cat + "_util"] = el;

            const catKeys = CAT_VEHICLE_MAP[cat] || [];
            let total = 0, busy = 0;
            catKeys.forEach(t => {
                total += (vehicleTotalCount[t.n] || 0);
                busy += (vehicleInUseCount[t.n] || 0);
            });

            if(total === 0){ el.style.display = "none"; return; }
            const pct = Math.round((busy / total) * 100);
            el.style.display = "inline-flex";
            el.innerHTML = `${pct}%`;
            el.style.background = pct >= 80 ? "rgba(220,53,69,0.6)" : pct >= 50 ? "rgba(255,193,7,0.5)" : "rgba(40,167,69,0.35)";
        });

        CATEGORY_ORDER.forEach(cat => {
            const el = _cachedHeaderElements[cat + "_alarm"] || document.getElementById("fzBadge_LastAlarm_" + cat);
            if(!el) return;
            _cachedHeaderElements[cat + "_alarm"] = el;

            const catKeys = (CAT_TILE_MAP[cat] || []).map(t => t.n);
            let latestTime = null, latestKey = null;
            catKeys.forEach(k => {
                if(lastAlarmTime[k]){
                    if(!latestTime || lastAlarmTime[k] > latestTime){
                        latestTime = lastAlarmTime[k];
                        latestKey = k;
                    }
                }
            });

            if(latestTime){
                el.style.display = "inline-flex";
                el.innerHTML = `🚨 ${latestTime}`;
                el.title = latestKey || "";
            } else el.style.display = "none";
        });
    }

    function getTargetBody(){ return (extWin && !extWin.closed) ? extWin.document.body : document.body; }
    function getTargetDoc(){ return (extWin && !extWin.closed) ? extWin.document : document; }

    function getAvailabilitySummary(){
        const EXCLUDE_FROM_AVAIL = new Set([
            "Patienten","Krankenhausbetten","Gefangene","Gefängniszellen",
            "Wasserbedarf","Betreuung/Versorgung","Krankentransporte","Helikopter",
            "Meine DJI Mini 4k (Pilot Bobelle)",
            "Laufende Lehrgänge","Aktive Lehrgänge"
        ]);

        const relevantKeys = KEYS.filter(k => !EXCLUDE_FROM_AVAIL.has(k));
        const notAvailButExist = relevantKeys.filter(k => vehicleExists[k] === true && vehicleAvailability[k] !== true);
        const notExist = relevantKeys.filter(k => vehicleExists[k] !== true);
        const green = relevantKeys.filter(k => vehicleAvailability[k] === true).length;

        return { total: relevantKeys.length, green, orange: notAvailButExist.length, red: notExist.length, notAvailButExist, notExist };
    }

    function triggerAlarm(key){
        const cached = tileCache[key];
        if(!cached || !cached.funkalarmLabel) return;
        if(alarmTimers[key]){
            clearTimeout(alarmTimers[key]);
            delete alarmTimers[key];
        }
        cached.funkalarmLabel.classList.add("fzAlarming");
        lastAlarmTime[key] = new Date().toLocaleTimeString("de-DE");
        const durationMs = Math.max(10, (uiSettings.funkalarmBlinkDuration || 120)) * 1000;
        alarmTimers[key] = setTimeout(() => {
            if(cached.funkalarmLabel) cached.funkalarmLabel.classList.remove("fzAlarming");
            delete alarmTimers[key];
        }, durationMs);
    }

    // HAUPT-API-SCHLEIFE (FAHRZEUGE & CREDITS)
    let creditsPending = null;
    async function fetchCreditsDaily(){
        if(creditsPending) return creditsPending;
        creditsPending = fetchCreditsDailyImpl().finally(() => { creditsPending = null; });
        return creditsPending;
    }
    async function fetchCreditsDailyImpl() {
        try {
            const res = await fetch('/credits/daily');
            if(!res.ok) throw new Error('Credits HTTP ' + res.status);
            const html = await res.text();
            if (!html.includes('login-form')) {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const rows = doc.querySelectorAll('table tbody tr');
                let ein = 0, aus = 0;
                rows.forEach(row => {
                    const cell = row.querySelector('td[data-sort-value],td[sortvalue]') || row.querySelectorAll('td')[2];
                    if (!cell) return;
                    const raw = (cell.getAttribute('data-sort-value') || cell.textContent || '').replace(/\./g, '').replace(/[^\d-]/g, '');
                    const val = parseInt(raw, 10);
                    if (!isNaN(val)) {
                        if (val > 0) ein += val;
                        else aus += val;
                    }
                });
                creditsData = { ein, aus, bilanz: ein + aus, date: getTodayString() };
                json.save(STORAGE.CREDITS_DATA, creditsData);
                lastCreditsUpdate = Date.now();
                updateCreditsUI();
            }
        } catch (e) {
            console.warn("[Bobelle] Credits fetch failed:", e);
        }
    }

    let _renderTimer = null;
    function requestRender(delay){
        if(_renderTimer) return;
        _renderTimer = setTimeout(() => {
            _renderTimer = null;
            if(lastVehiclesRaw) processVehicles(lastVehiclesRaw, false);
        }, delay == null ? 100 : delay);
    }

    // Statuswechsel direkt aus der Funk-Nachricht des Spiels (ohne auf die API zu warten)
    function handleLiveRadio(msg){
        if(!msg || !isMainPage) return;
        const id = msg.id ?? msg.vehicle_id;
        const f = msg.fms_real ?? msg.fms;
        if(id != null && validFms(f) !== null && vehicleIdSet.has(Number(id))){
            liveFms[Number(id)] = { fms: validFms(f), ts: Date.now() };
            requestRender(100);
        } else if(id != null && f != null){
            requestUpdate(250); // neues/unbekanntes Fahrzeug -> API
        }
    }

    function hookRadio(){
        if(typeof window.radioMessage !== 'function') return false;
        if(window.radioMessage.__fzWrapped) return true;
        const orig = window.radioMessage;
        const wrapped = function(msg){
            const res = orig.apply(this, arguments);
            try { handleLiveRadio(msg); } catch(e){}
            return res;
        };
        wrapped.__fzWrapped = true;
        window.radioMessage = wrapped;
        return true;
    }

    let _reqTimer = null, _updatePending = false;
    function requestUpdate(delay){
        if(_reqTimer) clearTimeout(_reqTimer);
        _reqTimer = setTimeout(() => {
            _reqTimer = null;
            if(isUpdating) _updatePending = true;
            else updateAvailability();
        }, delay == null ? 250 : delay);
    }

    let lastVehiclesRaw = null, vehicleIdSet = new Set();
    const liveFms = {};

    // Fuenf Sekunden nach jedem erfolgreichen Fahrzeugdaten-Abruf gruen blinken.
    let tileBlinkTimeout = null;
    let tileBlinkUntil = 0;
    function setTileUpdateBlink(active){
        if(tileBlinkTimeout){ clearTimeout(tileBlinkTimeout); tileBlinkTimeout = null; }
        tileBlinkUntil = active ? Date.now() + 5000 : 0;
        for(const cached of Object.values(tileCache)){
            if(cached && cached.updatedAt){
                cached.updatedAt.classList.toggle("fzTileUpdating", active);
            }
        }
        if(active){
            tileBlinkTimeout = setTimeout(() => {
                tileBlinkTimeout = null;
                tileBlinkUntil = 0;
                for(const cached of Object.values(tileCache)){
                    if(cached && cached.updatedAt) cached.updatedAt.classList.remove("fzTileUpdating");
                }
            }, 5000);
        }
    }

    async function updateAvailability(){
        if(isUpdating) return;
        if(!isMainPage) return;
        isUpdating = true;
        updateSubHeaderInfo();

        const now = Date.now();
        const todayStr = getTodayString();

        if(creditsData.date !== todayStr || (now - lastCreditsUpdate > 30000)){
            fetchCreditsDaily(); // nicht abwarten, sonst verzögert die Credits-Seite jedes Update
        }


        let vehicles = [];
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);
            try {
                const response = await fetch("/api/vehicles", {credentials:"same-origin", signal:controller.signal, cache:"no-store"});
                if(!response.ok) throw new Error("API Offline: " + response.status);
                vehicles = await response.json();
            } finally {
                clearTimeout(timeout);
            }
            if(!Array.isArray(vehicles)) throw new Error("Invalid API Data");
            sysReady = true;
        } catch(e) {
            sysReady = false;
            isUpdating = false;
            updateSubHeaderInfo();
            if(_updatePending){ _updatePending = false; requestUpdate(150); }
            return;
        }

        lastSuccessfulVehicleFetch = new Date();
        formattedVehicleUpdateTime = "Stand: " + lastSuccessfulVehicleFetch.toLocaleTimeString("de-DE");
        setTileUpdateBlink(true);
        lastVehiclesRaw = vehicles;
        vehicleIdSet = new Set(vehicles.map(v => v.id));
        processVehicles(vehicles, true);
    }

    function processVehicles(vehicles, fromApi){
        checkVehicleDayReset(state);
        for(const k of KEYS){
            vehicleAvailability[k] = false;
            vehicleExists[k] = false;
            vehicleInUseCount[k] = 0;
            vehicleTotalCount[k] = 0;
            vehicleFreeCount[k] = 0;
        }

        hasFreeCountData = false;
        vehicleLists = {};
        vehicleMatchDiagnostics = {total:0, matched:0, ambiguous:[], unknown:[], manual:0};

        let catStats = {};
        for(const c of CATEGORY_ORDER) catStats[c] = {free:0, busy:0, s6:0, total:0};

        const setExist = (k) => { if(tileMetaByKey[k]) vehicleExists[k] = true; };
        const setAvail = (k) => { if(tileMetaByKey[k]) vehicleAvailability[k] = true; };
        const addTotal = (k) => { if(tileMetaByKey[k]) vehicleTotalCount[k] = (vehicleTotalCount[k] || 0) + 1; };
        const addInUse = (k) => { if(tileMetaByKey[k]) vehicleInUseCount[k] = (vehicleInUseCount[k] || 0) + 1; };

        const isInitialLoad = !vehicleStateCache._initialized;

        for(const v of vehicles){
            const rawTypeId = v.vehicle_type_id ?? v.vehicle_type ?? null;
            const typeId = rawTypeId === null || rawTypeId === "" ? null : Number(rawTypeId);
            // Die API kann Fahrzeugtypen als Zahl oder numerischen String liefern.
            let fms = validFms(v.fms_real ?? v.fms);
            const fmsText = (v.fms_text || "").toLowerCase();

            if(fms === null){
                if(fmsText.includes("frei auf wache")||fmsText.includes("at the station")) fms=2;
                else if(fmsText.includes("frei auf funk")) fms=1;
                else if(fmsText.includes("anfahrt")) fms=3;
                else if(fmsText.includes("einsatzstelle")) fms=4;
                else if(fmsText.includes("sprechwunsch")) fms=5;
                else if(fmsText.includes("nicht einsatzbereit")) fms=6;
                else if(fmsText.includes("patient")) fms=7;
                else if(fmsText.includes("transportziel")) fms=8;
                else fms=null; // unbekannt: nicht als frei behandeln
            }

    const lv = liveFms[v.id];
            if(lv){
                if(lv.fms === fms || Date.now() - lv.ts > 60000) delete liveFms[v.id];
                else fms = lv.fms; // Live-Status vom Spiel hat Vorrang, solange die API veraltet ist
            }

            const isInUse = (fms===3||fms===4||fms===7||fms===8);
            const isAvail = (fms===1||fms===2);
            const resolution = resolveVehicleTile(v, typeId);
            const matchedKeys = new Set(resolution.key ? [resolution.key] : []);
            vehicleMatchDiagnostics.total++;
            if(resolution.key){
                vehicleMatchDiagnostics.matched++;
                if(resolution.source === "manual") vehicleMatchDiagnostics.manual++;
            } else {
                const entry = {
                    id:v.id, caption:String(v.caption || "Unbenannt"),
                    typeId:typeId, typeName:String(v.vehicle_type_caption || v.vehicle_type_name || ""),
                    candidates:resolution.candidates || []
                };
                vehicleMatchDiagnostics[resolution.source === "ambiguous" ? "ambiguous" : "unknown"].push(entry);
            }

            const oldFms = vehicleStateCache[v.id];
            if(!isInitialLoad && (oldFms === 1 || oldFms === 2) && (fms === 3 || fms === 4) && registerDispatchEvent(v.id, "dispatch")){
                matchedKeys.forEach(k => {
                    if(k === "Wasserbedarf"){
                        const fakEl = { textContent: v.caption || "", title: "", getAttribute: () => "" };
                        const liter = getWasserbedarfLiter(fakEl);
                        if(liter > 0){
                            state.today["Wasserbedarf"] = (state.today["Wasserbedarf"] || 0) + liter;
                            state.total["Wasserbedarf"] = (state.total["Wasserbedarf"] || 0) + liter;
                            state.det["Wasserbedarf"] = state.det["Wasserbedarf"] || {};
                            const dKey = (normalize(v.caption || "wasserbedarf") || "wasserbedarf").slice(0,60);
                            state.det["Wasserbedarf"][dKey] = (state.det["Wasserbedarf"][dKey] || 0) + liter;
                            store.save();
                        }
                        triggerAlarm(k);
                        return;
                    }
                    incrementTileCount(k, null);
                    triggerAlarm(k);

                });

                // Helikopter-Zähler (Luft-Badge): einmal pro Ausrücken eines Hubschraubers
                const isHeli = [...matchedKeys].some(k => {
                    const m = tileMetaByKey[k];
                    return m && (m.cat === "Luft" || m.cat === "SeenotRett") && /rth|hubschrauber/i.test(k);
                });
                if(isHeli && registerDispatchEvent(v.id, "heli")) incrementTileCount("Helikopter", null);
                // Krankentransporte nur bei bestaetigter Transportaktion zaehlen,
                // nicht bereits beim Ausruecken eines KTW/NAW/ITW.
            }

            vehicleStateCache[v.id] = fms;

            for(const k of matchedKeys){
                setExist(k);
                addTotal(k);
                if(isInUse) addInUse(k);
                if(isAvail) setAvail(k);
                if(isAvail) vehicleFreeCount[k] = (vehicleFreeCount[k] || 0) + 1;
                if(isAvail) hasFreeCountData = true;

                const meta = tileMetaByKey[k];
                if(meta && meta.cat && catStats[meta.cat]){
                    catStats[meta.cat].total++;
                    if(fms === 6) catStats[meta.cat].s6++;
                    else if(isInUse) catStats[meta.cat].busy++;
                    else if(isAvail) catStats[meta.cat].free++;
                }

                if(!vehicleLists[k]) vehicleLists[k] = [];
                vehicleLists[k].push({
                    name: v.caption || "Unbenannt",
                    fms,
                    id: v.id,
                    missionId: (v.target_type === 'Mission') ? v.target_id : null,
                    crew: v.assigned_personnel_count || 0
                });
            }
        }

        vehicleStateCache._initialized = true;

        Object.keys(BUILDING_ID_TILE_MAP).forEach(bid => {
            const keys = BUILDING_ID_TILE_MAP[bid] || [];
            keys.forEach(k => {
                vehicleExists[k] = true;
                vehicleAvailability[k] = true;
                if(!vehicleTotalCount[k]) vehicleTotalCount[k] = 1;
                if(!vehicleFreeCount[k]) vehicleFreeCount[k] = 1;
            });
        });

        vehicleExists["Betreuung/Versorgung"] = true;
        vehicleExists["Helikopter"] = true;

        syncDerivedResourceCounts();

        ["Wasserbedarf","Krankentransporte","Laufende Lehrgänge","Aktive Lehrgänge","Meine DJI Mini 4k (Pilot Bobelle)"].forEach(k => {
            vehicleExists[k] = true;
            vehicleAvailability[k] = true;
            if(!vehicleTotalCount[k]) vehicleTotalCount[k] = 0;
        });

        ["Helikopter","Betreuung/Versorgung"].forEach(k => {
            vehicleExists[k] = true;
            if((vehicleFreeCount[k] || 0) > 0) vehicleAvailability[k] = true;
            else if(vehicleTotalCount[k] > 0) vehicleAvailability[k] = false;
            else vehicleAvailability[k] = true;
            if(!vehicleTotalCount[k]) vehicleTotalCount[k] = 0;
        });

        // Single RAF for all DOM updates
        const doc = getTargetDoc();
        requestAnimationFrame(() => {
            const pillsContainer = doc.getElementById("fzResourcePills");
            if(pillsContainer){
                const pat = state.today["Patienten"] || 0;
                let ktwCount = 0;
                ["KTW","KTW Typ B","ITW","RTH [Christoph 13 (Bielefeld)]","RTH mit Winde","NAW"].forEach(k => { ktwCount += (state.today[k] || 0); });

                const valColor = uiSettings.creditsValueColor;
                const einStr = creditsData.ein.toLocaleString('de-DE');
                const ausStr = creditsData.aus.toLocaleString('de-DE');
                const bilStr = creditsData.bilanz.toLocaleString('de-DE');
                const realBilColor = creditsData.bilanz >= 0 ? valColor : "#dc3545";
                const creditsContent = (!creditsData.date && creditsData.ein === 0)
                ? "Lade..."
                : `Ein: <span style="color:${valColor};margin:0 3px;">${einStr}</span> | Aus: <span style="color:${valColor};margin:0 3px;">${ausStr}</span> | Σ: <span style="color:${realBilColor};margin-left:3px;">${bilStr}</span>`;

                pillsContainer.innerHTML =
                    `<div class="fzResPill fzHeaderPill" title="Patienten" onclick="document.querySelector('.fzTile[data-key=\\'Patienten\\']')?.click()">${ICONS.patient} ${pat} / ${cachedCapacities.beds || 0}</div>` +
                    `<div class="fzResPill fzHeaderPill" title="KTW Transporte" style="cursor:default;">${ICONS.ktp} ${ktwCount}</div>` +
                    `<div class="fzResPill fzHeaderPill" id="fzCreditsPill" title="Credits" onclick="window.open('/credits/daily','_blank')" style="margin-left:${uiSettings.creditsGap}px;background:transparent;border:1px solid rgba(0,0,0,0.1);font-size:${uiSettings.creditsFontSize}px;color:${uiSettings.creditsLabelColor};">${creditsContent}</div>`;
            }

            if(uiRoot && !uiRoot.hasChildNodes()) redrawGrid();

            for(const cat in catStats){
                const data = catStats[cat];
                const txtEl = doc.getElementById("fzCatTxt_" + cat);
                if(txtEl){
                    const utilPct = data.total > 0 ? Math.round((data.busy / data.total) * 100) : 0;
                    txtEl.textContent = `Frei: ${data.free} / Ges: ${data.total} (${utilPct}%)`;
                    txtEl.style.color = uiSettings.catStatusTextColor;
                    txtEl.style.fontSize = "9px";
                }

                const barEl = doc.getElementById("fzCatUtil_" + cat);
                if(barEl && data.total > 0){
                    const pFree = (data.free / data.total) * 100;
                    const pBusy = (data.busy / data.total) * 100;
                    const pS6 = (data.s6 / data.total) * 100;
                    const freeDiv = barEl.querySelector(".fzBarFree");
                    const busyDiv = barEl.querySelector(".fzBarBusy");
                    const s6Div = barEl.querySelector(".fzBarS6");
                    if(freeDiv) freeDiv.style.width = pFree + "%";
                    if(busyDiv) busyDiv.style.width = pBusy + "%";
                    if(s6Div) s6Div.style.width = pS6 + "%";
                }
            }

            for(const k of KEYS) updateTile(k, state);
            updateCategoryHeaders();
            renderAvailabilityIndicator();
            updateHeaderStats();
            if(fromApi && lastSuccessfulVehicleFetch) lastUpdateStr = lastSuccessfulVehicleFetch.toLocaleTimeString("de-DE");
            updateSubHeaderInfo();
            if(fromApi){
                isUpdating = false;
                if(_updatePending){ _updatePending = false; requestUpdate(150); }
            }
        });
    }

    function syncDerivedResourceCounts(){
        state.today["Krankenhausbetten"] = cachedCapacities.bedsUsed || 0;
        vehicleExists["Krankenhausbetten"] = true;
        vehicleAvailability["Krankenhausbetten"] = (cachedCapacities.beds || 0) > 0;
        vehicleTotalCount["Krankenhausbetten"] = cachedCapacities.beds || 0;
        vehicleInUseCount["Krankenhausbetten"] = cachedCapacities.bedsUsed || 0;
        vehicleFreeCount["Krankenhausbetten"] = Math.max(0, (cachedCapacities.beds || 0) - (cachedCapacities.bedsUsed || 0));

        vehicleExists["Patienten"] = true;
        vehicleAvailability["Patienten"] = (cachedCapacities.beds || 0) > 0;
        vehicleTotalCount["Patienten"] = cachedCapacities.beds || 0;
        vehicleInUseCount["Patienten"] = cachedCapacities.bedsUsed || 0;
        vehicleFreeCount["Patienten"] = Math.max(0, (cachedCapacities.beds || 0) - (cachedCapacities.bedsUsed || 0));
        // Patienten ist eine Tagesereignisstatistik, keine aktuelle Belegung.

        const prisonerValue = Number(cachedCapacities.cellsUsed || 0);
        state.today["Gefängniszellen"] = prisonerValue;

        vehicleExists["Gefangene"] = true;
        vehicleAvailability["Gefangene"] = (cachedCapacities.cells || 0) > 0;
        vehicleTotalCount["Gefangene"] = cachedCapacities.cells || 0;
        vehicleInUseCount["Gefangene"] = prisonerValue;
        vehicleFreeCount["Gefangene"] = Math.max(0, (cachedCapacities.cells || 0) - prisonerValue);

        vehicleExists["Gefängniszellen"] = true;
        vehicleAvailability["Gefängniszellen"] = (cachedCapacities.cells || 0) > 0;
        vehicleTotalCount["Gefängniszellen"] = cachedCapacities.cells || 0;
        vehicleInUseCount["Gefängniszellen"] = prisonerValue;
        vehicleFreeCount["Gefängniszellen"] = Math.max(0, (cachedCapacities.cells || 0) - prisonerValue);

        store.save();
    }

    let capacityPending = null;
    async function updateBuildingCapacities(force=false){
        if(capacityPending) return capacityPending;
        capacityPending = updateBuildingCapacitiesImpl(force).finally(() => { capacityPending = null; });
        return capacityPending;
    }
    async function updateBuildingCapacitiesImpl(force=false){
        const now = Date.now();
        if(!force && now - lastBuildingUpdate < 300000) return;

        try{
            const response = await fetch("/api/buildings", { credentials: "same-origin" });
            if(!response.ok) return;
            const buildings = await response.json();
            if(!Array.isArray(buildings)) throw new Error("Ungueltige Gebaeude-API-Antwort");

            let beds = 0, bedsUsed = 0, cells = 0, cellsUsed = 0;

            buildings.forEach(b => {
                if(b.enabled === false) return;

                const type = Number(b.building_type_id ?? b.building_type ?? -1);
                const lvl = Number(b.level ?? 0);

                buildingNameCache[b.id] = b.caption || ("Wache #" + b.id);

                if(type === 4 || String(b.caption || "").toLowerCase().includes("krankenhaus")){
                    const bedTotal = Number(b.patient_extension_capacity ?? b.bed_count ?? b.hospital_beds ?? 0) || 0;
                    const bedUsedVal = Number(b.patient_count ?? b.patients_count ?? b.current_patients ?? 0) || 0;
                    beds += bedTotal;
                    bedsUsed += bedUsedVal;
                }

                if(type === 6 || type === 12 || String(b.caption || "").toLowerCase().includes("gefängnis") || String(b.caption || "").toLowerCase().includes("polizei")){
                    const cellTotal = Number(b.prisoner_capacity ?? b.jail_cells ?? b.cell_count ?? 0) || 0;
                    const usedVal = Number(b.prisoner_count ?? b.prisoners_count ?? b.current_prisoners ?? 0) || 0;
                    cells += cellTotal;
                    cellsUsed += usedVal;
                }
            });

            cachedCapacities = { beds, bedsUsed, cells, cellsUsed };
            lastBuildingUpdate = now;
            _buildingsFullyLoaded = true;
        }catch(e){
            console.error("Fehler beim Laden der Gebäude:", e);
        }
    }

    function updateCreditsUI(){
        const pill = document.getElementById("fzCreditsPill");
        if(!pill) return;
        const valColor = uiSettings.creditsValueColor;
        const einStr = creditsData.ein.toLocaleString('de-DE');
        const ausStr = creditsData.aus.toLocaleString('de-DE');
        const bilStr = creditsData.bilanz.toLocaleString('de-DE');
        const realBilColor = creditsData.bilanz >= 0 ? valColor : "#dc3545";
        pill.innerHTML = `Ein: <span style="color:${valColor};margin:0 3px;">${einStr}</span> | Aus: <span style="color:${valColor};margin:0 3px;">${ausStr}</span> | Σ: <span style="color:${realBilColor};margin-left:3px;">${bilStr}</span>`;
        pill.style.marginLeft = uiSettings.creditsGap + "px";
        pill.style.fontSize = uiSettings.creditsFontSize + "px";
        pill.style.color = uiSettings.creditsLabelColor;
    }

    // Zeitgesteuerte Datenabfragen und Styles
    function startApiLoop(){
        if(apiTimer) clearInterval(apiTimer);
        const interval = Math.max(60, uiSettings.apiInterval || 120) * 1000;
        apiTimer = setInterval(updateAvailability, interval);
    }

    function startSchoolingLoop(){
        if(schoolingTimer) clearInterval(schoolingTimer);
        const interval = Math.max(60, uiSettings.schoolingApiInterval || 120) * 1000;
        schoolingTimer = setInterval(fetchSchoolings, interval);
    }

    function prepareCSSString(){
        return `
            :root{
                --fz-bg:${uiSettings.winBg};--fz-bc:${uiSettings.winBorderC};--fz-bw:${uiSettings.winBorderW}px;--fz-br:${uiSettings.winRadius}px;
                --fz-cat-s:${uiSettings.catHeaderSize}px;--fz-cat-c:${uiSettings.catHeaderTextColor};--fz-cat-pad:${uiSettings.catHeaderPadding}px;
                --fz-tile-h:${Math.max(35,Number(uiSettings.tileMinHeight)||65)}px;--fz-tile-gap:${uiSettings.tileGap}px;--fz-tile-px:${Math.max(0,Math.min(40,Number(uiSettings.tilePaddingX ?? 4)))}px;--fz-tile-py:${Math.max(0,Math.min(25,Number(uiSettings.tilePaddingY ?? 2)))}px;--fz-tile-bw:${Math.max(0,Math.min(10,Number(uiSettings.tileBorderWidth ?? 1)))}px;--fz-tile-bg:${uiSettings.tileBgColor};--fz-tile-text:${uiSettings.tileTextColor};
                --fz-name-fs:${uiSettings.tileNameSize}px;--fz-name-fw:${uiSettings.tileNameWeight};--fz-count-fs:${uiSettings.tileCounterSize}px;--fz-badge-fs:${uiSettings.badgeSize}px;
                --fz-nt-c:${uiSettings.numTodayColor};--fz-ny-c:${uiSettings.numYdayColor};--fz-res-c:${uiSettings.resCounterColor};--fz-res-s:${uiSettings.resCounterSize}px;
                --fz-id-sz:${uiSettings.tileIdSize}px;--fz-id-c:${uiSettings.tileIdColor};--fz-id-a:left;
                --fz-head-sz:${uiSettings.headerElementSize}px;--fz-pill-bg:${uiSettings.pillBgColor};--fz-pill-c:${uiSettings.pillTextColor};
                --fz-sub-st-sz:${uiSettings.subStatusSize}px;--fz-sub-st-fw:${uiSettings.subStatusWeight};--fz-sub-up-sz:${uiSettings.subUpdateSize}px;--fz-sub-up-fw:${uiSettings.subUpdateWeight};
                --fz-sub-up-c:${uiSettings.subUpdateColor};--fz-sub-dp-sz:${uiSettings.subDispSize}px;--fz-sub-dp-fw:${uiSettings.subDispWeight};--fz-sub-dp-c:${uiSettings.subDispColor};
                --fz-cat-stat-c:${uiSettings.catStatusTextColor};--fz-res-bg:${uiSettings.resourceTileBgColor};--fz-bar-c:${uiSettings.barColor};
                --fz-funk-sz:${uiSettings.funkalarmSize}px;--fz-funk-c:${uiSettings.funkalarmColor};--fz-funk-fw:${uiSettings.funkalarmBold?'bold':'normal'};
                --fz-funk-blink-c:${uiSettings.funkalarmBlinkColor};--fz-aus:${C_AUS};
            }
            .fzWrapper{position:fixed;z-index:${CFG.zIndex};top:${uiSettings.winTop}px;left:5px;right:5px;width:auto;display:flex;flex-direction:column;background:var(--fz-bg);border:var(--fz-bw) solid var(--fz-bc);border-radius:0 0 var(--fz-br) var(--fz-br);box-shadow:0 10px 30px rgba(0,0,0,0.5);transition:opacity 0.4s ease-out,transform 0.4s ease-out;}
            .fzWrapper.fzFullscreen{top:0!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:100%!important;border-radius:0;max-height:100vh;transform:none;}
            body.fzExternal .fzWrapper{position:absolute;top:0;left:0;right:0;bottom:0;border:none;border-radius:0;transform:none;opacity:1;pointer-events:auto;}
            .fzWrapper.fzHidden{opacity:0;transform:translateY(-50px);pointer-events:none;}
            .fzHeader{background:${uiSettings.headBg};color:${uiSettings.headColor};padding:4px 5px;display:flex;justify-content:space-between;align-items:center;user-select:none;font-family:sans-serif;min-height:35px;}
            .fzHeaderLeft{display:flex;align-items:center;gap:5px;flex-wrap:nowrap;}.fzHeaderRight{display:flex;align-items:center;gap:5px;}
            .fzSubInfoRow{display:flex;align-items:baseline;gap:12px;margin-top:3px;line-height:1;white-space:nowrap;min-height:0;}
            .fzSubInfoRow>span{display:inline-flex;align-items:baseline;line-height:1;min-width:0;}
            .fzSubInfoRow>span+span{border-left:1px solid #777;padding-left:12px;}
            #fzSysStatus{font-size:var(--fz-sub-st-sz);font-weight:var(--fz-sub-st-fw);}
            #fzDispatcher{font-size:var(--fz-sub-dp-sz);font-weight:var(--fz-sub-dp-fw);color:var(--fz-sub-dp-c);}
            .fzHeaderPill,.fzResPill,#fzAvailIndicator,.fzTrafficLight{font-size:var(--fz-head-sz);font-weight:bold;background:var(--fz-pill-bg);color:var(--fz-pill-c);padding:2px 6px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);display:flex;align-items:center;gap:4px;cursor:default;white-space:nowrap;height:20px;box-sizing:border-box;}
            .fzResPill{cursor:pointer;transition:transform 0.1s;}.fzResPill:hover{transform:scale(1.05);filter:brightness(0.95);}#fzAvailIndicator{cursor:pointer;}
            .fzTrafficLight{padding:0 5px;gap:4px;}.fzLight{width:8px;height:8px;border-radius:50%;opacity:0.2;transition:opacity 0.3s;background-color:#555;}
            .fzLight.red{background-color:#dc3545;}.fzLight.yellow{background-color:#ffc107;}.fzLight.green{background-color:#28a745;}.fzLight.active{opacity:1;box-shadow:0 0 5px currentColor;}
            .fzCatUtilBar{height:4px;background:rgba(255,255,255,0.2);width:120px;margin-top:3px;border-radius:2px;overflow:hidden;display:none;}
            .fzBarFree{height:100%;background:#28a745;transition:width 0.5s;}.fzBarBusy{height:100%;background:#dc3545;transition:width 0.5s;}.fzBarS6{height:100%;background:#999;transition:width 0.5s;}
            .fzCatStatText{margin-right:10px;white-space:nowrap;font-size:9px;margin-top:1px;font-weight:normal;color:var(--fz-cat-stat-c);}
            .fzFocusBtn{margin-right:8px;cursor:pointer;opacity:0.8;font-size:14px;margin-left:5px;}.fzFocusBtn:hover{opacity:1;transform:scale(1.1);}
            .fzCatBadge{background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:4px;font-size:11px;margin-right:6px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;border:1px solid rgba(255,255,255,0.3);font-weight:normal;}.fzCatBadge:hover{background:rgba(255,255,255,0.4);}
            .fzScrollArea{max-height:${uiSettings.winMaxHeight}px;overflow-y:auto;background:#fff;position:relative;flex:1;}.fzWrapper.fzFullscreen .fzScrollArea{max-height:100vh;flex:1;}body.fzExternal .fzScrollArea{max-height:100vh;flex:1;}
            .fzGrid{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(12,Number(uiSettings.columns)||4))},${Number(uiSettings.tileColumnWidth)>0 ? `${Math.max(100,Math.min(800,Number(uiSettings.tileColumnWidth)))}px` : "minmax(0,1fr)"});gap:0;overflow-x:auto;background:#ccc;border-top:1px solid #ccc;border-left:1px solid #ccc;}
            .fzTile{position:relative;display:flex;align-items:stretch;padding:var(--fz-tile-py) var(--fz-tile-px);height:var(--fz-tile-h);background-color:var(--fz-tile-bg);color:var(--fz-tile-text);border-left:5px solid transparent;border-right:var(--fz-tile-bw) solid #ccc;border-bottom:var(--fz-tile-bw) solid #ccc;gap:var(--fz-tile-gap);font-family:sans-serif;cursor:pointer;user-select:none;box-sizing:border-box;transition:height 0.18s ease;}
            .fzTile:hover{filter:brightness(0.95);}
            /* Zusätzliche Informationen, ohne die Alarmierung rechts zu überdecken. */
            /* Linke Kante entspricht der Textspalte nach Statuspunkt und Kachelabstand. */
            .fzTileExtras{position:absolute;left:var(--fz-text-offset, 25px);top:2px;bottom:1px;right:5px;pointer-events:none;z-index:1;}
            .fzTileUpdated{position:absolute;left:0;top:0;font:9px/1.1 Arial,sans-serif;color:#555;white-space:nowrap;opacity:.85;}
            @keyframes fzTileGreenBlink{0%,100%{color:#118a31;opacity:1;}50%{color:#17cf54;opacity:.25;}}
            .fzTileUpdated.fzTileUpdating{animation:fzTileGreenBlink .7s ease-in-out infinite;font-weight:bold;}
            .fzTile.fzHasExtras .fzContentWrapper{padding-top:11px;box-sizing:border-box;}
            .fzAvailabilityTrack{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(100,100,100,.22);border-radius:3px;overflow:hidden;}
            .fzAvailabilityFill{display:block;height:100%;width:0;background:#28a745;transition:width .3s ease;}
            .fzTile.fzTileCompact .fzTileExtras{display:none!important;}

            .fzStatusDot{width:9px;height:9px;border-radius:50%;z-index:1;border:1px solid rgba(0,0,0,0.2);flex-shrink:0;margin-top:auto;margin-bottom:auto;}
            .fzContentWrapper{display:flex;flex-direction:column;justify-content:center;flex:1;overflow:hidden;height:100%;}
            .fzRightWrapper{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;flex-shrink:0;min-width:0;height:100%;padding-top:3px;padding-bottom:3px;box-sizing:border-box;}
            .fzBadgeSlot{display:flex;gap:2px;flex-wrap:wrap;margin-bottom:2px;min-height:0;}
            .fzBadge{font-weight:bold;font-size:var(--fz-badge-fs);padding:0px 4px;border-radius:2px;color:#fff;white-space:nowrap;line-height:1.2;}.fzBadgeInUse{background:#dc3545;}
            .fzTileName{font-size:var(--fz-name-fs);font-weight:var(--fz-name-fw);white-space:nowrap;text-overflow:ellipsis;width:100%;overflow:hidden;line-height:1.2;}
            .fzTileCount{display:flex;align-items:center;gap:3px;justify-content:flex-end;}
            .fzNumToday{font-weight:bold;color:var(--fz-nt-c);font-size:var(--fz-count-fs);}
            .fzNumYday{font-weight:normal;color:var(--fz-ny-c);font-size:calc(var(--fz-count-fs)*0.8);}
            .fzTileIdLabel{font-size:var(--fz-id-sz);color:var(--fz-id-c);text-align:var(--fz-id-a);width:100%;margin-top:1px;white-space:nowrap;line-height:1;}
            .fzResourceCounter{font-size:var(--fz-res-s);color:var(--fz-res-c);font-weight:bold;}
            .fzTileShare{font-size:10px;color:var(--fz-ny-c);line-height:1;margin-top:1px;text-align:right;white-space:nowrap;}
            .fzPers{font-size:9px;color:#777;margin-top:1px;margin-bottom:2px;white-space:nowrap;}
            @keyframes fzAlarmBlink{0%{opacity:1;}45%{opacity:1;}65%{opacity:0.12;}100%{opacity:1;}}
            .fzFunkalarmLabel{margin-top:auto;flex-shrink:0;font-size:var(--fz-funk-sz);color:var(--fz-funk-c);font-weight:var(--fz-funk-fw);white-space:nowrap;text-align:right;line-height:1;margin-bottom:2px;overflow:hidden;max-width:100%;text-overflow:ellipsis;}
            .fzFunkalarmLabel.fzAlarming{animation:fzAlarmBlink 1.4s ease-in-out infinite;color:var(--fz-funk-blink-c)!important;font-weight:bold!important;}
            .fzBottomBar{display:none!important;height:3px;background:#e0e0e0;border-radius:2px;overflow:hidden;width:100%;margin-top:2px;}.fzBottomBarFill{height:100%;background:var(--fz-bar-c);width:0%;transition:width 0.3s;}
            /* Verfuegbarkeit je Fahrzeugtyp: 100 %, 50-99 %, 1-49 %, 0 %, kein Bestand. */
            .fzTile.fzAllFree{background-color:#ffffff!important;color:#222!important;}
            .fzTile.fzMostlyFree{background-color:#fff3cd!important;color:#222!important;}
            .fzTile.fzFewFree{background-color:#ffcc80!important;color:#222!important;}
            .fzTile.fzNoneFree{background-color:#f8b4b4!important;color:#222!important;}
            .fzTile.fzNoStock{background-color:#e5e7eb!important;color:#222!important;}
            .fzTile.fzStockUnknown{background-color:var(--fz-tile-bg)!important;color:var(--fz-tile-text)!important;}
            /* Bestehende Klassen fuer Ressourcen weiterhin unterstuetzen. */
            .fzTile.fzInUse{background:${uiSettings.tileColorInUse}!important;color:#222!important;}
            .fzTile.fzEmpty{background:${uiSettings.tileColorEmpty}!important;color:#222!important;}
            /* Statuspunkt-Farbe wird anhand der Verfuegbarkeit im JavaScript gesetzt. */
            .fzTile.fzResource{background-color:var(--fz-res-bg)!important;color:#000!important;}
            .fzTile.fzResource.fzInUse{background-color:${uiSettings.tileColorInUse}!important;color:#222!important;}
            .fzTile.fzResource.fzEmpty{background-color:${uiSettings.tileColorEmpty}!important;color:#222!important;}
            .fzTile.fzStat{background-color:var(--fz-tile-bg)!important;color:var(--fz-tile-text)!important;height:48px;}
            .fzTile.fzStat .fzFunkalarmLabel{display:none!important;}
            /* Kategorie "Einsatz-Statistik" ausgeblendet (Zähler laufen im Hintergrund weiter, Klicks aus Kopfzeile/Badges funktionieren weiter) */
            #fzCatHead_Ressourcen{display:none!important;}
            .fzTile.fzStat{display:none!important;}
            /* Pfeil und Wert als EINE Textzeile: identische Schrift/Baseline, kein Versatz. */
            .fzCatHeader{grid-column:1/-1;background:#333;color:var(--fz-cat-c);font-weight:bold;padding:var(--fz-cat-pad) 8px;text-align:left;font-size:var(--fz-cat-s);border-bottom:1px solid #ccc;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;position:relative;overflow:visible;}.fzCatHeader:hover{filter:brightness(1.1);}
            .fzBtn{background:#f5f5f5;border:1px solid #ccc;border-radius:4px;cursor:pointer;padding:4px 8px;font-weight:bold;color:#333;text-align:center;font-size:13px;transition:background-color 0.2s;}.fzBtn:hover{background:#e0e0e0;}
            .fzHeadBtn{cursor:pointer;font-size:14px;margin-left:5px;opacity:0.8;}.fzHeadBtn:hover{opacity:1;transform:scale(1.1);}
            .fzHeaderRight{display:flex;align-items:center;flex-wrap:nowrap;flex-shrink:0;}
            #fzRelocatedButtons{display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;gap:4px;}
            #fzRelocatedButtons .fzHeadBtn{display:inline-flex!important;align-items:center;justify-content:center;width:26px;height:26px;margin:0!important;padding:0;line-height:1;box-sizing:border-box;flex-shrink:0;font-size:14px!important;}
            #fzRelocatedButtons .fzHeadBtn svg{width:16px;height:16px;display:block;}
            #fzRelocatedButtons #fzGlobalTileCollapse{font-size:18px!important;}
            .fzModalOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100001;display:flex;justify-content:center;align-items:center;}
            .fzModal{background:#fff;padding:20px;border-radius:8px;width:650px;max-width:90%;max-height:90vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:sans-serif;font-size:13px;}
            .fzModal h3{margin-top:0;color:#333;font-size:18px;border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:15px;}
            .fzSettingsContainer{display:flex;gap:15px;}.fzSetCol{flex:1;min-width:0;}.fzSetSep{width:1px;background-color:#000;margin:0 5px;flex-shrink:0;}
            .fzSetGroup{margin-bottom:15px;border-bottom:1px solid #000;padding-bottom:10px;}.fzSetGroup h4{margin:0 0 8px 0;color:#007bff;}
            .fzRow{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f9f9f9;}
            .fzInput{width:80px;padding:2px;border:1px solid #ccc;border-radius:3px;text-align:right;}.fzColor{width:40px;height:20px;border:none;padding:0;cursor:pointer;}
            .fzModalStats{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:15px;}
            .fzStatBox{background:#f8f9fa;padding:10px;border-radius:5px;text-align:center;border:1px solid #ddd;}.fzStatVal{font-size:18px;font-weight:bold;color:#333;}.fzStatLbl{font-size:10px;color:#666;text-transform:uppercase;margin-top:2px;}
            .fzGraphContainer{display:flex;align-items:flex-end;justify-content:space-between;height:60px;padding:10px 0;border-bottom:1px solid #eee;margin-bottom:8px;}
            .fzGraphBarWrapper{display:flex;flex-direction:column;align-items:center;flex:1;}.fzGraphBar{width:60%;border-radius:2px 2px 0 0;min-height:1px;transition:height 0.3s;}
            .fzGraphLabel{font-size:9px;color:#666;margin-top:4px;}.fzGraphValue{font-size:9px;font-weight:bold;margin-bottom:2px;}
            .fzUsageTable{width:100%;font-size:11px;margin-bottom:15px;border-collapse:collapse;}.fzUsageTable td{border-bottom:1px solid #eee;padding:3px 0;}.fzUsageTable tr:last-child td{border-bottom:none;}
            .fzSectionTitle{font-size:12px;font-weight:bold;margin-bottom:5px;color:#007bff;border-bottom:1px solid #eee;padding-bottom:3px;margin-top:15px;}
            .fzFooter{font-size:${uiSettings.footerSize}px;color:${uiSettings.footerColor};text-align:${uiSettings.footerAlign};padding:2px;width:100%;box-sizing:border-box;}
            .fzFilterBtn{padding:3px 10px;border-radius:12px;border:1px solid #ccc;font-size:11px;cursor:pointer;background:#f5f5f5;color:#333;font-weight:normal;transition:background 0.15s,color 0.15s;}
            .fzFilterBtn.active{background:#007bff;color:#fff;font-weight:bold;}.fzFilterBtn:hover:not(.active){background:#e0e0e0;}
            .fzTile.fzSchoolingTile{background:var(--fz-tile-bg)!important;color:var(--fz-tile-text)!important;border-left-color:${C_AUS}!important;height:auto;min-height:var(--fz-tile-h);}
            .fzSchoolingTile:hover{filter:brightness(0.97);}
            .fzToggleBtn{position:fixed!important;top:6px!important;left:6px!important;bottom:auto!important;right:auto!important;z-index:${CFG.zIndex+2};width:32px;height:32px;border-radius:0;background:transparent!important;color:#ffffff!important;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none!important;box-shadow:none!important;outline:none;padding:0;margin:0;opacity:0.85;transition:opacity 0.15s ease,transform 0.15s ease;user-select:none;-webkit-user-select:none;}
            .fzToggleBtn:hover{opacity:1;transform:scale(1.15);}
            .fzToggleBtn svg{display:block;pointer-events:none;stroke:#ffffff;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));}
            .fzToggleBtn.fzBtnHidden{opacity:0!important;pointer-events:none!important;}
            .fzTile.fzTileCompact{height:26px!important;min-height:26px!important;padding-top:0!important;padding-bottom:0!important;align-items:center;}
            .fzTile.fzTileCompact .fzContentWrapper{display:none!important;}.fzTile.fzTileCompact .fzRightWrapper{display:none!important;}.fzTile.fzTileCompact .fzStatusDot{display:none!important;}
            .fzTileCompactRow{display:none;align-items:center;gap:6px;flex:1;overflow:hidden;padding:0 2px;}
            .fzTile.fzTileCompact .fzTileCompactRow{display:flex!important;}
            .fzCompactDot{width:7px;height:7px;border-radius:50%;flex-shrink:0;border:1px solid rgba(0,0,0,0.2);background:#888;}
            .fzCompactLabel{font-size:11px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;color:inherit;}
            .fzCompactCount{font-size:11px;font-weight:bold;color:var(--fz-nt-c);flex-shrink:0;margin-left:auto;}
            .fzCompactBusy{font-size:10px;color:#dc3545;font-weight:bold;flex-shrink:0;}
            .fzTileCollapseToggle{cursor:pointer;font-size:14px;padding:1px 3px;background:transparent;border:none;line-height:1.5;user-select:none;transition:transform 0.1s,opacity 0.15s;flex-shrink:0;opacity:0.75;}
            .fzTileCollapseToggle:hover{opacity:1;transform:scale(1.2);}.fzTileCollapseToggle.fzTCactive{opacity:1;}
        `;
    }

    function injectCSS(){
        if(document.getElementById("fzStyles")) return;
        cssContent = prepareCSSString();
        lastCSSHash = cssContent;
        const style = document.createElement("style");
        style.id = "fzStyles";
        style.textContent = cssContent;
        document.head.appendChild(style);
        const fa = document.createElement("link");
        fa.rel = "stylesheet";
        fa.href = "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css";
        document.head.appendChild(fa);
    }

    function updateStyles(){
        const newCSS = prepareCSSString();
        if(newCSS === lastCSSHash) return;

        lastCSSHash = newCSS;
        cssContent = newCSS;
        let s = document.getElementById("fzStyles");
        if(s) s.textContent = cssContent;
        if(extWin && !extWin.closed){
            let exS = extWin.document.getElementById("fzStylesExt");
            if(exS) exS.textContent = cssContent;
        }
    }

    // KACHEL RENDER LOGIK
    // Anteil einer Kachel an allen Alarmierungen des Tages (nur Fahrzeug-Kacheln, ohne Ressourcen/Lehrgänge)
    function getShareTotal(){
        let sum = 0;
        for(const k of KEYS){
            const m = tileMetaByKey[k];
            if(!m || m.cat === "Ressourcen" || m.cat === "Ausbildung") continue;
            sum += (state.today[k] || 0);
        }
        return sum;
    }

    function updateTile(key, state){
        if(SCHOOLING_TILE_NAMES.has(key)){ updateSchoolingTiles(); return; }
        const cached = tileCache[key];
        if(!cached || !cached.el) return;

        const v = (state.today[key] || 0);
        const inUse = vehicleInUseCount[key] || 0;
        let total = vehicleTotalCount[key] || 0;
        if(total === 0 && customStock[key] !== undefined) total = customStock[key];

        // Keine freien Fahrzeuge aus einem moeglicherweise veralteten Bestand schaetzen.
        // Der API-Abruf liefert die FMS-basierten Freizaehlungen je Fahrzeugtyp.
        const free = Math.min(total, Math.max(0, vehicleFreeCount[key] || 0));
        const hasLiveStock = !!lastSuccessfulVehicleFetch && (vehicleTotalCount[key] || 0) > 0;

        cached.lastState = {v,inUse,free,total};
        const el = cached.el;
        // Textposition direkt am tatsaechlichen Inhalt messen, statt Pixel zu raten.
        if(cached.contentWrapper){
            const textOffset = cached.contentWrapper.offsetLeft;
            if(textOffset > 0 && cached.lastTextOffset !== textOffset){
                el.style.setProperty("--fz-text-offset", textOffset + "px");
                cached.lastTextOffset = textOffset;
            }
        }
        el.dataset.val = v;
        const isResource = RESOURCE_TILE_NAMES.has(key);
        // Nur echte Fahrzeugkacheln; keine Ressourcen oder Lehrgangskacheln.
        const vehicleTile = !isResource && tileMetaByKey[key]?.cat !== "Ausbildung";
        if(cached.extras){
            const showExtras = vehicleTile && total > 0;
            cached.extras.style.display = showExtras ? "block" : "none";
            el.classList.toggle("fzHasExtras", showExtras);
            if(showExtras){
                if(cached.updatedAt){
                    if(cached.updatedAt.textContent !== formattedVehicleUpdateTime)
                        cached.updatedAt.textContent = formattedVehicleUpdateTime;
                    cached.updatedAt.title = "Letzter erfolgreicher Abruf der Fahrzeugdaten";
                    cached.updatedAt.classList.toggle("fzTileUpdating", Date.now() < tileBlinkUntil);
                }
                const percent = hasLiveStock ? Math.max(0, Math.min(100, total ? free / total * 100 : 0)) : 0;
                if(cached.availabilityFill){
                    cached.availabilityFill.style.width = percent.toFixed(1) + "%";
                    cached.availabilityFill.style.background = !hasLiveStock ? "#94a3b8" : percent === 100 ? "#28a745" : percent >= 50 ? "#eab308" : percent > 0 ? "#f97316" : "#dc3545";
                }
                if(cached.availabilityTrack) cached.availabilityTrack.title =
                    hasLiveStock ? `${free} von ${total} Fahrzeugen verfügbar (${Math.round(percent)} %)` : "Verfügbarkeit nicht durch aktuelle Fahrzeugdaten bestätigt";
            }
        }


        const COUNTED_RESOURCE_KEYS = new Set([
            "Patienten","Gefangene","Wasserbedarf","Betreuung/Versorgung","Krankentransporte","Helikopter"
        ]);

        const isEventCounter = isResource && !COUNTED_RESOURCE_KEYS.has(key);
        const y = (state.yday[key] || 0);
        const showNumbers = (uiSettings.tileStatsMode || "both") !== "barOnly";

        if(cached.resCounter){
            const rMode = uiSettings.resourceCounterMode || "all";
            let txt = "";

            if(isResource){
                if(key === "Wasserbedarf"){
                    txt = v > 0 ? v.toLocaleString("de-DE") + " L" : "0 L";
                } else if(key === "Krankenhausbetten"){
                    const frei = Math.max(0, (cachedCapacities.beds || 0) - (cachedCapacities.bedsUsed || 0));
                    txt = `${frei} frei`;
                } else if(key === "Gefängniszellen"){
                    const freiZ = Math.max(0, (cachedCapacities.cells || 0) - (state.today["Gefangene"] || 0));
                    txt = `${freiZ} frei`;
                } else if(rMode === "all" || rMode === "waterOnly"){
                    if(!COUNTED_RESOURCE_KEYS.has(key)) txt = v > 0 ? String(v) : "";
                }
            }

            if(cached.resCounter.textContent !== txt) cached.resCounter.textContent = txt;
        }

        const showNumericCounter = showNumbers && !isEventCounter && key !== "Wasserbedarf" && key !== "Krankenhausbetten" && key !== "Gefängniszellen";
        if(cached.tileCount) cached.tileCount.style.display = showNumericCounter ? "flex" : "none";

        if(showNumericCounter){
            if(cached.numToday) cached.numToday.textContent = v;
            if(cached.numYday) cached.numYday.textContent = uiSettings.showTileYday ? `(${y})` : "";

        }

        if(cached.shareEl){
            const m = tileMetaByKey[key];
            let shareTxt = "";
            if(m && m.cat !== "Ressourcen" && m.cat !== "Ausbildung" && v > 0){
                const tot = getShareTotal();
                if(tot > 0) shareTxt = Math.round((v / tot) * 100) + " %";
            }
            if(cached.shareEl.textContent !== shareTxt) cached.shareEl.textContent = shareTxt;
        }

        if(cached.bottomBar){
            let pct = 0;
            if(total > 0) pct = Math.min(100, Math.round((inUse / total) * 100));
            else if(isResource){
                if((key === "Patienten" || key === "Krankenhausbetten") && cachedCapacities.beds > 0)
                    pct = Math.min(100, Math.round(((cachedCapacities.bedsUsed || 0) / cachedCapacities.beds) * 100));
                else if((key === "Gefangene" || key === "Gefängniszellen") && cachedCapacities.cells > 0)
                    pct = Math.min(100, Math.round(((state.today["Gefangene"] || 0) / cachedCapacities.cells) * 100));
            }
            cached.bottomBar.style.width = pct + "%";
        }

        if(cached.idLabel){
            if(isResource) cached.idLabel.style.display = "none";
            else{
                const meta = tileMetaByKey[key];
                let idText = "";
                if(meta && meta.id !== undefined && meta.id !== null){
                    const ids = Array.isArray(meta.id) ? meta.id : [meta.id];
                    const filtered = ids.filter(i => i !== null && i !== undefined && (i !== 0 || key === "LF20"));
                    idText = filtered.join(", ");
                }
                if(idText){
                    cached.idLabel.textContent = uiSettings.tileIdPrefix + idText;
                    cached.idLabel.style.display = "block";
                } else cached.idLabel.style.display = "none";
            }
        }

        if(cached.badgeSlot){
            if(isResource){
                if(key === "Krankenhausbetten"){
                    const frei = Math.max(0, (cachedCapacities.beds || 0) - (cachedCapacities.bedsUsed || 0));
                    const col = frei < 3 ? "#dc3545" : frei < 10 ? "#f0ad4e" : "#109010";
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:${col}">Belegt: ${cachedCapacities.bedsUsed || 0} | Frei: ${frei} | Ges: ${cachedCapacities.beds || 0}</span>`;
                } else if(key === "Gefängniszellen"){
                    const belegteZ = state.today["Gefangene"] || 0;
                    const freiZ = Math.max(0, (cachedCapacities.cells || 0) - belegteZ);
                    const colZ = freiZ < 2 ? "#dc3545" : freiZ < 5 ? "#f0ad4e" : "#109010";
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:${colZ}">Belegt: ${belegteZ} | Frei: ${freiZ} | Ges: ${cachedCapacities.cells || 0}</span>`;
                } else if(key === "Patienten"){
                    const freiB = Math.max(0, (cachedCapacities.beds || 0) - (cachedCapacities.bedsUsed || 0));
                    const colP = freiB < 3 ? "#dc3545" : freiB < 10 ? "#f0ad4e" : "#109010";
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:${colP}">Heute: ${v} | Betten frei: ${freiB}/${cachedCapacities.beds || 0}</span>`;
                } else if(key === "Gefangene"){
                    const freiZ2 = Math.max(0, (cachedCapacities.cells || 0) - (state.today["Gefangene"] || 0));
                    const colG = freiZ2 < 2 ? "#dc3545" : freiZ2 < 5 ? "#f0ad4e" : "#109010";
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:${colG}">Heute: ${v} | Zellen frei: ${freiZ2}/${cachedCapacities.cells || 0}</span>`;
                } else if(key === "Wasserbedarf"){
                    const yW = state.yday[key] || 0;
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:#109010">Gestern: ${yW.toLocaleString('de-DE')} L</span>`;
                } else if(key === "Betreuung/Versorgung"){
                    const betrFrei = vehicleFreeCount[key] || 0;
                    const betrTotal = vehicleTotalCount[key] || 0;
                    const colB = betrFrei > 0 ? "#109010" : "#dc3545";
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:#109010">Heute: ${v}</span>` + (betrTotal > 0 ? `<span class="fzBadge" style="background:${colB}">Fz: ${betrFrei}/${betrTotal}</span>` : "");
                } else if(key === "Helikopter"){
                    const heliFrei = vehicleFreeCount[key] || 0;
                    const heliTotal = vehicleTotalCount[key] || 0;
                    const colH = heliFrei > 0 ? "#109010" : "#dc3545";
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:#109010">Heute: ${v}</span>` + (heliTotal > 0 ? `<span class="fzBadge" style="background:${colH}">Fz: ${heliFrei}/${heliTotal}</span>` : "");
                } else if(key === "Krankentransporte"){
                    cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:#109010">Heute: ${v}</span>`;
                } else {
                    if(total > 0){
                        const freeColor = free > 0 ? "#28a745" : "#dc3545";
                        cached.badgeSlot.innerHTML = `<span class="fzBadge" style="background:${freeColor}">Frei: ${free} / ${total}</span>`;
                    } else cached.badgeSlot.innerHTML = "";
                }
            } else {
                let badgesHtml = "";
                if(inUse > 0) badgesHtml += `<span class="fzBadge fzBadgeInUse">Im Einsatz: ${inUse}</span>`;
                if(vehicleExists[key] || total > 0){
                    const freeColor = free > 0 ? "#28a745" : "#dc3545";
                    badgesHtml += `<span class="fzBadge" style="background:${freeColor}">Frei: ${free} / ${total}</span>`;
                }
                cached.badgeSlot.innerHTML = badgesHtml;
            }
        }

        // Einheitliche Statusfarbe fuer ALLE Fahrzeugkacheln mit bekanntem Bestand.
        // Farbschema B ausschliesslich fuer echte Fahrzeugkacheln.
        // Die Live-API liefert die FMS-basierten freien und gesamten Fahrzeuge pro Typ.
        // Unbekannte/fehlgeschlagene API-Daten niemals als "kein Bestand" ausgeben.
        el.classList.remove("fzInUse", "fzEmpty", "fzAllFree", "fzMostlyFree", "fzFewFree", "fzNoneFree", "fzNoStock", "fzStockUnknown");
        if(vehicleTile){
            if(!lastSuccessfulVehicleFetch){
                el.classList.add("fzStockUnknown");
            } else if((vehicleTotalCount[key] || 0) === 0){
                // Keine manuell geschaetzten Bestandszahlen fuer die Farbentscheidung.
                el.classList.add("fzNoStock");
            } else {
                const availabilityPercent = free / vehicleTotalCount[key] * 100;
                if(availabilityPercent >= 100) el.classList.add("fzAllFree");
                else if(availabilityPercent >= 50) el.classList.add("fzMostlyFree");
                else if(free > 0) el.classList.add("fzFewFree");
                else el.classList.add("fzNoneFree");
            }
        }

        let dotColor = "#888";
        if(isResource){
            if(key === "Patienten" || key === "Krankenhausbetten"){
                const frei = Math.max(0, (cachedCapacities.beds || 0) - (cachedCapacities.bedsUsed || 0));
                dotColor = frei < 3 ? "#dc3545" : frei < 10 ? "#f0ad4e" : "#5cb85c";
            } else if(key === "Gefangene" || key === "Gefängniszellen"){
                const freiZ = Math.max(0, (cachedCapacities.cells || 0) - (state.today["Gefangene"] || 0));
                dotColor = freiZ < 2 ? "#dc3545" : freiZ < 5 ? "#f0ad4e" : "#5cb85c";
            } else if(key === "Wasserbedarf"){
                dotColor = v > 0 ? "#f0ad4e" : "#5cb85c";
            } else if(key === "Betreuung/Versorgung" || key === "Helikopter"){
                const frei2 = vehicleFreeCount[key] || 0;
                const tot2 = vehicleTotalCount[key] || 0;
                dotColor = tot2 > 0 ? (frei2 > 0 ? "#5cb85c" : "#dc3545") : (v > 0 ? "#f0ad4e" : "#888");
            } else {
                dotColor = v > 0 ? "#f0ad4e" : "#888";
            }
        } else {
            // Fahrzeugstatus unabhaengig von der Kachel-Hintergrundfarbe.
            if(hasLiveStock){
                const ratio = total > 0 ? free / total : 0;
                dotColor = ratio >= 1 ? "#5cb85c" : ratio >= 0.5 ? "#eab308" : ratio > 0 ? "#f97316" : "#dc3545";
            } else if(vehicleExists[key] || total > 0){
                dotColor = "#f0ad4e"; // Fahrzeug erkannt, Daten unvollstaendig
            } else {
                dotColor = "#94a3b8"; // Kein Fahrzeugbestand erkannt
            }
        }

        if(cached.dot) cached.dot.style.backgroundColor = dotColor;
        if(cached.compactDot) cached.compactDot.style.backgroundColor = dotColor;
        if(cached.compactCount) cached.compactCount.textContent = !isEventCounter ? v : "";
        if(cached.compactBusy){
            if(inUse > 0 && !isResource){
                cached.compactBusy.textContent = `▶${inUse}`;
                cached.compactBusy.style.display = "";
            } else cached.compactBusy.style.display = "none";
        }
    }

    function createTile(key, state){
        if(SCHOOLING_TILE_NAMES.has(key)) return createSchoolingTile(key);

        const meta = tileMetaByKey[key];
        const color = meta?.c || "#888";
        const v = (state.today[key] || 0);

        const div = document.createElement("div");
        div.className = "fzTile";
        div.dataset.key = key;
        div.dataset.val = v;

        if(meta && (meta.cat === "Ressourcen" || meta.cat === "Ausbildung")) div.classList.add("fzResource");
        if(meta && meta.cat === "Ressourcen") div.classList.add("fzStat");
        div.style.borderLeftColor = color;

        div.innerHTML = `
            <div class="fzTileCompactRow"><span class="fzCompactDot"></span><span class="fzCompactLabel">${escapeHTML(key)}</span><span class="fzCompactCount"></span><span class="fzCompactBusy" style="display:none;"></span></div>
            <div class="fzStatusDot" style="background-color:#ff0000;margin-right:5px;"></div>
            <div class="fzContentWrapper"><span class="fzBadgeSlot"></span><span class="fzTileName">${escapeHTML(key)}</span><div class="fzTileIdLabel"></div><div class="fzBottomBar"><div class="fzBottomBarFill"></div></div></div>
            <div class="fzRightWrapper"><div class="fzTileCount"><span class="fzNumToday">0</span><span class="fzNumYday">(0)</span></div><div class="fzTileShare"></div><div class="fzResourceCounter"></div><div class="fzFunkalarmLabel">${escapeHTML(uiSettings.funkalarmText || 'Funk-Alarm')}</div></div>
            <div class="fzTileExtras" style="display:none"><span class="fzTileUpdated"></span><div class="fzAvailabilityTrack"><span class="fzAvailabilityFill"></span></div></div>
        `;
        div.onclick = () => showDetails(key, state);

        tileEls[key] = div;
        tileCache[key] = {
            el: div,
            contentWrapper: div.querySelector(".fzContentWrapper"),
            dot: div.querySelector(".fzStatusDot"),
            compactDot: div.querySelector(".fzCompactDot"),
            compactLabel: div.querySelector(".fzCompactLabel"),
            compactCount: div.querySelector(".fzCompactCount"),
            compactBusy: div.querySelector(".fzCompactBusy"),
            badgeSlot: div.querySelector(".fzBadgeSlot"),
            tileName: div.querySelector(".fzTileName"),
            bottomBar: div.querySelector(".fzBottomBarFill"),
            extras: div.querySelector(".fzTileExtras"),
            updatedAt: div.querySelector(".fzTileUpdated"),
            availabilityTrack: div.querySelector(".fzAvailabilityTrack"),
            availabilityFill: div.querySelector(".fzAvailabilityFill"),
            tileCount: div.querySelector(".fzTileCount"),
            numToday: div.querySelector(".fzNumToday"),
            numYday: div.querySelector(".fzNumYday"),
            shareEl: div.querySelector(".fzTileShare"),
            resCounter: div.querySelector(".fzResourceCounter"),
            idLabel: div.querySelector(".fzTileIdLabel"),
            funkalarmLabel: div.querySelector(".fzFunkalarmLabel"),
            lastState: null
        };
        return div;
    }

    // MODALS & EVENT HANDLER
    function toggleCategoryTileCompact(cat){
        if(!Array.isArray(uiSettings.collapsedTilesCats)) uiSettings.collapsedTilesCats = [];
        const isCompact = uiSettings.collapsedTilesCats.includes(cat);
        if(isCompact) uiSettings.collapsedTilesCats = uiSettings.collapsedTilesCats.filter(c => c !== cat);
        else uiSettings.collapsedTilesCats = [...uiSettings.collapsedTilesCats, cat];
        saveUI();

        const btnEl = document.getElementById("fzTileCollapse_" + cat);
        if(btnEl){
            btnEl.textContent = uiSettings.collapsedTilesCats.includes(cat) ? "▤" : "▦";
            btnEl.classList.toggle("fzTCactive", uiSettings.collapsedTilesCats.includes(cat));
        }

        const nowCompact = uiSettings.collapsedTilesCats.includes(cat);
        (CAT_TILE_MAP[cat] || []).forEach(tileMeta => {
            const el = tileEls[tileMeta.n];
            if(!el) return;
            if(nowCompact) el.classList.add("fzTileCompact");
            else el.classList.remove("fzTileCompact");
        });
    }

    function showDetails(key, state){
        if(SCHOOLING_TILE_NAMES.has(key)){ showSchoolingDetails(); return; }

        const PURE_CAPACITY_KEYS = new Set(["Krankenhausbetten","Gefängniszellen"]);
        if(PURE_CAPACITY_KEYS.has(key)){
            const ol = document.createElement("div");
            ol.className = "fzModalOverlay";
            ol.onclick = (e) => { if(e.target === ol) ol.remove(); };

            if(key === "Krankenhausbetten"){
                const frei = Math.max(0, (cachedCapacities.beds || 0) - (cachedCapacities.bedsUsed || 0));
                ol.innerHTML = `<div class="fzModal" style="max-width:420px;"><h3>🏥 Krankenhausbetten</h3><div class="fzModalStats"><div class="fzStatBox"><div class="fzStatVal" style="color:#dc3545;">${cachedCapacities.bedsUsed || 0}</div><div class="fzStatLbl">Belegt</div></div><div class="fzStatBox"><div class="fzStatVal" style="color:#28a745;">${frei}</div><div class="fzStatLbl">Frei</div></div><div class="fzStatBox"><div class="fzStatVal">${cachedCapacities.beds || 0}</div><div class="fzStatLbl">Gesamt</div></div></div><button class="fzBtn" style="margin-top:15px;width:100%" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button></div>`;
            } else {
                const belegteZ = state.today["Gefangene"] || 0;
                const freiZ = Math.max(0, (cachedCapacities.cells || 0) - belegteZ);
                ol.innerHTML = `<div class="fzModal" style="max-width:420px;"><h3>🔒 Gefängniszellen</h3><div class="fzModalStats"><div class="fzStatBox"><div class="fzStatVal" style="color:#dc3545;">${belegteZ}</div><div class="fzStatLbl">Belegt</div></div><div class="fzStatBox"><div class="fzStatVal" style="color:#28a745;">${freiZ}</div><div class="fzStatLbl">Frei</div></div><div class="fzStatBox"><div class="fzStatVal">${cachedCapacities.cells || 0}</div><div class="fzStatLbl">Gesamt</div></div></div><button class="fzBtn" style="margin-top:15px;width:100%" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button></div>`;
            }

            getTargetBody().appendChild(ol);
            return;
        }

        const list = vehicleLists[key] || [];

        const renderVehicleList = (filter) => {
            let filtered = [...list];
            if(filter === "free") filtered = list.filter(v => v.fms === 1 || v.fms === 2);
            else if(filter === "busy") filtered = list.filter(v => v.fms === 3 || v.fms === 4 || v.fms === 7 || v.fms === 8);
            else if(filter === "s6") filtered = list.filter(v => v.fms === 6);

            filtered.sort((a,b) => {
                const aInUse = (a.fms===3||a.fms===4||a.fms===7||a.fms===8);
                const bInUse = (b.fms===3||b.fms===4||b.fms===7||b.fms===8);
                if(aInUse && !bInUse) return -1;
                if(!aInUse && bInUse) return 1;
                return a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
            });

            if(filtered.length === 0) return `<div style='padding:10px;text-align:center;color:#999'>Keine Fahrzeuge in dieser Kategorie.</div>`;

            return filtered.map(v => {
                let color = "#6c757d";
                if(v.fms === 1 || v.fms === 2) color = "#28a745";
                if(v.fms === 6) color = "#000000";
                else if(v.fms === 3 || v.fms === 4 || v.fms === 7 || v.fms === 8) color = "#dc3545";
                else if(v.fms === 5) color = "#ffc107";

                let statusDisplay = v.fms == null ? "(Unbekannt)" : `(S${v.fms})`;
                if(v.missionId && (v.fms === 4 || v.fms === 7)){
                    statusDisplay = `<a href="/missions/${encodeURIComponent(String(v.missionId))}" target="_blank" style="color:#007bff;text-decoration:underline;">(S${v.fms})</a>`;
                }

                let crewDisplay = v.crew > 0 ? `<span style="font-size:10px;color:#666;margin-left:5px;">${ICONS.person} ${v.crew}</span>` : "";
                return `<div class="fzRow" style="justify-content:flex-start;gap:8px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${color};flex-shrink:0;"></span><span style="font-weight:bold;">${escapeHTML(v.name)}</span>${crewDisplay}<span style="color:#666;font-size:11px;margin-left:auto;">${statusDisplay}</span></div>`;
            }).join("");
        };

        const countFree = list.filter(v => v.fms === 1 || v.fms === 2).length;
        const countBusy = list.filter(v => v.fms === 3 || v.fms === 4 || v.fms === 7 || v.fms === 8).length;
        const countS6 = list.filter(v => v.fms === 6).length;

        const ol = document.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = (e) => { if(e.target === ol) ol.remove(); };
        ol.innerHTML = `<div class="fzModal"><h3>${escapeHTML(key)} - Details</h3><div class="fzSectionTitle">Fahrzeugliste (${list.length})</div><div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;" id="fzVehicleFilterBtns"><button class="fzFilterBtn active" data-filter="all">Alle (${list.length})</button><button class="fzFilterBtn" data-filter="free" style="border-color:#28a745;">🟢 Frei (${countFree})</button><button class="fzFilterBtn" data-filter="busy" style="border-color:#dc3545;">🔴 Im Einsatz (${countBusy})</button><button class="fzFilterBtn" data-filter="s6" style="border-color:#6c757d;">⚫ S6 (${countS6})</button></div><div id="fzVehicleListContent" style="max-height:300px;overflow-y:auto;">${renderVehicleList("all")}</div><button class="fzBtn" style="margin-top:15px;width:100%" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button></div>`;

        setTimeout(() => {
            const btns = ol.querySelectorAll("#fzVehicleFilterBtns .fzFilterBtn");
            const listEl = ol.querySelector("#fzVehicleListContent");
            btns.forEach(btn => {
                btn.onclick = () => {
                    btns.forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    listEl.innerHTML = renderVehicleList(btn.dataset.filter);
                };
            });
        }, 50);

        getTargetBody().appendChild(ol);
    }

    function toggleCompactMode(){
        uiSettings.compactMode = !uiSettings.compactMode;
        saveUI();
        if(fzWrapper){
            if(uiSettings.compactMode) fzWrapper.classList.add("fzCompact");
            else fzWrapper.classList.remove("fzCompact");
        }
    }

    function toggleFS(){ if(fzWrapper) fzWrapper.classList.toggle("fzFullscreen"); }

    function exportData(){
        const backup = {settings:uiSettings, today:state.today, total:state.total, history:state.history, yday:state.yday, customStock};
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup,null,2));
        const a = document.createElement('a');
        a.setAttribute("href", dataStr);
        a.setAttribute("download", "ls_dashboard_backup_" + new Date().toISOString().slice(0,10) + ".json");
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function triggerImport(){
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                try{
                    const data = JSON.parse(event.target.result);
                    if(data.settings) GM_setValue(STORAGE.UISETTINGS, JSON.stringify(data.settings));
                    if(data.today) GM_setValue(STORAGE.COUNTS_TODAY, JSON.stringify(data.today));
                    if(data.total) GM_setValue(STORAGE.COUNTS_TOTAL, JSON.stringify(data.total));
                    if(data.history) GM_setValue(STORAGE.HISTORY_7DAYS, JSON.stringify(data.history));
                    if(data.yday) GM_setValue(STORAGE.YDAY_COUNTS, JSON.stringify(data.yday));
                    if(data.customStock) GM_setValue(STORAGE.CUSTOM_STOCK, JSON.stringify(data.customStock));
                    alert("Daten erfolgreich importiert! Seite wird neu geladen.");
                    location.reload();
                }catch(err){
                    alert("Fehler beim Import: " + err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function syncManualCountsFromApi(){
        if(Object.keys(vehicleTotalCount).length === 0){
            alert("API hat noch keine Daten geladen.");
            return;
        }
        json.save(STORAGE.CUSTOM_STOCK, vehicleTotalCount);
        alert("Aktueller Fahrzeugbestand wurde gespeichert!");
        location.reload();
    }

    function showVehicleMatchDiagnostics(){
        const doc = getTargetDoc();
        const ol = doc.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = e => { if(e.target === ol) ol.remove(); };
        const modal = doc.createElement("div");
        modal.className = "fzModal";
        modal.style.cssText = "max-width:720px;width:94%;max-height:85vh;overflow:auto";
        const heading = doc.createElement("h3");
        heading.textContent = "Fahrzeug-Zuordnungsprüfung (v4.5)";
        modal.appendChild(heading);
        const summary = doc.createElement("p");
        const d = vehicleMatchDiagnostics;
        summary.textContent = `Geprüft: ${d.total} | Eindeutig: ${d.matched} | Manuell: ${d.manual} | Mehrdeutig: ${d.ambiguous.length} | Unbekannt: ${d.unknown.length}`;
        modal.appendChild(summary);
        const info = doc.createElement("p");
        info.textContent = "Nur die offizielle Fahrzeugtyp-ID und Typbezeichnung werden ausgewertet. Bei mehrdeutigen IDs erfolgt keine automatische Doppelzählung. Manuelle Korrekturen gelten für alle Fahrzeuge derselben Typ-ID.";
        modal.appendChild(info);
        const issues = [...d.ambiguous.map(x=>({...x,reason:"Mehrdeutig"})),...d.unknown.map(x=>({...x,reason:"Unbekannt"}))];
        const seen = new Set();
        for(const item of issues){
            const groupKey = String(item.typeId) + "|" + item.typeName;
            if(seen.has(groupKey)) continue;
            seen.add(groupKey);
            const row = doc.createElement("div");
            row.style.cssText = "padding:8px 0;border-bottom:1px solid #aaa;display:flex;gap:8px;align-items:center;flex-wrap:wrap";
            const label = doc.createElement("span");
            label.style.cssText = "flex:1;min-width:200px;overflow-wrap:anywhere";
            label.textContent = `${item.reason}: ID ${item.typeId ?? "?"} – ${item.typeName || "ohne Typbezeichnung"} (z.B. ${item.caption})`;
            row.appendChild(label);
            if(item.typeId !== null && Number.isFinite(item.typeId)){
                const select = doc.createElement("select");
                select.className = "fzInput";
                const choices = ["",...KEYS.filter(k=>!SCHOOLING_TILE_NAMES.has(k))];
                for(const key of choices){
                    const opt = doc.createElement("option");
                    opt.value = key;
                    opt.textContent = key || "Nicht zuordnen";
                    select.appendChild(opt);
                }
                select.value = manualTypeMappings[String(item.typeId)] || "";
                select.onchange = () => {
                    if(select.value) manualTypeMappings[String(item.typeId)] = select.value;
                    else delete manualTypeMappings[String(item.typeId)];
                    saveTypeOverrides();
                    if(lastVehiclesRaw) processVehicles(lastVehiclesRaw,false);
                    ol.remove();
                    showVehicleMatchDiagnostics();
                };
                row.appendChild(select);
            }
            modal.appendChild(row);
        }
        if(!issues.length){
            const good = doc.createElement("p");
            good.textContent = "Keine unbekannten oder mehrdeutigen Fahrzeugtypen im letzten API-Abruf.";
            modal.appendChild(good);
        }
        const close = doc.createElement("button");
        close.className = "fzBtn";
        close.style.cssText = "margin-top:15px;width:100%";
        close.textContent = "Schließen";
        close.onclick = () => ol.remove();
        modal.appendChild(close);
        ol.appendChild(modal);
        getTargetBody().appendChild(ol);
    }

    function openSettings(){
        const ol = document.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = (e) => { if(e.target === ol) ol.remove(); };

        const modal = document.createElement("div");
        modal.className = "fzModal";
        modal.innerHTML = `<h3>Einstellungen</h3>`;

        const modalBody = document.createElement("div");
        modalBody.className = "fzSettingsContainer";
        const leftCol = document.createElement("div");
        leftCol.className = "fzSetCol";
        const sep = document.createElement("div");
        sep.className = "fzSetSep";
        const rightCol = document.createElement("div");
        rightCol.className = "fzSetCol";

        const createInput = (label,key,type="text",opts=[]) => {
            const row = document.createElement("div");
            row.className = "fzRow";
            row.innerHTML = `<span>${label}</span>`;
            let inp;

            if(type === "select"){
                inp = document.createElement("select");
                opts.forEach(o => {
                    const opt = document.createElement("option");
                    opt.value = o;
                    if(o === "category") opt.textContent = "Kategorie-Farbe";
                    else if(o === "custom") opt.textContent = "Eigene Farbe";
                    else opt.textContent = o;
                    if(uiSettings[key] === o) opt.selected = true;
                    inp.appendChild(opt);
                });
            } else if(type === "checkbox"){
                inp = document.createElement("input");
                inp.type = "checkbox";
                inp.checked = uiSettings[key];
                inp.onchange = (e) => {
                    uiSettings[key] = e.target.checked;
                    saveUI();
                    updateStyles();
                };
            } else {
                inp = document.createElement("input");
                inp.type = type;
                inp.value = uiSettings[key];
                inp.className = type === "color" ? "fzColor" : "fzInput";
            }

            if(type !== "checkbox"){
                inp.onchange = (e) => {
                    let val = e.target.value;
                    if(type === "number") val = parseInt(val,10);
                    uiSettings[key] = val;
                    saveUI();
                    updateStyles();
                    if(key === "apiInterval") startApiLoop();
                    if(key === "schoolingApiInterval") startSchoolingLoop();
                    if(key === "catHeaderMode" || key === "catHeaderBgColor") redrawGrid();
                    if(key.includes("stats")) updateHeaderStats();
                    if(key.startsWith("sub")) updateSubHeaderInfo();
                    if(key.startsWith("credits")) updateCreditsUI();
                    if(key === "funkalarmText"){
                        document.querySelectorAll(".fzFunkalarmLabel").forEach(el => { el.textContent = val; });
                    }
                };
            }

            row.appendChild(inp);
            return row;
        };

        const group = (title) => {
            const d = document.createElement("div");
            d.className = "fzSetGroup";
            d.innerHTML = `<h4>${title}</h4>`;
            return d;
        };

        const groups = [
            {t:"Fenster Layout",i:[["Max Höhe (px)","winMaxHeight","number"],["Pos. Oben (px)","winTop","number"],["Fenster BG","winBg","color"],["Spalten","columns","number"]]},
            {t:"Kategorien",i:[["Farb-Modus","catHeaderMode","select",["category","custom"]],["Eigene Farbe","catHeaderBgColor","color"],["Textfarbe","catHeaderTextColor","color"],["Schriftgröße (px)","catHeaderSize","number"],["Innenabstand (px)","catHeaderPadding","number"]]},
            {t:"Kacheln: Design",i:[["Hintergrund","tileBgColor","color"],["Textfarbe","tileTextColor","color"],["Ressourcen-BG","resourceTileBgColor","color"],["Balken Farbe","barColor","color"]]},
            {t:"Kacheln: Größe & Abstände",i:[["Spaltenbreite (px, 0 = automatisch)","tileColumnWidth","number"],["Kachelhöhe / Zeilenhöhe (px)","tileMinHeight","number"],["Innenabstand links/rechts (px)","tilePaddingX","number"],["Innenabstand oben/unten (px)","tilePaddingY","number"],["Rahmendicke (px)","tileBorderWidth","number"],["Abstand Statuspunkt/Text (px)","tileGap","number"]]},
            {t:"Kacheln: Text & Badges",i:[["Name Größe (px)","tileNameSize","number"],["Name Fett","tileNameWeight","select",["bold","normal"]],["Badge Größe (px)","badgeSize","number"],["Zähler Größe (px)","tileCounterSize","number"],["Zähler Farbe","numTodayColor","color"]]},
            {t:"Status",i:[["Bg (Im Einsatz)","tileColorInUse","color"],["Bg (Leer/0)","tileColorEmpty","color"]]},
            {t:"Statistik (Header)",i:[["Einsätze Farbe","statsMissionsColor","color"],["Einsätze Größe","statsMissionsSize","number"],["KTW Farbe","statsKtpColor","color"],["Aktiv Farbe","statsActiveColor","color"]]},
            {t:"Sub-Infos",i:[["Status Größe","subStatusSize","number"],["Status (Bereit)","subStatusColorOk","color"],["Status (Fehler)","subStatusColorErr","color"],["Update Farbe","subUpdateColor","color"],["Dispo Farbe","subDispColor","color"]]},
            {t:"Credits Counter",i:[["Abstand (px)","creditsGap","number"],["Schriftgröße","creditsFontSize","number"],["Label Farbe","creditsLabelColor","color"],["Zahlen Farbe","creditsValueColor","color"]]},
            {t:"Funkalarmierung",i:[["Beschriftung","funkalarmText","text"],["Schriftgröße","funkalarmSize","number"],["Textfarbe","funkalarmColor","color"],["Blinkfarbe","funkalarmBlinkColor","color"],["Blink-Dauer (Sek)","funkalarmBlinkDuration","number"]]},
            {t:"System & Verhalten",i:[["Auto-Hide (sek)","autoHideSeconds","number"],["API Update (sek)","apiInterval","number"],["Lehrgänge Update (sek)","schoolingApiInterval","number"],["Klick-Erhöhung","clickIncrement","number"]]}
        ];

        groups.forEach((g,index) => {
            const d = group(g.t);
            g.i.forEach(item => d.appendChild(createInput(item[0],item[1],item[2],item[3])));
            if(index < 6) leftCol.appendChild(d);
            else rightCol.appendChild(d);
        });

        const dataGroup = group("Datenverwaltung");
        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;";

        const btnSync = document.createElement("button");
        btnSync.className = "fzBtn";
        btnSync.textContent = "🔄 Bestand aus API";
        btnSync.onclick = syncManualCountsFromApi;

        const btnExp = document.createElement("button");
        btnExp.className = "fzBtn";
        btnExp.textContent = "💾 Backup";
        btnExp.onclick = exportData;

        const btnImp = document.createElement("button");
        btnImp.className = "fzBtn";
        btnImp.textContent = "📂 Laden";
        btnImp.onclick = triggerImport;

        const btnDiag = document.createElement("button");
        btnDiag.className = "fzBtn";
        btnDiag.textContent = "Fahrzeug-Zuordnung prüfen";
        btnDiag.onclick = showVehicleMatchDiagnostics;
        btnRow.appendChild(btnDiag);
        btnRow.appendChild(btnSync);
        btnRow.appendChild(btnExp);
        btnRow.appendChild(btnImp);
        dataGroup.appendChild(btnRow);
        rightCol.appendChild(dataGroup);

        modalBody.appendChild(leftCol);
        modalBody.appendChild(sep);
        modalBody.appendChild(rightCol);
        modal.appendChild(modalBody);

        const btnClose = document.createElement("button");
        btnClose.className = "fzBtn";
        btnClose.textContent = "Schließen";
        btnClose.style.cssText = "margin-top:15px;width:100%";
        btnClose.onclick = () => ol.remove();
        modal.appendChild(btnClose);

        ol.appendChild(modal);
        getTargetBody().appendChild(ol);
    }

    function startCountdown(){
        if(!fzWrapper || extWin) return;
        isHovering = false;
        if(safeHideTimer) clearTimeout(safeHideTimer);
        if(animFrameId) cancelAnimationFrame(animFrameId);

        const red = document.querySelector('.fzLight.red');
        const yellow = document.querySelector('.fzLight.yellow');
        const green = document.querySelector('.fzLight.green');

        if(!red){
            safeHideTimer = setTimeout(() => { if(!isHovering) fzWrapper.classList.add("fzHidden"); }, uiSettings.autoHideSeconds * 1000);
            return;
        }

        hideDuration = uiSettings.autoHideSeconds * 1000;
        hideStartTime = Date.now();

        function loop(){
            if(isHovering || extWin) return;
            const elapsed = Date.now() - hideStartTime;
            const remaining = Math.max(0, hideDuration - elapsed);
            const pct = (remaining / hideDuration) * 100;

            red.classList.remove('active');
            yellow.classList.remove('active');
            green.classList.remove('active');

            if(pct > 40) green.classList.add('active');
            else if(pct > 20) yellow.classList.add('active');
            else if(pct > 0) red.classList.add('active');

            if(remaining > 0) animFrameId = requestAnimationFrame(loop);
            else fzWrapper.classList.add("fzHidden");
        }

        animFrameId = requestAnimationFrame(loop);
        safeHideTimer = setTimeout(() => {
            if(!isHovering && !extWin){
                fzWrapper.classList.add("fzHidden");
                if(animFrameId) cancelAnimationFrame(animFrameId);
            }
        }, hideDuration);
    }

    function resetCountdown(){
        isHovering = true;
        if(safeHideTimer) clearTimeout(safeHideTimer);
        if(animFrameId) cancelAnimationFrame(animFrameId);
        const red = document.querySelector('.fzLight.red');
        const yellow = document.querySelector('.fzLight.yellow');
        const green = document.querySelector('.fzLight.green');
        if(green){
            red.classList.remove('active');
            yellow.classList.remove('active');
            green.classList.add('active');
        }
    }

    function togglePopout(){
        if(extWin && !extWin.closed){
            extWin.close();
            extWin = null;
            return;
        }

        const w = 800, h = 600;
        const l = Math.round((window.screen.width/2) - (w/2));
        const t = Math.round((window.screen.height/2) - (h/2));

        extWin = window.open("", "FzDashboard", `width=${w},height=${h},top=${t},left=${l},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,popup=yes`);
        if(!extWin){
            alert("Popup konnte nicht geöffnet werden. Bitte Popup-Blocker prüfen.");
            return;
        }

        extWin.document.open();
        extWin.document.write(`<html><head><title>Leitstelle Dashboard</title><style id="fzStylesExt">${cssContent}</style><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"></head><body class="fzExternal"></body></html>`);
        extWin.document.close();

        if(fzWrapper){
            setTimeout(() => {
                if(extWin && !extWin.closed){
                    extWin.document.body.appendChild(fzWrapper);
                    fzWrapper.classList.remove("fzHidden");
                }
            },100);
        }

        extWin.onbeforeunload = () => {
            if(fzWrapper) document.body.appendChild(fzWrapper);
            extWin = null;
        };
    }

    function renderAvailabilityIndicator(){
        const el = getTargetDoc().getElementById("fzAvailIndicator");
        if(!el) return;
        const s = getAvailabilitySummary();
        el.innerHTML = `✓ ${s.green} &bull; ⧗ ${s.orange} &bull; ✗ ${s.red}`;
        if(s.red === 0 && s.orange === 0){
            el.style.color = "#1a7f37";
            el.style.borderColor = "#1a7f37";
            el.title = "Alle verfügbar";
        } else if(s.red === 0 && s.orange > 0){
            el.style.color = "#8a6d3b";
            el.style.borderColor = "#f0ad4e";
            el.title = `Nicht verfügbar: ${s.orange}`;
        } else {
            el.style.color = "#b00020";
            el.style.borderColor = "#b00020";
            el.title = `Fehlt: ${s.red}, Nicht verfügbar: ${s.orange}`;
        }
    }

    function showMissingAvailabilityModal(){
        const s = getAvailabilitySummary();
        const section = (title,arr,color) => `<h4 style="margin:12px 0 6px 0;">${title} (${arr.length})</h4>${arr.length?arr.map(k=>`<div class="fzRow"><span>${escapeHTML(k)}</span><b style="color:${color};">${title}</b></div>`).join(""):`<div style="padding:10px;text-align:center;color:#999;">Keine</div>`}`;

        const ol = document.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = (e) => { if(e.target === ol) ol.remove(); };
        ol.innerHTML = `<div class="fzModal" style="max-width:520px;width:90%;"><h3>Verfügbarkeit</h3>${section("Nicht verfügbar",s.notAvailButExist,"#8a6d3b")}${section("Fehlt",s.notExist,"#b00020")}<button class="fzBtn" style="margin-top:15px;width:100%" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button></div>`;
        getTargetBody().appendChild(ol);
    }

    function createFloatingToggleButton(){
        if(!isMainPage) return;
        const toggleBtn = document.createElement("div");
        toggleBtn.className = "fzToggleBtn";
        toggleBtn.id = "fzFloatingToggle";
        toggleBtn.innerHTML = SVGS.dashboard;
        toggleBtn.title = "Dashboard ein/ausblenden";
        toggleBtn.style.cssText = "top:6px!important;left:6px!important;position:fixed!important;z-index:100001;";

        function syncBtnVisibility(){
            if(document.hidden){ toggleBtn.classList.add("fzBtnHidden"); return; }
            const p = window.location.pathname;
            const onMap = (p === "/" || p === "/index" || p.length < 2 || p.includes("/leitstellenansicht"));
            if(onMap) toggleBtn.classList.remove("fzBtnHidden");
            else toggleBtn.classList.add("fzBtnHidden");
        }

        document.addEventListener("visibilitychange", syncBtnVisibility);
        window.addEventListener("popstate", syncBtnVisibility);
        window.addEventListener("hashchange", syncBtnVisibility);

        (function(){
            const _push = history.pushState.bind(history);
            const _replace = history.replaceState.bind(history);
            let _deb = null;
            const debouncedSync = () => { clearTimeout(_deb); _deb = setTimeout(syncBtnVisibility, 250); };
            history.pushState = function(){ _push.apply(history,arguments); debouncedSync(); };
            history.replaceState = function(){ _replace.apply(history,arguments); debouncedSync(); };
        })();

        syncBtnVisibility();
        toggleBtn.addEventListener("click", () => {
            if(!fzWrapper) return;
            if(fzWrapper.classList.contains("fzHidden")){
                fzWrapper.classList.remove("fzHidden");
                resetCountdown();
            } else {
                fzWrapper.classList.add("fzHidden");
            }
        });

        document.body.appendChild(toggleBtn);
    }

    function initUI(state){
        if(fzWrapper || !isMainPage) return;
        injectCSS();

        fzWrapper = document.createElement("div");
        fzWrapper.className = "fzWrapper";
        if(uiSettings.compactMode) fzWrapper.classList.add("fzCompact");

        fzWrapper.onmouseleave = () => startCountdown();
        fzWrapper.onmouseenter = () => { resetCountdown(); fzWrapper.classList.remove("fzHidden"); };

        const fzHeader = document.createElement("div");
        fzHeader.className = "fzHeader";
        fzHeader.innerHTML = `<div class="fzHeaderLeft"><div style="display:flex;flex-direction:column;justify-content:center;gap:3px;"><div style="display:flex;gap:5px;align-items:center;flex-wrap:nowrap;"><div id="fzMissionStats" style="display:flex;gap:5px;align-items:center;">${getMissionStatsHTML()}</div><div id="fzAvailIndicator" class="fzHeaderPill" title="Verfügbarkeit">...</div><div id="fzAmpel" class="fzTrafficLight" title="Auto-Hide Timer"><div class="fzLight red"></div><div class="fzLight yellow"></div><div class="fzLight green active"></div></div><div id="fzResourcePills" style="display:flex;gap:5px;"></div></div><div class="fzSubInfoRow"><span id="fzSysStatus">Warte auf System...</span><span id="fzDispatcher"></span></div></div></div><div class="fzHeaderRight"><div id="fzRelocatedButtons"><a href="https://www.leitstellenspiel.de/buildings/26017007" target="_blank" class="fzHeadBtn" title="Leitstelle Bielefeld" style="text-decoration:none;color:inherit;">${SVGS.building}</a><a href="https://www.leitstellenspiel.de/leitstellenansicht" target="_blank" class="fzHeadBtn" title="Wachenübersicht" style="text-decoration:none;color:inherit;">${SVGS.building}</a><a href="https://www.leitstellenspiel.de/buildings/26794438#tab_projected_missions" target="_blank" class="fzHeadBtn" title="SAR Leitstelle" style="text-decoration:none;color:inherit;">${SVGS.anchor}</a><span class="fzHeadBtn" id="fzToggleCompact" title="Kompakt/Normal">${SVGS.eye}</span><span class="fzHeadBtn" id="fzGlobalCollapse" title="Kategorien alle auf/zu">${SVGS.collapse}</span><span class="fzHeadBtn" id="fzGlobalTileCollapse" title="Alle Kacheln ein-/ausklappen" style="font-size:16px;opacity:0.8;">▦</span><span class="fzHeadBtn" id="fzSettingsButton" title="Einstellungen">${SVGS.settings}</span><span class="fzHeadBtn" id="fzPopoutButton" title="Fenster">${SVGS.popout}</span><span class="fzHeadBtn" id="fzFullscreenButton" title="Vollbild">${SVGS.maximize}</span><span class="fzHeadBtn" id="fzMinimizeButton" title="Minimieren">${SVGS.minimize}</span></div></div>`;
        fzWrapper.appendChild(fzHeader);

        setTimeout(() => {
            const d = getTargetDoc();
            const ind = d.getElementById("fzAvailIndicator");
            const com = d.getElementById("fzToggleCompact");
            const min = d.getElementById("fzMinimizeButton");
            const set = d.getElementById("fzSettingsButton");
            const pop = d.getElementById("fzPopoutButton");
            const full = d.getElementById("fzFullscreenButton");
            const col = d.getElementById("fzGlobalCollapse");
            const gtc = d.getElementById("fzGlobalTileCollapse");

            if(ind) ind.onclick = showMissingAvailabilityModal;
            if(com) com.onclick = toggleCompactMode;
            if(min) min.onclick = (e) => { e.stopPropagation(); fzWrapper.classList.add("fzHidden"); };
            if(set) set.onclick = openSettings;
            if(pop) pop.onclick = togglePopout;
            if(full) full.onclick = toggleFS;
            if(col) col.onclick = () => {
                const collapsing = uiSettings.collapsedCats.length === 0;
                uiSettings.collapsedCats = collapsing ? [...CATEGORY_ORDER] : [];
                saveUI();
                redrawGrid();
            };

            function applyGlobalTileCompact(nowCompact){
                uiSettings.collapsedTilesCats = nowCompact ? [...CATEGORY_ORDER] : [];
                saveUI();

                [document, (extWin && !extWin.closed) ? extWin.document : null].forEach(doc => {
                    if(!doc) return;
                    const btn = doc.getElementById("fzGlobalTileCollapse");
                    if(btn) btn.textContent = nowCompact ? "▤" : "▦";
                });

                CATEGORY_ORDER.forEach(cat => {
                    const btnEl = document.getElementById("fzTileCollapse_" + cat);
                    if(btnEl){
                        btnEl.textContent = nowCompact ? "▤" : "▦";
                        btnEl.classList.toggle("fzTCactive", nowCompact);
                    }

                    (CAT_TILE_MAP[cat] || []).forEach(tileMeta => {
                        const el = tileEls[tileMeta.n];
                        if(!el) return;
                        if(nowCompact) el.classList.add("fzTileCompact");
                        else el.classList.remove("fzTileCompact");
                    });
                });
            }

            if(gtc) gtc.onclick = () => {
                const nowCompact = uiSettings.collapsedTilesCats.length < CATEGORY_ORDER.length;
                applyGlobalTileCompact(nowCompact);
            };

            renderAvailabilityIndicator();
            updateSubHeaderInfo();
        }, 500);

        setInterval(() => {
            if(document.hidden || (fzWrapper && fzWrapper.classList.contains("fzHidden") && !extWin)) return;
            const statsEl = getTargetDoc().getElementById("fzMissionStats");
            if(statsEl){
                const markup = getMissionStatsHTML();
                if(statsEl.innerHTML !== markup) statsEl.innerHTML = markup;
            }
        }, 3000);

        const scrollArea = document.createElement("div");
        scrollArea.className = "fzScrollArea";
        uiRoot = document.createElement("div");
        uiRoot.className = "fzGrid";

        redrawGrid = () => {
            uiRoot.innerHTML = "";
            for(let k in tileCache) delete tileCache[k];

            CATEGORY_ORDER.forEach(cat => {
                let list = CAT_TILE_MAP[cat] || [];
                if(list && list.length > 0){
                    let conf = (uiSettings.catHeaderMode === "category") ? (CAT_COLORS[cat] || "#333") : uiSettings.catHeaderBgColor;
                    let displayName = CAT_DISPLAY_NAMES[cat] || cat;
                    let isCollapsed = uiSettings.collapsedCats.includes(cat);
                    let isTileCompact = (uiSettings.collapsedTilesCats || []).includes(cat);
                    let metricHtml = "";

                    if(cat === "RD"){
                        const pV = state.today["Patienten"] || 0;
                        let kV = 0;
                        ["KTW","KTW Typ B","ITW","RTH [Christoph 13 (Bielefeld)]","RTH mit Winde","NAW"].forEach(k => { kV += (state.today[k] || 0); });
                        metricHtml += `<span class="fzCatBadge" id="fzBadge_RD_Pat">${ICONS.patient} ${pV}</span><span class="fzCatBadge" id="fzBadge_RD_KTW">${ICONS.ktp} ${kV}</span>`;
                    }
                    if(cat === "FW"){
                        let wasser = state.today["Wasserbedarf"] || 0;
                        metricHtml += `<span class="fzCatBadge" id="fzBadge_FW_Was" onclick="event.stopPropagation();document.querySelector('.fzTile[data-key=\\'Wasserbedarf\\']')?.click()">${ICONS.water} ${wasser.toLocaleString('de-DE')} L</span>`;
                    }
                    if(cat === "POL"){
                        const gef = state.today["Gefangene"] || 0;
                        metricHtml += `<span class="fzCatBadge" id="fzBadge_POL_Gef" onclick="event.stopPropagation();document.querySelector('.fzTile[data-key=\\'Gefangene\\']')?.click()">${ICONS.prisoner} ${gef}</span>`;
                    }
                    if(cat === "Luft"){
                        const heli = state.today["Helikopter"] || 0;
                        metricHtml += `<span class="fzCatBadge" id="fzBadge_Luft_Heli">${ICONS.heli} ${heli}</span>`;
                    }
                    if(cat === "Ausbildung"){
                        const schCount = schoolingsData.filter(s => !s.finishAt || s.finishAt > Date.now()).length;
                        metricHtml += `<span class="fzCatBadge" id="fzBadge_Aus_Count">${ICONS.school} ${schCount} aktiv</span>`;
                    }

                    let header = document.createElement("div");
                    header.className = "fzCatHeader";
                    header.id = "fzCatHead_" + cat;
                    header.style.backgroundColor = conf;

                    let utilBarHtml = ""; // Auslastungsbalken und Statustext in der Kategorie-Kopfzeile entfernt
                    const tcIcon = isTileCompact ? "▤" : "▦";
                    const tcActive = isTileCompact ? "fzTCactive" : "";

                    header.innerHTML = `<div style="display:flex;flex-direction:column;justify-content:center;min-width:140px;"><span style="line-height:1;">${escapeHTML(displayName)}</span>${utilBarHtml}</div><div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:auto;">${metricHtml}<span class="fzFocusBtn" title="Fokus">${ICONS.target}</span><span class="fzTileCollapseToggle ${tcActive}" id="fzTileCollapse_${cat}" title="${isTileCompact?"Ausklappen":"Einklappen"}">${tcIcon}</span><span>${isCollapsed?"&#x25B6;":"&#x25BC;"}</span></div>`;

                    header.onclick = (e) => {
                        if(e.target.classList.contains("fzTileCollapseToggle") || (e.target.closest && e.target.closest(".fzTileCollapseToggle"))){
                            e.stopPropagation();
                            toggleCategoryTileCompact(cat);
                            return;
                        }
                        if(e.target.classList.contains("fzFocusBtn") || e.target.closest(".fzFocusBtn")){
                            e.stopPropagation();
                            uiSettings.collapsedCats = CATEGORY_ORDER.filter(c => c !== cat);
                            saveUI();
                            redrawGrid();
                            return;
                        }
                        if(e.target.classList.contains("fzCatBadge") || e.target.closest(".fzCatBadge")) return;

                        uiSettings.collapsedCats = isCollapsed ? uiSettings.collapsedCats.filter(c => c !== cat) : [...uiSettings.collapsedCats,cat];
                        saveUI();
                        redrawGrid();
                    };

                    uiRoot.appendChild(header);

                    if(!isCollapsed){
                        list.forEach(tileMeta => {
                            const tileEl = createTile(tileMeta.n,state);
                            if(isTileCompact) tileEl.classList.add("fzTileCompact");
                            uiRoot.appendChild(tileEl);
                        });
                    }
                }
            });

            KEYS.forEach(k => updateTile(k,state));
            updateSchoolingTiles();
        };

        redrawGrid();
        scrollArea.appendChild(uiRoot);
        fzWrapper.appendChild(scrollArea);

        const footer = document.createElement("div");
        footer.className = "fzFooter";
        footer.textContent = uiSettings.footerText;
        fzWrapper.appendChild(footer);

        document.body.appendChild(fzWrapper);
        createFloatingToggleButton();
        startCountdown();
    }

    function registerEventListener(){
        if(typeof $ !== 'undefined'){
            $(document).on('radio_message', function(){
                requestUpdate(250);
            });
            $(document).on('mission_marker_add', function(){
                setTimeout(() => {
                    const statsEl = document.getElementById("fzMissionStats");
                    if(statsEl) statsEl.innerHTML = getMissionStatsHTML();
                }, 500);
            });
        }

        // Live-Statuswechsel direkt vom Spiel (Funk-Nachrichten)
        if(!hookRadio()){
            let tries = 0;
            const iv = setInterval(() => { if(hookRadio() || ++tries > 30) clearInterval(iv); }, 2000);
        }

        if(typeof sap !== 'undefined' && sap.audio_play){
            const originalAudioPlay = sap.audio_play;
            let apiDebounce = null;
            sap.audio_play = function(audio){
                originalAudioPlay.apply(this,arguments);
                if(audio && (String(audio).includes('fms') || String(audio).includes('radio'))){
                    if(apiDebounce) clearTimeout(apiDebounce);
                    requestUpdate(150);
                }
            };
        }
    }

    let lastRefreshTime = 0;
    function refreshAllVisibleTiles(){
        if(!isMainPage) return;
        const now = Date.now();
        if(now - lastRefreshTime < 2000) return; // Skip if called too recently
        lastRefreshTime = now;

        requestAnimationFrame(() => {
            KEYS.forEach(k => { if(tileEls[k]) updateTile(k, state); });
            updateCategoryHeaders();
            updateHeaderStats();
            renderAvailabilityIndicator();
            updateSubHeaderInfo();
        });
    }

    // CLICK LISTENER & INTERCEPTS
    const CLICK_PATTERNS = [
        { test: (url, text) => /\/patients?\/\d+\/hospitals?\/\d+/.test(url) || /\/missions\/\d+\/patients?\/\d+\/hospital/.test(url) || text.includes("ins krankenhaus"), action: "Patienten" },
        { test: (url, text) => /\/patients?\/\d+\/ambulances?\/\d+/.test(url) || /\/transports?\/\d+/.test(url) || text.includes("krankentransport"), action: "Krankentransporte" },
        { test: (url, text) => /\/prisoners?\/\d+\/cells?\/\d+/.test(url) || /\/missions\/\d+\/prisoners?\/\d+\/cell/.test(url) || text.includes("in zelle"), action: "Gefangene" }
    ];

    document.addEventListener("click", (e) => {
        const activeEl = e.target.closest("a[href],button,.vehicle_dispatch_button,.alarm_button,form button[type='submit'],[data-mission-id],[data-method],[data-confirm]");
        if(!activeEl) return;

        if(activeEl.classList.contains("alarm_button") || /alarm/i.test(activeEl.id || "")){
            requestUpdate(1200);
            setTimeout(() => requestUpdate(0), 4000);
        }

        const text = (activeEl.textContent || activeEl.value || "").trim().toLowerCase();
        const href = (activeEl.getAttribute("href") || "").toLowerCase();
        const formAction = (activeEl.closest("form")?.getAttribute("action") || "").toLowerCase();
        const urlStr = href || formAction;

        for (const pattern of CLICK_PATTERNS) {
            if (pattern.test(urlStr, text)) {
                // v4.7: POST/PUT wird erst nach erfolgreicher Serverantwort erfasst.
                // Nur echte Navigation ohne Formular kann als Fallback erfasst werden.
                // Navigation ist keine Serverbestaetigung; nur erfolgreiche API-Aktionen buchen.
                return;
            }
        }

        // AAO-Klicks sind keine bestaetigten Alarmierungen. Keine
        // Wasser-/Betreuungsstatistik ohne eindeutiges Erfolgsereignis.

        if(activeEl.classList.contains("vehicle_dispatch_button") || activeEl.hasAttribute("data-mission-id")){
            requestUpdate(1000); // FMS-Uebergang bestaetigt die Ausrueckung.
        }
    }, true);

    window.addEventListener("storage", (e) => {
        if(e.key === "fzgm_" + STORAGE.DAYSTAMP){
            state.today = store.load(STORAGE.COUNTS_TODAY);
            state.yday = store.load(STORAGE.YDAY_COUNTS);
            state.history = json.load(STORAGE.HISTORY_7DAYS, {});
            state.det = json.load(STORAGE.DETAILS_TODAY, {});
            refreshAllVisibleTiles();
        }
        if(e.key === STORAGE.SYNC_SIGNAL){
            state.today = store.load(STORAGE.COUNTS_TODAY);
            state.total = store.load(STORAGE.COUNTS_TOTAL);
            state.yday = store.load(STORAGE.YDAY_COUNTS);
            state.det = json.load(STORAGE.DETAILS_TODAY, {});
            refreshAllVisibleTiles();
        }
    });

    setInterval(() => {
        if(!isMainPage) return;
        if(checkVehicleDayReset(state)){
            KEYS.forEach(k => updateTile(k, state));
            updateAvailability();
            return;
        }
        if(!document.hidden || extWin) refreshAllVisibleTiles();
    }, 30000);

    // API INTERCEPTS (FETCH/XHR) – nur bestaetigte Aktionen zaehlen.
    const transportActionSeen = new Map();
    function recordTransportAction(action, url){
        checkVehicleDayReset(state);
        const normalized = String(url || "").split("?")[0].toLowerCase();
        const key = action + ":" + normalized;
        const now = Date.now();
        for(const [k,ts] of transportActionSeen){ if(now-ts > 5000) transportActionSeen.delete(k); }
        if(transportActionSeen.has(key)) return;
        transportActionSeen.set(key, now);
        incrementTileCount(action, null);
        if(action === "Patienten" || action === "Gefangene"){
            updateBuildingCapacities(true).then(() => {
                syncDerivedResourceCounts();
                if(isMainPage){
                    KEYS.forEach(k => tileEls[k] && updateTile(k, state));
                    updateCategoryHeaders();
                }
            }).catch(e => console.warn("[Bobelle] Kapazitaeten:",e));
        }
    }
    (function(){
        const handlers = [
            {pattern:/\/patients?\/.*\/hospitals?|\/missions\/\d+\/patients?\/\d+\/hospital/, action:"Patienten"},
            {pattern:/\/patients?\/.*\/ambulances?|\/transports?\//, action:"Krankentransporte"},
            {pattern:/\/prisoners?\/.*\/cells?|\/missions\/\d+\/prisoners?\/\d+\/cell/, action:"Gefangene"}
        ];
        const onSuccess = url => {
            const u = String(url || "").toLowerCase();
            if(/\/missions\/\d+\/alarm/.test(u)){
                setTimeout(() => requestUpdate(0), 800);
                setTimeout(() => requestUpdate(0), 3500);
            }
            const handler = handlers.find(h => h.pattern.test(u));
            if(handler) recordTransportAction(handler.action, u);
        };
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method,url){
            this.__fzTrackUrl = /^(POST|PUT|PATCH)$/i.test(String(method)) ? String(url) : null;
            return originalOpen.apply(this,arguments);
        };
        XMLHttpRequest.prototype.send = function(){
            if(this.__fzTrackUrl){
                const url = this.__fzTrackUrl;
                this.addEventListener("load", () => {
                    if(this.status >= 200 && this.status < 300) onSuccess(url);
                }, {once:true});
            }
            return originalSend.apply(this,arguments);
        };
        const originalFetch = window.fetch;
        window.fetch = function(input,init){
            const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
            const url = typeof input === "string" ? input : (input?.url || "");
            const result = originalFetch.apply(this,arguments);
            if(["POST","PUT","PATCH"].includes(method)){
                Promise.resolve(result).then(response => { if(response.ok) onSuccess(url); }).catch(() => {});
            }
            return result;
        };
    })();

    // START
    if(isMainPage){
        checkVehicleDayReset(state);
        const startDashboard = () => {
            try {
                initUI(state);
                registerEventListener();
            } catch (error) {
                console.error('[Bobelle Dashboard] Initialisierung fehlgeschlagen:', error);
                return;
            }
            setTimeout(() => {
                updateBuildingCapacities(true).catch(() => {}).then(() => { updateAvailability(); fetchSchoolings(); });
            }, 600);
            setTimeout(() => startApiLoop(), 1000);
            setTimeout(() => startSchoolingLoop(), 1500);
            // Der initiale Kapazitaetsabruf erfolgt bereits oben.
        };
        setTimeout(startDashboard, 100);
    }
})();
