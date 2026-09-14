const HOME_TEXTO_ERRO = 'Não foi possível carregar';
const HOME_TEXTO_VAZIO = 'Nenhum anime encontrado';
const HOME_CACHE_PREFIXO = 'home_';
const HOME_CACHE_TTL = 300000;
const HOME_NOVOS_CARDS = 10;
const HOME_HERO_TOTAL = 3;
const HOME_HERO_INTERVALO = 7000;
const HOME_HERO_PAUSA = 30000;
const HOME_HERO_FADE = 250;
const HOME_SWIPE_MIN = 50;

let heroAnimes = [];
let heroIndice = 0;
let heroTimer = null;
let heroPausaTimer = null;
let heroToqueX = null;
let heroSwipeLigado = false;

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
    episodes_count: anime.episodes_count
  };
}

function reduzirHero(anime) {
  return {
    slug: anime.slug,
    titulo: anime.titulo,
    capa: anime.capa,
    nota: anime.nota,
    tipo: anime.tipo,
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

function epCardHTML(card) {
  const badge = card.audio
    ? `<span class="ep-card-badge ${escapar(card.audio)}">${card.audio === 'dublado' ? 'Dublado' : 'Legendado'}</span>`
    : '';
  const capa = card.capa ? ` src="${escapar(card.capa)}"` : '';

  return `<a class="ep-card" href="/watch.html?slug=${encodeURIComponent(card.slug)}&ep=${encodeURIComponent(card.numero)}">
      <div class="ep-card-thumb">
        <img${capa} alt="" loading="lazy">
        ${badge}
      </div>
      <div class="ep-card-body">
        <div class="ep-card-titulo">${escapar(card.titulo)}</div>
        <div class="ep-card-foot">
          <span class="ep-num">Ep ${escapar(card.numero)}</span>
          <span class="ep-time">${tempoRelativo(card.scraped_at)}</span>
        </div>
      </div>
    </a>`;
}

function heroHTML(anime) {
  const fundo = anime.capa ? ` style="background-image:url('${escapar(anime.capa)}')"` : '';
  const capa = anime.capa ? ` src="${escapar(anime.capa)}"` : '';
  const tipo = anime.tipo ? `<span>${escapar(anime.tipo)}</span>` : '';
  const status = anime.status
    ? `<span class="status"><span class="status-dot"></span> ${escapar(anime.status)}</span>`
    : '';

  return `<div class="hero-bg"${fundo}></div>
      <div class="hero-content">
        <img class="hero-capa"${capa} alt="">
        <div class="hero-info">
          <h2>${escapar(anime.titulo)}</h2>
          <div class="hero-meta">
            <span class="nota">${icone('star')} ${escapar(anime.nota)}</span>
            ${tipo}
            ${status}
          </div>
          <div class="hero-pills">
            ${anime.generos.map((genero) => `<span>${escapar(genero)}</span>`).join('')}
          </div>
          <a class="hero-cta" href="/anime.html?slug=${encodeURIComponent(anime.slug)}">${icone('play')} Assistir Agora</a>
        </div>
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
    reiniciarHeroTimer();
  }, { passive: true });
}

function renderHero(indice) {
  const hero = document.getElementById('hero');
  if (!hero || !heroAnimes.length) return;

  heroIndice = indice;
  hero.innerHTML = heroHTML(heroAnimes[indice]);

  ligarDotsHero(hero);
  ligarSwipeHero(hero);
}

function irParaHero(indice) {
  const hero = document.getElementById('hero');
  if (!hero || heroAnimes.length < 2) return;

  const destino = ((indice % heroAnimes.length) + heroAnimes.length) % heroAnimes.length;
  if (destino === heroIndice) return;

  hero.classList.add('trocando');

  setTimeout(() => {
    renderHero(destino);
    hero.classList.remove('trocando');
  }, HOME_HERO_FADE);
}

function reiniciarHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = null;
  clearTimeout(heroPausaTimer);
  heroPausaTimer = null;

  if (heroAnimes.length < 2) return;

  heroTimer = setInterval(() => irParaHero(heroIndice + 1), HOME_HERO_INTERVALO);
}

function pausarHero() {
  clearInterval(heroTimer);
  heroTimer = null;
  clearTimeout(heroPausaTimer);

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
      const dados = await AniversoAPI.animes({ nota_min: 4, ordem: 'nota', desc: true, per_page: 10 });
      if (!dados) return null;

      const escolhidos = aproveitaveis(dados)
        .filter((anime) => anime.titulo.includes(' '))
        .slice(0, HOME_HERO_TOTAL)
        .map(reduzirHero);

      return escolhidos.length ? escolhidos : null;
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
    document.getElementById('titulo-novos').innerHTML = `${icone('fire')} Novos Episódios`;

    if (typeof AniversoAPI === 'undefined') {
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    const cards = await comCache('novos-episodios', async () => {
      const dados = await AniversoAPI.animes({ ano_min: 2024, ordem: 'ano', desc: true, per_page: 20 });
      if (!dados) return null;

      const candidatos = aproveitaveis(dados).slice(0, HOME_NOVOS_CARDS);
      const detalhes = await Promise.all(candidatos.map((anime) => AniversoAPI.anime(anime.slug)));

      return detalhes
        .filter((anime) => anime && (anime.episodios ?? []).length)
        .map((anime) => ({
          slug: anime.slug,
          titulo: anime.titulo,
          capa: anime.capa,
          audio: (anime.audio ?? [])[0],
          numero: anime.episodios.at(-1).numero,
          scraped_at: anime.scraped_at
        }));
    });

    if (cards === null) {
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    if (!cards.length) {
      vazio(alvo, HOME_TEXTO_VAZIO);
      return;
    }

    alvo.innerHTML = cards.map(epCardHTML).join('');
  } catch (erro) {
    console.error('[Aniverso] falha ao carregar os novos episódios', erro);
    vazio(alvo, HOME_TEXTO_ERRO);
  }
}

async function carregarGrid(elementoId, chave, params, limite) {
  const alvo = document.getElementById(elementoId);

  try {
    if (typeof AniversoAPI === 'undefined') {
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    const cards = await comCache(chave, async () => {
      const dados = await AniversoAPI.animes(params);
      if (!dados) return null;

      return aproveitaveis(dados).slice(0, limite).map(reduzirCard);
    });

    if (cards === null) {
      vazio(alvo, HOME_TEXTO_ERRO);
      return;
    }

    if (!cards.length) {
      vazio(alvo, HOME_TEXTO_VAZIO);
      return;
    }

    alvo.innerHTML = cards.map(cardHTML).join('');
  } catch (erro) {
    console.error(`[Aniverso] falha ao carregar a seção ${elementoId}`, erro);
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

async function carregarHome() {
  await Promise.all([carregarHero(), carregarNovosEpisodios()]);

  return adiar(() => Promise.all([carregarSecaoRecentes(), carregarSecaoTop(), carregarSecaoDublados()]));
}

function ligarBusca() {
  const form = document.getElementById('busca-form');
  const campo = document.getElementById('busca');
  if (!form || !campo) return;

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const valor = campo.value.trim();
    if (!valor) return;

    window.location = `/busca.html?q=${encodeURIComponent(valor)}`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  ligarBusca();
  carregarHome();
});
