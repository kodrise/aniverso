// histórico de episódios assistidos — Firestore users/{uid}/history/{animeId}
// com merge bidirecional contra o localStorage (fonte de verdade local)
import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  arrayUnion,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const LS_PREFIXO = "aniverso_assistidos_";
const LS_META_PREFIXO = "aniverso_meta_";

async function uidAtual() {
  const user =
    (await (window.authPronto ?? Promise.resolve(window.__user))) ?? window.__user;
  if (!user || !user.uid) throw new Error("sem utilizador autenticado");
  return user.uid;
}

function lerLocais(slug) {
  try {
    const lista = JSON.parse(localStorage.getItem(LS_PREFIXO + slug) ?? "[]");
    return Array.isArray(lista) ? lista.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function salvarLocais(slug, eps) {
  try {
    localStorage.setItem(LS_PREFIXO + slug, JSON.stringify([...new Set(eps)]));
  } catch (erro) {
    console.error("[Aniverso] não consegui salvar o histórico local", erro);
  }
}

// meta (id, titulo, capa, total) — populado pelo /anime e /watch;
// permite fazer upload do histórico criado enquanto deslogado
function cacheMeta(anime) {
  try {
    if (!anime || !anime.id) return;
    localStorage.setItem(
      LS_META_PREFIXO + anime.slug,
      JSON.stringify({
        id: anime.id,
        titulo: anime.titulo,
        capa: anime.capa || lerMetaCache(anime.slug)?.capa || "",
        total_eps: Number(anime.episodes_count ?? (anime.episodios ?? []).length) || 0,
      })
    );
  } catch {
    /* storage indisponível — ignorado */
  }
}

function lerMetaCache(slug) {
  try {
    return JSON.parse(localStorage.getItem(LS_META_PREFIXO + slug) ?? "null");
  } catch {
    return null;
  }
}

async function escrever(anime, numero) {
  const uid = await uidAtual();
  if (!anime || !anime.id) return;

  const total = Number(anime.episodes_count ?? (anime.episodios ?? []).length) || 0;

  await setDoc(
    doc(db, "users", uid, "history", String(anime.id)),
    {
      slug: anime.slug,
      titulo: anime.titulo,
      capa: anime.capa || lerMetaCache(anime.slug)?.capa || "",
      eps: arrayUnion(Number(numero)),
      ultimo_ep: Number(numero),
      atualizado_em: serverTimestamp(),
      total_eps: total,
    },
    { merge: true }
  );

  cacheMeta(anime);
}

// lista o histórico inteiro, do mais recente para o mais antigo
async function lerTodos() {
  const uid = await uidAtual();
  const q = query(collection(db, "users", uid, "history"), orderBy("atualizado_em", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// lê só o histórico de um anime (para o botão "Continuar" do /anime)
async function lerUm(animeId) {
  const uid = await uidAtual();
  const snap = await getDoc(doc(db, "users", uid, "history", String(animeId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function contar() {
  const uid = await uidAtual();
  const snap = await getDocs(collection(db, "users", uid, "history"));
  return snap.size;
}

// sync bidirecional: união local ∪ remoto para cada anime;
// também faz upload do histórico que só existe localmente (criado deslogado)
async function sincronizar() {
  const uid = await uidAtual();
  const snap = await getDocs(collection(db, "users", uid, "history"));

  const remoto = new Map();
  snap.forEach((documento) => {
    const dados = documento.data();
    if (dados.slug) remoto.set(dados.slug, { ref: documento.ref, dados });
  });

  const pendentes = [];

  // 1. merge do que existe dos dois lados
  for (const [slug, { ref, dados }] of remoto) {
    const locais = lerLocais(slug);
    const remotos = Array.isArray(dados.eps) ? dados.eps.map(Number).filter(Number.isFinite) : [];
    const uniao = [...new Set([...locais, ...remotos])];

    if (uniao.length !== remotos.length) {
      pendentes.push(
        setDoc(
          ref,
          {
            eps: uniao,
            ultimo_ep: uniao.length ? Math.max(...uniao) : dados.ultimo_ep ?? 0,
            atualizado_em: serverTimestamp(),
          },
          { merge: true }
        ).catch((erro) => console.error("[Aniverso] sync: falhou reescrever", slug, erro))
      );
    }

    if (uniao.length !== locais.length) salvarLocais(slug, uniao);
  }

  // 2. upload do histórico que só existe localmente (visto enquanto deslogado)
  const slugsLocais = listarSlugsLocais();
  for (const slug of slugsLocais) {
    if (remoto.has(slug)) continue;

    const eps = lerLocais(slug);
    if (!eps.length) continue;

    const meta = lerMetaCache(slug);
    if (!meta) continue; // sem id não há caminho no Firestore; pega no próximo /anime

    // um snapshot vazio pode ser leitura falhada (corrida de auth) e não ausência real:
    // confirmar antes de escrever para nunca encolher um doc existente
    const existe = await getDoc(doc(db, "users", uid, "history", String(meta.id)));
    if (existe.exists()) continue;

    pendentes.push(
      setDoc(
        doc(db, "users", uid, "history", String(meta.id)),
        {
          slug,
          titulo: meta.titulo,
          capa: meta.capa,
          eps: arrayUnion(...eps),
          ultimo_ep: Math.max(...eps),
          atualizado_em: serverTimestamp(),
          total_eps: meta.total_eps,
        },
        { merge: true }
      ).catch((erro) => console.error("[Aniverso] sync: falhou subir", slug, erro))
    );
  }

  await Promise.all(pendentes);
}

function listarSlugsLocais() {
  const slugs = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave && chave.startsWith(LS_PREFIXO)) slugs.push(chave.slice(LS_PREFIXO.length));
    }
  } catch {
    /* storage indisponível — ignorado */
  }
  return slugs;
}

window.Historico = { escrever, lerTodos, lerUm, contar, sincronizar, cacheMeta };

export { escrever, lerTodos, lerUm, contar, sincronizar, cacheMeta };
