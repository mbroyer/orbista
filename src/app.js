(function(){
const {REGIONS,NAME_FIX,ALIAS,CAPITAL,CAP_ALIAS,CAP_NOTE}=window.ORBISTA_DATA;
let dn; try{dn=new Intl.DisplayNames(["de"],{type:"region"})}catch(e){dn=null}
const C={}; // code -> {code,name,cap,region}
for(const [reg,list] of Object.entries(REGIONS)) for(const code of list.split(" ")){
  let n=NAME_FIX[code]; if(!n){try{n=dn&&dn.of(code)}catch(e){} } C[code]={code,name:n||code,cap:CAPITAL[code],region:reg};
}
const ALL=Object.keys(C);
const flag=c=>window.ORBISTA_FLAGS[c];
const $=id=>document.getElementById(id);
const norm=s=>s.toLowerCase().replace(/ß/g,"ss").replace(/ä/g,"a").replace(/ö/g,"o").replace(/ü/g,"u").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ae|oe|ue/g,m=>m[0]).replace(/[^a-z]/g,"");
function lev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){let c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]}
function matches(code,input,cap){const g=norm(input);if(!g)return false;
  const cands=(cap?[C[code].cap,...(CAP_ALIAS[code]||[])]:[C[code].name,...(ALIAS[code]||[])]).map(norm);
  return cands.some(t=>t===g||(t.length>=7&&lev(t,g)<=1)||(t.length>=12&&lev(t,g)<=2))}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// Fortschritt (nur lokal im Browser, optional), getrennt für Flaggen (f), Hauptstädte (c) und Landkarte (m)
// Schlüssel nie umbenennen; alter Stand aus Flaggo wird beim ersten Start übernommen
const KEYS={f:"orbista.mastery",c:"orbista.capitals",m:"orbista.map"};
const M={f:{},c:{},m:{}};
try{M.f=JSON.parse(localStorage.getItem(KEYS.f)||localStorage.getItem("flaggo.mastery")||"{}")}catch(e){}
try{M.c=JSON.parse(localStorage.getItem(KEYS.c)||"{}")}catch(e){}
try{M.m=JSON.parse(localStorage.getItem(KEYS.m)||"{}")}catch(e){}
function saveMastery(k){try{localStorage.setItem(KEYS[k],JSON.stringify(M[k]))}catch(e){}}

// Sterne pro Karte: 1 = einmal richtig, 2 = gekonnt (r ≥ 2, r > w, an zwei Tagen richtig),
// 3 = gemeistert (einmal richtig getippt und mindestens 7 Tage nach dem zweiten Stern wieder richtig).
// Felder je Karte: r, w, s (Sterne), due (fällig ab Tag), d1 (Tag der ersten richtigen Antwort), d2 (Tag des zweiten Sterns), t (richtig getippt)
const today=()=>{const d=new Date();return Math.floor((d-d.getTimezoneOffset()*6e4)/864e5)};
const GAP=[0,1,3,14]; // Tage bis zur nächsten Fälligkeit je Sternzahl
function card(k,c){const m=M[k][c];if(m&&m.s===undefined){m.s=m.r>=2&&m.r>m.w?2:m.r>=1?1:0;m.due=today()}return m}
const stars=(k,c)=>{const m=card(k,c);return m?m.s:0};
const known=(k,c)=>stars(k,c)>=2;
function record(k,c,ok,typed){
  const T=today(),m=card(k,c)||(M[k][c]={r:0,w:0,s:0,due:T}),before=m.s;
  if(ok){
    m.r++;if(typed)m.t=1;
    if(m.s===0){m.s=1;m.d1=T}
    else if(m.s===1&&m.r>=2&&m.r>m.w&&T>(m.d1||T)){m.s=2;m.d2=T}
    else if(m.s===2&&m.t&&T-(m.d2||T)>=7)m.s=3;
    m.due=T+GAP[m.s];
  }else{m.w++;m.s=Math.max(0,m.s-1);m.due=T;if(m.s<2)m.d2=undefined}
  saveMastery(k);return m.s-before;
}
const starStr=n=>"★".repeat(n)+"☆".repeat(3-n);

// Reisepunkte (XP, nur im Hintergrund für die spätere Rangliste), Tagesziel und Serie
const PKEY="orbista.profile";
let P={xp:0,day:0,dayXp:0,dayQ:0,goalQ:10,streak:0,goalDay:-9,restWeek:-1};
try{Object.assign(P,JSON.parse(localStorage.getItem(PKEY)||"{}"))}catch(e){}
// Früher war das Tagesziel in XP (30/50/100), jetzt in Fragen (5/10/20)
if(P.goal!==undefined){if(!(P.goalQ>0)||P.goalQ===10)P.goalQ={30:5,50:10,100:20}[P.goal]||10;delete P.goal}
function saveProfile(){try{localStorage.setItem(PKEY,JSON.stringify(P))}catch(e){}}
const week=d=>Math.floor((d+3)/7); // Wochen beginnen montags
// Serie zählt, solange das Tagesziel gestern erreicht wurde; ein verpasster Tag pro Woche wird als Ruhetag überbrückt
const restOk=T=>P.goalDay===T-2&&P.restWeek!==week(T-1);
const streakNow=()=>{const T=today();return P.goalDay>=T-1||restOk(T)?P.streak:0};
function newDay(){const T=today();if(P.day!==T){P.day=T;P.dayXp=0;P.dayQ=0}return T}
function addXp(n){newDay();P.xp+=n;P.dayXp+=n;if(!P.since)P.since=today();saveProfile()}
// Tagesziel in beantworteten Fragen (richtig oder falsch), damit der Aufwand greifbar ist; die Serie hängt daran
function addQ(){
  const T=newDay(),had=P.dayQ>=P.goalQ;P.dayQ++;
  let reached=false;
  if(!had&&P.dayQ>=P.goalQ){
    if(P.goalDay===T-1)P.streak++;
    else if(restOk(T)){P.streak++;P.restWeek=week(T-1)}
    else if(P.goalDay!==T)P.streak=1;
    P.goalDay=T;reached=true;
  }
  saveProfile();return reached;
}
const dayQ=()=>P.day===today()?P.dayQ||0:0;

// Klänge „Holz“: Marimba-Töne, direkt im Browser erzeugt (keine Audiodateien). Stummschalten auf der Startseite, gemerkt in orbista.profile.sound
let AC=null,OUT=null;
const soundOn=()=>P.sound!==false;
function ac(){
  if(!AC){const K=window.AudioContext||window.webkitAudioContext;if(!K)return null;AC=new K();OUT=AC.createGain();OUT.gain.value=.7;OUT.connect(AC.destination)}
  if(AC.state==="suspended")AC.resume();
  return AC;
}
const hz=m=>440*Math.pow(2,(m-69)/12);
function tone(type,f,s,peak,att,dec,f2){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,s);if(f2)o.frequency.exponentialRampToValueAtTime(f2,s+att+dec);
  g.gain.setValueAtTime(.0001,s);g.gain.linearRampToValueAtTime(peak,s+att);g.gain.exponentialRampToValueAtTime(.0001,s+att+dec);
  o.connect(g).connect(OUT);o.start(s);o.stop(s+att+dec+.05);
}
function marimba(m,t=0,d=.5,v=.32){const s=AC.currentTime+t,f=hz(m);tone("sine",f,s,v,.004,d);tone("sine",f*4,s,v*.18,.002,.06);tone("sine",f*10,s,v*.05,.001,.02)}
function thump(){
  const s=AC.currentTime;tone("sine",110,s,.5,.003,.22,50);
  const n=Math.ceil(AC.sampleRate*.14),buf=AC.createBuffer(1,n,AC.sampleRate),ch=buf.getChannelData(0);for(let i=0;i<n;i++)ch[i]=Math.random()*2-1;
  const src=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();src.buffer=buf;fl.type="lowpass";fl.frequency.setValueAtTime(900,s);fl.frequency.exponentialRampToValueAtTime(200,s+.09);
  g.gain.setValueAtTime(.35,s);g.gain.exponentialRampToValueAtTime(.0001,s+.09);src.connect(fl).connect(g).connect(OUT);src.start(s);src.stop(s+.14);
}
const SFX={
  tap:()=>marimba(91,0,.06,.12),
  ok:()=>{marimba(76,0,.35);marimba(83,.08,.45)},
  bad:()=>{marimba(57,0,.35,.26);marimba(53,.13,.5,.22)},
  star:()=>{[79,83,88].forEach((m,i)=>marimba(m,i*.07,.4,.28));marimba(95,.22,.6,.16)},
  end:()=>{[60,64,67,72].forEach((m,i)=>marimba(m,i*.09,.5));[72,76,79].forEach(m=>marimba(m,.45,1.1,.18))},
  big:()=>{SFX.end();[79,84,88,91].forEach((m,i)=>marimba(m,1+i*.08,.5,.22));[84,88,91].forEach(m=>marimba(m,1.4,1.4,.15))},
  stamp:thump};
function play(k,delay=0){if(!soundOn())return;try{if(!ac())return;delay?setTimeout(()=>SFX[k](),delay):SFX[k]()}catch(e){}}

// Spielarten: der geführte Ablauf wählt sie selbst; beim gezielten Üben nur „Auswählen“ oder „Eintippen“
const MODE_NAME={f2l:"Flagge → Land",l2f:"Land → Flagge",type:"Land tippen",l2c:"Land → Hauptstadt",c2l:"Hauptstadt → Land",ctype:"Hauptstadt tippen",f2c:"Flagge → Hauptstadt",fctype:"Hauptstadt zur Flagge tippen",loc:"Land auf der Karte antippen",mark:"Markiertes Land → Name",mtype:"Markiertes Land tippen"};
const CAPMODES=["l2c","c2l","ctype","f2c","fctype"], MAPMODES=["loc","mark","mtype"], TYPEMODES=["type","ctype","fctype","mtype"], BOTHMODES=["f2c","fctype"];
const kindOf=m=>CAPMODES.includes(m)?"c":MAPMODES.includes(m)?"m":"f";
const pick=a=>a[Math.floor(Math.random()*a.length)];
const KIND={f:"Flaggen",c:"Hauptstädte",m:"Landkarte"};
const KINDS=["f","c","m"];
const svg=(d,cls="ic")=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON={flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4"/>',map:'<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',check:'<path d="M4 12l5 5L20 6"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'};
// Thema für „Weiterreisen“; „both“ heißt seit der Landkarte „Alles“ (Schlüssel bleibt für alte Profile)
const TOPICS=[["flag","Flaggen",ICON.flag],["cap","Hauptstädte",ICON.pin],["map","Landkarte",ICON.map],["both","Alles",ICON.globe]];
const kindsOf=t=>t==="flag"?["f"]:t==="cap"?["c"]:t==="map"?["m"]:KINDS;
const topicText=t=>t==="flag"?"Flaggen":t==="cap"?"Hauptstädte":t==="map"?"Länder auf der Landkarte":"Flaggen, Hauptstädte und die Landkarte";
const GOALS=[[5,"Locker","5 Fragen am Tag","2 Min."],[10,"Regelmäßig","10 Fragen, eine Runde","4 Min."],[20,"Ehrgeizig","20 Fragen, zwei Runden","8 Min."]];
const ROUND=10, ORDER=["Europa","Nordamerika","Südamerika","Asien","Afrika","Ozeanien"];
const poolOf=r=>r==="Alle"?ALL:REGIONS[r].split(" ");
const regionName=r=>r==="Alle"?"Ganze Welt":r;
const isDue=(k,c)=>{const m=card(k,c);return !!m&&m.due<=today()&&m.s<3};

// Zeitrennen: feste Strecke gegen die Uhr, jeder Fehler kostet 5 Sekunden, freigeschaltet mit dem ersten Visum
// (wer schon eine Bestzeit hat, behält den Zugang)
const PENALTY=5000;
const raceOpen=()=>Object.keys(P.stamps||{}).length>0||Object.keys(P.best||{}).length>0;
const fmt=ms=>{const t=Math.round(ms/100),m=Math.floor(t/600),sec=Math.floor(t/10)%60;return `${m}:${String(sec).padStart(2,"0")},${t%10}`};
const secs=ms=>(ms/1000).toFixed(1).replace(".",",")+" s";

const SCREENS=["welcome","home","setup","pass","game","result"];
function show(id){
  for(const s of SCREENS)$(s).hidden=s!==id;
  $("tabs").hidden=!(id==="home"||id==="pass");
  document.querySelectorAll("#tabs [data-tab]").forEach(b=>b.dataset.tab===id?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current"));
  scrollTo(0,0);
}

// Erster Start: Thema, Tagesziel und Startregion, alles später änderbar
let W={topic:"both",goal:10,start:"Europa"};
function renderWelcome(){
  $("wTopics").innerHTML=TOPICS.map(([id,t,ic])=>`<button data-t="${id}" aria-pressed="${W.topic===id}">${svg(ic,"")}${t}</button>`).join("");
  $("wGoals").innerHTML=GOALS.map(([g,t,d,m])=>`<button class="line goalline" data-g="${g}" aria-pressed="${W.goal===g}"><span class="tx">${W.goal===g?svg(ICON.check,"check"):""}<b>${t}</b><small>${d}</small></span><small>etwa ${m}</small></button>`).join("");
  $("wStart").innerHTML=ORDER.map(r=>`<button class="chip" data-r="${r}" aria-pressed="${W.start===r}">${r}</button>`).join("");
}
function openWelcome(){W={topic:P.topic||"both",goal:[5,10,20].includes(P.goalQ)?P.goalQ:10,start:ORDER.includes(P.start)?P.start:"Europa"};renderWelcome();show("welcome")}
$("wTopics").onclick=e=>{const b=e.target.closest("[data-t]");if(b){W.topic=b.dataset.t;renderWelcome()}};
$("wGoals").onclick=e=>{const b=e.target.closest("[data-g]");if(b){W.goal=+b.dataset.g;renderWelcome()}};
$("wStart").onclick=e=>{const b=e.target.closest("[data-r]");if(b){W.start=b.dataset.r;renderWelcome()}};
// Beim ersten Start geht es direkt in die erste Runde, die Startseite kommt erst danach.
$("begin").onclick=()=>{const first=!P.topic;P.topic=W.topic;P.goalQ=W.goal;P.start=W.start;saveProfile();if(first)startAuto();else goHome()};

// Weiterreisen: Orbista stellt die Runde selbst zusammen. Zuerst fällige Karten (wenige Sterne vorn),
// dann neue aus der ersten Region, die noch Unbekanntes hat (ab der gewählten Startregion `P.start`), dann die übrigen nach Fälligkeit.
// Ab zwei Sternen wird getippt, vorher ausgewählt.
function modeFor(k,c,typing,both){
  const t=typing===null?stars(k,c)>=2:typing;
  if(k==="f")return t?"type":pick(["f2l","l2f"]);
  if(k==="m")return t?"mtype":pick(["loc","mark"]);
  return t?(both?pick(["ctype","fctype"]):"ctype"):pick(both?["l2c","c2l","f2c"]:["l2c","c2l"]);
}
function autoPlan(){
  const ks=kindsOf(P.topic||"both"),cards=[];
  for(const k of ks)for(const c of ALL)cards.push([k,c]);
  const due=shuffle(cards.filter(([k,c])=>isDue(k,c))).sort((a,b)=>stars(a[0],a[1])-stars(b[0],b[1]));
  const order=ORDER.includes(P.start)?[P.start,...ORDER.filter(r=>r!==P.start)]:ORDER;
  const region=order.find(r=>ks.some(k=>poolOf(r).some(c=>!card(k,c))))||"Alle";
  const fresh=shuffle(cards.filter(([k,c])=>!card(k,c)&&(region==="Alle"||C[c].region===region)));
  const rest=cards.filter(([k,c])=>card(k,c)&&!isDue(k,c)).sort((a,b)=>card(a[0],a[1]).due-card(b[0],b[1]).due);
  const list=[...due,...fresh,...rest].slice(0,ROUND);
  return {region,due:Math.min(due.length,ROUND),items:list.map(([k,c])=>({c,m:modeFor(k,c,null,ks.length>1)}))};
}

// Startseite
let plan=null;
function renderHome(){
  const dx=dayQ(),g=P.goalQ,d=Math.min(dx,g),sk=streakNow(),r=28,u=2*Math.PI*r,left=g-dx;
  renderSound();renderWorld();
  $("status").innerHTML=`<button class="goal" id="goalBtn" aria-label="Tagesziel ${dx} von ${g} Fragen, antippen zum Ändern"><svg viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="${r}" class="ring0"/><circle cx="34" cy="34" r="${r}" class="ring1" stroke-dasharray="${u*d/g} ${u}"/></svg><b>${dx}</b></button>
  <div class="todaytxt"><b>Deine Reise heute</b><span>${left>0?`${dx} von ${g} Fragen · noch ${left} bis zum Tagesziel`:`Tagesziel geschafft · ${dx} Fragen`}</span><span class="streak">Serie: <b>${sk}</b> ${sk===1?"Tag":"Tage"} · ${Object.keys(P.stamps||{}).length} von ${KINDS.length*ORDER.filter(r=>REGIONS[r]).length} Visa</span></div>`;
  plan=autoPlan();
  const n=plan.items.length;
  $("goSub").textContent=plan.due>=n?`${n} Wiederholungen`:`${n} Fragen · ${regionName(plan.region)}`+(plan.due?` · ${plan.due} zum Wiederholen`:"");
  const cnt=k=>ALL.filter(c=>known(k,c)).length, times=Object.values(P.best||{});
  const row=(p,ic,t,sub,off)=>`<button class="line" data-p="${p}"${off?" disabled":""}>${svg(ic)}<span class="tx"><b>${t}</b><span>${sub}</span></span>${svg(off?ICON.lock:ICON.chev,"chev")}</button>`;
  $("paths").innerHTML=row("f",ICON.flag,"Flaggen",`${cnt("f")} von ${ALL.length} gekonnt`)+row("c",ICON.pin,"Hauptstädte",`${cnt("c")} von ${ALL.length} gekonnt`)+row("m",ICON.map,"Landkarte",`${cnt("m")} von ${ALL.length} gekonnt`)
    +row("race",ICON.clock,"Zeitrennen",!raceOpen()?"Ab dem ersten Visum im Reisepass":times.length?`Schnellste Runde ${fmt(Math.min(...times))}`:"Zehn Fragen gegen die Uhr",!raceOpen());
  $("topicLine").innerHTML=`„Weiterreisen“ fragt ${topicText(P.topic)}. <button class="link" id="changeTopic">Ändern</button>`+codeLine();
}
function goHome(){renderHome();show("home")}

// Deine Welt: Punktkarte, jedes Land leuchtet auf, sobald es entdeckt ist (ein Stern), und wird gold, wenn es
// in allen Karten des Themas gekonnt ist (zwei Sterne). Punkte aus src/dots.js (tools/dots.py).
function renderWorld(){
  const D=window.ORBISTA_DOTS,ks=kindsOf(P.topic||"both"),T=today(),cnt=[0,0,0],fresh=[];
  const dots=Object.entries(D.c).map(([c,cells])=>{
    const lv=ks.every(k=>stars(k,c)>=2)?2:ks.some(k=>stars(k,c)>=1)?1:0,isNew=lv>0&&ks.some(k=>{const m=card(k,c);return m&&m.d1===T});
    cnt[lv]++;if(isNew)fresh.push(c);
    return cells.map(i=>`<circle class="s${lv}${isNew?" n":""}" cx="${i%D.cols+.5}" cy="${Math.floor(i/D.cols)+.5}" r=".4"/>`).join("");
  }).join("");
  const all=cnt[0]+cnt[1]+cnt[2],names=fresh.map(c=>C[c].name).sort((a,b)=>a.localeCompare(b,"de"));
  const list=names.length<=3?names.join(", ").replace(/, ([^,]*)$/," und $1"):`${names.slice(0,2).join(", ")} und ${names.length-2} weitere`;
  $("world").innerHTML=`<div class="worldhead"><h2>Deine Welt</h2><b>${Math.round(100*cnt[2]/all)} %</b></div>
  <svg class="dots" viewBox="0 0 ${D.cols} ${D.rows}" role="img" aria-label="Weltkarte: ${cnt[1]+cnt[2]} von ${all} Ländern entdeckt, ${cnt[2]} gekonnt">${dots}</svg>
  <div class="worldkey"><span><i class="k2"></i>${cnt[2]} gekonnt</span><span><i class="k1"></i>${cnt[1]} entdeckt</span><span><i class="k0"></i>${cnt[0]} noch unbekannt</span></div>
  ${fresh.length?`<p class="worldnew"><b>Heute neu auf der Karte:</b> ${list}</p>`:""}`;
}
$("status").onclick=e=>{if(e.target.closest("#goalBtn")){P.goalQ=P.goalQ===5?10:P.goalQ===10?20:5;saveProfile();renderHome()}};
// Mit Reise-Code (Anmeldeseite auf der Website) steht der Code unter dem Thema, mit Link zum Wechseln
function codeLine(){let c=null;try{c=localStorage.getItem("orbista-code")}catch(e){}
  return c&&/^[A-Z0-9-]{4,24}$/.test(c)?`<br>Reise-Code ${c} · <a class="link" id="switchCode" href="./?wechseln">Wechseln</a>`:""}
$("topicLine").onclick=e=>{if(e.target.id==="changeTopic")openWelcome()};
$("go").onclick=()=>startAuto();
const SPK='<path d="M4 9h4l5-4v14l-5-4H4z"/>';
// Lautsprecher-Knopf auf jeder Seite (Startseite, Gezielt üben, Frage, Ergebnis, Reisepass), alle zeigen denselben Zustand
const sndBtn=()=>`<button class="iconbtn sndbtn"></button>`;
function renderSound(){const on=soundOn();document.querySelectorAll(".sndbtn").forEach(b=>{b.setAttribute("aria-pressed",String(on));b.setAttribute("aria-label",on?"Klänge ausschalten":"Klänge einschalten");
  b.innerHTML=svg(SPK+(on?'<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>':'<path d="M16 9l5 6M21 9l-5 6"/>'),"")})}
document.addEventListener("click",e=>{if(e.target.closest(".sndbtn")){P.sound=!soundOn();saveProfile();renderSound();play("tap")}});
// Hell/Dunkel-Umschalter auf jeder Seite neben dem Lautsprecher (im Erststart allein): Standard hell, nur auf diesem Gerät gemerkt (orbista.theme, nicht im Reise-Code)
const themeBtn=()=>`<button class="iconbtn themebtn"></button>`;
const isDark=()=>document.documentElement.dataset.theme==="dark";
function renderTheme(){const d=isDark();document.querySelectorAll(".themebtn").forEach(b=>{b.setAttribute("aria-pressed",String(d));b.setAttribute("aria-label",d?"Hellen Modus einschalten":"Dunklen Modus einschalten");
  b.innerHTML=svg(d?'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>':'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',"")})}
document.addEventListener("click",e=>{if(e.target.closest(".themebtn")){const d=!isDark();document.documentElement.dataset.theme=d?"dark":"light";try{localStorage.setItem("orbista.theme",d?"dark":"light")}catch(x){}renderTheme()}});
// leises Klicken bei Knöpfen; Antworten klingen über richtig oder falsch
document.addEventListener("click",e=>{const b=e.target.closest("button");if(b&&!b.disabled&&!b.classList.contains("opt")&&!b.classList.contains("sndbtn")&&!b.closest("#tf"))play("tap")});
$("paths").onclick=e=>{const b=e.target.closest("[data-p]");if(b&&!b.disabled){S.path=b.dataset.p;if(S.path!=="race")S.kind=S.path;else if(S.kind==="m")S.kind="f";renderSetup();show("setup")}};
$("tabs").onclick=e=>{const b=e.target.closest("[data-tab]");if(!b)return;if(b.dataset.tab==="pass"){renderPass();show("pass")}else goHome()};

// Gezielt üben: Region und Antwortart wählen, mehr nicht
let S={path:"f",kind:"f",region:"Europa",typing:false};
const raceMode=()=>S.kind==="f"?(S.typing?"type":"f2l"):(S.typing?"ctype":"l2c");
const raceKey=()=>[raceMode(),S.region,ROUND].join("|");
function renderSetup(){
  const race=S.path==="race",k=S.kind;
  $("setupTitle").textContent=race?"Zeitrennen":KIND[k];
  $("setupSub").textContent=race?"Zehn Fragen gegen die Uhr. Jeder Fehler kostet 5 Sekunden.":"Wohin geht die Reise? Orbista nimmt zuerst, was fällig ist, dann Neues.";
  $("raceBox").hidden=!race;
  $("raceKinds").innerHTML=["f","c"].map(x=>`<button data-k="${x}" aria-pressed="${k===x}">${KIND[x]}</button>`).join("");
  $("regions").innerHTML=[...Object.keys(REGIONS),"Alle"].map(r=>{const pool=poolOf(r),n=pool.filter(c=>known(k,c)).length;
    return `<button class="line" data-r="${r}" aria-pressed="${S.region===r}"><span class="row1"><b>${regionName(r)}</b><span>${n} von ${pool.length}</span></span><span class="meter"><i style="width:${100*n/pool.length}%"></i></span></button>`}).join("");
  $("answers").innerHTML=[[0,"Auswählen"],[1,"Eintippen"]].map(([v,t])=>`<button data-a="${v}" aria-pressed="${S.typing===!!v}">${t}</button>`).join("");
  const best=(P.best||{})[raceKey()];
  $("answerHint").textContent=race?(best?`Deine Bestzeit für diese Strecke: ${fmt(best)}`:"Noch keine Bestzeit für diese Strecke."):k==="m"?(S.typing?"Ein Land leuchtet auf, du tippst seinen Namen. Das zählt für den dritten Stern.":"Mal tippst du das Land auf der Karte an, mal wählst du den Namen zum markierten Land."):"Eintippen zählt für den dritten Stern.";
  const due=poolOf(S.region).filter(c=>isDue(k,c)).length;
  $("setupGoSub").textContent=`${regionName(S.region)} · ${ROUND} Fragen`+(due&&!race?` · ${due} zum Wiederholen`:"");
}
$("setupBack").onclick=()=>goHome();
$("raceKinds").onclick=e=>{const b=e.target.closest("[data-k]");if(b){S.kind=b.dataset.k;renderSetup()}};
$("regions").onclick=e=>{const b=e.target.closest("[data-r]");if(b){S.region=b.dataset.r;renderSetup()}};
$("answers").onclick=e=>{const b=e.target.closest("[data-a]");if(b){S.typing=b.dataset.a==="1";renderSetup()}};
$("setupGo").onclick=()=>startSetup();

// Landkarte: eine einzige SVG-Karte (Natural Earth, src/map.js), die je Frage auf die Region der Frage schwenkt.
// Kleinstaaten bekommen einen Kreis zum Antippen; mit + und − zoomen, mit dem Finger verschieben.
// Die Karte zoomt nie von selbst (Mark: man soll sehen, wo ein Land im Verhältnis zu den anderen liegt);
// ein kleines markiertes Land bekommt stattdessen einen Pfeil.
const MAP=window.ORBISTA_MAP;
let MAP_VIEW=null;
// Gradnetz alle 10° in derselben Projektion wie tools/map.py (Natural Earth I), bis 360° für das verschobene Ozeanien
function gridPath(){
  const P=(lon,lat)=>{const p=lat*Math.PI/180,l=lon*Math.PI/180,p2=p*p,p4=p2*p2;
    return Math.round(800*l*(.8707-.131979*p2+p4*(-.013791+p4*(.003971*p2-.001529*p4))))+" "+Math.round(-800*p*(1.007226+p2*(.015085+p4*(-.044475+.028874*p2-.005916*p4))))};
  const line=pts=>"M"+pts.map(([a,b])=>P(a,b)).join("L"),r=(a,b,s)=>Array.from({length:Math.floor((b-a)/s)+1},(_,i)=>a+i*s);
  return r(-180,360,10).map(lon=>line(r(-80,80,5).map(lat=>[lon,lat]))).join("")+r(-80,80,10).map(lat=>line(r(-180,360,5).map(lon=>[lon,lat]))).join("")}
// Nachbarn für die Auswahl beim markierten Land: die nächsten Länder nach Kartenabstand
function near(code){const [x,y]=MAP.box[code]||[0,0];
  const d=c=>{const b=MAP.box[c];return b?Math.hypot(b[0]-x,b[1]-y):1e9};
  return shuffle(ALL.filter(c=>c!==code).sort((a,b)=>d(a)-d(b)).slice(0,6)).slice(0,3)}
function mapView(){
  if(!MAP_VIEW){
    const el=document.createElement("div");el.className="mapbox";el.id="map";
    const small=ALL.filter(c=>MAP.box[c]&&MAP.box[c][2]<40);
    const land=`<path d="${MAP.bg}"/>${Object.values(MAP.p).map(d=>`<path d="${d}"/>`).join("")}`;
    el.innerHTML=`<svg role="img" aria-label="Landkarte" preserveAspectRatio="xMidYMid meet"><defs><g id="mapLand">${land}</g></defs><path class="grid" d="${gridPath()}"/>${[3,2,1].map(i=>`<use href="#mapLand" class="wl wl${i}"/>`).join("")}<path class="bg" d="${MAP.bg}"/>${Object.keys(MAP.p).map(c=>`<path class="c${MAP.isl.includes(c)?" isl":""}" data-c="${c}" d="${MAP.p[c]}"/>`).join("")}${small.map(c=>`<circle class="dot" data-c="${c}" cx="${MAP.box[c][0]}" cy="${MAP.box[c][1]}" r="4"/>`).join("")}<g class="arrow" hidden><circle/><path/></g></svg>
      <div class="zoom"><button type="button" data-z=".6" aria-label="Näher heran">+</button><button type="button" data-z="1.66" aria-label="Weiter weg">−</button></div>`;
    const svg=el.querySelector("svg"),arrow=el.querySelector(".arrow");let home=[0,0,1,1],vb=home,target=null;
    // Pfeil in fester Bildschirmgröße (k = Karteneinheiten pro Pixel), von der Kartenmitte her auf das Land, mit Ring darum;
    // nur solange das Land auf dem Bildschirm kleiner als 24 px ist
    const drawArrow=k=>{const b=target&&MAP.box[target];const off=!b||b[2]/k>=24;arrow.toggleAttribute("hidden",off);if(off)return;
      const [x,y]=b,ring=Math.max(10*k,b[2]/2+4*k),cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2;
      let dx=cx-x,dy=cy-y,l=Math.hypot(dx,dy);if(l<1){dx=1;dy=-1;l=Math.SQRT2}dx/=l;dy/=l;
      const len=46*k,hx=x+dx*(ring+3*k),hy=y+dy*(ring+3*k),tx=hx+dx*len,ty=hy+dy*len,w=7*k,bx=hx+dx*12*k,by=hy+dy*12*k;
      arrow.firstChild.setAttribute("cx",x);arrow.firstChild.setAttribute("cy",y);arrow.firstChild.setAttribute("r",ring);
      arrow.lastChild.setAttribute("d",`M${tx} ${ty}L${bx} ${by}M${hx} ${hy}L${bx-dy*w} ${by+dx*w}L${bx+dy*w} ${by-dx*w}Z`)};
    // Kreise immer etwa gleich groß auf dem Bildschirm; sichtbar nur, solange das Land selbst zu klein zum Antippen ist
    const set=v=>{vb=v;svg.setAttribute("viewBox",v.join(" "));const k=v[2]/(svg.clientWidth||360);
      el.querySelectorAll(".dot").forEach(d=>{const s=MAP.box[d.dataset.c][2]/k;d.setAttribute("r",7*k);d.style.display=s<14?"":"none"});drawArrow(k)};
    el.querySelector(".zoom").onclick=e=>{const z=+e.target.dataset.z;if(!z)return;const cx=vb[0]+vb[2]/2,cy=vb[1]+vb[3]/2,w=Math.min(home[2]*1.3,Math.max(home[2]/12,vb[2]*z)),h=w*home[3]/home[2];set([cx-w/2,cy-h/2,w,h])};
    let drag=null,moved=0;
    svg.addEventListener("pointerdown",e=>{drag=[e.clientX,e.clientY,vb[0],vb[1]];moved=0});
    svg.addEventListener("pointermove",e=>{if(!drag)return;const k=vb[2]/svg.clientWidth,dx=e.clientX-drag[0],dy=e.clientY-drag[1];moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));
      if(moved>8){svg.setPointerCapture&&svg.setPointerCapture(e.pointerId);set([drag[2]-dx*k,drag[3]-dy*k,vb[2],vb[3]])}});
    const up=e=>{const t=moved<=8&&e.target.closest&&e.target.closest("[data-c]");drag=null;
      if(t&&G&&!G.locked&&G.mode==="loc"){const code=G.list[G.i].c;answer(t.dataset.c===code,code,t.dataset.c)}};
    svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",()=>{drag=null});
    MAP_VIEW={el,svg,
      show(r){home=MAP.view[r];svg.style.aspectRatio=home[2]+"/"+home[3];el.classList.remove("tap");this.clear();target=null;set(home.slice())},
      mark(c,cls){el.querySelectorAll(`[data-c="${c}"]`).forEach(x=>{x.classList.add(cls);if(x.tagName==="path")x.parentNode.insertBefore(x,el.querySelector(".dot"))})},
      clear(){el.querySelectorAll(".hi,.ok,.bad").forEach(x=>x.classList.remove("hi","ok","bad"))},
      point(c){target=c;set(vb)}};
  }
  return MAP_VIEW;
}

// Spiel
let G=null;
function pickQuestions(k,pool,n){
  // zuerst fällige Karten (wenige Sterne vorn), dann neue, dann die übrigen nach Fälligkeit
  const T=today(),rank=c=>{const m=card(k,c);return !m?[1,0]:m.due<=T?[0,m.s]:[2,m.due]};
  return shuffle(pool).map(c=>[rank(c),c]).sort((x,y)=>x[0][0]-y[0][0]||x[0][1]-y[0][1]).map(x=>x[1]).slice(0,n);
}
function startAuto(){const p=autoPlan();begin({items:p.items,restart:startAuto,next:"Weiterreisen"})}
function startSetup(){
  const race=S.path==="race",pool=poolOf(S.region),both=false;
  const items=pickQuestions(S.kind,pool,ROUND).map(c=>({c,m:race?raceMode():modeFor(S.kind,c,S.typing,both)}));
  begin({items,pool,race,key:race?raceKey():null,restart:startSetup,next:"Noch eine Runde"});
}
function begin(o){
  clearInterval(G&&G.clock);
  G=Object.assign({race:false,times:[],penalty:0,i:0,right:0,streak:0,best:0,missed:[],locked:false,hint:0,xp:0,newStars:0,mastered:0,goal:false},o,{list:o.items});
  show("game");
  if(G.race)G.clock=setInterval(hud,100);
  next();
}
function distractors(code){
  const pool=G.pool||poolOf(C[code].region);
  const c=shuffle(pool.filter(x=>x!==code));
  const base=c.length>=3?c:shuffle(ALL.filter(x=>x!==code));
  return base.sort((x,y)=>(C[x].region===C[code].region?0:1)-(C[y].region===C[code].region?0:1)).slice(0,3);
}
// Rennzeit = Summe der Antwortzeiten plus Strafzeit; die Anzeige der Lösung zwischen den Fragen zählt nicht
const raceMs=()=>G.times.reduce((a,t)=>a+t[1],0)+G.penalty+(G.locked?0:performance.now()-G.qStart);
function hud(){
  if(!G)return;
  $("hudScore").textContent=G.race?`${fmt(raceMs())} · ${Math.min(G.i+1,G.list.length)}/${G.list.length}`:`${Math.min(G.i+1,G.list.length)} / ${G.list.length}`;
}
function next(){
  clearTimeout(G.timer);
  if(G.i>=G.list.length) return finish();
  const {c:code,m}=G.list[G.i];G.locked=false;G.hint=0;G.mode=m;G.kind=kindOf(m);
  $("prog").style.width=(100*G.i/G.list.length)+"%";
  G.qStart=performance.now();hud();
  const q=$("q");q.dataset.code=code;q.dataset.mode=m;
  const o=()=>shuffle([code,...distractors(code)]);
  const fb=`<div class="fb" id="fb" aria-live="polite"></div>`;
  const big=`<div class="stage"><img class="flag" src="${flag(code)}" alt="Flagge"></div>`, small=`<img class="flag small" src="${flag(code)}" alt="Flagge">`;
  const txt=(list,key)=>`<div class="opts">${list.map(c=>`<button class="opt" data-c="${c}">${C[c][key]}</button>`).join("")}</div>`;
  const typebox=ph=>`<form class="typebox" id="tf" autocomplete="off"><input id="ti" type="text" placeholder="${ph}" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done"><button class="btn primary" type="submit">OK</button></form><div class="row"><button class="btn ghost" id="hintBtn" type="button">Tipp</button><button class="btn ghost" id="skip" type="button">Weiß nicht</button></div>`;
  const cd=card(G.kind,code),tag=!cd?"Neu":isDue(G.kind,code)?"Wiederholung":"";
  const kick=`<div class="label kicker">${C[code].region}${tag?" · "+tag:""}</div>`;
  const n=C[code].name;
  let h;
  if(m==="f2l") h=`<h2>Welches Land hat diese Flagge?</h2>${big}${txt(o(),"name")}`;
  else if(m==="l2f") h=`<h2>Welche Flagge gehört zu ${n}?</h2><div class="opts imgs">${o().map(c=>`<button class="opt imgopt" data-c="${c}" aria-label="Flagge"><img src="${flag(c)}" alt=""></button>`).join("")}</div>`;
  else if(m==="type") h=`<h2>Wie heißt dieses Land?</h2>${big}${typebox("Land eintippen")}`;
  else if(m==="l2c") h=`${small}<h2>Was ist die Hauptstadt von ${n}?</h2>${txt(o(),"cap")}`;
  else if(m==="c2l") h=`<h2>${C[code].cap} ist die Hauptstadt von …</h2>${txt(o(),"name")}`;
  else if(m==="ctype") h=`${small}<h2>Wie heißt die Hauptstadt von ${n}?</h2>${typebox("Hauptstadt eintippen")}`;
  else if(m==="f2c") h=`<h2>Welche Hauptstadt gehört zu dieser Flagge?</h2>${big}${txt(o(),"cap")}`;
  else if(m==="loc") h=`<div class="maphead">${small}<h2>Wo liegt ${n}?</h2></div><div class="mapslot"></div>`;
  else if(m==="mark") h=`<h2>Welches Land ist markiert?</h2><div class="mapslot"></div>${txt(shuffle([code,...near(code)]),"name")}`;
  else if(m==="mtype") h=`<h2>Wie heißt das markierte Land?</h2><div class="mapslot"></div>${typebox("Land eintippen")}`;
  else h=`<h2>Wie heißt die Hauptstadt zu dieser Flagge?</h2>${big}${typebox("Hauptstadt eintippen")}`;
  q.innerHTML=kick+h+fb;
  if(MAPMODES.includes(m)){
    // erst einhängen, dann auf die Region schwenken: die Kreisgröße hängt von der Breite auf dem Bildschirm ab
    const v=mapView();q.querySelector(".mapslot").replaceWith(v.el);v.show(C[code].region);
    if(m==="loc"){v.el.classList.add("tap");$("fb").innerHTML=`<span>Tippe das Land auf der Karte an. Kleine Länder haben einen Kreis, mit + kommst du näher heran.</span>`}
    else{v.mark(code,"hi");v.point(code)}
  }
  if(TYPEMODES.includes(m)&&!(m==="mtype"&&matchMedia("(pointer:coarse)").matches)) setTimeout(()=>{const t=$("ti");t&&t.focus()},50);
}
function answer(ok,code,picked){
  if(G.locked)return;
  if(G.race){G.times.push([code,performance.now()-G.qStart,ok]);if(!ok)G.penalty+=PENALTY}
  G.locked=true;if(addQ())G.goal=true;
  const typed=TYPEMODES.includes(G.mode), gain=record(G.kind,code,ok,typed&&!G.hint), s=stars(G.kind,code);
  const fb=$("fb");
  let xp=0;
  if(ok){G.right++;G.streak++;G.best=Math.max(G.best,G.streak);
    xp=(typed?20:10)+(BOTHMODES.includes(G.mode)?5:0);if(G.hint)xp=Math.ceil(xp/2);
    xp+=Math.min(10,2*(G.streak-1));
    if(gain>0){xp+=20;G.newStars++;if(s===3){xp+=50;G.mastered++}}
    G.xp+=xp;addXp(xp);
  }else{G.streak=0;G.missed.push(G.list[G.i])}
  play(!ok?"bad":gain>0?"star":"ok");
  hud();
  document.querySelectorAll(".opt").forEach(b=>{b.disabled=true;if(b.dataset.c===code)b.classList.add("ok");else if(b.dataset.c===picked)b.classList.add("bad")});
  const ti=$("ti");if(ti)ti.disabled=true;
  if(G.kind==="m"&&MAP_VIEW){MAP_VIEW.clear();MAP_VIEW.el.classList.remove("tap");MAP_VIEW.mark(code,"ok");if(picked&&picked!==code)MAP_VIEW.mark(picked,"bad");MAP_VIEW.point(code)}
  const stk=G.streak>=3?` · ${G.streak} in Folge`:"";
  fb.className="fb "+(ok?"ok":"bad");
  const x=C[code], want=G.kind==="c"?x.cap:x.name, note=G.kind==="c"&&CAP_NOTE[code];
  if(G.race){ // im Rennen sofort weiter, bei Fehlern kurz die Lösung zeigen
    fb.innerHTML=`<b>${ok?"Richtig!":"Das war "+want}</b>${ok?"":`<span>+5 Sekunden</span>`}`;
    if(!ok)$("q").classList.add("shake");
    G.timer=setTimeout(()=>{$("q").classList.remove("shake");G.i++;next()},ok?250:1200);
    return;
  }
  const tapped=G.mode==="loc"&&picked&&!ok?`<b>Das war ${C[picked]?C[picked].name:"ein anderes Land"}</b><span>${x.name} ist grün markiert.</span>`:"";
  fb.innerHTML=tapped?`${tapped}<span class="stars" aria-label="${s} von 3 Sternen">${starStr(s)}</span>`:`<b>${ok?"Richtig!":"Das war "+want}</b><span>${x.name} · ${x.cap} · ${x.region}${ok?stk:""}</span><span class="stars${gain>0?" up":""}" aria-label="${s} von 3 Sternen">${starStr(s)}</span>${note?`<span class="note">${note}</span>`:""}`;
  if(!ok) $("q").classList.add("shake");
  const last=G.i+1>=G.list.length;
  const row=document.createElement("div");row.className="row";
  row.innerHTML=`<button class="btn primary" id="nx">${last?"Ergebnis":"Weiter"}</button>`;
  $("q").appendChild(row);$("nx").focus();
  $("nx").onclick=()=>{$("q").classList.remove("shake");G.i++;next()};
}
$("q").addEventListener("click",e=>{
  const b=e.target.closest(".opt");if(b&&!G.locked){const code=G.list[G.i].c;answer(b.dataset.c===code,code,b.dataset.c);return}
  if(e.target.id==="skip"&&!G.locked){answer(false,G.list[G.i].c,null);return}
  if(e.target.id==="hintBtn"&&!G.locked){const code=G.list[G.i].c;G.hint++;const n=G.kind==="c"?C[code].cap:C[code].name;
    $("fb").className="fb";$("fb").innerHTML=`<b>${n.slice(0,G.hint)}${"·".repeat(Math.max(0,n.length-G.hint))}</b><span>${n.length} Buchstaben · ${C[code].region}</span>`;}
});
$("q").addEventListener("submit",e=>{e.preventDefault();if(G.locked)return;const code=G.list[G.i].c;const v=$("ti").value;if(!v.trim())return;answer(matches(code,v,G.kind==="c"),code,null)});
$("quit").onclick=()=>{clearTimeout(G&&G.timer);clearInterval(G&&G.clock);G=null;goHome()};
function raceResult(){
  const total=raceMs(),old=(P.best||{})[G.key],rec=!old||total<old;
  if(rec){P.best=P.best||{};P.best[G.key]=Math.round(total);saveProfile();G.xp+=30;addXp(30)}
  const by=[...G.times].sort((a,b)=>a[1]-b[1]),lbl=c=>G.kind==="c"?C[c].cap:C[c].name;
  const cmp=!old?"Erste Bestzeit für diese Strecke":rec?`Neue Bestzeit, ${secs(old-total)} schneller als dein Rekord`:`${secs(total-old)} langsamer als deine Bestzeit (${fmt(old)})`;
  return `<div class="label">Zeitrennen</div><div class="score">${fmt(total)}</div>
  <p class="sub">${G.right} von ${G.list.length} richtig${G.penalty?` · ${G.penalty/1000} s Strafzeit`:""} · Schnitt ${secs(total/G.list.length)} pro Frage</p>
  <div class="${rec?"levelup":"gain"}">${cmp}</div>
  <div class="times"><div><small>Schnellste Antwort</small><b>${secs(by[0][1])}</b><span>${lbl(by[0][0])}</span></div><div><small>Langsamste Antwort</small><b>${secs(by[by.length-1][1])}</b><span>${lbl(by[by.length-1][0])}</span></div></div>`;
}
function finish(){
  clearInterval(G.clock);
  show("result");
  const race=G.race?raceResult():"";
  const n=G.list.length,p=Math.round(100*G.right/n);
  const msg=p===100?"Perfekt, kein einziger Fehler.":p>=80?"Stark!":p>=50?"Gut gemacht, da geht noch mehr.":"Weiter üben, es lohnt sich.";
  if(p===100&&n>=10){G.xp+=30;addXp(30)}
  const st=newStamps();st.forEach(()=>{G.xp+=STAMP_XP;addXp(STAMP_XP)});
  play(G.goal?"big":"end");if(st.length)play("stamp",G.goal?2200:1100);
  const extra=[G.newStars?`${G.newStars} neue${G.newStars===1?"r":""} Stern${G.newStars===1?"":"e"}`:"",G.mastered?`${G.mastered} gemeistert`:"",p===100&&n>=10?"Perfekte Runde":""].filter(Boolean).join(" · ");
  const seen=new Set(),miss=G.missed.filter(it=>{const k=it.c+kindOf(it.m);if(seen.has(k))return false;seen.add(k);return true});
  $("result").innerHTML=`<div class="sndrow"><span></span><span class="topr">${themeBtn()}${sndBtn()}</span></div>${race||`<div class="label">Ergebnis</div><div class="score">${G.right} / ${n}</div><p class="sub">${msg} Beste Serie: ${G.best}.</p>`}
  ${extra?`<div class="gain"><span>${extra}</span></div>`:""}
  ${st.map(([r,k])=>`<div class="levelup stamp-new">Neues Visum im Reisepass: ${r} · ${KIND[k]}</div>`).join("")}
  ${G.goal?`<div class="levelup">Tagesziel geschafft · ${streakNow()} ${streakNow()===1?"Tag":"Tage"} Serie</div>`:""}
  <div class="mastery">  <div class="label">Tagesziel · ${Math.min(dayQ(),P.goalQ)} / ${P.goalQ} Fragen</div><div class="bar"><div style="width:${Math.min(100,100*dayQ()/P.goalQ)}%"></div></div></div>
  ${miss.length?`<div class="label">Das war noch schwer</div><div class="missed">${miss.map(({c,m})=>`<figure><img src="${flag(c)}" alt=""><figcaption>${C[c].name}${kindOf(m)==="c"?`<small>${C[c].cap}</small>`:""}</figcaption></figure>`).join("")}</div>`:""}
  <div class="row">${miss.length?`<button class="btn primary" id="again">Fehler nochmal üben</button>`:""}<button class="btn ${miss.length?"ghost":"primary"}" id="new">${G.next}</button></div>
  <button class="btn ghost" id="homeBtn">Zur Startseite</button>`;
  const g=G;
  if($("again"))$("again").onclick=()=>begin({items:shuffle(miss),restart:g.restart,next:g.next});
  $("new").onclick=()=>g.restart();
  $("homeBtn").onclick=()=>goHome();
  renderSound();renderTheme();
}

// Reisepass: alle Länder nach Region mit Sternen, Stempel pro Region und Karte, Bestzeiten
const STAMP_XP=100;
const stampDone=(r,k)=>REGIONS[r].split(" ").every(c=>known(k,c));
// Stempel gibt es, sobald alle Karten einer Region gekonnt sind (2 Sterne); vergeben wird einmal, am Ende einer Runde
function newStamps(){
  P.stamps=P.stamps||{};const out=[];
  for(const r of Object.keys(REGIONS))for(const k of KINDS)
    if(!P.stamps[r+"|"+k]&&stampDone(r,k)){P.stamps[r+"|"+k]=today();out.push([r,k])}
  if(out.length)saveProfile();
  return out;
}
let passKind="f",passRegion=null;
const dayStr=d=>{const x=new Date(d*864e5);return [x.getUTCDate(),x.getUTCMonth()+1,x.getUTCFullYear()].map((v,i)=>i<2?String(v).padStart(2,"0"):v).join(".")};
// Reisepass: Umschlag, Visa-Seite mit den Regionsstempeln und darunter pro Region ein Sammelalbum (Sticker ab einem Stern)
function renderPass(){
  const tot=k=>ALL.reduce((a,c)=>a+stars(k,c),0), stamps=P.stamps||{}, got=ALL.filter(c=>KINDS.some(k=>stars(k,c))).length;
  const best=Object.entries(P.best||{}).sort((a,b)=>a[0]<b[0]?-1:1);
  const first=P.since||Math.min(...[...Object.values(M.f),...Object.values(M.c),...Object.values(M.m)].map(x=>x.d1).filter(d=>d>0));
  const regs=ORDER.filter(r=>REGIONS[r]);
  if(!passRegion)passRegion=regs.find(r=>REGIONS[r].split(" ").some(c=>stars(passKind,c)<2))||regs[0];
  const list=REGIONS[passRegion].split(" ").sort((a,b)=>C[a].name.localeCompare(C[b].name,"de"));
  const have=list.filter(c=>stars(passKind,c)>0).length;
  const tilt=[-3,2,0,-2,3,-1,2,-3,1,-2,2,0,1];
  $("pass").innerHTML=`<div class="sndrow"><span class="label">Reisepass</span><span class="topr">${themeBtn()}${sndBtn()}</span></div><div class="passcol"><div class="cover">
    <svg class="globe" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="13"/><ellipse cx="15" cy="15" rx="6" ry="13"/><path d="M2 15h26M4.5 8h21M4.5 22h21"/><circle class="dot" cx="22" cy="8" r="2.5"/></svg>
    <div><small>Reisepass · Orbista</small><h2>${got} ${got===1?"Land":"Länder"} besucht</h2><span>${isFinite(first)?`unterwegs seit ${dayStr(first)}`:"bereit zur Abreise"}</span>
    <span class="covermini">★ ${tot("f")} Flaggen · ★ ${tot("c")} Hauptstädte · ★ ${tot("m")} Landkarte</span></div>
    <div class="coverstats"><div><b>★ ${tot("f")}</b><small>Flaggen-Sterne</small></div><div><b>★ ${tot("c")}</b><small>Hauptstadt-Sterne</small></div><div><b>★ ${tot("m")}</b><small>Landkarten-Sterne</small></div><div><b>${Object.keys(stamps).length} / ${KINDS.length*regs.length}</b><small>Visa</small></div></div></div>
  <div class="visa"><div class="visahead"><h3>Visa</h3><small>${Object.keys(stamps).length} von ${KINDS.length*regs.length}</small></div>
  <div class="stamps">${regs.map(r=>KINDS.map(k=>{const on=stamps[r+"|"+k];
    return `<div class="stamp${on?" on":""} ${k}" data-stamp="${r}|${k}" aria-label="${r}, ${KIND[k]}${on?", erreicht":", noch offen"}"><small>${KIND[k]}</small><b>${r}</b>${on?`<i>${dayStr(on)}</i>`:""}</div>`}).join("")).join("")}</div>
  <p class="muted race">Ein Visum gibt es, wenn alle Flaggen, alle Hauptstädte oder alle Länder auf der Landkarte einer Region zwei Sterne haben. Das erste Visum schaltet das Zeitrennen frei.</p></div></div>
  <div class="passcol"><div class="label">Sammelalbum</div>
  <div class="albumbar"><div class="seg three" id="passKinds">${KINDS.map(k=>`<button data-k="${k}" aria-pressed="${passKind===k}">${KIND[k]}</button>`).join("")}</div>
  <div class="chips" id="passRegions">${regs.map(r=>`<button class="chip" data-r="${r}" aria-pressed="${r===passRegion}">${r}</button>`).join("")}</div></div>
  <div class="albumhead"><div><h3>${passRegion}</h3><span class="muted">${have} von ${list.length} eingeklebt</span></div><b>${Math.round(100*have/list.length)} %</b></div>
  <div class="album">${list.map((c,i)=>{const n=stars(passKind,c);
    return n?`<div class="slot" data-c="${c}"><div class="sticker" style="--tilt:${tilt[i%tilt.length]}deg"><img src="${flag(c)}" alt=""></div><b>${C[c].name}</b>${passKind==="c"?`<span>${C[c].cap}</span>`:""}<i aria-label="${n} von 3 Sternen">${starStr(n)}</i></div>`
      :`<div class="slot empty" data-c="${c}"><div class="hole">${i+1}</div><b>${C[c].name}</b><span>${passKind==="c"?"Hauptstadt ?":"noch frei"}</span></div>`}).join("")}</div>
  <div class="label">Bestzeiten im Zeitrennen</div>
  ${best.length?`<div class="besttimes">${best.map(([key,ms])=>{const [m,r,l]=key.split("|");return `<div><span>${MODE_NAME[m]||m} · ${regionName(r)} · ${+l?l+" Fragen":"alle"}</span><b>${fmt(ms)}</b></div>`}).join("")}</div>`:`<p class="muted race">Noch keine Bestzeiten. Das Zeitrennen gibt es ab dem ersten Visum.</p>`}</div>`;
  renderSound();renderTheme();
}
$("pass").onclick=e=>{const k=e.target.closest("[data-k]"),r=e.target.closest("[data-r]");
  if(k){passKind=k.dataset.k;renderPass()}else if(r){passRegion=r.dataset.r;renderPass()}};

renderSound();renderTheme();if(P.topic)goHome();else openWelcome();
})();
