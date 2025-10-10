
const LS_KEY='historiaIA.projects.v2';
const PROV_KEY='historiaIA.provider';
const DEFAULT_PROVIDER={key:'AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM',model:'gemini-1.5-pro'};
let provider={...DEFAULT_PROVIDER,...(JSON.parse(localStorage.getItem(PROV_KEY)||'{}'))};
document.getElementById('k').value=provider.key||'';
document.getElementById('m').value=provider.model||'gemini-1.5-pro';

let projects=JSON.parse(localStorage.getItem(LS_KEY)||'[]');

const btnTutorial=document.getElementById('btnTutorial');
const btnProvider=document.getElementById('btnProvider');
const dlgTut=document.getElementById('dlgTut');
const dlgProv=document.getElementById('dlgProvider');
document.getElementById('saveProv').onclick=()=>{provider.key=document.getElementById('k').value.trim();
 provider.model=document.getElementById('m').value.trim()||'gemini-1.5-pro';localStorage.setItem(PROV_KEY,JSON.stringify(provider));dlgProv.close();render();};
btnTutorial.onclick=()=>dlgTut.showModal(); btnProvider.onclick=()=>dlgProv.showModal();

const voiceSel=document.getElementById('voiceSel'); const speakBtn=document.getElementById('speakBtn'); const stopBtn=document.getElementById('stopBtn');
let utter,currentText=''; function loadVoices(){const vs=speechSynthesis.getVoices();voiceSel.innerHTML=vs.map(v=>`<option>${v.name}</option>`).join('');}
speechSynthesis.onvoiceschanged=loadVoices; loadVoices();
speakBtn.onclick=()=>{if(!currentText)return; if(utter)speechSynthesis.cancel(); utter=new SpeechSynthesisUtterance(currentText);
 const v=speechSynthesis.getVoices().find(x=>x.name===voiceSel.value); if(v) utter.voice=v; speechSynthesis.speak(utter);};
stopBtn.onclick=()=>speechSynthesis.cancel();

const listEl=document.getElementById('list'); const dlgNew=document.getElementById('dlgNew');
document.getElementById('newBtn').onclick=()=>dlgNew.showModal();
document.getElementById('createBtn').onclick=()=>{
 const title=document.getElementById('fTitle').value.trim()||'Sem título';
 const genre=document.getElementById('fGenre').value;
 const caps=Math.max(1,Math.min(10,+document.getElementById('fCaps').value||10));
 const first=document.getElementById('fFirst').checked;
 const cores=document.getElementById('fCores').value.trim();
 const pitch=document.getElementById('fPitch').value.trim();
 const item={id:Date.now(),title,genre,caps,first,cores,pitch,status:'Gerando capítulo 1…',chapters:[]};
 projects.unshift(item); persist(); dlgNew.close(); render(); generateChapter(item.id,1);
};
function persist(){localStorage.setItem(LS_KEY,JSON.stringify(projects));}
function render(){
 listEl.innerHTML=projects.map(p=>`
  <div class="card"><div class="row" style="justify-content:space-between;align-items:center">
   <div><h3>${p.title} — <span class="hint">${p.genre} • ${p.caps} caps</span></h3>
     <div class="hint">Núcleos: ${p.cores||'—'}</div>
     <div class="status ${p.status?.includes('offline')?'err':(p.status?.includes('Gerando')?'warn':'ok')}">${p.status||'Pronto'}</div>
   </div>
   <div class="row"><button class="btn" onclick="openProject(${p.id})">Abrir</button>
     <button class="btn ghost" style="margin-left:8px" onclick="delProject(${p.id})">Excluir</button></div>
  </div></div>`).join('')||`<div class="hint">Nenhum roteiro ainda. Clique em “Criar novo roteiro”.</div>`;
}
window.openProject=(id)=>{alert('Leitura/continuação será aberta aqui (placeholder de UI).');};
window.delProject=(id)=>{projects=projects.filter(p=>p.id!==id); persist(); render();};

async function generateChapter(projectId,chapNum){
 const p=projects.find(x=>x.id===projectId); if(!p) return;
 p.status=`Gerando capítulo ${chapNum}…`; persist(); render();
 const prompt=makePrompt(p,chapNum);
 try{
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.key)}`;
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}]})});
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data=await res.json();
  const text=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('\n');
  p.chapters[chapNum-1]=text; currentText=text; p.status=`Capítulo ${chapNum} gerado`; persist(); render();
  if(chapNum<p.caps){ setTimeout(()=>generateChapter(projectId,chapNum+1),1000);} else {p.status='Pronto'; persist(); render();}
 }catch(e){ p.status=`API offline/falhou: ${e.message}`; persist(); render(); }
}
function makePrompt(p,n){
 return `Você é roteirista. Gere o Capítulo ${n} de uma novela interativa em ${p.genre}.
- Enredo breve: ${p.pitch||'(autor não informou)'}
- Núcleos (todos devem aparecer ao longo da temporada): ${p.cores||'(autor não informou)'}
- Duração alvo: ~15 minutos de leitura (~1500-2000 palavras).
- Se primeira pessoa = ${p.first?'SIM':'NÃO'} ${p.first?'(o leitor é o protagonista e pode terminar precocemente se fizer escolhas fatais).':''}
- Estrutura do capítulo: introdução → desenvolvimento → Ponto de decisão 50% (ofereça 3 opções A/B/C) → continuação → Ponto de decisão 90% (3 opções A/B/C) → conclusão do capítulo coerente com as escolhas.
- Foque em acontecimentos e diálogos; evite clichês como “o ar estava denso”.
- Continue a partir do que já aconteceu nos capítulos anteriores (se houver) para manter coerência.
- Saída em texto puro; marque claramente “Decisão 1 (50%)” e “Decisão 2 (90%)” com as três opções cada.`;
}
render();
