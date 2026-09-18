# Aniverso

Site de streaming de anime. HTML/CSS/JS puro + API própria.

## Rodar local

Os ficheiros publicos ficam em `src/`. O Vercel serve essa pasta e reescreve `/`, `/anime`, `/watch` etc. para `src/pages/`.

Para imitar o deploy:

```sh
python3 -m http.server 8090 --directory src
```

Isso serve `/css` e `/js`, mas `/` aponta para `src/` (sem `index.html`). Em producao os `rewrites` do `vercel.json` mapeiam as rotas para `src/pages/`.

## Deploy

```sh
vercel --prod
```

O `vercel.json` define `outputDirectory: src`, `cleanUrls: true`, `trailingSlash: false`, cache de `/css` e `/js` (`max-age=0, must-revalidate`) e rewrites das rotas limpas (`/anime`, `/watch`, `/busca`...) para `src/pages/*.html`.

Se o deploy automatico falhar na primeira vez apos mudar o `outputDirectory`, forcar com `vercel --prod`.

## API

`https://streamapi-peach.vercel.app`

O cliente fica em `src/js/api.js` (`const API`), sem SDK — `fetch` puro com 1 retry automatico. Endpoints que o cliente expoe, e quem usa cada um:

- `GET /api/animes` — listagem (filtros: `genero`, `ano_min`, `nota_min`, `audio`, `busca`, `ordem`, `desc`, `page`, `per_page`) — home, genero e busca
- `GET /api/animes/{slug}` — detalhe completo (metadados + episodios + sources) — pagina do anime e fallback do player
- `GET /api/animes/{slug}/lite` — versao leve (titulo + `episodios[{numero, status}]`) — player
- `GET /api/embed/{slug}/{numero}` — endereco final do player, sem passar pelo 302 — iframe do player
- `GET /api/animes/{slug}/episodes` — episodios (exposto no cliente, nenhuma pagina usa)
- `GET /api/generos` — generos (exposto no cliente, nenhuma pagina usa)
- `GET /api/stream/{slug}/{numero}` — 302 para o player (exposto no cliente, o site usa `/embed`)

## Estrutura

```
aniverso/
├── src/
│   ├── pages/
│   │   ├── index.html      home: hero rotativo, novos episodios, recentes, top notas, dublados
│   │   ├── anime.html      detalhe do anime: capa, sinopse, generos, lista de episodios
│   │   ├── watch.html      player: iframe do player + navegacao entre episodios
│   │   ├── busca.html      resultados da busca (?q=)
│   │   ├── catalogo.html   catalogo com filtros (?genero, ?ano, ?tipo, ?audio, ?ordem, ?page)
│   │   ├── genero.html     animes de um genero (?nome=)
│   │   ├── 404.html        pagina nao encontrada
│   │   ├── sobre.html      sobre
│   │   ├── contato.html    contato
│   │   └── dmca.html       dmca
│   ├── css/
│   │   └── style.css       design tokens + todos os componentes
│   ├── js/
│   │   ├── icons.js        icones SVG inline (objeto Icon)
│   │   ├── api.js          cliente da API (const API)
│   │   ├── busca-live.js   dropdown de busca ao vivo (header)
│   │   ├── home.js         home (cache de 5min em sessionStorage)
│   │   ├── anime.js        detalhe do anime
│   │   ├── watch.js        player
│   │   ├── busca.js        busca
│   │   ├── catalogo.js     catalogo (filtros, paginacao e chip de ordem)
│   │   └── genero.js       genero
│   └── img/
├── vercel.json             outputDirectory src + rewrites + cache de /css e /js
└── README.md
```

Sem emoji no projeto: todo icone e SVG inline vindo de `src/js/icons.js`.
