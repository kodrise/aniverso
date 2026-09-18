const ANIME_ASSISTIDOS_PREFIXO = 'aniverso_assistidos_';
const ANIME_CLIQUE_CHAVE = 'aniverso_clique_assistir';
const ANIME_TEXTO_ERRO = 'Anime não encontrado';
const ANIME_STATUS = ['alive', 'dead', 'unknown'];
const ANIME_ORDEM_CHAVE = 'aniverso_eps_ordem';

function lerOrdemEps() {
  try {
    return localStorage.getItem(ANIME_ORDEM_CHAVE) === 'desc' ? 'desc' : 'asc';
  } catch (erro) {
    return 'asc';
  }
}

function salvarOrdemEps(ordem) {
  try {
    localStorage.setItem(ANIME_ORDEM_CHAVE, ordem);
  } catch (erro) {
    console.error('[Aniverso] não consegui salvar a ordem dos episódios', erro);
  }
}

function ordemEpsAsc() {
  return lerOrdemEps() === 'asc';
}

function atualizarBotaoOrdem() {
  const botao = document.getElementById('eps-ordem');
  if (!botao) return;

  const asc = ordemEpsAsc();
  botao.querySelector('.eps-ordem-ico').textContent = asc ? '↑' : '↓';
  botao.querySelector('.eps-ordem-txt').textContent = asc ? '1-N' : 'N-1';
  botao.setAttribute('aria-label', asc ? 'Mudar para ordem decrescente' : 'Mudar para ordem crescente');
}

function rotuloAudio(valor) {
  if (valor === 'dublado' || valor === 'ptBr') return { classe: 'dublado', label: 'Dublado' };
  if (valor === 'legendado' || valor === 'jap') return { classe: 'legendado', label: 'Legendado' };
  return null;
}

function cardSugestaoHTML(anime) {
  const capa = anime.capa ? ` src="${escapar(anime.capa)}"` : '';
  const partes = [];
  const audio = rotuloAudio((anime.audio ?? [])[0]);

  if (anime.episodes_count === 1) partes.push('1 episódio');
  else if (anime.episodes_count > 1) partes.push(`${anime.episodes_count} episódios`);

  if (anime.ano) partes.push(anime.ano);

  return `<a href="/anime?slug=${encodeURIComponent(anime.slug)}" class="card">
      <div class="card-thumb">
        <img${capa} alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        ${audio ? `<span class="card-badge ${audio.classe}">${audio.label}</span>` : ''}
      </div>
      <div class="info">
        <div class="titulo">${escapar(anime.titulo)}</div>
        <div class="meta">${escapar(partes.join(' · '))}</div>
      </div>
    </a>`;
}

async function carregarSugestoes(slug, generos) {
  const secao = document.getElementById('sugestoes-section');
  const grade = document.getElementById('sugestoes');
  if (!secao || !grade || typeof AniversoAPI === 'undefined') return;

  let genero = (generos ?? [])[0];
  if (!genero) {
    try {
      const completo = await AniversoAPI.anime(slug);
      genero = (completo?.generos ?? [])[0];
    } catch (erro) {
      console.error('[Aniverso] não consegui carregar os gêneros', erro);
    }
  }

  if (!genero) {
    secao.hidden = true;
    return;
  }

  secao.hidden = false;
  Skeleton.setGrid('sugestoes', 6);

  try {
    const dados = await AniversoAPI.animes({ genero, per_page: 13 });
    const lista = (dados?.animes ?? []).filter((anime) => anime.slug !== slug).slice(0, 12);

    if (lista.length < 4) {
      secao.hidden = true;
      return;
    }

    grade.innerHTML = lista.map(cardSugestaoHTML).join('');
  } catch (erro) {
    console.error('[Aniverso] não consegui carregar as sugestões', erro);
    secao.hidden = true;
  }
}

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
  return `/watch?slug=${encodeURIComponent(slug)}&ep=${encodeURIComponent(numero)}`;
}

function generosPills(generos) {
  return (generos ?? [])
    .map((genero) => `<a href="/genero?nome=${encodeURIComponent(genero)}">${escapar(genero)}</a>`)
    .join('');
}

function metaHTML(anime) {
  const partes = [];

  if (anime.nota) {
    partes.push(`<span class="anime-meta-pill nota">${icone('star')} ${escapar(Number(anime.nota).toFixed(1))}</span>`);
  }

  if (anime.tipo) partes.push(`<span class="anime-meta-pill">${escapar(anime.tipo)}</span>`);
  if (anime.ano) partes.push(`<span class="anime-meta-pill">${escapar(anime.ano)}</span>`);

  const total = (anime.episodios ?? []).length || anime.episodes_count;
  if (total) {
    partes.push(`<span class="anime-meta-pill">${total} ${total === 1 ? 'episódio' : 'episódios'}</span>`);
  }

  if (anime.status) {
    partes.push(`<span class="anime-meta-pill status"><span class="status-dot"></span>${escapar(anime.status)}</span>`);
  }

  return partes.join('');
}

function renderDetalhe(anime) {
  const capa = document.getElementById('capa');
  const hero = document.querySelector('.anime-hero');

  capa.classList.remove('sk');

  if (anime.capa) {
    capa.src = anime.capa;
    capa.onerror = () => { capa.style.visibility = 'hidden'; };
    hero?.style.setProperty('--hero-capa', `url("${anime.capa}")`);
  }

  document.getElementById('titulo').textContent = anime.titulo;
  document.getElementById('meta').innerHTML = metaHTML(anime);
  document.getElementById('generos').innerHTML = generosPills(anime.generos);

  const sinopse = document.getElementById('sinopse');

  if (anime.sinopse) {
    sinopse.textContent = anime.sinopse;

    if (anime.sinopse.length > 220) {
      sinopse.classList.add('clamp');

      const botao = document.createElement('button');
      botao.className = 'sinopse-mais';
      botao.type = 'button';
      botao.textContent = 'Ler mais';
      botao.setAttribute('aria-expanded', 'false');
      botao.addEventListener('click', () => {
        const expandido = sinopse.classList.toggle('expandido');
        botao.textContent = expandido ? 'Ler menos' : 'Ler mais';
        botao.setAttribute('aria-expanded', String(expandido));
      });
      sinopse.insertAdjacentElement('afterend', botao);
    }
  } else {
    sinopse.hidden = true;
  }
}

function epCard(anime, episodio, vistos, atual) {
  const status = ANIME_STATUS.includes(episodio.status) ? episodio.status : 'unknown';
  const numero = Number(episodio.numero);
  const visto = vistos.has(numero);
  const morto = status === 'dead';

  const nomeReal = episodio.episode_name || episodio.titulo;
  const generico = !nomeReal || /^Ep(is[oó]dio)?\s*\d+$/i.test(nomeReal);
  const titulo = generico ? `Episódio ${numero}` : nomeReal;

  const thumbSrc = episodio.thumb || anime.capa;
  const img = thumbSrc
    ? `<img src="${escapar(thumbSrc)}" alt="" loading="lazy" decoding="async">`
    : '';
  const badgeVisto = visto ? '<span class="ep-lista-visto">Visto</span>' : '';

  const classes = ['ep-lista', morto ? 'dead' : '', visto ? 'watched' : '', atual ? 'atual' : '']
    .filter(Boolean).join(' ');

  const miolo = `<span class="ep-lista-num">${escapar(numero)}</span>
      <div class="ep-lista-thumb">${img}</div>
      <div class="ep-lista-body">
        <div class="ep-lista-titulo">${escapar(titulo)}</div>
      </div>
      ${badgeVisto}`;

  if (morto) {
    return `<span class="${classes}" title="Episódio indisponível">${miolo}</span>`;
  }

  return `<a class="${classes}" data-ep="${escapar(numero)}" href="${hrefWatch(anime.slug, episodio.numero)}">${miolo}</a>`;
}

const ANIME_EPS_INICIAIS = 5;

function renderEpisodios(anime) {
  const lista = document.getElementById('eps');
  const busca = document.getElementById('eps-busca');
  const verMais = document.getElementById('eps-ver-mais');
  const episodios = anime.episodios ?? [];

  atualizarBotaoOrdem();

  if (!episodios.length) {
    lista.innerHTML = '<p class="vazio">Nenhum episódio disponível</p>';
    verMais.hidden = true;
    return;
  }

  const vistos = new Set(assistidos(anime.slug));
  const ultimo = vistos.size ? Math.max(...vistos) : null;
  let expandido = false;

  const pintar = (termo = '') => {
    const buscando = Boolean(termo);
    const base = ordemEpsAsc() ? episodios : [...episodios].reverse();
    const filtrados = buscando
      ? base.filter((ep) => String(ep.numero).includes(termo))
      : base;

    if (!filtrados.length) {
      lista.innerHTML = '<p class="vazio">Nenhum episódio encontrado</p>';
      verMais.hidden = true;
      return;
    }

    // sem busca: mostra só os primeiros (a menos que esteja expandido)
    const visiveis = buscando || expandido ? filtrados : filtrados.slice(0, ANIME_EPS_INICIAIS);

    lista.innerHTML = visiveis
      .map((episodio) => epCard(anime, episodio, vistos, Number(episodio.numero) === ultimo))
      .join('');

    // o "ver todos" só aparece quando há mais que o limite e não está buscando
    const podeExpandir = !buscando && episodios.length > ANIME_EPS_INICIAIS;
    verMais.hidden = !podeExpandir;
    verMais.textContent = expandido ? 'Ver menos' : `Ver todos (${episodios.length})`;
  };

  verMais?.addEventListener('click', () => {
    expandido = !expandido;
    pintar(busca?.value.trim() ?? '');
  });

  document.getElementById('eps-ordem')?.addEventListener('click', () => {
    salvarOrdemEps(ordemEpsAsc() ? 'desc' : 'asc');
    atualizarBotaoOrdem();
    pintar(busca?.value.trim() ?? '');
  });

  pintar();

  let debounce = null;
  busca?.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => pintar(e.target.value.trim()), 150);
  });
}

function mostrarErro(texto) {
  document.querySelector('.anime-hero')?.remove();
  document.getElementById('episodios-section')?.remove();

  const vazio = document.createElement('p');
  vazio.className = 'vazio';
  vazio.textContent = texto;
  document.querySelector('.voltar')?.insertAdjacentElement('afterend', vazio);
  document.querySelector('main')?.insertAdjacentElement('afterbegin', vazio);
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
  const link = evento.target instanceof Element && evento.target.closest('a[href^="/watch"]');
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
    window.location = '/404';
    return;
  }

  if (typeof AniversoAPI === 'undefined') {
    mostrarErro(ANIME_TEXTO_ERRO);
    return;
  }

  Skeleton.setAnimeHero();
  Skeleton.setEpGrid('eps', 6);

  const anime = await AniversoAPI.anime(slug);

  if (!anime) {
    mostrarErro(ANIME_TEXTO_ERRO);
    return;
  }

  document.title = `${anime.titulo} — Aniverso`;
  renderDetalhe(anime);
  renderEpisodios(anime);
  carregarSugestoes(anime.slug, anime.generos);

  preaquecerPlayer(anime);
  preaquecerNoHover(anime.slug);
}

document.addEventListener('DOMContentLoaded', carregarAnime);
