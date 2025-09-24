/* webapp.v2.0.0.js — HistorIA 2.0.0 */
(function(){const DB='historIA_db',VER=1,STORE='stories';let idb;const $=s=>document.querySelector(s);
function oDB(){return new Promise((r,j)=>{const x=indexedDB.open(DB,VER);x.onupgradeneeded=()=>{const d=x.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'})};x.onsuccess=()=>r(x.result);x.onerror=()=>j(x.error)})}
async function gAll(){idb=idb||await oDB();return new Promise((r,j)=>{const t=idb.transaction(STORE,'readonly');const s=t.objectStore(STORE);const q=s.getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>j(q.error)})}
async function clr(){idb=idb||await oDB();return new Promise((r,j)=>{const t=idb.transaction(STORE,'readwrite');t.objectStore(STORE).clear();t.oncomplete=()=>r();t.onerror=()=>j(t.error)})}
async function putMany(v){idb=idb||await oDB();return new Promise((r,j)=>{const t=idb.transaction(STORE,'readwrite');const s=t.objectStore(STORE);(v||[]).forEach(it=>s.put(it));t.oncomplete=()=>r();t.onerror=()=>j(t.error)})}
(async()=>{try{const it=await gAll();if(!it||!it.length){const ls=localStorage.getItem('historia.stories');if(ls){const arr=(JSON.parse(ls)||[]).filter(Boolean).map(s=>({...s,id:s.id||Date.now()+Math.random().toString(36).slice(2)}));await putMany(arr);localStorage.setItem('historia.stories',JSON.stringify(arr));console.log('[HistorIA] migrou:',arr.length)}}}catch(e){console.warn('[HistorIA] migração falhou',e)}})();
window.HistorIA_loadStories=async()=>{try{const it=await gAll();if(it&&it.length)return it;const ls=localStorage.getItem('historia.stories');return ls?JSON.parse(ls):[]}catch{const ls=localStorage.getItem('historia.stories');return ls?JSON.parse(ls):[]}};
const _set=localStorage.setItem.bind(localStorage);localStorage.setItem=function(k,v){_set(k,v);if(k==='historia.stories'){try{const a=JSON.parse(v||'[]');(async()=>{try{await clr();await putMany(a||[])}catch(e){console.warn('[HistorIA] IDX persist falhou',e)}})()}catch{}}};
window.addEventListener('beforeunload',()=>{try{const ls=localStorage.getItem('historia.stories');if(ls){const a=JSON.parse(ls);(async()=>{try{await clr();await putMany(a||[])}catch{}})()}}catch{}});

const state={stories:[],current:null,chapterIdx:0};
function save(){localStorage.setItem('historia.stories',JSON.stringify(state.stories))}
function onReady(f){if(document.readyState!=='loading')f();else document.addEventListener('DOMContentLoaded',f)}
onReady(async()=>{state.stories=await window.HistorIA_loadStories();wire();list();if(!localStorage.getItem('hx_license_key'))$('#license').classList.remove('hidden')});

function bindLicense() {
  const modal = document.getElementById('license');
  const btnSettings = document.getElementById('btnSettings');
  const btnSave = document.getElementById('lic_ok');
  const btnClose = document.getElementById('lic_cancel');

  // garante que não há handlers duplicados
  btnSave.onclick = null; btnClose.onclick = null; btnSettings.onclick = null;

  btnSettings.onclick = () => modal.classList.toggle('hidden');

  btnClose.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    modal.classList.add('hidden');
  };

  btnSave.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    const key   = document.getElementById('licenseKey').value.trim();
    const model = document.getElementById('modelKey').value.trim();
    const ghOwn = document.getElementById('gh_owner').value.trim();
    const ghRep = document.getElementById('gh_repo').value.trim();
    const ghBr  = document.getElementById('gh_branch').value.trim();
    const ghTok = document.getElementById('gh_token').value.trim();

    localStorage.setItem('hx_license_key', key);
    localStorage.setItem('hx_model_key',   model || 'gemini-1.5-pro');
    localStorage.setItem('hx_gh_owner',    ghOwn);
    localStorage.setItem('hx_gh_repo',     ghRep);
    localStorage.setItem('hx_gh_branch',   ghBr || 'main');
    localStorage.setItem('hx_gh_token',    ghTok);

    modal.classList.add('hidden');
    alert('Licença salva com sucesso.');
  };

  // Fechar ao pressionar ESC
  document.addEventListener('keydown', (ev) => {
    if (!modal.classList.contains('hidden') && ev.key === 'Escape') modal.classList.add('hidden');
  });
}

function wire(){
  $('#btnCreate').onclick=()=>{$('#screenMenu').classList.add('hidden');$('#screenCreator').classList.remove('hidden');$('#btnHome').classList.remove('hidden')};
  $('#btnCancel').onclick=()=>{$('#screenCreator').classList.add('hidden');$('#screenMenu').classList.remove('hidden');$('#btnHome').classList.add('hidden')};
  $('#btnHome').onclick=()=>{$('#screenReader').classList.add('hidden');$('#screenCreator').classList.add('hidden');$('#screenMenu').classList.remove('hidden');$('#btnHome').classList.add('hidden');list()};
  // narrador tempo real
  const rate=$('#rateSlider'),vol=$('#volSlider'),rateVal=$('#rateVal'),volVal=$('#volVal');
  $('#pillRate').onclick=()=>$('#wrapRate').classList.toggle('open');
  $('#pillVol').onclick=()=>$('#wrapVol').classList.toggle('open');
  $('#muteBtn').onclick=()=>{vol.value='0';vol.oninput()};
  let utt=null;
  if('speechSynthesis'in window){
    $('#btnSpeak').onclick=()=>{const t=$('#narrativa')?.innerText?.trim();if(!t)return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); utt=u; u.rate=parseFloat(rate.value||'1'); u.volume=parseFloat(vol.value||'0.9'); speechSynthesis.speak(u); u.onend=()=>utt=null;};
    $('#btnStop').onclick=()=>speechSynthesis.cancel();
    rate.oninput=()=>{rateVal.textContent=parseFloat(rate.value).toFixed(2)+'x'; if(utt) utt.rate=parseFloat(rate.value)};
    vol.oninput=()=>{volVal.textContent=Math.round(parseFloat(vol.value)*100)+'%'; if(utt) utt.volume=parseFloat(vol.value)};
  }
  $('#btnGenerate').onclick=()=>{
    const st={id:Date.now()+Math.random().toString(36).slice(2),title:$('#f_title').value.trim()||'Sem título',genre:$('#f_genre').value,nuclei:$('#f_nuclei').value.trim(),brief:$('#f_brief').value.trim(),chapters:Math.max(1,Math.min(10,parseInt($('#f_capitulos').value||'10',10))),firstPerson:$('#f_firstperson').checked,path:[],store:{}};
    state.stories.push(st); save(); open(st.id,true);
  };
  $('#btnBack').onclick=()=>{if(state.chapterIdx>0){state.chapterIdx--; renderFromStore()}};
  bindLicense();
}

function list(){
  const host=$('#listStories'); host.innerHTML='';
  state.stories.forEach(st=>{
    const d=document.createElement('div'); d.className='card center';
    d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-weight:700">${st.title}</div>
      <div style="color:#aab1bd;font-size:12px">${st.genre} • ${st.chapters} caps • ${st.firstPerson?'1ª pessoa':'3ª pessoa'}</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn" data-open>▶️ Ler</button>
        <button class="btn" data-del>🗑️</button>
      </div></div>`;
    d.querySelector('[data-open]').onclick=()=>open(st.id);
    d.querySelector('[data-del]').onclick=()=>{if(confirm('Excluir roteiro?')){const i=state.stories.findIndex(x=>x.id===st.id);if(i>=0){state.stories.splice(i,1);save();list();}}};
    host.appendChild(d);
  });
}

async function open(id,genFirst=false){
  const st=state.stories.find(x=>x.id===id); if(!st) return;
  state.current=st; state.chapterIdx=st.store.lastIdx||0;
  $('#screenMenu').classList.add('hidden'); $('#screenCreator').classList.add('hidden'); $('#screenReader').classList.remove('hidden'); $('#btnHome').classList.remove('hidden');
  if(genFirst||!st.store['cap_'+state.chapterIdx]) await genAndRender();
  else renderFromStore();
}

function renderFromStore(){
  const st=state.current, idx=state.chapterIdx, data=st.store['cap_'+idx]; if(!data) return;
  $('#capitulo').textContent="Capítulo "+(idx+1);
  $('#titulo').textContent=data.title||("Capítulo "+(idx+1));
  $('#narrativa').innerHTML = toHtml(data.part1||'');
  renderChoices(data.decision50,'50');
}

function toHtml(t){return (t||'').split(/\n+/).map(p=>`<p>${p}</p>`).join('')}

async function callGemini(prompt){
  const key=localStorage.getItem('hx_license_key'); const model=localStorage.getItem('hx_model_key')||'gemini-1.5-pro';
  if(!key) return fallback();
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.8,topK:40,topP:0.95}};
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok) return fallback();
  const data=await res.json(); const out=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text).join('');
  return out||fallback();
}
function fallback(){const o={title:"Capítulo",part1:"[Offline] Configure a licença em 🔐 Licença.",decision50:["Assumir risco","Buscar aliados","Investigar melhor"],part2:"Consequências da escolha anterior.",decision90:["Confrontar","Guardar segredo","Mudar o plano"],conclusion:"Conclusão com gancho."};return "```json\n"+JSON.stringify(o,null,2)+"\n```"}
function parseLLM(raw){const j=(raw.match(/```json([\s\S]*?)```/i)?.[1]||raw).trim();return JSON.parse(j)}
function contextUntil(idx,st){const v=[];for(let i=0;i<idx;i++){const c=st.store['cap_'+i];if(!c)break;v.push((c.title?c.title+': ':'')+c.part1.slice(0,400));const p50=st.path.find(p=>p.cap===i&&p.at===50);if(p50)v.push('Escolha 50%: '+p50.choice);v.push(c.part2.slice(0,300));const p90=st.path.find(p=>p.cap===i&&p.at===90);if(p90)v.push('Escolha 90%: '+p90.choice);v.push(c.conclusion.slice(0,200))}return v.join('\n')}
function buildPrompt(st,idx,ctx=''){const wpm=180,target=15*wpm,pov=st.firstPerson?'primeira pessoa':'terceira pessoa';const death=st.firstPerson?'ATENÇÃO: se o protagonista morrer, encerre o capítulo imediatamente; a temporada pode acabar.':'';return(`Você é roteirista de novelas brasileiras. Escreva o CAPÍTULO ${idx+1} em ${pov}.
Use TODOS os núcleos: ${st.nuclei}. Gênero: ${st.genre}. Evite clichês; foque em cenas, ações e DIÁLOGOS naturais.
Contexto até aqui: ${ctx||'início'}. Duração alvo ~${target} palavras, com decisões aos 50% e 90%. ${death}
FORMATO EXATO (apenas JSON válido):
{ "title": "...", "part1": "...", "decision50": ["A","B","C"], "part2": "...", "decision90": ["A","B","C"], "conclusion": "..." }
Enredo breve: ${st.brief}`).trim()}

async function genAndRender(){
  const st=state.current, idx=state.chapterIdx; if(!st) return;
  $('#capitulo').textContent="Capítulo "+(idx+1); $('#titulo').textContent="Gerando…"; $('#narrativa').innerHTML="<p><em>Gerando capítulo com IA…</em></p>"; $('#choices').innerHTML="";
  let raw,obj; try{ raw=await callGemini(buildPrompt(st,idx,contextUntil(idx,st))); obj=parseLLM(raw);}catch(e){ raw=fallback(); obj=parseLLM(raw); }
  st.store['cap_'+idx]=obj; st.store.lastIdx=idx; save(); renderFromStore();
  if(idx+1<st.chapters) preload(idx+1);
}

async function preload(next){
  const st=state.current; if(!st) return; if(st.store['cap_'+next]) return;
  try{ const raw=await callGemini(buildPrompt(st,next,contextUntil(next,st))); const obj=parseLLM(raw); st.store['cap_'+next]=obj; save(); }catch{}
}

function renderChoices(arr,marker){
  const host=$('#choices'); host.innerHTML='';
  const icons=['🚪','🧭','⚠️'];
  (arr||[]).slice(0,3).forEach((txt,i)=>{
    const d=document.createElement('div'); d.className='choice';
    d.innerHTML=`<div class="ico">${icons[i%icons.length]}</div>
    <div><div class="label">Opção ${'ABC'[i]}</div><div class="txt">${txt}</div>
    <div class="btns"><button class="btn" data-i="${i}" data-m="${marker}">Escolher</button></div></div>`;
    d.querySelector('button').onclick=()=>choose(marker,txt);
    host.appendChild(d);
  });
  $('#btnNewOptions').onclick=()=>regen(marker);
}

async function regen(marker){
  const st=state.current, idx=state.chapterIdx, data=st.store['cap_'+idx]; if(!data) return;
  const shown=$('#narrativa').innerText.slice(-1200), key=localStorage.getItem('hx_license_key');
  if(!key){const v=["Arriscar agora","Chamar reforços","Observar e recolher provas"]; if(marker==='50') data.decision50=v; else data.decision90=v; save(); renderChoices(marker==='50'?data.decision50:data.decision90,marker); return;}
  const model=localStorage.getItem('hx_model_key')||'gemini-1.5-pro'; const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const ask=`Gere exatamente 3 opções curtas e distintas, coerentes com o trecho a seguir, que sejam divisor de caminho neste ponto (marker ${marker}). Responda APENAS JSON: ["A","B","C"]. Trecho:\n${shown}`;
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:ask}]}]})});
  try{const d=await res.json(); const out=(d?.candidates?.[0]?.content?.parts||[]).map(p=>p.text).join(''); const j=(out.match(/```json([\s\S]*?)```/i)?.[1]||out).trim(); const arr=JSON.parse(j); if(Array.isArray(arr)&&arr.length>=3){ if(marker==='50') data.decision50=arr.slice(0,3); else data.decision90=arr.slice(0,3); save(); renderChoices(arr.slice(0,3),marker);} }catch{}
}

function choose(marker,txt){
  const st=state.current, idx=state.chapterIdx, data=st.store['cap_'+idx]; if(!data) return;
  st.path.push({cap:idx,at:parseInt(marker,10),choice:txt}); save();
  if(marker==='50'){ $('#narrativa').innerHTML += toHtml(data.part2||''); renderChoices(data.decision90,'90'); }
  else{
    $('#narrativa').innerHTML += toHtml(data.conclusion||'');
    if(st.firstPerson && /morr(i|eu)|morte|fim precoce/i.test(((data.conclusion||'')+(data.part2||'')).toLowerCase())){
      alert('Fim precoce! Este protagonista não sobreviveu. Você pode iniciar outro roteiro.'); $('#btnNext').onclick=()=>$('#btnHome').click(); return;
    }
    $('#btnNext').onclick=()=>{ if(idx+1<st.chapters){ state.chapterIdx++; genAndRender(); } else { alert('Temporada concluída!'); $('#btnHome').click(); } };
  }
}
})();