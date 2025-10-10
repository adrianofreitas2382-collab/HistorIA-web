/* HistorIA v2.0.12 — auto-geração + correções */
const API_KEY = "AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM";
const GEMINI_MODEL = "gemini-1.5-pro";
const LS_KEY = "historia.stories.v2";
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

let stories = loadStories();
renderList();

/* UI wiring */
$("#btnNovo").onclick = ()=> $("#dlgNovo").showModal();
$("#fecharNovo").onclick = ()=> $("#dlgNovo").close();
$("#salvarNovo").onclick = onSaveAndGenerate;
$("#btnTutorial").onclick = ()=> $("#dlgTut").showModal();
$("#fecharTut").onclick = ()=> $("#dlgTut").close();
$("#lFechar").onclick = ()=> $("#dlgLeitor").close();

function loadStories(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); }catch(e){ return []; } }
function saveStories(){ localStorage.setItem(LS_KEY, JSON.stringify(stories)); }

function renderList(){
  const box = $("#lista"); box.innerHTML = "";
  if(!stories.length){ box.innerHTML = `<div class="muted">Nenhum roteiro ainda.</div>`; return; }
  for(const s of stories){
    const div = document.createElement('div'); div.className="story-line";
    div.innerHTML = `<div>
        <div><b>${esc(s.titulo)}</b> — ${esc(s.genero)} • ${s.capitulos} caps</div>
        <div class="muted">Núcleos: ${esc(s.nucleos)}</div>
      </div>
      <div class="row">
        <button class="sec" data-id="${s.id}" data-act="open">Abrir</button>
        <button class="sec" data-id="${s.id}" data-act="del">Excluir</button>
      </div>`;
    box.appendChild(div);
  }
  box.onclick = async (ev)=>{
    const b = ev.target.closest("button"); if(!b) return;
    const id = b.dataset.id, act=b.dataset.act;
    const idx = stories.findIndex(x=>x.id===id);
    if(idx<0) return;
    if(act==="del"){ stories.splice(idx,1); saveStories(); renderList(); return; }
    if(act==="open"){ openReader(stories[idx]); }
  };
}

function esc(s){ return (s??"").toString().replace(/[&<>]/g,m=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\"}[m])); }

async function onSaveAndGenerate(){
  const titulo = $("#fTitulo").value.trim();
  const genero = $("#fGenero").value;
  const capitulos = Math.max(1, Math.min(10, parseInt($("#fCaps").value||"10",10)));
  const nucleos = $("#fNucleos").value.trim();
  const enredo = $("#fEnredo").value.trim();
  const primeira = $("#fPrimeira").checked;
  if(!titulo){ alert("Informe um título."); return; }
  const story = {
    id: crypto.randomUUID(), titulo, genero, capitulos,
    nucleos, enredo, primeira,
    createdAt: Date.now(), bible:null, chapters:[]
  };
  stories.unshift(story); saveStories(); renderList();
  $("#dlgNovo").close();
  openReader(story);
  // Auto-gerar bíblia e Capítulo 1
  try{
    await ensureBibleAndChapter(story);
    saveStories(); renderReader(story);
  }catch(e){
    console.error(e);
    alert("Falha ao gerar: "+(e.message||e));
  }
}

function openReader(story){
  renderReader(story);
  $("#dlgLeitor").showModal();
}
function renderReader(story){
  $("#lh").textContent = `${story.titulo} — Capítulo ${story.chapters.length?story.chapters.length:1}`;
  const ltxt = $("#ltxt"); ltxt.innerHTML="";
  const lopts = $("#lopts"); lopts.innerHTML="";
  $("#ldown").innerHTML = "";
  if(story.bible){
    const p = document.createElement("p"); p.className="muted";
    p.textContent = "Bíblia criada. Gerando/mostrando capítulo...";
    ltxt.appendChild(p);
  }
  const chap = story.chapters[story.chapters.length-1];
  if(chap){
    ltxt.innerHTML = `<div class="card">${chap.textIntro||""}</div>`;
    if(chap.dec50){ lopts.appendChild(optsBlock(chap.dec50, story, "50")); }
    if(chap.textMid){ ltxt.innerHTML += `<div class="card">${chap.textMid}</div>`; }
    if(chap.dec90){ lopts.appendChild(optsBlock(chap.dec90, story, "90")); }
    if(chap.textEnd){ ltxt.innerHTML += `<div class="card"><b>Conclusão:</b> ${chap.textEnd}</div>`; }
  }else{
    ltxt.innerHTML = `<div class="muted">Preparando capítulo...</div>`;
  }
}

function optsBlock(dec, story, tag){
  const wrap = document.createElement("div"); wrap.className="card";
  const title = tag==="50"?"Decisão (50%)":"Decisão (90%)";
  wrap.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b>${title}</b><button class="sec" data-re="${tag}">🔄 Novas opções</button></div>`;
  const grid = document.createElement("div"); grid.className="grid"; grid.style.marginTop="8px";
  dec.options.forEach((op,i)=>{
    const b = document.createElement("button");
    b.className="sec"; b.textContent = `Opção ${"ABC"[i]} — ${op}`;
    b.onclick = async()=>{
      await applyDecision(story, tag, op);
      saveStories(); renderReader(story);
    };
    grid.appendChild(b);
  });
  wrap.appendChild(grid);
  wrap.querySelector("button[data-re]").onclick = async()=>{
    await regenOptions(story, tag);
    saveStories(); renderReader(story);
  };
  return wrap;
}

async function ensureBibleAndChapter(story){
  if(!story.bible){
    $("#ldown").innerHTML = `<span class="spinner"></span> <span class="muted">Gerando bíblia...</span>`;
    story.bible = await genBible(story);
  }
  if(!story.chapters.length){
    $("#ldown").innerHTML = `<span class="spinner"></span> <span class="muted">Gerando Capítulo 1...</span>`;
    const ch = await genChapter(story, 1, null, null);
    story.chapters.push(ch);
  }
  $("#ldown").textContent = "Pronto";
}

async function regenOptions(story, where){
  const ch = story.chapters[story.chapters.length-1];
  const context = buildContext(story, ch);
  const prompt = `Regenere APENAS as opções de decisão do ponto ${where} por coerência com o trecho anterior. 
Responda JSON: {"options":["texto1","texto2","texto3"]}`;
  const out = await callGemini(context+"\\n\\n"+prompt, true);
  ch[where==="50"?"dec50":"dec90"] = { options: out.options?.slice(0,3) || ["Rever","Pausar","Investigar"] };
}

async function applyDecision(story, where, choice){
  const idx = story.chapters.length-1;
  const ch = story.chapters[idx];
  const context = buildContext(story, ch);
  if(where==="50"){
    $("#ldown").innerHTML = `<span class="spinner"></span> <span class="muted">Continuando (após 50%)...</span>`;
    const mid = await callGemini(context+`\\n\\nDecisão escolhida (50%): ${choice}\\nContinue até ~90% mantendo o ritmo e coerência. Responda JSON: {"mid":"texto"}`, true);
    ch.textMid = mid.mid || "";
    const dec = await callGemini(buildContext(story, ch)+`\\nGere 3 opções coerentes para o ponto de ~90%. Responda JSON: {"options":["a","b","c"]}`, true);
    ch.dec90 = { options: dec.options?.slice(0,3) || ["Enfrentar","Recuar","Negociar"] };
  }else{
    $("#ldown").innerHTML = `<span class="spinner"></span> <span class="muted">Finalizando...</span>`;
    const end = await callGemini(context+`\\n\\nDecisão escolhida (90%): ${choice}\\nProduza o desfecho do capítulo. Responda JSON: {"end":"texto"}`, true);
    ch.textEnd = end.end || "";
    if(story.chapters.length < story.capitulos){
      genChapter(story, story.chapters.length+1, null, null).then(nc=>{
        story.chapters.push(nc); saveStories();
      }).catch(console.warn);
    }
  }
}

function buildContext(story, ch){
  return `Título: ${story.titulo}
Gênero: ${story.genero}
Capítulos totais: ${story.capitulos}
Primeira pessoa: ${story.primeira? "Sim":"Não"}
Núcleos: ${story.nucleos}
Enredo: ${story.enredo}
Bíblia: ${story.bible?.synopsis||""}
Capítulo corrente:
- Intro: ${ch?.textIntro||""}
- Mid: ${ch?.textMid||""}
- End: ${ch?.textEnd||""}`;
}

async function genBible(story){
  const prompt = `Crie a "bíblia" da temporada com base nos dados abaixo.
Use tom ${story.primeira? "em primeira pessoa (o leitor narra)":"em terceira pessoa"}. 
Cubra: sinopse, personagens principais com 2-3 traços, arcos de temporada, temas, cenários, e tom.
Responda JSON: {"synopsis":"...","cast":[{"nome":"...","sobre":"..."}],"arcos":["...","..."]}`;
  const out = await callGemini(`Dados: Título=${story.titulo}; Gênero=${story.genero}; Núcleos=${story.nucleos}; Enredo=${story.enredo}.\\n\\n${prompt}`, true);
  return out;
}

async function genChapter(story, num, prevChoice50, prevChoice90){
  const prompt = `Escreva o Capítulo ${num} (~15 minutos de leitura). 
Estrutura obrigatória em JSON:
{
 "intro":"texto até ~50%",
 "dec50":{"options":["A","B","C"]},
 "mid":"continuação após a escolha de 50% (mantenha coesão)",
 "dec90":{"options":["A","B","C"]},
 "end":"desfecho coerente"
}
Regras: usar os núcleos e a bíblia; ritmo televisivo; diálogos naturais; nada de frases genéricas sobre "atmosfera densa"; mantenha causalidade.
${story.primeira? "Narrar em primeira pessoa (o leitor é o protagonista). Possibilidade de fim precoce é aceitável se plausível.":""}`;
  const seed = `Contexto da bíblia:\\n${JSON.stringify(story.bible).slice(0,2000)}\\n`;
  const out = await callGemini(seed+prompt, true);
  return {
    n:num,
    textIntro: out.intro||"",
    dec50: { options: (out.dec50?.options||[]).slice(0,3) },
    textMid: out.mid||"",
    dec90: { options: (out.dec90?.options||[]).slice(0,3) },
    textEnd: out.end||""
  };
}

async function callGemini(prompt, expectJson=false){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents:[{role:"user", parts:[{text: prompt + (expectJson? "\\n\\nRetorne SOMENTE JSON válido.":"")}]}],
    generationConfig: { temperature: 0.9, topP: 0.95, topK: 40, maxOutputTokens: 2048 }
  };
  let res;
  try{
    res = await fetch(url, {
      method:"POST",
      mode:"cors",
      headers:{ "content-type":"application/json" },
      body: JSON.stringify(body)
    });
  }catch(e){
    throw new Error("Falha de rede (fetch): "+e.message);
  }
  if(!res.ok){
    const tx = await res.text();
    throw new Error(`HTTP ${res.status} — ${tx.slice(0,180)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("") || "";
  if(!expectJson) return { text };
  const json = tryParseJson(text);
  if(json) return json;
  const m = text.match(/\{[\s\S]*\}$/);
  if(m){ const j = tryParseJson(m[0]); if(j) return j; }
  return { options:["Rever contexto","Pausar e observar","Dialogar com aliado"], intro:text };
}
function tryParseJson(s){ try{ return JSON.parse(s); }catch(_){ return null; } }
