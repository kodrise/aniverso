/**
 * Skeleton shimmer — placeholders cinza animados enquanto os dados da API chegam.
 * Silencioso: se o container não existir, nada acontece.
 */
window.Skeleton = (function () {
  function preencher(id, quantidade, template) {
    const alvo = document.getElementById(id);
    if (!alvo) return;

    let html = '';
    for (let i = 0; i < quantidade; i++) html += template;
    alvo.innerHTML = html;
  }

  return {
    // grade de cards de anime (home, catálogo, busca, gênero)
    setGrid(id, quantidade = 12) {
      preencher(id, quantidade, `
        <div class="card sk-card" aria-hidden="true">
          <div class="sk sk-capa"></div>
          <div class="info">
            <div class="sk sk-linha"></div>
            <div class="sk sk-linha curta"></div>
          </div>
        </div>`);
    },

    // rail horizontal de episódios (novos episódios da home)
    setRail(id, quantidade = 10) {
      preencher(id, quantidade, `
        <div class="ep-card sk-ep-card" aria-hidden="true">
          <div class="ep-card-thumb"><div class="sk sk-thumb"></div></div>
          <div class="ep-card-body">
            <div class="sk sk-linha"></div>
            <div class="sk sk-linha curta"></div>
          </div>
        </div>`);
    },

    // lista de episódios (detalhe do anime e sidebar do watch)
    setEpGrid(id, quantidade = 6) {
      preencher(id, quantidade, `
        <div class="ep-lista sk-ep-inline" aria-hidden="true">
          <span class="sk ep-lista-num"></span>
          <div class="ep-lista-thumb"><div class="sk sk-thumb-inner"></div></div>
          <div class="ep-lista-body">
            <div class="sk sk-linha media"></div>
          </div>
        </div>`);
    },

    // hero do carrossel da home
    setHero(id) {
      const alvo = document.getElementById(id);
      if (!alvo) return;

      alvo.innerHTML = `
        <div class="hero-card sk-hero" aria-hidden="true">
          <div class="hero-content">
            <div class="hero-capa sk"></div>
            <div class="sk-hero-info">
              <div class="sk sk-linha" style="height: 30px; width: 52%"></div>
              <div class="sk sk-pill" style="width: 128px"></div>
              <div class="sk sk-linha curta"></div>
              <div class="sk sk-linha media"></div>
            </div>
          </div>
        </div>`;
    },

    // pinta a página inteira de uma vez — todos os containers conhecidos
    pintarPagina() {
      const ids = [
        'hero', 'eps-novos', 'grid-recentes', 'grid-top', 'grid-filmes', 'grid-dub',
        'grid-animes', 'grid-genero', 'resultados', 'eps'
      ];
      for (const id of ids) {
        if (!document.getElementById(id)) continue;
        if (id === 'hero') this.setHero('hero');
        else if (id === 'eps-novos') this.setRail('eps-novos', 10);
        else if (id === 'eps') this.setEpGrid('eps', 6);
        else this.setGrid(id, 12);
      }
    }
  };
})();
