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
