import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

function inicial(nome) {
  if (!nome) return "?";
  const partes = String(nome).trim().split(/\s+/);
  return (partes[0][0] + (partes[1] ? partes[1][0] : "")).toUpperCase();
}

function escapar(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function carregarPerfil() {
  const alvo = document.getElementById("perfil-card");
  if (!alvo) return;

  // exige login; sem sessão o requireAuth redireciona para /entrar
  const user = await window.requireAuth();
  if (!user) return;

  const nome = user.displayName || user.email?.split("@")[0] || "Utilizador";

  alvo.innerHTML = `
    <div class="perfil-avatar">${escapar(inicial(user.displayName) || inicial(user.email))}</div>
    <div class="perfil-nome">${escapar(user.displayName || nome)}</div>
    <div class="perfil-email">${escapar(user.email || "")}</div>
    <div class="perfil-acoes">
      <a class="btn-perfil primario" href="/favoritos">Ver favoritos</a>
      <button class="btn-perfil secundario sair" type="button" data-action="logout">Sair da conta</button>
    </div>`;

  alvo.querySelector('[data-action="logout"]').addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (erro) {
      console.error("[Aniverso] erro ao sair", erro);
    }
    location.href = "/";
  });
}

document.addEventListener("DOMContentLoaded", carregarPerfil);
