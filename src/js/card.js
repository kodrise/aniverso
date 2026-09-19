// card de anime partilhado entre a home e a página de favoritos
function escapar(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rotuloAudio(valor) {
  if (valor === "dublado" || valor === "ptBr") return { classe: "dublado", label: "Dublado" };
  if (valor === "legendado" || valor === "jap") return { classe: "legendado", label: "Legendado" };
  return null;
}

function cardHTML(anime) {
  const capa = anime.capa ? ` src="${escapar(anime.capa)}"` : "";
  const partes = [];
  const audio = rotuloAudio((anime.audio ?? [])[0]);

  if (anime.episodes_count === 1) partes.push("1 episódio");
  else if (anime.episodes_count > 1) partes.push(`${anime.episodes_count} episódios`);

  if (anime.ano) partes.push(anime.ano);

  const meta = partes.join(" · ");

  return `<a href="/anime?slug=${encodeURIComponent(anime.slug)}" class="card">
      <div class="card-thumb">
        <img${capa} alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        ${audio ? `<span class="card-badge ${audio.classe}">${audio.label}</span>` : ""}
      </div>
      <div class="info">
        <div class="titulo">${escapar(anime.titulo)}</div>
        <div class="meta">${escapar(meta)}</div>
      </div>
    </a>`;
}

export { cardHTML, rotuloAudio, escapar };
