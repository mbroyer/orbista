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

// Fortschritt (nur lokal im Browser, optional), getrennt für Flaggen (f) und Hauptstädte (c)
// Schlüssel nie umbenennen; alter Stand aus Flaggo wird beim ersten Start übernommen
const KEYS={f:"orbista.mastery",c:"orbista.capitals"};
const M={f:{},c:{}};
try{M.f=JSON.parse(localStorage.getItem(KEYS.f)||localStorage.getItem("flaggo.mastery")||"{}")}catch(e){}
try{M.c=JSON.parse(localStorage.getItem(KEYS.c)||"{}")}catch(e){}
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

// Reisepunkte (XP), Level, Tagesziel und Serie
const PKEY="orbista.profile";
let P={xp:0,day:0,dayXp:0,goal:50,streak:0,goalDay:-9,restWeek:-1};
try{Object.assign(P,JSON.parse(localStorage.getItem(PKEY)||"{}"))}catch(e){}
function saveProfile(){try{localStorage.setItem(PKEY,JSON.stringify(P))}catch(e){}}
const xpFor=L=>50*L*(L-1); // Level 2 bei 100, 5 bei 1.000, 10 bei 4.500 XP
const levelOf=xp=>{let L=1;while(xpFor(L+1)<=xp)L++;return L};
const TITLES=["Tourist","Rucksackreisender","Entdecker","Kartograf","Weltenbummler","Botschafter"];
const titleOf=L=>TITLES[Math.min(TITLES.length-1,Math.floor(L/5))];
const week=d=>Math.floor((d+3)/7); // Wochen beginnen montags
// Serie zählt, solange das Tagesziel gestern erreicht wurde; ein verpasster Tag pro Woche wird als Ruhetag überbrückt
const restOk=T=>P.goalDay===T-2&&P.restWeek!==week(T-1);
const streakNow=()=>{const T=today();return P.goalDay>=T-1||restOk(T)?P.streak:0};
function addXp(n){
  const T=today();if(P.day!==T){P.day=T;P.dayXp=0}
  const had=P.dayXp>=P.goal;P.xp+=n;P.dayXp+=n;
  let reached=false;
  if(!had&&P.dayXp>=P.goal){
    if(P.goalDay===T-1)P.streak++;
    else if(restOk(T)){P.streak++;P.restWeek=week(T-1)}
    else if(P.goalDay!==T)P.streak=1;
    P.goalDay=T;reached=true;
  }
  saveProfile();return reached;
}
const dayXp=()=>P.day===today()?P.dayXp:0;

// Thema bestimmt die Spielarten; alle Hauptstadt-Fragen zählen für die Hauptstadt-Karte
const TOPICS=[["flag","Flaggen"],["cap","Hauptstädte"],["both","Beides"]];
const MODES={
  flag:[{id:"f2l",t:"Flagge → Land",d:"Vier Namen zur Auswahl"},
        {id:"l2f",t:"Land → Flagge",d:"Vier Flaggen zur Auswahl"},
        {id:"type",t:"Selbst tippen",d:"Den Ländernamen schreiben"}],
  cap:[{id:"l2c",t:"Land → Hauptstadt",d:"Vier Städte zur Auswahl"},
       {id:"c2l",t:"Hauptstadt → Land",d:"Vier Länder zur Auswahl"},
       {id:"ctype",t:"Selbst tippen",d:"Die Hauptstadt schreiben"}],
  both:[{id:"f2c",t:"Flagge → Hauptstadt",d:"Ohne Ländernamen, vier Städte"},
        {id:"fctype",t:"Selbst tippen",d:"Die Hauptstadt zur Flagge schreiben"}]};
const CAPMODES=["l2c","c2l","ctype","f2c","fctype"], TYPEMODES=["type","ctype","fctype"];
const kindOf=m=>CAPMODES.includes(m)?"c":"f";
const LENGTHS=[10,20,0];
let S={topic:"flag",mode:"f2l",region:"Alle",len:10,race:false};

// Zeitrennen: feste Strecke gegen die Uhr, jeder Fehler kostet 5 Sekunden, freigeschaltet ab Level 2
const PENALTY=5000, RACE_LEVEL=2;
const raceOpen=()=>levelOf(P.xp)>=RACE_LEVEL;
const raceKey=()=>[S.mode,S.region,S.len].join("|");
const fmt=ms=>{const t=Math.round(ms/100),m=Math.floor(t/600),sec=Math.floor(t/10)%60;return `${m}:${String(sec).padStart(2,"0")},${t%10}`};
const secs=ms=>(ms/1000).toFixed(1).replace(".",",")+"\u00a0s";

function renderStart(){
  $("topics").innerHTML=TOPICS.map(([id,t])=>`<button class="chip" data-t="${id}" aria-pressed="${S.topic===id}">${t}</button>`).join("");
  $("modes").innerHTML=MODES[S.topic].map(m=>`<button class="mode" data-m="${m.id}" aria-pressed="${S.mode===m.id}"><b>${m.t}</b><span>${m.d}</span></button>`).join("");
  const regs=["Alle",...Object.keys(REGIONS)];
  $("regions").innerHTML=regs.map(r=>{const n=r==="Alle"?ALL.length:REGIONS[r].split(" ").length;return `<button class="chip" data-r="${r}" aria-pressed="${S.region===r}">${r}<small>${n}</small></button>`}).join("");
  if(!raceOpen())S.race=false;
  $("forms").innerHTML=`<button class="chip" data-f="0" aria-pressed="${!S.race}">Übung</button><button class="chip" data-f="1" aria-pressed="${S.race}" ${raceOpen()?"":"disabled"}>Zeitrennen${raceOpen()?"":`<small>ab Level ${RACE_LEVEL}</small>`}</button>`;
  const best=(P.best||{})[raceKey()];
  $("raceInfo").hidden=!S.race;
  $("raceInfo").textContent=best?`Deine Bestzeit für diese Strecke: ${fmt(best)}`:"Noch keine Bestzeit für diese Strecke. Jeder Fehler kostet 5 Sekunden.";
  $("lengths").innerHTML=LENGTHS.map(l=>`<button class="chip" data-l="${l}" aria-pressed="${S.len===l}">${l?l+" Fragen":"Alle"}</button>`).join("");
  const kind=kindOf(S.mode), pool=poolOf(S.region), k=pool.filter(c=>known(kind,c)).length;
  const st=pool.reduce((a,c)=>a+stars(kind,c),0), due=pool.filter(c=>{const m=card(kind,c);return m&&m.due<=today()&&m.s<3}).length;
  $("mastTitle").textContent=kind==="c"?"Hauptstädte":"Flaggen";
  $("mastLabel").textContent=`Sicher gekonnt: ${k} von ${pool.length}`;
  $("mastStars").textContent=`★ ${st} von ${3*pool.length}`+(due?` · ${due} zum Wiederholen fällig`:"");
  $("mastBar").style.width=(100*st/(3*pool.length))+"%";
  renderStatus();
}
const poolOf=r=>r==="Alle"?ALL:REGIONS[r].split(" ");
$("topics").onclick=e=>{const b=e.target.closest("[data-t]");if(b&&S.topic!==b.dataset.t){S.topic=b.dataset.t;S.mode=MODES[S.topic][0].id;renderStart()}};
$("modes").onclick=e=>{const b=e.target.closest("[data-m]");if(b){S.mode=b.dataset.m;renderStart()}};
$("regions").onclick=e=>{const b=e.target.closest("[data-r]");if(b){S.region=b.dataset.r;renderStart()}};
$("forms").onclick=e=>{const b=e.target.closest("[data-f]");if(b&&!b.disabled){S.race=b.dataset.f==="1";renderStart()}};
$("lengths").onclick=e=>{const b=e.target.closest("[data-l]");if(b){S.len=+b.dataset.l;renderStart()}};

function renderStatus(){
  const L=levelOf(P.xp),a=xpFor(L),b=xpFor(L+1),d=Math.min(dayXp(),P.goal),sk=streakNow(),r=22,u=2*Math.PI*r;
  $("status").innerHTML=`<div class="lvl"><b>Level ${L}</b><span>${titleOf(L)}</span><div class="bar xp"><div style="width:${100*(P.xp-a)/(b-a)}%"></div></div><small>${P.xp-a} / ${b-a} XP bis Level ${L+1}</small></div>
  <button class="goal" id="goalBtn" aria-label="Tagesziel ändern"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="${r}" class="ring0"/><circle cx="28" cy="28" r="${r}" class="ring1" stroke-dasharray="${u*d/P.goal} ${u}"/></svg><b>${dayXp()}</b><small>von ${P.goal} XP</small></button>
  <div class="streak"><b>${sk}</b><small>${sk===1?"Tag":"Tage"} Serie</small></div>`;
}
$("status").onclick=e=>{if(e.target.closest("#goalBtn")){P.goal=P.goal===30?50:P.goal===50?100:30;saveProfile();renderStatus()}};

// Spiel
let G=null;
function pickQuestions(pool,n,onlyList){
  if(onlyList) return shuffle(onlyList);
  // zuerst fällige Karten (wenige Sterne vorn), dann neue, dann die übrigen nach Fälligkeit
  const k=kindOf(S.mode),T=today();
  const rank=c=>{const m=card(k,c);return !m?[1,0]:m.due<=T?[0,m.s]:[2,m.due]};
  const out=shuffle(pool).map(c=>[rank(c),c]).sort((x,y)=>x[0][0]-y[0][0]||x[0][1]-y[0][1]).map(x=>x[1]);
  return n?out.slice(0,n):out;
}
function start(onlyList){
  const pool=poolOf(S.region);
  clearInterval(G&&G.clock);
  G={race:S.race&&!onlyList,key:raceKey(),times:[],penalty:0,topic:S.topic,pool,list:pickQuestions(pool,S.len,onlyList),i:0,right:0,streak:0,best:0,missed:[],locked:false,mode:S.mode,kind:kindOf(S.mode),hint:0,
     xp:0,level:levelOf(P.xp),newStars:0,mastered:0,goal:false};
  $("start").hidden=true;$("status").hidden=true;$("madeby").hidden=true;$("result").hidden=true;$("game").hidden=false;
  if(G.race)G.clock=setInterval(hud,100);
  next();
}
function distractors(code){
  const c=shuffle(G.pool.filter(x=>x!==code));
  const base=c.length>=3?c:shuffle(ALL.filter(x=>x!==code));
  return base.sort((x,y)=>(C[x].region===C[code].region?0:1)-(C[y].region===C[code].region?0:1)).slice(0,3);
}
// Rennzeit = Summe der Antwortzeiten plus Strafzeit; die Anzeige der Lösung zwischen den Fragen zählt nicht
const raceMs=()=>G.times.reduce((a,t)=>a+t[1],0)+G.penalty+(G.locked?0:performance.now()-G.qStart);
function hud(){
  if(!G)return;
  $("hudScore").textContent=G.race?`${fmt(raceMs())} · ${Math.min(G.i+1,G.list.length)}/${G.list.length}`:`${G.right} ✓ · ${G.i+1}/${G.list.length}`;
}
function next(){
  clearTimeout(G.timer);
  if(G.i>=G.list.length) return finish();
  const code=G.list[G.i];G.locked=false;G.hint=0;
  $("prog").style.width=(100*G.i/G.list.length)+"%";
  G.qStart=performance.now();hud();
  const q=$("q");
  const o=()=>shuffle([code,...distractors(code)]);
  const fb=`<div class="fb" id="fb" aria-live="polite"></div>`;
  const big=`<img class="flag" src="${flag(code)}" alt="Flagge">`, small=`<img class="flag small" src="${flag(code)}" alt="Flagge">`;
  const txt=(list,key)=>`<div class="opts">${list.map(c=>`<button class="opt" data-c="${c}">${C[c][key]}</button>`).join("")}</div>`;
  const typebox=ph=>`<form class="typebox" id="tf" autocomplete="off"><input id="ti" type="text" placeholder="${ph}" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done"><button class="btn" type="submit">OK</button></form><div class="row"><button class="btn ghost" id="hintBtn" type="button">Tipp</button><button class="btn ghost" id="skip" type="button">Weiß nicht</button></div>`;
  const m=G.mode, n=C[code].name;
  if(m==="f2l") q.innerHTML=`<h2>Welches Land ist das?</h2>${big}${txt(o(),"name")}${fb}`;
  else if(m==="l2f") q.innerHTML=`<h2>Welche Flagge gehört zu<br>${n}?</h2><div class="opts imgs">${o().map(c=>`<button class="opt imgopt" data-c="${c}" aria-label="Flagge"><img src="${flag(c)}" alt=""></button>`).join("")}</div>${fb}`;
  else if(m==="type") q.innerHTML=`<h2>Wie heißt dieses Land?</h2>${big}${typebox("Land eintippen")}${fb}`;
  else if(m==="l2c") q.innerHTML=`${small}<h2>Was ist die Hauptstadt von<br>${n}?</h2>${txt(o(),"cap")}${fb}`;
  else if(m==="c2l") q.innerHTML=`<h2>${C[code].cap} ist die Hauptstadt von …</h2>${txt(o(),"name")}${fb}`;
  else if(m==="ctype") q.innerHTML=`${small}<h2>Wie heißt die Hauptstadt von<br>${n}?</h2>${typebox("Hauptstadt eintippen")}${fb}`;
  else if(m==="f2c") q.innerHTML=`<h2>Welche Hauptstadt gehört zu dieser Flagge?</h2>${big}${txt(o(),"cap")}${fb}`;
  else q.innerHTML=`<h2>Wie heißt die Hauptstadt zu dieser Flagge?</h2>${big}${typebox("Hauptstadt eintippen")}${fb}`;
  if(TYPEMODES.includes(m)) setTimeout(()=>{const t=$("ti");t&&t.focus()},50);
}
function answer(ok,code,picked){
  if(G.locked)return;
  if(G.race){G.times.push([code,performance.now()-G.qStart,ok]);if(!ok)G.penalty+=PENALTY}
  G.locked=true;
  const typed=TYPEMODES.includes(G.mode), gain=record(G.kind,code,ok,typed&&!G.hint), s=stars(G.kind,code);
  const fb=$("fb");
  let xp=0;
  if(ok){G.right++;G.streak++;G.best=Math.max(G.best,G.streak);
    xp=(typed?20:10)+(G.topic==="both"?5:0);if(G.hint)xp=Math.ceil(xp/2);
    xp+=Math.min(10,2*(G.streak-1));
    if(gain>0){xp+=20;G.newStars++;if(s===3){xp+=50;G.mastered++}}
    G.xp+=xp;if(addXp(xp))G.goal=true;
  }else{G.streak=0;G.missed.push(code)}
  hud();
  document.querySelectorAll(".opt").forEach(b=>{b.disabled=true;if(b.dataset.c===code)b.classList.add("ok");else if(b.dataset.c===picked)b.classList.add("bad")});
  const ti=$("ti");if(ti)ti.disabled=true;
  const stk=G.streak>=3?` · ${G.streak} in Folge`:"";
  fb.className="fb "+(ok?"ok":"bad");
  const x=C[code], want=G.kind==="c"?x.cap:x.name, note=G.kind==="c"&&CAP_NOTE[code];
  if(G.race){ // im Rennen sofort weiter, bei Fehlern kurz die Lösung zeigen
    fb.innerHTML=`<b>${ok?"Richtig!":"Das war "+want}</b>${ok?"":`<span>+5 Sekunden</span>`}`;
    if(!ok)$("q").classList.add("shake");
    G.timer=setTimeout(()=>{$("q").classList.remove("shake");G.i++;next()},ok?250:1200);
    return;
  }
  fb.innerHTML=`<b>${ok?"Richtig! +"+xp+" XP":"Das war "+want}</b><span>${x.name} · ${x.cap} · ${x.region}${ok?stk:""}</span><span class="stars${gain>0?" up":""}" aria-label="${s} von 3 Sternen">${starStr(s)}</span>${note?`<span class="note">${note}</span>`:""}`;
  if(!ok) $("q").classList.add("shake");
  const last=G.i+1>=G.list.length;
  const row=document.createElement("div");row.className="row";
  row.innerHTML=`<button class="btn" id="nx">${last?"Ergebnis":"Weiter"}</button>`;
  $("q").appendChild(row);$("nx").focus();
  $("nx").onclick=()=>{$("q").classList.remove("shake");G.i++;next()};
  if(ok&&!note){G.timer=setTimeout(()=>{if(document.body.contains($("nx"))){$("q").classList.remove("shake");G.i++;next()}},1100)}
}
$("q").addEventListener("click",e=>{
  const b=e.target.closest(".opt");if(b&&!G.locked){const code=G.list[G.i];answer(b.dataset.c===code,code,b.dataset.c);return}
  if(e.target.id==="skip"&&!G.locked){answer(false,G.list[G.i],null);return}
  if(e.target.id==="hintBtn"&&!G.locked){const code=G.list[G.i];G.hint++;const n=G.kind==="c"?C[code].cap:C[code].name;
    $("fb").className="fb";$("fb").innerHTML=`<b>${n.slice(0,G.hint)}${"·".repeat(Math.max(0,n.length-G.hint))}</b><span>${n.length} Buchstaben · ${C[code].region}</span>`;}
});
$("q").addEventListener("submit",e=>{e.preventDefault();if(G.locked)return;const code=G.list[G.i];const v=$("ti").value;if(!v.trim())return;answer(matches(code,v,G.kind==="c"),code,null)});
$("quit").onclick=()=>{clearTimeout(G&&G.timer);clearInterval(G&&G.clock);G=null;$("game").hidden=true;$("result").hidden=true;$("start").hidden=false;$("status").hidden=false;$("madeby").hidden=false;renderStart()};
function raceResult(){
  const total=raceMs(),old=(P.best||{})[G.key],rec=!old||total<old;
  if(rec){P.best=P.best||{};P.best[G.key]=Math.round(total);saveProfile();G.xp+=30;if(addXp(30))G.goal=true}
  const by=[...G.times].sort((a,b)=>a[1]-b[1]),lbl=c=>G.kind==="c"?C[c].cap:C[c].name;
  const cmp=!old?"Erste Bestzeit für diese Strecke":rec?`Neue Bestzeit, ${secs(old-total)} schneller als dein Rekord`:`${secs(total-old)} langsamer als deine Bestzeit (${fmt(old)})`;
  return `<div class="label">Zeitrennen</div><div class="score">${fmt(total)}</div>
  <p class="sub">${G.right} von ${G.list.length} richtig${G.penalty?` · ${G.penalty/1000} s Strafzeit`:""} · Schnitt ${secs(total/G.list.length)} pro Frage</p>
  <div class="${rec?"levelup":"gain"}">${cmp}${rec?" · +30 XP":""}</div>
  <div class="times"><div><small>Schnellste Antwort</small><b>${secs(by[0][1])}</b><span>${lbl(by[0][0])}</span></div><div><small>Langsamste Antwort</small><b>${secs(by[by.length-1][1])}</b><span>${lbl(by[by.length-1][0])}</span></div></div>`;
}
function finish(){
  clearInterval(G.clock);
  $("game").hidden=true;$("result").hidden=false;
  const race=G.race?raceResult():"";
  const n=G.list.length,p=Math.round(100*G.right/n);
  const msg=p===100?"Perfekt, kein einziger Fehler.":p>=80?"Stark!":p>=50?"Gut gemacht, da geht noch mehr.":"Weiter üben, es lohnt sich.";
  if(p===100&&n>=10){G.xp+=30;if(addXp(30))G.goal=true}
  const st=newStamps();st.forEach(()=>{G.xp+=STAMP_XP;if(addXp(STAMP_XP))G.goal=true});
  const L=levelOf(P.xp),a=xpFor(L),b=xpFor(L+1);
  const extra=[G.newStars?`${G.newStars} neue${G.newStars===1?"r":""} Stern${G.newStars===1?"":"e"}`:"",G.mastered?`${G.mastered} gemeistert`:"",p===100&&n>=10?"Bonus für die perfekte Runde":""].filter(Boolean).join(" · ");
  const miss=[...new Set(G.missed)];
  $("result").innerHTML=`${race||`<div class="label">Ergebnis</div><div class="score">${G.right} / ${n}</div><p class="sub">${msg} Beste Serie: ${G.best}.</p>`}
  <div class="gain"><b>+${G.xp} XP</b>${extra?`<span>${extra}</span>`:""}</div>
  ${L>G.level?`<div class="levelup">Level ${L} erreicht: ${titleOf(L)}</div>`:""}
  ${st.map(([r,k])=>`<div class="levelup stamp-new">Neuer Stempel im Reisepass: ${r} · ${KIND[k]} · +${STAMP_XP} XP</div>`).join("")}
  ${G.goal?`<div class="levelup">Tagesziel geschafft · ${streakNow()} ${streakNow()===1?"Tag":"Tage"} Serie</div>`:""}
  <div class="mastery"><div class="label">Level ${L} · ${P.xp-a} / ${b-a} XP</div><div class="bar xp"><div style="width:${100*(P.xp-a)/(b-a)}%"></div></div>
  <div class="label">Tagesziel · ${dayXp()} / ${P.goal} XP</div><div class="bar"><div style="width:${Math.min(100,100*dayXp()/P.goal)}%"></div></div></div>
  ${miss.length?`<div class="label">Das war noch schwer</div><div class="missed">${miss.map(c=>`<figure><img src="${flag(c)}" alt=""><figcaption>${C[c].name}${G.kind==="c"?`<small>${C[c].cap}</small>`:""}</figcaption></figure>`).join("")}</div>`:""}
  <div class="row">${miss.length?`<button class="btn" id="again">Fehler nochmal üben</button>`:""}<button class="btn ${miss.length?"ghost":""}" id="new">Neue Runde</button><button class="btn ghost" id="home">Zur Auswahl</button></div>`;
  const missCopy=miss;
  if($("again"))$("again").onclick=()=>start(missCopy);
  $("new").onclick=()=>start();
  $("home").onclick=()=>$("quit").onclick();
}
$("go").onclick=()=>start();

// Reisepass: alle Länder nach Region mit Sternen, Stempel pro Region und Karte, Bestzeiten
const KIND={f:"Flaggen",c:"Hauptstädte"}, STAMP_XP=100;
const stampDone=(r,k)=>REGIONS[r].split(" ").every(c=>known(k,c));
// Stempel gibt es, sobald alle Karten einer Region gekonnt sind (2 Sterne); vergeben wird einmal, am Ende einer Runde
function newStamps(){
  P.stamps=P.stamps||{};const out=[];
  for(const r of Object.keys(REGIONS))for(const k of ["f","c"])
    if(!P.stamps[r+"|"+k]&&stampDone(r,k)){P.stamps[r+"|"+k]=today();out.push([r,k])}
  if(out.length)saveProfile();
  return out;
}
let passKind="f";
function renderPass(){
  const tot=k=>ALL.reduce((a,c)=>a+stars(k,c),0), stamps=P.stamps||{};
  const modeName=Object.fromEntries(Object.values(MODES).flat().map(m=>[m.id,m.t]));
  const best=Object.entries(P.best||{}).sort((a,b)=>a[0]<b[0]?-1:1);
  $("pass").innerHTML=`<div class="hud"><button class="quit" id="passBack" aria-label="Zurück">✕</button><h2>Reisepass</h2></div>
  <div class="passsum"><div><b>★ ${tot("f")}</b><small>von ${3*ALL.length} Flaggen-Sternen</small></div><div><b>★ ${tot("c")}</b><small>von ${3*ALL.length} Hauptstadt-Sternen</small></div><div><b>${Object.keys(stamps).length}</b><small>von ${2*Object.keys(REGIONS).length} Stempeln</small></div></div>
  <div class="label">Stempel</div>
  <div class="stamps">${Object.keys(REGIONS).map(r=>["f","c"].map(k=>{const on=stamps[r+"|"+k];
    return `<div class="stamp${on?" on":""} ${k}" data-stamp="${r}|${k}" aria-label="${r}, ${KIND[k]}${on?", erreicht":", noch offen"}"><b>${r}</b><small>${KIND[k]}</small></div>`}).join("")).join("")}</div>
  <p class="muted race">Einen Stempel gibt es, wenn alle Flaggen oder alle Hauptstädte einer Region zwei Sterne haben. Er bringt ${STAMP_XP} XP.</p>
  <div class="chips" id="passKinds">${["f","c"].map(k=>`<button class="chip" data-k="${k}" aria-pressed="${passKind===k}">${KIND[k]}</button>`).join("")}</div>
  ${Object.keys(REGIONS).map(r=>{const list=REGIONS[r].split(" ").sort((a,b)=>C[a].name.localeCompare(C[b].name,"de"));
    const got=list.reduce((a,c)=>a+stars(passKind,c),0);
    return `<div class="label">${r} · ★ ${got} von ${3*list.length}</div><div class="tiles">${list.map(c=>{const n=stars(passKind,c);
      return `<div class="tile${n?"":" grey"}" data-c="${c}"><img src="${flag(c)}" alt=""><b>${C[c].name}</b>${passKind==="c"?`<span>${n?C[c].cap:"?"}</span>`:""}<i aria-label="${n} von 3 Sternen">${starStr(n)}</i></div>`}).join("")}</div>`}).join("")}
  <div class="label">Bestzeiten im Zeitrennen</div>
  ${best.length?`<div class="besttimes">${best.map(([key,ms])=>{const [m,r,l]=key.split("|");return `<div><span>${modeName[m]||m} · ${r} · ${+l?l+" Fragen":"alle"}</span><b>${fmt(ms)}</b></div>`}).join("")}</div>`:`<p class="muted race">Noch keine Bestzeiten. Das Zeitrennen gibt es ab Level ${RACE_LEVEL}.</p>`}`;
}
$("passBtn").onclick=()=>{$("start").hidden=true;$("status").hidden=true;$("madeby").hidden=true;$("pass").hidden=false;renderPass();scrollTo(0,0)};
$("pass").onclick=e=>{
  const k=e.target.closest("[data-k]");if(k){passKind=k.dataset.k;renderPass();return}
  if(e.target.closest("#passBack")){$("pass").hidden=true;$("start").hidden=false;$("status").hidden=false;$("madeby").hidden=false;renderStart()}
};
renderStart();
})();
