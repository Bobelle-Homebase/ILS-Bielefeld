// ==UserScript==
// @name         Dashboard (ohne Statistik)
// @namespace    https://leitstellenspiel.de/dashboard
// @version      1.0.16
// @author       Design by Bobelle
// @description  Full All in One - ohne Statistik
// @updateURL    https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20ohne%20Statistik.user.js
// @downloadURL  https://github.com/Bobelle-Homebase/ILS-Bielefeld/raw/refs/heads/main/Dashboard%20ohne%20Statistik.user.js
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @match        https://www.leitstellenspiel.de/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log("[Bobelle Dashboard] 1.0.16 gestartet");

    // =====================================================
    // KONFIGURATION & KONSTANTEN
    // =====================================================
    const CFG = { zIndex: 99999 };

    const VEHICLE_MATCH_CACHE = {
        _map: new Map(),
        _max: 1000,
        get(key) { return this._map.get(key); },
        set(key, val) {
            if (this._map.size >= this._max) {
                const iter = this._map.keys();
                for(let i = 0; i < 100; i++) this._map.delete(iter.next().value);
            }
            this._map.set(key, val);
        }
    };

    const ICONS = { person: "👤", target: "⌖", school: "🎓" };

    const C_FW ="#b00000", C_RD = "#FF9D0A", C_POL = "#54B509", C_THW = "#00387b";
    const C_SEG = "#FFD7A8", C_WR = "#004F9F", C_SR = "#004F9F";
    const C_LUFT = "#5e879e", C_AUS = "#7b3fa0";

    const CAT_COLORS = {
        "Luft": C_LUFT, "FW": C_FW, "RD": C_RD, "POL": C_POL, "THW": C_THW, "SEG": C_SEG,
        "WerkFW": "#b00000", "FlugFW": "#b00000", "UAS": "#9b9b9b", "BergRett": "#B0AC97",
        "WasserRett": C_WR, "SeenotRett": C_SR, "BahnRett": "#5a5a5a", "Netz": "#5a5a5a", "Versorgung": "#b00000",
        "Ausbildung": C_AUS, "Sonstiges": "#b00000"
    };

    const CAT_DISPLAY_NAMES = {
        "Luft": "Luftlagezentrum", "FW": "Feuerwehr", "RD": "Rettungsdienst", "POL": "Polizei",
        "THW": "Technisches Hilfswerk", "SEG": "Schnelleinsatzgruppe", "WerkFW": "Werkfeuerwehr",
        "FlugFW": "Flughafenfeuerwehr", "UAS": "UAS", "WasserRett": "Wasserrettung",
        "SeenotRett": "Seenotrettung", "BergRett": "Bergrettung", "BahnRett": "Bahnrettung",
        "Netz": "Netzversorgung", "Sonstiges": "Feuer-und Rettungswachen & Kreispolizeibehörden", "Versorgung": "Versorgung",
        "Ausbildung":"Ausbildung & Lehrgänge"
    };

    const CATEGORY_ORDER = [
        "Luft","FW","RD","POL","THW","SEG","WerkFW","FlugFW","UAS",
        "BergRett","WasserRett","SeenotRett","BahnRett","Netz","Sonstiges","Versorgung",
        "Ausbildung"
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
        { n:"TLF", id:[17,18], c:C_FW, cat:"FW", s:["tlf"]},
        { n:"TLF3000W", id:[187,188], c:C_FW, cat:"FW", s:["tlfw"]},
        { n:"GTLF", id:121, c:C_FW, cat:"FW", s:["gtlf","großtank"]},
        { n:"GTLF1000W", id:189, c:C_FW, cat:"FW", s:["gtlf-w","großtank"]},
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
        { n:"GW-Lüfter", id:114, c:C_FW, cat:"FW", s:["gw-lüfter"]},
        { n:"GW-Tierrettung", id:185, c:C_FW, cat:"FW", s:["gw-Tier","gw-tierrettung"]},
        { n:"GW-Atemschutz", id:5, c:C_FW, cat:"FW", s:["gw-a","gw-atemschutz"]},
        { n:"GW-Öl", id:10, c:C_FW, cat:"FW", s:["gw-öl"]},
        { n:"GW-Messtechnik", id:12, c:C_FW, cat:"FW", s:["gw-messtechnik"]},
        { n:"GW-Gefahrgut", id:27, c:C_FW, cat:"FW", s:["gw-gefahrgut"]},
        { n:"GW-Waldbrand", id:190, c:C_FW, cat:"FW", s:["gw-wald"]},
        { n:"GW-L1", id:104, c:C_FW, cat:"FW", s:["gw-l1"]},
        { n:"GW-L2", id:[105,11], c:C_FW, cat:"FW", s:["gw-l2"]},
        { n:"GW-Höhenrettung", id:158, c:C_FW, cat:"FW", s:["gw-höhenrettung","gw-höhen fw"]},
        { n:"GW-Logistik", id:[108,104], c:C_FW, cat:"FW", s:["ab-l","gw-logistik"]},
        { n:"GW-Hygiene", id:[108,104], c:C_FW, cat:"FW", s:["ab-l","gw-hygiene"]},
        { n:"AB-Einsatzleitung", id:78, c:C_FW, cat:"FW", s:["ab-einsatz","ab-el"]},
        { n:"AB-Atemschutz", id:48, c:C_FW, cat:"FW", s:["ab-atemschutz"]},
        { n:"AB-Öl", id:49, c:C_FW, cat:"FW", s:["ab-öl"]},
        { n:"AB-Rüst", id:47, c:C_FW, cat:"FW", s:["ab-rüst"]},
        { n:"AB-Schlauch", id:62, c:C_FW, cat:"FW", s:["ab-schlauch"]},
        { n:"AB-Wasser/Schaum", id:170, c:C_FW, cat:"FW", s:["ab-wasser"]},
        { n:"AB-Dekon-P", id:54, c:C_FW, cat:"FW", s:["ab-dekon-p"]},
        { n:"AB-Gefahrgut", id:77, c:C_FW, cat:"FW", s:["ab-gefahrgut","ab-gefahr"]},
        { n:"AB-Waldbrand", id:192, c:C_FW, cat:"FW", s:["ab-gefahrgut","ab-gefahr","ab-wald"]},
        { n:"AB-Tank", id:117, c:C_FW, cat:"FW", s:["ab-tank"]},
        { n:"AB-Lösch", id:119, c:C_FW, cat:"FW", s:["ab-lösch"]},
        { n:"AB-Sonderlöschmittel", id:169, c:C_FW, cat:"FW", s:["ab-sonderlöschmittel"]},
        { n:"AB-MzB", id:71, c:C_FW, cat:"FW", s:["ab-mzb"]},
        { n:"AB-Küche", id:142, c:C_FW, cat:"FW", s:["ab-küche"]},
        { n:"AB-Lüfter", id:116, c:C_FW, cat:"FW", s:["ab-lüfter"]},
        { n:"AB-Logistik", id:108, c:C_FW, cat:"FW", s:["ab-l","ab-logistik"]},
        { n:"AB-Hygiene", id:[108,104], c:C_FW, cat:"FW", s:["ab-l","ab-hygiene"]},
        { n:"AB-NEA50 (FW)", id:[179], c:"#5a5a5a", cat:"Netz", s:["ab-nea50"]},
        { n:"AB-NEA200 (FW)", id:[180], c:"#5a5a5a", cat:"Netz", s:["ab-nea200"]},
        { n:"Anh Tierrettungl", id:186, c:C_FW, cat:"FW", s:["anh tierrettung"]},
        { n:"Anh Schlauch", id:143, c:C_FW, cat:"FW", s:["anh schlauch"]},
        { n:"Anh Waldbrand", id:[143,191], c:C_FW, cat:"FW", s:["anh wald"]},
        { n:"Anh Sonderlöschmittel", id:168, c:C_FW, cat:"FW", s:["sonderlöschmittel"]},
        { n:"Anh Lüfter", id:115, c:C_FW, cat:"FW", s:["anh lüfter","anh-lüfter"]},
        { n:"MTF-L", id:106, c:C_FW, cat:"Versorgung", s:["mtf-log","mtf-l"]},
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
        { n:"Schmutzwasserpumpen", id:[17,18], c:C_THW, cat:"THW", s:["schmutzwasserpumpen","schmutzwasserpumpe","swpu","swpufzg","swpu-fzg","wasserpumpen","wasserpumpe","wasser pumpen","schmutz wasser","pumpen fahrzeug"]},
        { n:"Feuerlöschpumpen", id:[30], c:C_THW, cat:"THW", s:["feuerlöschpumpen","feuerlöschpumpe","fpfzg","fp-fzg","löschpumpen","löschpumpe","lösch pumpen","feuer lösch","feuerlösch pumpe"]},
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
        { n:"GW-Höhenrettung (Bergrettung)", id:33, c:"#B0AC97", cat:"BergRett", s:["gw-höhen"]},
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
        columns:4, autoHideSeconds:5, compactMode:false,
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
        tileColorInUse:"#fef9e7", tileColorEmpty:"#fce4ec",
        subStatusSize:10, subStatusWeight:"normal", subStatusColorOk:"#00cc00", subStatusColorErr:"#ff0000",
        subUpdateSize:10, subUpdateWeight:"normal", subUpdateColor:"#555555",
        subDispSize:10, subDispWeight:"normal", subDispColor:"#555555",
        headerElementSize:12, pillBgColor:"#ffffff", pillTextColor:"#000000",
        creditsGap:6, creditsFontSize:13, creditsLabelColor:"#333333", creditsValueColor:"#00cc00",
        funkalarmText:"Alarmierung", funkalarmSize:10, funkalarmColor:"#555555", funkalarmBold:false,
        funkalarmBlinkColor:"#ff0000", funkalarmBlinkDuration:120,
        toggleBtnSize:44, toggleBtnBg:"#f01606", toggleBtnBorderC:"#f3f035", toggleBtnBorderW:2,
        fmsFontSize:11, fmsHeight:1, fmsGap:4, debugMode:false, apiInterval:60,
        tileIdPrefix:"ID: ", tileIdSize:10, tileIdColor:"#999999", tileIdAlign:"right",
        tileSortOrder:"category",
        activeCategoryFilter:"all", searchFilter:"", collapsedCats:[], collapsedTilesCats:[],
        footerText:"Design & Optimized by Bobelle", footerColor:"#1e90ff", footerSize:12, footerAlign:"center",
        schoolingApiInterval:180
    };

    const STORAGE = {
        UISETTINGS:"fz_ui_settings_v9_ultra",
        CREDITS_DATA:"fz_v28_credits_data",
        CUSTOM_STOCK:"fz_v31_custom_stock"
    };

    // =======================================================
    // VARIABLEN & STATUS
    // =======================================================
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

    const VEHICLE_TYPE_OVERRIDES = {
        32:  { del: ["FuStW", "FuStW (DGL)", "Zivilstreifenwagen", "LauKw", "LeBefKw"], add: ["FuStW"] },
        50:  { del: ["GruKw", "Zugfahrzeug Pferdetransport", "Pferdetransporter klein", "Pferdetransporter groß", "Anh Pferdetransport"], add: ["GruKw"] },
        31:  { del: ["RTH [Christoph 13 (Bielefeld)]"], add: ["RTH [Christoph 13 (Bielefeld)]"] },
        61:  { del: ["Polizeihubschrauber"], add: ["Polizeihubschrauber"] },
        91:  { del: ["GW-San", "Rettungshundefahrzeug", "Hundestaffel (Bergrettung)"], add: ["Rettungshundefahrzeug"] },
        126: { del: ["MTF Drohne"], add: ["MTF Drohne"] },
        140: { del: ["MTW-V", "MTW-TeSi"], add: ["MTW-V"] },
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
        150: { del: ["GW-Bergrettung", "GW-Bergrettung (NEF)"], add: ["GW-Bergrettung"] },
        184: { del: [], add: ["Schmutzwasserpumpen"] },
        188: { del: [], add: ["Feuerlöschpumpen"] }
    };

    const pathLoc = window.location.pathname;
    const isMainPage = ((pathLoc==="/"||pathLoc==="/index"||pathLoc.length<2)||pathLoc.includes("/leitstellenansicht"));

    const NORM_REGEX = /[^a-z0-9äöü]/g;
    const normalize = (s) => (s||"").toLowerCase().replace(NORM_REGEX,"");

    const TILE_LIST = AAO_TILES_RAW.map(t=>({...t, norm:normalize(t.n), search:(t.s||[]).map(normalize), cat:t.cat}));
    const KEYS = AAO_TILES_RAW.map(t=>t.n);
    const tileMetaByKey = Object.fromEntries(AAO_TILES_RAW.map(t=>[t.n,t]));

    const SEARCH_INDEX = {};
    TILE_LIST.forEach(t => {
        SEARCH_INDEX[t.norm] = t;
        t.search.forEach(s => {
            if(!SEARCH_INDEX[s]) SEARCH_INDEX[s] = [];
            if(!Array.isArray(SEARCH_INDEX[s])) SEARCH_INDEX[s] = [SEARCH_INDEX[s]];
            SEARCH_INDEX[s].push(t);
        });
    });

    const SCHOOLING_TILE_NAMES = new Set(["Laufende Lehrgänge","Aktive Lehrgänge"]);

    const CAT_TILE_MAP = {};
    CATEGORY_ORDER.forEach(cat => {
        CAT_TILE_MAP[cat] = TILE_LIST.filter(t => t.cat === cat);
    });

    const FMS_COLORS = {1:"#007bff",2:"#28a745",3:"#ffc107",4:"#dc3545",5:"#17a2b8",6:"#6c757d",7:"#fd7e14",8:"#20c997"};

    let apiTimer=null, schoolingTimer=null;
    let sysReady=true, lastUpdateStr="--:--:--", isUpdating=false;
    let lastCreditsUpdate=0;
    let creditsData={ein:0,aus:0,bilanz:0,date:""};

    const tileCache={}, nameCache={}, vehicleStateCache={}, alarmTimers={};

    let schoolingsData=[];
    let buildingNameCache={};
    let lastSchoolingsUpdate=0;
    let _restzeitTimerId=null;
    let _buildingsFullyLoaded=false;

    // =======================================================
    // HILFSFUNKTIONEN
    // =======================================================
    function formatRestzeit(finishAtMs) {
        const diff = finishAtMs - Date.now();
        if(diff <= 0) return "✅ Fertig";
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

    // =======================================================
    // INITIALISIERUNG
    // =======================================================
    creditsData = json.load(STORAGE.CREDITS_DATA, {ein:0, aus:0, bilanz:0, date:""});
    const customStock = json.load(STORAGE.CUSTOM_STOCK, {});

    let uiSettings = {...DEFAULTS, ...json.load(STORAGE.UISETTINGS, {})};
    for (const k in DEFAULTS) { if (uiSettings[k] === undefined) uiSettings[k] = DEFAULTS[k]; }
    if (!Array.isArray(uiSettings.collapsedTilesCats)) uiSettings.collapsedTilesCats = [];
    if (!Array.isArray(uiSettings.collapsedCats)) uiSettings.collapsedCats = [];

    const saveUI = () => json.save(STORAGE.UISETTINGS, uiSettings);
    const getTodayString = () => new Date().toLocaleDateString("de-DE");

    let vehicleAvailability={}, vehicleExists={}, vehicleInUseCount={}, vehicleTotalCount={}, vehicleFreeCount={};
    let hasFreeCountData=false, vehicleLists={};

    let fzWrapper, uiRoot, tileEls={}, extWin=null, cssContent="", lastCSSHash="";
    let animFrameId=null, hideStartTime=null, hideDuration=0, safeHideTimer=null, isHovering=false;
    let redrawGrid = () => {};

    function _setEl(id, html){
        const el = document.getElementById(id);
        if(el && el.innerHTML !== html){
            el.innerHTML = html;
            return true;
        }
        return false;
    }

    // =======================================================
    // GEBÄUDE & LEHRGÄNGE
    // =======================================================
    async function ensureBuildingNames(buildingIds){
        if(_buildingsFullyLoaded || buildingIds.length === 0) return;
        const missingIds = buildingIds.filter(id => !buildingNameCache[id]);
        if(missingIds.length === 0) return;
        try {
            const bRes = await fetch("/api/buildings", {credentials: "same-origin"});
            if(bRes.ok){
                const buildings = await bRes.json();
                buildings.forEach(b => { buildingNameCache[b.id] = b.caption || ("Wache #" + b.id); });
                _buildingsFullyLoaded = true;
            }
        } catch(e) { console.warn("[Bobelle] Gebäude-Fetch fehlgeschlagen:", e); }
    }

    async function fetchSchoolings(){
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

        _setEl("fzBadge_Aus_Count", `${ICONS.school} ${count} aktiv`);

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
        badge.style.cssText = `font-size:12px;font-weight:bold;color:${color};`;
        badge.textContent = `${ICONS.school} Lade...`;

        const sub = document.createElement("div");
        sub.className = "fzSchoolingSub";
        sub.style.cssText = "font-size:10px;color:#666;margin-top:2px;";
        sub.textContent = "Bitte warten...";

        const nameSpan = document.createElement("span");
        nameSpan.className = "fzTileName";
        nameSpan.style.cssText = `font-weight:bold;color:${color};`;
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

        div.appendChild(wrapper);
        div.onclick = () => showSchoolingDetails();

        tileEls[key] = div;
        tileCache[key] = { el: div, lastState: null, schoolingBadge: badge, schoolingSub: sub };
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

            const typBadge = s.description ? `<span style="font-size:9px;background:rgba(123,63,160,0.15);color:${C_AUS};padding:1px 5px;border-radius:3px;margin-left:5px;font-weight:bold;">${s.description}</span>` : "";
            const pCount = s.participantCount > 0 ? `<span style="font-size:10px;color:#888;margin-left:6px;">${ICONS.person} ${s.participantCount}</span>` : "";

            return `<div style="padding:8px 10px;border-radius:5px;margin-bottom:6px;background:rgba(123,63,160,0.07);border-left:3px solid ${C_AUS};"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;"><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:bold;">${s.caption}${typBadge}</div><div style="font-size:10px;color:#555;margin-top:2px;">📍 ${s.buildingName}${pCount}</div>${progressHtml}</div><div style="font-size:13px;font-weight:bold;color:${restColor};flex-shrink:0;">${rest}</div></div></div>`;
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

    // =======================================================
    // UI UPDATES & STATUS
    // =======================================================
    function updateSubHeaderInfo(){
        const sysEl = document.getElementById("fzSysStatus");
        const updEl = document.getElementById("fzLastUpdate");
        const dispEl = document.getElementById("fzDispatcher");
        if(!sysEl || !updEl || !dispEl) return;

        sysEl.textContent = sysReady ? "Leitstelle betriebsbereit" : "Leitstelle offline / inaktiv";
        sysEl.style.color = sysReady ? uiSettings.subStatusColorOk : uiSettings.subStatusColorErr;
        updEl.textContent = "Letztes Update: " + lastUpdateStr;

        if(isUpdating) updEl.classList.add("fzUpdatingAnim");
        else updEl.classList.remove("fzUpdatingAnim");

        const rankEl = document.getElementById("current_level");
        dispEl.innerHTML = `Disposition: Bobelle <span style="margin-left:5px;">${rankEl ? rankEl.textContent.trim() : "Unbekannt"}</span>`;
    }

    function getTargetBody(){ return (extWin && !extWin.closed) ? extWin.document.body : document.body; }
    function getTargetDoc(){ return (extWin && !extWin.closed) ? extWin.document : document; }

    function getAvailabilitySummary(){
        const relevantKeys = KEYS.filter(k => !SCHOOLING_TILE_NAMES.has(k));
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
        const durationMs = Math.max(10, (uiSettings.funkalarmBlinkDuration || 120)) * 1000;
        alarmTimers[key] = setTimeout(() => {
            if(cached.funkalarmLabel) cached.funkalarmLabel.classList.remove("fzAlarming");
            delete alarmTimers[key];
        }, durationMs);
    }

    // =======================================================
    // HAUPT-API-SCHLEIFE (FAHRZEUGE & CREDITS)
    // =======================================================
    async function fetchCreditsDaily() {
        try {
            const res = await fetch('/credits/daily');
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

    function updateCreditsUI(){
        const wrap = getTargetDoc().getElementById("fzCreditsWrap");
        if(!wrap) return;
        const valColor = uiSettings.creditsValueColor;
        const einStr = creditsData.ein.toLocaleString('de-DE');
        const ausStr = creditsData.aus.toLocaleString('de-DE');
        const bilStr = creditsData.bilanz.toLocaleString('de-DE');
        const realBilColor = creditsData.bilanz >= 0 ? valColor : "#dc3545";
        const content = (!creditsData.date && creditsData.ein === 0)
            ? "Lade..."
            : `Ein: <span style="color:${valColor};margin:0 3px;">${einStr}</span> | Aus: <span style="color:${valColor};margin:0 3px;">${ausStr}</span> | Σ: <span style="color:${realBilColor};margin-left:3px;">${bilStr}</span>`;
        wrap.innerHTML = `<div class="fzResPill fzHeaderPill" id="fzCreditsPill" title="Credits" onclick="window.open('/credits/daily','_blank')" style="margin-left:${uiSettings.creditsGap}px;background:transparent;border:1px solid rgba(0,0,0,0.1);font-size:${uiSettings.creditsFontSize}px;color:${uiSettings.creditsLabelColor};">${content}</div>`;
    }

    async function updateAvailability(){
        if(isUpdating) return;
        if(!isMainPage) return;
        isUpdating = true;
        updateSubHeaderInfo();

        const now = Date.now();
        if(creditsData.date !== getTodayString() || (now - lastCreditsUpdate > 30000)){
            await fetchCreditsDaily();
        }

        for(const k of KEYS){
            vehicleAvailability[k] = false;
            vehicleExists[k] = false;
            vehicleInUseCount[k] = 0;
            vehicleTotalCount[k] = 0;
            vehicleFreeCount[k] = 0;
        }

        hasFreeCountData = false;
        vehicleLists = {};

        let catStats = {};
        for(const c of CATEGORY_ORDER) catStats[c] = {free:0, busy:0, s6:0, total:0};

        let vehicles = [];
        try {
            const response = await fetch("/api/vehicles", {credentials:"same-origin"});
            if(!response.ok) throw new Error("API Offline");
            vehicles = await response.json();
            if(!Array.isArray(vehicles)) throw new Error("Invalid API Data");
            sysReady = true;
        } catch(e) {
            sysReady = false;
            isUpdating = false;
            updateSubHeaderInfo();
            return;
        }

        const setExist = (k) => { if(tileMetaByKey[k]) vehicleExists[k] = true; };
        const setAvail = (k) => { if(tileMetaByKey[k]) vehicleAvailability[k] = true; };
        const addTotal = (k) => { if(tileMetaByKey[k]) vehicleTotalCount[k] = (vehicleTotalCount[k] || 0) + 1; };
        const addInUse = (k) => { if(tileMetaByKey[k]) vehicleInUseCount[k] = (vehicleInUseCount[k] || 0) + 1; };

        const isInitialLoad = !vehicleStateCache._initialized;

        for(const v of vehicles){
            const typeId = v.vehicle_type_id ?? v.vehicle_type ?? null;
            let fms = v.fms_real ?? v.fms ?? null;
            const fmsText = (v.fms_text || "").toLowerCase();

            if(!fms || fms === 0){
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

            const isInUse = (fms===3||fms===4||fms===7||fms===8);
            const isAvail = (fms===1||fms===2);
            let matchedKeys = new Set();

            const cachedMatch = VEHICLE_MATCH_CACHE.get(v.id);
            if(cachedMatch && cachedMatch.caption === v.caption){
                cachedMatch.keys.forEach(k => matchedKeys.add(k));
            } else {
                const vNameCustom = normalize(v.caption || "");
                const vNameType = normalize(v.vehicle_type_caption || v.vehicle_type_name || "");
                const mappedKeys = TYPE_ID_MAPPING[typeId];
                let idMatched = false;

                if(mappedKeys && mappedKeys.length > 0){
                    if(mappedKeys.length === 1){
                        matchedKeys.add(mappedKeys[0]);
                        idMatched = true;
                    } else {
                        for(const k of mappedKeys){
                            const tile = tileMetaByKey[k];
                            if(tile && tile.search && tile.search.length > 0){
                                let nameMatch = false;
                                if(tile.norm && (vNameCustom.includes(tile.norm) || vNameType.includes(tile.norm))) nameMatch = true;
                                if(!nameMatch){
                                    for(const s of tile.search){
                                        if(vNameCustom.includes(s) || vNameType.includes(s)){ nameMatch = true; break; }
                                    }
                                }
                                if(nameMatch){ matchedKeys.add(k); idMatched = true; }
                            } else {
                                matchedKeys.add(k);
                                idMatched = true;
                            }
                        }
                    }
                }

                if(!idMatched){
                    const cacheKey = vNameCustom + "|" + vNameType;
                    if(nameCache[cacheKey]){
                        for(const k of nameCache[cacheKey]) matchedKeys.add(k);
                    } else {
                        const found = [];
                        const searchTerms = [vNameCustom, vNameType];
                        for(const term of searchTerms){
                            if(SEARCH_INDEX[term]){
                                const results = Array.isArray(SEARCH_INDEX[term]) ? SEARCH_INDEX[term] : [SEARCH_INDEX[term]];
                                results.forEach(t => {
                                    matchedKeys.add(t.n);
                                    found.push(t.n);
                                });
                            }
                        }
                        if(nameCache[cacheKey] || Object.keys(nameCache).length < 500){
                            nameCache[cacheKey] = found;
                        }
                        for(const k of found) matchedKeys.add(k);
                    }
                }

                if (VEHICLE_TYPE_OVERRIDES[typeId]) {
                    VEHICLE_TYPE_OVERRIDES[typeId].del.forEach(k => matchedKeys.delete(k));
                    VEHICLE_TYPE_OVERRIDES[typeId].add.forEach(k => matchedKeys.add(k));
                }

                VEHICLE_MATCH_CACHE.set(v.id, {caption: v.caption, keys: Array.from(matchedKeys)});
            }

            // Funkalarm: Fahrzeug wechselt von frei (S1/S2) auf Anfahrt/Einsatzstelle (S3/S4)
            const oldFms = vehicleStateCache[v.id];
            if(!isInitialLoad && oldFms !== undefined && (oldFms === 1 || oldFms === 2) && (fms === 3 || fms === 4)){
                matchedKeys.forEach(k => triggerAlarm(k));
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

        const doc = getTargetDoc();
        requestAnimationFrame(() => {
            updateCreditsUI();

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

            for(const k of KEYS) updateTile(k);
            renderAvailabilityIndicator();
            isUpdating = false;
            lastUpdateStr = new Date().toLocaleTimeString("de-DE");
            updateSubHeaderInfo();
        });
    }

    // =======================================================
    // LOOPS & STYLES
    // =======================================================
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
                --fz-tile-h:${uiSettings.tileMinHeight}px;--fz-tile-gap:${uiSettings.tileGap}px;--fz-tile-bg:${uiSettings.tileBgColor};--fz-tile-text:${uiSettings.tileTextColor};
                --fz-name-fs:${uiSettings.tileNameSize}px;--fz-name-fw:${uiSettings.tileNameWeight};--fz-badge-fs:${uiSettings.badgeSize}px;
                --fz-id-sz:${uiSettings.tileIdSize}px;--fz-id-c:${uiSettings.tileIdColor};--fz-id-a:left;
                --fz-head-sz:${uiSettings.headerElementSize}px;--fz-pill-bg:${uiSettings.pillBgColor};--fz-pill-c:${uiSettings.pillTextColor};
                --fz-sub-st-sz:${uiSettings.subStatusSize}px;--fz-sub-st-fw:${uiSettings.subStatusWeight};--fz-sub-up-sz:${uiSettings.subUpdateSize}px;--fz-sub-up-fw:${uiSettings.subUpdateWeight};
                --fz-sub-up-c:${uiSettings.subUpdateColor};--fz-sub-dp-sz:${uiSettings.subDispSize}px;--fz-sub-dp-fw:${uiSettings.subDispWeight};--fz-sub-dp-c:${uiSettings.subDispColor};
                --fz-cat-stat-c:${uiSettings.catStatusTextColor};--fz-res-bg:${uiSettings.resourceTileBgColor};--fz-logo-sz:${uiSettings.logoSize}px;--fz-bar-c:${uiSettings.barColor};
                --fz-funk-sz:${uiSettings.funkalarmSize}px;--fz-funk-c:${uiSettings.funkalarmColor};--fz-funk-fw:${uiSettings.funkalarmBold?'bold':'normal'};
                --fz-funk-blink-c:${uiSettings.funkalarmBlinkColor};--fz-aus:${C_AUS};
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
            .fzRightWrapper{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;flex-shrink:0;min-width:max-content;padding-top:3px;padding-bottom:3px;}
            .fzBadgeSlot{display:flex;gap:2px;flex-wrap:wrap;margin-bottom:2px;min-height:0;}
            .fzBadge{font-weight:bold;font-size:var(--fz-badge-fs);padding:0px 4px;border-radius:2px;color:#fff;white-space:nowrap;line-height:1.2;}.fzBadgeInUse{background:#dc3545;}
            .fzTileName{font-size:var(--fz-name-fs);font-weight:var(--fz-name-fw);white-space:nowrap;text-overflow:ellipsis;width:100%;overflow:hidden;line-height:1.2;}
            .fzTileIdLabel{font-size:var(--fz-id-sz);color:var(--fz-id-c);text-align:var(--fz-id-a);width:100%;margin-top:1px;white-space:nowrap;line-height:1;}
            @keyframes fzAlarmBlink{0%{opacity:1;}45%{opacity:1;}65%{opacity:0.12;}100%{opacity:1;}}
            .fzFunkalarmLabel{font-size:var(--fz-funk-sz);color:var(--fz-funk-c);font-weight:var(--fz-funk-fw);white-space:nowrap;text-align:right;line-height:1;margin-bottom:2px;overflow:hidden;max-width:100%;text-overflow:ellipsis;}
            .fzFunkalarmLabel.fzAlarming{animation:fzAlarmBlink 1.4s ease-in-out infinite;color:var(--fz-funk-blink-c)!important;font-weight:bold!important;}
            .fzBottomBar{height:3px;background:#e0e0e0;border-radius:2px;overflow:hidden;width:100%;margin-top:2px;}.fzBottomBarFill{height:100%;background:var(--fz-bar-c);width:0%;transition:width 0.3s;}
            .fzTile.fzInUse{background:${uiSettings.tileColorInUse}!important;color:#222!important;}
            .fzTile.fzEmpty{background:${uiSettings.tileColorEmpty}!important;color:#222!important;}
            .fzTile.fzInUse .fzStatusDot,.fzTile.fzEmpty .fzStatusDot{background-color:#dc3545!important;}
            .fzTile.fzResource{background-color:var(--fz-res-bg)!important;color:#000!important;}
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
            .fzStatBox{background:#f8f9fa;padding:10px;border-radius:5px;text-align:center;border:1px solid #ddd;}.fzStatVal{font-size:18px;font-weight:bold;color:#333;}.fzStatLbl{font-size:10px;color:#666;text-transform:uppercase;margin-top:2px;}
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
            .fzCompactBusy{font-size:10px;color:#dc3545;font-weight:bold;flex-shrink:0;margin-left:auto;}
            .fzTileCollapseToggle{cursor:pointer;font-size:14px;padding:1px 3px;background:transparent;border:none;line-height:1.5;user-select:none;transition:transform 0.1s,opacity 0.15s;flex-shrink:0;opacity:0.75;}
            .fzTileCollapseToggle:hover{opacity:1;transform:scale(1.2);}.fzTileCollapseToggle.fzTCactive{opacity:1;}
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

    // =======================================================
    // KACHEL RENDER LOGIK
    // =======================================================
    function updateTile(key){
        if(SCHOOLING_TILE_NAMES.has(key)){ updateSchoolingTiles(); return; }
        const cached = tileCache[key];
        if(!cached || !cached.el) return;

        const inUse = vehicleInUseCount[key] || 0;
        let total = vehicleTotalCount[key] || 0;
        if(total === 0 && customStock[key] !== undefined) total = customStock[key];

        let free = 0;
        if(hasFreeCountData) free = vehicleFreeCount[key] || 0;
        else if(total > 0){
            free = total - inUse;
            if(free < 0) free = 0;
        }

        cached.lastState = {inUse,free,total};
        const el = cached.el;

        if(cached.bottomBar){
            const pct = total > 0 ? Math.min(100, Math.round((inUse / total) * 100)) : 0;
            cached.bottomBar.style.width = pct + "%";
        }

        if(cached.idLabel){
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

        if(cached.badgeSlot){
            let badgesHtml = "";
            if(inUse > 0) badgesHtml += `<span class="fzBadge fzBadgeInUse">Im Einsatz: ${inUse}</span>`;
            if(vehicleExists[key] || total > 0){
                const freeColor = free > 0 ? "#28a745" : "#dc3545";
                badgesHtml += `<span class="fzBadge" style="background:${freeColor}">Frei: ${free} / ${total}</span>`;
            }
            cached.badgeSlot.innerHTML = badgesHtml;
        }

        el.classList.remove("fzInUse","fzEmpty");
        if(total > 0 && free <= 0) el.classList.add("fzEmpty");
        else if(inUse > 0) el.classList.add("fzInUse");

        let dotColor;
        if(total > 0) dotColor = free > 0 ? "#5cb85c" : "#dc3545";
        else if(vehicleExists[key]) dotColor = "#f0ad4e";
        else dotColor = "#ff0000";

        if(cached.dot) cached.dot.style.backgroundColor = dotColor;
        if(cached.compactDot) cached.compactDot.style.backgroundColor = dotColor;
        if(cached.compactBusy){
            if(inUse > 0){
                cached.compactBusy.textContent = `▶${inUse}`;
                cached.compactBusy.style.display = "";
            } else cached.compactBusy.style.display = "none";
        }
    }

    function createTile(key){
        if(SCHOOLING_TILE_NAMES.has(key)) return createSchoolingTile(key);

        const meta = tileMetaByKey[key];
        const color = meta?.c || "#888";

        const div = document.createElement("div");
        div.className = "fzTile";
        div.dataset.key = key;

        if(meta && (meta.cat === "Ausbildung" || meta.cat === "Versorgung")) div.classList.add("fzResource");
        div.style.borderLeftColor = color;

        div.innerHTML = `
            <div class="fzTileCompactRow"><span class="fzCompactDot"></span><span class="fzCompactLabel">${key}</span><span class="fzCompactBusy" style="display:none;"></span></div>
            <div class="fzStatusDot" style="background-color:#ff0000;margin-right:5px;"></div>
            <div class="fzContentWrapper"><span class="fzBadgeSlot"></span><span class="fzTileName">${key}</span><div class="fzTileIdLabel"></div><div class="fzBottomBar"><div class="fzBottomBarFill"></div></div></div>
            <div class="fzRightWrapper"><div class="fzFunkalarmLabel">${uiSettings.funkalarmText || 'Funk-Alarm'}</div></div>
        `;
        div.onclick = () => showDetails(key);

        tileEls[key] = div;
        tileCache[key] = {
            el: div,
            dot: div.querySelector(".fzStatusDot"),
            compactDot: div.querySelector(".fzCompactDot"),
            compactLabel: div.querySelector(".fzCompactLabel"),
            compactBusy: div.querySelector(".fzCompactBusy"),
            badgeSlot: div.querySelector(".fzBadgeSlot"),
            tileName: div.querySelector(".fzTileName"),
            bottomBar: div.querySelector(".fzBottomBarFill"),
            idLabel: div.querySelector(".fzTileIdLabel"),
            funkalarmLabel: div.querySelector(".fzFunkalarmLabel"),
            lastState: null
        };
        return div;
    }

    // =======================================================
    // MODALS & EVENT HANDLER
    // =======================================================
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

    function showDetails(key){
        if(SCHOOLING_TILE_NAMES.has(key)){ showSchoolingDetails(); return; }

        const list = vehicleLists[key] || [];

        let fmsCounts = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0};
        list.forEach(v => { if(v.fms>=1 && v.fms<=8) fmsCounts[v.fms]++; });
        const fmsTotal = list.length || 1;

        let fmsBarHtml = `<div class="fzSectionTitle" style="margin-top:0;">FMS-Übersicht (${list.length} Fahrzeuge)</div>`;
        if(list.length > 0){
            let segments = "";
            for(let s=1; s<=8; s++){
                if(fmsCounts[s] > 0){
                    const pct = Math.round((fmsCounts[s] / fmsTotal) * 100);
                    const textColor = (s === 3) ? "#000" : "#fff";
                    segments += `<div title="S${s}: ${fmsCounts[s]}" style="width:${pct}%;background:${FMS_COLORS[s]};height:100%;display:flex;align-items:center;justify-content:center;transition:width 0.4s;">${pct>=10?`<span style="font-size:9px;color:${textColor};font-weight:bold;line-height:1;">${fmsCounts[s]}</span>`:""}</div>`;
                }
            }
            fmsBarHtml += `<div style="display:flex;height:18px;border-radius:4px;overflow:hidden;margin-bottom:6px;border:1px solid #ddd;">${segments}</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">`;
            for(let s=1; s<=8; s++){
                if(fmsCounts[s] > 0){
                    const textColor = (s === 3) ? "#000" : "#fff";
                    fmsBarHtml += `<span style="font-size:11px;background:${FMS_COLORS[s]};color:${textColor};padding:2px 8px;border-radius:10px;font-weight:bold;">S${s}: ${fmsCounts[s]}</span>`;
                }
            }
            fmsBarHtml += `</div>`;
        } else {
            fmsBarHtml += `<div style="color:#999;font-size:12px;margin-bottom:12px;">Keine Fahrzeuge vorhanden.</div>`;
        }

        const isBusy = (f) => (f===3||f===4||f===7||f===8);

        const renderVehicleList = (filter) => {
            let filtered = [...list];
            if(filter === "free") filtered = list.filter(v => v.fms === 1 || v.fms === 2);
            else if(filter === "busy") filtered = list.filter(v => isBusy(v.fms));
            else if(filter === "s6") filtered = list.filter(v => v.fms === 6);

            filtered.sort((a,b) => {
                const aInUse = isBusy(a.fms);
                const bInUse = isBusy(b.fms);
                if(aInUse && !bInUse) return -1;
                if(!aInUse && bInUse) return 1;
                return a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
            });

            if(filtered.length === 0) return `<div style='padding:10px;text-align:center;color:#999'>Keine Fahrzeuge in dieser Kategorie.</div>`;

            return filtered.map(v => {
                let color = "#28a745";
                if(v.fms === 6) color = "#000000";
                else if(isBusy(v.fms)) color = "#dc3545";
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
        const countBusy = list.filter(v => isBusy(v.fms)).length;
        const countS6 = list.filter(v => v.fms === 6).length;

        const ol = document.createElement("div");
        ol.className = "fzModalOverlay";
        ol.onclick = (e) => { if(e.target === ol) ol.remove(); };
        ol.innerHTML = `<div class="fzModal"><h3>${key} - Details</h3>${fmsBarHtml}<div class="fzSectionTitle">Fahrzeugliste (${list.length})</div><div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;" id="fzVehicleFilterBtns"><button class="fzFilterBtn active" data-filter="all">Alle (${list.length})</button><button class="fzFilterBtn" data-filter="free" style="border-color:#28a745;">🟢 Frei (${countFree})</button><button class="fzFilterBtn" data-filter="busy" style="border-color:#dc3545;">🔴 Im Einsatz (${countBusy})</button><button class="fzFilterBtn" data-filter="s6" style="border-color:#6c757d;">⚫ S6 (${countS6})</button></div><div id="fzVehicleListContent" style="max-height:300px;overflow-y:auto;">${renderVehicleList("all")}</div><button class="fzBtn" style="margin-top:15px;width:100%" onclick="this.closest('.fzModalOverlay').remove()">Schließen</button></div>`;

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
            {t:"Kacheln: Text & Badges",i:[["Name Größe (px)","tileNameSize","number"],["Name Fett","tileNameWeight","select",["bold","normal"]],["Badge Größe (px)","badgeSize","number"]]},
            {t:"Status",i:[["Bg (Im Einsatz)","tileColorInUse","color"],["Bg (Leer/0)","tileColorEmpty","color"]]},
            {t:"Sub-Infos",i:[["Status Größe","subStatusSize","number"],["Status (Bereit)","subStatusColorOk","color"],["Status (Fehler)","subStatusColorErr","color"],["Update Farbe","subUpdateColor","color"],["Dispo Farbe","subDispColor","color"]]},
            {t:"Credits Counter",i:[["Abstand (px)","creditsGap","number"],["Schriftgröße","creditsFontSize","number"],["Label Farbe","creditsLabelColor","color"],["Zahlen Farbe","creditsValueColor","color"]]},
            {t:"Funkalarmierung",i:[["Beschriftung","funkalarmText","text"],["Schriftgröße","funkalarmSize","number"],["Textfarbe","funkalarmColor","color"],["Blinkfarbe","funkalarmBlinkColor","color"],["Blink-Dauer (Sek)","funkalarmBlinkDuration","number"]]},
            {t:"System & Verhalten",i:[["Auto-Hide (sek)","autoHideSeconds","number"],["API Update (sek)","apiInterval","number"],["Lehrgänge Update (sek)","schoolingApiInterval","number"]]}
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

        btnRow.appendChild(btnSync);
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

    function initUI(){
        if(fzWrapper || !isMainPage) return;
        injectCSS();

        fzWrapper = document.createElement("div");
        fzWrapper.className = "fzWrapper";
        if(uiSettings.compactMode) fzWrapper.classList.add("fzCompact");

        fzWrapper.onmouseleave = () => startCountdown();
        fzWrapper.onmouseenter = () => { resetCountdown(); fzWrapper.classList.remove("fzHidden"); };

        const fzHeader = document.createElement("div");
        fzHeader.className = "fzHeader";
        fzHeader.innerHTML = `<div class="fzHeaderLeft"><img src="${uiSettings.logoUrl}" class="fzLogo" alt="Logo"><div style="display:flex;flex-direction:column;justify-content:center;gap:3px;"><div style="display:flex;gap:5px;align-items:center;flex-wrap:nowrap;"><div id="fzAvailIndicator" class="fzHeaderPill" title="Verfügbarkeit">...</div><div id="fzAmpel" class="fzTrafficLight" title="Auto-Hide Timer"><div class="fzLight red"></div><div class="fzLight yellow"></div><div class="fzLight green active"></div></div><div id="fzCreditsWrap" style="display:flex;gap:5px;"></div></div><div class="fzSubInfoRow"><span id="fzSysStatus">Warte auf System...</span><span id="fzLastUpdate"></span><span id="fzDispatcher"></span></div></div></div><div class="fzHeaderRight"><div id="fzRelocatedButtons"><a href="https://www.leitstellenspiel.de/buildings/26017007" target="_blank" class="fzHeadBtn" title="Leitstelle Bielefeld" style="text-decoration:none;color:inherit;">${SVGS.building}</a><a href="https://www.leitstellenspiel.de/leitstellenansicht" target="_blank" class="fzHeadBtn" title="Wachenübersicht" style="text-decoration:none;color:inherit;">${SVGS.building}</a><a href="https://www.leitstellenspiel.de/buildings/26794438#tab_projected_missions" target="_blank" class="fzHeadBtn" title="SAR Leitstelle" style="text-decoration:none;color:inherit;">${SVGS.anchor}</a><span class="fzHeadBtn" id="fzToggleCompact" title="Kompakt/Normal">${SVGS.eye}</span><span class="fzHeadBtn" id="fzGlobalCollapse" title="Kategorien alle auf/zu">${SVGS.collapse}</span><span class="fzHeadBtn" id="fzGlobalTileCollapse" title="Alle Kacheln ein-/ausklappen" style="font-size:16px;opacity:0.8;">▦</span><span class="fzHeadBtn" id="fzSettingsButton" title="Einstellungen">${SVGS.settings}</span><span class="fzHeadBtn" id="fzPopoutButton" title="Fenster">${SVGS.popout}</span><span class="fzHeadBtn" id="fzFullscreenButton" title="Vollbild">${SVGS.maximize}</span><span class="fzHeadBtn" id="fzMinimizeButton" title="Minimieren">${SVGS.minimize}</span></div></div>`;
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
            updateCreditsUI();
        }, 500);

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
                            const tileEl = createTile(tileMeta.n);
                            if(isTileCompact) tileEl.classList.add("fzTileCompact");
                            uiRoot.appendChild(tileEl);
                        });
                    }
                }
            });

            KEYS.forEach(k => updateTile(k));
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
                if(!isUpdating) setTimeout(updateAvailability, 100);
            });
        }

        if(typeof sap !== 'undefined' && sap.audio_play){
            const originalAudioPlay = sap.audio_play;
            let apiDebounce = null;
            sap.audio_play = function(audio){
                originalAudioPlay.apply(this,arguments);
                if(audio && (audio.includes('fms') || audio.includes('radio'))){
                    if(apiDebounce) clearTimeout(apiDebounce);
                    apiDebounce = setTimeout(updateAvailability, 100);
                }
            };
        }
    }

    // =======================================================
    // START
    // =======================================================
    if(isMainPage){
        const startDashboard = () => {
            initUI();
            registerEventListener();
            setTimeout(() => startApiLoop(), 1000);
            setTimeout(() => startSchoolingLoop(), 1500);
            setTimeout(updateAvailability, 1800);
            setTimeout(fetchSchoolings, 2500);
        };
        setTimeout(startDashboard, 100);
    }
})();
