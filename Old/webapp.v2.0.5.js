/* HistorIA v2.0.5 */
(function(){
const $=s=>document.querySelector(s);
function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }

// License modal
function openLicense(){
  const key = localStorage.getItem('hx_license_key')||'';
  const model = localStorage.getItem('hx_model_key')||'gemini-1.5-pro';
  const owner = localStorage.getItem('hx_gh_owner')||'';
  const repo  = localStorage.getItem('hx_gh_repo')||'';
  const branch= localStorage.getItem('hx_gh_branch')||'main';
  const token = localStorage.getItem('hx_gh_token')||'';
  $('#licenseKey').value = key;
  $('#modelKey').value = model;
  $('#gh_owner').value = owner;
  $('#gh_repo').value  = repo;
  $('#gh_branch').value= branch;
  $('#gh_token').value = token;
  $('#lic_ok').disabled = !key.trim();
  $('#license').classList.remove('hidden');
}
function closeLicense(e){ if(e) e.preventDefault(); $('#license').classList.add('hidden'); }
function saveLicense(e){
  if(e) e.preventDefault();
  const key = $('#licenseKey').value.trim();
  if(!key){ alert('Informe a License Key.'); return; }
  const model = ($('#modelKey').value||'gemini-1.5-pro').trim();
  localStorage.setItem('hx_license_key', key);
  localStorage.setItem('hx_model_key', model);
  ['gh_owner','gh_repo','gh_branch','gh_token'].forEach(id=>{
    const el=document.getElementById(id); if(el) localStorage.setItem('hx_'+id, el.value.trim());
  });
  alert('Licença salva com sucesso.'); closeLicense();
}

// Terms
function openTerms(){ $('#terms').classList.remove('hidden'); }
function closeTerms(){ $('#terms').classList.add('hidden'); }

ready(()=>{
  // Bindings
  $('#btnSettings')?.addEventListener('click', openLicense);
  $('#lic_cancel')?.addEventListener('click', closeLicense);
  $('#lic_ok')?.addEventListener('click', saveLicense);
  $('#licenseKey')?.addEventListener('input', ()=>$('#lic_ok').disabled=!$('#licenseKey').value.trim());
  $('#license')?.addEventListener('click', (ev)=>{ if(ev.target.id==='license') closeLicense(); });

  $('#btnTutorial')?.addEventListener('click', ()=>$('#tutorial').classList.remove('hidden'));
  $('#tutorial_close')?.addEventListener('click', ()=>$('#tutorial').classList.add('hidden'));

  $('#terms_accept')?.addEventListener('change', ()=>$('#terms_ok').disabled=!$('#terms_accept').checked);
  $('#terms_ok')?.addEventListener('click', ()=>{
    localStorage.setItem('hx_terms_accepted','1');
    closeTerms();
    if(!localStorage.getItem('hx_license_key')) openLicense();
  });

  const accepted = localStorage.getItem('hx_terms_accepted')==='1';
  if(!accepted) openTerms();
  else if(!localStorage.getItem('hx_license_key')) openLicense();

  // Minimal navigation
  $('#btnCreate')?.addEventListener('click', ()=>{
    $('#screenMenu').classList.add('hidden');
    $('#screenCreator').classList.remove('hidden');
    $('#btnHome').classList.remove('hidden');
  });
  $('#btnCancel')?.addEventListener('click', ()=>{
    $('#screenCreator').classList.add('hidden');
    $('#screenMenu').classList.remove('hidden');
    $('#btnHome').classList.add('hidden');
  });
  $('#btnHome')?.addEventListener('click', ()=>{
    $('#screenReader').classList.add('hidden');
    $('#screenCreator').classList.add('hidden');
    $('#screenMenu').classList.remove('hidden');
    $('#btnHome').classList.add('hidden');
  });

  // Sliders UI
  const wrapRate = $('#wrapRate'), wrapVol = $('#wrapVol');
  wrapRate?.querySelector('#pillRate')?.addEventListener('click',()=>wrapRate.classList.toggle('open'));
  wrapVol?.querySelector('#pillVol')?.addEventListener('click',()=>wrapVol.classList.toggle('open'));
  const rate = $('#rateSlider'), vol = $('#volSlider');
  rate?.addEventListener('input',()=>$('#rateVal').textContent=(+rate.value).toFixed(2)+'x');
  vol?.addEventListener('input',()=>$('#volVal').textContent=Math.round(vol.value*100)+'%');
  $('#muteBtn')?.addEventListener('click',()=>{ if(vol){ vol.value=0; vol.dispatchEvent(new Event('input')); }});

  console.log('HistorIA v2.0.5 carregado');
});
})();