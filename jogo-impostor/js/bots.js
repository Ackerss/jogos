/* O Impostor — bots (para testar sozinho ou completar a mesa).
   Os bots não escutam: com bots na mesa, as pistas são escritas no celular e aparecem na TV.
   Cada bot só usa o que saberia: o inocente conhece a palavra; o impostor só vê o tema, a grade e as pistas. */
(function (raiz) {
  'use strict';
  var R = raiz.Regras || (typeof require === 'function' ? require('./regras.js') : null);
  var norm = R.norm;

  /* A pista combina com a palavra i da grade? (a própria palavra ou uma das pistas dela) */
  function combina(r, texto, i) {
    var t = norm(texto); if (!t) return false;
    var alvos = [norm(r.palavras[i])].concat(r.pistasBot[i].map(norm));
    return alvos.some(function (a) { return a === t || (a.length >= 4 && t.length >= 4 && (a.indexOf(t) >= 0 || t.indexOf(a) >= 0)); });
  }
  /* Palpite do impostor: a palavra da grade que mais combina com as pistas dos outros. */
  function palpite(r, eu, rnd) {
    var notas = r.palavras.map(function (_, i) {
      var n = 0;
      r.pistas.forEach(function (p) { if (p.id !== eu && combina(r, p.texto, i)) n++; });
      return n + rnd() * 0.5;
    });
    var melhor = 0;
    notas.forEach(function (n, i) { if (n > notas[melhor]) melhor = i; });
    return melhor;
  }
  function usada(r, texto) { var t = norm(texto); return r.pistas.some(function (p) { return norm(p.texto) === t; }); }
  function pistaDaPalavra(r, i, rnd) {
    var op = r.pistasBot[i].filter(function (c) { return !usada(r, c); });
    if (!op.length) op = r.pistasBot[i];
    return op[Math.floor(rnd() * op.length)];
  }

  function pista(r, bot, rnd) {
    if (bot !== r.impostor) return pistaDaPalavra(r, r.segredo, rnd);
    // Impostor: sem pistas ainda, arrisca uma palavra qualquer da grade; depois, segue o palpite.
    var i = r.pistas.some(function (p) { return p.texto; }) ? palpite(r, bot, rnd) : Math.floor(rnd() * r.palavras.length);
    return pistaDaPalavra(r, i, rnd);
  }

  /* Suspeita de cada candidato, do ponto de vista de um inocente (que sabe a palavra). */
  function suspeita(r, id, rnd) {
    var ps = R.pistasDe(r, id), s = rnd() * 0.8;
    if (!ps.length) return s;
    ps.forEach(function (p) {
      if (!p.texto) { s += 0.6; return; }
      if (combina(r, p.texto, r.segredo)) { s -= 1.2; return; }
      var outra = r.palavras.some(function (_, i) { return i !== r.segredo && combina(r, p.texto, i); });
      s += outra ? 1 : 0.3;
    });
    return s / ps.length + rnd() * 0.3;
  }
  function voto(r, bot, rnd) {
    var cand = r.candidatos.filter(function (c) { return c !== bot; });
    if (bot === r.impostor) return cand[Math.floor(rnd() * cand.length)];
    var melhor = cand[0], nota = -Infinity;
    cand.forEach(function (c) { var n = suspeita(r, c, rnd); if (n > nota) { nota = n; melhor = c; } });
    return melhor;
  }
  function chute(r, bot, rnd) { return palpite(r, bot, rnd); }

  var Bots = { pista: pista, voto: voto, chute: chute, palpite: palpite, combina: combina };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bots;
  raiz.Bots = Bots;
})(typeof window !== 'undefined' ? window : globalThis);
