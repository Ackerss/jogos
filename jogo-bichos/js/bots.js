/* Grande Prêmio dos Bichos — bots.
   Cada bot simula o resto da volta para estimar quem deve chegar na frente e escolhe:
   apostar (se o bilhete vale a pena), pôr banana (de vez em quando, na frente de um bicho perigoso) ou rolar. */
(function () {
  'use strict';
  var R = typeof module !== 'undefined' && module.exports ? require('./regras.js') : window.Regras;

  /* Jeitos de jogar: "ousado" aposta cedo; "cauteloso" só aposta com boa chance. */
  var JEITOS = [
    { nome: 'ousado', limiar: 0.8, banana: 0.12 },
    { nome: 'esperto', limiar: 1.2, banana: 0.18 },
    { nome: 'cauteloso', limiar: 1.6, banana: 0.08 }
  ];

  /* Valor esperado de pegar o próximo bilhete do bicho. */
  function valorAposta(p, ch, id) {
    if (!R.podeApostar(p, id)) return -9;
    var v = p.bilhetes[id][0], c1 = ch.primeiro[id], c2 = ch.segundo[id];
    return c1 * v + c2 * 1 - (1 - c1 - c2) * 1;
  }

  /* Decide a jogada. Devolve {tipo: 'rolar'} | {tipo: 'apostar', bicho} | {tipo: 'banana', bicho}. */
  function decidir(p, jid, rnd, indice) {
    rnd = rnd || Math.random;
    var jeito = JEITOS[(indice || 0) % JEITOS.length];
    var ch = R.chances(p, rnd, 250);
    var melhor = null, mv = -9;
    R.IDS.forEach(function (id) { var v = valorAposta(p, ch, id); if (v > mv) { mv = v; melhor = id; } });
    // Bilhetes guardados também contam: o bot evita apostar duas vezes em bicho fraco.
    if (melhor && mv >= jeito.limiar + (rnd() * 0.4 - 0.2)) return { tipo: 'apostar', bicho: melhor };
    if (rnd() < jeito.banana && p.copo.length > 1) {
      // Banana na frente do bicho que está ganhando e em que ele NÃO apostou.
      var meus = {};
      (R.jogador(p, jid) || { bilhetes: [] }).bilhetes.forEach(function (b) { meus[b.bicho] = true; });
      var alvos = R.ordem(p).filter(function (id) { return !meus[id] && R.casaDaBanana(p, jid, id) !== null; });
      if (alvos.length) return { tipo: 'banana', bicho: alvos[0] };
    }
    return { tipo: 'rolar' };
  }

  var Bots = { decidir: decidir, JEITOS: JEITOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bots;
  if (typeof window !== 'undefined') window.Bots = Bots;
})();
