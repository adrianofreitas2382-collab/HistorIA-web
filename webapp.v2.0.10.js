/* HistorIA v2.0.10 — menu + criar/ salvar roteiros + modais */
(function(){
  const $ = s => document.querySelector(s);
  function onReady(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);}

  function uid(){ return 'hx_'+Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function loadStories(){ try{ return JSON.parse(localStorage.getItem('hx_stories')||'[]'); }catch(e){ return []; } }
  function saveStories(list){ localStorage.setItem('hx_stories', JSON.stringify(list)); }

  function renderList(){
    const list = loadStories();
    const wrap = $('#listStories');
    wrap.innerHTML = '';
    if(!list.length){ wrap.innerHTML = '<div class="small">Seu caminho aparecerá aqui.</div>'; return; }
    list.forEach(s=>{
      const el = document.createElement('div');
      el.className='storyItem';
      el.innerHTML = `
        <div><b>${s.title}</b> — <span class="small">${s.genre} • ${s.chapters} caps</span><br/>
        <span class="small">Núcleos: ${s.nuclei}</span></div>
        <div class="controls">
          <button class="btn" data-open="${s.id}">Abrir</button>
          <button class="btn" data-del="${s.id}">Excluir</button>
        </div>`;
      wrap.appendChild(el);
    });
    wrap.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',e=>{
      const id=e.currentTarget.getAttribute('data-del');
      const list=loadStories().filter(x=>x.id!==id);
      saveStories(list); renderList();
    }));
    wrap.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>{
      alert('Leitura/continuação será aberta aqui (em construção).');
    }));
  }

  function goMenu(){
    $('#screenMenu').classList.remove('hidden');
    $('#screenCreator').classList.add('hidden');
    $('#btnHome').classList.add('hidden');
    renderList();
  }
  function goCreator(){
    $('#screenMenu').classList.add('hidden');
    $('#screenCreator').classList.remove('hidden');
    $('#btnHome').classList.remove('hidden');
    // limpar campos
    $('#f_title').value='';
    $('#f_genre').value='Drama';
    $('#f_capitulos').value='10';
    $('#f_nuclei').value='';
    $('#f_brief').value='';
    $('#f_firstperson').checked=false;
  }

  onReady(()=>{
    // navbar
    $('#btnHome').addEventListener('click', goMenu);
    $('#btnTutorial').addEventListener('click', ()=> $('#tutorial').classList.remove('hidden'));
    $('#tutorial_close').addEventListener('click', ()=> $('#tutorial').classList.add('hidden'));
    $('#tutorial').addEventListener('click', (e)=>{ if(e.target===$('#tutorial')) $('#tutorial').classList.add('hidden'); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') $('#tutorial').classList.add('hidden'); });

    // terms
    const terms = $('#terms'); const chk=$('#terms_accept'); const ok=$('#terms_ok');
    function showTerms(){ terms.classList.remove('hidden'); }
    function hideTerms(){ terms.classList.add('hidden'); }
    if(localStorage.getItem('hx_terms_accepted')!=='1') showTerms();
    chk.addEventListener('change', ()=> ok.disabled = !chk.checked);
    ok.addEventListener('click', ()=>{ localStorage.setItem('hx_terms_accepted','1'); hideTerms(); });

    // create flow
    $('#btnCreate').addEventListener('click', goCreator);
    $('#btnCancel').addEventListener('click', goMenu);
    $('#btnGenerate').addEventListener('click', ()=>{
      const title = $('#f_title').value.trim() || 'Sem título';
      const genre = $('#f_genre').value;
      const chapters = Math.max(1, Math.min(10, parseInt($('#f_capitulos').value||'10',10)));
      const nuclei = $('#f_nuclei').value.trim();
      const brief = $('#f_brief').value.trim();
      const firstPerson = $('#f_firstperson').checked;
      const s = { id: uid(), title, genre, chapters, nuclei, brief, firstPerson, createdAt: Date.now() };
      const list = loadStories(); list.push(s); saveStories(list);
      goMenu();
    });

    // initial list
    renderList();
  });
})();