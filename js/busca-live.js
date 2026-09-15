// busca ao vivo — dropdown com resultados
(function () {
  const input = document.getElementById('busca');
  const drop = document.getElementById('busca-drop');
  if (!input || !drop) return;

  let timer, ultimo = '', ativo = -1, itens = [];

  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  };

  function fechar() {
    drop.hidden = true;
    drop.innerHTML = '';
    ativo = -1;
    itens = [];
  }

  function pintar(lista) {
    if (!lista.length) {
      drop.innerHTML = '<div class="busca-vazio">Nenhum resultado</div>';
      drop.hidden = false;
      return;
    }

    drop.innerHTML = lista.slice(0, 8).map((a, i) => `
      <a class="busca-item" data-i="${i}" href="/anime.html?slug=${encodeURIComponent(a.slug)}">
        <img src="${esc(a.capa || '')}" alt="" loading="lazy">
        <div class="busca-item-info">
          <div class="busca-item-titulo">${esc(a.titulo)}</div>
          <div class="busca-item-meta">${esc(a.ano || '')}${a.episodes_count ? ' · ' + a.episodes_count + ' episódios' : ''}</div>
        </div>
      </a>`).join('');

    drop.hidden = false;
    itens = Array.from(drop.querySelectorAll('.busca-item'));
  }

  input.addEventListener('input', () => {
    const t = input.value.trim();
    ultimo = t;
    clearTimeout(timer);
    if (t.length < 2) { fechar(); return; }

    timer = setTimeout(async () => {
      const d = await AniversoAPI.animes({ busca: t, per_page: 20 });
      if (!d || t !== ultimo) return;
      pintar((d.animes || []).filter((a) => a.titulo && (a.titulo.includes(' ') || !a.titulo.includes('-'))));
    }, 220);
  });

  input.addEventListener('keydown', (e) => {
    if (drop.hidden || !itens.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      ativo = Math.min(ativo + 1, itens.length - 1);
      itens.forEach((el, i) => el.classList.toggle('ativo', i === ativo));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      ativo = Math.max(ativo - 1, 0);
      itens.forEach((el, i) => el.classList.toggle('ativo', i === ativo));
    } else if (e.key === 'Enter' && ativo >= 0) {
      e.preventDefault();
      itens[ativo].click();
    } else if (e.key === 'Escape') {
      fechar();
      input.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.busca-wrap')) fechar();
  });
})();
