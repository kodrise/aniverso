import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { registrarInit } from "./turbo-init.js";
import { irPara } from "./auth.js";

function proximoDestino() {
  const params = new URLSearchParams(location.search);
  return params.get("next") || "/";
}

function mapearErro(erro) {
  const codigo = erro?.code || "";
  const mapas = {
    "auth/invalid-credential": "Email ou senha incorretos.",
    "auth/user-not-found": "Email ou senha incorretos.",
    "auth/wrong-password": "Email ou senha incorretos.",
    "auth/invalid-email": "Endereço de email inválido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase.",
    "auth/network-request-failed": "Sem ligação à internet. Tente novamente."
  };
  return mapas[codigo] || "Algo deu errado. Tente novamente.";
}

function ligarFormulario() {
  const form = document.getElementById("form-entrar");
  const erroEl = document.getElementById("erro");
  const loadingEl = document.getElementById("loading");
  const googleBtn = document.getElementById("google");

  // so' segue se estivermos na pagina de entrar (o modulo persiste entre paginas)
  if (!form) return;

  // ja logado? manda direto (one-shot por visita)
  const cancelarRedirecionamento = onAuthStateChanged(auth, (user) => {
    cancelarRedirecionamento();
    if (user) irPara(proximoDestino());
  });

  function mostrarErro(mensagem) {
    if (!erroEl) return;
    erroEl.textContent = mensagem;
    erroEl.hidden = false;
  }

  function esconderErro() {
    if (erroEl) erroEl.hidden = true;
  }

  function iniciarLoading() {
    if (loadingEl) loadingEl.hidden = false;
    if (googleBtn) googleBtn.disabled = true;
    if (form) form.querySelector("button[type=submit]").disabled = true;
  }

  function pararLoading() {
    if (loadingEl) loadingEl.hidden = true;
    if (googleBtn) googleBtn.disabled = false;
    if (form) form.querySelector("button[type=submit]").disabled = false;
  }

  if (form) {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      esconderErro();

      const email = form.email.value.trim();
      const senha = form.senha.value;

      if (!email || !senha) {
        mostrarErro("Preencha email e senha.");
        return;
      }

      iniciarLoading();
      try {
        await signInWithEmailAndPassword(auth, email, senha);
        irPara(proximoDestino());
      } catch (erro) {
        pararLoading();
        mostrarErro(mapearErro(erro));
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      esconderErro();
      iniciarLoading();
      try {
        const provedor = new GoogleAuthProvider();
        await signInWithPopup(auth, provedor);
        irPara(proximoDestino());
      } catch (erro) {
        pararLoading();
        // o utilizador fechar o popup nao e' erro
        if (erro?.code !== "auth/popup-closed-by-user") {
          mostrarErro(mapearErro(erro));
        }
      }
    });
  }
}

registrarInit(ligarFormulario);
