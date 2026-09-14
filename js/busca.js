const BUSCA_TEXTO_VAZIO = 'Nenhum anime encontrado';
const BUSCA_TEXTO_ERRO = 'Não foi possível carregar';

function escapar(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ehReal = (anime) => Boolean(anime.titulo) && (anime.titulo.includes(' ') || !anime.titulo.includes('-'));

function cardHTML(anime) {
  const capa = anime.capa ? ` src="${escapar(anime.capa)}"` : '';
  const meta = [`${anime.episodes_count} eps`, anime.ano].filter(Boolean).join(' · ');

  return `<a href="/anime.html?slug=${encodeURIComponent(anime.slug)}" class="card">
      <img${capa} alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="info">
        <div class="titulo">${escapar(anime.titulo)}</div>
        <div class="meta">${escapar(meta)}</div>
      </div>
    </a>`;
}

function mostrarVazio(texto) {
  const vazio = document.getElementById('vazio');
  vazio.textContent = texto;
  vazio.hidden = false;
}

function mostrarFormulario() {
  document.getElementById('busca-vazia').hidden = false;
  document.getElementById('titulo-resultados').hidden = true;
}

async function carregarBusca() {
  const termo = (new URLSearchParams(window.location.search).get('q') ?? '').trim();

  if (!termo) {
    mostrarFormulario();
    return;
  }

  document.getElementById('termo').textContent = termo;
  document.title = `Busca: ${termo} — Aniverso`;

  if (typeof AniversoAPI === 'undefined') {
    mostrarVazio(BUSCA_TEXTO_ERRO);
    return;
  }

  const dados = await AniversoAPI.animes({ busca: termo, per_page: 40 });
  const animes = (dados?.animes ?? []).filter(ehReal).filter((anime) => anime.episodes_count > 0);

  if (!animes.length) {
    mostrarVazio(dados ? BUSCA_TEXTO_VAZIO : BUSCA_TEXTO_ERRO);
    return;
  }

  document.getElementById('resultados').innerHTML = animes.map(cardHTML).join('');
}

document.addEventListener('DOMContentLoaded', carregarBusca);
