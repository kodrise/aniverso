// init de paginas com Turbo: o module avalia uma vez so (module map), por isso
// o listener e' registado aqui e dispara em cada turbo:load (incluindo a carga
// fria). O guard (url + body) evita o double-init quando DOMContentLoaded e o
// turbo:load da carga inicial disparam para o mesmo body.
//
// NOTA: na 1a visita Turbo a uma pagina, o modulo e' buscado assincronamente e
// pode avaliar DEPOIS do turbo:load dessa renderizacao — o listener chega tarde
// demais e o init nunca roda. Por isso rodamos tambem aqui (o guard so' deixa
// passar uma vez por url+body).
export function registrarInit(fn) {
  let ultimaUrl = null;
  let ultimoBody = null;

  const rodar = () => {
    if (ultimaUrl === location.href && ultimoBody === document.body) return;
    ultimaUrl = location.href;
    ultimoBody = document.body;
    fn();
  };

  document.addEventListener("DOMContentLoaded", rodar);
  document.addEventListener("turbo:load", rodar);
  rodar();
}
