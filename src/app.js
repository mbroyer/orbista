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
const known=(k,c)=>{const m=M[k][c];return m&&m.r>=2&&m.r>m.w};
function record(k,c,ok){const m=M[k][c]||(M[k][c]={r:0,w:0});ok?m.r++:m.w++;saveMastery(k)}

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
let S={topic:"flag",mode:"f2l",region:"Alle",len:10};

function renderStart(){
  $("topics").innerHTML=TOPICS.map(([id,t])=>`<button class="chip" data-t="${id}" aria-pressed="${S.topic===id}">${t}</button>`).join("");
  $("modes").innerHTML=MODES[S.topic].map(m=>`<button class="mode" data-m="${m.id}" aria-pressed="${S.mode===m.id}"><b>${m.t}</b><span>${m.d}</span></button>`).join("");
  const regs=["Alle",...Object.keys(REGIONS)];
  $("regions").innerHTML=regs.map(r=>{const n=r==="Alle"?ALL.length:REGIONS[r].split(" ").length;return `<button class="chip" data-r="${r}" aria-pressed="${S.region===r}">${r}<small>${n}</small></button>`}).join("");
  $("lengths").innerHTML=LENGTHS.map(l=>`<button class="chip" data-l="${l}" aria-pressed="${S.len===l}">${l?l+" Fragen":"Alle"}</button>`).join("");
  const kind=kindOf(S.mode), pool=poolOf(S.region), k=pool.filter(c=>known(kind,c)).length;
  $("mastTitle").textContent=kind==="c"?"Hauptstädte":"Flaggen";
  $("mastLabel").textContent=`Sicher gekonnt: ${k} von ${pool.length}`;
  $("mastBar").style.width=(100*k/pool.length)+"%";
}
const poolOf=r=>r==="Alle"?ALL:REGIONS[r].split(" ");
$("topics").onclick=e=>{const b=e.target.closest("[data-t]");if(b&&S.topic!==b.dataset.t){S.topic=b.dataset.t;S.mode=MODES[S.topic][0].id;renderStart()}};
$("modes").onclick=e=>{const b=e.target.closest("[data-m]");if(b){S.mode=b.dataset.m;renderStart()}};
$("regions").onclick=e=>{const b=e.target.closest("[data-r]");if(b){S.region=b.dataset.r;renderStart()}};
$("lengths").onclick=e=>{const b=e.target.closest("[data-l]");if(b){S.len=+b.dataset.l;renderStart()}};

// Spiel
let G=null;
function pickQuestions(pool,n,onlyList){
  if(onlyList) return shuffle(onlyList);
  // schwächere Karten häufiger: Gewicht 3 = noch nie/falsch, 1 = gekonnt
  const k=kindOf(S.mode),m=M[k];
  const w=c=>known(k,c)?1:(m[c]&&m[c].w>m[c].r?4:3);
  const bag=[];pool.forEach(c=>{for(let i=0;i<w(c);i++)bag.push(c)});
  const out=[];for(const c of shuffle(bag)){if(!out.includes(c))out.push(c);if(n&&out.length>=n)break}
  return out;
}
function start(onlyList){
  const pool=poolOf(S.region);
  G={pool,list:pickQuestions(pool,S.len,onlyList),i:0,right:0,streak:0,best:0,missed:[],locked:false,mode:S.mode,kind:kindOf(S.mode),hint:0};
  $("start").hidden=true;$("madeby").hidden=true;$("result").hidden=true;$("game").hidden=false;next();
}
function distractors(code){
  const c=shuffle(G.pool.filter(x=>x!==code));
  const base=c.length>=3?c:shuffle(ALL.filter(x=>x!==code));
  return base.sort((x,y)=>(C[x].region===C[code].region?0:1)-(C[y].region===C[code].region?0:1)).slice(0,3);
}
function next(){
  clearTimeout(G.timer);
  if(G.i>=G.list.length) return finish();
  const code=G.list[G.i];G.locked=false;G.hint=0;
  $("prog").style.width=(100*G.i/G.list.length)+"%";
  $("hudScore").textContent=`${G.right} ✓ · ${G.i+1}/${G.list.length}`;
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
  if(G.locked)return;G.locked=true;
  record(G.kind,code,ok);
  const fb=$("fb");
  if(ok){G.right++;G.streak++;G.best=Math.max(G.best,G.streak)}else{G.streak=0;G.missed.push(code)}
  $("hudScore").textContent=`${G.right} ✓ · ${G.i+1}/${G.list.length}`;
  document.querySelectorAll(".opt").forEach(b=>{b.disabled=true;if(b.dataset.c===code)b.classList.add("ok");else if(b.dataset.c===picked)b.classList.add("bad")});
  const ti=$("ti");if(ti)ti.disabled=true;
  const stk=G.streak>=3?` · ${G.streak} in Folge`:"";
  fb.className="fb "+(ok?"ok":"bad");
  const x=C[code], want=G.kind==="c"?x.cap:x.name, note=G.kind==="c"&&CAP_NOTE[code];
  fb.innerHTML=`<b>${ok?"Richtig!":"Das war "+want}</b><span>${x.name} · ${x.cap} · ${x.region}${ok?stk:""}</span>${note?`<span class="note">${note}</span>`:""}`;
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
$("quit").onclick=()=>{clearTimeout(G&&G.timer);G=null;$("game").hidden=true;$("result").hidden=true;$("start").hidden=false;$("madeby").hidden=false;renderStart()};
function finish(){
  $("game").hidden=true;$("result").hidden=false;
  const n=G.list.length,p=Math.round(100*G.right/n);
  const msg=p===100?"Perfekt, kein einziger Fehler.":p>=80?"Stark!":p>=50?"Gut gemacht, da geht noch mehr.":"Weiter üben, es lohnt sich.";
  const miss=[...new Set(G.missed)];
  $("result").innerHTML=`<div class="label">Ergebnis</div><div class="score">${G.right} / ${n}</div><p class="sub">${msg} Beste Serie: ${G.best}.</p>
  ${miss.length?`<div class="label">Das war noch schwer</div><div class="missed">${miss.map(c=>`<figure><img src="${flag(c)}" alt=""><figcaption>${C[c].name}${G.kind==="c"?`<small>${C[c].cap}</small>`:""}</figcaption></figure>`).join("")}</div>`:""}
  <div class="row">${miss.length?`<button class="btn" id="again">Fehler nochmal üben</button>`:""}<button class="btn ${miss.length?"ghost":""}" id="new">Neue Runde</button><button class="btn ghost" id="home">Zur Auswahl</button></div>`;
  const missCopy=miss;
  if($("again"))$("again").onclick=()=>start(missCopy);
  $("new").onclick=()=>start();
  $("home").onclick=()=>$("quit").onclick();
}
$("go").onclick=()=>start();
renderStart();
})();
