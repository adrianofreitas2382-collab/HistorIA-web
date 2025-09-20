
(function(){
  const $ = s=>document.querySelector(s);
  const toast = (msg)=>{const t=$("#toast");t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),1800);};
  const show = id => ['#screenMenu','#screenCreator','#screenReader','#license'].forEach(s=>$(s).classList.add('hidden')) || $(id).classList.remove('hidden');

  // License modal
  $('#btnSettings').onclick = ()=> $('#license').classList.toggle('hidden');
  $('#lic_cancel').onclick = ()=> $('#license').classList.add('hidden');
  $('#lic_ok').onclick = ()=>{
    localStorage.setItem('hx_license_key',$('#licenseKey').value.trim());
    localStorage.setItem('hx_model_key',$('#modelKey').value.trim());
    localStorage.setItem('hx_gh_owner',$('#gh_owner').value.trim());
    localStorage.setItem('hx_gh_repo',$('#gh_repo').value.trim());
    localStorage.setItem('hx_gh_branch',$('#gh_branch').value.trim());
    localStorage.setItem('hx_gh_token',$('#gh_token').value.trim());
    toast('Licença & GitHub salvos'); $('#license').classList.add('hidden');
  };
  (function prefill(){
    const g=k=>localStorage.getItem(k)||'';
    $('#licenseKey').value = g('hx_license_key')||'';
    $('#modelKey').value = g('hx_model_key')||'gemini-1.5-pro';
    $('#gh_owner').value = g('hx_gh_owner')||'';
    $('#gh_repo').value  = g('hx_gh_repo')||'';
    $('#gh_branch').value= g('hx_gh_branch')||'main';
    $('#gh_token').value = g('hx_gh_token')||'';
  })();
  if(!localStorage.getItem('hx_license_key')) $('#license').classList.remove('hidden');

  // Menu/Creator
  $('#btnCreate').onclick = ()=> show('#screenCreator');
  $('#btnCancel').onclick = ()=> show('#screenMenu');

  // Simple local state
  const state = { story:null, chapterIndex:0, progress:[], chapters:[], choices:[] };

  // Fake offline generator (fallback)
  function fakePara(topic, fp=false){
    const who = fp? 'Eu' : 'Ele/ela';
    const lines = [
      `${who} observo as peças se moverem: ${topic}. Pontos se conectam um a um.`,
      `O ambiente impõe riscos naturais e humanos; alianças frágeis se formam.`,
      `Detalhes práticos surgem: nomes, horários, pressões políticas e familiares.`,
      `Uma decisão inevitável se aproxima – escolhas cobram custo.`
    ];
    return lines.join(' ');
  }
  function fakeChoices(context){
    const pool = [
      'Negociar discretamente com um aliado improvável',
      'Mapear uma rota alternativa para evitar vigilância',
      'Confrontar quem parece estar ocultando informações',
      'Voltar dois passos para observar sem ser visto',
      'Aproveitar o tumulto para agir com rapidez',
      'Pedir ajuda a alguém que não confia totalmente'
    ];
    // pick 3 distinct coherent lines
    const chosen = [];
    while(chosen.length<3){
      const p = pool[Math.floor(Math.random()*pool.length)];
      if(!chosen.includes(p)) chosen.push(p);
    }
    return chosen;
  }

  // Render helpers
  function renderChapter(){
    const ch = state.chapters[state.chapterIndex];
    $('#capitulo').textContent = `Capítulo ${state.chapterIndex+1}`;
    $('#titulo').textContent = state.story?.title || 'Título';
    $('#narrativa').innerHTML = ch.text.map(t=>`<span class="sent">${t}</span>`).join(' ');
    renderChoices(ch.choices);
  }
  function renderChoices(choices){
    const host = $('#choices'); host.innerHTML='';
    const icons = ['🚪','🧭','⚠️','🔍','🗝️','⛵','🔥','🕯️','🧩'];
    choices.slice(0,3).forEach((c,i)=>{
      const div = document.createElement('div');
      div.className='choice';
      div.innerHTML = `<div class="ico">${icons[i%icons.length]}</div>
        <div><div class="label">Opção ${String.fromCharCode(65+i)}</div><div class="txt">${c}</div>
        <div class="btns"><button class="btn" data-i="${i}">Escolher</button></div></div>`;
      div.querySelector('button').onclick = ()=> choose(i);
      host.appendChild(div);
    });
  }

  function choose(i){
    const ch = state.chapters[state.chapterIndex];
    const picked = ch.choices[i];
    state.progress.push({cap:state.chapterIndex, choice:picked});
    toast(`Escolheu: ${picked}`);
    // if this was 90% decision, conclude chapter and prepare next
    state.chapterIndex++;
    if(state.chapterIndex >= state.story.totalChapters){
      toast('Fim da história.');
      state.chapterIndex = state.story.totalChapters-1;
      return;
    }
    ensureChapter(state.chapterIndex, true);
    renderChapter();
  }

  // Ensure a chapter exists; if background==true, only create without render
  function ensureChapter(idx, background=false){
    if(state.chapters[idx]) return;
    const fp = !!state.story.firstPerson;
    // Create three blocks: ~50%, ~90%, conclusão
    const baseTopic = `${state.story.genre} • ${state.story.brief}`;
    const p1 = fakePara(baseTopic, fp);
    const p2 = fakePara(`Consequências diretas do que ocorreu até aqui (${idx+1}/10)`, fp);
    const p3 = fakePara('Conclusão provisória do capítulo', fp);
    const c50 = fakeChoices(p1);
    const c90 = fakeChoices(p2);
    state.chapters[idx] = { text:[p1,p2,p3], choices:[...c50,...c90].slice(0,3) };
    if(!background) renderChapter();
  }

  // New options button → regenerate choices coherently from current narrative
  $('#btnNewOptions').onclick = ()=>{
    const ctx = $('#narrativa').innerText.slice(-800);
    const ch = state.chapters[state.chapterIndex];
    ch.choices = fakeChoices(ctx);
    renderChoices(ch.choices);
    toast('Novas opções geradas');
  };

  // Generate first chapter
  $('#btnGenerate').onclick = ()=>{
    state.story = {
      title: $('#f_title').value.trim() || 'Sem título',
      genre: $('#f_genre').value,
      brief: $('#f_brief').value.trim(),
      nuclei: $('#f_nuclei').value.trim(),
      firstPerson: $('#f_firstperson').checked,
      totalChapters: Math.min(10, Math.max(3, parseInt($('#f_capitulos').value||'10')))
    };
    state.chapterIndex = 0; state.chapters=[]; state.progress=[];
    ensureChapter(0,false);
    // Preload next in background
    ensureChapter(1,true);
    show('#screenReader');
    $('#btnHome').classList.remove('hidden');
  };

  // Simple narration using Web Speech API
  const rateSlider = $('#rateSlider'), volSlider=$('#volSlider'), rateVal=$('#rateVal'), volVal=$('#volVal');
  $('#pillRate').onclick = ()=> $('#wrapRate').classList.toggle('open');
  $('#pillVol').onclick  = ()=> $('#wrapVol').classList.toggle('open');
  let currentUtterance=null;
  function speak(text){
    if(!window.speechSynthesis) return toast('Sem suporte de narração');
    const u = new SpeechSynthesisUtterance(text);
    currentUtterance = u;
    u.rate = parseFloat(rateSlider.value||'1.0');
    u.volume = parseFloat(volSlider.value||'0.9');
    speechSynthesis.speak(u);
    u.onend = ()=>{currentUtterance=null; $('#speechStatus').textContent='Pronto'};
    u.onstart = ()=>$('#speechStatus').textContent='Falando';
  }
  $('#btnSpeak').onclick = ()=>{
    const t = $('#narrativa').innerText.trim();
    if(!t) return toast('Nada para narrar');
    speechSynthesis.cancel(); speak(t);
  };
  $('#btnStop').onclick = ()=>{speechSynthesis.cancel(); $('#speechStatus').textContent='Parado'};
  rateSlider.oninput = ()=>{ rateVal.textContent=(parseFloat(rateSlider.value)).toFixed(2)+'x'; if(currentUtterance){ currentUtterance.rate=parseFloat(rateSlider.value);} };
  volSlider.oninput  = ()=>{ volVal.textContent=Math.round(parseFloat(volSlider.value)*100)+'%'; if(currentUtterance){ currentUtterance.volume=parseFloat(volSlider.value);} };
  $('#muteBtn').onclick = ()=>{ volSlider.value='0'; volSlider.oninput(); };

  // Nav
  $('#btnBack').onclick = ()=>{
    if(state.chapterIndex>0){ state.chapterIndex--; renderChapter(); }
  };
  $('#btnNext').onclick = ()=>{
    choose(0); // avanço rápido (padrão: pega A); o leitor pode clicar nas cartas A/B/C.
  };
  $('#btnHome').onclick = ()=> show('#screenMenu');

})();