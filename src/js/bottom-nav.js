// bottom navigation mobile — a nav já está no HTML; aqui só se marca a aba ativa
const ITENS = [
  { pagina: "home", href: "/" },
  { pagina: "catalogo", href: "/catalogo" },
  { pagina: "favoritos", href: "/favoritos" },
  { pagina: "perfil", href: "/perfil" },
];

function abaAtual() {
  const raiz = window.location.pathname.replace(/\/+$/, "") || "/";
  return ITENS.find((item) => item.href === raiz)?.pagina ?? null;
}

function marcarAtiva() {
  const ativa = abaAtual();
  if (!ativa) return;

  document.querySelectorAll(".bottom-nav-item").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.page === ativa);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", marcarAtiva);
} else {
  marcarAtiva();
}

// prefetch dos links da nav ao hover/toque (>100ms) — navegação quase instantânea;
// browsers sem suporte a <link rel=prefetch> ignoram silenciosamente
(function prefetchNav() {
  document.querySelectorAll(".bottom-nav-item").forEach((a) => {
    let timer;
    const prefetch = () => {
      if (a.dataset.prefeito) return;
      a.dataset.prefeito = "1";
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = a.href;
      document.head.appendChild(link);
    };
    a.addEventListener("mouseenter", () => {
      timer = setTimeout(prefetch, 100);
    });
    a.addEventListener("touchstart", () => {
      timer = setTimeout(prefetch, 100);
    }, { passive: true });
    a.addEventListener("mouseleave", () => clearTimeout(timer));
    a.addEventListener("touchend", () => clearTimeout(timer));
  });
})();
