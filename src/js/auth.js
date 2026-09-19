import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { sincronizar } from "./history.js";

function inicial(nome) {
  if (!nome) return "";
  const partes = String(nome).trim().split(/\s+/);
  return (partes[0][0] + (partes[1] ? partes[1][0] : "")).toUpperCase();
}

// em mobile o utilizador migra para a aba "Perfil" da bottom nav
const LIMITE_MOBILE = 768;
let ultimoUser = null;
let eraMobile = innerMobile();

// resolve quando o primeiro estado de auth é conhecido (user ou null)
let resolverAuth = null;
window.authPronto = new Promise((resolve) => {
  resolverAuth = resolve;
});

function innerMobile() {
  return window.innerWidth < LIMITE_MOBILE;
}

function montarHeader(user) {
  const alvo = document.getElementById("header-user");
  if (!alvo) return;

  ultimoUser = user;

  // mobile: o avatar/botão Entrar vivem na bottom nav, não no header
  if (innerMobile()) {
    alvo.innerHTML = "";
    return;
  }

  if (!user) {
    alvo.innerHTML = '<a href="/entrar" class="btn-entrar">Entrar</a>';
    return;
  }

  const avatar = inicial(user.displayName) || inicial(user.email) || "?";

  alvo.innerHTML = `
    <div class="user-menu" id="user-menu">
      <button class="user-avatar" type="button" aria-label="Menu do utilizador" aria-expanded="false">${escapar(avatar)}</button>
      <div class="user-drop">
        <a href="/perfil">Perfil</a>
        <a href="/favoritos">Favoritos</a>
        <button type="button" data-action="logout">Sair</button>
      </div>
    </div>`;

  const menu = alvo.querySelector("#user-menu");
  const botao = menu.querySelector(".user-avatar");

  botao.addEventListener("click", () => {
    const aberto = menu.classList.toggle("aberto");
    botao.setAttribute("aria-expanded", String(aberto));
  });

  menu.querySelector('[data-action="logout"]').addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (erro) {
      console.error("[Aniverso] erro ao sair", erro);
    }
    irPara("/");
  });
}

function escapar(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function initAuthHeader() {
  onAuthStateChanged(auth, (user) => {
    window.__user = user ?? null;
    if (resolverAuth) {
      resolverAuth(user ?? null);
      resolverAuth = null;
    }
    // logado: funde o histórico local com a nuvem (best-effort)
    if (user) {
      sincronizar().catch((erro) => console.error("[Aniverso] sync do histórico falhou", erro));
    }
    montarHeader(user);
  });
}

// volta a pintar o header quando a janela cruza a fronteira mobile/desktop
let resizeTimer = null;
window.addEventListener("resize", () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const agoraMobile = innerMobile();
    if (agoraMobile !== eraMobile) {
      eraMobile = agoraMobile;
      montarHeader(ultimoUser);
    }
  }, 150);
});

// fecha o menu ao clicar fora dele
document.addEventListener("click", (evento) => {
  const menu = document.getElementById("user-menu");
  if (menu && menu.classList.contains("aberto") && !menu.contains(evento.target)) {
    menu.classList.remove("aberto");
    menu.querySelector(".user-avatar")?.setAttribute("aria-expanded", "false");
  }
});

export function requireAuth() {
  return new Promise((resolve) => {
    const cancelar = onAuthStateChanged(auth, (user) => {
      cancelar();
      if (user) {
        resolve(user);
      } else {
        const next = encodeURIComponent(location.pathname + location.search);
        irPara(`/entrar?next=${next}`);
      }
    });
  });
}

// navegacao Turbo quando disponivel (mantem header/nav permanentes);
// recorre ao reload completo em ambientes sem Turbo
export function irPara(url) {
  if (window.Turbo?.visit) {
    window.Turbo.visit(url);
  } else {
    location.href = url;
  }
}

// exposto para scripts clássicos (anime.js, watch.js) que não são módulos ES
window.requireAuth = requireAuth;
window.irPara = irPara;

// auto-executa na carga de qualquer página que inclua este módulo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initAuthHeader());
} else {
  initAuthHeader();
}
