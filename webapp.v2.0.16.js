
(function(){
  const $ = s=>document.querySelector(s);
  const listEl = $('#list');
  const key='historiaIA.stories';
  const load=()=>{try{return JSON.parse(localStorage.getItem(key))||[]}catch(e){return []}};
  const save=a=>localStorage.setItem(key,JSON.stringify(a));
  const stories=load();
  function render(){
    listEl.innerHTML='';
    if(!stories.length){
      const p=document.createElement('p');p.style.color='#aab1bd';p.textContent='Nenhum roteiro ainda. Clique em "Criar novo roteiro".';listEl.appendChild(p);return;
    }
    stories.forEach((s,i)=>{
      const c=document.createElement('div');c.className='story';
      c.innerHTML=`<strong>${s.title}</strong> — ${s.genre} • ${s.caps} caps
      <div style="color:#aab1bd; margin-top:6px">Núcleos: ${s.nucleos}</div>
      <div style="margin-top:10px; display:flex; gap:10px">
        <button class="btn" data-open="${i}">Abrir</button>
        <button class="btn btn-secondary" data-del="${i}">Excluir</button>
      </div>`;
      listEl.appendChild(c);
    });
  }
  render();
  const modal=$('#modal'),backdrop=$('#backdrop'),newBtn=$('#newBtn'),cancelBtn=$('#cancelBtn'),createBtn=$('#createBtn');
  const openModal=()=>{modal.classList.add('open');backdrop.classList.add('open');document.documentElement.classList.add('modal-open');$('#title').focus()}
  const closeModal=()=>{modal.classList.remove('open');backdrop.classList.remove('open');document.documentElement.classList.remove('modal-open')}
  newBtn.addEventListener('click',openModal);cancelBtn.addEventListener('click',closeModal);backdrop.addEventListener('click',closeModal);
  backdrop.addEventListener('touchmove',e=>{e.preventDefault()},{passive:false});
  createBtn.addEventListener('click',()=>{
    const s={title:$('#title').value.trim()||'Sem título',genre:$('#genre').value,nucleos:$('#nucleos').value.trim(),caps:parseInt($('#caps').value||'10',10),fpessoa:$('#fpessoa').value==='Sim',seed:$('#seed').value.trim(),status:'gerando…'};
    stories.push(s);save(stories);render();closeModal();
  });
  listEl.addEventListener('click',e=>{
    const o=e.target.getAttribute('data-open');const d=e.target.getAttribute('data-del');
    if(o){alert('Leitura/continuação será aberta aqui (placeholder).')}
    if(d){stories.splice(parseInt(d,10),1);save(stories);render()}
  });
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
})();
