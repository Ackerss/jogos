/* Ponte do Desespero — bots e a "ajuda" do modo fácil.
   O bot usa os mesmos comandos de um celular (cima, baixo, pulo, poder).
   Modo fácil (🧸): a pessoa continua trocando de pista, mas a TV pula sozinha nos buracos
   e tira da pista que vai pegar fogo, como a "direção assistida" dos jogos de kart. */
(function (raiz) {
  'use strict';
  var M = raiz.Mundo || (typeof require === 'function' ? require('./mundo.js') : null);
  var C = M.C;
  var NOMES = ['Tico', 'Juju', 'Bolota', 'Pipoca', 'Faísca', 'Nina', 'Zeca'];

  /* Próximo perigo na pista p à frente de x (até "ate"). */
  function proximo(m, p, x, ate) {
    var melhor = null;
    m.obst.forEach(function (o) {
      if (o.pista !== p || o.x < x - 5 || o.x > x + ate) return;
      if (o.tipo === 'rachada' && o.estado === 0) return; // tábua inteira: dá para pisar (ela só cai depois)
      if (o.tipo === 'pedra' && o.estado === 2) return;
      if (!melhor || o.x < melhor.x) melhor = o;
    });
    return melhor;
  }
  function pistaPerigosa(m, p) { return m.onda && m.onda.pista === p; }
  function melhorPista(m, r, olhar) {
    var op = [r.pista - 1, r.pista + 1].filter(function (p) { return p >= 0 && p <= 2; });
    var boas = op.filter(function (p) { return !pistaPerigosa(m, p) && !proximo(m, p, r.x - 30, olhar * 0.8); });
    if (boas.length) return boas[Math.floor(m.rnd() * boas.length)];
    var semOnda = op.filter(function (p) { return !pistaPerigosa(m, p); });
    return semOnda.length ? semOnda[0] : null;
  }

  /* Ajuda do modo fácil: pula na hora certa e foge da onda. */
  function ajuda(m, r, e) {
    if (r.caido > 0 || r.chegou) return e;
    var vel = C.VEL * (r.turbo > 0 ? C.TURBO_VEL : 1);
    var o = proximo(m, r.pista, r.x, vel * 0.6);
    var rel = vel + (o && o.tipo === 'pedra' && o.estado === 1 ? 95 : 0);
    if (o && r.pulo <= 0 && o.x - r.x < rel * 0.36 && o.x - r.x > 18) e.pulo = 1;
    if (m.onda && m.onda.pista === r.pista && r.troca <= 0 && r.filaTroca === 0) {
      var p = melhorPista(m, r, 200);
      if (p !== null) { if (p > r.pista) e.baixo = (e.baixo || 0) + 1; else e.cima = (e.cima || 0) + 1; }
      else if (m.onda.estado === 'ativa' && r.pulo <= 0) e.pulo = 1;
    }
    return e;
  }

  /* Bot completo. nivel de 0 a 1 (reflexo e esperteza). */
  function pensar(m, id, mem, nivel) {
    var r = M.corredor(m, id), e = {};
    if (!r || r.caido > 0 || r.chegou) return e;
    mem.espera = (mem.espera || 0) - 1 / 60;
    if (mem.espera > 0) return e;
    mem.espera = 0.07 + (1 - nivel) * 0.18 + m.rnd() * 0.08;
    var vel = C.VEL * (r.turbo > 0 ? C.TURBO_VEL : 1), olhar = 140 + nivel * 120;
    var o = proximo(m, r.pista, r.x, olhar);
    var errou = m.rnd() > 0.55 + nivel * 0.42; // às vezes o bot se distrai
    // Fugir da onda
    if (m.onda && m.onda.pista === r.pista && !errou) {
      var p = melhorPista(m, r, olhar);
      if (p !== null) { if (p > r.pista) e.baixo = 1; else e.cima = 1; return e; }
    }
    if (o && !errou) {
      var dist = o.x - r.x;
      // Desviar (se há pista livre) ou pular quando chegar perto
      if (dist > vel * 0.28 && m.rnd() < 0.55) {
        var p2 = melhorPista(m, r, olhar);
        if (p2 !== null) { if (p2 > r.pista) e.baixo = 1; else e.cima = 1; return e; }
      }
      var rel2 = vel + (o.tipo === 'pedra' && o.estado === 1 ? 95 : 0);
      if (dist < rel2 * (0.3 + nivel * 0.08) && dist > 15 && r.pulo <= 0) e.pulo = 1;
    }
    // Ir atrás de caixa surpresa na pista vizinha
    if (!r.poder && m.rnd() < 0.3) {
      var cx = m.caixas.filter(function (b) { return !b.pego[r.id] && b.x > r.x + 60 && b.x < r.x + 260 && Math.abs(b.pista - r.pista) === 1; })[0];
      if (cx && !proximo(m, cx.pista, r.x, cx.x - r.x + 20) && !pistaPerigosa(m, cx.pista)) { if (cx.pista > r.pista) e.baixo = 1; else e.cima = 1; }
    }
    // Poderes
    if (r.poder) {
      var pos = M.posicoes(m)[r.id];
      if (r.poder === 'raio' && pos > 1) e.poder = 1;
      else if (r.poder === 'turbo' && !o) e.poder = 1;
      else if (r.poder === 'escudo' && (o || (m.onda && m.onda.estado === 'aviso'))) e.poder = 1;
      else if (r.poder === 'ima' && m.rnd() < 0.3) e.poder = 1;
    } else if (r.cd <= 0) {
      var alguem = m.corredores.some(function (q) { return q !== r && !q.chegou && q.caido <= 0 && Math.abs(q.x - r.x) < C.EMPURRAO_ALCANCE * 0.8 && Math.abs(q.pista - r.pista) <= 1 && q.prot <= 0; });
      if (alguem && m.rnd() < 0.35 + nivel * 0.3) e.poder = 1;
    }
    return e;
  }

  var Bots = { NOMES: NOMES, pensar: pensar, ajuda: ajuda, proximo: proximo };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bots;
  raiz.Bots = Bots;
})(typeof window !== 'undefined' ? window : globalThis);
