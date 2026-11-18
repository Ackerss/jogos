/* Grande Prêmio dos Bichos — bots.
   Cada bot simula o resto da volta para estimar quem deve chegar na frente e escolhe:
   apostar (se o bilhete vale a pena), aposta de campeão (no meio da corrida), pôr banana/mola (de vez em quando) ou rolar.
   No palpite do dado, o bot chuta um dos bichos que ainda estão no copo. */
(function () {
  'use strict';
  var R = typeof module !== 'undefined' && module.exports ? require('./regras.js') : window.Regras;

  /* Jeitos de jogar: "ousado" aposta cedo; "cauteloso" só aposta com boa chance. */
  var JEITOS = [
    { nome: 'ousado', limiar: 0.8, peca: 0.14, campeao: 0.30 },
    { nome: 'esperto', limiar: 1.2, peca: 0.2, campeao: 0.40 },
    { nome: 'cauteloso', limiar: 1.6, peca: 0.1, campeao: 0.55 }
  ];

  /* Valor esperado de pegar o próximo bilhete do bicho. */
  function valorAposta(p, ch, id) {
    if (!R.podeApostar(p, id)) return -9;
    var v = p.bilhetes[id][0], c1 = ch.primeiro[id], c2 = ch.segundo[id];
    return c1 * v + c2 * 1 - (1 - c1 - c2) * 1;
  }
  function frente(p) { var m = 0; R.IDS.forEach(function (id) { if (p.pos[id] > m) m = p.pos[id]; }); return m; }

  /* Decide a jogada. Devolve {tipo: 'rolar'} | {tipo: 'apostar', bicho} | {tipo: 'peca', bicho, qual} | {tipo: 'campeao', bicho}. */
  function decidir(p, jid, rnd, indice) {
    rnd = rnd || Math.random;
    var jeito = JEITOS[(indice || 0) % JEITOS.length];
    var eu = R.jogador(p, jid) || { bilhetes: [], campeao: null };

    // Aposta de campeão: só depois da metade da pista, quando um bicho tem boa chance.
    if (R.podeCampeao(p, jid) && frente(p) >= R.TRILHA * 0.45 && rnd() < 0.5) {
      var cc = R.chancesCorrida(p, rnd, 120), fav = null, mc = 0;
      R.IDS.forEach(function (id) { if (cc[id] > mc) { mc = cc[id]; fav = id; } });
      if (fav && (mc >= jeito.campeao || frente(p) >= R.TRILHA - 3)) return { tipo: 'campeao', bicho: fav };
    }

    var ch = R.chances(p, rnd, 250);
    var melhor = null, mv = -9;
    R.IDS.forEach(function (id) { var v = valorAposta(p, ch, id); if (v > mv) { mv = v; melhor = id; } });
    if (melhor && mv >= jeito.limiar + (rnd() * 0.4 - 0.2)) return { tipo: 'apostar', bicho: melhor };

    if (rnd() < jeito.peca && p.copo.length > 1) {
      var meus = {};
      eu.bilhetes.forEach(function (b) { meus[b.bicho] = true; });
      var ordem = R.ordem(p);
      // Mola na frente de um bicho em que apostou (empurrar o meu)…
      var amigo = ordem.filter(function (id) { return meus[id] && R.casaDaPeca(p, jid, id) !== null; })[0];
      if (amigo && rnd() < 0.6) return { tipo: 'peca', bicho: amigo, qual: 'mola' };
      // …ou banana na frente do bicho que está ganhando e em que ele NÃO apostou.
      var alvo = ordem.filter(function (id) { return !meus[id] && R.casaDaPeca(p, jid, id) !== null; })[0];
      if (alvo) return { tipo: 'peca', bicho: alvo, qual: 'banana' };
    }
    return { tipo: 'rolar' };
  }

  /* Palpite do dado: chuta um bicho que ainda está no copo. */
  function palpite(p, rnd) {
    rnd = rnd || Math.random;
    return p.copo[Math.floor(rnd() * p.copo.length)];
  }

  var Bots = { decidir: decidir, palpite: palpite, JEITOS: JEITOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bots;
  if (typeof window !== 'undefined') window.Bots = Bots;
})();
