// nav.js: injeta um header simples em páginas que não o tenham
(function(){
  function hasHeader(){
    return !!document.querySelector('header.site-header');
  }

  function createHeader(){
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="container">
        <h1>Kanban Peças</h1>
        <div class="site-actions">
          <a class="btn btn-muted" href="/">Início</a>
          <a class="btn" href="/auth/login.html">Entrar</a>
        </div>
      </div>
    `;
    // insere no topo do body
    document.body.insertBefore(header, document.body.firstChild);
  }

  // Executa após DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ if(!hasHeader()) createHeader(); });
  } else {
    if(!hasHeader()) createHeader();
  }
})();
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
