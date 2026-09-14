const WATCH_ASSISTIDOS_PREFIXO = 'aniverso_assistidos_';
const WATCH_TEXTO_INDISPONIVEL = 'Episódio não disponível';
const WATCH_TEXTO_SEM_EPS = 'Nenhum episódio disponível';
const WATCH_STATUS = ['alive', 'dead', 'unknown'];
const WATCH_SKELETON_MAX = 6000;

function escapar(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hrefWatch(slug, numero) {
  return `/watch.html?slug=${encodeURIComponent(slug)}&ep=${encodeURIComponent(numero)}`;
}

function vistos(slug) {
  try {
    const lista = JSON.parse(localStorage.getItem(WATCH_ASSISTIDOS_PREFIXO + slug) ?? '[]');
    return Array.isArray(lista) ? lista.map(Number) : [];
  } catch (erro) {
    return [];
  }
}

function marcarAssistido(slug, numero) {
  try {
    const lista = vistos(slug);
    if (!lista.includes(Number(numero))) lista.push(Number(numero));
    localStorage.setItem(WATCH_ASSISTIDOS_PREFIXO + slug, JSON.stringify(lista));
  } catch (erro) {
    console.error('[Aniverso] não consegui salvar o episódio assistido', erro);
  }
}

function esconderSkeleton() {
  const esqueleto = document.getElementById('player-skeleton');
  if (esqueleto) esqueleto.hidden = true;
}

function mostrarPlayer(url) {
  const player = document.getElementById('player');

  player.addEventListener('load', esconderSkeleton, { once: true });
  setTimeout(esconderSkeleton, WATCH_SKELETON_MAX);

  player.src = url;
  player.hidden = false;
}

function mostrarErro(texto) {
  const player = document.getElementById('player');
  const erro = document.getElementById('player-erro');

  esconderSkeleton();
  player.hidden = true;
  player.removeAttribute('src');
  erro.textContent = texto;
  erro.hidden = false;
}

function epBotaoPlayer(anime, episodio, atual) {
  const status = WATCH_STATUS.includes(episodio.status) ? episodio.status : 'unknown';
  const classes = ['ep-btn', status, Number(episodio.numero) === Number(atual) ? 'current' : ''].filter(Boolean).join(' ');
  const rotulo = `Ep ${escapar(episodio.numero)}`;

  if (status === 'dead') {
    return `<span class="${classes}" title="Episódio indisponível">${rotulo}</span>`;
  }

  return `<a class="${classes}" href="${hrefWatch(anime.slug, episodio.numero)}">${rotulo}</a>`;
}

function renderEps(anime, episodios, atual) {
  document.getElementById('eps').innerHTML = episodios.map((ep) => epBotaoPlayer(anime, ep, atual)).join('');
}

function ligarNavegacao(anime, episodios, atual) {
  const indice = episodios.findIndex((ep) => Number(ep.numero) === Number(atual));

  const destinos = {
    prev: indice > 0 ? episodios[indice - 1] : null,
    next: indice > -1 && indice < episodios.length - 1 ? episodios[indice + 1] : null
  };

  for (const [id, destino] of Object.entries(destinos)) {
    const link = document.getElementById(id);

    if (!link.dataset.pintado) {
      const seta = icone(id === 'prev' ? 'arrowLeft' : 'arrowRight');
      link.insertAdjacentHTML(id === 'prev' ? 'afterbegin' : 'beforeend', id === 'prev' ? `${seta} ` : ` ${seta}`);
      link.dataset.pintado = '1';
    }

    if (!destino) {
      link.removeAttribute('href');
      link.style.opacity = '0.3';
      continue;
    }

    link.href = hrefWatch(anime.slug, destino.numero);
    link.style.opacity = '';
  }
}

async function carregarWatch() {
  const parametros = new URLSearchParams(window.location.search);
  const slug = parametros.get('slug');

  if (!slug) {
    window.location = '/404.html';
    return;
  }

  if (typeof AniversoAPI === 'undefined') {
    mostrarErro(WATCH_TEXTO_INDISPONIVEL);
    return;
  }

  const pedido = parametros.has('ep') ? Number(parametros.get('ep')) : null;

  const [anime, embedDoPedido] = await Promise.all([
    AniversoAPI.lite(slug),
    pedido === null ? Promise.resolve(null) : AniversoAPI.embed(slug, pedido)
  ]);

  if (!anime) {
    window.location = '/404.html';
    return;
  }

  const episodios = anime.episodios ?? [];
  const atual = pedido === null ? episodios[0] : episodios.find((ep) => Number(ep.numero) === pedido);

  document.getElementById('titulo').textContent = anime.titulo;
  document.getElementById('ep-label').textContent = atual ? `Episódio ${atual.numero}` : '';
  renderEps(anime, episodios, atual?.numero);
  ligarNavegacao(anime, episodios, atual?.numero);

  if (!episodios.length) {
    document.title = `${anime.titulo} — Aniverso`;
    mostrarErro(WATCH_TEXTO_SEM_EPS);
    return;
  }

  if (!atual) {
    document.title = `${anime.titulo} — Aniverso`;
    mostrarErro(WATCH_TEXTO_INDISPONIVEL);
    return;
  }

  const embed = Number(embedDoPedido?.numero) === Number(atual.numero)
    ? embedDoPedido
    : await AniversoAPI.embed(anime.slug, atual.numero);

  document.title = `${anime.titulo} — Ep ${atual.numero} — Aniverso`;

  if (!embed?.embed_url) {
    mostrarErro(WATCH_TEXTO_INDISPONIVEL);
    return;
  }

  mostrarPlayer(embed.embed_url);
  history.replaceState(null, '', hrefWatch(anime.slug, atual.numero));
  marcarAssistido(anime.slug, atual.numero);
}

document.addEventListener('DOMContentLoaded', carregarWatch);
