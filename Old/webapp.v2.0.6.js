/* HistorIA v2.0.6 — chave embutida */
(function(){
const EMBEDDED_KEY = "AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM";
const $=s=>document.querySelector(s);
function ready(f){ if(document.readyState!=='loading') f(); else document.addEventListener('DOMContentLoaded',f); }

const DB='historIA_db',VER=1,STORE='stories';let idb;
const S={stories:[],current:null,chapterIdx:0};

function openDB(){return new Promise((r,j)=>{const q=indexedDB.open(DB,VER);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'})};q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})}
async function idbGetAll(){idb=idb||await openDB();return new Promise((r,j)=>{const t=idb.transaction(STORE,'readonly'),s=t.objectStore(STORE),g=s.getAll();g.onsuccess=()=>r(g.result||[]);g.onerror=()=>j(g.error)})}
async function idbClear(){idb=idb||await openDB();return new Promise((r,j)=>{const t=idb.transaction(STORE,'readwrite');t.objectStore(STORE).clear();t.oncomplete=()=>r();t.onerror=()=>j(t.error)})}
async function idbPutMany(a){idb=idb||await openDB();return new Promise((r,j)=>{const t=idb.transaction(STORE,'readwrite'),s=t.objectStore(STORE);(a||[]).forEach(x=>s.put(x));t.oncomplete=()=>r();t.onerror=()=>j(t.error)})}
(async()=>{try{const it=await idbGetAll();if(!it||!it.length){const ls=localStorage.getItem('historia.stories');if(ls){const arr=(JSON.parse(ls)||[]).filter(Boolean).map(s=>({...s,id:s.id||Date.now()+Math.random().toString(36).slice(2)}));await idbPutMany(arr);localStorage.setItem('historia.stories',JSON.stringify(arr));}}}catch(e){}})();
const _set=localStorage.setItem.bind(localStorage);localStorage.setItem=function(k,v){_set(k,v);if(k==='historia.stories'){try{const a=JSON.parse(v||'[]');(async()=>{try{await idbClear();await idbPutMany(a||[])}catch{}})()}catch{}}};
window.addEventListener('beforeunload',()=>{try{const ls=localStorage.getItem('historia.stories');if(ls){const a=JSON.parse(ls);(async()=>{try{await idbClear();await idbPutMany(a||[])}catch{}})()}}catch{}});
function save(){localStorage.setItem('historia.stories',JSON.stringify(S.stories))}

ready(async()=>{
  S.stories=await (async()=>{try{const it=await idbGetAll();if(it&&it.length)return it;const ls=localStorage.getItem('historia.stories');return ls?JSON.parse(ls):[]}catch{const ls=localStorage.getItem('historia.stories');return ls?JSON.parse(ls):[]}})();
  wire(); list();
  const terms=localStorage.getItem('hx_terms_accepted')==='1';
  if(!terms) document.getElementById('terms').classList.remove('hidden');
});

function wire(){
  document.getElementById('btnTutorial').onclick=()=>document.getElementById('tutorial').classList.remove('hidden');
  document.getElementById('tutorial_close').onclick=()=>document.getElementById('tutorial').classList.add('hidden');

  document.getElementById('terms_accept').onchange=()=>document.getElementById('terms_ok').disabled=!document.getElementById('terms_accept').checked;
  document.getElementById('terms_ok').onclick=()=>{localStorage.setItem('hx_terms_accepted','1');document.getElementById('terms').classList.add('hidden');};

  document.getElementById('btnCreate').onclick=()=>{document.getElementById('screenMenu').classList.add('hidden');document.getElementById('screenCreator').classList.remove('hidden');document.getElementById('btnHome').classList.remove('hidden')};
  document.getElementById('btnCancel').onclick=()=>{document.getElementById('screenCreator').classList.add('hidden');document.getElementById('screenMenu').classList.remove('hidden');document.getElementById('btnHome').classList.add('hidden')};
  document.getElementById('btnHome').onclick=()=>{document.getElementById('screenReader').classList.add('hidden');document.getElementById('screenCreator').classList.add('hidden');document.getElementById('screenMenu').classList.remove('hidden');document.getElementById('btnHome').classList.add('hidden');list()};

  const rate=document.getElementById('rateSlider'),vol=document.getElementById('volSlider'),rateVal=document.getElementById('rateVal'),volVal=document.getElementById('volVal');
  document.getElementById('pillRate').onclick=()=>document.getElementById('wrapRate').classList.toggle('open');
  document.getElementById('pillVol').onclick=()=>document.getElementById('wrapVol').classList.toggle('open');
  document.getElementById('muteBtn').onclick=()=>{vol.value='0';vol.oninput()};
  let utt=null;if('speechSynthesis'in window){document.getElementById('btnSpeak').onclick=()=>{const t=document.getElementById('narrativa')?.innerText?.trim();if(!t)return;window.speechSynthesis.cancel();spk(t)};document.getElementById('btnStop').onclick=()=>speechSynthesis.cancel();rate.oninput=()=>{rateVal.textContent=parseFloat(rate.value).toFixed(2)+'x';if(utt)utt.rate=parseFloat(rate.value)};vol.oninput=()=>{volVal.textContent=Math.round(parseFloat(vol.value)*100)+'%';if(utt)utt.volume=parseFloat(vol.value)};function spk(t){const u=new SpeechSynthesisUtterance(t);u.lang='pt-BR';u.rate=parseFloat(rate.value||'1');u.volume=parseFloat(vol.value||'0.9');utt=u;window.speechSynthesis.speak(u);}}

  document.getElementById('btnGenerate').onclick=()=>{const st={id:Date.now()+Math.random().toString(36).slice(2),title:document.getElementById('f_title').value.trim()||'Sem título',genre:document.getElementById('f_genre').value,nuclei:document.getElementById('f_nuclei').value.trim(),brief:document.getElementById('f_brief').value.trim(),chapters:Math.max(1,Math.min(10,parseInt(document.getElementById('f_capitulos').value||'10',10))),firstPerson:document.getElementById('f_firstperson').checked,path:[],store:{}};S.stories.push(st);save();open(st.id,true)};
  document.getElementById('btnBack').onclick=()=>{if(S.chapterIdx>0){S.chapterIdx--;renderFromStore()}};
  document.getElementById('btnNext').onclick=()=>{const st=S.current;if(!st)return;if(S.chapterIdx+1<st.chapters){S.chapterIdx++; if(!st.store['cap_'+S.chapterIdx]) genAndRender(); else renderFromStore();}};
  document.getElementById('btnNewOptions').onclick=()=>regen();
}

function list(){
  const host=document.getElementById('listStories');host.innerHTML='';
  S.stories.forEach(st=>{const d=document.createElement('div');d.className='card';d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:700">{t}</div><div class="small">{g} • {c} caps • {p}</div></div><div style="display:flex;gap:8px"><button class="btn" data-a="o">▶️ Ler</button><button class="btn" data-a="x">🗑️</button></div></div>`.replace('{t}',st.title).replace('{g}',st.genre).replace('{c}',st.chapters).replace('{p}',st.firstPerson?'1ª pessoa':'3ª pessoa');d.querySelector('[data-a="o"]').onclick=()=>open(st.id,false);d.querySelector('[data-a="x"]').onclick=()=>{if(confirm('Excluir este roteiro?')){S.stories=S.stories.filter(x=>x.id!==st.id);save();list();}};host.appendChild(d)});
}

async function open(id,genFirst=false){
  const st=S.stories.find(x=>x.id===id);if(!st)return;S.current=st;S.chapterIdx=st.store.lastIdx||0;
  document.getElementById('screenMenu').classList.add('hidden');document.getElementById('screenCreator').classList.add('hidden');document.getElementById('screenReader').classList.remove('hidden');document.getElementById('btnHome').classList.remove('hidden');
  if(genFirst||!st.store['cap_'+S.chapterIdx]) await genAndRender(); else renderFromStore();
}

function renderFromStore(){
  const st=S.current,i=S.chapterIdx,data=st.store['cap_'+i];if(!data)return;
  document.getElementById('capitulo').textContent='Capítulo '+(i+1);document.getElementById('titulo').textContent=data.title||('Capítulo '+(i+1));
  const host=document.getElementById('narrativa');host.innerHTML='';host.appendChild(divHTML(toHTML(data.part1||'')));choices(data.decision50,'50');
}

function divHTML(h){const d=document.createElement('div');d.className='story';d.innerHTML=h;return d}
function toHTML(t){return (t||'').split(/\\n+/).map(p=>`<p>${p}</p>`).join('')}

async function callGemini(prompt){
  const key = EMBEDDED_KEY;
  const model = 'gemini-1.5-pro';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.8,topK:40,topP:0.95}};
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok) throw new Error('HTTP '+r.status);
  const j=await r.json();
  const text=j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\\n')||'';
  return text||'';
}

function buildPrompt(story,i,ctx=''){
  const wpm=180,target=15*wpm,pov=story.firstPerson?'primeira pessoa':'terceira pessoa',death=story.firstPerson?'ATENÇÃO: fim precoce é possível se o protagonista morrer.':'';
  return (`Você é roteirista de novelas brasileiras. Escreva o CAPÍTULO ${i+1} em ${pov}.
Use TODOS os núcleos: ${story.nuclei}. Gênero: ${story.genre}. Evite clichês; foque em cenas, ações e DIÁLOGOS naturais.
Contexto acumulado até aqui: ${ctx || 'início'}. Duração alvo ~${target} palavras, com decisões aos 50% e 90%. ${death}
FORMATO EXATO (apenas JSON válido):
{{ "title": "...", "part1": "...", "decision50": ["A","B","C"], "part2": "...", "decision90": ["A","B","C"], "conclusion": "..." }}
Enredo breve (guie ~50%): ${story.brief}`).trim();
}

function parse(raw){const j=(raw.match(/```json([\\s\\S]*?)```/i)?.[1]||raw).trim();return JSON.parse(j)}
function ctxUntil(i,st){const a=[];for(let k=0;k<i;k++){const c=st.store['cap_'+k];if(!c)break;a.push((c.title?c.title+': ':'')+(c.part1||'').slice(0,400));const p50=st.path.find(p=>p.cap===k&&p.at===50);if(p50)a.push('Escolha 50%: '+p50.choice);a.push((c.part2||'').slice(0,300));const p90=st.path.find(p=>p.cap===k&&p.at===90);if(p90)a.push('Escolha 90%: '+p90.choice);a.push((c.conclusion||'').slice(0,200))}return a.join('\\n')}

async function genAndRender(){
  const st=S.current,i=S.chapterIdx,ctx=ctxUntil(i,st);document.getElementById('capitulo').textContent='Capítulo '+(i+1);document.getElementById('titulo').textContent='Gerando…';document.getElementById('narrativa').innerHTML='<p><em>Gerando capítulo com IA…</em></p>';document.getElementById('choices').innerHTML='';
  let raw,obj;try{raw=await callGemini(buildPrompt(st,i,ctx));obj=parse(raw)}catch(e){obj={title:'Capítulo',part1:'[Falha na IA] Tente novamente.',decision50:['Arriscar','Negociar','Espiar'],part2:'—',decision90:['Confrontar','Recuar','Adiar'],conclusion:'—'}};
  st.store['cap_'+i]=obj;st.store.lastIdx=i;save();renderFromStore();if(i+1<st.chapters)preload(i+1);
}

async function preload(n){const st=S.current;if(!st||st.store['cap_'+n])return;try{const ctx=ctxUntil(n,st);const raw=await callGemini(buildPrompt(st,n,ctx));const obj=parse(raw);st.store['cap_'+n]=obj;save()}catch{}}

function choices(arr,m){const host=document.getElementById('choices');host.innerHTML='';const icons=['🚪','🧭','⚠️'];(arr||[]).slice(0,3).forEach((t,i)=>{const d=document.createElement('div');d.className='choice';d.innerHTML=`<div class="ico">${icons[i%icons.length]}</div><div><div class="label">Opção ${'ABC'[i]}</div><div class="txt">${t}</div><div class="btns"><button class="btn" data-i="${i}" data-m="${m}">Escolher</button></div></div>`;d.querySelector('button').onclick=()=>choose(m,t);host.appendChild(d)});
  const btn=document.createElement('div');btn.style.marginTop='8px';btn.innerHTML='<button class="btn">🔄 Novas opções</button>';btn.querySelector('button').onclick=()=>regen(m);host.appendChild(btn);
}

async function regen(m){
  const st=S.current,i=S.chapterIdx,data=st.store['cap_'+i];if(!data)return;
  try{const shown=document.getElementById('narrativa').innerText.slice(-1200);const prompt=`Gere 3 novas opções coerentes com o trecho a seguir e as escolhas recentes. Somente JSON em array de 3 strings.\\nTrecho:\\n$${shown}`;const raw=await callGemini(prompt);const arr=JSON.parse((raw.match(/```json([\\s\\S]*?)```/i)?.[1]||raw).trim());if(m==='50')data.decision50=arr;else data.decision90=arr;save();choices(m==='50'?data.decision50:data.decision90,m);}
  catch{const v=['Ajustar estratégia','Buscar apoio local','Esperar o momento certo'];if(m==='50')data.decision50=v;else data.decision90=v.map(x=>x+' (alt)');save();choices(m==='50'?data.decision50:data.decision90,m);}
}

function choose(m,t){
  const st=S.current,i=S.chapterIdx,data=st.store['cap_'+i];st.path.push({cap:i,at:parseInt(m,10),choice:t});save();
  if(m==='50'){document.getElementById('narrativa').appendChild(divHTML(toHTML(data.part2||'')));choices(data.decision90,'90')}
  else{document.getElementById('narrativa').appendChild(divHTML(toHTML(data.conclusion||'')));if(st.firstPerson&&/morr(i|eu)|morte|fim precoce/i.test(((data.conclusion||'')+(data.part2||'')))){alert('Fim precoce! Este protagonista não sobreviveu.');document.getElementById('btnNext').onclick=()=>document.getElementById('btnHome').click();} else {document.getElementById('btnNext').onclick=()=>{if(S.chapterIdx+1<st.chapters){S.chapterIdx++; if(!st.store['cap_'+S.chapterIdx]) genAndRender(); else renderFromStore();} else alert('Temporada concluída.');};}}
}
})();