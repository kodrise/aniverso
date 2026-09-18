const API = 'https://streamapi-peach.vercel.app';

/**
 * @typedef {Object} Episodio
 * @property {number} numero
 * @property {string} titulo
 * @property {'alive'|'dead'|'unknown'} status
 * @property {{source: string, status: string, has_stream: boolean}[]} sources
 *
 * @typedef {Object} Anime
 * @property {number} id
 * @property {string} slug
 * @property {string} titulo
 * @property {string|null} capa
 * @property {string|null} sinopse
 * @property {number|null} ano
 * @property {number|null} nota
 * @property {string|null} tipo
 * @property {string[]} audio
 * @property {string[]} generos
 * @property {string|null} status
 * @property {number} episodes_count
 * @property {string[]} sources
 * @property {Episodio[]} [episodios]
 */

const AniversoAPI = (() => {
  function query(params) {
    if (!params) return '';

    const search = new URLSearchParams();
    for (const [chave, valor] of Object.entries(params)) {
      if (valor === undefined || valor === null || valor === '') continue;
      search.set(chave, String(valor));
    }

    const texto = search.toString();
    return texto ? `?${texto}` : '';
  }

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function request(caminho, params, opcoes = {}) {
    const url = API + caminho + query(params);
    const tentativas = opcoes.retry === false ? 1 : 2;

    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      try {
        const resposta = await fetch(url, { headers: { Accept: 'application/json' } });

        if (resposta.ok) return await resposta.json();

        console.error(`[AniversoAPI] HTTP ${resposta.status} em ${url}${tentativa < tentativas ? ' — tentando de novo' : ''}`);
      } catch (erro) {
        console.error(`[AniversoAPI] falha na requisição ${url}${tentativa < tentativas ? ' — tentando de novo' : ''}`, erro);
      }

      if (tentativa < tentativas) await esperar(500);
    }

    return null;
  }

  return {
    /**
     * @param {{page?: number, per_page?: number, genero?: string, ano_min?: number,
     *   audio?: string, busca?: string, ordem?: string, desc?: string|boolean}} [params]
     * @returns {Promise<{total: number, page: number, per_page: number, animes: Anime[]}|null>}
     */
    animes(params) {
      return request('/api/animes', params);
    },

    /**
     * @param {string} slug
     * @returns {Promise<Anime|null>} anime + `episodios`
     */
    anime(slug) {
      return request(`/api/animes/${encodeURIComponent(slug)}`);
    },

    /**
     * @param {string} slug
     * @returns {Promise<{anime: Anime, id: number, count: number, episodes: Episodio[]}|null>}
     */
    episodios(slug) {
      return request(`/api/animes/${encodeURIComponent(slug)}/episodes`);
    },

    /**
     * @returns {Promise<{nome: string, total_animes: number}[]|null>}
     */
    generos() {
      return request('/api/generos');
    },

    /**
     * URL do player (302 para o Blogger) — usar direto em `<iframe src>`.
     * @param {string} slug
     * @param {number|string} numero
     * @returns {string}
     */
    stream(slug, numero) {
      return `${API}/api/stream/${encodeURIComponent(slug)}/${encodeURIComponent(numero)}`;
    },

    /**
     * Endereço final do player, sem passar pelo 302.
     * @param {string} slug
     * @param {number|string} numero
     * @returns {Promise<{slug: string, numero: number, embed_url: string, source: string, status: string}|null>}
     */
    embed(slug, numero) {
      return request(`/api/embed/${encodeURIComponent(slug)}/${encodeURIComponent(numero)}`);
    },

    /**
     * Versão leve do anime: titulo + episodios[{numero, status}], sem sources.
     * Se `/api/animes/{slug}/lite` falhar, cai para o detalhe completo — a falha
     * não é retentada pra não custar 500ms.
     * @param {string} slug
     * @returns {Promise<{id: number, slug: string, titulo: string, episodios: {numero: number, status: string}[]}|null>}
     */
    async lite(slug) {
      const leve = await request(`/api/animes/${encodeURIComponent(slug)}/lite`, null, { retry: false });
      if (leve && Array.isArray(leve.episodios)) return leve;

      return request(`/api/animes/${encodeURIComponent(slug)}`);
    }
  };
})();
