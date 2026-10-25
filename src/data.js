// Länderdaten: Regionen, deutsche Namensabweichungen, Schreibweisen fürs Tippen
window.ORBISTA_DATA={};
const REGIONS={
  Europa:"AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA",
  Asien:"AF AM AZ BH BD BT BN KH CN GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE",
  Afrika:"DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW",
  Nordamerika:"AG BS BB BZ CA CR CU DM DO SV GD GT HT HN JM MX NI PA KN LC VC TT US",
  Südamerika:"AR BO BR CL CO EC GY PY PE SR UY VE",
  Ozeanien:"AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU"
};
const NAME_FIX={XK:"Kosovo",MK:"Nordmazedonien",CZ:"Tschechien",SZ:"Eswatini",CV:"Kap Verde",CI:"Elfenbeinküste",MM:"Myanmar",TL:"Osttimor",PS:"Palästina",GB:"Vereinigtes Königreich",US:"USA",CD:"DR Kongo",CG:"Republik Kongo",VA:"Vatikanstadt",BA:"Bosnien und Herzegowina",KR:"Südkorea",KP:"Nordkorea",RU:"Russland",FM:"Mikronesien",ST:"São Tomé und Príncipe",TW:"Taiwan",LA:"Laos",SY:"Syrien",IR:"Iran",VN:"Vietnam",BN:"Brunei",BY:"Belarus",MD:"Moldau",AE:"Vereinigte Arabische Emirate",TR:"Türkei",BS:"Bahamas",GM:"Gambia",KN:"St. Kitts und Nevis",LC:"St. Lucia",VC:"St. Vincent und die Grenadinen"};
const ALIAS={US:["vereinigte staaten","usa","amerika"],GB:["grossbritannien","großbritannien","england","uk"],CZ:["tschechische republik","tschechei"],CI:["cote d ivoire","côte d’ivoire"],MK:["mazedonien"],MM:["burma"],SZ:["swasiland"],TL:["timor-leste"],BY:["weissrussland","weißrussland"],CG:["kongo"],VA:["vatikan"],NL:["holland"],MD:["moldawien"],CV:["kapverden"],PS:["palaestina"],AE:["emirate","vae"],ST:["sao tome und principe"],BA:["bosnien"],KR:["korea"],DO:["dominikanische republik"],TT:["trinidad und tobago","trinidad"],AG:["antigua"],KN:["st kitts und nevis","saint kitts und nevis"],LC:["saint lucia"],VC:["saint vincent"]};
Object.assign(window.ORBISTA_DATA,{REGIONS,NAME_FIX,ALIAS});
