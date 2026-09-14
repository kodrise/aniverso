# Aniverso

Site de streaming de anime. HTML/CSS/JS puro + API própria.

## Rodar local

```sh
python3 -m http.server 8090
```

Abre em `http://localhost:8090`. Não tem build, npm nem dependência: é só servir a pasta.

## Deploy

```sh
vercel --prod
```

O `vercel.json` liga `cleanUrls`, então `/anime` serve `anime.html` (o `.html` sai da URL). Não há rewrite para o `index.html`: é site multipágina, cada `.html` é acessado direto.

## API

`https://streamapi-peach.vercel.app`

O cliente fica em `js/api.js` (`const API`), sem SDK — `fetch` puro com 1 retry automático. Endpoints que o cliente expõe, e quem usa cada um:

- `GET /api/animes` — listagem (filtros: `genero`, `ano_min`, `nota_min`, `audio`, `busca`, `ordem`, `desc`, `page`, `per_page`) — home, gênero e busca
- `GET /api/animes/{slug}` — detalhe completo (metadados + episódios + sources) — página do anime e fallback do player
- `GET /api/animes/{slug}/lite` — versão leve (título + `episodios[{numero, status}]`) — player
- `GET /api/embed/{slug}/{numero}` — endereço final do player, sem passar pelo 302 — iframe do player
- `GET /api/animes/{slug}/episodes` — episódios (exposto no cliente, nenhuma página usa)
- `GET /api/generos` — gêneros (exposto no cliente, nenhuma página usa)
- `GET /api/stream/{slug}/{numero}` — 302 para o player (exposto no cliente, o site usa `/embed`)

## Estrutura

```
aniverso/
├── index.html      home: hero rotativo, novos episódios, recentes, top notas, dublados
├── anime.html      detalhe do anime: capa, sinopse, gêneros, lista de episódios
├── watch.html      player: iframe do player + navegação entre episódios
├── busca.html      resultados da busca (?q=)
├── generos.html    lista de gêneros
├── genero.html     animes de um gênero (?nome=)
├── 404.html        página não encontrada
├── sobre.html      sobre
├── contato.html    contato
├── dmca.html       dmca
├── css/
│   └── style.css   design tokens + todos os componentes
├── js/
│   ├── icons.js    ícones SVG inline (objeto Icon)
│   ├── api.js      cliente da API (const API)
│   ├── home.js     home (cache de 5min em sessionStorage)
│   ├── anime.js    detalhe do anime
│   ├── watch.js    player
│   ├── busca.js    busca
│   └── genero.js   gênero
├── vercel.json     cleanUrls + cache de /css e /js
└── README.md
```

Sem emoji no projeto: todo ícone é SVG inline vindo de `js/icons.js`.
