
/* webapp.v2.0.15.js
   - IndexedDB estável: historiaIA v3, stores: projects, chapters, progress, settings (sem deletar).
   - Chamada Gemini v1beta/:generateContent
   - Status por projeto
*/
const VERSION = 'v2.0.15';
const DEFAULT_API_KEY = 'AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM';
const DEFAULT_MODEL = 'gemini-1.5-pro';
const DB_NAME = 'historiaIA';
const DB_VERSION = 3;
let db;

// ---------- IndexedDB helpers ----------
function openDB() {
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e)=>{
      const d = e.target.result;
      // Cria stores se não existirem. Não deleta nenhuma.
      if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects',{keyPath:'id'});
      if (!d.objectStoreNames.contains('chapters')) d.createObjectStore('chapters',{keyPath:'id'});
      if (!d.objectStoreNames.contains('progress')) d.createObjectStore('progress',{keyPath:'id'});
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings',{keyPath:'key'});
    };
    req.onsuccess = ()=>{ db = req.result; resolve(db); };
    req.onerror = ()=>reject(req.error);
  });
}
function tx(store, mode='readonly'){ return db.transaction(store, mode).objectStore(store); }
function put(store, val){ return new Promise((res,rej)=>{ const r=tx(store,'readwrite').put(val); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }
function get(store, key){ return new Promise((res,rej)=>{ const r=tx(store).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function getAll(store){ return new Promise((res,rej)=>{ const r=tx(store).getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
function del(store, key){ return new Promise((res,rej)=>{ const r=tx(store,'readwrite').delete(key); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }

// ---------- Settings ----------
function loadSetting(k, def){ const v = localStorage.getItem(k); return v ?? def; }
function saveSetting(k, v){ localStorage.setItem(k, v); }

function currentApiKey(){ return loadSetting('ai.license', DEFAULT_API_KEY); }
function currentModel(){ return loadSetting('ai.model', DEFAULT_MODEL); }

// ---------- UI refs ----------
const list = document.getElementById('list');
const mdlNew = document.getElementById('mdlNew');
const mdlIA  = document.getElementById('mdlIA');
const mdlTut = document.getElementById('mdlTut');

// buttons
document.getElementById('btnNew').onclick = ()=> mdlNew.classList.add('show');
document.getElementById('btCancelNew').onclick = ()=> mdlNew.classList.remove('show');
document.getElementById('btCreate').onclick = createProject;

document.getElementById('btnIA').onclick = ()=> {
  document.getElementById('inModel').value = currentModel();
  document.getElementById('inKey').value = currentApiKey();
  mdlIA.classList.add('show');
};
document.getElementById('btCloseIA').onclick = ()=> mdlIA.classList.remove('show');
document.getElementById('btSaveIA').onclick = ()=> {
  saveSetting('ai.model', document.getElementById('inModel').value.trim() || DEFAULT_MODEL);
  saveSetting('ai.license', document.getElementById('inKey').value.trim() || DEFAULT_API_KEY);
  mdlIA.classList.remove('show');
};

document.getElementById('btnTutorial').onclick = ()=> mdlTut.classList.add('show');
document.getElementById('btCloseTut').onclick = ()=> mdlTut.classList.remove('show');

// ---------- Rendering ----------
async function renderList(){
  const arr = await getAll('projects');
  list.innerHTML = '';
  if(!arr.length){ list.innerHTML = '<div class="proj">Nenhum roteiro ainda. Clique em "Criar novo roteiro".</div>'; return;}
  arr.sort((a,b)=>b.created - a.created);
  for(const p of arr){
    const wrap = document.createElement('div'); wrap.className='proj';
    const title = document.createElement('div'); title.className='title'; title.textContent = `${p.title} — ${p.genre} • ${p.chapters} caps`;
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `Núcleos: ${p.nucleos}`;
    const badge = document.createElement('div'); badge.style.margin='10px 0';
    if(p.status?.state==='error'){
      badge.className='badge err'; badge.textContent = `API offline/falhou: ${p.status?.msg||'erro'}`;
    } else if(p.status?.state==='generating'){
      badge.className='badge'; badge.style.background='#2b2f3e'; badge.textContent = `Gerando cap. ${p.status.chapterIndex+1}…`;
    } else {
      badge.className='badge ok'; badge.textContent = 'Pronto';
    }
    const row = document.createElement('div'); row.className='row';
    const btOpen = document.createElement('button'); btOpen.className='btn'; btOpen.textContent='Abrir';
    btOpen.onclick = ()=> openProject(p.id);
    const btDel = document.createElement('button'); btDel.className='btn secondary'; btDel.textContent='Excluir';
    btDel.onclick = async ()=>{ await del('projects',p.id); await renderList(); };
    row.append(btOpen, btDel);
    wrap.append(title, meta, badge, row);
    list.append(wrap);
  }
}

// ---------- Create Project ----------
async function createProject(){
  const title = document.getElementById('inTitle').value.trim();
  const genre = document.getElementById('inGenre').value;
  const nucleos = document.getElementById('inNucleos').value.trim();
  const chapters = Math.max(1, Math.min(10, parseInt(document.getElementById('inChapters').value||'10',10)));
  const firstPerson = document.getElementById('inFirst').value==='yes';
  const pitch = document.getElementById('inPitch').value.trim();
  if(!title){ alert('Informe um título'); return; }
  const id = 'p-'+Date.now();
  const proj = { id, title, genre, nucleos, chapters, firstPerson, pitch, created: Date.now(), status:{state:'generating', chapterIndex:0} };
  await put('projects', proj);
  mdlNew.classList.remove('show');
  await renderList();
  // start generating first chapter
  generateChapter(proj.id, 0).catch(()=>{});
}

// ---------- Gemini call ----------
async function callGemini(prompt, model, key){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = { contents: [{ role:'user', parts:[{text: prompt}]}] };
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if(!res.ok){ throw new Error(`HTTP ${res.status}`); }
  const data = await res.json();
  // extract text
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') ?? '';
  return text;
}

// ---------- Prompts ----------
function buildChapterPrompt(proj, chapterIndex){
  const persona = proj.firstPerson? 'Narração em primeira pessoa; o leitor é o protagonista.' : 'Narração em terceira pessoa.';
  return `Você é roteirista. Gere o CAPÍTULO ${chapterIndex+1} de uma novela interativa, em ${persona}
Gênero: ${proj.genre}
Núcleos: ${proj.nucleos}
Enredo breve (guia ≈50%): ${proj.pitch}

Regras de forma:
- Texto fluido (~15 minutos de leitura por capítulo).
- Duas decisões: em ~50% e ~90% do capítulo, com 3 opções (A/B/C) coerentes com o que acabou de acontecer.
- Evite clichês de “ar pesado/tenso” repetidos; foque em ações, diálogos e detalhes concretos.
- O capítulo termina com um desfecho coerente DESTE capítulo (não da temporada).`;
}

// ---------- Chapter generation ----------
async function updateProjectStatus(id, state, msg, chapterIndex){
  const p = await get('projects', id); if(!p) return;
  p.status = {state, msg, chapterIndex};
  await put('projects', p);
  await renderList();
}
async function generateChapter(projectId, chapterIndex){
  const proj = await get('projects', projectId);
  if(!proj) return;
  await updateProjectStatus(projectId, 'generating', '', chapterIndex);
  try{
    const prompt = buildChapterPrompt(proj, chapterIndex);
    const text = await callGemini(prompt, currentModel(), currentApiKey());
    const chapId = `${projectId}-c${chapterIndex+1}`;
    await put('chapters', { id: chapId, projectId, chapterIndex, text, created: Date.now() });
    await updateProjectStatus(projectId, 'ok', '', chapterIndex);
  }catch(err){
    await updateProjectStatus(projectId, 'error', String(err.message||err), chapterIndex);
  }
}

// ---------- Open project (simple reader) ----------
async function openProject(id){
  const p = await get('projects', id);
  if(!p){ alert('Roteiro não encontrado'); return; }
  const chs = await getAll('chapters');
  const arr = chs.filter(c=>c.projectId===id).sort((a,b)=>a.chapterIndex-b.chapterIndex);
  const last = arr[arr.length-1];
  if(!last){ alert('Ainda gerando o primeiro capítulo…'); return; }
  // Show a basic reader
  const modal = document.createElement('div'); modal.className='modal show';
  const box = document.createElement('div'); box.className='box'; box.style.maxWidth='900px'; box.style.width='96%';
  const h = document.createElement('h3'); h.textContent = `${p.title} — Capítulo ${last.chapterIndex+1}`;
  const pre = document.createElement('div'); pre.style.whiteSpace='pre-wrap'; pre.style.maxHeight='60vh'; pre.style.overflow='auto'; pre.textContent= last.text || '(sem texto)';
  const row = document.createElement('div'); row.className='row'; row.style.justifyContent='flex-end'; row.style.marginTop='10px';
  const close = document.createElement('button'); close.className='btn'; close.textContent='Fechar'; close.onclick = ()=> modal.remove();
  row.append(close);
  box.append(h, pre, row); modal.append(box); document.body.append(modal);
}

// ---------- Boot ----------
(async function(){
  await openDB();
  // seed settings if missing
  if(!localStorage.getItem('ai.model')) saveSetting('ai.model', DEFAULT_MODEL);
  if(!localStorage.getItem('ai.license')) saveSetting('ai.license', DEFAULT_API_KEY);
  renderList();
})();
