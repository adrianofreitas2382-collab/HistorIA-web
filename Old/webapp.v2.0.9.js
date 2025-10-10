/* HistorIA v2.0.9 minimal modal control */
(function(){
  const $ = s => document.querySelector(s);
  function onReady(fn){document.readyState!=='loading'?fn():document.addEventListener('DOMContentLoaded',fn);}

  onReady(()=>{
    // ----- Tutorial (manual only)
    const tutorial = $('#tutorial');
    const btnTutorial = $('#btnTutorial');
    const btnTutClose = $('#tutorial_close');

    function openTutorial(){ tutorial.classList.remove('hidden'); }
    function closeTutorial(){ tutorial.classList.add('hidden'); }

    // ensure starts hidden
    tutorial.classList.add('hidden');
    btnTutorial.addEventListener('click', openTutorial);
    btnTutClose.addEventListener('click', closeTutorial);
    tutorial.addEventListener('click', (e)=>{ if(e.target===tutorial) closeTutorial(); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeTutorial(); });

    // ----- Terms (must accept first time)
    const terms = $('#terms');
    const chk = $('#terms_accept');
    const ok = $('#terms_ok');

    function showTerms(){ terms.classList.remove('hidden'); }
    function hideTerms(){ terms.classList.add('hidden'); }

    if(localStorage.getItem('hx_terms_accepted')!=='1') showTerms();
    chk.addEventListener('change', ()=>{ ok.disabled = !chk.checked; });
    ok.addEventListener('click', ()=>{ localStorage.setItem('hx_terms_accepted','1'); hideTerms(); });

    console.log('HistorIA 2.0.9 UI loaded. License (Gemini) embedded.');
  });
})();