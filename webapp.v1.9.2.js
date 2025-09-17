
// HistorIA v1.9.2 — completo
(function(){
  const $=(id)=>document.getElementById(id);
  const toast=(m)=>{const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200);};

  let scrMenu,scrCreate,scrRead,btnCreate,btnHome,btnSettings,list,genStatus,
      f_title,f_genre,f_nucleos,f_caps,f_brief,f_nuclei,
      capitulo,titulo,narrativa,btnA,btnB,btnNext,btnBack,
      selVoice,rateDown,rateUp,rateVal,volDown,volUp,volVal,muteBtn,btnSpeak,btnStop,speechStatus,
      licenseModal,licenseKey;

  const LS_SETTINGS='HIA_settings_v190', LS_STORIES='HIA_stories', LS_PROGRESS='HIA_progress';
  let Settings=JSON.parse(localStorage.getItem(LS_SETTINGS)||'{}');
  Settings=Object.assign({license:'',model:'gemini-1.5-pro',rate:1.0,vol:0.9,gender:'auto',muted:false},Settings);
  const saveSettings=()=>localStorage.setItem(LS_SETTINGS,JSON.stringify(Settings));
  const needLicense=()=>!Settings.license||!/^AIza/.test((Settings.license||'').trim());
  const openLicense=()=>{licenseKey.value=Settings.license||''; licenseModal.classList.add('on');};
  const closeLicense=()=>licenseModal.classList.remove('on');

  function collect(){
    scrMenu=$('screenMenu'); scrCreate=$('screenCreator'); scrRead=$('screenReader');
    btnCreate=$('btnCreate'); btnHome=$('btnHome'); btnSettings=$('btnSettings');
    list=$('listStories'); genStatus=$('genStatus');
    f_title=$('f_title'); f_genre=$('f_genre'); f_nucleos=$('f_nucleos'); f_caps=$('f_capitulos'); f_brief=$('f_brief'); f_nuclei=$('f_nuclei');
    capitulo=$('capitulo'); titulo=$('titulo'); narrativa=$('narrativa'); btnA=$('btnA'); btnB=$('btnB'); btnNext=$('btnNext'); btnBack=$('btnBack');
    selVoice=$('selVoice'); rateDown=$('rateDown'); rateUp=$('rateUp'); rateVal=$('rateVal'); volDown=$('volDown'); volUp=$('volUp'); volVal=$('volVal'); muteBtn=$('muteBtn'); btnSpeak=$('btnSpeak'); btnStop=$('btnStop'); speechStatus=$('speechStatus');
    licenseModal=$('license'); licenseKey=$('licenseKey');
  }
  function show(which){
    [scrMenu,scrCreate,scrRead].forEach(s=>s&&s.classList.add('hidden'));
    if(which==='menu'){scrMenu.classList.remove('hidden'); btnHome.classList.add('hidden');}
    if(which==='create'){scrCreate.classList.remove('hidden'); btnHome.classList.remove('hidden');}
    if(which==='read'){scrRead.classList.remove('hidden'); btnHome.classList.remove('hidden');}
  }
  function bind(){
    btnSettings.onclick=openLicense;
    $('lic_cancel').onclick=closeLicense;
    $('lic_ok').onclick=()=>{Settings.license=licenseKey.value.trim(); saveSettings(); closeLicense();};
    btnCreate.onclick=()=>{currentEdit=null; clearCreator(); show('create');};
    $('btnCancel').onclick=()=>show('menu');
    btnHome.onclick=()=>show('menu');

    $('btnGenerate').onclick=onGenerate;

    btnNext.onclick=onNext;
    btnBack.onclick=onBack;
    btnA.onclick=()=>onChoice('A');
    btnB.onclick=()=>onChoice('B');

    btnSpeak.onclick=onSpeak;
    btnStop.onclick=onStop;
    rateDown.onclick=()=>{Settings.rate=Math.max(0.6,(Settings.rate||1.0)-0.05); rateVal.textContent=Settings.rate.toFixed(2)+'x'; saveSettings(); restartIfSpeaking();};
    rateUp.onclick=()=>{Settings.rate=Math.min(1.6,(Settings.rate||1.0)+0.05); rateVal.textContent=Settings.rate.toFixed(2)+'x'; saveSettings(); restartIfSpeaking();};
    volDown.onclick=()=>{Settings.vol=Math.max(0,(Settings.vol||0.9)-0.05); volVal.textContent=Math.round(Settings.vol*100)+'%'; saveSettings(); restartIfSpeaking();};
    volUp.onclick=()=>{Settings.vol=Math.min(1,(Settings.vol||0.9)+0.05); volVal.textContent=Math.round(Settings.vol*100)+'%'; saveSettings(); restartIfSpeaking();};
    muteBtn.onclick=()=>{Settings.muted=!Settings.muted; saveSettings(); restartIfSpeaking();};
  }
  setInterval(()=>{ if(!btnCreate || !btnCreate.onclick){ collect(); bind(); } }, 1500);

  const getAll=()=>{try{return JSON.parse(localStorage.getItem(LS_STORIES)||'[]')}catch{ return []}};
  const setAll=(a)=>localStorage.setItem(LS_STORIES,JSON.stringify(a));
  const getProgress=()=>{try{return JSON.parse(localStorage.getItem(LS_PROGRESS)||'{}')}catch{ return {}}};
  const setProgress=(p)=>localStorage.setItem(LS_PROGRESS,JSON.stringify(p));

  function renderMenu(){
    const arr=getAll();
    if(!arr.length){list.innerHTML='<div class=mini>Nenhum roteiro. Clique em <b>Criar novo roteiro</b>.</div>'; return;}
    const prog=getProgress();
    list.innerHTML=arr.map(s=>{
      const pr=prog[s.id]||{idx:0,step:0};
      const status = `Cap ${Math.min((pr.idx||0)+1, s.total||s.chapters.length)}/${s.total||s.chapters.length}`;
      return `<div class=item data-id="${s.id}">
        <div class=title>${s.title}</div>
        <div class=mini>${s.genre} • ${s.total||s.chapters.length} caps • ${s.nucleos} núcleos • Em progresso: ${status}</div>
        <div class=row-actions>
          <button class=btn data-act=open>▶️ Continuar</button>
          <button class=btn data-act=edit>✏️ Editar</button>
          <button class=btn data-act=del>🗑️ Excluir</button>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('.item').forEach(el=>{
      const id=el.dataset.id;
      el.querySelector('[data-act=open]').addEventListener('click',()=>openStory(id));
      el.querySelector('[data-act=edit]').addEventListener('click',()=>editStory(id));
      el.querySelector('[data-act=del]').addEventListener('click',()=>{if(confirm('Excluir roteiro?')){setAll(getAll().filter(x=>x.id!==id)); const p=getProgress(); delete p[id]; setProgress(p); renderMenu();}});
    });
  }
  function clearCreator(){ f_title.value=''; f_brief.value=''; f_nuclei.value=''; f_genre.value='drama'; f_nucleos.value=6; f_caps.value=10; }

  function antiRepeat(text){ if(!text) return ''; const s=text.replace(/\s+/g,' ').trim(); const parts=s.split(/(?<=[\.!?…])\s+/); const out=[]; const seen=new Map(); for(const p of parts){const k=p.toLowerCase(); seen.set(k,(seen.get(k)||0)+1); if(seen.get(k)<=1) out.push(p);} return out.join(' '); }
  const wc=t=>t? t.trim().split(/\s+/).length : 0;
  async function callGemini(prompt){
    if(needLicense()) throw new Error('Sem licença');
    const key=Settings.license.trim();
    const model=Settings.model;
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const body={contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.85,topP:0.9,maxOutputTokens:16384}};
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!res.ok) throw new Error('Licença inválida ou limite atingido');
    const data=await res.json();
    const text=data.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||'';
    return text;
  }
  function robustParseJSON(s){try{return JSON.parse(s)}catch(e){const i=s.indexOf('{'),j=s.lastIndexOf('}'); if(i>=0&&j>i){try{return JSON.parse(s.slice(i,j+1))}catch{}} return null}}
  function composeChapterPrompt(meta,chapterNumber,prevSynopsis){
    return `Gere APENAS JSON válido em pt-BR (sem markdown), no schema:
{ "titulo": string,
  "parte1": string, "decisao1": { "A": {"label": string, "texto": string}, "B": {"label": string, "texto": string} },
  "parte2": string, "decisao2": { "A": {"label": string, "texto": string}, "B": {"label": string, "texto": string} },
  "conclusao": string
}
Regras: narrativa contínua, cenas com ações e diálogos, nomes próprios; sem listas; sem frases genéricas.
Temporada: ${meta.title} | Gênero: ${meta.genre} | Núcleos: ${meta.nuclei}
Enredo-breve: ${meta.brief}
Capítulo: ${chapterNumber} de ${meta.total}
Resumo capítulos anteriores: ${prevSynopsis || 'N/A'}`;
  }
  async function expandSection(context,title,chapterIndex,sectionName,text,targetWords){
    const prompt=`Amplie o trecho mantendo coerência e estilo, evitando repetições. Alvo ~${targetWords} palavras. Retorne só TEXTO.
Projeto: ${title} | Capítulo ${chapterIndex+1} | Seção: ${sectionName}
Contexto: ${context}
TEXTO-BASE:
${text}`;
    const raw=await callGemini(prompt);
    return antiRepeat(raw);
  }
  function quickSynopsis(ch){const take=(t,n)=>(t||'').split(/(?<=[\.!?…])\s+/).slice(0,n).join(' ').slice(0,400); return `${take(ch.intro1,2)} ${take(ch.outro,2)}`.trim();}
  async function generateOneChapter(meta,indexZero,existing){
    const prevSynopsis=existing.slice(0,indexZero).map((c,i)=>`Cap ${i+1}: ${quickSynopsis(c)}`).join(' | ');
    const raw=await callGemini(composeChapterPrompt(meta,indexZero+1,prevSynopsis));
    const obj=robustParseJSON(raw)||{};
    let p1=obj.parte1||'', p2=obj.parte2||'', pc=obj.conclusao||'';
    if(wc(p1)<600) p1=await expandSection(meta.brief,meta.title,indexZero,'parte1',p1,900);
    if(wc(p2)<450) p2=await expandSection(meta.brief,meta.title,indexZero,'parte2',p2,650);
    if(wc(pc)<80) pc=await expandSection(meta.brief,meta.title,indexZero,'conclusao',pc,160);
    return { title:obj.titulo||`Capítulo ${indexZero+1}`,
      intro1:antiRepeat(p1),
      mid:{A:{label:obj.decisao1?.A?.label||'A',text:antiRepeat(obj.decisao1?.A?.texto||'')},B:{label:obj.decisao1?.B?.label||'B',text:antiRepeat(obj.decisao1?.B?.texto||'')}},
      part2:antiRepeat(p2),
      end:{A:{label:obj.decisao2?.A?.label||'A',text:antiRepeat(obj.decisao2?.A?.texto||'')},B:{label:obj.decisao2?.B?.label||'B',text:antiRepeat(obj.decisao2?.B?.texto||'')}},
      outro:antiRepeat(pc)};
  }

  let currentEdit=null, backgroundBusy=false;
  async function onGenerate(){
    if(needLicense()){openLicense(); genStatus.textContent='Informe a licença para gerar.'; return;}
    const title=(f_title.value||'Roteiro').trim();
    const genre=f_genre.value;
    const nucleosCount=Math.min(6,Math.max(1,parseInt(f_nucleos.value)||4));
    const total=Math.min(10,Math.max(3,parseInt(f_caps.value)||8));
    const brief=f_brief.value.trim();
    const nuclei=f_nuclei.value.trim();
    if(!brief||!nuclei){genStatus.textContent='Preencha Enredo e Núcleos.'; return;}
    genStatus.textContent='Gerando Capítulo 1...';
    const story={id:currentEdit||Math.random().toString(36).slice(2),title,genre,nucleos:nucleosCount,total,metaBrief:brief,metaNuclei:nuclei,chapters:[]};
    const meta={title,genre,brief,nuclei,total};
    try{
      const ch0=await generateOneChapter(meta,0,[]);
      story.chapters[0]=ch0;
      const arr=getAll(); const i=arr.findIndex(x=>x.id===story.id); if(i>=0)arr[i]=story; else arr.push(story); setAll(arr);
      const prog=getProgress(); prog[story.id]={idx:0,step:0}; setProgress(prog);
      genStatus.textContent='Capítulo 1 pronto!';
      openStory(story.id);
    }catch(e){ genStatus.textContent='Falha ao gerar. Verifique a licença.'; }
  }
  function editStory(id){
    const arr=getAll(); const st=arr.find(x=>x.id===id); if(!st) return;
    currentEdit=st.id;
    f_title.value=st.title; f_genre.value=st.genre; f_nucleos.value=st.nucleos; f_capitulos.value=st.total; f_brief.value=st.metaBrief||''; f_nuclei.value=st.metaNuclei||'';
    show('create');
  }

  let current=null,idx=0,step=0,path=[];
  function saveProg(){const p=getProgress(); p[current.id]={idx,step}; setProgress(p); renderMenu();}
  function openStory(id){
    const st=getAll().find(s=>s.id===id); if(!st){alert('Roteiro não encontrado'); return;}
    current=st; const p=getProgress()[id]; idx=p?.idx||0; step=p?.step||0; path=[]; show('read'); render();
  }
  function setText(t){const clean=(t||'').replace(/\n{3,}/g,'\n\n'); const sents=clean.split(/(?<=[\.\!\?…])\s+/); narrativa.innerHTML=sents.map((s,i)=>`<span class='sent' data-i='${i}'>${s}</span>`).join(' ');}
  const chapterReady=(i)=>!!current.chapters[i];
  function ensureNextInBackground(){
    if(backgroundBusy) return;
    const next=idx+1;
    if(next<current.total && !chapterReady(next)){
      backgroundBusy=true;
      const meta={title:current.title,genre:current.genre,brief:current.metaBrief,nuclei:current.metaNuclei,total:current.total};
      generateOneChapter(meta,next,current.chapters).then(ch=>{
        current.chapters[next]=ch; const arr=getAll(); const k=arr.findIndex(x=>x.id===current.id); if(k>=0){arr[k]=current; setAll(arr);}
      }).finally(()=>backgroundBusy=false);
    }
  }
  function render(){
    const ch=current.chapters[idx];
    capitulo.textContent='Capítulo '+(idx+1)+' de '+(current.total||current.chapters.length);
    titulo.textContent=ch? ch.title : 'Gerando...';
    if(!ch){ setText('Gerando este capítulo...'); btnA.classList.add('hidden'); btnB.classList.add('hidden'); btnNext.textContent='Aguarde'; return; }
    if(step===0){ setText(ch.intro1); btnA.classList.add('hidden'); btnB.classList.add('hidden'); btnNext.textContent='Avançar ⟶'; }
    else if(step===1){ setText('Decisão (50%)'); btnA.classList.remove('hidden'); btnB.classList.remove('hidden'); btnA.textContent='A) '+(ch.mid?.A?.label||'A'); btnB.textContent='B) '+(ch.mid?.B?.label||'B'); btnNext.textContent='Escolha A ou B'; }
    else if(step===2){ setText(ch.part2); btnA.classList.add('hidden'); btnB.classList.add('hidden'); btnNext.textContent='Avançar ⟶'; }
    else if(step===3){ setText('Decisão (90%)'); btnA.classList.remove('hidden'); btnB.classList.remove('hidden'); btnA.textContent='A) '+(ch.end?.A?.label||'A'); btnB.textContent='B) '+(ch.end?.B?.label||'B'); btnNext.textContent='Escolha A ou B'; }
    else if(step===4){ setText(ch.outro); btnA.classList.add('hidden'); btnB.classList.add('hidden'); btnNext.textContent=(idx<(current.total-1))?'Próximo capítulo ⟶':'Finalizar'; ensureNextInBackground(); }
    $('log').innerHTML='<span class="badge">Resumo</span> '+(path.length?path.join('<br>'):'Seu caminho aparecerá aqui.');
  }
  async function onNext(){
    if(!current.chapters[idx]){ render(); return; }
    if(step===0) step=1;
    else if(step===2) step=3;
    else if(step===4){
      if(idx<(current.total-1)){
        idx++; step=0;
        if(!chapterReady(idx)){
          setText('Gerando este capítulo...');
          const meta={title:current.title,genre:current.genre,brief:current.metaBrief,nuclei:current.metaNuclei,total:current.total};
          try{ const ch=await generateOneChapter(meta,idx,current.chapters); current.chapters[idx]=ch; const arr=getAll(); const k=arr.findIndex(x=>x.id===current.id); if(k>=0){arr[k]=current; setAll(arr);} }catch{ setText('Falha ao gerar. Verifique a licença.'); }
        }
      }else{ show('menu'); renderMenu(); return; }
    }
    saveProg(); render();
  }
  function onBack(){ if(step>0){step--; saveProg(); render(); return;} if(idx>0){idx--; step=4; saveProg(); render(); return;} show('menu'); renderMenu(); }
  function onChoice(which){
    const ch=current.chapters[idx];
    if(step===1){ setText(ch.mid?.[which]?.text||''); path.push(`Cap ${idx+1} — 50%: ${ch.mid?.[which]?.label||which}`); step=2; }
    else if(step===3){ setText(ch.end?.[which]?.text||''); path.push(`Cap ${idx+1} — 90%: ${ch.end?.[which]?.label||which}`); step=4; ensureNextInBackground(); }
    saveProg(); render();
  }

  let sentences=[],cur=0,cancelled=false;
  function collectSents(){ sentences=[...document.querySelectorAll('#narrativa .sent')].map(el=>el.textContent.trim()).filter(Boolean); }
  function clearHL(){ document.querySelectorAll('#narrativa .sent.speaking').forEach(el=>el.classList.remove('speaking')); }
  function hl(i){ clearHL(); const el=document.querySelector(`#narrativa .sent[data-i='${i}']`); if(el){ el.classList.add('speaking'); el.scrollIntoView({block:'nearest'});} }
  function speakFrom(i=0){
    if(!('speechSynthesis'in window)) return;
    collectSents(); cur=Math.max(0,Math.min(i,sentences.length-1)); cancelled=false;
    const voices=speechSynthesis.getVoices(); const pt=voices.filter(v=>/^pt/i.test(v.lang));
    const fem=/female|zira|heloisa|maria|camila|ana|sofia/i, masc=/male|daniel|ricardo|joao|thiago|pedro/i;
    let voice=pt[0]||voices[0]||null;
    const baseRate=Settings.rate||1.0, baseVol=Settings.vol||0.9, muted=Settings.muted||false;
    function stepSpeak(){
      if(cancelled||cur>=sentences.length){speechStatus.textContent='Pronto'; return;}
      const u=new SpeechSynthesisUtterance(sentences[cur]);
      if(voice) u.voice=voice;
      u.rate=baseRate; u.volume=muted?0:baseVol;
      u.onstart=()=>{speechStatus.textContent=`Lendo (${cur+1}/${sentences.length})`; hl(cur);};
      u.onend=()=>{cur++; stepSpeak();};
      speechSynthesis.speak(u);
    }
    speechSynthesis.cancel(); stepSpeak();
  }
  function onSpeak(){
    const sel=window.getSelection(); let i=0;
    if(sel && narrativa.contains(sel.anchorNode)){
      const span=(sel.anchorNode.nodeType===3?sel.anchorNode.parentElement:sel.anchorNode).closest('.sent');
      if(span) i=parseInt(span.getAttribute('data-i'))||0;
    }
    speakFrom(i);
  }
  function onStop(){ cancelled=true; speechSynthesis.cancel(); clearHL(); speechStatus.textContent='Pronto'; }
  function restartIfSpeaking(){ if(speechSynthesis.speaking){ const i=cur; speechSynthesis.cancel(); speakFrom(i);} }

  function init(){
    collect(); bind(); renderMenu(); show('menu');
    rateVal.textContent=(Settings.rate||1.0).toFixed(2)+'x'; volVal.textContent=Math.round((Settings.vol||0.9)*100)+'%';
    if(needLicense()) openLicense();
    toast('HistorIA v1.9.2 pronto');
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
