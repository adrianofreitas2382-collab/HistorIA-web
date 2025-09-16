
const $=id=>document.getElementById(id);
const scrMenu=$('screenMenu'),scrCreate=$('screenCreator'),scrRead=$('screenReader');
const btnCreate=$('btnCreate'),btnHome=$('btnHome'),btnSettings=$('btnSettings');
const list=$('listStories'),genStatus=$('genStatus');
const f_title=$('f_title'),f_genre=$('f_genre'),f_nucleos=$('f_nucleos'),f_caps=$('f_capitulos'),f_brief=$('f_brief'),f_nuclei=$('f_nuclei');
const capitulo=$('capitulo'),titulo=$('titulo'),narrativa=$('narrativa'),btnA=$('btnA'),btnB=$('btnB'),btnNext=$('btnNext'),btnBack=$('btnBack');
const selVoice=$('selVoice'),rateDown=$('rateDown'),rateUp=$('rateUp'),rateVal=$('rateVal'),volDown=$('volDown'),volUp=$('volUp'),volVal=$('volVal'),muteBtn=$('muteBtn'),btnSpeak=$('btnSpeak'),btnStop=$('btnStop'),speechStatus=$('speechStatus');
const settings=$('settings'),hfToken=$('hfToken'),hfModel=$('hfModel');

let Settings=JSON.parse(localStorage.getItem('HIA_settings')||'{}');
Settings=Object.assign({hfToken:'',hfModel:'mistralai/Mixtral-8x7B-Instruct-v0.1',rate:1.0,vol:0.9,gender:'auto'},Settings);
function saveSettings(){localStorage.setItem('HIA_settings',JSON.stringify(Settings));}

function show(which){scrMenu.style.display='none';scrCreate.style.display='none';scrRead.style.display='none';
 if(which==='menu'){scrMenu.style.display='block';btnHome.style.display='none';}
 if(which==='create'){scrCreate.style.display='block';btnHome.style.display='inline-block';}
 if(which==='read'){scrRead.style.display='block';btnHome.style.display='inline-block';}}
function getAll(){try{return JSON.parse(localStorage.getItem('HIA_stories')||'[]')}catch(e){return []}}
function setAll(a){localStorage.setItem('HIA_stories',JSON.stringify(a))}
function renderMenu(){const arr=getAll(); if(!arr.length){list.innerHTML='<div style=\"color:#aab1bd;font-size:12px\">Nenhum roteiro. Clique em <b>Criar novo roteiro</b>.</div>';return;}
 list.innerHTML=arr.map(s=>`<div class=item data-id=\"${s.id}\"><div class=title>${s.title}</div><div class=mini>${s.genre} • ${s.chapters.length} caps • ${s.nucleos} núcleos</div><div class=row-actions><button class=btn data-act=open>▶️ Abrir</button><button class=btn data-act=edit>✏️ Editar</button><button class=btn data-act=del>🗑️ Excluir</button></div></div>`).join('');
 list.querySelectorAll('.item').forEach(el=>{const id=el.dataset.id; el.querySelector('[data-act=open]').onclick=()=>openStory(id); el.querySelector('[data-act=edit]').onclick=()=>editStory(id); el.querySelector('[data-act=del]').onclick=()=>{if(confirm('Excluir roteiro?')){setAll(getAll().filter(x=>x.id!==id)); renderMenu();}};});}

btnCreate.onclick=()=>{currentEdit=null; f_title.value=''; f_brief.value=''; f_nuclei.value=''; show('create');};
btnHome.onclick=()=>show('menu'); $('btnCancel').onclick=()=>show('menu');

btnSettings.onclick=()=>{hfToken.value=Settings.hfToken; hfModel.value=Settings.hfModel; settings.style.display='flex';};
$('s_cancel').onclick=()=>settings.style.display='none';
$('s_ok').onclick=()=>{Settings.hfToken=hfToken.value.trim(); Settings.hfModel=hfModel.value.trim()||'mistralai/Mixtral-8x7B-Instruct-v0.1'; saveSettings(); settings.style.display='none';};

function pad(t,words){t=(t||'').trim();const w=t.split(/\s+/).filter(Boolean);while(w.length<words){t+=' '+['Os sinais mudam sem alarde.','As escolhas acumulam custo.','O silêncio entre frases pesa.','O passo seguinte cobra preço.'][w.length%4];w.push('x');}return t;}
function fallbackSeason(title,genre,nucleosCount,capitulos,brief,nucleiCsv){
 const nucleos=nucleiCsv.split(',').map(s=>s.trim()).filter(Boolean).slice(0,Math.min(6,nucleosCount));
 const tgt=1200; const p1=Math.round(tgt*.5),p2=Math.round(tgt*.4),p3=tgt-p1-p2;
 function ch(i){return{title:`Capítulo ${i+1}`,intro1:pad(`${brief} Conflitos envolvendo ${nucleos.slice(0,3).join(', ')} tomam forma.`,p1),mid:{A:{label:'Arriscar',text:'Seguir uma pista difícil e romper protocolos.'},B:{label:'Conter',text:'Ganhar tempo e fortalecer alianças.'}},end:{A:{label:'Confrontar',text:'Enfrentar a verdade, custe o que custar.'},B:{label:'Proteger',text:'Preservar alguém importante, mesmo com perdas.'}},outro:pad(`Consequências atravessam ${nucleos.slice(2).join(', ')}.`,p3)}};
 return {title,genre,nucleos:nucleos.length,chapters:Array.from({length:capitulos},(_,i)=>ch(i))};}

async function callHF(prompt){const token=Settings.hfToken; if(!token) throw new Error('Sem token.'); const model=Settings.hfModel;
 const res=await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({inputs:prompt,parameters:{max_new_tokens:2048},options:{wait_for_model:true}})});
 if(!res.ok) throw new Error('HF '+res.status); const data=await res.json(); const txt=Array.isArray(data)?(data[0]?.generated_text||JSON.stringify(data)):JSON.stringify(data); return txt;}

function robustParseJSON(s){try{return JSON.parse(s)}catch(e){const i=s.indexOf('{'),j=s.lastIndexOf('}'); if(i>=0&&j>i){try{return JSON.parse(s.slice(i,j+1))}catch(e){}} return null}}

let currentEdit=null;
$('btnGenerate').onclick=async()=>{
 const title=f_title.value.trim()||'Roteiro'; const genre=f_genre.value; const nucleosCount=Math.min(6,Math.max(1,parseInt(f_nucleos.value)||4)); const capitulos=Math.min(10,Math.max(3,parseInt(f_caps.value)||8)); const brief=f_brief.value.trim(); const nuclei=f_nuclei.value.trim(); if(!brief||!nuclei){genStatus.textContent='Preencha Enredo e Núcleos.'; return;}
 genStatus.textContent='Gerando...';
 let season=null;
 if(Settings.hfToken){ try{ const prompt=`Crie uma temporada (JSON). Campos: {"tituloTemporada","capitulos":[{"titulo","parte1","decisao1":{"A":{"label","texto"},"B":{"label","texto"}},"parte2","decisao2":{"A":{"label","texto"},"B":{"label","texto"}},"conclusao"}]}. Enredo: ${brief}. Núcleos: ${nuclei}. Capítulos: ${capitulos}.`;
  const txt=await callHF(prompt); const parsed=robustParseJSON(txt); if(parsed){season={title:parsed.tituloTemporada||title,genre,nucleos:nuclei.split(',').length,chapters:(parsed.capitulos||[]).map(ch=>({title:ch.titulo||'Capítulo',intro1:ch.parte1||'',mid:{A:{label:ch.decisao1?.A?.label||'A',text:ch.decisao1?.A?.texto||''},B:{label:ch.decisao1?.B?.label||'B',text:ch.decisao1?.B?.texto||''}},end:{A:{label:ch.decisao2?.A?.label||'A',text:ch.decisao2?.A?.texto||''},B:{label:ch.decisao2?.B?.label||'B',text:ch.decisao2?.B?.texto||''}},outro:ch.conclusao||''}))}; }
 }catch(e){ console.warn(e); genStatus.textContent='HF indisponível, usando gerador local.'; } }
 if(!season){ season=fallbackSeason(title,genre,nucleosCount,capitulos,brief,nuclei); }
 const st={id:currentEdit||Math.random().toString(36).slice(2), title:season.title, genre:season.genre, nucleos:season.nucleos, chapters:season.chapters};
 const arr=getAll(); const i=arr.findIndex(x=>x.id===st.id); if(i>=0) arr[i]=st; else arr.push(st); setAll(arr);
 genStatus.textContent='Roteiro criado! Abrindo...'; openStory(st.id);
};

function editStory(id){const arr=getAll(); const st=arr.find(x=>x.id===id); if(!st) return; currentEdit=st.id; f_title.value=st.title; f_genre.value=st.genre; f_nucleos.value=st.nucleos; f_capitulos.value=st.chapters.length; f_brief.value=''; f_nuclei.value=''; show('create');}

let current=null,idx=0,step=0,log=[];
function openStory(id){const st=getAll().find(s=>s.id===id); if(!st){alert('Roteiro não encontrado'); return;} current=st; idx=0; step=0; log=[]; show('read'); render();}
function setText(t){const clean=(t||'').replace(/\\n{3,}/g,'\\n\\n'); const sents=clean.split(/(?<=[\\.!?])\\s+/); narrativa.innerHTML=sents.map((s,i)=>`<span class='sent' data-i='${i}'>${s}</span>`).join(' ');}
function render(){const ch=current.chapters[idx]; capitulo.textContent='Capítulo '+(idx+1); titulo.textContent=ch.title; if(step===0){ setText(ch.intro1); btnA.style.display='none'; btnB.style.display='none'; btnNext.textContent='Avançar ⟶'; } else if(step===1){ setText('Decisão (50%)'); btnA.style.display='block'; btnB.style.display='block'; btnA.textContent='A) '+(ch.mid?.A?.label||'A'); btnB.textContent='B) '+(ch.mid?.B?.label||'B'); btnNext.textContent='Escolha A ou B'; } else if(step===2){ setText(ch.mid?.chosen||''); btnA.style.display='none'; btnB.style.display='none'; btnNext.textContent='Avançar ⟶'; } else if(step===3){ setText('Decisão (90%)'); btnA.style.display='block'; btnB.style.display='block'; btnA.textContent='A) '+(ch.end?.A?.label||'A'); btnB.textContent='B) '+(ch.end?.B?.label||'B'); btnNext.textContent='Escolha A ou B'; } else { setText(ch.outro||''); btnA.style.display='none'; btnB.style.display='none'; btnNext.textContent= idx<current.chapters.length-1 ? 'Próximo capítulo ⟶' : 'Finalizar'; }}

btnNext.onclick=()=>{if(step===0) step=1; else if(step===2) step=3; else if(step===4){ if(idx<current.chapters.length-1){idx++; step=0;} else {show('menu'); renderMenu(); return;} } render();};
btnBack.onclick=()=>{ if(step>0){step--; render(); return;} if(idx>0){idx--; step=4; render(); return;} show('menu');};
btnA.onclick=()=>{const ch=current.chapters[idx]; if(step===1){ ch.mid.chosen=ch.mid.A.text; step=2; } else if(step===3){ ch.outro=ch.end.A.text; step=4; } render();};
btnB.onclick=()=>{const ch=current.chapters[idx]; if(step===1){ ch.mid.chosen=ch.mid.B.text; step=2; } else if(step===3){ ch.outro=ch.end.B.text; step=4; } render();};

// TTS com destaque
let sentences=[],cur=0,speaking=false,cancelled=false;
function recollect(){sentences=[...document.querySelectorAll('#narrativa .sent')].map(el=>el.textContent.trim()).filter(Boolean);}
function clearHL(){document.querySelectorAll('#narrativa .sent.speaking').forEach(el=>el.classList.remove('speaking'));}
function hl(i){clearHL();const el=document.querySelector(`#narrativa .sent[data-i='${i}']`); if(el){el.classList.add('speaking'); el.scrollIntoView({block:'nearest'});}}
function resetSpeak(){speechSynthesis.cancel(); speaking=false; cancelled=false; cur=0; recollect(); clearHL(); speechStatus.textContent='Pronto';}
function genderPick(voices,g){if(g==='auto') return voices[0]||null; const fem=/female|zira|heloisa|maria|camila/i; const masc=/male|daniel|ricardo|joao|thiago/i; return voices.find(v=> g==='fem'?fem.test(v.name):masc.test(v.name))||voices[0]||null;}
function speakFrom(i=0){if(!('speechSynthesis'in window)) return; recollect(); cur=Math.max(0,Math.min(i,sentences.length-1)); cancelled=false; speaking=true; speechStatus.textContent='Narrando...'; const voices=speechSynthesis.getVoices().filter(v=>/^pt/i.test(v.lang)); const voice=genderPick(voices,Settings.gender||'auto'); const rate=Settings.rate||1.0; const vol=Settings.vol||0.9; const muted=false;
 function step(){ if(cancelled||cur>=sentences.length){ speaking=false; speechStatus.textContent='Pronto'; clearHL(); return;} const u=new SpeechSynthesisUtterance(sentences[cur]); u.lang='pt-BR'; u.rate=rate; u.volume=muted?0:vol; if(voice) u.voice=voice; u.onend=()=>{cur++; step();}; hl(cur); speechSynthesis.speak(u);} step();}
btnSpeak.onclick=()=>{const sel=window.getSelection(); let i=0; if(sel && narrativa.contains(sel.anchorNode)){ const span=(sel.anchorNode.nodeType===3?sel.anchorNode.parentElement:sel.anchorNode).closest('.sent'); if(span) i=parseInt(span.getAttribute('data-i'))||0; } speakFrom(i);};
btnStop.onclick=()=>{cancelled=true; speechSynthesis.cancel(); speaking=false; clearHL(); speechStatus.textContent='Pronto';};
rateDown.onclick=()=>{Settings.rate=Math.max(0.6,(Settings.rate||1.0)-0.05); rateVal.textContent=Settings.rate.toFixed(2)+'x'; saveSettings(); if(speaking){const i=cur; cancelled=true; speechSynthesis.cancel(); speakFrom(i);} };
rateUp.onclick=()=>{Settings.rate=Math.min(1.6,(Settings.rate||1.0)+0.05); rateVal.textContent=Settings.rate.toFixed(2)+'x'; saveSettings(); if(speaking){const i=cur; cancelled=true; speechSynthesis.cancel(); speakFrom(i);} };
volDown.onclick=()=>{Settings.vol=Math.max(0,(Settings.vol||0.9)-0.05); volVal.textContent=Math.round(Settings.vol*100)+'%'; saveSettings(); if(speaking){const i=cur; cancelled=true; speechSynthesis.cancel(); speakFrom(i);} };
volUp.onclick=()=>{Settings.vol=Math.min(1,(Settings.vol||0.9)+0.05); volVal.textContent=Math.round(Settings.vol*100)+'%'; saveSettings(); if(speaking){const i=cur; cancelled=true; speechSynthesis.cancel(); speakFrom(i);} };
muteBtn.onclick=()=>{Settings.muted=!Settings.muted; saveSettings(); if(speaking){const i=cur; cancelled=true; speechSynthesis.cancel(); speakFrom(i);} };

renderMenu(); show('menu');
