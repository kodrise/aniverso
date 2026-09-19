import { cardHTML } from "./card.js";
import { listar } from "./favs.js";

function mostrarVazio() {
  const alvo = document.getElementById("grid-favoritos");
  if (!alvo) return;

  alvo.innerHTML = `
    <div class="favoritos-vazio" style="grid-column: 1 / -1">
      <h2>Você ainda não favoritou nenhum anime</h2>
      <p>Toque no coração na página de um anime para salvá-lo aqui.</p>
      <a class="btn-perfil primario" style="display:inline-block;width:auto;padding:12px 24px"
         href="/catalogo">Explorar catálogo</a>
    </div>`;
}

async function carregarFavoritos() {
  const alvo = document.getElementById("grid-favoritos");
  if (!alvo) return;

  // exige login; se não houver sessão, requireAuth redireciona para /entrar
  const user = await window.requireAuth();
  if (!user) return;

  if (typeof Skeleton !== "undefined" && Skeleton.setGrid) {
    Skeleton.setGrid("grid-favoritos", 6);
  }

  try {
    const lista = await listar();

    if (!lista.length) {
      mostrarVazio();
      return;
    }

    alvo.innerHTML = lista.map(cardHTML).join("");
  } catch (erro) {
    console.error("[Aniverso] não consegui carregar os favoritos", erro);
    alvo.innerHTML = `<p class="vazio" style="grid-column: 1 / -1">Não foi possível carregar seus favoritos.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", carregarFavoritos);
