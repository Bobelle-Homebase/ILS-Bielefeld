// ==UserScript==
// @name         Dashboard (Bielefeld Edition)
// @namespace    https://leitstellenspiel.de/dashboard
// @license      Design by Bobelle
// @author       Design by Bobelle
// @version      v1.0.16
// @description  Full All in One
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard.User.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard.User.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
 
    // 1. CSS Styles (z.B. für FIX #12)
    // GM_addStyle('.navbar-brand { position: fixed; ... }');

    // 2. Deine Funktionen für die Ressourcen (RES-FIX #1 bis #9)
    // Hier den Code einfügen, der Patienten/Gefangene aus cachedCapacities liest [4].

    // 3. Deine Fahrzeug-Korrekturen (FIX #1 bis #13)
    // Hier die ID-Korrekturen für MTF-L (107) oder Anh 12 Lbw (178) einbauen [4, 6].

    console.log("Dashboard Logik geladen!");

    const VEHICLE_MATCH_CACHE = {
        _map: new Map(), _max: 5000,
        get(key) { return this._map.get(key); },
        set(key, val) {
            if (this._map.size >= this._max) {
                const iter = this._map.keys();
                for(let i = 0; i < 100; i++) this._map.delete(iter.next().value);
            }
            this._map.set(key, val);
        }
    };
    const CFG = { zIndex: 99999 };
    const DEBOUNCE_TIME = 100;

    const ICONS = {
        patient: "👨‍⚕️", prisoner: "👮", alarm: "🚨", ktp: "🚑", supply: "🥘",
        person: "👤", target: "⌖", alliance: "🤝", event: "🎉", water: "💧", heli: "🚁", school: "🎓"
    };

    const C_FW = "#b00000", C_RD = "#FF9D0A", C_POL = "#54B509", C_THW = "#00387b";
    const C_SEG = "#FFD7A8", C_WR = "#004F9F", C_SR = "#004F9F";
    const C_LUFT = "#5e879e", C_RES = "#5a5a5a", C_AUS = "#7b3fa0";

    const CAT_COLORS = {
        "Luft": C_LUFT, "FW": C_FW, "RD": C_RD, "POL": C_POL, "THW": C_THW, "SEG": C_SEG,
        "WerkFW": "#b00000", "FlugFW": "#b00000", "UAS": "#9b9b9b", "BergRett": "#B0AC97",
        "WasserRett": C_WR, "SeenotRett": C_SR, "BahnRett": "#5a5a5a", "Netz": "#5a5a5a", "Versorgung": "#b00000",
        "Ressourcen": C_RES, "Ausbildung": C_AUS, "Sonstiges": "#b00000"
    };

    const CAT_DISPLAY_NAMES = {
        "Luft": "Luftlagezentrum", "FW": "Feuerwehr", "RD": "Rettungsdienst", "POL": "Polizei",
        "THW": "Technisches Hilfswerk", "SEG": "Schnelleinsatzgruppe", "WerkFW": "Werkfeuerwehr",
        "FlugFW": "Flughafenfeuerwehr", "UAS": "UAS", "WasserRett": "Wasserrettung",
        "SeenotRett": "Seenotrettung", "BergRett": "Bergrettung", "BahnRett": "Bahnrettung",
        "Netz": "Netzversorgung", "Sonstiges": "Feuer-und Rettungswachen & Kreispolizeibehörden", "Versorgung": "Versorgung",
        "Ressourcen": "Einsatz-Statistik", "Ausbildung": "Ausbildung & Lehrgänge"
    };

    const CATEGORY_ORDER = [
        "Luft","FW","RD","POL","THW","SEG","WerkFW","FlugFW","UAS",
        "BergRett","WasserRett","SeenotRett","BahnRett","Netz","Sonstiges","Versorgung",
        "Ressourcen","Ausbildung"
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
        { n:"FwK", id:57, c:C_FW, cat:"FW", s:["fwk","kran"]},
        { n:"TLF", id:[17,18,87], c:C_FW, cat:"FW", s:["tlf"]},
        { n:"GTLF", id:121, c:C_FW, cat:"FW", s:["gtlf","großtank"]},
        { n:"PTLF 4000", id:166, c:C_FW, cat:"FW", s:["ptlf4000","ptlf"]},
        { n:"Kleintankwagen", id:118, c:C_FW, cat:"FW", s:["kleintankwagen"]},
        { n:"Tankwagen", id:120, c:C_FW, cat:"FW", s:["tankwagen"]},
        { n:"ELW 1", id:3, c:C_FW, cat:"FW", s:["elw 1"]},
        { n:"ELW 2", id:34, c:C_FW, cat:"FW", s:["elw 2"]},
        { n:"MTW", id:36, c:C_FW, cat:"FW", s:["mtw mannschaft","mannschaftstransport","mtw fw"]},
        { n:"SLF", id:167, c:C_FW, cat:"FW", s:["slf","sonderlöschfahrzeug"]},
        { n:"Dekon-P", id:53, c:C_FW, cat:"FW", s:["dekon-p"]},
        { n:"WLF", id:46, c:C_FW, cat:"FW", s:["wlf","wechsellader"]},
        { n:"Schlauchwagen", id:[13,14,15], c:C_FW, cat:"FW", s:["schlauchwagen","sw 1000","sw 2000","sw 2000tr"]},
        { n:"Anh Lüfter", id:115, c:C_FW, cat:"FW", s:["anh lüfter","anh-lüfter"]},
        { n:"GW-Lüfter", id:114, c:C_FW, cat:"FW", s:["gw-lüfter"]},
        { n:"AB-Lüfter", id:116, c:C_FW, cat:"FW", s:["ab-lüfter"]},
        { n:"Anh Schlauch", id:143, c:C_FW, cat:"FW", s:["anh schlauch"]},
        { n:"Anh Sonderlöschmittel", id:168, c:C_FW, cat:"FW", s:["sonderlöschmittel"]},
        { n:"GW-Atemschutz", id:5, c:C_FW, cat:"FW", s:["gw-a","gw-atemschutz"]},
        { n:"GW-Öl", id:10, c:C_FW, cat:"FW", s:["gw-öl"]},
        { n:"GW-Messtechnik", id:12, c:C_FW, cat:"FW", s:["gw-messtechnik"]},
        { n:"GW-Gefahrgut", id:27, c:C_FW, cat:"FW", s:["gw-gefahrgut"]},
        { n:"GW-L1", id:104, c:C_FW, cat:"FW", s:["gw-l1"]},
        { n:"GW-L2", id:[105,11], c:C_FW, cat:"FW", s:["gw-l2"]},
        { n:"GW-Höhenrettung", id:33, c:C_FW, cat:"FW", s:["gw-höhenrettung","gw-höhen fw"]},
        { n:"AB-Einsatzleitung", id:78, c:C_FW, cat:"FW", s:["ab-einsatz","ab-el"]},
        { n:"AB-Atemschutz", id:48, c:C_FW, cat:"FW", s:["ab-atemschutz"]},
        { n:"AB-Öl", id:49, c:C_FW, cat:"FW", s:["ab-öl"]},
        { n:"AB-Rüst", id:47, c:C_FW, cat:"FW", s:["ab-rüst"]},
        { n:"AB-Schlauch", id:62, c:C_FW, cat:"FW", s:["ab-schlauch"]},
        { n:"AB-Wasser/Schaum", id:170, c:C_FW, cat:"FW", s:["ab-wasser"]},
        { n:"AB-Dekon-P", id:54, c:C_FW, cat:"FW", s:["ab-dekon-p"]},
        { n:"AB-Gefahrgut", id:77, c:C_FW, cat:"FW", s:["ab-gefahrgut","ab-gefahr"]},
        { n:"AB-Tank", id:117, c:C_FW, cat:"FW", s:["ab-tank"]},
        { n:"AB-Lösch", id:119, c:C_FW, cat:"FW", s:["ab-lösch"]},
        { n:"AB-Sonderlöschmittel", id:169, c:C_FW, cat:"FW", s:["ab-sonderlöschmittel"]},
        { n:"AB-MzB", id:71, c:C_FW, cat:"FW", s:["ab-mzb"]},
        { n:"AB-Küche", id:142, c:C_FW, cat:"FW", s:["ab-küche"]},
        { n:"AB-L", id:106, c:C_FW, cat:"FW", s:["ab-l","ab-logistik"]},
        { n:"MTF-L", id:106, c:C_FW, cat:"Versorgung", s:["mtf-log","mtf-l"]},
        { n:"AB-NEA50 (FW)", id:[179], c:"#5a5a5a", cat:"Netz", s:["ab-nea50"]},
        { n:"AB-NEA200 (FW)", id:[180], c:"#5a5a5a", cat:"Netz", s:["ab-nea200"]},
        { n:"MTW-V", id:140, c:C_FW, cat:"Versorgung", s:["mtw-v","mtw verpflegung"]},
        { n:"GW-Verpflegung", id:138, c:C_FW, cat:"Versorgung", s:["gw-verpflegung"]},
        { n:"GW-Küche", id:139, c:C_FW, cat:"Versorgung", s:["gw-küche"]},

        { n:"RTW", id:28, c:C_RD, cat:"RD", s:["rtw"]},
        { n:"NEF", id:29, c:C_RD, cat:"RD", s:["nef"]},
        { n:"KTW", id:38, c:C_RD, cat:"RD", s:["ktw"]},
        { n:"NAW", id:74, c:C_RD, cat:"RD", s:["naw"]},
        { n:"ITW", id:97, c:C_RD, cat:"RD", s:["itw"]},
        { n:"KdoW-LNA", id:55, c:C_RD, cat:"RD", s:["lna"]},
        { n:"KdoW-OrgL", id:56, c:C_RD, cat:"RD", s:["orgl"]},
        { n:"GRTW", id:73, c:C_RD, cat:"RD", s:["grtw basis","grtw standard","grossraumrettungswagen"]},

        { n:"FuStW", id:32, c:C_POL, cat:"POL", s:["fustw","streifenwagen"]},
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
        { n:"Außenlastbehälter", id:96, c:C_POL, cat:"POL", s:["außenlast"]},

        { n:"MTF Drohne", id:126, c:"#9b9b9b", cat:"UAS", s:["mtf drohne","drohne"]},
        { n:"ELW Drohne", id:128, c:"#9b9b9b", cat:"UAS", s:["elw drohne"]},
        { n:"ELW 2 Drohne", id:129, c:"#9b9b9b", cat:"UAS", s:["elw 2 drohne"]},
        { n:"GW-UAS (Pilot Bobelle)", id:127, c:"#9b9b9b", cat:"UAS", s:["gw-uas"]},

        { n:"FLF", id:75, c:"#721c24", cat:"FlugFW", s:["flf","flugfeldlöschfahrzeug"]},
        { n:"Rettungstreppe", id:76, c:"#721c24", cat:"FlugFW", s:["rt","rettungstreppe"]},

        { n:"GW-Werkfeuerwehr", id:83, c:"#5a1a1f", cat:"WerkFW", s:["gw-werk"]},
        { n:"ULF mit Löscharm", id:84, c:"#5a1a1f", cat:"WerkFW", s:["ulf"]},
        { n:"TM 50", id:85, c:"#5a1a1f", cat:"WerkFW", s:["tm 50"]},
        { n:"Turbolöscher", id:86, c:"#5a1a1f", cat:"WerkFW", s:["turbo"]},

        { n:"Schmutzwasserpumpen", id:101, c:C_THW, cat:"THW", s:["schmutzwasserpumpe","swpu-fzg"]},
        { n:"Feuerlöschpumpen", id:[17,18,87], c:C_THW, cat:"THW", s:["feuerlöschpumpe","fp-fzg"]},
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

        { n:"Anh NEA50 (SEG)", id:[175], c:"#5a5a5a", cat:"Netz", s:["anh nea50 seg"]},
        { n:"Anh NEA50 (THW)", id:[110], c:"#5a5a5a", cat:"Netz", s:["anh nea50 thw"]},
        { n:"Anh NEA200 (THW)", id:[112], c:"#5a5a5a", cat:"Netz", s:["anh nea200 thw"]},
        { n:"Anh NEA50 (FW)", id:[111], c:"#5a5a5a", cat:"Netz", s:["anh nea50 fw"]},
        { n:"Anh NEA200 (FW)", id:[113], c:"#5a5a5a", cat:"Netz", s:["anh nea200 fw"]},

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
        { n:"SAR Hubschrauber", id:161, c:C_SR, cat:"SeenotRett", s:["sar hubschrauber"]},

        { n:"RW-Schiene", id:162, c:"#5a5a5a", cat:"BahnRett", s:["rw schiene","rw-schiene"]},
        { n:"HLF Schiene", id:163, c:"#5a5a5a", cat:"BahnRett", s:["hlf schiene"]},
        { n:"AB-Schiene", id:164, c:"#5a5a5a", cat:"BahnRett", s:["ab-schiene"]},

        { n:"Feuer-und Rettungswache Herford", id:[], c:"#b00000", cat:"Sonstiges", s:[], p:50, building_ids:[26943238]},
        { n:"Feuer-und Rettungswache Gütersloh", id:[], c:"#b00000", cat:"Sonstiges", s:[], p:50, building_ids:[26943286]},
        { n:"Feuer-und Rettungswache Halle(Westf.)", id:[], c:"#b00000", cat:"Sonstiges", s:[], p:50, building_ids:[26943328]},
        { n:"Feuer-und Rettungswache Stukenbrock", id:[], c:"#b00000", cat:"Sonstiges", s:[], p:50, building_ids:[26943379]},
        { n:"Kreispolizeibehörde Herford", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[26945351]},
        { n:"Kreispolizeibehörde Gütersloh", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[26945356]},
        { n:"Kreispolizeibehörde Halle(Westf.)", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[26945367]},
        { n:"Kreispolizeibehörde Stukenbrock", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[26945361]},
        { n:"Polizeibehörde Warnemünde", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[26979980]},
        { n:"Polizeibehörde Eckernförde", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[26979964]},
        { n:"Polizeibehörde Bremerhafen", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[26979987]},
        { n:"Rettungswache Warnemünde", id:[], c:C_POL, cat:"Sonstiges", s:[], p:10, building_ids:[26793826]},
        { n:"Rettungswache Eckernförde", id:[], c:C_POL, cat:"Sonstiges", s:[], p:10, building_ids:[26794114]},
        { n:"Rettungswache Bremerhafen", id:[], c:C_POL, cat:"Sonstiges", s:[], p:10, building_ids:[26794419]},
        { n:"DLRG Herford", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[27016223]},
        { n:"DLRG Gütersloh", id:[], c:C_POL, cat:"Sonstiges", s:[], p:30, building_ids:[27016182]},

        { n:"Patienten", id:[], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"Krankenhausbetten", id:[], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"Gefangene", id:[], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"Gefängniszellen", id:[], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"Wasserbedarf", id:[], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"Betreuung/Versorgung", id:[130,131,133], c:"#5a5a5a", cat:"Ressourcen", s:["bt-kombi","gw-bt","bt lkw"]},
        { n:"Krankentransporte", id:[38,58], c:"#5a5a5a", cat:"Ressourcen", s:["ktw"]},
        { n:"Helikopter", id:[31,157,61,156,161], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"Meine DJI Mini 4k (Pilot Bobelle)", id:[127,125], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Zugtrupp", id:[40], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Bergungsgruppe", id:[39], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Notversorgung", id:[41], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Räumen", id:[42,43,44,45], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Wassergefahren", id:[65,66,67,68,69], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Ortung", id:[92], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Wasserschaden/Pumpen", id:[101,102], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Schwere Bergung", id:[109], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Elektroversorgung", id:[112,122], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Führung und Kommunikation", id:[147], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Logistik-Verpflegung", id:[176,177], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"FG Brückenbau", id:[181,182,183], c:"#5a5a5a", cat:"Ressourcen", s:[]},
        { n:"OV Mannschaftstransportwagen", id:[124], c:"#5a5a5a", cat:"Ressourcen", s:[]},

        { n:"Laufende Lehrgänge", id:[], c:C_AUS, cat:"Ausbildung", s:[]},
        { n:"Aktive Lehrgänge", id:[], c:C_AUS, cat:"Ausbildung", s:[]},
    ];

    const SVGS = {
        dashboard:`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
        eye:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
        building:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="2" x2="9" y2="22"></line><line x1="15" y1="2" x2="15" y2="22"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="17" x2="20" y2="17"></line></svg>`,
        collapse:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 11 12 6 17 11"></polyline><polyline points="7 13 12 18 17 13"></polyline></svg>`,
        settings:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
        popout:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
        minimize:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        maximize:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`,
        anchor:`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"></circle><line x1="12" y1="22" x2="12" y2="8"></line><path d="M5 12H2a10 10 0 0 0 20 0h-3"></path></svg>`
    };

    const DEFAULTS = {
        columns:4, autoHideSeconds:30, clickIncrement:1, compactMode:false,
        winMaxHeight:700, winTop:60, winBg:"#f8f9fa", winBorderC:"#e9ecef", winBorderW:1, winRadius:0,
        headBg:"#e9ecef", headColor:"#343a40", headSize:15, headAlign:"left",
        logoSize:35, logoUrl:"https://feuerwehr-bielefeld.de/wp-content/uploads/2019/05/cropped-Feuerwehr-Bielefeld-Logo-1.png",
        catHeaderMode:"category", catHeaderBgColor:"#000000", catHeaderTextColor:"#ffffff",
        catHeaderSize:12, catHeaderPadding:5,
        catStatusTextColor:"#ffffff", catStatusTextSize:10,
        tileBgColor:"#ffffff", tileTextColor:"#000000", resourceTileBgColor:"#c8c8c8",
        barColor:"#0000ff", tileMinHeight:65, tileGap:0,
        tileNameSize:13, tileNameWeight:"normal",
        badgeSize:12, badgeAlign:"left", badgeTopMargin:2,
        tileCounterSize:17, numTodayColor:"#0000ff",
        numYdayColor:"#6c757d", resCounterColor:"#000000", resCounterSize:16,
        tileColorInUse:"#fef9e7", tileColorEmpty:"#fce4ec",
        trendColorUp:"#00cc00", trendColorDown:"#ff0000", trendColorEq:"#6c757d",
        statsMissionsColor:"#000000", statsMissionsSize:12,
        statsKtpColor:"#000000", statsKtpSize:12,
        statsActiveColor:"#00cc00", statsActiveSize:12,
        subStatusSize:10, subStatusWeight:"normal", subStatusColorOk:"#00cc00", subStatusColorErr:"#ff0000",
        subUpdateSize:10, subUpdateWeight:"normal", subUpdateColor:"#555555",
        subDispSize:10, subDispWeight:"normal", subDispColor:"#555555",
        headerElementSize:12, pillBgColor:"#ffffff", pillTextColor:"#000000",
        creditsGap:6, creditsFontSize:13, creditsLabelColor:"#333333", creditsValueColor:"#00cc00",
        funkalarmText:"Alarmierung", funkalarmSize:10, funkalarmColor:"#555555", funkalarmBold:false,
        funkalarmBlinkColor:"#ff0000", funkalarmBlinkDuration:240,
        toggleBtnSize:44, toggleBtnBg:"#b00000", toggleBtnBorderC:"#ffffff", toggleBtnBorderW:2,
        fmsFontSize:11, fmsHeight:1, fmsGap:4, debugMode:false, apiInterval:30,
        tileIdPrefix:"ID: ", tileIdSize:10, tileIdColor:"#999999", tileIdAlign:"right",
        tileStatsMode:"both", tileBarReference:"yday", showTileTrend:true, showTileYday:true,
        resourceCounterMode:"all", numAlign:"right", tileSortOrder:"category",
        activeCategoryFilter:"all", searchFilter:"", collapsedCats:[], collapsedTilesCats:[],
        footerText:"Design & Optimized by Bobelle v1.0.14", footerColor:"#1e90ff", footerSize:9, footerAlign:"center",
        schoolingApiInterval:120,
        tileImgSize:38, tileImgAlign:"right"
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
        TOGGLE_BTN_POS:"fz_toggle_btn_pos",
        TILE_IMAGES:"fz_v3_tile_images"
    };

    let tileImages = {};
    const TILE_IMAGES_DEFAULT = {};

    const TYPE_ID_MAPPING = {};
    AAO_TILES_RAW.forEach(tile => {
        if (tile.id !== undefined && tile.id !== null) {
            const ids = Array.isArray(tile.id) ? tile.id : [tile.id];
            ids.forEach(i => {
                if (!i && i !== 0) return;
                if (!TYPE_ID_MAPPING[i]) TYPE_ID_MAPPING[i] = [];
                TYPE_ID_MAPPING[i].push(tile.n);
            });
        }
    });

    const pathLoc = window.location.pathname;
    const isMainPage = ((pathLoc==="/"||pathLoc==="/index"||pathLoc.length<2)||pathLoc.includes("/leitstellenansicht"));

    const NORM_REGEX = /[^a-z0-9äöü]/g;
    const normalize = (s) => (s||"").toLowerCase().replace(NORM_REGEX,"");

    const TILE_LIST = AAO_TILES_RAW.map(t=>({...t, norm:normalize(t.n), search:(t.s||[]).map(normalize), cat:t.cat}));
    const KEYS = AAO_TILES_RAW.map(t=>t.n);
    const tileMetaByKey = Object.fromEntries(AAO_TILES_RAW.map(t=>[t.n,t]));

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
    const FMS_TEXT_COLORS = {3:"#000"};

    let apiTimer=null, schoolingTimer=null;
    let sysReady=true, lastUpdateStr="--:--:--", isUpdating=false;
    let lastCreditsUpdate=0;
    let creditsData={ein:0,aus:0,bilanz:0,date:""};

    const tileCache={};
    const nameCache={};
    const vehicleStateCache={};
    let lastAlarmTime={};
    let saveTimeout=null;
    const alarmTimers={};
    const heliAlreadyCountedThisSession=new Set();
    const ktpAlreadyCountedThisSession=new Set();

    let schoolingsData=[];
    let buildingNameCache={};
    let lastSchoolingsUpdate=0;
    let _restzeitTimerId=null;
    let _buildingsFullyLoaded=false;

    function formatRestzeit(finishAtMs) {
        const diff=finishAtMs-Date.now();
        if(diff<=0) return "✅ Fertig";
        const h=Math.floor(diff/3600000);
        const m=Math.floor((diff%3600000)/60000);
        if(h>0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function parseTwoNumbers(text) {
        const m=(text||"").match(/(\d+)\s*\/\s*(\d+)/);
        if(!m) return {a:0,b:0};
        return {a:parseInt(m[1],10),b:parseInt(m[2],10)};
    }

    function getCounts(sel){
        const el=document.querySelector(sel);
        return el?parseTwoNumbers(el.textContent):{a:0,b:0};
    }

    function getStartedCount(sel){
        const el=document.querySelector(sel);
        if(!el) return 0;
        const c=el.querySelector(".counter");
        const txt=(c?c.textContent:el.textContent)||"0";
        const m=txt.replace(/\s+/g,"").match(/\d+/);
        return m?parseInt(m[0],10):0;
    }

    function getMissionStatsHTML(){
        const em=getCounts(MISSION_SELECTORS.emergency);
        const ktp=getCounts(MISSION_SELECTORS.ktp);
        const started=getStartedCount(MISSION_SELECTORS.started);
        return `<span class="fzHeaderPill" style="color:${uiSettings.statsMissionsColor};font-size:${uiSettings.statsMissionsSize}px;font-weight:bold;">Einsätze: ${em.a}/${em.b}</span>
               <span class="fzHeaderPill" style="color:${uiSettings.statsKtpColor};font-size:${uiSettings.statsKtpSize}px;font-weight:bold;">KTW: ${ktp.a}/${ktp.b}</span>
               <span class="fzHeaderPill" style="color:${uiSettings.statsActiveColor};font-size:${uiSettings.statsActiveSize}px;font-weight:bold;">Aktiv: ${started}</span>`;
    }

    const json={
        load(key,fallback){
            try{
                const v=GM_getValue(key,"");
                return v===""?fallback:(JSON.parse(v)||fallback);
            }catch{
                return fallback;
            }
        },
        save(key,val){GM_setValue(key,JSON.stringify(val));}
    };

    const store={
        load:(key)=>{
            const o=json.load(key,{});
            KEYS.forEach(k=>{if(o[k]==null)o[k]=0;});
            return o;
        },
        save:()=>{
            if(saveTimeout) clearTimeout(saveTimeout);
            saveTimeout=setTimeout(()=>{
                json.save(STORAGE.COUNTS_TODAY,state.today);
                json.save(STORAGE.COUNTS_TOTAL,state.total);
                json.save(STORAGE.DETAILS_TODAY,state.det);
                localStorage.setItem(STORAGE.SYNC_SIGNAL,Date.now().toString());
            },800);
        }
    };

    creditsData=json.load(STORAGE.CREDITS_DATA,{ein:0,aus:0,bilanz:0,date:""});
    const customStock=json.load(STORAGE.CUSTOM_STOCK,{});
    tileImages={...TILE_IMAGES_DEFAULT,...json.load(STORAGE.TILE_IMAGES,{})};
    const saveTileImages=()=>json.save(STORAGE.TILE_IMAGES,tileImages);

    let uiSettings={...DEFAULTS,...json.load(STORAGE.UISETTINGS,{})};
    for(const k in DEFAULTS){if(uiSettings[k]===undefined) uiSettings[k]=DEFAULTS[k];}
    if(!Array.isArray(uiSettings.collapsedTilesCats)) uiSettings.collapsedTilesCats=[];

    const saveUI=()=>json.save(STORAGE.UISETTINGS,uiSettings);
    const getTodayString=()=>new Date().toLocaleDateString("de-DE");

    let vehicleAvailability={},vehicleExists={},vehicleInUseCount={},vehicleTotalCount={},vehicleFreeCount={};
    let hasFreeCountData=false,vehicleLists={};
    let state={
        today:store.load(STORAGE.COUNTS_TODAY),
        total:store.load(STORAGE.COUNTS_TOTAL),
        yday:store.load(STORAGE.YDAY_COUNTS),
        history:json.load(STORAGE.HISTORY_7DAYS,{}),
        det:json.load(STORAGE.DETAILS_TODAY,{})};
    if(state.today["Wasserbedarf"]&&state.today["Wasserbedarf"]<500){ state.today["Wasserbedarf"]=0; store.save();}

    let fzWrapper,uiRoot,tileEls={},extWin=null,cssContent="",lastCSSHash="";
    let animFrameId=null,hideStartTime=null,hideDuration=0,safeHideTimer=null,isHovering=false;
    let redrawGrid=()=>{};
    let cachedCapacities={beds:0,cells:0,bedsUsed:0,cellsUsed:0};
    let lastBuildingUpdate=0;

    function _setEl(id,html){
        const el=document.getElementById(id);
        if(el && el.innerHTML!==html){
            el.innerHTML=html;
            return true;
        }
        return false;
    }

    function toArray(data){
        if(Array.isArray(data)) return data;
        if(data&&typeof data==="object"){
            for(const key of Object.keys(data)){
                if(Array.isArray(data[key])) return data[key];}}
        return [];
    }

    async function ensureBuildingNames(buildingIds){
        if(_buildingsFullyLoaded || buildingIds.length === 0) return;
        const missingIds = buildingIds.filter(id => !buildingNameCache[id]);
        if(missingIds.length === 0) return;
        try{
            const bRes = await fetch("/api/buildings", {credentials: "same-origin"});
            if(bRes.ok){
                const buildings = await bRes.json();
                buildings.forEach(b => { buildingNameCache[b.id] = b.caption || ("Wache #" + b.id); });
                _buildingsFullyLoaded = true;
            }
        }catch(e){ console.warn("[Bobelle] Gebäude-Fetch fehlgeschlagen:", e); }
    }

    async function fetchSchoolings(){
        try{
            const ownRes=await fetch("/api/schoolings",{credentials:"same-origin"});
            let own=[];
            if(ownRes.ok){
                try{own=toArray(await ownRes.json());}catch(e){own=[];}
            }
            const buildingIds=[...new Set(own.map(s=>s.building_id).filter(Boolean))];
            await ensureBuildingNames(buildingIds);
            const now=Date.now();

            schoolingsData=own.map(s=>({
                id:s.id,
                caption:s.caption||s.name||"Lehrgang/Schulung",
                description:s.description||s.schooling_description||s.type_name||"",
                buildingId:s.building_id,
                buildingName:buildingNameCache[s.building_id]||("Wache #"+(s.building_id||"?")),
                finishAt:s.finish_at?new Date(s.finish_at).getTime():(s.end_time?new Date(s.end_time).getTime():null),
                startAt:s.start_at?new Date(s.start_at).getTime():null,
                source:"eigen",
                participantCount:s.participant_count||s.attendee_count||0
            })).filter(s=>!s.finishAt||s.finishAt>now-60000);

            lastSchoolingsUpdate=now;
            updateSchoolingTiles();
        }catch(e){
            console.warn("[Bobelle] Schoolings fetch error:",e);
        }
    }

    function updateSchoolingTiles(){
        if(_restzeitTimerId) clearTimeout(_restzeitTimerId);
        const now=Date.now();
        const active=schoolingsData.filter(s=>!s.finishAt||s.finishAt>now);
        const count=active.length;

        ["Laufende Lehrgänge","Aktive Lehrgänge"].forEach(key=>{
            const cached=tileCache[key];
            if(!cached) return;
            const badge=cached.schoolingBadge;
            const sub=cached.schoolingSub;
            if(badge) badge.textContent=`${ICONS.school} ${count} aktiv`;
            if(sub){
                if(active.length===0){
                    sub.textContent="Keine Lehrgänge aktiv";
                }else{
                    const earliest=active.reduce((a,b)=>(a.finishAt&&b.finishAt)?(a.finishAt<b.finishAt?a:b):(a.finishAt?a:b));
                    const label=key==="Aktive Lehrgänge"?"Nächster":"Nächster Abschluss";
                    sub.textContent=`${label}: ${formatRestzeit(earliest.finishAt)}`;
                }
            }
        });

        _restzeitTimerId=setTimeout(updateSchoolingTiles,30000);
    }

    function createSchoolingTile(key){
        const meta=tileMetaByKey[key];
        const color=meta?.c||C_AUS;
        const div=document.createElement("div");
        div.className="fzTile fzResource fzSchoolingTile";
        div.dataset.key=key;
        div.style.borderLeftColor=color;
        div.style.cursor="pointer";

        const badge=document.createElement("span");
        badge.className="fzSchoolingBadge";
        badge.style.cssText=`font-size:12px;font-weight:bold;color:${color};`;
        badge.textContent=`${ICONS.school} Lade...`;

        const sub=document.createElement("div");
        sub.className="fzSchoolingSub";
        sub.style.cssText="font-size:10px;color:#666;margin-top:2px;";
        sub.textContent="Bitte warten...";

        const nameSpan=document.createElement("span");
        nameSpan.className="fzTileName";
        nameSpan.style.cssText=`font-weight:bold;color:${color};`;
        nameSpan.textContent=key;

        const topRow=document.createElement("div");
        topRow.style.cssText="display:flex;align-items:center;gap:6px;margin-bottom:3px;";

        const iconSpan=document.createElement("span");
        iconSpan.style.fontSize="16px";
        iconSpan.textContent=ICONS.school;

        topRow.appendChild(iconSpan);
        topRow.appendChild(nameSpan);

        const wrapper=document.createElement("div");
        wrapper.className="fzContentWrapper";
        wrapper.style.cssText="justify-content:flex-start;padding:4px 0;";
        wrapper.appendChild(topRow);
        wrapper.appendChild(badge);
        wrapper.appendChild(sub);

        div.appendChild(wrapper);
        div.onclick=()=>showSchoolingDetails();

        tileEls[key]=div;
        tileCache[key]={el:div,lastState:null,schoolingBadge:badge,schoolingSub:sub};
        return div;
    }

    function showSchoolingDetails(){
        const now=Date.now();
        const active=schoolingsData.filter(s=>!s.finishAt||s.finishAt>now);
        const done=schoolingsData.filter(s=>s.finishAt&&s.finishAt<=now);

        const renderRow=(s)=>{
            const rest=s.finishAt?formatRestzeit(s.finishAt):"–";
            const isUrgent=s.finishAt&&(s.finishAt-now)<3600000;
            const isDone=s.finishAt&&s.finishAt<=now;
            const restColor=isDone?"#28a745":(isUrgent?"#dc3545":"#28a745");
            let progressHtml="";

            if(s.startAt&&s.finishAt&&!isDone){
                const total=s.finishAt-s.startAt;
                const elapsed=now-s.startAt;
                const pct=Math.min(100,Math.max(0,Math.round((elapsed/total)*100)));
                progressHtml=`<div style="margin-top:4px;height:4px;background:#e0e0e0;border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${C_AUS};border-radius:2px;"></div></div><div style="font-size:9px;color:#999;margin-top:1px;">${pct}% abgeschlossen</div>`;
            }

            const typBadge=s.description?`<span style="font-size:9px;background:rgba(123,63,160,0.15);color:${C_AUS};padding:1px 5px;border-radius:3px;margin-left:5px;font-weight:bold;">${s.description}</span>`:"";
            const pCount=s.participantCount>0?`<span style="font-size:10px;color:#888;margin-left:6px;">${ICONS.person} ${s.participantCount}</span>`:"";

            return `<div style="padding:8px 10px;border-radius:5px;margin-bottom:6px;background:rgba(123,63,160,0.07);border-left:3px solid ${C_AUS};"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;"><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:bold;">${s.caption}${typBadge}</div><div style="font-size:10px;color:#555;margin-top:2px;">📍 ${s.buildingName}${pCount}</div>${progressHtml}</div><div style="font-size:13px;font-weight:bold;color:${restColor};flex-shrink:0;">${rest}</div></div></div>`;
        };

        const ol=document.createElement("div");
        ol.className="fzModalOverlay";
        ol.onclick=(e)=>{if(e.target===ol)ol.remove();};

        const updStr=lastSchoolingsUpdate?new Date(lastSchoolingsUpdate).toLocaleTimeString("de-DE"):"–";
        const captionGroups={};
        active.forEach(s=>{if(!captionGroups[s.caption])captionGroups[s.caption]=0;captionGroups[s.caption]++;});

        ol.innerHTML=`<div class="fzModal" style="max-width:620px;width:92%;"><h3>${ICONS.school} Eigene Lehrgänge</h3><div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;"><div class="fzStatBox"><div class="fzStatVal" style="color:${C_AUS};">${active.length}</div><div class="fzStatLbl">Aktiv</div></div><div class="fzStatBox"><div class="fzStatVal" style="color:#6c757d;">${Object.keys(captionGroups).length}</div><div class="fzStatLbl">Verschiedene Typen</div></div><div class="fzStatBox"><div class="fzStatVal" style="color:#28a745;">${done.length}</div><div class="fzStatLbl">Heute fertig</div></div><div class="fzStatBox"><div class="fzStatVal" style="font-size:13px;color:#555;">${updStr}</div><div class="fzStatLbl">Letztes Update</div></div></div>${active.length>0?`<div class="fzSectionTitle">Aktive Lehrgänge (${active.length})</div><div style="max-height:340px;overflow-y:auto;">${active.sort((a,b)=>(a.finishAt||Infinity)-(b.finishAt||Infinity)).map(renderRow).join("")}</div>`:`<div style="padding:20px;text-align:center;color:#999;">Keine aktiven Lehrgänge.</div>`}${done.length>0?`<div class="fzSectionTitle" style="margin-top:12px;">Heute abgeschlossen (${done.length})</div><div style="max-height:150px;overflow-y:auto;">${done.map(renderRow).join("")}</div>`:""}<div style="margin-top:10px;display:flex;gap:8px;"><button class="fzBtn" style="flex:1;" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button><button class="fzBtn" style="flex:1;" onclick="window.open('/schoolings','_blank')">📋 Alle Lehrgänge</button><button class="fzBtn" style="background:#edf3ff;flex:0.5;" id="fzSchoolingRefreshBtn">🔄</button></div></div>`;

        setTimeout(()=>{
            const rb=ol.querySelector("#fzSchoolingRefreshBtn");
            if(rb) rb.onclick=async()=>{
                rb.textContent="⏳";
                await fetchSchoolings();
                rb.textContent="✅";
                setTimeout(()=>{rb.textContent="🔄";},2000);
            };
        },50);

        getTargetBody().appendChild(ol);
    }

    function updateSubHeaderInfo(){
        const sysEl=document.getElementById("fzSysStatus");
        const updEl=document.getElementById("fzLastUpdate");
        const dispEl=document.getElementById("fzDispatcher");
        if(!sysEl||!updEl||!dispEl) return;

        sysEl.textContent=sysReady?"Leitstelle betriebsbereit":"Leitstelle offline / inaktiv";
        sysEl.style.color=sysReady?uiSettings.subStatusColorOk:uiSettings.subStatusColorErr;
        updEl.textContent="Letztes Update: "+lastUpdateStr;

        if(isUpdating) updEl.classList.add("fzUpdatingAnim");
        else updEl.classList.remove("fzUpdatingAnim");

        const rankEl=document.getElementById("current_level");
        dispEl.innerHTML=`Disposition: Bobelle <span style="margin-left:5px;">${rankEl?rankEl.textContent.trim():"Unbekannt"}</span>`;
    }

    function checkVehicleDayReset(currentState){
        const today=getTodayString();
        if(GM_getValue(STORAGE.DAYSTAMP,"")!==today){
            const oldToday=store.load(STORAGE.COUNTS_TODAY);
            let hist=json.load(STORAGE.HISTORY_7DAYS,{});
            for(const k in oldToday){
                if(!hist[k]) hist[k]=[];
                hist[k].unshift(oldToday[k]);
                if(hist[k].length>7) hist[k]=hist[k].slice(0,7);
            }
            json.save(STORAGE.HISTORY_7DAYS,hist);
            currentState.history=hist;
            json.save(STORAGE.YDAY_COUNTS,oldToday);
            json.save(STORAGE.COUNTS_TODAY,{});
            json.save(STORAGE.DETAILS_TODAY,{});
            GM_setValue(STORAGE.DAYSTAMP,today);
            if(currentState){
                currentState.today={};
                currentState.yday=store.load(STORAGE.YDAY_COUNTS);
                currentState.det={};
            }
            heliAlreadyCountedThisSession.clear();
            ktpAlreadyCountedThisSession.clear();
            return true;
        }
        return false;
    }

    function getWasserbedarfLiter(activeEl){
        if(!activeEl) return 0;
        const fullText=((activeEl.textContent||"")+" "+(activeEl.title||"")+" "+(activeEl.getAttribute("search_attribute")||"")+" "+(activeEl.getAttribute("data-aao-text")||"")).replace(/\./g,"").toLowerCase();
        const matchLiter=fullText.match(/(\d{3,6})\s*(?:liter|ltr|li\b|l\b)/i);
        if(matchLiter){
            const val=parseInt(matchLiter[1],10);
            if(val>=500) return val;
        }
        if(fullText.includes("gtlf")||fullText.includes("großtank")) return 10000;
        if(fullText.includes("ptlf")) return 4000;
        if(fullText.includes("tankwagen")&&!fullText.includes("klein")) return 5000;
        if(fullText.includes("kleintankwagen")) return 2000;
        if(fullText.includes("tlf 4000")) return 4000;
        if(fullText.includes("tlf 3000")) return 3000;
        if(fullText.includes("tlf 2000")) return 2000;
        if(fullText.includes("tlf")) return 3000;
        return 0;
    }

    function incrementTileCount(vehicleKey,activeEl){
        if(!vehicleKey) return;
        let inc=uiSettings.clickIncrement;
        if(vehicleKey==="Wasserbedarf"){
            inc=getWasserbedarfLiter(activeEl);
            if(inc===0) return;
        }

        state.today[vehicleKey]=(state.today[vehicleKey]||0)+inc;
        state.total[vehicleKey]=(state.total[vehicleKey]||0)+inc;
        state.det[vehicleKey]=state.det[vehicleKey]||{};
        const detailName=(normalize(activeEl?activeEl.textContent:vehicleKey)||vehicleKey).slice(0,60);
        state.det[vehicleKey][detailName]=(state.det[vehicleKey][detailName]||0)+inc;
        store.save();

        if(isMainPage){
            requestAnimationFrame(()=>{
                if(tileEls[vehicleKey]) updateTile(vehicleKey,state);
                updateCategoryHeaders();
                updateHeaderStats(state);
                if(fzWrapper) fzWrapper.classList.remove("fzHidden");
                resetCountdown();
            });
        }
    }

    function updateHeaderStats(state){
        const statsEl=document.getElementById("fzMissionStats");
        if(statsEl) statsEl.innerHTML=getMissionStatsHTML();
    }

    let _cachedHeaderElements = {};

    function updateCategoryHeaders(){
        const pV = state.today[" Patienten"] || 0;
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

    function getTargetBody(){return(extWin&&!extWin.closed)?extWin.document.body:document.body;}
    function getTargetDoc(){return(extWin&&!extWin.closed)?extWin.document:document;}

    function getAvailabilitySummary(){
        const EXCLUDE_FROM_AVAIL = new Set([
            "Patienten","Krankenhausbetten","Gefangene","Gefängniszellen",
            "Wasserbedarf","Betreuung/Versorgung","Krankentransporte","Helikopter",
            "Meine DJI Mini 4k (Pilot Bobelle)",
            "FG Zugtrupp","FG Bergungsgruppe","FG Notversorgung","FG Räumen",
            "FG Wassergefahren","FG Ortung","FG Wasserschaden/Pumpen","FG Schwere Bergung",
            "FG Elektroversorgung","FG Führung und Kommunikation","FG Logistik-Verpflegung",
            "FG Brückenbau","OV Mannschaftstransportwagen",
            "Laufende Lehrgänge","Aktive Lehrgänge",
            "Feuer-und Rettungswache Herford","Feuer-und Rettungswache Gütersloh",
            "Feuer-und Rettungswache Halle(Westf.)","Feuer-und Rettungswache Stukenbrock",
            "Kreispolizeibehörde Herford","Kreispolizeibehörde Gütersloh",
            "Kreispolizeibehörde Halle(Westf.)","Kreispolizeibehörde Stukenbrock",
            "Polizeibehörde Warnemünde","Polizeibehörde Eckernförde","Polizeibehörde Bremerhafen",
            "Rettungswache Warnemünde","Rettungswache Eckernförde","Rettungswache Bremerhafen",
            "DLRG Herford","DLRG Gütersloh"
        ]);

        const relevantKeys = KEYS.filter(k=>!EXCLUDE_FROM_AVAIL.has(k));
        const notAvailButExist=relevantKeys.filter(k=>vehicleExists[k]===true&&vehicleAvailability[k]!==true);
        const notExist=relevantKeys.filter(k=>vehicleExists[k]!==true);
        const green=relevantKeys.filter(k=>vehicleAvailability[k]===true).length;
        return{total:relevantKeys.length,green,orange:notAvailButExist.length,red:notExist.length,notAvailButExist,notExist};
    }

    function triggerAlarm(key){
        const cached=tileCache[key];
        if(!cached||!cached.funkalarmLabel) return;
        if(alarmTimers[key]){
            clearTimeout(alarmTimers[key]);
            delete alarmTimers[key];
        }
        cached.funkalarmLabel.classList.add("fzAlarming");
        lastAlarmTime[key]=new Date().toLocaleTimeString("de-DE");
        const durationMs=Math.max(10,(uiSettings.funkalarmBlinkDuration||120))*1000;
        alarmTimers[key]=setTimeout(()=>{
            if(cached.funkalarmLabel) cached.funkalarmLabel.classList.remove("fzAlarming");
            delete alarmTimers[key];
        },durationMs);
    }

    async function updateAvailability(){
        if(!isMainPage) return;
        isUpdating=true;
        updateSubHeaderInfo();

        const now=Date.now();
        const todayStr=getTodayString();

        if(creditsData.date!==todayStr||(now-lastCreditsUpdate>300000)){
            try{
                fetch('/credits/daily').then(res=>res.text()).then(html=>{
                    if(!html.includes('login-form')){
                        const doc=new DOMParser().parseFromString(html,'text/html');
                        const rows=doc.querySelectorAll('table tbody tr');
                        let ein=0,aus=0;
                        rows.forEach(row=>{
                            const cell=row.querySelector('td[data-sort-value],td[sortvalue]')||row.querySelectorAll('td')[2];
                            if(!cell) return;
                            const raw=(cell.getAttribute('data-sort-value')||cell.textContent||'').replace(/\./g,'').replace(/[^\d-]/g,'');
                            const val=parseInt(raw,10);
                            if(!isNaN(val)){
                                if(val>0) ein+=val;
                                else aus+=val;
                            }
                        });
                        creditsData={ein,aus,bilanz:ein+aus,date:todayStr};
                        json.save(STORAGE.CREDITS_DATA,creditsData);
                        lastCreditsUpdate=now;
                        updateCreditsUI();
                    }
                }).catch(()=>{});
            }catch(e){}
        }

        await updateBuildingCapacities();

        for(const k of KEYS){
            vehicleAvailability[k]=false;
            vehicleExists[k]=false;
            vehicleInUseCount[k]=0;
            vehicleTotalCount[k]=0;
            vehicleFreeCount[k]=0;
        }

        hasFreeCountData=false;
        vehicleLists={};

        let catStats={};
        for(const c of CATEGORY_ORDER) catStats[c]={free:0,busy:0,s6:0,total:0};

        let vehicles=[];
        try{
            const response=await fetch("/api/vehicles",{credentials:"same-origin"});
            if(!response.ok) throw new Error("API Offline");
            vehicles=await response.json();
            if(!Array.isArray(vehicles)) throw new Error("Invalid API Data");
            sysReady=true;
        }catch(e){
            sysReady=false;
            isUpdating=false;
            updateSubHeaderInfo();
            return;
        }

        const setExist=(k)=>{if(tileMetaByKey[k]) vehicleExists[k]=true;};
        const setAvail=(k)=>{if(tileMetaByKey[k]) vehicleAvailability[k]=true;};
        const addTotal=(k)=>{if(tileMetaByKey[k]) vehicleTotalCount[k]=(vehicleTotalCount[k]||0)+1;};
        const addInUse=(k)=>{if(tileMetaByKey[k]) vehicleInUseCount[k]=(vehicleInUseCount[k]||0)+1;};

        const isInitialLoad=!vehicleStateCache._initialized;

        for(const v of vehicles){
            const typeId=v.vehicle_type_id??v.vehicle_type??null;
            let fms=v.fms_real??v.fms??null;
            const fmsText=(v.fms_text||"").toLowerCase();

            if(!fms||fms===0){
                if(fmsText.includes("frei auf wache")||fmsText.includes("at the station")) fms=2;
                else if(fmsText.includes("frei auf funk")) fms=1;
                else if(fmsText.includes("anfahrt")) fms=3;
                else if(fmsText.includes("einsatzstelle")) fms=4;
                else if(fmsText.includes("sprechwunsch")) fms=5;
                else if(fmsText.includes("nicht einsatzbereit")) fms=6;
                else if(fmsText.includes("patient")) fms=7;
                else if(fmsText.includes("transportziel")) fms=8;
                else fms=2;
            }

            const isInUse=(fms===3||fms===4||fms===7||fms===8);
            const isAvail=(fms===1||fms===2);
            let matchedKeys=new Set();

            const cachedMatch=VEHICLE_MATCH_CACHE.get(v.id);
            if(cachedMatch&&cachedMatch.caption===v.caption){
                cachedMatch.keys.forEach(k=>matchedKeys.add(k));
            } else {
                const vNameCustom=normalize(v.caption||"");
                const vNameType=normalize(v.vehicle_type_caption||v.vehicle_type_name||"");
                const mappedKeys=TYPE_ID_MAPPING[typeId];
                let idMatched=false;

                if(mappedKeys&&mappedKeys.length>0){
                    if(mappedKeys.length===1){
                        matchedKeys.add(mappedKeys[0]);
                        idMatched=true;
                    } else {
                        for(const k of mappedKeys){
                            const tile=tileMetaByKey[k];
                            if(tile&&tile.search&&tile.search.length>0){
                                let nameMatch=false;
                                if(tile.norm&&(vNameCustom.includes(tile.norm)||vNameType.includes(tile.norm))) nameMatch=true;
                                if(!nameMatch){
                                    for(const s of tile.search){
                                        if(vNameCustom.includes(s)||vNameType.includes(s)){nameMatch=true;break;}
                                    }
                                }
                                if(nameMatch){matchedKeys.add(k);idMatched=true;}
                            } else {
                                matchedKeys.add(k);
                                idMatched=true;
                            }
                        }
                    }
                }
                // Fallback: Textbasierte Fahrzeugtyp-Erkennung
                if(!idMatched){
                    const cacheKey=vNameCustom+"|"+vNameType;
                    if(nameCache[cacheKey]){
                        for(const k of nameCache[cacheKey]) matchedKeys.add(k);
                    } else {
                        const found=[];
                        for(const t of TILE_LIST){
                            let hit=false;
                            if(t.norm&&(vNameCustom.includes(t.norm)||vNameType.includes(t.norm))) hit=true;
                            if(!hit&&t.search.length>0){
                                for(let i=0;i<t.search.length;i++){
                                    if(vNameCustom.includes(t.search[i])||vNameType.includes(t.search[i])){hit=true;break;}
                                }
                            }
                            if(hit){matchedKeys.add(t.n);found.push(t.n);}
                        }
                        nameCache[cacheKey]=Array.from(matchedKeys).filter(k=>found.includes(k));
                        for(const k of found) matchedKeys.add(k);
                    }
                }

                if(typeId===32){
                    matchedKeys.delete("FuStW"); matchedKeys.delete("FuStW (DGL)");
                    matchedKeys.delete("Zivilstreifenwagen"); matchedKeys.delete("LauKw"); matchedKeys.delete("LeBefKw");
                    matchedKeys.add("FuStW");
                }

                if(typeId===50){
                    matchedKeys.delete("GruKw"); matchedKeys.delete("Zugfahrzeug Pferdetransport");
                    matchedKeys.delete("Pferdetransporter klein"); matchedKeys.delete("Pferdetransporter groß");
                    matchedKeys.delete("Anh Pferdetransport");
                    matchedKeys.add("GruKw");
                }

                if(typeId===31){
                    matchedKeys.delete("RTH [Christoph 13 (Bielefeld)]");
                    matchedKeys.add("RTH [Christoph 13 (Bielefeld)]");
                }

                if(typeId===61){
                    matchedKeys.delete("Polizeihubschrauber");
                    matchedKeys.add("Polizeihubschrauber");
                }

                if(typeId===91){
                    matchedKeys.delete("GW-San"); matchedKeys.delete("Rettungshundefahrzeug"); matchedKeys.delete("Hundestaffel (Bergrettung)");
                    matchedKeys.add("Rettungshundefahrzeug");
                }

                if(typeId===126){
                    matchedKeys.delete("MTF Drohne");
                    matchedKeys.add("MTF Drohne");
                }

                if(typeId===140){
                    matchedKeys.delete("MTW-V"); matchedKeys.delete("MTW-TeSi");
                    matchedKeys.add("MTW-V");
                }

                if(typeId===93){
                    matchedKeys.delete("MTW-O"); matchedKeys.delete("MTW-OV"); matchedKeys.delete("KTW Typ B"); matchedKeys.delete("OV Mannschaftstransportwagen");
                    matchedKeys.add("MTW-O");
                }

                if(typeId===58){
                    matchedKeys.delete("KTW Typ B");
                    matchedKeys.add("KTW Typ B");
                }

                if(typeId===73){
                    matchedKeys.delete("GRTW");
                    matchedKeys.add("GRTW");
                }

                if(typeId===100){
                    matchedKeys.delete("FüKW (THW)"); matchedKeys.delete("MLW 4"); matchedKeys.delete("FüKomKW");
                    matchedKeys.add("MLW 4");
                }

                if(typeId===132){
                    matchedKeys.delete("Anh FKH");
                    matchedKeys.add("Anh FKH");
                }

                if(typeId===157){
                    matchedKeys.delete("RTH [Christoph 13 (Bielefeld)]");
                    matchedKeys.delete("RTH mit Winde");
                    matchedKeys.add("RTH mit Winde");
                }

                if(typeId===156){
                    matchedKeys.delete("Polizeihubschrauber");
                    matchedKeys.delete("Polizeihubschrauber mit Winde");
                    matchedKeys.add("Polizeihubschrauber mit Winde");
                }

                if(typeId===3){
                    matchedKeys.delete("ELW 1"); matchedKeys.delete("ELW 1 (SEG)");
                    matchedKeys.add("ELW 1");
                }

                if(typeId===59){
                    matchedKeys.delete("ELW 1"); matchedKeys.delete("ELW 1 (SEG)");
                    matchedKeys.add("ELW 1 (SEG)");
                }

                if(typeId===33){
                    matchedKeys.delete("GW-Höhenrettung"); matchedKeys.delete("GW-Höhenrettung (Bergrettung)");
                    matchedKeys.add("GW-Höhenrettung");
                }

                if(typeId===158){
                    matchedKeys.delete("GW-Höhenrettung"); matchedKeys.delete("GW-Höhenrettung (Bergrettung)");
                    matchedKeys.add("GW-Höhenrettung (Bergrettung)");
                }

                if(typeId===51){
                    matchedKeys.delete("FüKW (Polizei)"); matchedKeys.delete("FüKW (THW)");
                    matchedKeys.add("FüKW (Polizei)");
                }

                if(typeId===144){
                    matchedKeys.delete("FüKW (Polizei)"); matchedKeys.delete("FüKW (THW)");
                    matchedKeys.add("FüKW (THW)");
                }

                if(typeId===166){
                    matchedKeys.delete("TLF"); matchedKeys.delete("PTLF 4000");
                    matchedKeys.add("PTLF 4000");
                }

                if(typeId===17 || typeId===18 || typeId===87){
                    matchedKeys.delete("TLF"); matchedKeys.delete("PTLF 4000");
                    matchedKeys.add("TLF");
                }

                if(typeId===149){
                    matchedKeys.delete("GW-Bergrettung"); matchedKeys.delete("GW-Bergrettung (NEF)");
                    matchedKeys.add("GW-Bergrettung (NEF)");
                }

                if(typeId===150){
                    matchedKeys.delete("GW-Bergrettung"); matchedKeys.delete("GW-Bergrettung (NEF)");
                    matchedKeys.add("GW-Bergrettung");
                }

                VEHICLE_MATCH_CACHE.set(v.id, {caption: v.caption, keys: Array.from(matchedKeys)});
            }

            const vBuildingId = v.building_id ?? v.station_building_id ?? null;
            if(vBuildingId !== null && BUILDING_ID_TILE_MAP[vBuildingId]){
                BUILDING_ID_TILE_MAP[vBuildingId].forEach(k => matchedKeys.add(k));
            }

            const oldFms = vehicleStateCache[v.id];
            if(!isInitialLoad && oldFms !== undefined && (oldFms === 1 || oldFms === 2) && (fms === 3 || fms === 4)){
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
                    const meta = tileMetaByKey[k];
                    if(meta && (meta.cat === "Luft" || meta.cat === "SeenotRett") && (k.includes("RTH") || k.includes("Hubschrauber") || k.includes("SAR Hubschrauber"))){
                        const heliKey = v.id + "_" + k;
                        if(!heliAlreadyCountedThisSession.has(heliKey)){
                            heliAlreadyCountedThisSession.add(heliKey);
                            incrementTileCount("Helikopter", null);
                        }
                    }
                });

                // NEU: Krankentransporte zählen
                const KTW_TYPE_IDS = new Set([38, 58, 74, 97]);
                if(KTW_TYPE_IDS.has(typeId)){
                    const ktpGuardKey = v.id + "_ktp_" + (vehicleStateCache[v.id] || 0);
                    if(!ktpAlreadyCountedThisSession.has(ktpGuardKey)){
                        ktpAlreadyCountedThisSession.add(ktpGuardKey);
                        incrementTileCount("Krankentransporte", null);
                    }
                }
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
                    else catStats[meta.cat].free++;
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

            if(!uiRoot.hasChildNodes()) redrawGrid();

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

        requestAnimationFrame(() => {
            for(const k of KEYS) updateTile(k, state);
            updateCategoryHeaders();
            renderAvailabilityIndicator();
            updateHeaderStats(state);
            isUpdating = false;
            lastUpdateStr = new Date().toLocaleTimeString("de-DE");
            updateSubHeaderInfo();
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
        state.today["Patienten"] = Math.max(Number(state.today["Patienten"] || 0), Number(cachedCapacities.bedsUsed || 0));

        const prisonerValue = Math.max(Number(state.today["Gefangene"] || 0), Number(cachedCapacities.cellsUsed || 0));
        state.today["Gefangene"] = prisonerValue;
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

    async function updateBuildingCapacities(force=false){
        const now = Date.now();
        if(!force && now - lastBuildingUpdate < 120000) return;

        try{
            const response = await fetch("/api/buildings", { credentials: "same-origin" });
            if(!response.ok) return;
            const buildings = await response.json();

            let beds = 0, bedsUsed = 0, cells = 0, cellsUsed = 0;

            buildings.forEach(b => {
                if(b.enabled === false) return;

                const type = Number(b.building_type_id ?? b.building_type ?? -1);
                const lvl = Number(b.level ?? 0);

                buildingNameCache[b.id] = b.caption || ("Wache #" + b.id);

                if(type === 4 || String(b.caption || "").toLowerCase().includes("krankenhaus")){
                    const bedTotal = Number(b.patient_extension_capacity ?? b.bed_count ?? b.hospital_beds ?? (10 + lvl)) || 0;
                    const bedUsedVal = Number(b.patient_count ?? b.patients_count ?? b.current_patients ?? 0) || 0;
                    beds += bedTotal;
                    bedsUsed += bedUsedVal;
                }

                if(
                    type === 6 || type === 12 ||
                    String(b.caption || "").toLowerCase().includes("gefängnis") ||
                    String(b.caption || "").toLowerCase().includes("polizei")
                ){
                    const cellTotal = Number(b.prisoner_capacity ?? b.jail_cells ?? b.cell_count ?? (type === 12 ? (1 + lvl) : (2 + lvl))) || 0;
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

    function startApiLoop(){
        if(apiTimer) clearInterval(apiTimer);
        const interval = Math.max(30, uiSettings.apiInterval || 120) * 1000;
        apiTimer = setInterval(updateAvailability, interval);
        updateAvailability();
    }

    function startSchoolingLoop(){
        if(schoolingTimer) clearInterval(schoolingTimer);
        const interval = Math.max(60, uiSettings.schoolingApiInterval || 120) * 1000;
        schoolingTimer = setInterval(fetchSchoolings, interval);
        fetchSchoolings();
    }

    function prepareCSSString(){
        const imgH = uiSettings.tileImgSize || 38;
        return `
            :root{
                --fz-bg:${uiSettings.winBg};--fz-bc:${uiSettings.winBorderC};--fz-bw:${uiSettings.winBorderW}px;--fz-br:${uiSettings.winRadius}px;
                --fz-cat-s:${uiSettings.catHeaderSize}px;--fz-cat-c:${uiSettings.catHeaderTextColor};--fz-cat-pad:${uiSettings.catHeaderPadding}px;
                --fz-tile-h:${uiSettings.tileMinHeight}px;--fz-tile-gap:${uiSettings.tileGap}px;--fz-tile-bg:${uiSettings.tileBgColor};--fz-tile-text:${uiSettings.tileTextColor};
                --fz-name-fs:${uiSettings.tileNameSize}px;--fz-name-fw:${uiSettings.tileNameWeight};--fz-count-fs:${uiSettings.tileCounterSize}px;--fz-badge-fs:${uiSettings.badgeSize}px;
                --fz-nt-c:${uiSettings.numTodayColor};--fz-ny-c:${uiSettings.numYdayColor};--fz-res-c:${uiSettings.resCounterColor};--fz-res-s:${uiSettings.resCounterSize}px;
                --fz-id-sz:${uiSettings.tileIdSize}px;--fz-id-c:${uiSettings.tileIdColor};--fz-id-a:left;
                --fz-head-sz:${uiSettings.headerElementSize}px;--fz-pill-bg:${uiSettings.pillBgColor};--fz-pill-c:${uiSettings.pillTextColor};
                --fz-sub-st-sz:${uiSettings.subStatusSize}px;--fz-sub-st-fw:${uiSettings.subStatusWeight};--fz-sub-up-sz:${uiSettings.subUpdateSize}px;--fz-sub-up-fw:${uiSettings.subUpdateWeight};
                --fz-sub-up-c:${uiSettings.subUpdateColor};--fz-sub-dp-sz:${uiSettings.subDispSize}px;--fz-sub-dp-fw:${uiSettings.subDispWeight};--fz-sub-dp-c:${uiSettings.subDispColor};
                --fz-cat-stat-c:${uiSettings.catStatusTextColor};--fz-res-bg:${uiSettings.resourceTileBgColor};--fz-logo-sz:${uiSettings.logoSize}px;--fz-bar-c:${uiSettings.barColor};
                --fz-funk-sz:${uiSettings.funkalarmSize}px;--fz-funk-c:${uiSettings.funkalarmColor};--fz-funk-fw:${uiSettings.funkalarmBold?'bold':'normal'};
                --fz-funk-blink-c:${uiSettings.funkalarmBlinkColor};--fz-aus:${C_AUS};--fz-img-h:${imgH}px;
            }
            .fzWrapper{position:fixed;z-index:${CFG.zIndex};top:${uiSettings.winTop}px;left:5px;right:5px;width:auto;display:flex;flex-direction:column;background:var(--fz-bg);border:var(--fz-bw) solid var(--fz-bc);border-radius:0 0 var(--fz-br) var(--fz-br);box-shadow:0 10px 30px rgba(0,0,0,0.5);transition:opacity 0.4s ease-out,transform 0.4s ease-out;}
            .fzWrapper.fzFullscreen{top:0!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:100%!important;border-radius:0;max-height:100vh;transform:none;}
            body.fzExternal .fzWrapper{position:absolute;top:0;left:0;right:0;bottom:0;border:none;border-radius:0;transform:none;opacity:1;pointer-events:auto;}
            .fzWrapper.fzHidden{opacity:0;transform:translateY(-50px);pointer-events:none;}
            .fzHeader{background:${uiSettings.headBg};color:${uiSettings.headColor};padding:4px 5px;display:flex;justify-content:space-between;align-items:center;user-select:none;font-family:sans-serif;min-height:35px;}
            .fzHeaderLeft{display:flex;align-items:center;gap:5px;flex-wrap:nowrap;}.fzHeaderRight{display:flex;align-items:center;gap:5px;}
            .fzSubInfoRow{display:flex;align-items:center;margin-top:3px;line-height:1;white-space:nowrap;}
            #fzSysStatus{font-size:var(--fz-sub-st-sz);font-weight:var(--fz-sub-st-fw);}
            #fzLastUpdate{margin-left:10px;font-size:var(--fz-sub-up-sz);font-weight:var(--fz-sub-up-fw);color:var(--fz-sub-up-c);}
            #fzDispatcher{margin-left:10px;font-size:var(--fz-sub-dp-sz);font-weight:var(--fz-sub-dp-fw);color:var(--fz-sub-dp-c);}
            @keyframes fzBlinkYellow{0%{color:yellow;font-weight:bold;}50%{opacity:0.5;color:yellow;}100%{color:yellow;font-weight:bold;}}
            .fzUpdatingAnim{animation:fzBlinkYellow 1s infinite;color:yellow!important;font-weight:bold!important;}
            .fzHeaderPill,.fzResPill,#fzAvailIndicator,.fzTrafficLight{font-size:var(--fz-head-sz);font-weight:bold;background:var(--fz-pill-bg);color:var(--fz-pill-c);padding:2px 6px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);display:flex;align-items:center;gap:4px;cursor:default;white-space:nowrap;height:20px;box-sizing:border-box;}
            .fzResPill{cursor:pointer;transition:transform 0.1s;}.fzResPill:hover{transform:scale(1.05);filter:brightness(0.95);}#fzAvailIndicator{cursor:pointer;}
            .fzTrafficLight{padding:0 5px;gap:4px;}.fzLight{width:8px;height:8px;border-radius:50%;opacity:0.2;transition:opacity 0.3s;background-color:#555;}
            .fzLight.red{background-color:#dc3545;}.fzLight.yellow{background-color:#ffc107;}.fzLight.green{background-color:#28a745;}.fzLight.active{opacity:1;box-shadow:0 0 5px currentColor;}
            .fzCatUtilBar{height:4px;background:rgba(255,255,255,0.2);width:120px;margin-top:3px;border-radius:2px;overflow:hidden;display:flex;}
            .fzBarFree{height:100%;background:#28a745;transition:width 0.5s;}.fzBarBusy{height:100%;background:#dc3545;transition:width 0.5s;}.fzBarS6{height:100%;background:#999;transition:width 0.5s;}
            .fzCatStatText{margin-right:10px;white-space:nowrap;font-size:9px;margin-top:1px;font-weight:normal;color:var(--fz-cat-stat-c);}
            .fzFocusBtn{margin-right:8px;cursor:pointer;opacity:0.8;font-size:14px;margin-left:5px;}.fzFocusBtn:hover{opacity:1;transform:scale(1.1);}
            .fzCatBadge{background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:4px;font-size:11px;margin-right:6px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;border:1px solid rgba(255,255,255,0.3);font-weight:normal;}.fzCatBadge:hover{background:rgba(255,255,255,0.4);}
            .fzScrollArea{max-height:${uiSettings.winMaxHeight}px;overflow-y:auto;background:#fff;position:relative;flex:1;}.fzWrapper.fzFullscreen .fzScrollArea{max-height:100vh;flex:1;}body.fzExternal .fzScrollArea{max-height:100vh;flex:1;}
            .fzGrid{display:grid;grid-template-columns:repeat(${uiSettings.columns},1fr);gap:0;background:#ccc;border-top:1px solid #ccc;border-left:1px solid #ccc;}
            .fzTile{position:relative;display:flex;align-items:stretch;padding:2px 4px;height:var(--fz-tile-h);background-color:var(--fz-tile-bg);color:var(--fz-tile-text);border-left:5px solid transparent;border-right:1px solid #ccc;border-bottom:1px solid #ccc;gap:var(--fz-tile-gap);font-family:sans-serif;cursor:pointer;user-select:none;box-sizing:border-box;transition:height 0.18s ease;}
            .fzTile:hover{filter:brightness(0.95);}
            .fzStatusDot{width:6px;height:6px;border-radius:50%;z-index:1;border:1px solid rgba(0,0,0,0.2);flex-shrink:0;margin-top:auto;margin-bottom:auto;}
            .fzContentWrapper{display:flex;flex-direction:column;justify-content:center;flex:1;overflow:hidden;height:100%;}
            .fzRightWrapper{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;flex-shrink:0;min-width:max-content;padding-top:3px;padding-bottom:calc(var(--fz-img-h) + 6px);}
            .fzTile.fzNoImg .fzRightWrapper{padding-bottom:3px;justify-content:center;}
            .fzBadgeSlot{display:flex;gap:2px;flex-wrap:wrap;margin-bottom:2px;min-height:0;}
            .fzBadge{font-weight:bold;font-size:var(--fz-badge-fs);padding:0px 4px;border-radius:2px;color:#fff;white-space:nowrap;line-height:1.2;}.fzBadgeInUse{background:#dc3545;}
            .fzTileName{font-size:var(--fz-name-fs);font-weight:var(--fz-name-fw);white-space:nowrap;text-overflow:ellipsis;width:100%;overflow:hidden;line-height:1.2;}
            .fzTileCount{display:flex;align-items:center;gap:3px;justify-content:flex-end;}
            .fzNumToday{font-weight:bold;color:var(--fz-nt-c);font-size:var(--fz-count-fs);}
            .fzNumYday{font-weight:normal;color:var(--fz-ny-c);font-size:calc(var(--fz-count-fs)*0.8);}
            .fzTileIdLabel{font-size:var(--fz-id-sz);color:var(--fz-id-c);text-align:var(--fz-id-a);width:100%;margin-top:1px;white-space:nowrap;line-height:1;}
            .fzResourceCounter{font-size:var(--fz-res-s);color:var(--fz-res-c);font-weight:bold;}
            .fzPers{font-size:9px;color:#777;margin-top:1px;margin-bottom:2px;white-space:nowrap;}
            @keyframes fzAlarmBlink{0%{opacity:1;}45%{opacity:1;}65%{opacity:0.12;}100%{opacity:1;}}
            .fzFunkalarmLabel{font-size:var(--fz-funk-sz);color:var(--fz-funk-c);font-weight:var(--fz-funk-fw);white-space:nowrap;text-align:right;line-height:1;margin-bottom:2px;overflow:hidden;max-width:100%;text-overflow:ellipsis;}
            .fzFunkalarmLabel.fzAlarming{animation:fzAlarmBlink 1.4s ease-in-out infinite;color:var(--fz-funk-blink-c)!important;font-weight:bold!important;}
            .fzBottomBar{height:3px;background:#e0e0e0;border-radius:2px;overflow:hidden;width:100%;margin-top:2px;}.fzBottomBarFill{height:100%;background:var(--fz-bar-c);width:0%;transition:width 0.3s;}
            .fzTile.fzInUse{background:${uiSettings.tileColorInUse}!important;color:#222!important;}
            .fzTile.fzEmpty{background:${uiSettings.tileColorEmpty}!important;color:#222!important;}
            .fzTile.fzInUse .fzStatusDot,.fzTile.fzEmpty .fzStatusDot{background-color:#dc3545!important;}
            .fzTile.fzResource{background-color:var(--fz-res-bg)!important;color:#000!important;}
            .fzTrend.up{color:${uiSettings.trendColorUp};}.fzTrend.down{color:${uiSettings.trendColorDown};}.fzTrend.eq{color:${uiSettings.trendColorEq};}
            .fzCatHeader{grid-column:1/-1;background:#333;color:var(--fz-cat-c);font-weight:bold;padding:var(--fz-cat-pad) 8px;text-align:left;font-size:var(--fz-cat-s);border-bottom:1px solid #ccc;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:sans-serif;position:relative;overflow:visible;}.fzCatHeader:hover{filter:brightness(1.1);}
            .fzBtn{background:#f5f5f5;border:1px solid #ccc;border-radius:4px;cursor:pointer;padding:4px 8px;font-weight:bold;color:#333;text-align:center;font-size:13px;transition:background-color 0.2s;}.fzBtn:hover{background:#e0e0e0;}
            .fzHeadBtn{cursor:pointer;font-size:14px;margin-left:5px;opacity:0.8;}.fzHeadBtn:hover{opacity:1;transform:scale(1.1);}
            .fzModalOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100001;display:flex;justify-content:center;align-items:center;}
            .fzModal{background:#fff;padding:20px;border-radius:8px;width:650px;max-width:90%;max-height:90vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:sans-serif;font-size:13px;}
            .fzModal h3{margin-top:0;color:#333;font-size:18px;border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:15px;}
            .fzSettingsContainer{display:flex;gap:15px;}.fzSetCol{flex:1;min-width:0;}.fzSetSep{width:1px;background-color:#000;margin:0 5px;flex-shrink:0;}
            .fzSetGroup{margin-bottom:15px;border-bottom:1px solid #000;padding-bottom:10px;}.fzSetGroup h4{margin:0 0 8px 0;color:#007bff;}
            .fzRow{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f9f9f9;}
            .fzInput{width:80px;padding:2px;border:1px solid #ccc;border-radius:3px;text-align:right;}.fzColor{width:40px;height:20px;border:none;padding:0;cursor:pointer;}
            .fzModalStats{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:15px;}
            .fzStatBox{background:#f8f9fa;padding:10px;border-radius:5px;text-align:center;border:1px solid #ddd;}.fzStatVal{font-size:18px;font-weight:bold;color:#333;}.fzStatLbl{font-size:10px;color:#666;text-transform:uppercase;margin-top:2px;}
            .fzTrendDiff{font-size:11px;margin-left:5px;}.fzTrendDiff.pos{color:green;}.fzTrendDiff.neg{color:red;}
            .fzGraphContainer{display:flex;align-items:flex-end;justify-content:space-between;height:60px;padding:10px 0;border-bottom:1px solid #eee;margin-bottom:8px;}
            .fzGraphBarWrapper{display:flex;flex-direction:column;align-items:center;flex:1;}.fzGraphBar{width:60%;border-radius:2px 2px 0 0;min-height:1px;transition:height 0.3s;}
            .fzGraphLabel{font-size:9px;color:#666;margin-top:4px;}.fzGraphValue{font-size:9px;font-weight:bold;margin-bottom:2px;}
            .fzUsageTable{width:100%;font-size:11px;margin-bottom:15px;border-collapse:collapse;}.fzUsageTable td{border-bottom:1px solid #eee;padding:3px 0;}.fzUsageTable tr:last-child td{border-bottom:none;}
            .fzSectionTitle{font-size:12px;font-weight:bold;margin-bottom:5px;color:#007bff;border-bottom:1px solid #eee;padding-bottom:3px;margin-top:15px;}
            .fzFooter{font-size:${uiSettings.footerSize}px;color:${uiSettings.footerColor};text-align:${uiSettings.footerAlign};padding:2px;width:100%;box-sizing:border-box;}
            .fzLogo{height:var(--fz-logo-sz);width:auto;margin-right:10px;background:transparent;display:block;vertical-align:middle;object-fit:contain;}
            .fzFilterBtn{padding:3px 10px;border-radius:12px;border:1px solid #ccc;font-size:11px;cursor:pointer;background:#f5f5f5;color:#333;font-weight:normal;transition:background 0.15s,color 0.15s;}
            .fzFilterBtn.active{background:#007bff;color:#fff;font-weight:bold;}.fzFilterBtn:hover:not(.active){background:#e0e0e0;}
            .fzSchoolingTile{background:linear-gradient(135deg,rgba(123,63,160,0.06) 0%,rgba(123,63,160,0.02) 100%)!important;border-left-color:${C_AUS}!important;min-height:70px;}
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
            .fzVehicleImg{position:absolute;bottom:3px;right:${uiSettings.tileImgAlign==="left"?"auto":"4px"};left:${uiSettings.tileImgAlign==="left"?"4px":"auto"};width:${imgH}px;height:auto;max-height:${imgH}px;object-fit:contain;opacity:0;pointer-events:none;transition:opacity 0.3s ease;z-index:2;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.25));}
            .fzTile.fzInUse .fzVehicleImg{opacity:1;}.fzTile.fzTileCompact .fzVehicleImg{display:none;}.fzTile.fzNoImg .fzVehicleImg{display:none;}


        `;
    }

    function injectCSS(){
        if(document.getElementById("fzStyles")) return;
        cssContent = prepareCSSString();
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
        const newHash = newCSS.length + newCSS.substring(0, 100);
        if(newHash === lastCSSHash) return;
        
        lastCSSHash = newHash;
        cssContent = newCSS;
        let s = document.getElementById("fzStyles");
        if(s) s.textContent = cssContent;
        if(extWin && !extWin.closed){
            let exS = extWin.document.getElementById("fzStylesExt");
            if(exS) exS.textContent = cssContent;
        }
    }

    function updateTile(key,state){
        if(SCHOOLING_TILE_NAMES.has(key)){ updateSchoolingTiles(); return; }
        const cached = tileCache[key];
        if(!cached || !cached.el) return;

        const v = (state.today[key] || 0);
        const inUse = vehicleInUseCount[key] || 0;
        let total = vehicleTotalCount[key] || 0;
        if(total === 0 && customStock[key] !== undefined) total = customStock[key];

        let free = 0;
        if(hasFreeCountData) free = vehicleFreeCount[key] || 0;
        else if(total > 0){
            free = total - inUse;
            if(free < 0) free = 0;
        }

        cached.lastState = {v,inUse,free,total};
        const el = cached.el;
        el.dataset.val = v;
        const isResource = RESOURCE_TILE_NAMES.has(key);

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
                    if(COUNTED_RESOURCE_KEYS.has(key)) txt = "";
                    else txt = v > 0 ? String(v) : "";
                }
            }

            if(cached.resCounter.textContent !== txt) cached.resCounter.textContent = txt;
        }

        const showNumericCounter = showNumbers && !isEventCounter && key !== "Wasserbedarf" && key !== "Krankenhausbetten" && key !== "Gefängniszellen";
        if(cached.tileCount) cached.tileCount.style.display = showNumericCounter ? "flex" : "none";

        if(showNumericCounter){
            if(cached.numToday) cached.numToday.textContent = v;
            if(cached.numYday) cached.numYday.textContent = uiSettings.showTileYday ? `(${y})` : "";
            if(cached.trend){
                const wantTrend = !!uiSettings.showTileTrend;
                cached.trend.style.display = wantTrend ? "inline" : "none";
                if(wantTrend){
                    cached.trend.classList.remove("up","down","eq");
                    if(v > y){ cached.trend.textContent = "▲"; cached.trend.classList.add("up"); }
                    else if(v < y){ cached.trend.textContent = "▼"; cached.trend.classList.add("down"); }
                    else { cached.trend.textContent = "•"; cached.trend.classList.add("eq"); }
                }
            }
        }
        // Statusbalken (In-Use Prozentanteil) aktualisieren
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
                    const filtered = ids.filter(i => i !== 0 && i !== null && i !== undefined);
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

        el.classList.remove("fzInUse","fzEmpty");
        if(!isResource){
            if(total > 0 && free <= 0) el.classList.add("fzEmpty");
            else if(inUse > 0) el.classList.add("fzInUse");
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
            if(total > 0) dotColor = free > 0 ? "#5cb85c" : "#dc3545";
            else if(vehicleExists[key]) dotColor = "#f0ad4e";
            else dotColor = "#ff0000";
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

    function createTile(key,state){
        if(SCHOOLING_TILE_NAMES.has(key)) return createSchoolingTile(key);

        const meta = tileMetaByKey[key];
        const color = meta?.c || "#888";
        const v = (state.today[key] || 0);

        const div = document.createElement("div");
        div.className = "fzTile";
        div.dataset.key = key;
        div.dataset.val = v;

        if(meta && (meta.cat === "Ressourcen" || meta.cat === "Ausbildung" || meta.cat === "Versorgung")) div.classList.add("fzResource");
        div.style.borderLeftColor = color;

        const imgUrl = tileImages[key] || "";
        const imgEl = document.createElement("img");
        imgEl.className = "fzVehicleImg";
        imgEl.alt = "";
        imgEl.draggable = false;
        if(imgUrl) imgEl.src = imgUrl;
        else { div.classList.add("fzNoImg"); imgEl.style.display = "none"; }

        div.innerHTML = `
            <div class="fzTileCompactRow"><span class="fzCompactDot"></span><span class="fzCompactLabel">${key}</span><span class="fzCompactCount"></span><span class="fzCompactBusy" style="display:none;"></span></div>
            <div class="fzStatusDot" style="background-color:#ff0000;margin-right:5px;"></div>
            <div class="fzContentWrapper"><span class="fzBadgeSlot"></span><span class="fzTileName">${key}</span><div class="fzTileIdLabel"></div><div class="fzBottomBar"><div class="fzBottomBarFill"></div></div></div>
            <div class="fzRightWrapper"><div class="fzFunkalarmLabel">${uiSettings.funkalarmText || 'Funk-Alarm'}</div><div class="fzTileCount"><span class="fzNumToday">0</span><span class="fzNumYday">(0)</span><span class="fzTrend"></span></div><div class="fzResourceCounter"></div></div>
        `;
        div.appendChild(imgEl);
        div.onclick = () => showDetails(key,state);

        tileEls[key] = div;
        tileCache[key] = {
            el: div,
            dot: div.querySelector(".fzStatusDot"),
            compactDot: div.querySelector(".fzCompactDot"),
            compactLabel: div.querySelector(".fzCompactLabel"),
            compactCount: div.querySelector(".fzCompactCount"),
            compactBusy: div.querySelector(".fzCompactBusy"),
            badgeSlot: div.querySelector(".fzBadgeSlot"),
            tileName: div.querySelector(".fzTileName"),
            bottomBar: div.querySelector(".fzBottomBarFill"),
            tileCount: div.querySelector(".fzTileCount"),
            numToday: div.querySelector(".fzNumToday"),
            numYday: div.querySelector(".fzNumYday"),
            trend: div.querySelector(".fzTrend"),
            resCounter: div.querySelector(".fzResourceCounter"),
            idLabel: div.querySelector(".fzTileIdLabel"),
            funkalarmLabel: div.querySelector(".fzFunkalarmLabel"),
            vehicleImg: imgEl,
            lastState: null
        };
        return div;
    }

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

    function showDetails(key,state){
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
        const valToday = (state.today[key] || 0);
        const valYday = (state.yday[key] || 0);
        const diff = valToday - valYday;

        let diffHtml = diff > 0 ? `<span class="fzTrendDiff pos">(+${diff})</span>` : (diff < 0 ? `<span class="fzTrendDiff neg">(${diff})</span>` : `<span class="fzTrendDiff" style="color:#999;">(0)</span>`);

        let totalTodayAll = 0;
        Object.values(state.today).forEach(v => totalTodayAll += v);
        let sharePct = totalTodayAll > 0 ? ((valToday / totalTodayAll) * 100).toFixed(1) : "0.0";

        let history = state.history[key] || [];
        if(history.length === 0) history = [0,0,0,0,0,0,0];
        const maxVal = Math.max(...history,1);
        const avg7 = history.length > 0 ? (history.reduce((a,b)=>a+b,0)/history.length).toFixed(1) : "0.0";
        const peak7 = Math.max(...history);
        const peakIdx = history.indexOf(peak7);
        const peakLabel = peakIdx === 0 ? "Gestern" : `-${peakIdx+1}d`;

        let graphHtml = `<div class="fzSectionTitle">Letzte 7 Tage</div><div class="fzGraphContainer">`;
        for(let i=6;i>=0;i--){
            const hVal = history[i] || 0;
            const hPct = Math.round((hVal / maxVal) * 100);
            const isPeak = (i === peakIdx && peak7 > 0);
            const dayLabel = i === 0 ? "Gestern" : `-${i+1}d`;
            graphHtml += `<div class="fzGraphBarWrapper"><span class="fzGraphValue">${hVal}</span><div class="fzGraphBar" style="height:${hPct}%;background:${isPeak?"#dc3545":"#007bff"};"></div><span class="fzGraphLabel" style="${isPeak?"color:#dc3545;font-weight:bold;":""}">${dayLabel}</span></div>`;
        }
        graphHtml += `</div><div style="display:flex;gap:16px;margin-bottom:12px;margin-top:4px;font-size:12px;color:#555;flex-wrap:wrap;"><span>⌀ Ø 7 Tage: <b style="color:#007bff;">${avg7}</b></span><span>🔺 Spitzentag: <b style="color:#dc3545;">${peak7}</b> <span style="color:#999;font-size:11px;">(${peakLabel})</span></span></div>`;

        let fmsCounts = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0};
        list.forEach(v => { if(v.fms>=1 && v.fms<=8) fmsCounts[v.fms]++; });
        const fmsTotal = list.length || 1;

        let fmsBarHtml = `<div class="fzSectionTitle">FMS-Übersicht (${list.length} Fahrzeuge)</div>`;
        if(list.length > 0){
            let segments = "";
            for(let s=1;s<=8;s++){
                if(fmsCounts[s] > 0){
                    const pct = Math.round((fmsCounts[s] / fmsTotal) * 100);
                    const textColor = FMS_TEXT_COLORS[s] || "#fff";
                    segments += `<div title="S${s}: ${fmsCounts[s]}" style="width:${pct}%;background:${FMS_COLORS[s]};height:100%;display:flex;align-items:center;justify-content:center;transition:width 0.4s;">${pct>=10?`<span style="font-size:9px;color:${textColor};font-weight:bold;line-height:1;">${fmsCounts[s]}</span>`:""}</div>`;
                }
            }
            fmsBarHtml += `<div style="display:flex;height:18px;border-radius:4px;overflow:hidden;margin-bottom:6px;border:1px solid #ddd;">${segments}</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">`;
            for(let s=1;s<=8;s++){
                if(fmsCounts[s] > 0){
                    const textColor = FMS_TEXT_COLORS[s] || "#fff";
                    fmsBarHtml += `<span style="font-size:11px;background:${FMS_COLORS[s]};color:${textColor};padding:2px 8px;border-radius:10px;font-weight:bold;">S${s}: ${fmsCounts[s]}</span>`;
                }
            }
            fmsBarHtml += `</div>`;
        } else {
            fmsBarHtml += `<div style="color:#999;font-size:12px;margin-bottom:12px;">Keine Fahrzeuge vorhanden.</div>`;
        }

        let usageHtml = "";
        if(state.det && state.det[key]){
            const usageData = Object.entries(state.det[key]).sort((a,b)=>b[1]-a[1]).slice(0,5);
            if(usageData.length > 0){
                usageHtml = `<div class="fzSectionTitle">Top Verwendung (Heute)</div><table class="fzUsageTable">`;
                usageData.forEach(item => { usageHtml += `<tr><td>${item[0]}</td><td style="text-align:right;font-weight:bold;">${item[1]}</td></tr>`; });
                usageHtml += `</table>`;
            }
        }

        const lastAlarm = lastAlarmTime[key] || null;
        const lastAlarmHtml = lastAlarm
        ? `<div class="fzStatBox"><div class="fzStatVal" style="font-size:14px;">🚨 ${lastAlarm}</div><div class="fzStatLbl">Letzte Alarmierung</div></div>`
            : `<div class="fzStatBox"><div class="fzStatVal" style="font-size:13px;color:#aaa;">–</div><div class="fzStatLbl">Letzte Alarmierung</div></div>`;

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
                let color = "#28a745";
                if(v.fms === 6) color = "#000000";
                else if(v.fms === 3 || v.fms === 4 || v.fms === 7 || v.fms === 8) color = "#dc3545";
                else if(v.fms === 5) color = "#ffc107";

                let statusDisplay = `(S${v.fms})`;
                if(v.missionId && (v.fms === 4 || v.fms === 7)){
                    statusDisplay = `<a href="/missions/${v.missionId}" target="_blank" style="color:#007bff;text-decoration:underline;">(S${v.fms})</a>`;
                }

                let crewDisplay = v.crew > 0 ? `<span style="font-size:10px;color:#666;margin-left:5px;">${ICONS.person} ${v.crew}</span>` : "";
                return `<div class="fzRow" style="justify-content:flex-start;gap:8px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${color};flex-shrink:0;"></span><span style="font-weight:bold;">${v.name}</span>${crewDisplay}<span style="color:#666;font-size:11px;margin-left:auto;">${statusDisplay}</span></div>`;
            }).join("");
        };

        const countFree = list.filter(v => v.fms === 1 || v.fms === 2).length;
        const countBusy = list.filter(v => v.fms === 3 || v.fms === 4 || v.fms === 7 || v.fms === 8).length;
        const countS6 = list.filter(v => v.fms === 6).length;

        const ol = document.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = (e) => { if(e.target === ol) ol.remove(); };
        ol.innerHTML = `<div class="fzModal"><h3>${key} - Details</h3><div class="fzModalStats"><div class="fzStatBox"><div class="fzStatVal">${valToday}</div><div class="fzStatLbl">Heute</div></div><div class="fzStatBox"><div class="fzStatVal" style="font-size:16px;">${valYday} ${diffHtml}</div><div class="fzStatLbl">Gestern</div></div><div class="fzStatBox"><div class="fzStatVal">${sharePct}%</div><div class="fzStatLbl">Anteil Tag</div></div>${lastAlarmHtml}</div>${graphHtml}${fmsBarHtml}${usageHtml}<div class="fzSectionTitle">Fahrzeugliste (${list.length})</div><div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;" id="fzVehicleFilterBtns"><button class="fzFilterBtn active" data-filter="all">Alle (${list.length})</button><button class="fzFilterBtn" data-filter="free" style="border-color:#28a745;">🟢 Frei (${countFree})</button><button class="fzFilterBtn" data-filter="busy" style="border-color:#dc3545;">🔴 Im Einsatz (${countBusy})</button><button class="fzFilterBtn" data-filter="s6" style="border-color:#6c757d;">⚫ S6 (${countS6})</button></div><div id="fzVehicleListContent" style="max-height:300px;overflow-y:auto;">${renderVehicleList("all")}</div><button class="fzBtn" style="margin-top:15px;width:100%" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button></div>`;

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
        const backup = {settings:uiSettings,today:state.today,total:state.total,history:state.history,yday:state.yday,customStock};
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
            {t:"Kategorien & Logo",i:[["Logo Größe (px)","logoSize","number"],["Logo URL","logoUrl","text"],["Farb-Modus","catHeaderMode","select",["category","custom"]],["Eigene Farbe","catHeaderBgColor","color"],["Textfarbe","catHeaderTextColor","color"],["Schriftgröße (px)","catHeaderSize","number"],["Innenabstand (px)","catHeaderPadding","number"]]},
            {t:"Kacheln: Design",i:[["Hintergrund","tileBgColor","color"],["Textfarbe","tileTextColor","color"],["Ressourcen-BG","resourceTileBgColor","color"],["Balken Farbe","barColor","color"],["Min-Höhe (px)","tileMinHeight","number"]]},
            {t:"Kacheln: Text & Badges",i:[["Name Größe (px)","tileNameSize","number"],["Name Fett","tileNameWeight","select",["bold","normal"]],["Badge Größe (px)","badgeSize","number"],["Zähler Größe (px)","tileCounterSize","number"],["Zähler Farbe","numTodayColor","color"]]},
            {t:"Status & Trends",i:[["Bg (Im Einsatz)","tileColorInUse","color"],["Bg (Leer/0)","tileColorEmpty","color"],["Trend Hoch","trendColorUp","color"],["Trend Runter","trendColorDown","color"]]},
            {t:"Statistik (Header)",i:[["Einsätze Farbe","statsMissionsColor","color"],["Einsätze Größe","statsMissionsSize","number"],["KTW Farbe","statsKtpColor","color"],["Aktiv Farbe","statsActiveColor","color"]]},
            {t:"Sub-Infos",i:[["Status Größe","subStatusSize","number"],["Status (Bereit)","subStatusColorOk","color"],["Status (Fehler)","subStatusColorErr","color"],["Update Farbe","subUpdateColor","color"],["Dispo Farbe","subDispColor","color"]]},
            {t:"Credits Counter",i:[["Abstand (px)","creditsGap","number"],["Schriftgröße","creditsFontSize","number"],["Label Farbe","creditsLabelColor","color"],["Zahlen Farbe","creditsValueColor","color"]]},
            {t:"Funkalarmierung",i:[["Beschriftung","funkalarmText","text"],["Schriftgröße","funkalarmSize","number"],["Textfarbe","funkalarmColor","color"],["Blinkfarbe","funkalarmBlinkColor","color"],["Blink-Dauer (Sek)","funkalarmBlinkDuration","number"]]},
            {t:"System & Verhalten",i:[["Auto-Hide (sek)","autoHideSeconds","number"],["API Update (sek)","apiInterval","number"],["Lehrgänge Update (sek)","schoolingApiInterval","number"],["Klick-Erhöhung","clickIncrement","number"]]},
            {t:"Fahrzeuggrafiken",i:[["Größe (px)","tileImgSize","number"],["Position","tileImgAlign","select",["right","left"]]]}
        ];

        groups.forEach((g,index) => {
            const d = group(g.t);
            g.i.forEach(item => d.appendChild(createInput(item[0],item[1],item[2],item[3])));
            if(index < 5) leftCol.appendChild(d);
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

        const btnImgs = document.createElement("button");
        btnImgs.className = "fzBtn";
        btnImgs.style.cssText = "background:#edf3ff;";
        btnImgs.textContent = "🖼 Fahrzeuggrafiken";
        btnImgs.onclick = () => { ol.remove(); openImageEditor(); };

        btnRow.appendChild(btnSync);
        btnRow.appendChild(btnExp);
        btnRow.appendChild(btnImp);
        btnRow.appendChild(btnImgs);
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

    function openImageEditor(){
        const vehicleKeys = KEYS.filter(k => !RESOURCE_TILE_NAMES.has(k) && !SCHOOLING_TILE_NAMES.has(k));
        const ol = document.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = (e) => { if(e.target === ol) ol.remove(); };

        const modal = document.createElement("div");
        modal.className = "fzModal";
        modal.style.cssText = "max-width:700px;width:95%;";
        modal.innerHTML = `<h3>🖼 Fahrzeuggrafiken verwalten</h3><p style="font-size:12px;color:#666;margin-bottom:12px;">Grafik-URL pro Kachel eintragen. Die Grafik erscheint <strong>nur wenn mindestens ein Fahrzeug im Einsatz ist</strong>.</p><div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center;"><input id="fzImgSearch" type="text" placeholder="Kachel suchen..." style="flex:1;min-width:120px;padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;"><button class="fzBtn" id="fzImgClearAll" style="background:#fce4ec;font-size:11px;">🗑 Alle löschen</button></div><div id="fzImgList" style="max-height:480px;overflow-y:auto;"></div><div style="margin-top:12px;display:flex;gap:8px;"><button class="fzBtn" style="flex:1;" id="fzImgSave">💾 Speichern & schließen</button><button class="fzBtn" style="flex:1;" onclick="this.closest('.fzModalOverlay').remove()">Abbrechen</button></div>`;

        const tempImages = {...tileImages};

        const renderList = (filter="") => {
            const listEl = modal.querySelector("#fzImgList");
            const filtered = filter ? vehicleKeys.filter(k => k.toLowerCase().includes(filter.toLowerCase())) : vehicleKeys;
            listEl.innerHTML = filtered.map(k => {
                const url = tempImages[k] || "";
                const hasImg = !!url;
                const rowBg = hasImg ? "rgba(40,167,69,0.06)" : "";
                return `<div style="display:flex;align-items:center;gap:6px;padding:4px 2px;border-bottom:1px solid #f0f0f0;background:${rowBg};"><span style="min-width:160px;max-width:160px;font-size:11px;font-weight:${hasImg?"bold":"normal"};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;" title="${k}">${k}</span><input type="text" data-key="${k}" value="${url}" placeholder="https://... Bild-URL" style="flex:1;padding:3px 6px;border:1px solid ${hasImg?"#28a745":"#ccc"};border-radius:3px;font-size:11px;"/>${hasImg?`<img src="${url}" style="width:36px;height:24px;object-fit:contain;border-radius:2px;flex-shrink:0;background:#f5f5f5;" onerror="this.style.opacity='0.2'">`:`<span style="width:36px;height:24px;flex-shrink:0;"></span>`}<button data-del="${k}" style="border:none;background:transparent;cursor:pointer;font-size:14px;opacity:0.5;padding:0 2px;" title="Löschen">✕</button></div>`;
            }).join("") || `<div style="padding:20px;text-align:center;color:#999;">Keine Kacheln gefunden.</div>`;

            listEl.querySelectorAll("input[data-key]").forEach(inp => {
                inp.oninput = () => {
                    const k = inp.dataset.key;
                    const val = inp.value.trim();
                    if(val) tempImages[k] = val;
                    else delete tempImages[k];
                    inp.style.borderColor = val ? "#28a745" : "#ccc";
                };
            });

            listEl.querySelectorAll("button[data-del]").forEach(btn => {
                btn.onclick = () => {
                    delete tempImages[btn.dataset.del];
                    renderList(modal.querySelector("#fzImgSearch").value);
                };
            });
        };

        renderList();
        ol.appendChild(modal);
        getTargetBody().appendChild(ol);

        setTimeout(() => {
            const searchEl = modal.querySelector("#fzImgSearch");
            if(searchEl) searchEl.oninput = (e) => renderList(e.target.value);

            const clearBtn = modal.querySelector("#fzImgClearAll");
            if(clearBtn) clearBtn.onclick = () => {
                vehicleKeys.forEach(k => delete tempImages[k]);
                renderList(searchEl ? searchEl.value : "");
            };

            const saveBtn = modal.querySelector("#fzImgSave");
            if(saveBtn) saveBtn.onclick = () => {
                vehicleKeys.forEach(k => {
                    if(tempImages[k]) tileImages[k] = tempImages[k];
                    else delete tileImages[k];
                });
                saveTileImages();

                vehicleKeys.forEach(k => {
                    const cached = tileCache[k];
                    if(!cached || !cached.vehicleImg) return;
                    const url = tileImages[k] || "";
                    const el = cached.el;
                    if(url){
                        cached.vehicleImg.src = url;
                        cached.vehicleImg.style.display = "";
                        el.classList.remove("fzNoImg");
                    } else {
                        cached.vehicleImg.src = "";
                        cached.vehicleImg.style.display = "none";
                        el.classList.add("fzNoImg");
                    }
                });

                ol.remove();
            };
        },50);
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
        const section = (title,arr,color) => `<h4 style="margin:12px 0 6px 0;">${title} (${arr.length})</h4>${arr.length?arr.map(k=>`<div class="fzRow"><span>${k}</span><b style="color:${color};">${title}</b></div>`).join(""):`<div style="padding:10px;text-align:center;color:#999;">Keine</div>`}`;

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
            history.pushState = function(){ _push.apply(history,arguments); setTimeout(syncBtnVisibility,50); };
            history.replaceState = function(){ _replace.apply(history,arguments); setTimeout(syncBtnVisibility,50); };
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
        fzHeader.innerHTML = `<div class="fzHeaderLeft"><img src="${uiSettings.logoUrl}" class="fzLogo" alt="Logo"><div style="display:flex;flex-direction:column;justify-content:center;gap:3px;"><div style="display:flex;gap:5px;align-items:center;flex-wrap:nowrap;"><div id="fzMissionStats" style="display:flex;gap:5px;align-items:center;">${getMissionStatsHTML()}</div><div id="fzAvailIndicator" class="fzHeaderPill" title="Verfügbarkeit">...</div><div id="fzAmpel" class="fzTrafficLight" title="Auto-Hide Timer"><div class="fzLight red"></div><div class="fzLight yellow"></div><div class="fzLight green active"></div></div><div id="fzResourcePills" style="display:flex;gap:5px;"></div></div><div class="fzSubInfoRow"><span id="fzSysStatus">Warte auf System...</span><span id="fzLastUpdate"></span><span id="fzDispatcher"></span></div></div></div><div class="fzHeaderRight"><div id="fzRelocatedButtons"><a href="https://www.leitstellenspiel.de/buildings/26017007" target="_blank" class="fzHeadBtn" title="Leitstelle Bielefeld" style="text-decoration:none;color:inherit;">${SVGS.building}</a><a href="https://www.leitstellenspiel.de/leitstellenansicht" target="_blank" class="fzHeadBtn" title="Wachenübersicht" style="text-decoration:none;color:inherit;">${SVGS.building}</a><a href="https://www.leitstellenspiel.de/buildings/26794438#tab_projected_missions" target="_blank" class="fzHeadBtn" title="SAR Leitstelle" style="text-decoration:none;color:inherit;">${SVGS.anchor}</a><span class="fzHeadBtn" id="fzToggleCompact" title="Kompakt/Normal">${SVGS.eye}</span><span class="fzHeadBtn" id="fzGlobalCollapse" title="Kategorien alle auf/zu">${SVGS.collapse}</span><span class="fzHeadBtn" id="fzGlobalTileCollapse" title="Alle Kacheln ein-/ausklappen" style="font-size:16px;opacity:0.8;">▦</span><span class="fzHeadBtn" id="fzSettingsButton" title="Einstellungen">${SVGS.settings}</span><span class="fzHeadBtn" id="fzPopoutButton" title="Fenster">${SVGS.popout}</span><span class="fzHeadBtn" id="fzFullscreenButton" title="Vollbild">${SVGS.maximize}</span><span class="fzHeadBtn" id="fzMinimizeButton" title="Minimieren">${SVGS.minimize}</span></div></div>`;
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
        },500);

        setInterval(() => {
            if(document.hidden || (fzWrapper && fzWrapper.classList.contains("fzHidden") && !extWin)) return;
            const statsEl = getTargetDoc().getElementById("fzMissionStats");
            if(statsEl) statsEl.innerHTML = getMissionStatsHTML();
        },3000);

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
                    if(cat === "Versorgung"){
                        const betr = state.today["Betreuung/Versorgung"] || 0;
                        metricHtml += `<span class="fzCatBadge" id="fzBadge_Vers_Bet">${ICONS.supply} ${betr}</span>`;
                    }
                    if(cat === "Ausbildung"){
                        const schCount = schoolingsData.filter(s => !s.finishAt || s.finishAt > Date.now()).length;
                        metricHtml += `<span class="fzCatBadge" id="fzBadge_Aus_Count">${ICONS.school} ${schCount} aktiv</span>`;
                    }

                    let header = document.createElement("div");
                    header.className = "fzCatHeader";
                    header.id = "fzCatHead_" + cat;
                    header.style.backgroundColor = conf;

                    let utilBarHtml = `<div id="fzCatUtil_${cat}" class="fzCatUtilBar"><div class="fzBarFree"></div><div class="fzBarBusy"></div><div class="fzBarS6"></div></div><div id="fzCatTxt_${cat}" class="fzCatStatText">Lade...</div>`;
                    const tcIcon = isTileCompact ? "▤" : "▦";
                    const tcActive = isTileCompact ? "fzTCactive" : "";

                    header.innerHTML = `<div style="display:flex;flex-direction:column;justify-content:center;min-width:140px;"><span style="line-height:1;">${displayName}</span>${utilBarHtml}</div><div style="display:flex;align-items:center;gap:4px;flex-shrink:0;margin-left:auto;">${metricHtml}<span class="fzFocusBtn" title="Fokus">${ICONS.target}</span><span class="fzTileCollapseToggle ${tcActive}" id="fzTileCollapse_${cat}" title="${isTileCompact?"Ausklappen":"Einklappen"}">${tcIcon}</span><span>${isCollapsed?"&#x25B6;":"&#x25BC;"}</span></div>`;

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
                if(!isUpdating) setTimeout(updateAvailability, DEBOUNCE_TIME);
            });
            $(document).on('mission_marker_add', function(){
                setTimeout(() => {
                    const statsEl = document.getElementById("fzMissionStats");
                    if(statsEl) statsEl.innerHTML = getMissionStatsHTML();
                },500);
            });
        }

        if(typeof sap !== 'undefined' && sap.audio_play){
            const statusDot = getTargetDoc().getElementById("fzAPIStatus");
            if(statusDot) {
                statusDot.style.background = sysReady ? "#5cb85c" : "#dc3545";
                statusDot.title = sysReady ? "API OK" : "API offline";
            }

            const originalAudioPlay = sap.audio_play;
            let apiDebounce = null;
            sap.audio_play = function(audio){
                originalAudioPlay.apply(this,arguments);
                if(audio && (audio.includes('fms') || audio.includes('radio'))){
                    if(apiDebounce) clearTimeout(apiDebounce);
                    apiDebounce = setTimeout(() => {
                        updateAvailability();
                        const statsEl = document.getElementById("fzMissionStats");
                        if(statsEl) statsEl.innerHTML = getMissionStatsHTML();
                    },200);
                }
            };
        }
    }

    function refreshAllVisibleTiles(){
        if(!isMainPage) return;
        KEYS.forEach(k => { if(tileEls[k]) updateTile(k, state); });
        updateCategoryHeaders();
        updateHeaderStats(state);
        renderAvailabilityIndicator();
        updateSubHeaderInfo();
    }

    const CLICK_PATTERNS = [
        {
            test: (url, text) => /\/patients?\/\d+\/hospitals?\/\d+/.test(url) || /\/missions\/\d+\/patients?\/\d+\/hospital/.test(url) || text.includes("ins krankenhaus"),
            action: "Patienten"
        },
        {
            test: (url, text) => /\/patients?\/\d+\/ambulances?\/\d+/.test(url) || /\/transports?\/\d+/.test(url) || text.includes("krankentransport"),
            action: "Krankentransporte"
        },
        {
            test: (url, text) => /\/prisoners?\/\d+\/cells?\/\d+/.test(url) || /\/missions\/\d+\/prisoners?\/\d+\/cell/.test(url) || text.includes("in zelle"),
            action: "Gefangene"
        }
    ];

    document.addEventListener("click", (e) => {
        const activeEl = e.target.closest("a[href],button,.vehicle_dispatch_button,.alarm_button,form button[type='submit'],[data-mission-id],[data-method],[data-confirm]");
        if(!activeEl) return;

        const text = (activeEl.textContent || activeEl.value || "").trim().toLowerCase();
        const href = (activeEl.getAttribute("href") || "").toLowerCase();
        const formAction = (activeEl.closest("form")?.getAttribute("action") || "").toLowerCase();
        const urlStr = href || formAction;

        for (const pattern of CLICK_PATTERNS) {
            if (pattern.test(urlStr, text)) {
                incrementTileCount(pattern.action, activeEl);
                if (pattern.action === "Patienten" || pattern.action === "Gefangene") {
                    setTimeout(() => updateBuildingCapacities(true).then(() => {
                        syncDerivedResourceCounts();
                        KEYS.forEach(k => tileEls[k] && updateTile(k, state));
                        updateCategoryHeaders();
                    }), 1000);
                }
                return;
            }
        }

        if(activeEl.classList.contains("aao_btn") || activeEl.hasAttribute("aao_id")){
            const literVal = getWasserbedarfLiter(activeEl);
            if(literVal > 0){
                state.today["Wasserbedarf"] = (state.today["Wasserbedarf"] || 0) + literVal;
                state.total["Wasserbedarf"] = (state.total["Wasserbedarf"] || 0) + literVal;
                state.det["Wasserbedarf"] = state.det["Wasserbedarf"] || {};
                const detKey = (text || "aao").slice(0,60);
                state.det["Wasserbedarf"][detKey] = (state.det["Wasserbedarf"][detKey] || 0) + literVal;
                store.save();

                requestAnimationFrame(() => {
                    if(tileEls["Wasserbedarf"]) updateTile("Wasserbedarf", state);
                    updateCategoryHeaders();
                    if(fzWrapper) fzWrapper.classList.remove("fzHidden");
                    resetCountdown();
                });
                return;
            }

            if(
                text.includes("bt-kombi") || text.includes("gw-bt") ||
                text.includes("bt lkw") || text.includes("anh fkh") || text.includes("betreuung")
            ){
                incrementTileCount("Betreuung/Versorgung", activeEl);
                return;
            }
        }

        if(activeEl.classList.contains("vehicle_dispatch_button") || activeEl.hasAttribute("data-mission-id")){
            if(text.includes("rth") || text.includes("ith") || text.includes("hubschrauber")){
                const vId = activeEl.getAttribute("data-vehicle-id") || activeEl.getAttribute("data-id") || null;
                const guardKey = vId ? (vId + "_heli_click") : null;
                if(!guardKey || !heliAlreadyCountedThisSession.has(guardKey)){
                    incrementTileCount("Helikopter", activeEl);
                    if(guardKey) heliAlreadyCountedThisSession.add(guardKey);
                }
            }
        }
    }, true);

    window.addEventListener("storage",(e) => {
        if(e.key === STORAGE.SYNC_SIGNAL){
            state.today = store.load(STORAGE.COUNTS_TODAY);
            state.total = store.load(STORAGE.COUNTS_TOTAL);
            state.yday = store.load(STORAGE.YDAY_COUNTS);
            state.det = json.load(STORAGE.DETAILS_TODAY,{});
            refreshAllVisibleTiles();
        }
    });

    setInterval(() => {
        if(document.hidden && !extWin) return;
        if(checkVehicleDayReset(state) && isMainPage){
            KEYS.forEach(k => updateTile(k, state));
            updateAvailability();
        }
    }, 10000);

    setInterval(() => {
        if(!isMainPage) return;
        state.today = store.load(STORAGE.COUNTS_TODAY);
        state.total = store.load(STORAGE.COUNTS_TOTAL);
        state.yday = store.load(STORAGE.YDAY_COUNTS);
        state.det = json.load(STORAGE.DETAILS_TODAY, {});
        refreshAllVisibleTiles();
    }, 10000);

    (function(){
        const API_HANDLERS = {
            patient: { pattern: /\/patients?\/.*\/hospitals?/, action: "Patienten", callback: () => updateBuildingCapacities(true).then(() => { syncDerivedResourceCounts(); if(isMainPage) { KEYS.forEach(k => tileEls[k] && updateTile(k, state)); updateCategoryHeaders(); } }) },
            transit: { pattern: /\/patients?\/.*\/ambulances?|\/transports?/, action: "Krankentransporte" },
            prisoner: { pattern: /\/prisoners?\/.*\/cells?/, action: "Gefangene", callback: () => updateBuildingCapacities(true).then(() => { syncDerivedResourceCounts(); if(isMainPage) { KEYS.forEach(k => tileEls[k] && updateTile(k, state)); updateCategoryHeaders(); } }) }
        };

        const handleRequest = (url) => {
            const u = String(url).toLowerCase();
            for (const [key, { pattern, action, callback }] of Object.entries(API_HANDLERS)) {
                if (pattern.test(u)) {
                    setTimeout(() => {
                        incrementTileCount(action, null);
                        if (callback) callback();
                    }, 300);
                    return;
                }
            }
        };

        const _xhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url){
            if((method || "").toUpperCase() === "PUT" || (method || "").toUpperCase() === "POST") {
                handleRequest(url);
            }
            return _xhrOpen.apply(this, arguments);
        };

        const _fetch = window.fetch;
        window.fetch = function(input, init){
            const method = ((init && init.method) || "GET").toUpperCase();
            if(method === "PUT" || method === "POST") {
                handleRequest(typeof input === "string" ? input : (input.url || ""));
            }
            return _fetch.apply(this, arguments);
        };
    })();

    if(isMainPage){
        if(window.requestIdleCallback){
            window.requestIdleCallback(() => {
                initUI(state);
                registerEventListener();
            }, { timeout: 3000 });
        } else {
            setTimeout(() => {
                initUI(state);
                registerEventListener();
            }, 100);
        }
        
        updateAvailability();
        startApiLoop();
        fetchSchoolings();
        startSchoolingLoop();
    }
})();





