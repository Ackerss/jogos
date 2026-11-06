/* Grande Prêmio dos Bichos — regras puras (sem tela). Testadas em tests/regras.test.js.

   Resumo:
   - 5 bichos correm numa pista de 16 casas. Ninguém tem bicho próprio: todos apostam.
   - Na sua vez, você faz UMA coisa:
       🎲 Dado: sorteia um dos dados que ainda estão no copo; o bicho daquela cor anda 1, 2 ou 3 casas
          (e carrega nas costas quem estiver em cima dele). Ganha 1 moeda.
       🎟️ Aposta: pega o melhor bilhete que sobrou de um bicho (5, 3 ou 2).
       🍌 Banana: põe a sua casca de banana na frente de um bicho. Quem pisar nela escorrega 1 casa para trás,
          e você ganha 1 moeda.
   - Quem cai numa casa ocupada sobe nas costas de quem está lá.
   - Quando os 5 dados saem do copo, acaba a volta: bilhete do 1º lugar vale o número dele,
     do 2º vale 1 moeda, e os outros perdem 1 moeda. Os dados voltam e as bananas saem da pista.
   - Quando um bicho cruza a chegada, a volta é paga e a corrida acaba. Vence quem tiver mais moedas. */
(function () {
  'use strict';

  var TRILHA = 16;                 // casas 0..15; cruzou a 15 = chegou
  var BILHETES = [5, 3, 2];        // valores dos bilhetes de cada bicho, em cada volta
  var MOEDAS_INICIO = 3;
  var BICHOS = [
    { id: 'tartaruga', nome: 'Tartaruga', artigo: 'a', cor: '#2fbf63' },
    { id: 'porco', nome: 'Porco', artigo: 'o', cor: '#ff7fb0' },
    { id: 'pato', nome: 'Pato', artigo: 'o', cor: '#ffcf33' },
    { id: 'coelho', nome: 'Coelho', artigo: 'o', cor: '#4fa3ff' },
    { id: 'gato', nome: 'Gato', artigo: 'o', cor: '#ff8a2a' }
  ];
  var IDS = BICHOS.map(function (b) { return b.id; });

  function bicho(id) { for (var i = 0; i < BICHOS.length; i++) if (BICHOS[i].id === id) return BICHOS[i]; return null; }
  function embaralhar(lista, rnd) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function dado(rnd) { return 1 + Math.floor(rnd() * 3); }

  function casasVazias() { var c = []; for (var i = 0; i < TRILHA + 3; i++) c.push([]); return c; }

  /* Começa a corrida. jogadores = [{id, nome, humano}].
     A largada sorteia um dado para cada bicho (1 a 3 → casa 0 a 2), na ordem do sorteio. */
  function criarPartida(jogadores, rnd) {
    rnd = rnd || Math.random;
    var p = {
      casas: casasVazias(), pos: {}, bananas: {},
      jogadores: jogadores.map(function (j) {
        return { id: j.id, nome: j.nome, humano: !!j.humano, moedas: MOEDAS_INICIO, bilhetes: [], banana: null };
      }),
      volta: 1, vez: 0, copo: IDS.slice(), saidos: [], bilhetes: {}, fim: false, largada: []
    };
    IDS.forEach(function (id) { p.bilhetes[id] = BILHETES.slice(); });
    embaralhar(IDS, rnd).forEach(function (id) {
      var v = dado(rnd);
      p.casas[v - 1].push(id); p.pos[id] = v - 1;
      p.largada.push({ bicho: id, valor: v });
    });
    return p;
  }

  function jogador(p, id) { for (var i = 0; i < p.jogadores.length; i++) if (p.jogadores[i].id === id) return p.jogadores[i]; return null; }
  function daVez(p) { return p.jogadores[p.vez % p.jogadores.length]; }

  /* Ordem da corrida: mais adiante primeiro; na mesma casa, quem está em cima está na frente. */
  function ordem(p) {
    var lista = [];
    for (var c = p.casas.length - 1; c >= 0; c--) for (var h = p.casas[c].length - 1; h >= 0; h--) lista.push(p.casas[c][h]);
    return lista;
  }

  /* Move um bicho (com quem está nas costas dele). Devolve os acontecimentos, na ordem, para a TV animar. */
  function mover(p, id, valor) {
    var de = p.pos[id], pilha = p.casas[de], k = pilha.indexOf(id);
    var grupo = pilha.slice(k);
    p.casas[de] = pilha.slice(0, k);
    var para = Math.min(de + valor, p.casas.length - 1);
    var ev = [{ tipo: 'mover', grupo: grupo, de: de, para: para, embaixo: p.casas[para].slice() }];
    if (para < TRILHA && p.bananas[para] !== undefined) {
      var dono = p.bananas[para], j = jogador(p, dono);
      if (j) j.moedas += 1;
      ev.push({ tipo: 'banana', casa: para, dono: dono });
      var volta = para - 1;
      ev.push({ tipo: 'escorregar', grupo: grupo, de: para, para: volta, embaixo: p.casas[volta].slice() });
      para = volta;
    }
    p.casas[para] = p.casas[para].concat(grupo);
    grupo.forEach(function (b) { p.pos[b] = para; });
    if (para >= TRILHA) { p.fim = true; ev.push({ tipo: 'chegada', bicho: ordem(p)[0] }); }
    return ev;
  }

  /* 🎲 Rolar: sorteia um dado do copo. */
  function rolar(p, jid, rnd) {
    rnd = rnd || Math.random;
    var j = jogador(p, jid);
    var i = Math.floor(rnd() * p.copo.length), id = p.copo.splice(i, 1)[0], v = dado(rnd);
    p.saidos.push({ bicho: id, valor: v });
    if (j) j.moedas += 1;
    var lider = ordem(p)[0];
    var ev = [{ tipo: 'dado', bicho: id, valor: v, jogador: jid }].concat(mover(p, id, v));
    var novo = ordem(p)[0];
    if (novo !== lider && !p.fim) ev.push({ tipo: 'lider', bicho: novo });
    return ev;
  }

  /* 🎟️ Aposta: pega o melhor bilhete que sobrou do bicho. */
  function podeApostar(p, id) { return !!(p.bilhetes[id] && p.bilhetes[id].length); }
  function apostar(p, jid, id) {
    var j = jogador(p, jid);
    if (!j || !podeApostar(p, id)) return null;
    var valor = p.bilhetes[id].shift();
    j.bilhetes.push({ bicho: id, valor: valor });
    return { tipo: 'aposta', jogador: jid, bicho: id, valor: valor };
  }

  /* 🍌 Banana: casa onde a banana deste jogador ficaria se ele escolher este bicho
     (2 casas na frente; se não der, 1; se não der, 3). null = não cabe na frente dele. */
  function casaLivre(p, jid, c) {
    if (c < 1 || c >= TRILHA || p.casas[c].length) return false;
    var outra = function (x) { return p.bananas[x] !== undefined && p.bananas[x] !== jid; };
    return !outra(c) && !outra(c - 1) && !outra(c + 1);
  }
  function casaDaBanana(p, jid, id) {
    var base = p.pos[id];
    var tentativas = [2, 1, 3];
    for (var i = 0; i < tentativas.length; i++) if (casaLivre(p, jid, base + tentativas[i])) return base + tentativas[i];
    return null;
  }
  function porBanana(p, jid, id) {
    var j = jogador(p, jid), c = casaDaBanana(p, jid, id);
    if (!j || c === null) return null;
    if (j.banana !== null) delete p.bananas[j.banana];
    j.banana = c; p.bananas[c] = jid;
    return { tipo: 'pos-banana', jogador: jid, bicho: id, casa: c };
  }

  /* Fim da volta: paga os bilhetes e prepara a próxima volta. */
  function pagarVolta(p) {
    var o = ordem(p), primeiro = o[0], segundo = o[1];
    var resultado = p.jogadores.map(function (j) {
      var ganhos = j.bilhetes.map(function (b) {
        var d = b.bicho === primeiro ? b.valor : b.bicho === segundo ? 1 : -1;
        return { bicho: b.bicho, valor: b.valor, delta: d };
      });
      var total = ganhos.reduce(function (s, g) { return s + g.delta; }, 0);
      var antes = j.moedas;
      j.moedas = Math.max(0, j.moedas + total);
      return { id: j.id, ganhos: ganhos, total: j.moedas - antes };
    });
    return { primeiro: primeiro, segundo: segundo, jogadores: resultado };
  }
  function novaVolta(p) {
    p.volta++;
    p.copo = IDS.slice(); p.saidos = [];
    IDS.forEach(function (id) { p.bilhetes[id] = BILHETES.slice(); });
    p.bananas = {};
    p.jogadores.forEach(function (j) { j.bilhetes = []; j.banana = null; });
  }
  function voltaAcabou(p) { return p.copo.length === 0 || p.fim; }
  function passarVez(p) { p.vez = (p.vez + 1) % p.jogadores.length; }

  /* Vencedores: mais moedas (empate = todos os empatados). */
  function vencedores(p) {
    var max = -1;
    p.jogadores.forEach(function (j) { if (j.moedas > max) max = j.moedas; });
    return p.jogadores.filter(function (j) { return j.moedas === max; }).map(function (j) { return j.id; });
  }

  /* Simula o resto da volta muitas vezes: chance de cada bicho terminar a volta em 1º e em 2º. (usado pelos bots) */
  function chances(p, rnd, vezes) {
    rnd = rnd || Math.random; vezes = vezes || 300;
    var c1 = {}, c2 = {};
    IDS.forEach(function (id) { c1[id] = 0; c2[id] = 0; });
    for (var s = 0; s < vezes; s++) {
      var q = { casas: p.casas.map(function (x) { return x.slice(); }), pos: Object.assign({}, p.pos), bananas: p.bananas, jogadores: [], fim: false };
      var copo = embaralhar(p.copo, rnd);
      for (var i = 0; i < copo.length && !q.fim; i++) mover(q, copo[i], dado(rnd));
      var o = ordem(q);
      c1[o[0]]++; c2[o[1]]++;
    }
    IDS.forEach(function (id) { c1[id] /= vezes; c2[id] /= vezes; });
    return { primeiro: c1, segundo: c2 };
  }

  var Regras = {
    TRILHA: TRILHA, BILHETES: BILHETES, MOEDAS_INICIO: MOEDAS_INICIO, BICHOS: BICHOS, IDS: IDS,
    bicho: bicho, criarPartida: criarPartida, jogador: jogador, daVez: daVez, ordem: ordem,
    rolar: rolar, podeApostar: podeApostar, apostar: apostar, casaDaBanana: casaDaBanana, porBanana: porBanana,
    pagarVolta: pagarVolta, novaVolta: novaVolta, voltaAcabou: voltaAcabou, passarVez: passarVez,
    vencedores: vencedores, chances: chances, embaralhar: embaralhar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Regras;
  if (typeof window !== 'undefined') window.Regras = Regras;
})();
