(() => {
  const qs = s => document.querySelector(s);
  const elList = qs('#lista');

  // ===== Modal helpers =====
  const modal = qs('#modal-criar');
  const openCreateModal = () => {
    modal.hidden = false;
    document.body.classList.add('modal-open');
    document.addEventListener('touchmove', blockBgScroll, {passive:false});
    modal.querySelector('input,select,textarea')?.focus();
  };
  const closeCreateModal = () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    document.removeEventListener('touchmove', blockBgScroll, {passive:false});
  };
  const blockBgScroll = (e) => {
    if (e.target.closest('.modal__sheet')) return; // permite rolagem interna
    e.preventDefault(); // bloqueia fundo
  };

  // Eventos do modal
  document.getElementById('btnAbrirCriar').addEventListener('click', openCreateModal);
  document.getElementById('btnCancelar').addEventListener('click', closeCreateModal);
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape'&&!modal.hidden) closeCreateModal(); });

  // ===== Persistência simples com localStorage =====
  const STORAGE_KEY = 'historia-roteiros';
  const load = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const save = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

  function render(){
    const data = load();
    elList.innerHTML = '';
    if(!data.length){
      const hint = document.createElement('div');
      hint.style.opacity = .8;
      hint.textContent = 'Nenhum roteiro ainda. Crie o primeiro.';
      elList.appendChild(hint);
      return;
    }
    for(const r of data){
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <div style="font-weight:800;font-size:18px">${r.titulo} — <span style="opacity:.85">${r.genero}</span> • ${r.capitulos} caps</div>
            <div style="opacity:.8;margin-top:4px">Núcleos: ${r.nucleos}</div>
            <div style="margin-top:8px">
              <span class="chip" style="background:#3a3f52">Status: ${r.status||'criado'}</span>
            </div>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn secondary" data-id="${r.id}" data-act="open">Abrir</button>
            <button class="btn secondary" data-id="${r.id}" data-act="del" style="background:#2a3142">Excluir</button>
          </div>
        </div>`;
      elList.appendChild(card);
    }
  }

  // Criar novo
  document.getElementById('btnCriar').addEventListener('click', () => {
    const novo = {
      id: crypto.randomUUID(),
      titulo: document.getElementById('fTitulo').value.trim() || 'Sem título',
      genero: document.getElementById('fGenero').value,
      nucleos: document.getElementById('fNucleos').value.trim(),
      capitulos: parseInt(document.getElementById('fCapitulos').value||'10',10),
      primeira: document.getElementById('fPrimeira').value,
      enredo: document.getElementById('fEnredo').value.trim(),
      status: 'criado'
    };
    const data = load();
    data.unshift(novo);
    save(data);
    render();
    closeCreateModal();
  });

  // Ações Abrir/Excluir
  elList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]'); if(!btn) return;
    const id = btn.dataset.id, act = btn.dataset.act;
    const data = load();
    const idx = data.findIndex(x=>x.id===id);
    if(idx<0) return;
    if(act==='del'){
      data.splice(idx,1); save(data); render();
    }else if(act==='open'){
      alert('Leitura/continuação será aberta aqui (em construção).');
    }
  });

  // Tutorial placeholder
  document.getElementById('btnTutorial').addEventListener('click', () => {
    alert('Como usar: defina Título, Gênero, Núcleos, Capítulos e Enredo. O botão Criar fica sticky no rodapé do modal. (Hotfix v2.0.15)');
  });

  render();
})();