const WATCH_ASSISTIDOS_PREFIXO = 'aniverso_assistidos_';
const WATCH_TEXTO_INDISPONIVEL = 'Episódio não disponível';
const WATCH_TEXTO_SEM_EPS = 'Nenhum episódio disponível';
const WATCH_STATUS = ['alive', 'dead', 'unknown'];
const WATCH_LOADING_MAX = 8000;
const WATCH_VIDEO_TIMEOUT = 7000;

const ICONE_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const ICONE_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

let animeAtual = null;
let episodiosVivos = [];
let indiceAtual = -1;
let embedUrlAtual = '';
let controlsTimeout = null;

function escapar(valor) {
  return String(valor)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function hrefWatch(slug, numero) {
  return `/watch.html?slug=${encodeURIComponent(slug)}&ep=${encodeURIComponent(numero)}`;
}

function vistos(slug) {
  try {
    const lista = JSON.parse(localStorage.getItem(WATCH_ASSISTIDOS_PREFIXO + slug) ?? '[]');
    return Array.isArray(lista) ? lista.map(Number) : [];
  } catch {
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

function getPrimeiroVivo(episodios) {
  return episodios.find(ep => ep.status !== 'dead') || episodios[0];
}

function esconderControlesVideo() {
  const video = document.getElementById('player-video');
  const toggle = document.getElementById('video-toggle');
  const controls = document.getElementById('video-controls');
  try { video?.pause(); } catch {}
  if (video) { video.removeAttribute('src'); video.hidden = true; }
  if (toggle) toggle.hidden = true;
  if (controls) controls.hidden = true;
  clearTimeout(controlsTimeout);
}

function mostrarLoading() {
  const loading = document.getElementById('player-loading');
  const erro = document.getElementById('player-erro');
  if (loading) loading.hidden = false;
  esconderControlesVideo();
  const iframe = document.getElementById('player');
  if (iframe) iframe.hidden = true;
  if (erro) erro.hidden = true;
}

function esconderLoading() {
  const loading = document.getElementById('player-loading');
  if (loading) loading.hidden = true;
}

function mostrarPlayer(url) {
  const iframe = document.getElementById('player');
  const erro = document.getElementById('player-erro');
  if (!iframe) return;

  esconderControlesVideo();
  embedUrlAtual = url;
  mostrarLoading();

  let liberado = false;
  const liberar = () => {
    if (liberado) return;
    liberado = true;
    esconderLoading();
    if (iframe) iframe.hidden = false;
  };

  iframe.addEventListener('load', liberar, { once: true });
  setTimeout(liberar, WATCH_LOADING_MAX);

  iframe.src = url;
}

function mostrarErro(msg) {
  const iframe = document.getElementById('player');
  const erro = document.getElementById('player-erro');
  if (!erro) return;

  esconderControlesVideo();
  esconderLoading();
  if (iframe) {
    iframe.hidden = true;
    iframe.removeAttribute('src');
  }
  erro.innerHTML = `
    <strong>${escapar(msg)}</strong>
    <button type="button" id="btn-retry">Tentar de novo</button>
  `;
  erro.hidden = false;

  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) btnRetry.addEventListener('click', () => { if (embedUrlAtual) mostrarPlayer(embedUrlAtual); });
}

function atualizarTitulo() {
  if (!animeAtual) return;
  const ep = episodiosVivos[indiceAtual];
  document.title = `${animeAtual.titulo} — Ep ${ep?.numero ?? '?'} — Aniverso`;
}

function pintarCabecalho() {
  if (!animeAtual) return;
  const ep = episodiosVivos[indiceAtual];
  const titulo = document.getElementById('titulo');
  const badge = document.getElementById('ep-badge');
  const sub = document.getElementById('sub');

  titulo.textContent = animeAtual.titulo;

  if (ep) {
    badge.textContent = `EP ${ep.numero}`;
    badge.hidden = false;
    const nome = ep.titulo && !/^Ep(is[oó]dio)?\s*\d+$/i.test(ep.titulo) ? ep.titulo : '';
    sub.textContent = nome || `Episódio ${ep.numero}`;
    sub.classList.toggle('ep-nome', Boolean(nome));
  } else {
    badge.hidden = true;
    sub.textContent = '';
    sub.classList.remove('ep-nome');
  }

  document.getElementById('voltar').href = `/anime.html?slug=${encodeURIComponent(animeAtual.slug)}`;
}

function preencherMeta(anime) {
  const meta = document.getElementById('watch-meta');
  if (!meta) return;

  const chips = [];
  if (anime.ano) chips.push({ classe: 'meta', texto: String(anime.ano) });
  if (anime.tipo) chips.push({ classe: 'meta', texto: anime.tipo });
  if (anime.episodes_count) chips.push({ classe: 'meta', texto: `${anime.episodes_count} episódios` });

  const audios = Array.isArray(anime.audio) ? anime.audio : (anime.audio ? [anime.audio] : []);
  for (const audio of audios) {
    const a = String(audio).toLowerCase();
    if (a.includes('dub')) chips.push({ classe: 'audio-dub', texto: 'Dublado' });
    else if (a.includes('leg')) chips.push({ classe: 'audio-leg', texto: 'Legendado' });
  }

  const generos = Array.isArray(anime.generos) ? anime.generos.slice(0, 5) : [];
  for (const genero of generos) chips.push({ classe: 'genero', texto: genero });

  const chipsHtml = chips
    .map(c => `<span class="watch-meta-chip ${escapar(c.classe)}">${escapar(c.texto)}</span>`)
    .join('');

  let sinopse = '';
  if (anime.sinopse) {
    const texto = escapar(anime.sinopse);
    if (anime.sinopse.length > 220) {
      sinopse = `<p class="watch-meta-sinopse clamp" data-full="${texto}">${texto}</p>
        <button class="watch-meta-mais" type="button" aria-expanded="false">Ler mais</button>`;
    } else {
      sinopse = `<p class="watch-meta-sinopse">${texto}</p>`;
    }
  }

  if (!chipsHtml && !sinopse) return;
  meta.innerHTML = (chipsHtml ? `<div class="watch-meta-chips">${chipsHtml}</div>` : '') + sinopse;

  const btnMais = meta.querySelector('.watch-meta-mais');
  const paragrafo = meta.querySelector('.watch-meta-sinopse.clamp');
  if (btnMais && paragrafo) {
    btnMais.addEventListener('click', () => {
      const expandido = paragrafo.classList.toggle('expandido');
      btnMais.textContent = expandido ? 'Ler menos' : 'Ler mais';
      btnMais.setAttribute('aria-expanded', String(expandido));
    });
  }
}

async function carregarMeta(slug) {
  try {
    const anime = await AniversoAPI.anime(slug);
    if (anime) preencherMeta(anime);
  } catch (erro) {
    console.error('[Aniverso] não consegui carregar a meta do anime', erro);
  }
}

function epCardHTML(anime, ep, idx) {
  const status = WATCH_STATUS.includes(ep.status) ? ep.status : 'unknown';
  const numero = Number(ep.numero);
  const visto = vistos(anime.slug).includes(numero);
  const classes = ['ep-lista', status === 'dead' ? 'dead' : '', visto ? 'watched' : '', idx === indiceAtual ? 'atual' : ''].filter(Boolean).join(' ');

  const thumbSrc = ep.thumb || anime.capa;
  const img = thumbSrc
    ? `<img src="${escapar(thumbSrc)}" alt="" loading="lazy" decoding="async">`
    : '';
  const badgeVisto = visto ? '<span class="ep-lista-visto">Visto</span>' : '';

  const nomeReal = ep.episode_name || ep.titulo;
  const generico = !nomeReal || /^Ep(is[oó]dio)?\s*\d+$/i.test(nomeReal);
  const titulo = generico ? `Episódio ${numero}` : nomeReal;

  const miolo = `<span class="ep-lista-num">${escapar(numero)}</span>
      <div class="ep-lista-thumb">${img}</div>
      <div class="ep-lista-body">
        <div class="ep-lista-titulo">${escapar(titulo)}</div>
      </div>
      ${badgeVisto}`;

  if (status === 'dead') {
    return `<span class="${classes}" title="Episódio indisponível">${miolo}</span>`;
  }
  return `<a class="${classes}" data-ep="${escapar(numero)}" href="${hrefWatch(anime.slug, ep.numero)}">${miolo}</a>`;
}

function renderEpisodios() {
  const container = document.getElementById('eps');
  if (!container) return;
  container.innerHTML = episodiosVivos.map((ep, i) => epCardHTML(animeAtual, ep, i)).join('');
  const atual = container.querySelector('.ep-lista.atual');
  if (atual) atual.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function ligarNavegacao() {
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  if (!prev || !next) return;

  if (indiceAtual > 0) {
    prev.href = hrefWatch(animeAtual.slug, episodiosVivos[indiceAtual - 1].numero);
    prev.classList.remove('disabled');
  } else {
    prev.removeAttribute('href');
    prev.classList.add('disabled');
  }

  if (indiceAtual < episodiosVivos.length - 1) {
    next.href = hrefWatch(animeAtual.slug, episodiosVivos[indiceAtual + 1].numero);
    next.classList.remove('disabled');
  } else {
    next.removeAttribute('href');
    next.classList.add('disabled');
  }
}

let embedSeq = 0;

async function carregarEmbed(numero) {
  const seq = ++embedSeq;
  mostrarLoading();
  const embed = await AniversoAPI.embed(animeAtual.slug, numero);
  if (seq !== embedSeq) return;
  if (!embed?.embed_url) {
    mostrarErro(WATCH_TEXTO_INDISPONIVEL);
    return;
  }
  tentarPlayerNativo(AniversoAPI.stream(animeAtual.slug, numero), embed.embed_url, seq);
}

/**
 * Tenta o player nativo (<video>) com a URL de stream direto — seek decente,
 * controles próprios. Se o navegador não conseguir carregar (formato/origem),
 * cai no iframe do embed.
 */
function tentarPlayerNativo(streamUrl, fallbackEmbed, seq) {
  const video = document.getElementById('player-video');
  const iframe = document.getElementById('player');
  const toggle = document.getElementById('video-toggle');
  const controls = document.getElementById('video-controls');
  if (!video) { mostrarPlayer(fallbackEmbed); return; }

  let resolveu = false;
  const limpar = () => {
    video.removeEventListener('loadedmetadata', pronto);
    video.removeEventListener('error', cair);
  };
  const cair = () => {
    if (resolveu) return;
    resolveu = true;
    limpar();
    esconderControlesVideo();
    mostrarPlayer(fallbackEmbed);
  };
  const pronto = () => {
    if (resolveu || seq !== embedSeq) return;
    resolveu = true;
    limpar();
    if (iframe) iframe.hidden = true;
    video.hidden = false;
    if (toggle) toggle.hidden = false;
    if (controls) controls.hidden = false;
    esconderLoading();
    void video.play().catch(() => {});
  };

  video.addEventListener('loadedmetadata', pronto, { once: true });
  video.addEventListener('error', cair, { once: true });
  video.src = streamUrl;
  setTimeout(cair, WATCH_VIDEO_TIMEOUT);
}

function setupVideoPlayer() {
  const video = document.getElementById('player-video');
  const controls = document.getElementById('video-controls');
  const toggle = document.getElementById('video-toggle');
  const btnPlay = document.getElementById('video-play');
  const bar = document.getElementById('video-bar');
  const progress = document.getElementById('video-progress');
  const time = document.getElementById('video-time');
  const stage = document.querySelector('.watch-stage');
  if (!video || !controls) return;

  const formatar = (s) => {
    if (!Number.isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, '0')}`;
  };

  const atualizar = () => {
    const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    progress.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', Math.round(pct));
    time.textContent = `${formatar(video.currentTime)} / ${formatar(video.duration)}`;
  };

  const sincronizar = () => {
    const pausado = video.paused || video.ended;
    toggle.classList.toggle('pausado', pausado);
    btnPlay.innerHTML = pausado ? ICONE_PLAY : ICONE_PAUSE;
    btnPlay.setAttribute('aria-label', pausado ? 'Reproduzir' : 'Pausar');
    clearTimeout(controlsTimeout);
    controls.classList.add('visivel');
    if (!pausado) {
      controlsTimeout = setTimeout(() => controls.classList.remove('visivel'), 3000);
    }
    atualizar();
  };

  const togglePlay = () => {
    if (video.ended) { video.currentTime = 0; void video.play(); }
    else if (video.paused) void video.play();
    else video.pause();
  };

  toggle.addEventListener('click', togglePlay);
  btnPlay.addEventListener('click', togglePlay);
  video.addEventListener('play', sincronizar);
  video.addEventListener('pause', sincronizar);
  video.addEventListener('ended', sincronizar);
  video.addEventListener('timeupdate', atualizar);
  video.addEventListener('loadedmetadata', atualizar);
  video.addEventListener('volumechange', atualizar);

  stage?.addEventListener('mousemove', () => {
    if (video.hidden) return;
    clearTimeout(controlsTimeout);
    controls.classList.add('visivel');
    if (!video.paused) {
      controlsTimeout = setTimeout(() => controls.classList.remove('visivel'), 3000);
    }
  });

  const buscar = (clienteX) => {
    const r = bar.getBoundingClientRect();
    if (!r.width) return;
    const pct = Math.min(Math.max((clienteX - r.left) / r.width, 0), 1);
    if (video.duration) video.currentTime = pct * video.duration;
    atualizar();
  };

  let arrastando = false;
  bar.addEventListener('pointerdown', (e) => {
    arrastando = true;
    bar.setPointerCapture(e.pointerId);
    buscar(e.clientX);
  });
  bar.addEventListener('pointermove', (e) => { if (arrastando) buscar(e.clientX); });
  bar.addEventListener('pointerup', () => { arrastando = false; });
  bar.addEventListener('pointercancel', () => { arrastando = false; });
  bar.addEventListener('keydown', (e) => {
    if (!video.duration) return;
    if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); e.preventDefault(); }
    if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 5); e.preventDefault(); }
  });
}

function irParaEpisodio(indice, { empurrar = true } = {}) {
  if (!animeAtual || indice < 0 || indice >= episodiosVivos.length) return;
  if (indice === indiceAtual && embedUrlAtual) return;

  const ep = episodiosVivos[indice];
  indiceAtual = indice;

  pintarCabecalho();
  renderEpisodios();
  ligarNavegacao();
  atualizarTitulo();
  marcarAssistido(animeAtual.slug, ep.numero);

  if (empurrar) history.pushState(null, '', hrefWatch(animeAtual.slug, ep.numero));

  carregarEmbed(ep.numero);
}

function ligarBotoesNavegacao() {
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');

  if (prev) {
    prev.addEventListener('click', (e) => {
      e.preventDefault();
      if (prev.classList.contains('disabled')) return;
      irParaEpisodio(indiceAtual - 1);
    });
  }

  if (next) {
    next.addEventListener('click', (e) => {
      e.preventDefault();
      if (next.classList.contains('disabled')) return;
      irParaEpisodio(indiceAtual + 1);
    });
  }

  document.getElementById('eps')?.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-ep]');
    if (!link) return;
    e.preventDefault();
    const numero = Number(link.dataset.ep);
    const idx = episodiosVivos.findIndex(ep => Number(ep.numero) === numero);
    if (idx >= 0) irParaEpisodio(idx);
  });
}

window.addEventListener('popstate', () => {
  if (!animeAtual) return;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (slug && slug !== animeAtual.slug) {
    window.location = hrefWatch(slug, params.get('ep') ?? '');
    return;
  }
  const ep = params.has('ep') ? Number(params.get('ep')) : null;
  const idx = ep ? episodiosVivos.findIndex(e => Number(e.numero) === ep) : 0;
  if (idx >= 0) irParaEpisodio(idx, { empurrar: false });
});

function preloadHover() {
  document.getElementById('eps')?.addEventListener('mouseover', async (e) => {
    const link = e.target.closest('a[data-ep]');
    if (!link || link.dataset.preloaded) return;
    link.dataset.preloaded = '1';
    const epNum = Number(link.dataset.ep);
    const ep = animeAtual.episodios.find(e => Number(e.numero) === epNum);
    if (ep && ep.status !== 'dead') {
      try {
        const embed = await AniversoAPI.embed(animeAtual.slug, epNum);
        if (embed?.embed_url) link.dataset.embedUrl = embed.embed_url;
      } catch {}
    }
  });
}

function setupFullscreen() {
  const btn = document.getElementById('btn-fullscreen');
  const video = document.getElementById('player-video');
  const stage = document.querySelector('.watch-stage');
  if (!btn || !stage) return;

  const emTelaCheia = () => document.fullscreenElement || document.webkitFullscreenElement;

  const entrar = (el) => {
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!fn) return;
    const p = fn.call(el);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  const sair = () => {
    const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (fn) fn.call(document);
  };

  btn.addEventListener('click', () => {
    if (emTelaCheia()) sair();
    else entrar(!video.hidden ? video : stage);
  });

  const sincronizar = () => {
    const ativo = Boolean(emTelaCheia());
    btn.setAttribute('aria-label', ativo ? 'Sair da tela cheia' : 'Tela cheia');
    btn.classList.toggle('ativo', ativo);
  };

  document.addEventListener('fullscreenchange', sincronizar);
  document.addEventListener('webkitfullscreenchange', sincronizar);
}

async function carregarWatch() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const pedido = params.has('ep') ? Number(params.get('ep')) : null;

  if (!slug) {
    window.location = '/404.html';
    return;
  }

  if (typeof AniversoAPI === 'undefined') {
    mostrarErro(WATCH_TEXTO_INDISPONIVEL);
    return;
  }

  Skeleton.setEpGrid('eps', 6);

  const anime = await AniversoAPI.lite(slug);
  if (!anime) {
    window.location = '/404.html';
    return;
  }

  animeAtual = anime;
  const todos = anime.episodios ?? [];
  episodiosVivos = todos.filter(ep => ep.status !== 'dead');

  if (!episodiosVivos.length) {
    document.title = `${anime.titulo} — Aniverso`;
    const epsVazio = document.getElementById('eps');
    if (epsVazio) epsVazio.innerHTML = '';
    mostrarErro(WATCH_TEXTO_SEM_EPS);
    return;
  }

  let alvo = episodiosVivos[0];
  if (pedido) {
    const encontrado = episodiosVivos.find(ep => Number(ep.numero) === pedido);
    if (encontrado) alvo = encontrado;
  }
  indiceAtual = episodiosVivos.findIndex(ep => ep.numero === alvo.numero);

  pintarCabecalho();
  renderEpisodios();
  ligarNavegacao();
  ligarBotoesNavegacao();
  preloadHover();
  setupVideoPlayer();
  setupFullscreen();
  carregarMeta(anime.slug);

  atualizarTitulo();
  await carregarEmbed(alvo.numero);
  history.replaceState(null, '', hrefWatch(anime.slug, alvo.numero));
  marcarAssistido(anime.slug, alvo.numero);
}

document.addEventListener('DOMContentLoaded', carregarWatch);