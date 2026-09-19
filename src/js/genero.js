(function () {
const GENERO_TEXTO_VAZIO = 'Nenhum anime nesse gênero';
const GENERO_TEXTO_ERRO = 'Não foi possível carregar';

function escapar(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cardHTML(anime) {
  const capa = anime.capa ? ` src="${escapar(anime.capa)}"` : '';
  const partes = [];

  if (anime.episodes_count === 1) partes.push('1 episódio');
  else if (anime.episodes_count > 1) partes.push(`${anime.episodes_count} episódios`);

  if (anime.ano) partes.push(anime.ano);

  const meta = partes.join(' · ');

  return `<a href="/anime?slug=${encodeURIComponent(anime.slug)}" class="card">
      <img${capa} alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="info">
        <div class="titulo">${escapar(anime.titulo)}</div>
        <div class="meta">${escapar(meta)}</div>
      </div>
    </a>`;
}

async function carregarGenero() {
  const nome = new URLSearchParams(window.location.search).get('nome');

  if (!nome) {
    (window.irPara || ((u) => location.href = u))('/catalogo');
    return;
  }

  document.getElementById('nome').textContent = nome;
  document.title = `${nome} — Aniverso`;

  const grid = document.getElementById('grid-genero');

  if (typeof AniversoAPI === 'undefined') {
    grid.innerHTML = `<p class="vazio">${GENERO_TEXTO_ERRO}</p>`;
    return;
  }

  Skeleton.setGrid('grid-genero', 12);

  const dados = await AniversoAPI.animes({ genero: nome, per_page: 40 });
  const animes = dados?.animes ?? [];

  if (!animes.length) {
    grid.innerHTML = `<p class="vazio">${dados ? GENERO_TEXTO_VAZIO : GENERO_TEXTO_ERRO}</p>`;
    return;
  }

  document.getElementById('resumo').textContent = `${dados.total} animes`;
  grid.innerHTML = animes.map(cardHTML).join('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', carregarGenero);
} else {
  carregarGenero();
}
})();
