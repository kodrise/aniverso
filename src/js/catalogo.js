(function () {
const CATALOGO_TEXTO_VAZIO = 'Nenhum anime encontrado';
const CATALOGO_TEXTO_ERRO = 'Não foi possível carregar';
const CATALOGO_POR_PAGINA = 40;
const CATALOGO_ANO_MIN = 1970;
const CATALOGO_ANO_MAX = 2026;
const CATALOGO_TIPOS = ['TV', 'Filme', 'OVA', 'ONA', 'Especial'];
const CATALOGO_AUDIOS = [['dublado', 'Dublado'], ['legendado', 'Legendado']];
const CATALOGO_ORDENS = ['id', 'nota', 'ano'];
const CATALOGO_ORDEM_PADRAO = 'id';
const CATALOGO_CAMPOS = ['f-genero', 'f-ano', 'f-tipo', 'f-audio'];

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

function lerFiltros() {
  const params = new URLSearchParams(window.location.search);
  const pagina = Number(params.get('page'));
  const ordem = params.get('ordem');

  return {
    genero: params.get('genero') ?? '',
    ano: params.get('ano') ?? '',
    tipo: params.get('tipo') ?? '',
    audio: params.get('audio') ?? '',
    ordem: CATALOGO_ORDENS.includes(ordem) ? ordem : CATALOGO_ORDEM_PADRAO,
    page: Number.isInteger(pagina) && pagina > 0 ? pagina : 1
  };
}

function urlComFiltros(filtros) {
  const params = new URLSearchParams();

  if (filtros.genero) params.set('genero', filtros.genero);
  if (filtros.ano) params.set('ano', filtros.ano);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.audio) params.set('audio', filtros.audio);
  if (filtros.ordem && filtros.ordem !== CATALOGO_ORDEM_PADRAO) params.set('ordem', filtros.ordem);
  if (filtros.page > 1) params.set('page', String(filtros.page));

  const query = params.toString();
  return query ? `/catalogo?${query}` : '/catalogo';
}

function filtrosDoFormulario(pagina) {
  return {
    genero: document.getElementById('f-genero').value,
    ano: document.getElementById('f-ano').value,
    tipo: document.getElementById('f-tipo').value,
    audio: document.getElementById('f-audio').value,
    // a ordenação não tem select: só vem da URL e precisa sobreviver à troca de filtro
    ordem: lerFiltros().ordem,
    page: pagina
  };
}

function adicionarOpcoes(select, opcoes) {
  if (!select) return;

  const existentes = new Set(Array.from(select.options).map((option) => option.value));

  for (const [valor, rotulo] of opcoes) {
    if (existentes.has(valor)) continue;

    const option = document.createElement('option');
    option.value = valor;
    option.textContent = rotulo;
    select.appendChild(option);
    existentes.add(valor);
  }
}

function definirValor(select, valor) {
  if (!select) return;

  // o gênero da URL pode chegar antes da lista de gêneros da API
  if (valor && !Array.from(select.options).some((option) => option.value === valor)) {
    adicionarOpcoes(select, [[valor, valor]]);
  }

  select.value = valor;
}

function anosDisponiveis() {
  const lista = [];

  for (let ano = CATALOGO_ANO_MAX; ano >= CATALOGO_ANO_MIN; ano--) {
    lista.push([String(ano), String(ano)]);
  }

  return lista;
}

async function popularSelects() {
  adicionarOpcoes(document.getElementById('f-ano'), anosDisponiveis());
  adicionarOpcoes(document.getElementById('f-tipo'), CATALOGO_TIPOS.map((tipo) => [tipo, tipo]));
  adicionarOpcoes(document.getElementById('f-audio'), CATALOGO_AUDIOS);

  if (typeof AniversoAPI === 'undefined') return;

  const generos = await AniversoAPI.generos();
  if (!generos) return;

  adicionarOpcoes(document.getElementById('f-genero'), generos.map((genero) => [genero.nome, genero.nome]));
}

function linkPagina(pagina, filtros, rotulo) {
  const href = urlComFiltros({ ...filtros, page: pagina });
  return `<a href="${escapar(href)}">${rotulo}</a>`;
}

function montarPaginacao(pagina, totalPaginas, filtros) {
  const alvo = document.getElementById('paginacao');

  if (totalPaginas < 2) {
    alvo.innerHTML = '';
    return;
  }

  const anterior = pagina > 1
    ? linkPagina(pagina - 1, filtros, 'Anterior')
    : '<span class="disabled">Anterior</span>';

  const proximo = pagina < totalPaginas
    ? linkPagina(pagina + 1, filtros, 'Próximo')
    : '<span class="disabled">Próximo</span>';

  alvo.innerHTML = `${anterior}
    <span class="pagina-atual">Página ${pagina} de ${totalPaginas}</span>
    ${proximo}`;
}

function mostrarOrdem(ordem) {
  document.querySelector('.ordem-chip')?.remove();

  const titulo = document.querySelector('.page-title');
  if (!titulo || (ordem !== 'nota' && ordem !== 'ano')) return;

  const chip = document.createElement('div');
  chip.className = 'ordem-chip';
  chip.textContent = `Ordenado por ${ordem}`;
  titulo.insertAdjacentElement('afterend', chip);
}

async function carregarCatalogo() {
  const filtros = lerFiltros();
  const grid = document.getElementById('grid-animes');
  const paginacao = document.getElementById('paginacao');

  mostrarOrdem(filtros.ordem);

  definirValor(document.getElementById('f-genero'), filtros.genero);
  definirValor(document.getElementById('f-ano'), filtros.ano);
  definirValor(document.getElementById('f-tipo'), filtros.tipo);
  definirValor(document.getElementById('f-audio'), filtros.audio);

  if (typeof AniversoAPI === 'undefined') {
    grid.innerHTML = `<p class="vazio">${CATALOGO_TEXTO_ERRO}</p>`;
    paginacao.innerHTML = '';
    return;
  }

  Skeleton.setGrid('grid-animes', 12);

  const { genero, ano, tipo, audio, page } = filtros;
  const params = { genero, tipo, audio, page, per_page: CATALOGO_POR_PAGINA, ordem: filtros.ordem, desc: true };

  // sem ano escolhido, ano_min corta os registros sem ano (eps=0, ano=null) que entupiam a página 1
  if (ano) params.ano = ano;
  else params.ano_min = CATALOGO_ANO_MIN;

  const dados = await AniversoAPI.animes(params);

  const animes = (dados?.animes ?? []).filter(ehReal).filter((anime) => anime.episodes_count > 0);

  if (!animes.length) {
    grid.innerHTML = `<p class="vazio">${dados ? CATALOGO_TEXTO_VAZIO : CATALOGO_TEXTO_ERRO}</p>`;
    paginacao.innerHTML = '';
    return;
  }

  grid.innerHTML = animes.map(cardHTML).join('');
  montarPaginacao(filtros.page, Math.ceil((dados.total ?? 0) / CATALOGO_POR_PAGINA), filtros);
}

function ligarFiltros() {
  for (const campo of CATALOGO_CAMPOS) {
    document.getElementById(campo)?.addEventListener('change', () => {
      const filtros = filtrosDoFormulario(1);
      history.pushState(null, '', urlComFiltros(filtros));
      carregarCatalogo();
    });
  }
}

function ligarPaginacao() {
  document.getElementById('paginacao')?.addEventListener('click', (evento) => {
    const link = evento.target.closest('a[href]');
    if (!link) return;

    evento.preventDefault();
    history.pushState(null, '', link.getAttribute('href'));
    carregarCatalogo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function iniciarCatalogo() {
  popularSelects();
  ligarFiltros();
  ligarPaginacao();
  carregarCatalogo();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarCatalogo);
} else {
  iniciarCatalogo();
}
})();
