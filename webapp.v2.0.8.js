/* HistorIA v2.0.8 minimal UI — tutorial manual + terms */
(function(){
const $=s=>document.querySelector(s);
const key="AIzaSyBrcPS9mYDqnEeseSeb5huoM0kZ0JcszTM";

function ready(f){ document.readyState!=='loading'?f():document.addEventListener('DOMContentLoaded',f); }

ready(()=>{
  const tut=document.querySelector('#tutorial');
  function showTut(){ tut.classList.remove('hidden'); }
  function hideTut(){ tut.classList.add('hidden'); }
  hideTut();
  document.querySelector('#btnTutorial').onclick=showTut;
  document.querySelector('#tutorial_close').onclick=hideTut;
  tut.addEventListener('click',e=>{ if(e.target===tut) hideTut(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') hideTut(); });

  const terms=document.querySelector('#terms');
  if(localStorage.getItem('hx_terms_accepted')!=='1') terms.classList.remove('hidden');
  document.querySelector('#terms_accept').onchange=()=>{
     document.querySelector('#terms_ok').disabled = !document.querySelector('#terms_accept').checked;
  };
  document.querySelector('#terms_ok').onclick=()=>{
     localStorage.setItem('hx_terms_accepted','1');
     terms.classList.add('hidden');
  };
});
})();