
/*! HistorIA v2.1.5 — Base 1.9.3 preservada; melhorias consolidadas (sem alterar index.html) */
(function(){
  const APP={
    version:'v2.1.5',
    state:{
      apiKey: localStorage.getItem('geminiKey') || 'AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM',
      model:  localStorage.getItem('geminiModel') || 'gemini-1.5-pro',
      rate: parseFloat(localStorage.getItem('ttsRate') || '1'),
      vol:  parseFloat(localStorage.getItem('ttsVol') || '0.9'),
      voice: localStorage.getItem('ttsVoice') || 'auto',
      acceptedTerms: localStorage.getItem('termsAccepted') === '1',
      roteiros: [],
      db:null
    }
  };

  /* ---------- Infra de persistência (IndexedDB) ---------- */
  const DB_NAME='historia-ia-db', STORE='roteiros';
  function openDB(){return new Promise((res,rej)=>{
    const req=indexedDB.open(DB_NAME,3);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'});
    };
    req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error);
  });}
  async function dbAll(){return new Promise((res,rej)=>{const tx=APP.state.db.transaction(STORE,'readonly');const q=tx.objectStore(STORE).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);});}
  async function dbPut(r){const tx=APP.state.db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(r);return tx.complete;}
  async function dbDel(id){const tx=APP.state.db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);return tx.complete;}

  /* ---------- Gemini API ---------- */
  async function gemini(prompt){
    const key=APP.state.apiKey, model=APP.state.model;
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.95,topK:40,topP:0.95,maxOutputTokens:2048}};
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json(); return (j?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n')||'').trim();
  }

  /* ---------- Prompts ---------- */
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function buildChapter(ctx){return `Você é roteirista. Escreva o CAPÍTULO ${ctx.capNum} de ${ctx.totalCaps} para "${ctx.titulo}" (${ctx.genero}).
- ~15 min (texto consistente, cenas e diálogos; evite clichês vagos).
- Núcleos: ${ctx.nucleos}.
- Enredo breve (guia 50%): ${ctx.enredo}.
- Continue do ponto exato: ${ctx.historico||'Início.'}
- DECISÃO 50% e DECISÃO 90% com 3 opções A/B/C coerentes ao momento (não repetir entradas/portas se já estiver dentro, etc).
- Fecho do capítulo.${ctx.p1?'\n- Narre em PRIMEIRA PESSOA; decisões podem levar a fim precoce.':''}

Formato:
TEXTO...
---
DECISÃO 50%:
A) ...
B) ...
C) ...
---
CONTINUAÇÃO...
---
DECISÃO 90%:
A) ...
B) ...
C) ...
---
FECHO DO CAPÍTULO.`;}

  function buildNewOptions(ctx,label,trecho){return `Recrie SOMENTE as opções para ${label} do capítulo ${ctx.capNum} de "${ctx.titulo}".
Contexto atual (resumo conciso): ${trecho.slice(0,1200)}
Traga 3 opções A/B/C coerentes com a situação exata; sem contradições. FORMATO:
A) ...
B) ...
C) ...`;}

  /* ---------- TTS (real-time ajustes) ---------- */
  let speaking=null; let currentNode=null;
  function splitIntoChunks(t){const max=600;const parts=[];for(let i=0;i<t.length;i+=max) parts.push(t.slice(i,i+max));return parts;}
  function highlight(node,on){if(!node)return; node.style.background=on?'rgba(255,230,0,.15)':'transparent';}
  function speak(text,node){
    const chunks=splitIntoChunks(text);
    const playNext=()=>{
      if(!chunks.length){speaking=null;highlight(node,false);return;}
      const u=new SpeechSynthesisUtterance(chunks.shift());
      u.rate=APP.state.rate; u.volume=APP.state.vol;
      const v=window.speechSynthesis.getVoices();
      if(APP.state.voice!=='auto'&&v.length){
        const pick=v.find(x=>APP.state.voice==='female'?/female|woman/i.test(x.name+x.lang):/male|man/i.test(x.name+x.lang));
        if(pick) u.voice=pick;
      }
      u.onend=()=>playNext();
      speaking=u; currentNode=node; highlight(node,true); window.speechSynthesis.speak(u);
    };
    playNext();
  }
  function stopSpeak(){window.speechSynthesis.cancel(); speaking=null; highlight(currentNode,false); currentNode=null;}

  /* ---------- UI helpers (sem depender de markup fixo) ---------- */
  const $=sel=>document.querySelector(sel);
  function el(tag,cls,html){const d=document.createElement(tag); if(cls) d.className=cls; if(html!=null) d.innerHTML=html; return d;}
  function ensureShell(){
    // Se já existir uma lista de roteiros da versão 1.9.3, reutiliza
    let list = $('#listRoteiros');
    if(!list){
      // cria um contêiner mínimo compatível
      const app = document.body.querySelector('.app') || document.body;
      const top = el('div','topbar','<strong>HistorIA</strong> <span id="version"></span> <button id="btnTutorial">📘</button> <button id="btnIA">⚙️</button>');
      const card= el('div','card','<div style="display:flex;justify-content:space-between;align-items:center"><h2>Seus roteiros</h2><button class="btn" id="btnNovo">+ Criar novo roteiro</button></div><div class="list" id="listRoteiros"></div>');
      app.prepend(top); app.appendChild(card);
    }
    const v=$('#version'); if(v) v.textContent = APP.version;
    return $('#listRoteiros');
  }

  function statusText(r){return r.statusText|| (r.status==='ok'?'OK': r.status==='gerando'?'Gerando…': r.status?.startsWith('api:')? `API offline/falhou: ${r.status.slice(4)}`: (r.status||''));}
  function renderList(){
    const ul=ensureShell();
    ul.innerHTML='';
    APP.state.roteiros.forEach(r=>{
      const li=el('div','item');
      const left=el('div');
      left.appendChild(el('div','item-title',`${r.titulo} — <span class="kv">${r.genero} • ${r.caps} caps${r.p1?' • 1ª pessoa':''}</span>`));
      left.appendChild(el('div','kv',`Núcleos: ${r.nucleos}`));
      left.appendChild(el('div','kv',statusText(r)));
      const right=el('div','row');
      const bA=el('button','btn','Abrir'); bA.onclick=()=>abrirRoteiro(r);
      const bE=el('button','btn secondary','Excluir'); bE.onclick=async()=>{await dbDel(r.id); APP.state.roteiros=APP.state.roteiros.filter(x=>x.id!==r.id); renderList();};
      right.appendChild(bA); right.appendChild(bE);
      li.appendChild(left); li.appendChild(right);
      ul.appendChild(li);
    });
  }

  function blankR(d){return {id:'r_'+Date.now(),titulo:d.titulo,genero:d.genero,nucleos:d.nucleos,caps:d.caps,p1:d.p1,enredo:d.enredo,created:Date.now(),status:'novo',statusText:'Aguardando geração',capitulos:[],historico:''};}

  /* ---------- Leitor/geração ---------- */
  async function gerarCapitulo(r,num){
    r.status='gerando'; r.statusText='Gerando Capítulo '+num+'…'; renderList(); await dbPut(r);
    try{
      const ctx={titulo:r.titulo,genero:r.genero,nucleos:r.nucleos,p1:r.p1,enredo:r.enredo,capNum:num,totalCaps:r.caps,historico:r.historico};
      const texto=await gemini(buildChapter(ctx));
      const parts50 = texto.split(new RegExp(esc('DECISÃO 50%')+'[:：]\\s*','i'));
      const body1 = (parts50[0]||'').trim();
      const rest50 = (parts50[1]||'');
      const parts90 = rest50.split(new RegExp(esc('DECISÃO 90%')+'[:：]\\s*','i'));
      const opts50 = (rest50.split('---')[0]||'');
      const contMid = (parts90[0]||'').split('---').slice(1).join('---').trim();
      const opts90 = (parts90[1]||'').split('---')[0]||'';
      const pick = (bloc, letter) => {
        const rx = new RegExp('^\\s*'+letter+'\\)\\s*(.+)$','im');
        return (bloc.match(rx)?.[1]||'').trim();
      };
      const op50={A:pick(opts50,'A'),B:pick(opts50,'B'),C:pick(opts50,'C')};
      const op90={A:pick(opts90,'A'),B:pick(opts90,'B'),C:pick(opts90,'C')};
      const cap={num,texto,op50,op90};
      r.capitulos.push(cap);
      r.historico += `\n[Capítulo ${num} concluído]\n`;
      r.status='ok'; r.statusText='OK'; await dbPut(r); renderList();
      // geração progressiva do próximo
      if(num<r.caps){ setTimeout(()=>gerarCapitulo(r,num+1), 800); }
    }catch(e){
      r.status='api:'+e.message; r.statusText=statusText(r); await dbPut(r); renderList();
    }
  }

  async function novasOpcoes(r,num,qual){
    const cap = r.capitulos.find(c=>c.num===num); if(!cap) return;
    const ctx={titulo:r.titulo,genero:r.genero,nucleos:r.nucleos,p1:r.p1,enredo:r.enredo,capNum:num,totalCaps:r.caps};
    const trecho = cap.texto.slice(0,2000);
    const out = await gemini(buildNewOptions(ctx,qual,trecho));
    const pick = (letter)=> (out.match(new RegExp('^\\s*'+letter+'\\)\\s*(.+)$','im'))?.[1]||'').trim();
    const novo = {A:pick('A'),B:pick('B'),C:pick('C')};
    if(qual==='DECISÃO 50%') cap.op50 = novo; else cap.op90 = novo;
    await dbPut(r); renderList();
  }

  /* ---------- UI do leitor (dinâmica) ---------- */
  function abrirRoteiro(r){
    const wrap = document.createElement('div');
    wrap.className='modal open';
    wrap.innerHTML = `
      <div class="panel card" style="width:860px;max-height:90vh;overflow:auto">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2>${r.titulo}</h2>
          <div>
            <button class="btn secondary" id="sair">Fechar</button>
          </div>
        </div>
        <div id="leitor"></div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{ if(e.target===wrap) wrap.remove(); });
    wrap.querySelector('#sair').onclick=()=>wrap.remove();

    const leitor = wrap.querySelector('#leitor');
    leitor.innerHTML='';

    r.capitulos.forEach(cap=>{
      const sec=el('section','cap');
      sec.appendChild(el('h3',null,`Capítulo ${cap.num}`));
      const tx=el('div',null,`<div class="texto"></div>`);
      tx.querySelector('.texto').textContent = cap.texto.split('---')[0].trim();
      const narr=el('div','row',`
        <button class="btn secondary">▶️ Narrar</button>
        <button class="btn secondary">⏹️ Parar</button>
        <label style="margin-left:10px">Voz:
          <select>
            <option value="auto"${APP.state.voice==='auto'?' selected':''}>Auto</option>
            <option value="male"${APP.state.voice==='male'?' selected':''}>Masculina</option>
            <option value="female"${APP.state.voice==='female'?' selected':''}>Feminina</option>
          </select>
        </label>
        <label style="margin-left:10px">Vel: <input type="range" min="0.6" max="1.8" step="0.1" value="${APP.state.rate}"></label>
        <label style="margin-left:10px">Vol: <input type="range" min="0" max="1" step="0.05" value="${APP.state.vol}"></label>
      `);
      const textoNode = tx.querySelector('.texto');
      const [btnPlay,btnStop,selVoice,slRate,slVol] = narr.querySelectorAll('button,select,input');
      btnPlay.onclick=()=>speak(textoNode.textContent,textoNode);
      btnStop.onclick=()=>stopSpeak();
      selVoice.onchange=e=>{APP.state.voice=e.target.value; localStorage.setItem('ttsVoice',APP.state.voice);};
      slRate.oninput=e=>{APP.state.rate=parseFloat(e.target.value); localStorage.setItem('ttsRate',APP.state.rate);};
      slVol.oninput=e=>{APP.state.vol=parseFloat(e.target.value); localStorage.setItem('ttsVol',APP.state.vol);};
      sec.appendChild(tx);
      sec.appendChild(narr);

      // opções 50%
      const op50=el('div','op','<h4>Decisão 50%</h4>');
      ['A','B','C'].forEach(k=>{
        const row=el('div','option',`<img src="./assets/icon-192.png" alt=""><span><b>${k})</b> ${cap.op50?.[k]||''}</span>`);
        op50.appendChild(row);
      });
      const bRe50 = el('button','btn secondary','Novas opções 50%');
      bRe50.onclick=()=>novasOpcoes(r,cap.num,'DECISÃO 50%');
      op50.appendChild(el('div',null)).appendChild(bRe50);
      sec.appendChild(op50);

      // continuidade e 90%
      const cont=el('div',null,'<h4>Continuação</h4>');
      const contTxt = cap.texto.split(/DECISÃO 50%/i)[1]?.split('---').slice(1).join('---')?.split(/DECISÃO 90%/i)[0] || '';
      cont.appendChild(el('div','texto', contTxt.trim()));
      sec.appendChild(cont);

      const op90=el('div','op','<h4>Decisão 90%</h4>');
      ['A','B','C'].forEach(k=>{
        const row=el('div','option',`<img src="./assets/icon-192.png" alt=""><span><b>${k})</b> ${cap.op90?.[k]||''}</span>`);
        op90.appendChild(row);
      });
      const bRe90 = el('button','btn secondary','Novas opções 90%');
      bRe90.onclick=()=>novasOpcoes(r,cap.num,'DECISÃO 90%');
      op90.appendChild(el('div',null)).appendChild(bRe90);
      sec.appendChild(op90);

      leitor.appendChild(sec);
    });
  }

  /* ---------- Criação de roteiro ---------- */
  function openCreate(){
    const wrap=el('div','modal open',``);
    wrap.innerHTML=`
      <div class="panel card" style="width:840px;max-height:90vh;overflow:auto">
        <h2>Novo roteiro</h2>
        <div class="grid2">
          <div><div class="small">Título</div><input id="t" class="select"/></div>
          <div><div class="small">Gênero</div>
            <select id="g" class="select">
              <option>Suspense/Thriller</option><option>Comédia</option><option>Terror</option><option>Faroeste</option><option>Infantil</option><option>Ficção científica</option><option>Aventura</option><option>Romance</option><option>+18</option>
            </select>
          </div>
          <div style="grid-column:1/-1"><div class="small">Núcleos (separados por vírgula)</div><input id="n" class="select"/></div>
          <div><div class="small">Capítulos (máx.10)</div><input id="c" type="number" min="1" max="10" value="10" class="select"/></div>
          <div><div class="small">Primeira pessoa</div>
            <select id="p1" class="select"><option>Não</option><option>Sim</option></select>
          </div>
          <div style="grid-column:1/-1"><div class="small">Enredo breve (~50%)</div><textarea id="e" class="select" style="min-height:100px"></textarea></div>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:10px">
          <button class="btn secondary" id="cancel">Cancelar</button>
          <button class="btn" id="ok">Gerar capítulo 1</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{ if(e.target===wrap) wrap.remove(); });
    wrap.querySelector('#cancel').onclick=()=>wrap.remove();
    wrap.querySelector('#ok').onclick=async()=>{
      const d={
        titulo: wrap.querySelector('#t').value.trim()||'Sem título',
        genero: wrap.querySelector('#g').value,
        nucleos: wrap.querySelector('#n').value.trim(),
        caps: Math.max(1,Math.min(10, parseInt(wrap.querySelector('#c').value||'10'))),
        p1: wrap.querySelector('#p1').value==='Sim',
        enredo: wrap.querySelector('#e').value.trim()
      };
      const r=blankR(d); APP.state.roteiros.unshift(r); await dbPut(r); renderList();
      wrap.remove();
      gerarCapitulo(r,1);
    };
  }

  /* ---------- Termos e IA ---------- */
  function ensureTerms(){
    if(APP.state.acceptedTerms) return;
    const m=el('div','modal open',`
      <div class="panel card" style="width:760px;max-height:85vh;overflow:auto">
        <h2>Termos e Condições</h2>
        <p>Uso responsável. É proibido criar conteúdos ilegais. O usuário é responsável pelas histórias geradas.</p>
        <div class="row" style="justify-content:flex-end"><button class="btn secondary" id="decl">Recusar</button><button class="btn" id="acc">Aceitar</button></div>
      </div>`);
    document.body.appendChild(m);
    m.addEventListener('click',e=>{ if(e.target===m){} });
    m.querySelector('#decl').onclick=()=>{ alert('É necessário aceitar para usar.'); };
    m.querySelector('#acc').onclick=()=>{ localStorage.setItem('termsAccepted','1'); APP.state.acceptedTerms=true; m.remove(); };
  }
  function openIA(){
    const m=el('div','modal open',`
      <div class="panel card" style="width:600px">
        <h2>Configurar IA</h2>
        <div class="small">Chave (Google AI Studio)</div>
        <input id="k" class="select" value="${APP.state.apiKey}"/>
        <div class="small" style="margin-top:8px">Modelo</div>
        <input id="mm" class="select" value="${APP.state.model}"/>
        <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn secondary" id="fe">Fechar</button><button class="btn" id="sa">Salvar</button></div>
      </div>`);
    document.body.appendChild(m);
    m.addEventListener('click',e=>{ if(e.target===m) m.remove(); });
    m.querySelector('#fe').onclick=()=>m.remove();
    m.querySelector('#sa').onclick=()=>{
      const k=m.querySelector('#k').value.trim();
      const mm=m.querySelector('#mm').value.trim();
      if(k){APP.state.apiKey=k; localStorage.setItem('geminiKey',k);}
      if(mm){APP.state.model=mm; localStorage.setItem('geminiModel',mm);}
      m.remove();
    };
  }

  /* ---------- Boot ---------- */
  (async function(){
    APP.state.db=await openDB();
    APP.state.roteiros=await dbAll();
    renderList();

    // wire básico (IDs podem não existir em 1.9.3 — criamos fallback)
    const novoBtn = document.getElementById('btnNovo');
    if(novoBtn) novoBtn.onclick = openCreate;
    else {
      // se não há, cria um flutuante discreto
      const f = el('button','btn', '+ Criar roteiro');
      f.style.position='fixed'; f.style.right='16px'; f.style.bottom='16px'; document.body.appendChild(f);
      f.onclick=openCreate;
    }
    const tutBtn = document.getElementById('btnTutorial');
    if(tutBtn) tutBtn.onclick = ()=>{
      const m=el('div','modal open',`<div class="panel card" style="width:700px"><h2>Tutorial</h2><ul>
      <li>Gere capítulo 1; decisões em 50% e 90% (3 opções + "Novas opções").</li>
      <li>Geração progressiva: próximos capítulos são preparados enquanto você lê.</li>
      <li>Use ⚙️ para trocar a licença do Gemini; a padrão já está embutida.</li>
      <li>Narração com controles no leitor (voz/velocidade/volume) em tempo quase real.</li>
      </ul><div class="row" style="justify-content:flex-end"><button class="btn secondary" id="x">Fechar</button></div></div>`);
      document.body.appendChild(m); m.addEventListener('click',e=>{ if(e.target===m) m.remove(); }); m.querySelector('#x').onclick=()=>m.remove();
    };
    const iaBtn = document.getElementById('btnIA'); if(iaBtn) iaBtn.onclick = openIA;

    ensureTerms();
  })();

})();
