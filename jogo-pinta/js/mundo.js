/* Pinta-Chão dos Bichos — as REGRAS (sem desenho): o chão em quadradinhos, andar para cima/baixo/esquerda/direita,
   pintar, itens (balde, pincel gigante, raio), porquinhos de lama (modo Todos juntos), robôs e o resultado.
   Roda na TV (e nos testes do Node). Unidade de distância = 1 quadradinho do chão. */
(function (raiz) {
  'use strict';
  var COLS = 24, ROWS = 12;
  var LIVRE = -1, BLOQ = -2, LAMA = -3;
  var VEL = { calma: 3.0, normal: 3.6, rapida: 4.3 };           // quadradinhos por segundo
  var DIRS = { c: [0, -1], b: [0, 1], e: [-1, 0], d: [1, 0] };
  var OPOSTO = { c: 'b', b: 'c', e: 'd', d: 'e' };
  var LISTA_DIRS = ['c', 'b', 'e', 'd'];
  var C = {
    PINCEL: 6, RAIO: 5, RAIO_VEL: 1.5, BALDE: 2.6,            // duração dos poderes (s), tamanho do balde
    ITEM_CADA: 3.2, ITEM_MAX: 3, ITEM_VIDA: 12,
    PEGA: 0.7, PEGA_AJUDA: 1.15,                              // distância para pegar item
    PORCO_VEL: 0.55, PORCO_FORA: 5, LAVA: 0.85,               // porquinho anda a 55% da velocidade, some 5 s quando é lavado
    QUER_VIDA: 1.5                                            // quanto tempo o jogo "lembra" a seta apertada antes da curva
  };
  // Obstáculos (vasos, bonecos de neve, pedras da lua...). Nunca fecham um pedaço do chão.
  var MAPAS = [
    [[5, 3], [18, 3], [5, 8], [18, 8], [11, 5], [12, 6]],
    [[3, 5], [3, 6], [20, 5], [20, 6], [11, 2], [12, 9], [8, 8], [15, 3]],
    [[7, 3], [8, 3], [15, 8], [16, 8], [11, 6], [12, 5], [4, 9], [19, 2]]
  ];
  var INICIOS = [[2, 2, 'd'], [21, 9, 'e'], [21, 2, 'b'], [2, 9, 'c']];
  var INICIOS_TREINO = [[9, 6, 'd'], [14, 4, 'e'], [10, 9, 'b'], [14, 9, 'c']];   // no lobby: no meio, fora dos cartões

  function rng(s) { var a = s >>> 0 || 1; return function () { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
  function idx(x, y) { return y * COLS + x; }
  function dentro(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  function livre(m, x, y) { return dentro(x, y) && m.dono[idx(x, y)] !== BLOQ; }

  /* o: {duracao, ritmo, modo: 'cada'|'equipes'|'juntos'|'treino', semente, mapa, jogadores: [{ajuda, equipe, bot, forca}]} */
  function criar(o) {
    o = o || {};
    var modo = o.modo || 'cada';
    var m = {
      COLS: COLS, ROWS: ROWS, modo: modo, T: modo === 'treino' ? Infinity : (o.duracao || 60), t: 0, fim: false,
      v: VEL[o.ritmo] || VEL.normal, r: rng(o.semente || 7), mapa: (o.mapa === undefined ? ((o.semente || 0) % MAPAS.length) : o.mapa) % MAPAS.length,
      dono: new Array(COLS * ROWS), livres: 0, js: [], itens: [], porcos: [], eventos: [], proxItem: 2.2, nItem: 0, ultimos10: false
    };
    for (var i = 0; i < m.dono.length; i++) m.dono[i] = LIVRE;
    MAPAS[m.mapa].forEach(function (c) { m.dono[idx(c[0], c[1])] = BLOQ; });
    m.livres = m.dono.filter(function (d) { return d !== BLOQ; }).length;
    var js = o.jogadores || [];
    var porEquipe = modo === 'equipes' || !!o.equipes;
    m.slots = porEquipe ? 2 : js.length;
    m.placar = []; for (var s = 0; s < m.slots; s++) m.placar.push(0);
    js.forEach(function (jo, j) {
      var ini = (modo === 'treino' ? INICIOS_TREINO : INICIOS)[j % 4];
      m.js.push({
        x: ini[0] + 0.5, y: ini[1] + 0.5, dir: modo === 'treino' ? null : ini[2], quer: null, querT: 0, olhar: ini[2],
        ajuda: !!jo.ajuda, bot: !!jo.bot, forca: jo.forca === undefined ? 0.8 : jo.forca, pensa: 0,
        slot: porEquipe ? (jo.equipe ? 1 : 0) : j,
        pincel: 0, raio: 0, andando: 0,
        conta: { pintou: 0, itens: 0, dist: 0, porCima: 0, lavou: 0 }
      });
    });
    if (modo === 'juntos') {
      var nP = js.length >= 3 ? 3 : 2;
      for (var p = 0; p < nP; p++) m.porcos.push({ x: [11.5, 12.5, 6.5][p], y: [3.5, 8.5, 6.5][p], dir: ['e', 'd', 'c'][p], quer: null, querT: 0, fora: 0, porco: true, olhar: 'b', pensa: 0, andando: 0 });
    }
    // cada um começa com o seu cantinho pintado
    if (modo !== 'treino') m.js.forEach(function (p, j) { pintar(m, j, Math.floor(p.x), Math.floor(p.y), 1); });
    m.eventos.length = 0;
    return m;
  }

  /* ---------- pintar ---------- */
  function pintar(m, j, cx, cy, raio) {
    var p = m.js[j], slot = p.slot, r = Math.ceil(raio), n = 0;
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > raio * raio + 0.01) continue;
      var x = cx + dx, y = cy + dy; if (!dentro(x, y)) continue;
      var i = idx(x, y), velho = m.dono[i];
      if (velho === BLOQ || velho === slot) continue;
      if (velho >= 0) { m.placar[velho]--; p.conta.porCima++; }
      m.dono[i] = slot; m.placar[slot]++; p.conta.pintou++; n++;
      m.eventos.push({ tipo: 'tinta', i: i, slot: slot });
    }
    return n;
  }
  function raioPincel(p) { return (p.ajuda ? 1 : 0) + (p.pincel > 0 ? 1.5 : 0); }

  /* ---------- andar (em linhas e colunas, como num tabuleiro) ---------- */
  function setinha(m, j, d) {                     // a pessoa apertou uma seta
    var p = m.js[j]; if (!p || !DIRS[d] || m.fim) return;
    p.quer = d; p.querT = C.QUER_VIDA; p.olhar = d;
  }
  function podeIr(m, x, y, d) { var v = DIRS[d]; return livre(m, Math.floor(x) + v[0], Math.floor(y) + v[1]); }
  function mover(m, p, v, dt, aoBater) {
    var antes = p.x + p.y;
    if (p.quer) {
      p.querT -= dt;
      if (p.quer === p.dir) p.quer = null;
      else if (!p.dir || p.quer === OPOSTO[p.dir]) {
        if (podeIr(m, p.x, p.y, p.quer) || p.dir) { p.dir = p.quer; p.x = p.dir === 'e' || p.dir === 'd' ? p.x : Math.floor(p.x) + 0.5; p.y = p.dir === 'c' || p.dir === 'b' ? p.y : Math.floor(p.y) + 0.5; }
        p.quer = null;
      } else {                                    // curva: só no meio do quadradinho
        var hor = p.dir === 'e' || p.dir === 'd', pos = hor ? p.x : p.y, centro = Math.floor(pos) + 0.5, sinal = DIRS[p.dir][0] + DIRS[p.dir][1];
        var off = (pos - centro) * sinal, passo = v * dt;
        if (off >= -passo - 0.02 && off <= 0.3 && podeIr(m, hor ? centro : p.x, hor ? p.y : centro, p.quer)) {
          if (hor) p.x = centro; else p.y = centro;
          p.dir = p.quer; p.quer = null;
        } else if (p.querT <= 0) p.quer = null;
      }
    }
    if (!p.dir) { p.andando = 0; return; }
    var d = DIRS[p.dir], dist = v * dt;
    // o outro eixo vai para o meio da linha (curvas certinhas)
    if (d[0]) p.y += Math.max(-dist, Math.min(dist, Math.floor(p.y) + 0.5 - p.y));
    else p.x += Math.max(-dist, Math.min(dist, Math.floor(p.x) + 0.5 - p.x));
    var eixo = d[0] ? 'x' : 'y', s = d[0] || d[1], pos2 = p[eixo], centro2 = Math.floor(pos2) + 0.5;
    var nx = Math.floor(p.x) + d[0], ny = Math.floor(p.y) + d[1];
    if (!livre(m, nx, ny) && (pos2 + s * dist - centro2) * s >= 0) {
      p[eixo] = (pos2 - centro2) * s > 0 ? pos2 : centro2;
      if (aoBater) aoBater(p); else p.dir = null;
    } else p[eixo] = pos2 + s * dist;
    p.andando = Math.abs(p.x + p.y - antes) > 0.0001 ? 1 : 0;
    if (p.dir) p.olhar = p.dir;
  }

  /* quantos quadradinhos "bons" há em cada direção (para robôs, porquinhos e a ajuda da criança) */
  function avaliar(m, p, d, bom) {
    var v = DIRS[d], x = Math.floor(p.x), y = Math.floor(p.y), soma = 0;
    for (var k = 1; k <= 6; k++) {
      x += v[0]; y += v[1];
      if (!livre(m, x, y)) { if (k === 1) return -99; break; }
      if (bom(m.dono[idx(x, y)], x, y)) soma += 1 / k;
    }
    return soma;
  }
  function melhorDir(m, p, bom, ruido, evitarVolta) {
    var melhor = null, nota = -1e9;
    LISTA_DIRS.forEach(function (d) {
      var n = avaliar(m, p, d, bom); if (n <= -99) return;
      if (evitarVolta && p.dir && d === OPOSTO[p.dir]) n -= 1.2;
      n += m.r() * ruido;
      if (n > nota) { nota = n; melhor = d; }
    });
    return melhor;
  }
  function virarSozinho(m, j) {                   // criança e robô: bateu na parede, vira sozinho para um lado livre
    return function (p) {
      var slot = p.slot, livres = LISTA_DIRS.filter(function (d) { return d !== p.dir && d !== OPOSTO[p.dir] && podeIr(m, p.x, p.y, d); });
      if (!livres.length) { p.dir = podeIr(m, p.x, p.y, OPOSTO[p.dir]) ? OPOSTO[p.dir] : null; return; }
      var bom = function (dono) { return dono !== slot; };
      livres.sort(function (a, b) { return avaliar(m, p, b, bom) - avaliar(m, p, a, bom); });
      p.dir = livres[0]; p.quer = null;
    };
  }
  function pensarRobo(m, j, dt) {
    var p = m.js[j]; p.pensa -= dt;
    var hor = p.dir === 'e' || p.dir === 'd', pos = hor ? p.x : p.y, off = Math.abs(pos - Math.floor(pos) - 0.5);
    if (p.dir && (p.pensa > 0 || off > 0.12)) return;
    p.pensa = 0.25 + m.r() * 0.3;
    var slot = p.slot;
    var alvo = null, perto = 1e9;
    m.itens.forEach(function (it) { var dd = Math.abs(it.x - p.x) + Math.abs(it.y - p.y); if (dd < perto && dd < 5) { perto = dd; alvo = it; } });
    var bom = function (dono, x, y) { return dono !== slot || (alvo && Math.floor(alvo.x) === x && Math.floor(alvo.y) === y); };
    var d = melhorDir(m, p, bom, 2.2 * (1 - p.forca) + 0.15, true);
    if (d && d !== p.dir) setinha(m, j, d);
  }

  /* ---------- itens ---------- */
  var TIPOS = ['balde', 'pincel', 'raio'];
  function lugarLivre(m, perto) {
    for (var tenta = 0; tenta < 60; tenta++) {
      var x, y;
      if (perto && tenta < 30) { x = Math.floor(perto.x + (m.r() * 10 - 5)); y = Math.floor(perto.y + (m.r() * 8 - 4)); }
      else { x = Math.floor(m.r() * COLS); y = Math.floor(m.r() * ROWS); }
      if (!livre(m, x, y)) continue;
      var ocupado = m.itens.some(function (it) { return Math.floor(it.x) === x && Math.floor(it.y) === y; }) ||
        m.js.some(function (p) { return Math.abs(p.x - x - 0.5) + Math.abs(p.y - y - 0.5) < 2; });
      if (!ocupado) return { x: x + 0.5, y: y + 0.5 };
    }
    return null;
  }
  function gerarItem(m) {
    if (m.itens.length >= C.ITEM_MAX || !m.js.length) return;
    var perto = null;
    // ajudinha para quem está perdendo: o item aparece perto de quem pintou menos
    if (m.modo !== 'juntos' && m.modo !== 'treino' && m.r() < 0.6) {
      var menor = 1e9; m.js.forEach(function (p) { if (m.placar[p.slot] < menor) { menor = m.placar[p.slot]; perto = p; } });
    }
    var l = lugarLivre(m, perto); if (!l) return;
    var tipo = TIPOS[m.nItem % 3 === 0 ? 0 : Math.floor(m.r() * 3)];
    m.itens.push({ id: ++m.nItem, tipo: tipo, x: l.x, y: l.y, vida: C.ITEM_VIDA });
    m.eventos.push({ tipo: 'apareceu', item: tipo, x: l.x, y: l.y });
  }
  function pegar(m, j, it) {
    var p = m.js[j];
    p.conta.itens++;
    if (it.tipo === 'balde') pintar(m, j, Math.floor(it.x), Math.floor(it.y), C.BALDE);
    else if (it.tipo === 'pincel') p.pincel = C.PINCEL;
    else if (it.tipo === 'raio') p.raio = C.RAIO;
    m.eventos.push({ tipo: 'item', item: it.tipo, j: j, x: it.x, y: it.y, slot: p.slot });
  }

  /* ---------- porquinhos de lama (só no modo Todos juntos) ---------- */
  function andarPorco(m, g, dt) {
    if (g.fora > 0) {
      g.fora -= dt;
      if (g.fora <= 0) {
        var longe = null;
        for (var t = 0; t < 30 && !longe; t++) { var l = lugarLivre(m); if (l && m.js.every(function (p) { return Math.abs(p.x - l.x) + Math.abs(p.y - l.y) > 6; })) longe = l; }
        longe = longe || lugarLivre(m) || { x: 12.5, y: 6.5 };
        g.x = longe.x; g.y = longe.y; g.dir = null; g.fora = 0;
        m.eventos.push({ tipo: 'porcoVoltou', x: g.x, y: g.y });
      }
      return;
    }
    g.pensa -= dt;
    var hor = g.dir === 'e' || g.dir === 'd', pos = hor ? g.x : g.y, off = Math.abs(pos - Math.floor(pos) - 0.5);
    if (!g.dir || (g.pensa <= 0 && off < 0.12)) {
      g.pensa = 0.6 + m.r() * 0.8;
      var d = melhorDir(m, g, function (dono) { return dono >= 0; }, 1.4, true);
      if (d) { g.quer = d; g.querT = 1; }
    }
    mover(m, g, m.v * C.PORCO_VEL, dt, function (q) { q.dir = null; });
    if (m.t > 3) {
      var i = idx(Math.floor(g.x), Math.floor(g.y)), dono = m.dono[i];
      if (dono >= 0) { m.placar[dono]--; m.dono[i] = LAMA; m.eventos.push({ tipo: 'tinta', i: i, slot: LAMA }); }
    }
    for (var j = 0; j < m.js.length; j++) {
      var p = m.js[j];
      if (Math.abs(p.x - g.x) < C.LAVA && Math.abs(p.y - g.y) < C.LAVA) {
        g.fora = C.PORCO_FORA; p.conta.lavou++;
        m.eventos.push({ tipo: 'lavou', j: j, x: g.x, y: g.y });
        break;
      }
    }
  }

  /* ---------- passo do jogo ---------- */
  function avancar(m, dt) {
    if (m.fim) return;
    var passo = 1 / 60;
    while (dt > 1e-6) { var d = Math.min(passo, dt); passoFixo(m, d); dt -= d; if (m.fim) break; }
  }
  function passoFixo(m, dt) {
    m.t += dt;
    if (m.modo !== 'treino' && !m.ultimos10 && m.T - m.t <= 10) { m.ultimos10 = true; m.eventos.push({ tipo: 'ultimos10' }); }
    if (m.t >= m.T) { m.t = m.T; m.fim = true; m.itens.length = 0; m.eventos.push({ tipo: 'fim' }); return; }
    if (m.modo !== 'treino') {
      m.proxItem -= dt;
      if (m.proxItem <= 0) { m.proxItem = C.ITEM_CADA; gerarItem(m); }
      for (var k = m.itens.length - 1; k >= 0; k--) { m.itens[k].vida -= dt; if (m.itens[k].vida <= 0) m.itens.splice(k, 1); }
    }
    for (var j = 0; j < m.js.length; j++) {
      var p = m.js[j];
      p.pincel = Math.max(0, p.pincel - dt); p.raio = Math.max(0, p.raio - dt);
      if (p.bot) pensarRobo(m, j, dt);
      var v = m.v * (p.raio > 0 ? C.RAIO_VEL : 1), x0 = p.x, y0 = p.y;
      mover(m, p, v, dt, p.ajuda || p.bot ? virarSozinho(m, j) : null);
      p.conta.dist += Math.abs(p.x - x0) + Math.abs(p.y - y0);
      pintar(m, j, Math.floor(p.x), Math.floor(p.y), raioPincel(p));
      var alcance = p.ajuda ? C.PEGA_AJUDA : C.PEGA;
      for (var i = m.itens.length - 1; i >= 0; i--) {
        var it = m.itens[i];
        if (Math.abs(it.x - p.x) < alcance && Math.abs(it.y - p.y) < alcance) { m.itens.splice(i, 1); pegar(m, j, it); }
      }
    }
    m.porcos.forEach(function (g) { andarPorco(m, g, dt); });
  }

  /* ---------- números para a tela ---------- */
  function pintado(m) { var n = 0; for (var s = 0; s < m.slots; s++) n += m.placar[s]; return n; }
  // Todos juntos: quanto do chão precisa pintar para cada estrela (depende de quantos jogam)
  function metas(n) { var alvo = Math.min(0.82, 0.5 + 0.11 * Math.max(1, n)); return [alvo * 0.5, alvo * 0.75, alvo]; }
  function estrelas(m) { var f = pintado(m) / m.livres, mt = metas(m.js.length); return f >= mt[2] ? 3 : f >= mt[1] ? 2 : f >= mt[0] ? 1 : 0; }

  /* resultado: todos ganham um título */
  var TITULOS = [
    ['itens', '🪣', 'Pegou mais itens'],
    ['dist', '⚡', 'Pé ligeiro'],
    ['porCima', '🎨', 'Pinta por cima'],
    ['lavou', '🫧', 'Lava-porquinho']
  ];
  function resultado(m) {
    var lista = m.js.map(function (p, j) {
      return { j: j, slot: p.slot, pts: m.modo === 'equipes' || m.modo === 'juntos' ? p.conta.pintou : m.placar[p.slot], pct: Math.round(100 * m.placar[p.slot] / m.livres), conta: p.conta };
    });
    var ord = lista.slice().sort(function (a, b) { return b.pts - a.pts; });
    var pos = 0; ord.forEach(function (r, i) { if (i === 0 || r.pts < ord[i - 1].pts) pos = i + 1; r.pos = pos; });
    var usado = {};
    ord.forEach(function (r) { if (r.pos === 1 && r.pts > 0) { r.icone = m.modo === 'cada' ? '🏆' : '🖌️'; r.titulo = m.modo === 'cada' ? 'Mais tinta!' : 'Mais pintou'; usado.primeiro = 1; } });
    TITULOS.forEach(function (t) {
      if (t[0] === 'lavou' && m.modo !== 'juntos') return;
      if (t[0] === 'porCima' && m.modo === 'juntos') return;
      var livres = ord.filter(function (r) { return !r.titulo && r.conta[t[0]] > 0; });
      if (!livres.length) return;
      livres.sort(function (a, b) { return b.conta[t[0]] - a.conta[t[0]]; });
      livres[0].titulo = t[2]; livres[0].icone = t[1];
    });
    var extras = [['😊', 'Pintor feliz'], ['🌈', 'Artista'], ['🐾', 'Passinho fofo']], e = 0;
    ord.forEach(function (r) { if (!r.titulo) { r.icone = extras[e % 3][0]; r.titulo = extras[e % 3][1]; e++; } });
    var res = { modo: m.modo, jogadores: ord, pintado: pintado(m), livres: m.livres, pct: Math.round(100 * pintado(m) / m.livres) };
    if (m.modo === 'equipes') {
      res.equipes = [0, 1].map(function (s) { return { slot: s, pts: m.placar[s], pct: Math.round(100 * m.placar[s] / m.livres) }; });
      res.vencedora = m.placar[0] === m.placar[1] ? -1 : m.placar[0] > m.placar[1] ? 0 : 1;
      var v = res.vencedora; ord.sort(function (a, b) { return ((b.slot === v) - (a.slot === v)) || b.pts - a.pts; });  // time vencedor primeiro
    }
    if (m.modo === 'juntos') { res.estrelas = estrelas(m); res.metas = metas(m.js.length).map(function (x) { return Math.round(x * 100); }); }
    return res;
  }

  var Mundo = {
    COLS: COLS, ROWS: ROWS, LIVRE: LIVRE, BLOQ: BLOQ, LAMA: LAMA, C: C, VEL: VEL, MAPAS: MAPAS, DIRS: DIRS,
    criar: criar, avancar: avancar, setinha: setinha, resultado: resultado, pintado: pintado, estrelas: estrelas, metas: metas,
    parar: function (m, j) { var p = m.js[j]; if (p) { p.dir = null; p.quer = null; } }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Mundo;
  else raiz.Mundo = Mundo;
})(this);
