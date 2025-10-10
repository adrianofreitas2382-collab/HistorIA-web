
// HistorIA v2.0.13 — único arquivo JS (estrutura base 1.9.3 preservada + melhorias)
(() => {
const VERSION = 'v2.0.13';
// Licença embutida (Google AI Studio)
const GEMINI_KEY = 'AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM';
const GEMINI_MODEL = 'gemini-1.5-pro';
const DB_KEY = 'historIA_db';

// ---------- Estado & Persistência ----------
let state = loadDB();
function loadDB(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return { version: VERSION, projetos: [] };
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(state)); }

function addProjeto(p){ state.projetos.push(p); saveDB(); renderLista(); }
function getProjeto(id){ return state.projetos.find(x=>x.id===id); }

// ---------- Util ----------
const $ = sel => document.querySelector(sel);
function show(id, on=true){ const el=$(id); if(!el) return; el.classList[on?'add':'remove']('show'); }
function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e; }
function uid(){ return 'p'+Math.random().toString(36).slice(2,8); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// ---------- UI principal ----------
const lista = $('#lista');
const dlgNovo = $('#dlgNovo');
const dlgLeitor = $('#dlgLeitor');
const dlgTut = $('#dlgTut');

$('#btnTutorial').onclick = ()=> show('#dlgTut', true);
$('#fecharTut').onclick = ()=> show('#dlgTut', false);

$('#btnNovo').onclick = ()=> show('#dlgNovo', true);
$('#fecharNovo').onclick = ()=> show('#dlgNovo', false);

function renderLista(){
  lista.innerHTML='';
  if(!state.projetos.length){
    const empty = el('div','ghost','Nenhum roteiro ainda.');
    lista.append(empty);
    return;
  }
  state.projetos.forEach(p=>{
    const item=el('div','item');
    const left=el('div','left');
    left.innerHTML = `<div><b>${p.titulo}</b> — ${p.genero} • ${p.capitulos} caps</div>
    <div class="meta">Núcleos: ${p.nucleos.join(', ')}</div>`;
    const row=el('div','row');
    const abrir=el('button','btn','Abrir');
    abrir.onclick = ()=> abrirLeitor(p.id);
    const excluir=el('button','badge','Excluir');
    excluir.onclick=()=>{
      state.projetos = state.projetos.filter(x=>x.id!==p.id);
      saveDB(); renderLista();
    };
    row.append(abrir, excluir);
    item.append(left,row);
    lista.append(item);
  });
}
renderLista();

// ---------- Criação de projeto ----------
$('#okNovo').onclick = async () => {
  const titulo = $('#fldTitulo').value.trim()||'Sem título';
  const genero = $('#fldGenero').value;
  const nucleos = $('#fldNucleos').value.split(',').map(s=>s.trim()).filter(Boolean);
  const capitulos = Math.max(1, Math.min(10, parseInt($('#fldCaps').value||'10',10)));
  const enredo = $('#fldEnredo').value.trim();
  const primeiraPessoa = $('#chk1p').checked;

  const p = {
    id: uid(), titulo, genero, nucleos, capitulos, enredo, primeiraPessoa,
    biblia: '', capitulosGerados: [], pos: 0
  };
  addProjeto(p);
  show('#dlgNovo', false);
  // Gera bíblia + capítulo 1
  abrirLeitor(p.id, true);
};

// ---------- Leitor ----------
let capAtual = null;
async function abrirLeitor(id, gerarSeNecessario=false){
  const p = getProjeto(id); if(!p) return;
  capAtual = { projetoId:id, capIndex: p.pos||0 };
  await ensureCapitulo(p, capAtual.capIndex, gerarSeNecessario);
  renderCapitulo(p, capAtual.capIndex);
  show('#dlgLeitor', true);
}

$('#btnVoltar').onclick = ()=> show('#dlgLeitor', false);
$('#btnAvancar').onclick = async ()=>{
  const p = getProjeto(capAtual.projetoId);
  if(capAtual.capIndex < p.capitulos-1){
    capAtual.capIndex++;
    p.pos = capAtual.capIndex;
    saveDB();
    await ensureCapitulo(p, capAtual.capIndex, true);
    renderCapitulo(p, capAtual.capIndex);
  }else{
    alert('Fim da temporada.');
  }
};

function renderCapitulo(p, idx){
  const cap = p.capitulosGerados[idx];
  $('#capTitulo').textContent = `Capítulo ${idx+1}`;
  $('#capTexto').textContent = cap.texto;
  renderDecisoes('#ponto50', cap.dec50, idx, 0.5, p);
  renderDecisoes('#ponto90', cap.dec90, idx, 0.9, p);
}

function renderDecisoes(anchor, bloco, idx, perc, p){
  const host = $(anchor); host.innerHTML='';
  const box = el('div','');
  box.innerHTML = `<div style="margin:8px 0 6px"><span class="kbd">${Math.round(perc*100)}%</span> — Escolhas</div>`;
  const row = el('div','row');
  bloco.opcoes.forEach((op,i)=>{
    const card = el('div','option');
    card.innerHTML = `<h4><span class="icon">${['🧭','🤝','⚠️'][i%3]}</span>Opção ${'ABC'[i]}</h4><div>${op}</div>
      <div class="row" style="margin-top:8px"><button class="btn">Escolher</button></div>`;
    card.querySelector('button').onclick = ()=>{
      bloco.escolhida = i;
      alert(`Você escolheu: Opção ${'ABC'[i]}`);
    };
    row.append(card);
  });
  const refresh = el('button','badge','🔄 Novas opções');
  refresh.onclick = async ()=>{
    bloco.opcoes = await gerarOpcoes(p, idx, perc, p.primeiraPessoa);
    renderDecisoes(anchor, bloco, idx, perc, p);
  };
  box.append(row, el('div','row',''), refresh);
  host.append(box);
}

// ---------- Geração (Gemini com fallback offline) ----------
async function ensureCapitulo(p, idx, gerar){
  if(!p.biblia && gerar){
    p.biblia = await gerarBiblia(p);
    saveDB();
  }
  if(!p.capitulosGerados[idx] && gerar){
    p.capitulosGerados[idx] = await gerarCapitulo(p, idx);
    saveDB();
    // Pre-gerar próximo em background
    if(idx+1 < p.capitulos && !p.capitulosGerados[idx+1]){
      gerarCapitulo(p, idx+1).then(c=>{
        p.capitulosGerados[idx+1]=c; saveDB();
      });
    }
  }
}

function promptBiblia(p){
  return `Crie a BÍBLIA de uma temporada com ${p.capitulos} capítulos, gênero ${p.genero}.
  Use todos os núcleos: ${p.nucleos.join(', ')}.
  Enredo-guia (≈50%): ${p.enredo||'(crie com liberdade e coerência)'}
  Estruture personagens, arcos por capítulo e tensão crescente.
  Escreva conciso (500-700 palavras), sem repetir frases vazias.`;
}

function promptCapitulo(p, idx){
  const persona = p.primeiraPessoa ? "Escreva em PRIMEIRA pessoa (eu), protagonista ativo; finais precoces são possíveis." : "Escreva em TERCEIRA pessoa.";
  return `Com base na BÍBLIA: ${p.biblia.slice(0,2000)}
  Escreva o CAPÍTULO ${idx+1} (~15 minutos de leitura). ${persona}
  Regras: desenvolver enredo; usar núcleos (${p.nucleos.join(', ')}); evitar clichês como "o ar ficou pesado".
  Insira dois pontos de decisão: em 50% e em 90%. NÃO liste escolhas no corpo.
  Ao final, retorne JSON com:
  { "texto": "capítulo", "dec50": ["A","B","C"], "dec90": ["A","B","C"] }`;
}

async function geminiRequest(prompt){
  try{
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const body = { contents: [{ role:"user", parts:[{text: prompt}]}] };
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    const txt = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join(' ') || '';
    return txt;
  }catch(e){
    console.warn('Gemini falhou, usando fallback:', e);
    return null;
  }
}

async function gerarBiblia(p){
  const txt = await geminiRequest(promptBiblia(p));
  if(txt) return txt;
  // Fallback breve
  return `Bíblia resumida para "${p.titulo}". Núcleos: ${p.nucleos.join(', ')}.
Personagens principais definidos, conflitos entrelaçados. Arcos por capítulo planejam viradas
em 50% e 90% de cada episódio, culminando em final coerente.`;
}

function pick(arr, n=3){
  const a = [...arr]; const out=[];
  while(a.length && out.length<n){ out.push(a.splice(Math.floor(Math.random()*a.length),1)[0]); }
  return out;
}

async function gerarCapitulo(p, idx){
  const txt = await geminiRequest(promptCapitulo(p, idx));
  if(txt){
    try{
      // tenta parsear JSON se vier
      const m = txt.match(/\{[\s\S]*\}$/);
      if(m){
        const j = JSON.parse(m[0]);
        return { texto: j.texto || txt, dec50: { opcoes: j.dec50||[], escolhida:null }, dec90: { opcoes: j.dec90||[], escolhida:null } };
      }
    }catch{}
    // sem JSON, cria opções
    return { texto: txt, dec50: { opcoes: await gerarOpcoes(p, idx, .5, p.primeiraPessoa), escolhida:null },
                     dec90: { opcoes: await gerarOpcoes(p, idx, .9, p.primeiraPessoa), escolhida:null } };
  }
  // Fallback offline simples
  const base = `Capítulo ${idx+1}. Desenvolvimento do enredo conforme a bíblia. Conflitos práticos, diálogos e ações avançam a história.`;
  return {
    texto: base + '\n\n(Conteúdo gerado offline devido à indisponibilidade da IA.)',
    dec50: { opcoes: await gerarOpcoes(p, idx, .5, p.primeiraPessoa), escolhida:null },
    dec90: { opcoes: await gerarOpcoes(p, idx, .9, p.primeiraPessoa), escolhida:null }
  };
}

async function gerarOpcoes(p, idx, perc, primeira){
  const prompt = `Gere 3 opções curtas (A/B/C) para um ponto de decisão em ${Math.round(perc*100)}% do capítulo ${idx+1}.
  Contexto da bíblia: ${p.biblia.slice(0,800)}. Estilo: ${primeira?'primeira pessoa':'terceira pessoa'}.
  As opções devem ser divisoras do que acabou de ocorrer, realistas e coerentes.
  Responda apenas com as 3 frases, separadas por \\n.`;
  const txt = await geminiRequest(prompt);
  if(txt){
    const lines = txt.split('\\n').map(s=>s.replace(/^[ABC][\\)\\.\\-]\\s*/,'').trim()).filter(Boolean);
    if(lines.length>=3) return lines.slice(0,3);
  }
  const seed = [
    'Investigar discretamente a pista recém-descoberta.',
    'Confrontar o aliado e exigir respostas agora.',
    'Recuar e observar mais um pouco antes de agir.'
  ];
  return pick(seed,3);
}

// ---------- Narração (Web Speech) ----------
const voiceSel = $('#voiceSel');
const rate = $('#velocidade'), vol = $('#volume');
const velTxt = $('#velTxt'), volTxt = $('#volTxt');
const sldVel = $('#sldVel'), sldVol = $('#sldVol');
$('#btnNarrar').onclick = ()=> narrar($('#capTexto').textContent);
$('#btnParar').onclick = ()=> window.speechSynthesis.cancel();

[voiceSel, rate, vol].forEach(el=>{
  el.onchange = ()=>{
    sldVel.classList.add('show'); sldVol.classList.add('show');
    velTxt.textContent = (+rate.value).toFixed(2)+'x';
    volTxt.textContent = Math.round(+vol.value*100)+'%';
  };
});

function narrar(texto){
  if(!('speechSynthesis' in window)){ alert('Seu navegador não suporta narração.'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.rate = +rate.value; u.volume = +vol.value;
  const voices = window.speechSynthesis.getVoices();
  if(voiceSel.value==='Masculina'){
    const m = voices.find(v=>/pt|br/i.test(v.lang) && /male|masc|brasileiro/i.test(v.name)) || voices.find(v=>/pt|br/i.test(v.lang));
    if(m) u.voice = m;
  }else if(voiceSel.value==='Feminina'){
    const f = voices.find(v=>/pt|br/i.test(v.lang) && /female|fem|brasileira/i.test(v.name)) || voices.find(v=>/pt|br/i.test(v.lang));
    if(f) u.voice = f;
  }else{
    const any = voices.find(v=>/pt|br/i.test(v.lang));
    if(any) u.voice = any;
  }
  window.speechSynthesis.speak(u);
}
window.speechSynthesis?.addEventListener('voiceschanged', ()=>{});

// ---------- PWA ----------
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

})();