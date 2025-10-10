/* HistorIA v2.0.3 */
(function(){
const $=s=>document.querySelector(s);
function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }

function openLicense(){ $('#terms')?.classList.add('hidden'); $('#license').classList.remove('hidden'); }
function closeLicense(e){ if(e) e.preventDefault(); $('#license').classList.add('hidden'); }
function saveLicense(e){
  if(e) e.preventDefault();
  localStorage.setItem('hx_license_key',$('#licenseKey').value.trim());
  localStorage.setItem('hx_model_key',$('#modelKey').value.trim()||'gemini-1.5-pro');
  ['gh_owner','gh_repo','gh_branch','gh_token'].forEach(id=>{
    const el=document.getElementById(id); if(el) localStorage.setItem('hx_'+id, el.value.trim());
  });
  closeLicense(); try{ alert('Licença salva com sucesso.'); }catch(_){}
}

function openTerms(){ $('#terms').classList.remove('hidden'); }
function closeTerms(){ $('#terms').classList.add('hidden'); }

ready(()=>{
  $('#btnSettings')?.addEventListener('click', openLicense);
  $('#lic_ok')?.addEventListener('click', saveLicense);
  $('#lic_cancel')?.addEventListener('click', closeLicense);
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

  // Sliders UI (abrem ao clicar)
  const wrapRate = $('#wrapRate'), wrapVol = $('#wrapVol');
  wrapRate?.querySelector('#pillRate')?.addEventListener('click',()=>wrapRate.classList.toggle('open'));
  wrapVol?.querySelector('#pillVol')?.addEventListener('click',()=>wrapVol.classList.toggle('open'));
  const rate = $('#rateSlider'), vol = $('#volSlider');
  rate?.addEventListener('input',()=>$('#rateVal').textContent=(+rate.value).toFixed(2)+'x');
  vol?.addEventListener('input',()=>$('#volVal').textContent=Math.round(vol.value*100)+'%');
  $('#muteBtn')?.addEventListener('click',()=>{ if(vol){ vol.value=0; vol.dispatchEvent(new Event('input')); }});

  console.log('HistorIA v2.0.3 carregado');
});
})();