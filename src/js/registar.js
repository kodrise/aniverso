import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const form = document.getElementById("form-registar");
const erroEl = document.getElementById("erro");
const loadingEl = document.getElementById("loading");
const googleBtn = document.getElementById("google");

function proximoDestino() {
  const params = new URLSearchParams(location.search);
  return params.get("next") || "/";
}

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

function mapearErro(erro) {
  const codigo = erro?.code || "";
  const mapas = {
    "auth/email-already-in-use": "Já existe uma conta com este email.",
    "auth/invalid-email": "Endereço de email inválido.",
    "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
    "auth/invalid-credential": "Credenciais inválidas.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase.",
    "auth/network-request-failed": "Sem ligação à internet. Tente novamente."
  };
  return mapas[codigo] || "Algo deu errado. Tente novamente.";
}

if (form) {
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    esconderErro();

    const nome = form.nome.value.trim();
    const email = form.email.value.trim();
    const senha = form.senha.value;

    if (!nome || !email || !senha) {
      mostrarErro("Preencha todos os campos.");
      return;
    }

    if (senha.length < 6) {
      mostrarErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    iniciarLoading();
    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(credencial.user, { displayName: nome });
      location.href = proximoDestino();
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
      location.href = proximoDestino();
    } catch (erro) {
      pararLoading();
      if (erro?.code !== "auth/popup-closed-by-user") {
        mostrarErro(mapearErro(erro));
      }
    }
  });
}

// ja logado? manda direto
onAuthStateChanged(auth, (user) => {
  if (user) location.href = proximoDestino();
});
