import { lerTodos, sincronizar } from "./history.js";

function escapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardHistoricoHTML(item) {
  const total = Number(item.total_eps) || 0;
  const ultimo = Number(item.ultimo_ep) || 0;
  const capa = item.capa ? ` src="${escapar(item.capa)}"` : "";
  const progresso = total > 0 ? Math.min(100, Math.round((ultimo / total) * 100)) : 0;

  return `<a href="/watch?slug=${encodeURIComponent(item.slug)}&ep=${encodeURIComponent(ultimo)}"
      class="card hist-card" data-slug="${escapar(item.slug)}">
      <div class="card-thumb">
        <img${capa} alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        ${total ? `<span class="hist-pill">Ep ${ultimo} de ${total}</span>` : `<span class="hist-pill">Ep ${ultimo}</span>`}
        <span class="hist-barra" role="progressbar" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100">
          <span style="width:${progresso}%"></span>
        </span>
      </div>
      <div class="info">
        <div class="titulo">${escapar(item.titulo)}</div>
        <div class="meta">Continuar Ep ${ultimo}</div>
      </div>
    </a>`;
}

function mostrarVazio() {
  const alvo = document.getElementById("grid-historico");
  if (!alvo) return;

  alvo.innerHTML = `
    <div class="favoritos-vazio" style="grid-column: 1 / -1">
      <h2>Você ainda não assistiu nenhum episódio</h2>
      <p>Tudo que você assistir aparece aqui, em qualquer dispositivo.</p>
      <a class="btn-perfil primario" style="display:inline-block;width:auto;padding:12px 24px"
         href="/catalogo">Explorar catálogo</a>
    </div>`;
}

async function carregarHistorico() {
  const alvo = document.getElementById("grid-historico");
  if (!alvo) return;

  // exige login; sem sessão o requireAuth redireciona para /entrar
  const user = await window.requireAuth();
  if (!user) return;

  if (typeof Skeleton !== "undefined" && Skeleton.setGrid) {
    Skeleton.setGrid("grid-historico", 6);
  }

  try {
    // funde local com a nuvem antes de listar
    await sincronizar();

    const lista = await lerTodos();

    if (!lista.length) {
      mostrarVazio();
      return;
    }

    alvo.innerHTML = lista.map(cardHistoricoHTML).join("");
  } catch (erro) {
    console.error("[Aniverso] não consegui carregar o histórico", erro);
    alvo.innerHTML = `<p class="vazio" style="grid-column: 1 / -1">Não foi possível carregar seu histórico.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", carregarHistorico);
