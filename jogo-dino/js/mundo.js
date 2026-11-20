/* Dino Pula-Pula — o MUNDO da corrida (regras puras, sem tela).
   Física do pulo, obstáculos, frutas, estrelas, tombos e a ajuda do modo criança.
   Roda na TV (a TV é a autoridade). Testado em tests/mundo.test.js.
   Unidades: "u" (1 u = 1 pixel numa faixa de escala 1) e segundos. Cada jogador corre na própria faixa,
   e todas as faixas têm os MESMOS obstáculos e frutas (justo para todos). */
(function (raiz, fab) {
  var M = fab();
  if (typeof module === 'object' && module.exports) module.exports = M; else raiz.Mundo = M;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var C = {
    G: 2600, PULO: 1000, PULO2: 820,   // gravidade, pulo e segundo pulo (no ar, só adulto)
    G_AJUDA: 2150,                     // modo criança: pulo mais alto e "flutuante"
    DINO_L: 46, DINO_A: 78,            // caixa de batida do dino (menor que o desenho, para perdoar)
    MARGEM_OBS: 9,                     // a caixa do obstáculo também é menor que o desenho
    TOMBO: 0.7, INVUL: 1.7, PODER: 6,  // segundos
    PERDE: 3,                          // frutas que caem no tombo (adulto; criança não perde)
    FRUTA_R: 26, IMA: 150,
    BUFFER: 0.22, BUFFER_AJUDA: 1.0,   // toque pouco antes de cair: pula assim que encostar no chão (criança: lembra por mais tempo)
    VEL: { calma: [260, 410], normal: [320, 530], rapida: [380, 640] },
    SEM_OBS_FIM: 420                   // sem obstáculos perto do ninho
  };

  // Formatos de obstáculo por cenário: [forma, largura, altura]
  var OBS = [
    [['pedra', 60, 44], ['tronco', 86, 44], ['arbusto', 66, 52]],          // floresta
    [['cacto', 46, 66], ['pedraLaranja', 62, 46], ['cactoBola', 56, 50]],   // deserto
    [['gelo', 62, 52], ['boneco', 50, 68], ['pinheirinho', 52, 62]]         // neve
  ];
  var FRUTAS = 6; // tipos de fruta (só muda o desenho)

  function semente(s) { // gerador aleatório com semente (mulberry32): a mesma semente gera a mesma pista
    var a = (s >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function criar(op) {
    op = op || {};
    var v = C.VEL[op.ritmo] || C.VEL.normal, T = Math.max(10, op.duracao || 60);
    var m = {
      t: 0, T: T, dist: 0, v0: v[0], v1: v[1], vel: v[0],
      distFim: v[0] * T + (v[1] - v[0]) * T / 2,
      itens: [], seq: 0, rng: semente(op.semente || 7),
      prox: v[0] * 2.6, proxEstrela: 0, frutaTipo: 0, fim: false, eventos: [],
      js: (op.jogadores || [{}]).map(function (o) {
        return { ajuda: !!o.ajuda, y: 0, vy: 0, chao: true, noAr: 0, tombo: 0, invul: 0, poder: 0,
          frutas: 0, tombos: 0, pulos: 0, estrelas: 0, quebrou: 0, pendente: -1, buffer: 0, pegou: {}, bateu: {} };
      })
    };
    m.proxEstrela = m.distFim * (0.22 + m.rng() * 0.08);
    // boas-vindas: uma fileira de frutas no chão antes do primeiro obstáculo
    linhaFrutas(m, v[0] * 1.2, 4);
    return m;
  }

  function velEm(m, x) { return m.v0 + (m.v1 - m.v0) * Math.min(1, Math.max(0, x / m.distFim)); }
  function bioma(m, x) { return Math.max(0, Math.min(2, Math.floor(x / m.distFim * 3))); }
  function biomaContinuo(m, x) { return Math.max(0, Math.min(2.999, x / m.distFim * 3)); }
  function progresso(m) { return Math.min(1, m.t / m.T); }
  function ninhoX(m) { return m.distFim + m.v1 + 110; }

  function novo(m, it) { it.id = ++m.seq; m.itens.push(it); return it; }
  function fruta(m, x, y) { m.frutaTipo = (m.frutaTipo + 1) % FRUTAS; return novo(m, { tipo: 'fruta', x: x, y: y, f: m.frutaTipo }); }
  function linhaFrutas(m, x, n) { for (var i = 0; i < n; i++) fruta(m, x + i * 72, 34); return x + (n - 1) * 72; }

  // Altura da parábola do pulo (adulto) para pôr frutas em arco sobre o obstáculo
  function arco(m, x, v) {
    var ar = 2 * C.PULO / C.G, topo = C.PULO * C.PULO / (2 * C.G), meia = v * ar / 2;
    [-0.8, -0.4, 0, 0.4, 0.8].forEach(function (k) { fruta(m, x + k * meia, 44 + topo * (1 - k * k)); });
  }

  function gerar(m) {
    var limite = m.distFim - C.SEM_OBS_FIM;
    while (m.prox < m.dist + 2300 && m.prox < limite) {
      var x = m.prox, v = velEm(m, x), r = m.rng(), b = bioma(m, x), fimX = x;
      if (x >= m.proxEstrela) {                       // estrela de arco-íris (poder)
        novo(m, { tipo: 'estrela', x: x, y: 150 });
        m.proxEstrela = x + m.distFim * (0.24 + m.rng() * 0.1);
      } else if (r < 0.58) {                          // obstáculo (às vezes com arco de frutas por cima)
        var opcoes = OBS[b], o = opcoes[Math.floor(m.rng() * opcoes.length)];
        novo(m, { tipo: 'obs', x: x, w: o[1], h: o[2], forma: o[0], b: b });
        if (m.rng() < 0.55) arco(m, x, v);
      } else if (r < 0.8) {                           // fileira de frutas no chão
        fimX = linhaFrutas(m, x, 3 + Math.floor(m.rng() * 3));
      } else {                                        // frutas lá no alto (pulo duplo; a criança alcança com um pulo)
        for (var i = 0; i < 3; i++) fruta(m, x + i * 64, 300);
        fimX = x + 128;
      }
      var folga = m.t < 8 ? 1.6 : 1.25;               // começo mais tranquilo
      m.prox = fimX + v * (folga + m.rng() * 1.1);
    }
    // depois do último obstáculo: frutas até o ninho
    if (m.prox >= limite && !m.frutasFinais) {
      m.frutasFinais = true;
      for (var k = 0, xf = Math.max(m.prox, limite + 60); xf < ninhoX(m) - 260; k++, xf += 70) fruta(m, xf, k % 6 < 3 ? 34 + (k % 3) * 50 : 134 - (k % 3) * 50);
    }
  }

  // Tempos em que o dino fica acima da altura h depois de pular (raízes da parábola)
  function acima(g, h) {
    var d = C.PULO * C.PULO - 2 * g * h; if (d <= 0) return null;
    var r = Math.sqrt(d); return [(C.PULO - r) / g, (C.PULO + r) / g];
  }
  function proximoObstaculo(m, j) {
    var p = m.js[j], frente = m.dist + C.DINO_L / 2, melhor = null;
    for (var i = 0; i < m.itens.length; i++) {
      var it = m.itens[i];
      if (it.tipo !== 'obs' || p.bateu[it.id]) continue;
      if (it.x + it.w / 2 - C.MARGEM_OBS < m.dist - C.DINO_L / 2) continue; // já passou
      if (!melhor || it.x < melhor.x) melhor = it;
    }
    if (!melhor) return null;
    var g = p.ajuda ? C.G_AJUDA : C.G, v = m.vel;
    var chega = (melhor.x - melhor.w / 2 + C.MARGEM_OBS - frente) / v;                  // quando começa a encostar
    var dura = (melhor.w - 2 * C.MARGEM_OBS + C.DINO_L) / v;                             // quanto tempo fica embaixo
    var ac = acima(g, melhor.h - 6) || [0.1, 0.6];
    return { it: melhor, chega: chega, ideal: chega + dura / 2 - (ac[0] + ac[1]) / 2 };  // ideal: pular daqui a "ideal" s
  }

  function saltar(m, j) {
    var p = m.js[j];
    p.vy = C.PULO; p.chao = false; p.noAr = 1; p.pulos++;
    m.eventos.push({ tipo: 'pulo', j: j });
  }

  /* Toque no botão PULA do jogador j. */
  function tocar(m, j) {
    var p = m.js[j]; if (!p || m.fim) return;
    if (p.tombo > 0) { p.buffer = p.ajuda ? C.BUFFER_AJUDA : C.BUFFER; return; }
    if (p.chao) {
      if (p.pendente >= 0) return;
      if (p.ajuda) {                                   // criança: o jogo acerta a hora do pulo
        var o = proximoObstaculo(m, j);
        if (o && o.chega < 1.9 && o.ideal > 0.03) { p.pendente = o.ideal; m.eventos.push({ tipo: 'prepara', j: j }); return; }
      }
      saltar(m, j);
    } else if (!p.ajuda && p.noAr === 1) {             // pulo duplo (adulto)
      p.vy = C.PULO2; p.noAr = 2; p.pulos++;
      m.eventos.push({ tipo: 'pulo2', j: j });
    } else {
      p.buffer = p.ajuda ? C.BUFFER_AJUDA : C.BUFFER;
    }
  }

  function sobrepoe(ax1, ax2, ay1, ay2, bx1, bx2, by1, by2) { return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1; }

  function passoFixo(m, dt) {
    m.t += dt;
    m.vel = m.v0 + (m.v1 - m.v0) * Math.min(1, m.t / m.T);
    m.dist += m.vel * dt;
    gerar(m);
    var x1 = m.dist - C.DINO_L / 2, x2 = m.dist + C.DINO_L / 2;
    for (var j = 0; j < m.js.length; j++) {
      var p = m.js[j];
      p.invul = Math.max(0, p.invul - dt); p.tombo = Math.max(0, p.tombo - dt); p.poder = Math.max(0, p.poder - dt); p.buffer = Math.max(0, p.buffer - dt);
      if (p.pendente >= 0) { p.pendente -= dt; if (p.pendente <= 0) { p.pendente = -1; if (p.chao && p.tombo <= 0) saltar(m, j); } }
      if (!p.chao) {
        p.vy -= (p.ajuda ? C.G_AJUDA : C.G) * dt; p.y += p.vy * dt;
        if (p.y <= 0) {
          p.y = 0; p.vy = 0; p.chao = true; p.noAr = 0;
          m.eventos.push({ tipo: 'pousou', j: j });
          if (p.buffer > 0 && p.tombo <= 0) { p.buffer = 0; tocar(m, j); }
        }
      } else if (p.buffer > 0 && p.tombo <= 0) { p.buffer = 0; tocar(m, j); }
      var y1 = p.y, y2 = p.y + C.DINO_A;
      for (var i = 0; i < m.itens.length; i++) {
        var it = m.itens[i];
        if (it.x > x2 + 200) continue;
        if (it.tipo === 'obs') {
          if (p.bateu[it.id]) continue;
          if (!sobrepoe(x1, x2, y1, y2, it.x - it.w / 2 + C.MARGEM_OBS, it.x + it.w / 2 - C.MARGEM_OBS, 0, it.h - 6)) continue;
          p.bateu[it.id] = true;
          if (p.poder > 0) { p.quebrou++; p.frutas++; m.eventos.push({ tipo: 'quebrou', j: j, id: it.id }); }
          else if (p.invul > 0) { /* piscando: passa por dentro */ }
          else {
            var perdeu = p.ajuda ? 0 : Math.min(C.PERDE, p.frutas);
            p.frutas -= perdeu; p.tombos++; p.tombo = C.TOMBO; p.invul = C.INVUL; p.pendente = -1;
            if (p.chao) { p.vy = 380; p.chao = false; p.noAr = 2; }
            m.eventos.push({ tipo: 'tombo', j: j, perdeu: perdeu, id: it.id });
          }
        } else {
          if (p.pegou[it.id]) continue;
          var r = C.FRUTA_R, ima = p.poder > 0 && it.tipo === 'fruta' && Math.abs(it.x - m.dist) < C.IMA;
          if (!ima && !sobrepoe(x1 - r, x2 + r, y1 - r, y2 + r, it.x, it.x, it.y, it.y)) continue;
          p.pegou[it.id] = true;
          if (it.tipo === 'estrela') { p.poder = C.PODER; p.estrelas++; m.eventos.push({ tipo: 'estrela', j: j, id: it.id }); }
          else { p.frutas++; m.eventos.push({ tipo: 'fruta', j: j, id: it.id, f: it.f, ima: ima }); }
        }
      }
    }
    // esquece o que já ficou bem para trás
    if (m.itens.length && m.itens[0].x < m.dist - 700) {
      m.itens = m.itens.filter(function (it) {
        if (it.x >= m.dist - 700) return true;
        m.js.forEach(function (p) { delete p.pegou[it.id]; delete p.bateu[it.id]; });
        return false;
      });
    }
    if (m.t >= m.T) { m.fim = true; m.eventos.push({ tipo: 'fim' }); }
  }

  /* Avança o mundo dt segundos (em passos fixos de 1/120 s: o resultado não depende da taxa de quadros). */
  function avancar(m, dt) {
    if (m.fim) return;
    m.resto = (m.resto || 0) + Math.min(dt, 0.25);
    var h = 1 / 120;
    while (m.resto >= h && !m.fim) { passoFixo(m, h); m.resto -= h; }
  }

  /* Robô de teste: decide se toca agora. nivel 0..1 (chance de acertar cada obstáculo). */
  function robo(m, j, nivel, rnd) {
    var p = m.js[j]; if (!p || m.fim || p.tombo > 0) return false;
    p.rob = p.rob || {};
    var o = proximoObstaculo(m, j);
    if (p.chao && o && o.ideal <= 0.02 && o.ideal > -0.12 && !p.rob[o.it.id]) {
      p.rob[o.it.id] = 1;
      return (rnd || Math.random)() < nivel;
    }
    // frutas altas: às vezes pula duas vezes
    if (!p.ajuda && p.noAr === 1 && p.vy < 120 && p.vy > -60) {
      for (var i = 0; i < m.itens.length; i++) {
        var it = m.itens[i];
        if (it.tipo === 'fruta' && it.y > 250 && !p.pegou[it.id] && it.x - m.dist > 40 && it.x - m.dist < 160 && !p.rob['a' + it.id]) { p.rob['a' + it.id] = 1; return (rnd || Math.random)() < nivel * 0.7; }
      }
    }
    if (nivel < 1 && p.chao && Math.random() < 0.004) return true; // pulinho à toa, como gente
    return false;
  }

  /* Resultado: cada jogador ganha um título diferente (todo mundo ganha alguma coisa). */
  var TITULOS = [
    { id: 'frutas', icone: '🍎', nome: 'Mais frutas', valor: function (p) { return p.frutas; } },
    { id: 'ouro', icone: '🥇', nome: 'Pulo de ouro', valor: function (p) { return -p.tombos; } },
    { id: 'estrela', icone: '⭐', nome: 'Superestrela', valor: function (p) { return p.estrelas * 10 + p.quebrou; } },
    { id: 'pulapula', icone: '🦘', nome: 'Pula-pula', valor: function (p) { return p.pulos; } },
    { id: 'feliz', icone: '💚', nome: 'Dino feliz', valor: function () { return 0; } }
  ];
  function resultado(m) {
    var ordem = m.js.map(function (p, j) { return j; }).sort(function (a, b) { return m.js[b].frutas - m.js[a].frutas || m.js[a].tombos - m.js[b].tombos || a - b; });
    var titulos = {}, usados = {};
    TITULOS.forEach(function (t) {
      if (t.id === 'feliz') return;
      var livres = ordem.filter(function (j) { return titulos[j] === undefined; });
      if (!livres.length) return;
      var melhor = livres[0];
      livres.forEach(function (j) { if (t.valor(m.js[j]) > t.valor(m.js[melhor])) melhor = j; });
      if (t.id === 'estrela' && t.valor(m.js[melhor]) <= 0) return;
      titulos[melhor] = t.id; usados[t.id] = 1;
    });
    return ordem.map(function (j, pos) {
      var t = TITULOS.filter(function (x) { return x.id === (titulos[j] || 'feliz'); })[0], p = m.js[j];
      return { j: j, pos: pos + 1, frutas: p.frutas, tombos: p.tombos, pulos: p.pulos, estrelas: p.estrelas, titulo: t.nome, icone: t.icone };
    });
  }

  return {
    C: C, OBS: OBS, FRUTAS: FRUTAS, semente: semente, criar: criar, avancar: avancar, tocar: tocar, robo: robo,
    resultado: resultado, proximoObstaculo: proximoObstaculo, bioma: bioma, biomaContinuo: biomaContinuo,
    progresso: progresso, ninhoX: ninhoX, velEm: velEm
  };
});
