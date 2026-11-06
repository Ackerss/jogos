/* Grande Prêmio dos Bichos — arte desenhada em código (SVG), igual na TV e no celular.
   Nada de imagem externa nem emoji: fica igual em qualquer aparelho (inclusive na TV LG). */
(function () {
  'use strict';

  function olho(x, y, r) {
    r = r || 5;
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff"/><circle cx="' + (x + r * 0.25) + '" cy="' + y + '" r="' + (r * 0.55) + '" fill="#1b1424"/><circle cx="' + (x + r * 0.45) + '" cy="' + (y - r * 0.3) + '" r="' + (r * 0.2) + '" fill="#fff"/>';
  }
  var SOMBRA = '<ellipse cx="60" cy="94" rx="40" ry="5" fill="#000" opacity=".22"/>';
  var CONTORNO = 'stroke="#2a1b2e" stroke-width="3" stroke-linejoin="round"';

  var DESENHOS = {
    tartaruga: function () {
      return SOMBRA +
        '<path d="M14 72 l-8 4 8 2z" fill="#7cc95a" ' + CONTORNO + '/>' +
        '<rect x="26" y="70" width="14" height="18" rx="6" fill="#7cc95a" ' + CONTORNO + '/><rect x="74" y="70" width="14" height="18" rx="6" fill="#7cc95a" ' + CONTORNO + '/>' +
        '<circle cx="104" cy="58" r="15" fill="#8fd96a" ' + CONTORNO + '/>' +
        '<path d="M14 74 Q14 26 58 24 Q100 26 100 74 Z" fill="#2fbf63" ' + CONTORNO + '/>' +
        '<path d="M40 34 L58 30 L76 34 L80 52 L58 60 L36 52 Z" fill="#5fe08a" opacity=".55"/>' +
        '<path d="M36 52 L24 66 M80 52 L92 66 M58 60 L58 74" stroke="#1d8f45" stroke-width="3" fill="none"/>' +
        '<rect x="12" y="68" width="92" height="9" rx="4.5" fill="#f7d76b" ' + CONTORNO + '/>' +
        olho(108, 53, 5.5) + '<path d="M106 65 q5 3 10 0" stroke="#2a1b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    },
    porco: function () {
      return SOMBRA +
        '<path d="M22 54 q-12 -4 -8 -12 q4 -6 8 0" stroke="#e86e9a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<rect x="30" y="70" width="12" height="20" rx="5" fill="#ff9fc2" ' + CONTORNO + '/><rect x="70" y="70" width="12" height="20" rx="5" fill="#ff9fc2" ' + CONTORNO + '/>' +
        '<ellipse cx="58" cy="60" rx="38" ry="26" fill="#ffb6cf" ' + CONTORNO + '/>' +
        '<path d="M34 42 Q58 30 80 42 L76 56 Q58 50 38 56 Z" fill="#ff5f99" ' + CONTORNO + '/>' +
        '<path d="M86 30 l4 -14 10 12z" fill="#ff9fc2" ' + CONTORNO + '/>' +
        '<circle cx="96" cy="50" r="20" fill="#ffb6cf" ' + CONTORNO + '/>' +
        '<ellipse cx="112" cy="56" rx="9" ry="8" fill="#ff8db5" ' + CONTORNO + '/><circle cx="109" cy="56" r="1.8" fill="#2a1b2e"/><circle cx="115" cy="56" r="1.8" fill="#2a1b2e"/>' +
        olho(98, 43, 5) + '<circle cx="88" cy="58" r="3.5" fill="#ff7aa8" opacity=".7"/>';
    },
    pato: function () {
      return SOMBRA +
        '<path d="M44 82 v8 h-8 M68 82 v8 h-8" stroke="#ff9a1f" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M18 52 l-10 -8 14 2z" fill="#ffd84a" ' + CONTORNO + '/>' +
        '<ellipse cx="56" cy="62" rx="38" ry="24" fill="#ffd84a" ' + CONTORNO + '/>' +
        '<path d="M34 56 Q52 46 70 58 Q56 74 36 66 Z" fill="#f6b800" ' + CONTORNO + '/>' +
        '<circle cx="92" cy="36" r="18" fill="#ffd84a" ' + CONTORNO + '/>' +
        '<path d="M104 38 Q122 36 118 46 Q108 50 102 46 Z" fill="#ff8a1f" ' + CONTORNO + '/>' +
        '<rect x="76" y="50" width="22" height="7" rx="3.5" fill="#4a7bff" ' + CONTORNO + '/>' +
        olho(95, 31, 5);
    },
    coelho: function () {
      return SOMBRA +
        '<circle cx="22" cy="58" r="9" fill="#ffffff" ' + CONTORNO + '/>' +
        '<rect x="32" y="72" width="16" height="18" rx="7" fill="#eef2ff" ' + CONTORNO + '/><rect x="66" y="72" width="16" height="18" rx="7" fill="#eef2ff" ' + CONTORNO + '/>' +
        '<ellipse cx="56" cy="64" rx="34" ry="24" fill="#f4f6ff" ' + CONTORNO + '/>' +
        '<path d="M34 46 Q56 36 76 46 L72 62 Q56 56 38 62 Z" fill="#4fa3ff" ' + CONTORNO + '/>' +
        '<ellipse cx="84" cy="16" rx="6" ry="18" transform="rotate(-12 84 16)" fill="#f4f6ff" ' + CONTORNO + '/><ellipse cx="84" cy="16" rx="2.6" ry="12" transform="rotate(-12 84 16)" fill="#ffb3cf"/>' +
        '<ellipse cx="98" cy="18" rx="6" ry="18" transform="rotate(12 98 18)" fill="#f4f6ff" ' + CONTORNO + '/><ellipse cx="98" cy="18" rx="2.6" ry="12" transform="rotate(12 98 18)" fill="#ffb3cf"/>' +
        '<circle cx="94" cy="46" r="18" fill="#f4f6ff" ' + CONTORNO + '/>' +
        '<circle cx="111" cy="50" r="3" fill="#ff7aa8"/><circle cx="96" cy="55" r="3.5" fill="#ffb3cf" opacity=".8"/>' +
        olho(100, 41, 5);
    },
    gato: function () {
      return SOMBRA +
        '<path d="M24 60 Q4 50 12 26" stroke="#2a1b2e" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M24 60 Q4 50 12 26" stroke="#ff9a3d" stroke-width="6.5" fill="none" stroke-linecap="round"/>' +
        '<rect x="32" y="70" width="12" height="20" rx="5" fill="#ff9a3d" ' + CONTORNO + '/><rect x="70" y="70" width="12" height="20" rx="5" fill="#ff9a3d" ' + CONTORNO + '/>' +
        '<ellipse cx="56" cy="62" rx="36" ry="21" fill="#ffad5c" ' + CONTORNO + '/>' +
        '<path d="M44 44 l4 14 M58 42 l0 14 M72 44 l-4 14" stroke="#d96a12" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M80 34 l2 -18 12 12z M100 30 l10 -14 2 18z" fill="#ffad5c" ' + CONTORNO + '/>' +
        '<circle cx="94" cy="46" r="19" fill="#ffad5c" ' + CONTORNO + '/>' +
        '<path d="M100 54 l12 -2 M100 57 l12 2 M88 54 l-12 -2" stroke="#2a1b2e" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M104 50 l3 3 -6 0z" fill="#ff6f91"/>' +
        olho(90, 42, 4.6) + olho(103, 42, 4.6);
    }
  };

  /* Bicho em SVG. classe opcional para o <svg>. */
  function bicho(id, classe) {
    var d = DESENHOS[id];
    return '<svg class="' + (classe || 'bicho-svg') + '" viewBox="0 0 124 100" aria-hidden="true">' + (d ? d() : '') + '</svg>';
  }

  var PONTOS = { 1: [[50, 50]], 2: [[30, 30], [70, 70]], 3: [[28, 28], [50, 50], [72, 72]] };
  /* Dado da cor do bicho (valor 0 = sem número, só a cor). */
  function dado(cor, valor, classe) {
    var p = (PONTOS[valor] || []).map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="9" fill="#2a1b2e"/>'; }).join('');
    return '<svg class="' + (classe || 'dado-svg') + '" viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="6" width="88" height="88" rx="20" fill="' + cor + '" stroke="#2a1b2e" stroke-width="5"/>' +
      '<rect x="14" y="12" width="72" height="20" rx="10" fill="#fff" opacity=".25"/>' + p + '</svg>';
  }
  function bilhete(cor, valor, classe) {
    return '<svg class="' + (classe || 'bilhete-svg') + '" viewBox="0 0 100 70" aria-hidden="true">' +
      '<path d="M6 8 h88 v18 a9 9 0 0 0 0 18 v18 h-88 v-18 a9 9 0 0 0 0 -18z" fill="' + cor + '" stroke="#2a1b2e" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M30 12 v46" stroke="#2a1b2e" stroke-width="2.5" stroke-dasharray="5 4" opacity=".5"/>' +
      (valor !== undefined && valor !== null ? '<text x="62" y="49" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="36" fill="#2a1b2e">' + valor + '</text>' : '') + '</svg>';
  }
  function banana(classe) {
    return '<svg class="' + (classe || 'banana-svg') + '" viewBox="0 0 100 80" aria-hidden="true">' +
      '<path d="M50 40 Q30 66 8 60 Q24 52 40 34 Z" fill="#ffd93b" stroke="#2a1b2e" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M50 40 Q72 66 94 58 Q78 50 62 34 Z" fill="#ffd93b" stroke="#2a1b2e" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M50 42 Q46 64 38 76 Q56 70 58 42 Z" fill="#f2c200" stroke="#2a1b2e" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M42 38 Q50 14 58 38 Z" fill="#ffe680" stroke="#2a1b2e" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M48 18 l3 -10 5 2 -3 10z" fill="#7a5a2a" stroke="#2a1b2e" stroke-width="3"/></svg>';
  }
  function moeda(classe) {
    return '<svg class="' + (classe || 'moeda-svg') + '" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="#ffc933" stroke="#2a1b2e" stroke-width="5"/>' +
      '<circle cx="50" cy="50" r="31" fill="none" stroke="#e09a00" stroke-width="5"/>' +
      '<path d="M50 30 l6 13 14 1 -11 9 4 14 -13 -8 -13 8 4 -14 -11 -9 14 -1z" fill="#fff3b0"/></svg>';
  }
  function trofeu(classe) {
    return '<svg class="' + (classe || 'trofeu-svg') + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="M28 14 h44 v20 a22 22 0 0 1 -44 0z" fill="#ffc933" stroke="#2a1b2e" stroke-width="4.5"/>' +
      '<path d="M28 20 h-12 a12 14 0 0 0 14 22 M72 20 h12 a12 14 0 0 1 -14 22" fill="none" stroke="#2a1b2e" stroke-width="4.5"/>' +
      '<rect x="44" y="54" width="12" height="16" fill="#e09a00" stroke="#2a1b2e" stroke-width="4"/><rect x="30" y="70" width="40" height="14" rx="4" fill="#ffc933" stroke="#2a1b2e" stroke-width="4.5"/></svg>';
  }
  function copo(classe) {
    return '<svg class="' + (classe || 'copo-svg') + '" viewBox="0 0 100 100" aria-hidden="true"><path d="M18 22 h64 l-8 66 h-48z" fill="#8a5cff" stroke="#2a1b2e" stroke-width="5" stroke-linejoin="round"/>' +
      '<rect x="12" y="14" width="76" height="14" rx="6" fill="#a98aff" stroke="#2a1b2e" stroke-width="5"/><path d="M34 40 v36" stroke="#fff" stroke-width="5" opacity=".35" stroke-linecap="round"/></svg>';
  }

  var Arte = { bicho: bicho, dado: dado, bilhete: bilhete, banana: banana, moeda: moeda, trofeu: trofeu, copo: copo };
  if (typeof window !== 'undefined') window.Arte = Arte;
})();
