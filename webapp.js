
const APP={version:'v2.1.0',state:{voice:'auto',rate:1,volume:0.9,muted:false,apiKey:localStorage.getItem('geminiKey')||'AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM',model:localStorage.getItem('geminiModel')||'gemini-1.5-pro',roteiros:[],db:null}};
const $=s=>document.querySelector(s); const el=(t,c,h)=>{const d=document.createElement(t); if(c)d.className=c; if(h)d.innerHTML=h; return d;};
function openDB(){return new Promise((res,rej)=>{const req=indexedDB.open('historia-ia-db',2); req.onupgradeneeded=e=>{const db=e.target.result; if(!db.objectStoreNames.contains('roteiros')) db.createObjectStore('roteiros',{keyPath:'id'});}; req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error);});}
async function dbPut(r){const tx=APP.state.db.transaction('roteiros','readwrite'); tx.objectStore('roteiros').put(r); return tx.complete;}
async function dbAll(){return new Promise((res,rej)=>{const tx=APP.state.db.transaction('roteiros','readonly'); const q=tx.objectStore('roteiros').getAll(); q.onsuccess=()=>res(q.result||[]); q.onerror=()=>rej(q.error);});}
async function dbDel(id){const tx=APP.state.db.transaction('roteiros','readwrite'); tx.objectStore('roteiros').delete(id); return tx.complete;}

async function geminiGenerate(prompt){
  const key=APP.state.apiKey, model=APP.state.model||'gemini-1.5-pro';
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.95,topK:40,topP:0.95,maxOutputTokens:2048}};
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok) throw new Error('HTTP '+r.status);
  const j=await r.json(); return (j?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n')||'').trim();
}
function buildChapterPrompt(ctx){return `Você é roteirista. Escreva o CAPÍTULO ${ctx.capNum} de ${ctx.totalCaps} para "${ctx.titulo}" (${ctx.genero}).
- ~15 min de leitura; prefira cenas concretas e diálogos. Evite clichês vagos.
- Núcleos: ${ctx.nucleos}.
- Enredo breve guia metade: ${ctx.enredo}.
- Continue exatamente do ponto: ${ctx.historico||'Início.'}
- Inserir DECISÃO 50% e DECISÃO 90% com 3 opções A/B/C coerentes.
- Fecho provisório do capítulo.${ctx.p1?'\n- Narre em PRIMEIRA PESSOA; decisões podem levar a fim precoce.':''}

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
let utter=null; function ttsSpeak(t){if(utter) window.speechSynthesis.cancel(); utter=new SpeechSynthesisUtterance(t); utter.rate=APP.state.rate; utter.volume=APP.state.muted?0:APP.state.volume; const v=window.speechSynthesis.getVoices(); if(APP.state.voice!=='auto'&&v.length){const pick=v.find(x=>APP.state.voice==='female'?/female|woman/i.test(x.name+x.lang):/male|man/i.test(x.name+x.lang)); if(pick) utter.voice=pick;} window.speechSynthesis.speak(utter);} function ttsStop(){window.speechSynthesis.cancel(); utter=null;}

function blankR(d){return {id:'r_'+Date.now(),titulo:d.titulo,genero:d.genero,nucleos:d.nucleos,caps:d.caps,p1:d.p1,enredo:d.enredo,created:Date.now(),status:'gerando',capitulos:[],historico:''};}
function statusHuman(s){return s==='ok'?'OK': s==='gerando'?'Gerando...': s.startsWith('api:')?`API offline/falhou: ${s.slice(4)}`: s;}
function renderList(){const ul=$('#listRoteiros'); ul.innerHTML=''; APP.state.roteiros.forEach(r=>{const li=el('div','item'); const left=el('div'); left.appendChild(el('div','item-title',`${r.titulo} — <span class="kv">${r.genero} • ${r.caps} caps</span>`)); left.appendChild(el('div','kv',`Núcleos: ${r.nucleos}`)); left.appendChild(el('div','kv',r.statusText||statusHuman(r.status))); const right=el('div','row'); const bA=el('button','btn','Abrir'); bA.onclick=()=>abrirRoteiro(r); const bE=el('button','btn secondary','Excluir'); bE.onclick=async()=>{await dbDel(r.id); APP.state.roteiros=APP.state.roteiros.filter(x=>x.id!==r.id); renderList();}; right.appendChild(bA); right.appendChild(bE); li.appendChild(left); li.appendChild(right); ul.appendChild(li); });}
function abrirRoteiro(r){alert('Leitura/continuação será aberta aqui (placeholder).');}

async function gerarCapitulo(r,num){r.status='gerando'; r.statusText='Gerando Capítulo '+num+'...'; renderList(); await dbPut(r);
  try{const ctx={titulo:r.titulo,genero:r.genero,nucleos:r.nucleos,p1:r.p1,enredo:r.enredo,capNum:num,totalCaps:r.caps,historico:r.historico}; const texto=await geminiGenerate(buildChapterPrompt(ctx));
    function ops(b){const m=texto.split(new RegExp(`${b}[:：]\\s*`,'i'))[1]||''; const A=/A\\)\\s*(.*)/i.exec(m)?.[1]||''; const B=/B\\)\\s*(.*)/i.exec(m)?.[1]||''; const C=/C\\)\\s*(.*)/i.exec(m)?.[1]||''; return {A,B,C};}
    r.capitulos.push({num, texto, op50:ops('DECISÃO 50%'), op90:ops('DECISÃO 90%')}); r.historico+=`\\n[Capítulo ${num} concluído]\\n`; r.status='ok'; r.statusText='OK'; await dbPut(r); renderList(); if(num<r.caps){setTimeout(()=>gerarCapitulo(r,num+1),400);}
  }catch(e){r.status='api:'+e.message; r.statusText=statusHuman(r.status); await dbPut(r); renderList();}}

function wireUI(){ $('#version').textContent=APP.version;
  $('#btnVel').onclick=()=>$('#wrapVel').classList.toggle('open'); $('#btnVol').onclick=()=>$('#wrapVol').classList.toggle('open');
  $('#rngVel').oninput=e=>{APP.state.rate=parseFloat(e.target.value); if(utter) utter.rate=APP.state.rate;}; $('#rngVol').oninput=e=>{APP.state.volume=parseFloat(e.target.value); if(utter) utter.volume=APP.state.volume;};
  $('#btnNarrar').onclick=()=>{const r=APP.state.roteiros[0]; if(!r||!r.capitulos.length){alert('Abra um roteiro.'); return;} ttsSpeak(r.capitulos[0].texto.slice(0,900));}; $('#btnParar').onclick=()=>ttsStop();
  $('#btnTutorial').onclick=()=>$('#modalTutorial').classList.add('open'); $('#btnFecharTut').onclick=()=>$('#modalTutorial').classList.remove('open');
  $('#btnIA').onclick=()=>{ $('#inpKey').value=APP.state.apiKey||''; $('#inpModel').value=APP.state.model||'gemini-1.5-pro'; $('#modalIA').classList.add('open');};
  $('#btnIAFechar').onclick=()=>$('#modalIA').classList.remove('open'); $('#btnIASalvar').onclick=()=>{const k=$('#inpKey').value.trim(); const m=$('#inpModel').value.trim(); if(k){APP.state.apiKey=k; localStorage.setItem('geminiKey',k);} if(m){APP.state.model=m; localStorage.setItem('geminiModel',m);} $('#modalIA').classList.remove('open');};
  $('#btnNovo').onclick=()=>{$('#modalNovo').classList.add('open'); document.body.style.overflow='hidden';};
  $('#btnCancelNovo').onclick=()=>{$('#modalNovo').classList.remove('open'); document.body.style.overflow='auto';};
  $('#modalNovo').addEventListener('click',e=>{if(e.target.id==='modalNovo'){ $('#modalNovo').classList.remove('open'); document.body.style.overflow='auto'; }});
  $('#modalNovo').querySelector('.panel').addEventListener('wheel',e=>e.stopPropagation(),{passive:false});
  $('#btnCriar').onclick=async()=>{ $('#novoErr').textContent=''; const d={titulo:$('#inpTitulo').value.trim()||'Sem título',genero:$('#selGenero').value,nucleos:$('#inpNucleos').value.trim(),caps:Math.min(10,Math.max(1,parseInt($('#inpCaps').value||'10'))),p1:$('#selP1').value==='Sim',enredo:$('#txtEnredo').value.trim()}; const r=blankR(d); APP.state.roteiros.unshift(r); await dbPut(r); renderList(); $('#modalNovo').classList.remove('open'); document.body.style.overflow='auto'; gerarCapitulo(r,1); };
}

(async function(){ APP.state.db=await openDB(); APP.state.roteiros=await dbAll(); renderList(); wireUI(); if('speechSynthesis' in window){window.speechSynthesis.onvoiceschanged=()=>{};} })();
