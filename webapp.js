
// HistorIA v1.8.3 — Gemini/HF, metas de tamanho e capítulos exatos, TTS destacado
const $=id=>document.getElementById(id);
const scrMenu=$('screenMenu'),scrCreate=$('screenCreator'),scrRead=$('screenReader');
const btnCreate=$('btnCreate'),btnHome=$('btnHome'),btnSettings=$('btnSettings');
const list=$('listStories'),genStatus=$('genStatus');
const f_title=$('f_title'),f_genre=$('f_genre'),f_nucleos=$('f_nucleos'),f_caps=$('f_capitulos'),f_brief=$('f_brief'),f_nuclei=$('f_nuclei');
const capitulo=$('capitulo'),titulo=$('titulo'),narrativa=$('narrativa'),btnA=$('btnA'),btnB=$('btnB'),btnNext=$('btnNext'),btnBack=$('btnBack');
const selVoice=$('selVoice'),rateDown=$('rateDown'),rateUp=$('rateUp'),rateVal=$('rateVal'),volDown=$('volDown'),volUp=$('volUp'),volVal=$('volVal'),muteBtn=$('muteBtn'),btnSpeak=$('btnSpeak'),btnStop=$('btnStop'),speechStatus=$('speechStatus');
const settings=$('settings'),provSel=$('provSel'),hfToken=$('hfToken'),hfModel=$('hfModel'),geminiKey=$('geminiKey'),geminiModel=$('geminiModel');

let Settings=JSON.parse(localStorage.getItem('HIA_settings')||'{}');
Settings=Object.assign({provider:'gemini',hfToken:'',hfModel:'mistralai/Mixtral-8x7B-Instruct-v0.1',geminiKey:'',geminiModel:'gemini-1.5-pro',rate:1.0,vol:0.9,gender:'auto',muted:false},Settings);
function saveSettings(){localStorage.setItem('HIA_settings',JSON.stringify(Settings));}
function show(which){[scrMenu,scrCreate,scrRead].forEach(s=>s.classList.add('hidden')); if(which==='menu'){scrMenu.classList.remove('hidden');btnHome.classList.add('hidden');} if(which==='create'){scrCreate.classList.remove('hidden');btnHome.classList.remove('hidden');} if(which==='read'){scrRead.classList.remove('hidden');btnHome.classList.remove('hidden');}}
function getAll(){try{return JSON.parse(localStorage.getItem('HIA_stories')||'[]')}catch(e){return []}}
function setAll(a){localStorage.setItem('HIA_stories',JSON.stringify(a))}
function renderMenu(){const arr=getAll(); if(!arr.length){list.innerHTML='<div class=mini>Nenhum roteiro. Clique em <b>Criar novo roteiro</b>.</div>';return;}
 list.innerHTML=arr.map(s=>`<div class=item data-id="${s.id}"><div class=title>${s.title}</div><div class=mini>${s.genre} • ${s.chapters.length} caps • ${s.nucleos} núcleos</div><div class=row-actions><button class=btn data-act=open>▶️ Abrir</button><button class=btn data-act=edit>✏️ Editar</button><button class=btn data-act=del>🗑️ Excluir</button></div></div>`).join('');
 list.querySelectorAll('.item').forEach(el=>{const id=el.dataset.id; el.querySelector('[data-act=open]').onclick=()=>openStory(id); el.querySelector('[data-act=edit]').onclick=()=>editStory(id); el.querySelector('[data-act=del]').onclick=()=>{if(confirm('Excluir roteiro?')){setAll(getAll().filter(x=>x.id!==id)); renderMenu();}};});}

btnCreate.onclick=()=>{currentEdit=null; clearCreator(); show('create');};
btnHome.onclick=()=>show('menu'); $('btnCancel').onclick=()=>show('menu');
btnSettings.onclick=()=>{provSel.value=Settings.provider; hfToken.value=Settings.hfToken; hfModel.value=Settings.hfModel; geminiKey.value=Settings.geminiKey; geminiModel.value=Settings.geminiModel; toggleProv(); settings.classList.add('on');};
$('s_cancel').onclick=()=>settings.classList.remove('on');
$('s_ok').onclick=()=>{Settings.provider=provSel.value; Settings.hfToken=hfToken.value.trim(); Settings.hfModel=(hfModel.value||'mistralai/Mixtral-8x7B-Instruct-v0.1').trim(); Settings.geminiKey=geminiKey.value.trim(); Settings.geminiModel=(geminiModel.value||'gemini-1.5-pro').trim(); saveSettings(); settings.classList.remove('on');};
function toggleProv(){const g=provSel.value==='gemini'; document.getElementById('row_gemini').style.display=g?'flex':'none'; document.getElementById('row_gemini_model').style.display=g?'flex':'none'; document.getElementById('row_hf').style.display=g?'none':'flex'; document.getElementById('row_hf_model').style.display=g?'none':'flex';}
provSel.onchange=toggleProv;
function clearCreator(){f_title.value=''; f_brief.value=''; f_nuclei.value=''; f_genre.value='drama'; f_nucleos.value=6; f_caps.value=10;}

// ---- IA helpers ----
function antiRepeat(text){if(!text)return'';const s=text.replace(/\s+/g,' ').trim();const parts=s.split(/(?<=[\.!?…])\s+/);const out=[];const seen=new Map();for(const p of parts){const k=p.toLowerCase();seen.set(k,(seen.get(k)||0)+1);if(seen.get(k)<=1)out.push(p);}return out.join(' ');}
function composePrompt(title,genre,nuclei,brief,capitulos){
  return `Gere APENAS JSON válido em pt-BR (sem markdown), no schema:
{ "tituloTemporada": string,
  "capitulos": [
    { "titulo": string,
      "parte1": string,                // ~1000 palavras (antes da decisão 50%)
      "decisao1": { "A": {"label": string, "texto": string}, "B": {"label": string, "texto": string} },
      "parte2": string,                // ~700-800 palavras (até 90%)
      "decisao2": { "A": {"label": string, "texto": string}, "B": {"label": string, "texto": string} },
      "conclusao": string              // ~150-250 palavras
    }
  ]
}
Regras: narrativa contínua com ações/diálogos naturais, nomes próprios; sem listas; sem frases genéricas.
Respeite exatamente ${capitulos} capítulos.
Contexto: genero=${genre}; nucleos=${nuclei}; enredo-breve=${brief}; titulo=${title}.`;
}
async function callHF(prompt){
  const token=Settings.hfToken; if(!token) throw new Error('Sem token HF');
  const model=Settings.hfModel||'mistralai/Mixtral-8x7B-Instruct-v0.1';
  const res=await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`,{
    method:'POST',
    headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({inputs:prompt,parameters:{max_new_tokens:5000,temperature:0.8,top_p:0.9,return_full_text:false},options:{wait_for_model:true}})
  });
  if(!res.ok) throw new Error('HF '+res.status);
  const data=await res.json();
  return Array.isArray(data)?(data[0]?.generated_text||JSON.stringify(data)):JSON.stringify(data);
}
async function callGemini(prompt){
  const key=Settings.geminiKey; if(!key) throw new Error('Sem Gemini API Key');
  const model=Settings.geminiModel||'gemini-1.5-pro';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body={contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.85,topP:0.9,maxOutputTokens:16384}};
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok) throw new Error('Gemini '+res.status);
  const data=await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
  return text;
}
function robustParseJSON(s){try{return JSON.parse(s)}catch(e){const i=s.indexOf('{'),j=s.lastIndexOf('}'); if(i>=0&&j>i){try{return JSON.parse(s.slice(i,j+1))}catch(e2){}} return null}}
const wc=t=>t? t.trim().split(/\s+/).length : 0;

async function expandSection(context,title,chapterIndex,sectionName,text,targetWords){
  const prov=Settings.provider; const want=targetWords;
  const prompt = `Amplie o trecho mantendo coerência e estilo. Alvo ~${want} palavras. Retorne apenas TEXTO, sem JSON/Markdown.
Projeto: ${context}
Temporada: ${title} | Capítulo ${chapterIndex+1} | Seção: ${sectionName}
TEXTO-BASE:
${text}`;
  const raw = (prov==='gemini') ? await callGemini(prompt) : await callHF(prompt);
  return antiRepeat(raw);
}

async function generateMissingChapters(context,title,genre,nuclei,fromIndex,toN){
  const prov=Settings.provider;
  const prompt = `Continue a temporada gerando APENAS JSON com os capítulos de número ${fromIndex+1} até ${toN}, seguindo o schema:
[
  { "titulo": string,
    "parte1": string,
    "decisao1": { "A": {"label": string, "texto": string}, "B": {"label": string, "texto": string} },
    "parte2": string,
    "decisao2": { "A": {"label": string, "texto": string}, "B": {"label": string, "texto": string} },
    "conclusao": string
  }
]
Metas: parte1 ~1000 palavras; parte2 ~700-800; conclusão ~150-250. Evite frases genéricas.
Contexto: genero=${genre}; nucleos=${nuclei}; enredo-breve=${context}; titulo=${title}.`;
  const raw = (prov==='gemini') ? await callGemini(prompt) : await callHF(prompt);
  let arr=null;
  try{arr=JSON.parse(raw);}catch(e){
    const i=raw.indexOf('['),j=raw.lastIndexOf(']');
    if(i>=0&&j>i){try{arr=JSON.parse(raw.slice(i,j+1));}catch(e2){}}
  }
  if(!Array.isArray(arr)) return [];
  return arr.map((ch,ix)=>({
    titulo: ch.titulo||`Capítulo ${fromIndex+1+ix}`,
    parte1: antiRepeat(ch.parte1||''),
    decisao1: {A:{label:ch.decisao1?.A?.label||'A',texto:antiRepeat(ch.decisao1?.A?.texto||'')},B:{label:ch.decisao1?.B?.label||'B',texto:antiRepeat(ch.decisao1?.B?.texto||'')}},
    parte2: antiRepeat(ch.parte2||''),
    decisao2: {A:{label:ch.decisao2?.A?.label||'A',texto:antiRepeat(ch.decisao2?.A?.texto||'')},B:{label:ch.decisao2?.B?.label||'B',texto:antiRepeat(ch.decisao2?.B?.texto||'')}},
    conclusao: antiRepeat(ch.conclusao||'')
  }));
}

// ---- geração principal ----
let currentEdit=null;
$('btnGenerate').onclick=async()=>{
  const title=f_title.value.trim()||'Roteiro';
  const genre=f_genre.value;
  const nucleosCount=Math.min(6,Math.max(1,parseInt(f_nucleos.value)||4));
  const capitulos=Math.min(10,Math.max(3,parseInt(f_caps.value)||8));
  const brief=f_brief.value.trim();
  const nuclei=f_nuclei.value.trim();
  if(!brief||!nuclei){genStatus.textContent='Preencha Enredo e Núcleos.';return;}
  genStatus.textContent='Gerando com IA...';

  let parsed=null;
  try{
    const prompt=composePrompt(title,genre,nuclei,brief,capitulos);
    const raw=(Settings.provider==='gemini')?await callGemini(prompt):await callHF(prompt);
    parsed=robustParseJSON(raw);
  }catch(e){console.warn('IA erro',e);}

  let caps = (parsed?.capitulos||[]).slice(0,capitulos);

  if(caps.length<capitulos){
    genStatus.textContent=`Gerando capítulos restantes (${caps.length}/${capitulos})...`;
    const more=await generateMissingChapters(brief,title,genre,nuclei,caps.length,capitulos);
    caps = caps.concat(more).slice(0,capitulos);
  }
  while(caps.length<capitulos){
    caps.push({
      titulo:`Capítulo ${caps.length+1}`,
      parte1:`Início do capítulo ligado a: ${brief}. Estabeleça conflito, objetivos e primeiras ações.`,
      decisao1:{A:{label:'Pressionar aliados',texto:'Seguir por via arriscada cobrando lealdade.'},B:{label:'Adiar decisão',texto:'Ganhar tempo aumenta tensões.'}},
      parte2:`Complicações e viradas expandem o conflito principal com consequências visíveis.`,
      decisao2:{A:{label:'Confrontar',texto:'Expor a verdade e arcar com custo imediato.'},B:{label:'Proteger',texto:'Preservar alguém importante assumindo outro risco.'}},
      conclusao:`Fecho com consequência direta para o próximo capítulo.`
    });
  }

  // enforce metas mínimas (expandir se muito curto)
  for(let i=0;i<caps.length;i++){
    genStatus.textContent=`Ajustando comprimentos (cap ${i+1}/${capitulos})...`;
    const ch=caps[i];
    const t1=wc(ch.parte1), t2=wc(ch.parte2), t3=wc(ch.conclusao);
    const m1=900, m2=650, m3=150;
    if(t1<0.7*m1){ ch.parte1 = await expandSection(brief,title,i,'parte1',ch.parte1,m1); }
    if(t2<0.7*m2){ ch.parte2 = await expandSection(brief,title,i,'parte2',ch.parte2,m2); }
    if(t3<0.5*m3){ ch.conclusao = await expandSection(brief,title,i,'conclusao',ch.conclusao,m3); }
  }

  const seasonTitle = parsed?.tituloTemporada || title;
  const story={
    id: currentEdit||Math.random().toString(36).slice(2),
    title: seasonTitle, genre, nucleos:nucleosCount, metaBrief:brief, metaNuclei:nuclei,
    chapters: caps.map(ch=>({
      title: ch.titulo||'Capítulo',
      intro1: antiRepeat(ch.parte1||''),
      mid: {A:{label:ch.decisao1?.A?.label||'A',text:antiRepeat(ch.decisao1?.A?.texto||'')},B:{label:ch.decisao1?.B?.label||'B',text:antiRepeat(ch.decisao1?.B?.texto||'')}},
      part2: antiRepeat(ch.parte2||''),
      end: {A:{label:ch.decisao2?.A?.label||'A',text:antiRepeat(ch.decisao2?.A?.texto||'')},B:{label:ch.decisao2?.B?.label||'B',text:antiRepeat(ch.decisao2?.B?.texto||'')}},
      outro: antiRepeat(ch.conclusao||'')
    }))
  };

  const arr=getAll(); const i=arr.findIndex(x=>x.id===story.id); if(i>=0)arr[i]=story; else arr.push(story); setAll(arr);
  genStatus.textContent='Roteiro criado! Abrindo...';
  openStory(story.id);
};

function editStory(id){
  const arr=getAll(); const st=arr.find(x=>x.id===id); if(!st) return;
  currentEdit=st.id;
  f_title.value=st.title; f_genre.value=st.genre; f_nucleos.value=st.nucleos; f_capitulos.value=st.chapters.length;
  f_brief.value=st.metaBrief||''; f_nuclei.value=st.metaNuclei||'';
  show('create');
}

// ---- Leitor ----
let current=null,idx=0,step=0,path=[];
function openStory(id){const st=getAll().find(s=>s.id===id); if(!st){alert('Roteiro não encontrado'); return;} current=st; idx=0; step=0; path=[]; show('read'); render();}
function setText(t){const clean=(t||'').replace(/\n{3,}/g,'\n\n'); const sents=clean.split(/(?<=[\.\!\?…])\s+/); narrativa.innerHTML=sents.map((s,i)=>`<span class='sent' data-i='${i}'>${s}</span>`).join(' ');}
function render(){
  const ch=current.chapters[idx];
  capitulo.textContent='Capítulo '+(idx+1);
  titulo.textContent=ch.title;
  if(step===0){ setText(ch.intro1); btnA.classList.add('hidden'); btnB.classList.add('hidden'); btnNext.textContent='Avançar ⟶'; }
  else if(step===1){ setText('Decisão (50%)'); btnA.classList.remove('hidden'); btnB.classList.remove('hidden'); btnA.textContent='A) '+(ch.mid?.A?.label||'A'); btnB.textContent='B) '+(ch.mid?.B?.label||'B'); btnNext.textContent='Escolha A ou B'; }
  else if(step===2){ setText(ch.part2); btnA.classList.add('hidden'); btnB.classList.add('hidden'); btnNext.textContent='Avançar ⟶'; }
  else if(step===3){ setText('Decisão (90%)'); btnA.classList.remove('hidden'); btnB.classList.remove('hidden'); btnA.textContent='A) '+(ch.end?.A?.label||'A'); btnB.textContent='B) '+(ch.end?.B?.label||'B'); btnNext.textContent='Escolha A ou B'; }
  else if(step===4){ setText(ch.outro); btnA.classList.add('hidden'); btnB.classList.add('hidden'); btnNext.textContent=(idx<current.chapters.length-1)?'Próximo capítulo ⟶':'Finalizar'; }
  $('log').innerHTML='<span class="badge">Resumo</span> '+(path.length?path.join('<br>'):'Seu caminho aparecerá aqui.');
}
btnNext.onclick=()=>{if(step===0) step=1; else if(step===2) step=3; else if(step===4){ if(idx<current.chapters.length-1){idx++; step=0;} else {show('menu'); renderMenu(); return;} } render();};
btnBack.onclick=()=>{ if(step>0){step--; render(); return;} if(idx>0){idx--; step=4; render(); return;} show('menu'); renderMenu();};
btnA.onclick=()=>{const ch=current.chapters[idx]; if(step===1){ setText(ch.mid?.A?.text||''); path.push(`Cap ${idx+1} — 50%: ${ch.mid?.A?.label||'A'}`); step=2; } else if(step===3){ setText(ch.end?.A?.text||''); path.push(`Cap ${idx+1} — 90%: ${ch.end?.A?.label||'A'}`); step=4; } render();};
btnB.onclick=()=>{const ch=current.chapters[idx]; if(step===1){ setText(ch.mid?.B?.text||''); path.push(`Cap ${idx+1} — 50%: ${ch.mid?.B?.label||'B'}`); step=2; } else if(step===3){ setText(ch.end?.B?.text||''); path.push(`Cap ${idx+1} — 90%: ${ch.end?.B?.label||'B'}`); step=4; } render();};

// ---- TTS com destaque e retomada ----
let sentences=[],cur=0,cancelled=false;
function recollect(){sentences=[...document.querySelectorAll('#narrativa .sent')].map(el=>el.textContent.trim()).filter(Boolean);}
function clearHL(){document.querySelectorAll('#narrativa .sent.speaking').forEach(el=>el.classList.remove('speaking'));}
function hl(i){clearHL();const el=document.querySelector(`#narrativa .sent[data-i='${i}']`); if(el){el.classList.add('speaking'); el.scrollIntoView({block:'nearest'});}}
function speakFrom(i=0){
  if(!('speechSynthesis'in window)) return;
  recollect(); cur=Math.max(0,Math.min(i,sentences.length-1)); cancelled=false;
  const voices=speechSynthesis.getVoices();
  const pt=voices.filter(v=>/^pt/i.test(v.lang));
  const fem=/female|zira|heloisa|maria|camila|ana|sofia/i, masc=/male|daniel|ricardo|joao|thiago|pedro/i;
  let voice=pt[0]||voices[0]||null;
  const pref=selVoice.value||Settings.gender||'auto';
  if(pref==='fem') voice=pt.find(v=>fem.test(v.name))||voice;
  if(pref==='masc') voice=pt.find(v=>masc.test(v.name))||voice;
  const baseRate=Settings.rate||1.0, baseVol=Settings.vol||0.9, muted=Settings.muted||false;
  function stepSpeak(){
    if(cancelled || cur>=sentences.length){speechStatus.textContent='Pronto'; return;}
    const u=new SpeechSynthesisUtterance(sentences[cur]);
    if(voice) u.voice=voice;
    u.rate=baseRate; u.volume=muted?0:baseVol;
    u.onstart=()=>{speechStatus.textContent=`Lendo (${cur+1}/${sentences.length})`; hl(cur);};
    u.onend=()=>{cur++; stepSpeak();};
    speechSynthesis.speak(u);
  }
  speechSynthesis.cancel(); stepSpeak();
}
btnSpeak.onclick=()=>{
  const sel=window.getSelection(); let i=0;
  if(sel && narrativa.contains(sel.anchorNode)){
    const span=(sel.anchorNode.nodeType===3?sel.anchorNode.parentElement:sel.anchorNode).closest('.sent');
    if(span) i=parseInt(span.getAttribute('data-i'))||0;
  }
  speakFrom(i);
};
btnStop.onclick=()=>{cancelled=true; speechSynthesis.cancel(); clearHL(); speechStatus.textContent='Pronto';};
rateDown.onclick=()=>{Settings.rate=Math.max(0.6,(Settings.rate||1.0)-0.05); rateVal.textContent=Settings.rate.toFixed(2)+'x'; saveSettings(); if(speechSynthesis.speaking){const i=cur; speechSynthesis.cancel(); speakFrom(i);} };
rateUp.onclick=()=>{Settings.rate=Math.min(1.6,(Settings.rate||1.0)+0.05); rateVal.textContent=Settings.rate.toFixed(2)+'x'; saveSettings(); if(speechSynthesis.speaking){const i=cur; speechSynthesis.cancel(); speakFrom(i);} };
volDown.onclick=()=>{Settings.vol=Math.max(0,(Settings.vol||0.9)-0.05); volVal.textContent=Math.round(Settings.vol*100)+'%'; saveSettings(); if(speechSynthesis.speaking){const i=cur; speechSynthesis.cancel(); speakFrom(i);} };
volUp.onclick=()=>{Settings.vol=Math.min(1,(Settings.vol||0.9)+0.05); volVal.textContent=Math.round(Settings.vol*100)+'%'; saveSettings(); if(speechSynthesis.speaking){const i=cur; speechSynthesis.cancel(); speakFrom(i);} };
muteBtn.onclick=()=>{Settings.muted=!Settings.muted; saveSettings(); if(speechSynthesis.speaking){const i=cur; speechSynthesis.cancel(); speakFrom(i);} };

renderMenu(); show('menu');
