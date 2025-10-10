(()=>{
const $=(q,el=document)=>el.querySelector(q);
const $$=(q,el=document)=>[...el.querySelectorAll(q)];
const modal=$('#modal'), reader=$('#reader');
let db, STORIES=[];
const DB='historia-db-v2016';

const iaKey='AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM';
$('#btnIA').onclick=()=>alert('IA: Google AI Studio (Gemini)\\nModelo: gemini-1.5-pro\\nChave embutida neste build.');

const idb={open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('stories'))d.createObjectStore('stories',{keyPath:'id'})};r.onsuccess=e=>{db=e.target.result;res()};r.onerror=()=>rej(r.error)})},
list(){return new Promise((res,rej)=>{const tx=db.transaction('stories','readonly').objectStore('stories').getAll();tx.onsuccess=()=>res(tx.result||[]);tx.onerror=()=>rej(tx.error)})},
put(s){return new Promise((res,rej)=>{const tx=db.transaction('stories','readwrite').objectStore('stories').put(s);tx.onsuccess=()=>res();tx.onerror=()=>rej(tx.error)})},
del(id){return new Promise((res,rej)=>{const tx=db.transaction('stories','readwrite').objectStore('stories').delete(id);tx.onsuccess=()=>res();tx.onerror=()=>rej(tx.error)})}};

function openModal(m){m.classList.add('open');document.body.style.overflow='hidden'}
function closeModal(m){m.classList.remove('open');document.body.style.overflow=''}

const synth=window.speechSynthesis; let utter;
$('#speak').onclick=()=>{const t=$('#rBody').textContent||'Selecione um capítulo.'; if(utter)synth.cancel(); utter=new SpeechSynthesisUtterance(t); utter.rate=parseFloat($('#rate').value||'1'); utter.volume=parseFloat($('#vol').value||'0.9'); synth.speak(utter)};
$('#stop').onclick=()=>synth.cancel();

function render(){const wrap=$('#stories');wrap.innerHTML='';if(!STORIES.length){wrap.innerHTML='<div class="muted">Nenhum roteiro ainda. Clique em <b>Criar novo roteiro</b>.</div>';return}
  STORIES.forEach(st=>{const card=document.createElement('div');card.className='story';
    const status=st.error?'<span class="status err">API offline/falhou</span>':st.generating?'<span class="status warn">Gerando…</span>':'<span class="status ok">Pronto</span>';
    card.innerHTML=`<h3>${st.title} — <span class="muted">${st.genre}</span> • ${st.chapters} caps</h3>
      <div class="muted">Núcleos: ${st.cores}</div>
      <div style="margin:10px 0">${status}</div>
      <div class="row">
        <button class="btn" data-open="${st.id}">Abrir</button>
        <button class="btn secondary" data-regen="${st.id}">Regerar</button>
        <button class="btn danger" data-del="${st.id}">Excluir</button>
      </div>`;
    wrap.appendChild(card)});
  $$('[data-open]').forEach(b=>b.onclick=()=>openReader(b.dataset.open));
  $$('[data-del]').forEach(b=>b.onclick=async()=>{await idb.del(b.dataset.del);STORIES=STORIES.filter(s=>s.id!==b.dataset.del);render()});
  $$('[data-regen]').forEach(b=>b.onclick=async()=>{const s=STORIES.find(x=>x.id===b.dataset.regen); if(!s)return; s.generating=true;s.error=null;await idb.put(s);render(); await generate(s); render()});
}

function openReader(id){const s=STORIES.find(x=>x.id===id); if(!s||!s.chaptersData||!s.chaptersData.length){alert('Roteiro ainda não possui capítulos. Aguarde a geração.');return}
  let i=0;
  function draw(){ $('#rTitle').textContent=`${s.title} — Capítulo ${i+1}`; $('#rBody').textContent=s.chaptersData[i].text;
    const cont=$('#choices'); cont.innerHTML=''; s.chaptersData[i].choices.forEach(c=>{const btn=document.createElement('button');btn.className='btn secondary';btn.textContent=c.label;btn.onclick=()=>{i=Math.min(s.chaptersData.length-1,i+1);draw()};cont.appendChild(btn)})}
  draw(); openModal(reader)
}
$('#rClose').onclick=()=>closeModal(reader);

$('#newStory').onclick=()=>{openModal(modal);$('#mTitle').focus()};
$('#mClose').onclick=()=>closeModal(modal);
$('#mCreate').onclick=async()=>{
  const s={id:crypto.randomUUID(),title:$('#mTitle').value.trim()||'Sem título',genre:$('#mGenre').value,cores:$('#mCores').value.trim(),
    chapters:Math.max(1,Math.min(10,parseInt($('#mCaps').value||'10',10))),pov:$('#mPOV').value==='Sim',pitch:$('#mPitch').value.trim(),
    generating:true,error:null,createdAt:Date.now()};
  STORIES.unshift(s); await idb.put(s); render(); closeModal(modal); await generate(s); render()
};

function offline(s){const data=[];for(let i=0;i<s.chapters;i++){const p=s.pov?'Eu':'Ele/ela';const txt=`${p} avanço no capítulo ${i+1}. ${s.pitch||'Os eventos tomam forma.'} Núcleos: ${s.cores||'gerais'}. Consequências diretas aproximam a próxima decisão.`; data.push({text:txt,choices:[{label:'Opção A'},{label:'Opção B'},{label:'Opção C'}]})} return data}
async function generate(s){try{const data=offline(s); s.chaptersData=data; s.generating=false; s.error=null; await idb.put(s)}catch(e){s.error='Falha ao gerar (offline)'; s.generating=false; await idb.put(s)}}

(async()=>{await idb.open(); STORIES=await idb.list(); render(); $('#btnTutorial').onclick=()=>alert('Defina título, gênero, núcleos e enredo breve. Esta build usa gerador offline por segurança.');})();
})();