// helpers de favoritos no Firestore — users/{uid}/favorites/{slug}
import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function refFav(uid, slug) {
  return doc(db, "users", uid, "favorites", slug);
}

// o user precisa de estar autenticado para qualquer operação;
// aguarda o estado de auth para cobrir o caso de a sessão restaurar tarde
async function uidAtual() {
  const user = (await (window.authPronto ?? Promise.resolve(window.__user))) ?? window.__user;
  if (!user || !user.uid) throw new Error("sem utilizador autenticado");
  return user.uid;
}

async function verificar(slug) {
  const uid = await uidAtual();
  const snap = await getDoc(refFav(uid, slug));
  return snap.exists();
}

// devolve o favorito no formato que o cardHTML entende
async function listar() {
  const uid = await uidAtual();
  const q = query(collection(db, "users", uid, "favorites"), orderBy("adicionado_em", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// alterna o estado; devolve true se ficou favorito, false se foi removido
async function alternar(anime) {
  const uid = await uidAtual();
  const ref = refFav(uid, anime.slug);

  if (await getDoc(ref).then((s) => s.exists())) {
    await deleteDoc(ref);
    return false;
  }

  await setDoc(ref, {
    slug: anime.slug,
    titulo: anime.titulo,
    capa: anime.capa ?? "",
    episodes_count: anime.episodes_count ?? (anime.episodios ?? []).length,
    ano: anime.ano ?? null,
    audio: anime.audio ?? [],
    adicionado_em: Date.now(),
  });

  return true;
}

const Favoritos = { verificar, listar, alternar };

export { verificar, listar, alternar };

// exposto para scripts clássicos (anime.js) que não são módulos ES
window.Favoritos = Favoritos;
