const ANIME_ASSISTIDOS_PREFIXO = 'aniverso_assistidos_';
const ANIME_CLIQUE_CHAVE = 'aniverso_clique_assistir';
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

function hrefWatch(slug, numero) {
  return `/watch.html?slug=${encodeURIComponent(slug)}&ep=${encodeURIComponent(numero)}`;
}

function generosPills(generos) {
  return (generos ?? [])
    .map((genero) => `<a href="/genero.html?nome=${encodeURIComponent(genero)}">${escapar(genero)}</a>`)
    .join('');
}

function metaHTML(anime) {
  const partes = [];

  if (anime.nota) {
    partes.push(`<span class="nota">${icone('star')} ${escapar(Number(anime.nota).toFixed(1))}</span>`);
  }

  if (anime.tipo) partes.push(`<span>${escapar(anime.tipo)}</span>`);
  if (anime.ano) partes.push(`<span>${escapar(anime.ano)}</span>`);

  if (anime.status) {
    partes.push(`<span class="status"><span class="status-dot"></span>${escapar(anime.status)}</span>`);
  }

  return partes.join('');
}

function renderDetalhe(anime) {
  const capa = document.getElementById('capa');

  if (anime.capa) {
    capa.src = anime.capa;
    capa.onerror = () => { capa.style.visibility = 'hidden'; };
  }

  document.getElementById('titulo').textContent = anime.titulo;
  document.getElementById('meta').innerHTML = metaHTML(anime);
  document.getElementById('generos').innerHTML = generosPills(anime.generos);

  const sinopse = document.getElementById('sinopse');

  if (anime.sinopse) {
    sinopse.textContent = anime.sinopse;
  } else {
    sinopse.hidden = true;
  }
}

function renderAssistir(anime) {
  const btn = document.getElementById('btn-assistir');
  const primeiro = (anime.episodios ?? []).find((episodio) => episodio.status !== 'dead');

  if (!primeiro) {
    btn.hidden = true;

    const aviso = document.createElement('p');
    aviso.className = 'aviso';
    aviso.innerHTML = `${icone('info')} Episódios ainda não disponíveis`;
    btn.insertAdjacentElement('afterend', aviso);
    return;
  }

  btn.href = hrefWatch(anime.slug, primeiro.numero);
  btn.innerHTML = `${icone('play')} Assistir Ep ${escapar(primeiro.numero)}`;
}

function epCard(anime, episodio, vistos) {
  const status = ANIME_STATUS.includes(episodio.status) ? episodio.status : 'unknown';
  const visto = vistos.has(Number(episodio.numero));
  const classes = ['ep-card', status === 'dead' ? 'dead' : '', visto ? 'watched' : ''].filter(Boolean).join(' ');
  const numero = escapar(episodio.numero);
  const thumbSrc = episodio.thumb || anime.capa;
  const img = thumbSrc
    ? `<img src="${escapar(thumbSrc)}" alt="" loading="lazy" decoding="async">`
    : '';

  const nomeReal = episodio.episode_name || episodio.titulo;
  const generico = !nomeReal || /^Ep(is[oó]dio)?\s*\d+$/i.test(nomeReal);
  const tituloHtml = generico
    ? ''
    : `<div class="ep-card-titulo${nomeReal.length <= 15 ? ' curto' : ''}">${escapar(nomeReal)}</div>`;
  const bodyCls = generico ? 'ep-card-body sem-titulo' : 'ep-card-body';

  const miolo = `<div class="ep-card-thumb">
        ${img}
        <span class="ep-card-num">EP ${numero}</span>
        <span class="ep-card-status ${status}"></span>
      </div>
      <div class="${bodyCls}">
        ${tituloHtml}
      </div>`;

  if (status === 'dead') {
    return `<span class="${classes}" title="Episódio indisponível">${miolo}</span>`;
  }

  return `<a class="${classes}" data-ep="${numero}" href="${hrefWatch(anime.slug, episodio.numero)}">${miolo}</a>`;
}

function renderEpisodios(anime) {
  const lista = document.getElementById('eps');
  const contagem = document.getElementById('eps-contagem');
  const episodios = anime.episodios ?? [];

  if (!episodios.length) {
    contagem.textContent = '';
    lista.innerHTML = '<p class="vazio">Nenhum episódio disponível</p>';
    return;
  }

  contagem.textContent = episodios.length === 1 ? '1 episódio' : `${episodios.length} episódios`;

  const vistos = new Set(assistidos(anime.slug));
  lista.innerHTML = episodios.map((episodio) => epCard(anime, episodio, vistos)).join('');
}

function mostrarErro(texto) {
  document.querySelector('.anime-hero')?.remove();
  document.getElementById('episodios-section')?.remove();

  const vazio = document.createElement('p');
  vazio.className = 'vazio';
  vazio.textContent = texto;
  document.querySelector('.voltar').insertAdjacentElement('afterend', vazio);
}

async function preaquecerEpisodio(slug, numero) {
  const embed = await AniversoAPI.embed(slug, numero);
  const alvo = document.getElementById('preload-player');

  if (alvo && embed?.embed_url && alvo.getAttribute('src') !== embed.embed_url) {
    alvo.src = embed.embed_url;
  }

  return embed;
}

async function preaquecerPlayer(anime) {
  const primeiro = (anime.episodios || []).find((episodio) => episodio.status !== 'dead')?.numero;
  if (!primeiro) return;

  try {
    AniversoAPI.lite(anime.slug);
    await preaquecerEpisodio(anime.slug, primeiro);
  } catch (erro) {
    console.error('[Aniverso] falha ao pré-aquecer o player', erro);
  }
}

function preaquecerNoHover(slug) {
  document.querySelectorAll('.ep-card:not(.dead)').forEach((card) => {
    const aquecer = () => {
      const numero = card.dataset.ep;
      if (numero) preaquecerEpisodio(slug, numero).catch(() => {});
    };

    card.addEventListener('mouseenter', aquecer, { once: true });
    card.addEventListener('focus', aquecer, { once: true });
  });
}

document.addEventListener('click', (evento) => {
  const link = evento.target instanceof Element && evento.target.closest('a[href^="/watch.html"]');
  if (!link) return;

  try {
    sessionStorage.setItem(ANIME_CLIQUE_CHAVE, String(Date.now()));
  } catch (erro) {
    console.error('[Aniverso] não consegui guardar o instante do clique', erro);
  }
}, true);

async function carregarAnime() {
  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    window.location = '/404.html';
    return;
  }

  if (typeof AniversoAPI === 'undefined') {
    mostrarErro(ANIME_TEXTO_ERRO);
    return;
  }

  const anime = await AniversoAPI.anime(slug);

  if (!anime) {
    mostrarErro(ANIME_TEXTO_ERRO);
    return;
  }

  document.title = `${anime.titulo} — Aniverso`;
  renderDetalhe(anime);
  renderAssistir(anime);
  renderEpisodios(anime);

  preaquecerPlayer(anime);
  preaquecerNoHover(anime.slug);
}

document.addEventListener('DOMContentLoaded', carregarAnime);
