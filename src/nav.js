// simple nav toggle used by header in pages
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.querySelector('.nav-toggle');
  if(!btn) return;
  const nav = document.querySelector('.nav');
  btn.addEventListener('click', ()=>{
    if(!nav) return;
    if(nav.style.display === 'block') nav.style.display = '';
    else nav.style.display = 'block';
  });
});
