// HistorIA v1.9.9 — single JS com persistência forte (IndexedDB + localStorage)
// -----------------------------------------------------------------------------
// Este arquivo contém TODO o motor do app, melhorias e o patch de persistência.
// -----------------------------------------------------------------------------

(function(){
// ========== [PERSISTÊNCIA FORTE] IndexedDB + localStorage + migração ==========
const DB_NAME='historIA_db', DB_VER=1, STORE='stories';
let idb;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VER);
    req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); };
    req.onsuccess=()=>resolve(req.result);
    req.onerror =()=>reject(req.error);
  });
}
async function idbGetAll(){
  idb=idb||await openDB();
  return new Promise((resolve,reject)=>{
    const tx=idb.transaction(STORE,'readonly');
    const st=tx.objectStore(STORE);
    const rq=st.getAll();
    rq.onsuccess=()=>resolve(rq.result||[]);
    rq.onerror  =()=>reject(rq.error);
  });
}
async function idbClear(){
  idb=idb||await openDB();
  return new Promise((resolve,reject)=>{
    const tx=idb.transaction(STORE,'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete=()=>resolve();
    tx.onerror   =()=>reject(tx.error);
  });
}
async function idbPutMany(items){
  idb=idb||await openDB();
  return new Promise((resolve,reject)=>{
    const tx=idb.transaction(STORE,'readwrite');
    const st=tx.objectStore(STORE);
    (items||[]).forEach(it=>st.put(it));
    tx.oncomplete=()=>resolve();
    tx.onerror   =()=>reject(tx.error);
  });
}

(async ()=>{
  try{
    const idbItems=await idbGetAll();
    if(!idbItems||!idbItems.length){
      const ls=localStorage.getItem('historia.stories');
      if(ls){
        const arr=(JSON.parse(ls)||[]).filter(Boolean).map(s=>({...s,id:s.id||Date.now()+Math.random().toString(36).slice(2)}));
        await idbPutMany(arr);
        localStorage.setItem('historia.stories',JSON.stringify(arr));
        console.log('[HistorIA] Migração para IndexedDB concluída:',arr.length,'itens');
      }
    }
  }catch(e){ console.warn('[HistorIA] Migração falhou:',e); }
})();

window.HistorIA_loadStories = async function(){
  try{
    const idbItems=await idbGetAll();
    if(idbItems&&idbItems.length) return idbItems;
    const ls=localStorage.getItem('historia.stories');
    return ls?JSON.parse(ls):[];
  }catch{
    const ls=localStorage.getItem('historia.stories');
    return ls?JSON.parse(ls):[];
  }
};

const _origSetItem=localStorage.setItem.bind(localStorage);
localStorage.setItem=function(k,v){
  _origSetItem(k,v);
  if(k==='historia.stories'){
    try{
      const arr=JSON.parse(v||'[]');
      (async()=>{ try{ await idbClear(); await idbPutMany(arr||[]);}catch(e){console.warn('[HistorIA] Persistência IndexedDB falhou:',e);} })();
    }catch{}
  }
};

window.addEventListener('beforeunload',()=>{
  try{
    const ls=localStorage.getItem('historia.stories');
    if(ls){ const arr=JSON.parse(ls); (async()=>{try{await idbClear(); await idbPutMany(arr||[]);}catch{}})(); }
  }catch{}
});

const $=s=>document.querySelector(s);
const state={stories:[],current:null,chapterIdx:0,chapterObj:null,seed:Math.random().toString(36).slice(2)};

function saveStories(){ localStorage.setItem('historia.stories',JSON.stringify(state.stories)); }
function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }

onReady(async ()=>{
  state.stories = await window.HistorIA_loadStories();
  wireUI(); renderList();
  if(!localStorage.getItem('hx_license_key')) $('#license').classList.remove('hidden');
});

function wireUI(){
  $('#btnSettings').onclick=()=>$('#license').classList.toggle('hidden');
  $('#lic_cancel').onclick =()=>$('#license').classList.add('hidden');
  $('#lic_ok').onclick=()=>{
    localStorage.setItem('hx_license_key',$('#licenseKey').value.trim());
    localStorage.setItem('hx_model_key',$('#modelKey').value.trim());
    localStorage.setItem('hx_gh_owner',$('#gh_owner').value.trim());
    localStorage.setItem('hx_gh_repo' ,$('#gh_repo').value.trim());
    localStorage.setItem('hx_gh_branch',$('#gh_branch').value.trim());
    localStorage.setItem('hx_gh_token' ,$('#gh_token').value.trim());
    $('#license').classList.add('hidden');
  };
  $('#btnCreate').onclick=()=>{ $('#screenMenu').classList.add('hidden'); $('#screenCreator').classList.remove('hidden'); $('#btnHome').classList.remove('hidden'); };
  $('#btnCancel').onclick=()=>{ $('#screenCreator').classList.add('hidden'); $('#screenMenu').classList.remove('hidden'); $('#btnHome').classList.add('hidden'); };
  $('#btnHome').onclick  =()=>{ $('#screenReader').classList.add('hidden'); $('#screenCreator').classList.add('hidden'); $('#screenMenu').classList.remove('hidden'); $('#btnHome').classList.add('hidden'); renderList(); };

  const rateSlider=$('#rateSlider'), volSlider=$('#volSlider'), rateVal=$('#rateVal'), volVal=$('#volVal');
  $('#pillRate').onclick=()=>$('#wrapRate').classList.toggle('open');
  $('#pillVol' ).onclick=()=>$('#wrapVol' ).classList.toggle('open');
  $('#muteBtn').onclick =()=>{ volSlider.value='0'; volSlider.oninput(); };
  let currentUtterance=null;
  if('speechSynthesis' in window){
    $('#btnSpeak').onclick=()=>{ const t=$('#narrativa')?.innerText?.trim(); if(!t) return; speechSynthesis.cancel(); narrate(t); };
    $('#btnStop' ).onclick=()=> speechSynthesis.cancel();
    rateSlider.oninput=()=>{ rateVal.textContent=parseFloat(rateSlider.value).toFixed(2)+'x'; if(currentUtterance) currentUtterance.rate=parseFloat(rateSlider.value); };
    volSlider.oninput =()=>{ volVal.textContent=Math.round(parseFloat(volSlider.value)*100)+'%'; if(currentUtterance) currentUtterance.volume=parseFloat(volSlider.value); };
    function narrate(text){
      const u=new SpeechSynthesisUtterance(text); currentUtterance=u;
      u.rate=parseFloat(rateSlider.value||'1'); u.volume=parseFloat(volSlider.value||'0.9'); speechSynthesis.speak(u); u.onend=()=>currentUtterance=null;
    }
  }

  $('#btnGenerate').onclick=async ()=>{
    const st={
      id: Date.now()+Math.random().toString(36).slice(2),
      title: $('#f_title').value.trim()||'Sem título',
      genre: $('#f_genre').value,
      nuclei: $('#f_nuclei').value.trim(),
      brief: $('#f_brief').value.trim(),
      chapters: Math.max(1,Math.min(10,parseInt($('#f_capitulos').value||'10',10))),
      firstPerson: $('#f_firstperson').checked,
      path:[],
      store:{}
    };
    state.stories.push(st); saveStories();
    openStory(st.id,true);
  };

  $('#btnBack').onclick=()=>{ if(state.chapterIdx>0){ state.chapterIdx--; renderChapterFromStore(); } };
}

function renderList(){
  const host=$('#listStories'); if(!host) return; host.innerHTML='';
  state.stories.forEach(st=>{
    const div=document.createElement('div');
    div.className='card center';
    div.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-weight:700">${st.title}</div>
      <div style="color:#aab1bd;font-size:12px">${st.genre} • ${st.chapters} caps • ${st.firstPerson?'1ª pessoa':'3ª pessoa'}</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn" data-act="open">▶️ Ler</button>
        <button class="btn" data-act="delete">🗑️</button>
      </div></div>`;
    div.querySelector('[data-act=open]').onclick =()=>openStory(st.id);
    div.querySelector('[data-act=delete]').onclick=()=>{
      if(confirm('Excluir roteiro?')){
        const i=state.stories.findIndex(x=>x.id===st.id);
        if(i>=0){ state.stories.splice(i,1); saveStories(); renderList(); }
      }
    };
    host.appendChild(div);
  });
}

async function openStory(id, generateFirst=false){
  const st=state.stories.find(x=>x.id===id); if(!st) return;
  state.current=st; state.chapterIdx=st.store.lastIdx||0;
  $('#screenMenu').classList.add('hidden'); $('#screenCreator').classList.add('hidden'); $('#screenReader').classList.remove('hidden'); $('#btnHome').classList.remove('hidden');
  if(generateFirst || !st.store['cap_'+state.chapterIdx]) await generateAndRenderChapter();
  else renderChapterFromStore();
}

function renderChapterFromStore(){
  const st=state.current, idx=state.chapterIdx; if(!st) return;
  const data=st.store['cap_'+idx]; if(!data) return;
  $('#capitulo').textContent="Capítulo "+(idx+1);
  $('#titulo').textContent=data.title||("Capítulo "+(idx+1));
  const host=$('#narrativa'); host.innerHTML="";
  host.appendChild(divHTML(toHTML(data.part1||'')));
  renderChoices(data.decision50,'50');
}

function divHTML(html){ const d=document.createElement('div'); d.className='story'; d.innerHTML=html; return d; }
function toHTML(t){ return (t||'').split(/\\n+/).map(p=>`<p>${p}</p>`).join(''); }

async function callGemini(prompt){
  const key=localStorage.getItem('hx_license_key'); const model=localStorage.getItem('hx_model_key')||'gemini-1.5-pro';
  if(!key) return fallbackChapter(prompt);
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.8,topK:40,topP:0.95}};
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok) return fallbackChapter(prompt);
  const data=await res.json();
  const out=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text).join('');
  return out||fallbackChapter(prompt);
}

function buildPrompt(story,chapterIdx,context=''){
  const wpm=180, target=15*wpm, pov=story.firstPerson?'primeira pessoa':'terceira pessoa';
  const death=story.firstPerson?'ATENÇÃO: se o protagonista morrer, encerre o capítulo imediatamente; a temporada pode acabar.':'';
  return (`Você é roteirista de novelas brasileiras. Escreva o CAPÍTULO ${chapterIdx+1} em ${pov}.
Use TODOS os núcleos: ${story.nuclei}. Gênero: ${story.genre}. Evite clichês (ex.: "o ar estava denso"); foque em cenas, ações e DIÁLOGOS naturais.
Contexto até aqui: ${context||'início'}. Duração alvo ~${target} palavras, com decisões aos 50% e 90%. ${death}
FORMATO EXATO (apenas JSON válido):
{ "title": "...", "part1": "...", "decision50": ["A","B","C"], "part2": "...", "decision90": ["A","B","C"], "conclusion": "..." }
Enredo breve: ${story.brief}`).trim();
}

function fallbackChapter(){
  const obj={title:"Capítulo",part1:"[Modo offline] Configure sua licença em 🔐 Licença para melhor qualidade.",
    decision50:["Assumir o risco e avançar","Buscar aliados improváveis","Investigar melhor"],
    part2:"Consequências diretas da escolha anterior avançam o enredo.",
    decision90:["Confrontar o antagonista","Guardar segredo por enquanto","Mudar o plano"],
    conclusion:"Conclusão provisória do capítulo com gancho para o próximo."};
  return "```json\\n"+JSON.stringify(obj,null,2)+"\\n```";
}
function parseJsonFromLLM(raw){ const j=(raw.match(/```json([\\s\\S]*?)```/i)?.[1]||raw).trim(); return JSON.parse(j); }

function buildContextUntil(idx,st){
  const parts=[];
  for(let i=0;i<idx;i++){
    const c=st.store['cap_'+i]; if(!c) break;
    parts.push((c.title?c.title+': ':'')+c.part1.slice(0,400));
    const p50=st.path.find(p=>p.cap===i&&p.at===50); if(p50) parts.push('Escolha 50%: '+p50.choice);
    parts.push(c.part2.slice(0,300));
    const p90=st.path.find(p=>p.cap===i&&p.at===90); if(p90) parts.push('Escolha 90%: '+p90.choice);
    parts.push(c.conclusion.slice(0,200));
  }
  return parts.join('\\n');
}

async function generateAndRenderChapter(){
  const st=state.current, idx=state.chapterIdx; if(!st) return;
  const context=buildContextUntil(idx,st);
  $('#capitulo').textContent="Capítulo "+(idx+1);
  $('#titulo').textContent="Gerando…";
  $('#narrativa').innerHTML="<p><em>Gerando capítulo com IA…</em></p>";
  $('#choices').innerHTML="";
  let raw,obj;
  try{ raw=await callGemini(buildPrompt(st,idx,context)); obj=parseJsonFromLLM(raw); }
  catch(e){ raw=fallbackChapter(); obj=parseJsonFromLLM(raw); }
  st.store['cap_'+idx]=obj; st.store.lastIdx=idx; saveStories();
  renderChapterFromStore();
  if(idx+1<st.chapters) preload(idx+1);
}

async function preload(nextIdx){
  const st=state.current; if(!st) return;
  if(st.store['cap_'+nextIdx]) return;
  try{
    const ctx=buildContextUntil(nextIdx,st);
    const raw=await callGemini(buildPrompt(st,nextIdx,ctx));
    const obj=parseJsonFromLLM(raw);
    st.store['cap_'+nextIdx]=obj; saveStories();
  }catch{}
}

function renderChoices(arr,marker){
  const host=$('#choices'); host.innerHTML='';
  const icons=['🚪','🧭','⚠️'];
  (arr||[]).slice(0,3).forEach((txt,i)=>{
    const div=document.createElement('div'); div.className='choice';
    div.innerHTML=`<div class="ico">${icons[i%icons.length]}</div>
      <div><div class="label">Opção ${'ABC'[i]}</div><div class="txt">${txt}</div>
      <div class="btns"><button class="btn" data-i="${i}" data-m="${marker}">Escolher</button></div></div>`;
    div.querySelector('button').onclick=()=>onChoose(marker,txt);
    host.appendChild(div);
  });
  $('#btnNewOptions').onclick=()=>regenerateChoices(marker);
}

async function regenerateChoices(marker){
  const st=state.current, idx=state.chapterIdx, data=st.store['cap_'+idx]; if(!data) return;
  const shown=$('#narrativa').innerText.slice(-1200);
  const key=localStorage.getItem('hx_license_key');
  if(!key){
    const variants=["Apostar tudo agora","Chamar reforços discretamente","Observar e recolher provas"];
    if(marker==='50') data.decision50=variants; else data.decision90=variants.map(v=>v+" (ajustada)");
    saveStories(); renderChoices(marker==='50'?data.decision50:data.decision90,marker); return;
  }
  const model=localStorage.getItem('hx_model_key')||'gemini-1.5-pro';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const ask=`Gere exatamente 3 opções curtas e distintas, coerentes com o trecho a seguir, que sejam divisor de caminho neste ponto (marker ${marker}). Responda APENAS JSON: ["A","B","C"]. Trecho:\\n${shown}`;
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:ask}]}]})});
  let arr;
  try{
    const dataR=await res.json();
    const out=(dataR?.candidates?.[0]?.content?.parts||[]).map(p=>p.text).join('');
    const j=(out.match(/```json([\\s\\S]*?)```/i)?.[1]||out).trim();
    arr=JSON.parse(j);
  }catch{ arr=null; }
  if(Array.isArray(arr)&&arr.length>=3){
    if(marker==='50') data.decision50=arr.slice(0,3); else data.decision90=arr.slice(0,3);
    saveStories(); renderChoices(arr.slice(0,3),marker);
  }
}

function onChoose(marker,txt){
  const st=state.current, idx=state.chapterIdx, data=st.store['cap_'+idx]; if(!data) return;
  st.path.push({cap:idx,at:parseInt(marker,10),choice:txt}); saveStories();
  if(marker==='50'){
    $('#narrativa').appendChild(divHTML(toHTML(data.part2||'')));
    renderChoices(data.decision90,'90');
  }else{
    $('#narrativa').appendChild(divHTML(toHTML(data.conclusion||'')));
    if(st.firstPerson && /morr(i|eu)|morte|fim precoce/i.test((data.conclusion||'')+(data.part2||''))){
      alert('Fim precoce! Este protagonista não sobreviveu. Você pode iniciar outro roteiro.');
      $('#btnNext').onclick=()=>$('#btnHome').click();
      return;
    }
    $('#btnNext').onclick=()=>{
      if(idx+1<st.chapters){ state.chapterIdx++; generateAndRenderChapter(); }
      else{ alert('Temporada concluída!'); $('#btnHome').click(); }
    };
  }
}

})();