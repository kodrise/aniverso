const ANIME_ASSISTIDOS_PREFIXO = 'aniverso_assistidos_';
const ANIME_TEXTO_ERRO = 'Anime não encontrado';
const ANIME_STATUS = ['alive', 'dead', 'unknown'];

function escapar(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function assistidos(slug) {
  try {
    const lista = JSON.parse(localStorage.getItem(ANIME_ASSISTIDOS_PREFIXO + slug) ?? '[]');
    return Array.isArray(lista) ? lista.map(Number) : [];
  } catch (erro) {
    return [];
  }
}

function metaLinha(anime) {
  const audio = (anime.audio ?? []).join(', ');
  return [anime.ano, anime.tipo, audio, anime.status].filter(Boolean).join(' · ');
}

function hrefWatch(slug, numero) {
  return `/watch.html?slug=${encodeURIComponent(slug)}&ep=${encodeURIComponent(numero)}`;
}

function generosPills(generos) {
  return (generos ?? [])
    .map((genero) => `<a href="/genero.html?nome=${encodeURIComponent(genero)}">${escapar(genero)}</a>`)
    .join('');
}

function renderDetalhe(anime) {
  const capa = anime.capa
    ? `<img class="capa" src="${escapar(anime.capa)}" alt="" onerror="this.style.visibility='hidden'">`
    : '<img class="capa" alt="">';

  const sinopse = anime.sinopse ? `<p class="sinopse">${escapar(anime.sinopse)}</p>` : '';

  const semEpisodios = anime.episodes_count === 0 || !(anime.episodios ?? []).length;

  const primeiroDisponivel = (anime.episodios || []).find((ep) => ep.status !== 'dead')?.numero || 1;

  const acao = semEpisodios
    ? `<p class="aviso">${icone('info')} Episódios ainda não disponíveis</p>`
    : `<a class="btn-assistir" href="${hrefWatch(anime.slug, primeiroDisponivel)}">${icone('play')} Assistir Ep ${escapar(primeiroDisponivel)}</a>`;

  document.getElementById('detalhe').innerHTML = `<div class="detalhe-wrap">
      ${capa}
      <div>
        <h1 class="page-title">${escapar(anime.titulo)}</h1>
        <div class="meta-linha">${escapar(metaLinha(anime))}</div>
        <div class="generos-pills">${generosPills(anime.generos)}</div>
        ${sinopse}
        ${acao}
      </div>
    </div>`;
}

function epBotao(anime, episodio, vistos) {
  const status = ANIME_STATUS.includes(episodio.status) ? episodio.status : 'unknown';
  const visto = vistos.has(Number(episodio.numero));
  const classes = ['ep-btn', status, visto ? 'watched' : ''].filter(Boolean).join(' ');
  const rotulo = `${visto ? icone('check') : ''}Ep ${escapar(episodio.numero)}`;

  if (status === 'dead') {
    return `<span class="${classes}" title="Episódio indisponível">${rotulo}</span>`;
  }

  return `<a class="${classes}" href="${hrefWatch(anime.slug, episodio.numero)}">${rotulo}</a>`;
}

function renderEpisodios(anime) {
  const lista = document.getElementById('eps-list');
  const episodios = anime.episodios ?? [];

  if (!episodios.length) {
    lista.innerHTML = '<p class="vazio">Nenhum episódio disponível</p>';
    return;
  }

  const vistos = new Set(assistidos(anime.slug));
  lista.innerHTML = episodios.map((episodio) => epBotao(anime, episodio, vistos)).join('');
}

async function preaquecerPlayer(anime) {
  try {
    const alvo = document.getElementById('preload-player');
    if (!alvo || alvo.getAttribute('src')) return;

    const primeiro = (anime.episodios || []).find((episodio) => episodio.status !== 'dead')?.numero;
    if (!primeiro) return;

    const embed = await AniversoAPI.embed(anime.slug, primeiro);
    if (embed?.embed_url) alvo.src = embed.embed_url;
  } catch (erro) {
    console.error('[Aniverso] falha ao pré-aquecer o player', erro);
  }
}

async function carregarAnime() {
  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    window.location = '/404.html';
    return;
  }

  if (typeof AniversoAPI === 'undefined') {
    document.getElementById('detalhe').innerHTML = `<p class="vazio">${ANIME_TEXTO_ERRO}</p>`;
    return;
  }

  const anime = await AniversoAPI.anime(slug);

  if (!anime) {
    document.getElementById('detalhe').innerHTML = `<p class="vazio">${ANIME_TEXTO_ERRO}</p>`;
    document.getElementById('episodios-section').hidden = true;
    return;
  }

  document.title = `${anime.titulo} — Aniverso`;
  renderDetalhe(anime);
  renderEpisodios(anime);

  preaquecerPlayer(anime);
}

document.addEventListener('DOMContentLoaded', carregarAnime);
