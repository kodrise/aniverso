// bottom navigation mobile — injeta a nav e marca a aba ativa
const ITENS = [
  {
    pagina: "home",
    rotulo: "Home",
    href: "/",
    icone: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  },
  {
    pagina: "catalogo",
    rotulo: "Catálogo",
    href: "/catalogo",
    icone: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  },
  {
    pagina: "favoritos",
    rotulo: "Favoritos",
    href: "/favoritos",
    icone: '<path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 5.8-8.5 11.3-8.5 11.3Z"/>',
  },
  {
    pagina: "perfil",
    rotulo: "Perfil",
    href: "/perfil",
    icone: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  },
];

function abaAtual() {
  const caminho = window.location.pathname;
  const raiz = caminho.replace(/\/+$/, "") || "/";
  return ITENS.find((item) => item.href === raiz)?.pagina ?? null;
}

function montarBottomNav() {
  if (document.querySelector(".bottom-nav")) return;

  const ativa = abaAtual();

  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  nav.setAttribute("aria-label", "Navegação principal");

  nav.innerHTML = ITENS.map((item) => {
    const classe = ["bottom-nav-item", item.pagina === ativa ? "ativo" : ""]
      .filter(Boolean)
      .join(" ");
    return `<a href="${item.href}" class="${classe}" data-page="${item.pagina}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${item.icone}</svg>
        <span>${item.rotulo}</span>
      </a>`;
  }).join("");

  document.body.appendChild(nav);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", montarBottomNav);
} else {
  montarBottomNav();
}
