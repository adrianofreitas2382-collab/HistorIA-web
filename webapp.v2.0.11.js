/* HistorIA v2.0.11 — menu + criar + leitor com geração IA (Google AI Studio) */
(function(){ 
  const API_KEY = "AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM";
  const MODEL = "gemini-1.5-pro";
  const $ = s => document.querySelector(s);
  const on = (el,ev,fn)=>el.addEventListener(ev,fn);
  const uid = ()=>'hx_'+Math.random().toString(36).slice(2)+Date.now().toString(36);
  const load = k=>{ try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null} };
  const save = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
  const storiesKey='hx_stories';

  function loadStories(){ return load(storiesKey)||[]; }
  function saveStories(list){ save(storiesKey,list); }

  // UI routing
  function show(id){ ['#screenMenu','#screenCreator','#screenReader'].forEach(s=>$(s).classList.add('hidden')); $(id).classList.remove('hidden'); }
  function goMenu(){ $('#btnHome').classList.add('hidden'); renderList(); show('#screenMenu'); }
  function goCreator(){ $('#btnHome').classList.remove('hidden'); clearCreator(); show('#screenCreator'); }
  function goReader(id){ $('#btnHome').classList.remove('hidden'); show('#screenReader'); openReader(id); }

  // Render list
  function renderList(){
    const list = loadStories();
    const wrap = $('#listStories'); wrap.innerHTML='';
    if(!list.length){ wrap.innerHTML='<div class="small">Seu caminho aparecerá aqui.</div>'; return; }
    for(const s of list){
      const el=document.createElement('div'); el.className='storyItem';
      el.innerHTML = `<div><b>${s.title}</b> — <span class="small">${s.genre} • ${s.chapters} caps</span><br/><span class="small">Núcleos: ${s.nuclei||'-'}</span></div>
      <div class="controls"><button class="btn" data-open="${s.id}">Abrir</button><button class="btn" data-del="${s.id}">Excluir</button></div>`;
      wrap.appendChild(el);
    }
    wrap.querySelectorAll('[data-open]').forEach(b=>on(b,'click',e=>goReader(e.currentTarget.dataset.open)));
    wrap.querySelectorAll('[data-del]').forEach(b=>on(b,'click',e=>{ const id=e.currentTarget.dataset.del; let list=loadStories().filter(x=>x.id!==id); saveStories(list); renderList(); }));
  }

  // Creator
  function clearCreator(){
    $('#f_title').value=''; $('#f_genre').value='Drama'; $('#f_capitulos').value='10'; 
    $('#f_nuclei').value=''; $('#f_brief').value=''; $('#f_firstperson').checked=false;
  }
  function createStory(){
    const s={ id:uid(), title:($('#f_title').value||'Sem título').trim(), genre:$('#f_genre').value,
      chapters: Math.max(1, Math.min(10, parseInt($('#f_capitulos').value||'10'))),
      nuclei: $('#f_nuclei').value.trim(), brief: $('#f_brief').value.trim(),
      firstPerson: $('#f_firstperson').checked, createdAt: Date.now(), data: {chapters:[]}, cursor:{chap:1} };
    const list=loadStories(); list.push(s); saveStories(list);
    return s.id;
  }

  // Reader state
  let currentId=null;
  function getCurrent(){
    return loadStories().find(x=>x.id===currentId);
  }
  function saveCurrent(s){
    const list=loadStories().map(x=>x.id===s.id?s:x); saveStories(list);
  }

  function openReader(id){
    currentId=id;
    const s=getCurrent();
    $('#r_title').textContent = s.title + ' — Capítulo '+(s.cursor?.chap||1);
    $('#r_badge').textContent = 'Capítulo '+(s.cursor?.chap||1);
    $('#r_body').textContent='';
    $('#r_opts').innerHTML='';
    $('#r_generate').classList.remove('hidden');
    $('#r_newopts').classList.add('hidden');
    $('#r_next').classList.add('hidden');

    const chapIndex = (s.cursor?.chap||1)-1;
    const chap = s.data.chapters[chapIndex];
    if(chap && chap.intro){
      renderChapter(chap);
    }
  }

  function renderChapter(ch){
    $('#r_body').innerHTML = `<div class="readText">${ch.intro}</div>`;
    renderOptions(ch.opts50||[],'50');
    $('#r_generate').classList.add('hidden');
    $('#r_newopts').classList.remove('hidden');
  }

  function renderOptions(opts, tag){
    const wrap = $('#r_opts'); wrap.innerHTML='';
    if(!(opts&&opts.length)) return;
    opts.slice(0,3).forEach((o,i)=>{
      const row=document.createElement('div'); row.className='option';
      row.innerHTML=`<div><b>Opção <built-in function chr></b> — ${o}</div><button class="btn" data-choose="${i}">Escolher</button>`.replace('{chr}',"ABC"[i]);
      wrap.appendChild(row);
    });
    wrap.querySelectorAll('[data-choose]').forEach(btn=>on(btn,'click',e=>chooseOption(tag, parseInt(e.currentTarget.dataset.choose,10))));
  }

  async function chooseOption(tag, idx){
    const s=getCurrent(); const chapIndex=(s.cursor?.chap||1)-1; const ch=s.data.chapters[chapIndex];
    if(tag==='50'){
      $('#r_body').innerHTML += "\n\n" + (ch.mid && ch.mid[idx] ? ch.mid[idx] : '(continuação...)');
      renderOptions(ch.opts90 ? ch.opts90[idx] : [], '90');
    } else {
      $('#r_body').innerHTML += "\n\n" + (ch.ending && ch.ending[idx] ? ch.ending[idx] : '(desfecho do capítulo)');
      $('#r_opts').innerHTML='';
      $('#r_newopts').classList.add('hidden');
      $('#r_next').classList.remove('hidden');
      on($('#r_next'),'click',()=>{ s.cursor.chap += 1; saveCurrent(s); openReader(s.id); });
    }
  }

  async function callGemini(prompt){
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const body = { contents:[{ role:'user', parts:[{text:prompt}] }] };
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if(!res.ok) throw new Error('Erro IA '+res.status);
    const js = await res.json();
    const txt = js.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || '';
    return txt;
  }

  function chapterPrompt(s, chapNum){
    return `Gere um capítulo ${chapNum} de novela interativa em português, seguindo:
- Gênero: ${s.genre}. Núcleos: ${s.nuclei||'-'}.
- Enredo breve (guia de ~50%): ${s.brief||'-'}.
- Se ${s.firstPerson?'SIM':'NÃO'} narrar em primeira pessoa (se primeira pessoa, o leitor é o protagonista e pode haver fim precoce).
- Duração estimada ~15 minutos de leitura.
Estruture EM JSON VÁLIDO e SOMENTE JSON com o formato:
{
  "title": "Título do capítulo",
  "intro": "Texto até o ponto de 50%. Evite clichês como 'ar denso', foque em eventos, diálogos e detalhes concretos.",
  "opts50": ["Opção A", "Opção B", "Opção C"],
  "mid": ["continuação se A", "continuação se B", "continuação se C"],
  "opts90": [
    ["opção A1","opção A2","opção A3"],
    ["opção B1","opção B2","opção B3"],
    ["opção C1","opção C2","opção C3"]
  ],
  "ending": ["desfecho se A","desfecho se B","desfecho se C"]
}`;
  }

  async function generateChapter(){
    const s=getCurrent(); const chapNum=s.cursor?.chap||1;
    const prompt = chapterPrompt(s, chapNum);
    const btn=$('#r_generate'); btn.disabled=true; btn.textContent='Gerando…';
    try{
      const out = await callGemini(prompt);
      let data=null; try{ data=JSON.parse(out); }catch(_){
        // tentativa de achar JSON em meio ao texto
        const m = out.match(/\{[\s\S]*\}/); if(m){ try{ data=JSON.parse(m[0]); }catch(_2){} }
      }
      if(!data||!data.intro) throw new Error('Resposta IA inesperada');
      const ch={ intro:data.intro, opts50:data.opts50||[], mid:data.mid||[], opts90:data.opts90||[], ending:data.ending||[] };
      const chapIndex=(s.cursor?.chap||1)-1;
      s.data.chapters[chapIndex]=ch; saveCurrent(s); renderChapter(ch);
    } catch(err){
      alert('Falha ao gerar capítulo: '+err.message);
    } finally { btn.disabled=false; btn.textContent='⚙️ Gerar capítulo com IA'; }
  }

  async function newOptions(){
    const s=getCurrent(); const chapNum=s.cursor?.chap||1;
    const base = $('#r_body').textContent.slice(0,3000);
    const prompt = `Reescreva APENAS as opções em JSON válido (sem comentários) para os pontos 50% e 90% com três alternativas cada, coerentes com o trecho a seguir. Responda no formato {"opts50":[], "opts90":[[],[],[]]}. Trecho:\n\n${base}`;
    const btn=$('#r_newopts'); btn.disabled=true; btn.textContent='Gerando opções…';
    try{
      const out=await callGemini(prompt); let js=null; try{js=JSON.parse(out);}catch(_){
        const m = out.match(/\{[\s\S]*\}/); if(m){ try{ js=JSON.parse(m[0]); }catch(_2){} }
      }
      if(js && js.opts50){ 
        const s2=getCurrent(); const chapIndex=(s2.cursor?.chap||1)-1;
        const ch=s2.data.chapters[chapIndex]||{}; ch.opts50=js.opts50; ch.opts90=js.opts90||ch.opts90||[];
        s2.data.chapters[chapIndex]=ch; saveCurrent(s2); renderOptions(ch.opts50,'50');
      }
    } catch(err){ alert('Falha ao gerar opções: '+err.message); }
    finally{ btn.disabled=false; btn.textContent='🔄 Novas opções'; }
  }

  // wiring
  document.addEventListener('DOMContentLoaded', ()=>{
    on($('#btnHome'),'click',goMenu);
    on($('#btnTutorial'),'click',()=>$('#tutorial').classList.remove('hidden'));
    on($('#tutorial_close'),'click',()=>$('#tutorial').classList.add('hidden'));
    on($('#btnCreate'),'click',goCreator);
    on($('#btnCancel'),'click',goMenu);
    on($('#btnGenerate'),'click',()=>{ const id=createStory(); goReader(id); });
    on($('#r_generate'),'click',generateChapter);
    on($('#r_newopts'),'click',newOptions);
    renderList(); // start
  });
})();