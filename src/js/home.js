(function () {
const HOME_TEXTO_ERRO = 'Não foi possível carregar';
const HOME_TEXTO_VAZIO = 'Nenhum anime encontrado';
const HOME_CACHE_PREFIXO = 'home_';
const HOME_CACHE_TTL = 300000;
const HOME_NOVOS_CARDS = 10;
const HOME_HERO_TOTAL = 3;
const HOME_HERO_SLUGS = [
  'naruto-shippuden-online-hd-8',
  'one-piece-online-hd-3',
  'solo-leveling-online-hd-11',
  'jujutsu-kaisen-online-hd-1',
  'tokyo-revengers',
  'black-clover',
  'dragon-ball-super-online-hd'
];
const HOME_HERO_INTERVALO = 7000;
const HOME_HERO_PAUSA = 30000;
const HOME_HERO_FADE = 250;
const HOME_SWIPE_MIN = 50;
const HOME_RAIL_PASSO = 320;

let heroAnimes = [];
let heroIndice = 0;
let heroTimer = null;
let heroPausaTimer = null;
let heroToqueX = null;
let heroSwipeLigado = false;
let heroProgressoRaf = null;
let heroProgressoInicio = 0;
let heroEmHover = false;
let heroInteracaoLigada = false;

function escapar(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ehReal = (anime) => Boolean(anime.titulo) && (anime.titulo.includes(' ') || !anime.titulo.includes('-'));

function aproveitaveis(dados) {
  return (dados?.animes ?? []).filter(ehReal).filter((anime) => anime.episodes_count > 0);
}

function vazio(elemento, texto) {
  elemento.innerHTML = `<p class="vazio">${texto}</p>`;
}

function cacheLer(chave) {
  try {
    const bruto = sessionStorage.getItem(HOME_CACHE_PREFIXO + chave);
    if (!bruto) return null;

    const { t, d } = JSON.parse(bruto);
    return Date.now() - t > HOME_CACHE_TTL ? null : d;
  } catch (erro) {
    return null;
  }
}

function cacheSalvar(chave, dados) {
  try {
    sessionStorage.setItem(HOME_CACHE_PREFIXO + chave, JSON.stringify({ t: Date.now(), d: dados }));
  } catch (erro) {
    console.error('[Aniverso] não consegui guardar o cache da home', erro);
  }
}

async function comCache(chave, buscar) {
  const guardado = cacheLer(chave);
  if (guardado) return guardado;

  const dados = await buscar();
  if (dados) cacheSalvar(chave, dados);

  return dados;
}

function reduzirCard(anime) {
  return {
    slug: anime.slug,
    titulo: anime.titulo,
    capa: anime.capa,
    ano: anime.ano,
    episodes_count: anime.episodes_count,
    audio: anime.audio
  };
}

function reduzirHero(anime) {
  return {
    slug: anime.slug,
    titulo: anime.titulo,
    capa: anime.capa,
    nota: anime.nota,
    tipo: anime.tipo,
    ano: anime.ano,
    status: anime.status,
    generos: (anime.generos ?? []).slice(0, 3)
  };
}

function adiar(tarefa) {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(tarefa()), { timeout: 2000 });
    else setTimeout(() => resolve(tarefa()), 0);
  });
}

function tempoRelativo(iso) {
  if (!iso) return '';

  const horas = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (!Number.isFinite(horas)) return '';

  if (horas < 1) return 'agora';
  if (horas < 24) return `${Math.floor(horas)}h atrás`;

  const dias = horas / 24;
  if (dias < 7) return `${Math.floor(dias)}d atrás`;
  if (dias < 30) return `${Math.floor(dias / 7)}sem atrás`;

  return `${Math.floor(dias / 30)}m atrás`;
}

function rotuloAudio(valor) {
  if (valor === 'dublado' || valor === 'ptBr') return { classe: 'dublado', label: 'Dublado' };
  if (valor === 'legendado' || valor === 'jap') return { classe: 'legendado', label: 'Legendado' };
  return null;
}

function cardHTML(anime) {
  const capa = anime.capa ? ` src="${escapar(anime.capa)}"` : '';
  const partes = [];
  const audio = rotuloAudio((anime.audio ?? [])[0]);

  if (anime.episodes_count === 1) partes.push('1 episódio');
  else if (anime.episodes_count > 1) partes.push(`${anime.episodes_count} episódios`);

  if (anime.ano) partes.push(anime.ano);

  const meta = partes.join(' · ');

  return `<a href="/anime?slug=${encodeURIComponent(anime.slug)}" class="card">
      <div class="card-thumb">
        <img${capa} alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        ${audio ? `<span class="card-badge ${audio.classe}">${audio.label}</span>` : ''}
      </div>
      <div class="info">
        <div class="titulo">${escapar(anime.titulo)}</div>
        <div class="meta">${escapar(meta)}</div>
      </div>
    </a>`;
}

function epCardHTML(card) {
  const audio = rotuloAudio(card.audio);
  const badge = audio ? `<span class="ep-card-badge ${audio.classe}">${audio.label}</span>` : '';
  const thumbSrc = card.thumb || card.capa;
  const img = thumbSrc ? `<img src="${escapar(thumbSrc)}" alt="" loading="lazy" decoding="async">` : '';

  return `<a class="ep-card" href="/watch?slug=${encodeURIComponent(card.slug)}&ep=${encodeURIComponent(card.numero)}"
      data-slug="${escapar(card.slug)}" data-ep="${escapar(card.numero)}">
      <div class="ep-card-thumb">
        ${img}
        ${badge}
        <span class="ep-card-num">Episódio ${escapar(card.numero)}</span>
      </div>
      <div class="ep-card-body">
        <div class="ep-card-titulo">${escapar(card.titulo)}</div>
        <div class="ep-card-foot">
          <span class="ep-time">${tempoRelativo(card.scraped_at)}</span>
        </div>
      </div>
    </a>`;
}

function preaquecerEps() {
  if (typeof AniversoAPI === 'undefined') return;

  for (const card of document.querySelectorAll('.ep-card[data-slug]')) {
    const aquecer = () => {
      const { slug, ep } = card.dataset;

      AniversoAPI.lite(slug).catch(() => {});
      if (ep) AniversoAPI.embed(slug, ep).catch(() => {});
    };

    card.addEventListener('mouseenter', aquecer, { once: true });
    card.addEventListener('focus', aquecer, { once: true });
  }
}

function ligarRailNav() {
  const rail = document.getElementById('eps-novos');
  if (!rail) return;

  const rolar = (passo) => rail.scrollBy({ left: passo, behavior: 'smooth' });

  document.querySelector('.rail-nav-prev')?.addEventListener('click', () => rolar(-HOME_RAIL_PASSO));
  document.querySelector('.rail-nav-next')?.addEventListener('click', () => rolar(HOME_RAIL_PASSO));
}

function slideHTML(anime, indice) {
  const fundo = anime.capa ? ` style="background-image:url('${escapar(anime.capa)}')"` : '';
  const capa = anime.capa ? ` src="${escapar(anime.capa)}"` : '';
  const tipo = anime.tipo ? `<span class="tipo">${escapar(anime.tipo)}</span>` : '';
  const ano = anime.ano ? `<span class="ano">${escapar(anime.ano)}</span>` : '';
  const status = anime.status
    ? `<span class="status"><span class="status-dot"></span> ${escapar(anime.status)}</span>`
    : '';

  return `<div class="hero-slide${indice === heroIndice ? ' active' : ''}" data-i="${indice}">
      <div class="hero-bg"${fundo}></div>
      <div class="hero-scrim"></div>
      <div class="hero-content">
        <img class="hero-capa"${capa} alt="">
        <div class="hero-info">
          <h2>${escapar(anime.titulo)}</h2>
          <div class="hero-meta">
            <span class="nota">${icone('star')} ${escapar(anime.nota)}</span>
            ${tipo}
            ${ano}
            ${status}
          </div>
          <div class="hero-pills">
            ${anime.generos.map((genero) => `<span>${escapar(genero)}</span>`).join('')}
          </div>
          <a class="hero-cta" href="/anime?slug=${encodeURIComponent(anime.slug)}">${icone('play')} Assistir Agora</a>
        </div>
      </div>
    </div>`;
}

function heroHTML() {
  return `<div class="hero-card">
      <div class="hero-slides">
        ${heroAnimes.map((anime, i) => slideHTML(anime, i)).join('')}
      </div>
      <button class="hero-nav hero-nav-prev" type="button" aria-label="Anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button class="hero-nav hero-nav-next" type="button" aria-label="Próximo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
      </button>
    </div>
    <div class="hero-dots">
      ${heroAnimes.map((item, i) => `<span class="${i === heroIndice ? 'active' : ''}" data-i="${i}"></span>`).join('')}
    </div>`;
}

function ligarDotsHero(hero) {
  for (const ponto of hero.querySelectorAll('.hero-dots span')) {
    ponto.addEventListener('click', () => {
      irParaHero(Number(ponto.dataset.i));
      pausarHero();
    });
  }

  hero.querySelector('.hero-nav-prev')?.addEventListener('click', () => {
    irParaHero(heroIndice - 1);
    pausarHero();
  });

  hero.querySelector('.hero-nav-next')?.addEventListener('click', () => {
    irParaHero(heroIndice + 1);
    pausarHero();
  });
}

function pararProgressoHero() {
  const hero = document.getElementById('hero');
  const dots = hero?.querySelector('.hero-dots');
  if (dots) dots.classList.add('pausado');
}

function animarProgressoHero() {
  pararProgressoHero();

  const hero = document.getElementById('hero');
  const dots = hero?.querySelector('.hero-dots');
  const ativo = hero?.querySelector('.hero-dots span.active');

  if (!dots || !ativo || heroAnimes.length < 2) return;

  ativo.style.setProperty('--duracao', `${HOME_HERO_INTERVALO}ms`);
  ativo.classList.remove('rodando');
  void ativo.offsetWidth;
  ativo.classList.add('rodando');
  dots.classList.remove('pausado');
}

function ligarInteracaoHero(hero) {
  if (heroInteracaoLigada) return;
  heroInteracaoLigada = true;

  hero.addEventListener('mouseenter', () => {
    heroEmHover = true;
    pararProgressoHero();
    clearInterval(heroTimer);
    heroTimer = null;
    clearTimeout(heroPausaTimer);
    heroPausaTimer = null;
  });

  hero.addEventListener('mouseleave', () => {
    heroEmHover = false;
    reiniciarHeroTimer();
  });

  // visibilitychange e' no document: regista-se UMA vez (o script re-executa em
  // cada visita a /) e delega para o controlo do hero da visita atual
  window.__heroControle = (hidden) => {
    if (!document.getElementById('hero')) return;
    if (hidden) {
      pararProgressoHero();
      clearInterval(heroTimer);
      heroTimer = null;
    } else if (!heroEmHover) {
      reiniciarHeroTimer();
    }
  };
  if (!window.__heroVisibility) {
    window.__heroVisibility = true;
    document.addEventListener('visibilitychange', () => {
      if (typeof window.__heroControle === 'function') window.__heroControle(document.hidden);
    });
  }
}

function ligarSwipeHero(hero) {
  if (heroSwipeLigado) return;
  heroSwipeLigado = true;

  hero.addEventListener('touchstart', (evento) => {
    heroToqueX = evento.changedTouches[0].clientX;
  }, { passive: true });

  hero.addEventListener('touchend', (evento) => {
    if (heroToqueX === null) return;

    const delta = evento.changedTouches[0].clientX - heroToqueX;
    heroToqueX = null;

    if (Math.abs(delta) < HOME_SWIPE_MIN) return;

    irParaHero(delta < 0 ? heroIndice + 1 : heroIndice - 1);
    pausarHero();
  }, { passive: true });
}

function renderHero(indice) {
  const hero = document.getElementById('hero');
  if (!hero || !heroAnimes.length) return;

  heroIndice = indice;

  if (!hero.querySelector('.hero-slides')) {
    hero.innerHTML = heroHTML();
    ligarDotsHero(hero);
    ligarSwipeHero(hero);
    ligarInteracaoHero(hero);
  }

  for (const slide of hero.querySelectorAll('.hero-slide')) {
    slide.classList.toggle('active', Number(slide.dataset.i) === indice);
  }

  for (const ponto of hero.querySelectorAll('.hero-dots span')) {
    ponto.classList.toggle('active', Number(ponto.dataset.i) === indice);
  }

  if (heroTimer && !heroEmHover && !document.hidden) {
    animarProgressoHero();
  }
}

function irParaHero(indice) {
  const hero = document.getElementById('hero');
  if (!hero || heroAnimes.length < 2) return;

  const destino = ((indice % heroAnimes.length) + heroAnimes.length) % heroAnimes.length;
  if (destino === heroIndice) return;

  renderHero(destino);
}

function reiniciarHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = null;
  clearTimeout(heroPausaTimer);
  heroPausaTimer = null;

  if (heroAnimes.length < 2 || heroEmHover || document.hidden) return;

  heroTimer = setInterval(() => irParaHero(heroIndice + 1), HOME_HERO_INTERVALO);
  animarProgressoHero();
}

function pausarHero() {
  clearInterval(heroTimer);
  heroTimer = null;
  clearTimeout(heroPausaTimer);
  pararProgressoHero();

  const hero = document.getElementById('hero');
  const ativo = hero?.querySelector('.hero-dots span.active');
  if (ativo) ativo.classList.remove('rodando');

  heroPausaTimer = setTimeout(() => {
    heroPausaTimer = null;
    reiniciarHeroTimer();
  }, HOME_HERO_PAUSA);
}

async function carregarHero() {
  const hero = document.getElementById('hero');

  try {
    if (typeof AniversoAPI === 'undefined') {
      hero.hidden = true;
      return;
    }

    heroAnimes = await comCache('hero', async () => {
      const base = Math.floor(Date.now() / 86400000) % HOME_HERO_SLUGS.length;
      const slugs = [];
      for (let i = 0; i < HOME_HERO_TOTAL; i++) {
        slugs.push(HOME_HERO_SLUGS[(base + i) % HOME_HERO_SLUGS.length]);
      }

      const escolhidos = await Promise.all(slugs.map(async (slug) => {
        const anime = await AniversoAPI.anime(slug);
        return anime ? reduzirHero(anime) : null;
      }));

      const validos = escolhidos.filter(Boolean);
      return validos.length === HOME_HERO_TOTAL ? validos : null;
    });

    if (!heroAnimes || !heroAnimes.length) {
      hero.hidden = true;
      return;
    }

    renderHero(0);
    reiniciarHeroTimer();
  } catch (erro) {
    console.error('[Aniverso] falha ao carregar o destaque', erro);
    hero.hidden = true;
  }
}

async function carregarNovosEpisodios() {
  const alvo = document.getElementById('eps-novos');

  try {
    if (typeof AniversoAPI === 'undefined') {
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    const eps = await comCache('novos-episodios', async () => {
      const dados = await AniversoAPI.animes({ ano_min: 2024, ordem: 'ano', desc: true, per_page: 20 });
      if (!dados) return null;

      const candidatos = aproveitaveis(dados).slice(0, HOME_NOVOS_CARDS + 4);
      const detalhes = await Promise.all(candidatos.map((anime) => AniversoAPI.anime(anime.slug)));

      return detalhes
        .filter((anime) => anime && (anime.episodios ?? []).length)
        .slice(0, HOME_NOVOS_CARDS)
        .map((anime) => {
          const ultimoEp = anime.episodios.at(-1);
          return {
            slug: anime.slug,
            titulo: anime.titulo,
            capa: anime.capa,
            thumb: ultimoEp.thumb,
            audio: ultimoEp.audio,
            numero: ultimoEp.numero,
            scraped_at: anime.scraped_at
          };
        });
    });

    if (eps === null) {
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    if (!eps.length) {
      vazio(alvo, HOME_TEXTO_VAZIO);
      return;
    }

    alvo.innerHTML = eps.map(epCardHTML).join('');
    preaquecerEps();
  } catch (erro) {
    console.error('[Aniverso] falha ao carregar os novos episódios', erro);
    vazio(alvo, HOME_TEXTO_ERRO);
  }
}

function esconderSeOpcional(alvo, opcional) {
  if (!opcional) return false;

  const secao = alvo.closest('.secao');
  if (secao) secao.hidden = true;

  return true;
}

async function carregarGrid(elementoId, chave, params, limite, opcional = false) {
  const alvo = document.getElementById(elementoId);
  if (!alvo) return;

  try {
    if (typeof AniversoAPI === 'undefined') {
      if (esconderSeOpcional(alvo, opcional)) return;
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    const lista = await comCache(chave, async () => {
      const dados = await AniversoAPI.animes(params);
      if (!dados) return null;

      return aproveitaveis(dados).slice(0, limite).map(reduzirCard);
    });

    if (lista === null) {
      if (esconderSeOpcional(alvo, opcional)) return;
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    if (!lista.length) {
      if (esconderSeOpcional(alvo, opcional)) return;
      vazio(alvo, HOME_TEXTO_VAZIO);
      return;
    }

    alvo.innerHTML = lista.map(cardHTML).join('');
  } catch (erro) {
    console.error(`[Aniverso] falha ao carregar a seção ${elementoId}`, erro);
    if (esconderSeOpcional(alvo, opcional)) return;
    vazio(alvo, HOME_TEXTO_ERRO);
  }
}

function carregarSecaoRecentes() {
  return carregarGrid('grid-recentes', 'recentes', { per_page: 24, ano_min: 2020, ordem: 'ano', desc: true }, 12);
}

function carregarSecaoTop() {
  return carregarGrid('grid-top', 'top', { per_page: 24, nota_min: 4, ordem: 'nota', desc: true }, 12);
}

function carregarSecaoDublados() {
  return carregarGrid('grid-dub', 'dublados', { per_page: 24, audio: 'dublado' }, 12);
}

function carregarSecaoFilmes() {
  return carregarGrid('grid-filmes', 'filmes', { tipo: 'Filme', per_page: 60, ordem: 'nota', desc: true }, 12, true);
}

async function carregarHome() {
  await Promise.all([carregarHero(), carregarNovosEpisodios()]);

  return adiar(() => Promise.all([
    carregarSecaoRecentes(),
    carregarSecaoTop(),
    carregarSecaoFilmes(),
    carregarSecaoDublados()
  ]));
}

function ligarBusca() {
  const form = document.getElementById('busca-form');
  const campo = document.getElementById('busca');
  if (!form || !campo) return;

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const valor = campo.value.trim();
    if (!valor) return;

    (window.irPara || ((u) => location.href = u))(`/busca?q=${encodeURIComponent(valor)}`);
  });
}

function iniciarHome() {
  Skeleton.pintarPagina();
  ligarBusca();
  ligarRailNav();
  carregarHome();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarHome);
} else {
  iniciarHome();
}
})();
