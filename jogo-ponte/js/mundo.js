/* Ponte do Desespero — regras e "física" da corrida (sem tela). Testado em tests/.
   Todo mundo corre sozinho para a direita numa ponte de 3 pistas. O jogador só escolhe a pista,
   pula e usa poderes. Ninguém é eliminado: quem cai volta logo atrás, e quem fica para trás
   ganha velocidade extra e poderes melhores (como nos jogos de kart).
   Todos os números ficam em C. */
(function (raiz) {
  'use strict';

  var C = {
    PISTAS: 3,
    VEL: 182,               // velocidade base (unidades por segundo)
    VEL_BOT: 0.955,         // bots um pouco mais lentos
    ALCANCE: 0.28,          // até +28% de velocidade para quem está longe do líder
    ALCANCE_DIST: 900,
    PULO: 0.62,             // duração do pulo (s)
    PULO_SEGURO: 0.07,      // começo/fim do pulo em que ainda encosta no chão
    TROCA: 0.16,            // tempo mínimo entre duas trocas de pista
    QUEDA: 0.95,            // tempo caído na lava antes de voltar
    RECUO: 70,              // volta este tanto para trás ao cair
    PROTEGIDO: 1.6,         // invencível depois de voltar
    TOMBO: 0.55,            // atordoado ao bater nos espinhos/pedra
    EMPURRAO_CD: 5,         // recarga do empurrão
    EMPURRAO_ALCANCE: 150,
    TURBO: 2.8, TURBO_VEL: 1.6,
    ESCUDO: 5,
    IMA: 3.5, IMA_RAIO: 150,
    RAIO_TOMBO: 1.1,
    MOLA: 260,              // a mola joga para frente (céu)
    AVISO_ONDA: 2.3, DURA_ONDA: 1.9, ENTRE_ONDAS: 7.5,
    TEMPO_MAX: 80,          // segurança: a rodada nunca passa disso
    FALTA_DEPOIS: 12,       // depois que o 1º chega, os outros têm estes segundos
    PONTOS_CHEGADA: [12, 9, 7, 5, 4, 3, 2, 1],
    CRISTAL: 1
  };

  /* Os mundos (um por rodada, em sequência). Mesmas regras, cada um com um tempero. */
  var MUNDOS = [
    { id: 'vulcao', nome: 'Ponte do Vulcão', perigo: 'LAVA', comprimento: 3500, extra: null },
    { id: 'gelo', nome: 'Ponte de Gelo', perigo: 'AVALANCHE', comprimento: 3700, extra: 'escorrega' },
    { id: 'ceu', nome: 'Ponte das Nuvens', perigo: 'RAIO', comprimento: 3900, extra: 'mola' }
  ];

  var PODERES = ['turbo', 'escudo', 'ima', 'raio'];
  var NOME_PODER = { turbo: 'TURBO', escudo: 'ESCUDO', ima: 'ÍMÃ', raio: 'RAIO', empurrao: 'EMPURRÃO' };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function gerador(semente) {
    var s = (semente >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* Monta a pista: buracos, espinhos, tábuas rachadas, pedras que rolam, cristais e caixas.
     Regra de justiça: em cada trecho sempre sobra pelo menos uma pista livre, e o começo é calmo. */
  function montarPista(mundo, semente) {
    var rnd = gerador(semente), L = mundo.comprimento;
    var obst = [], cristais = [], caixas = [], molas = [];
    var passo = 150;
    for (var x = 420; x < L - 220; x += passo) {
      var calma = x < 900 ? 0.45 : x < 1800 ? 0.68 : 0.8;
      var pistas = [0, 1, 2].sort(function () { return rnd() - 0.5; });
      var n = rnd() < calma ? (rnd() < 0.42 ? 2 : 1) : 0;
      for (var k = 0; k < n; k++) {
        var r = rnd(), tipo = r < 0.42 ? 'buraco' : r < 0.68 ? 'espinhos' : r < 0.86 ? 'rachada' : 'pedra';
        if (tipo === 'pedra' && x < 1100) tipo = 'buraco';
        obst.push({ x: x + Math.floor(rnd() * 40), pista: pistas[k], tipo: tipo, estado: 0, t: 0, vx: 0 });
      }
      // Cristais: em fileira na pista livre (rotas arriscadas têm mais).
      for (var p = 0; p < 3; p++) {
        var livre = !obst.some(function (o) { return o.pista === p && Math.abs(o.x - x) < 70; });
        if (livre && rnd() < 0.22) for (var c = 0; c < 3; c++) cristais.push({ x: x + 20 + c * 28, pista: p, pego: false });
      }
      if (x > 700 && rnd() < 0.2) {
        var vazias = [0, 1, 2].filter(function (p2) { return !obst.some(function (o) { return o.pista === p2 && Math.abs(o.x - x - 75) < 80; }); });
        if (vazias.length) caixas.push({ x: x + 75, pista: vazias[Math.floor(rnd() * vazias.length)], pego: {} });
      }
      if (mundo.extra === 'mola' && x > 900 && rnd() < 0.09) {
        var vz = [0, 1, 2].filter(function (p3) { return !obst.some(function (o) { return o.pista === p3 && Math.abs(o.x - x - 110) < 90; }); });
        if (vz.length) molas.push({ x: x + 110, pista: vz[Math.floor(rnd() * vz.length)] });
      }
    }
    // Garante uma pista livre em cada trecho de 60 unidades.
    obst.sort(function (a, b) { return a.x - b.x; });
    for (var i = 0; i < obst.length; i++) {
      var junto = obst.filter(function (o) { return Math.abs(o.x - obst[i].x) < 60; });
      var ocup = {}; junto.forEach(function (o) { ocup[o.pista] = 1; });
      if (Object.keys(ocup).length >= 3) { obst.splice(i, 1); i--; }
    }
    return { obst: obst, cristais: cristais, caixas: caixas, molas: molas };
  }

  /* jogadores: [{id, cor, bot, facil}] */
  function novaRodada(jogadores, o) {
    o = o || {};
    var mundo = MUNDOS[(o.mundo || 0) % MUNDOS.length];
    var semente = o.semente || (Date.now() & 0xffff);
    var pista = montarPista(mundo, semente);
    var m = {
      mundo: mundo, L: mundo.comprimento, semente: semente, rnd: gerador(semente * 7 + 3), treino: !!o.treino,
      t: 0, fim: false, chegada: [], primeiroEm: null,
      obst: pista.obst, cristais: pista.cristais, caixas: pista.caixas, molas: pista.molas,
      onda: null, proximaOnda: 6, camera: 0,
      corredores: [], eventos: []
    };
    jogadores.forEach(function (j, i) { adicionar(m, j, i); });
    return m;
  }
  function adicionar(m, j, i) {
    var r = {
      id: j.id, cor: j.cor || 0, bot: !!j.bot, facil: !!j.facil,
      x: m.camera + 40 - (i % 4) * 14, pista: i % 3, vpista: i % 3, troca: 0, filaTroca: 0,
      pulo: 0, caido: 0, tombo: 0, prot: 0, escudo: 0, turbo: 0, ima: 0,
      poder: null, cd: 2, cristais: 0, quedas: 0, empurroes: 0, chegou: false, lugar: 0, fala: '', falaAte: 0
    };
    m.corredores.push(r);
    return r;
  }
  function remover(m, id) { m.corredores = m.corredores.filter(function (r) { return r.id !== id; }); }
  function corredor(m, id) { for (var i = 0; i < m.corredores.length; i++) if (m.corredores[i].id === id) return m.corredores[i]; return null; }
  function ev(m, e) { m.eventos.push(e); }
  function tirarEventos(m) { var e = m.eventos; m.eventos = []; return e; }

  function noAr(r) { return r.pulo > C.PULO_SEGURO && r.pulo < C.PULO - C.PULO_SEGURO; }
  function vivos(m) { return m.corredores.filter(function (r) { return !r.chegou; }); }
  function lider(m) {
    var v = vivos(m); if (!v.length) return null;
    return v.reduce(function (a, b) { return b.x > a.x ? b : a; });
  }
  /* Posição na corrida (1 = na frente). Quem já chegou vem antes. */
  function posicoes(m) {
    var lista = m.corredores.slice().sort(function (a, b) {
      if (a.chegou && b.chegou) return a.lugar - b.lugar;
      if (a.chegou) return -1; if (b.chegou) return 1;
      return b.x - a.x;
    });
    var p = {}; lista.forEach(function (r, i) { p[r.id] = i + 1; });
    return p;
  }

  /* Caixa surpresa: quem está atrás ganha poderes melhores. */
  function sortearPoder(m, r) {
    var pos = posicoes(m)[r.id], n = m.corredores.length, rnd = m.rnd();
    var atras = n > 1 ? (pos - 1) / (n - 1) : 0;
    if (pos === 1) return rnd < 0.55 ? 'escudo' : rnd < 0.8 ? 'ima' : 'turbo';
    if (atras > 0.6) return rnd < 0.45 ? 'raio' : rnd < 0.85 ? 'turbo' : 'ima';
    return PODERES[Math.floor(rnd * PODERES.length)];
  }

  function falar(m, r, txt) { r.fala = txt; r.falaAte = m.t + 1.2; }

  /* Bate num perigo. Buraco = cai na lava e volta; espinhos/pedra = tombo. */
  function bater(m, r, tipo) {
    if (r.prot > 0 || r.caido > 0 || r.chegou) return;
    if (r.escudo > 0) { r.escudo = 0; r.prot = 0.8; ev(m, { tipo: 'escudo', id: r.id, x: r.x, pista: r.pista }); falar(m, r, 'UFA!'); return; }
    r.quedas++;
    var perdeu = r.cristais > 0 ? 1 : 0; r.cristais -= perdeu;
    if (tipo === 'buraco' || tipo === 'onda') {
      r.caido = C.QUEDA; r.pulo = 0; r.turbo = 0;
      ev(m, { tipo: 'queda', id: r.id, x: r.x, pista: r.pista, por: tipo, perdeu: perdeu });
      falar(m, r, tipo === 'onda' ? 'AI, QUENTE!' : 'SOCORRO!');
    } else {
      r.tombo = C.TOMBO; r.prot = 0.9; r.x = Math.max(m.camera, r.x - 35);
      ev(m, { tipo: 'tombo', id: r.id, x: r.x, pista: r.pista, por: tipo, perdeu: perdeu });
      falar(m, r, 'AAAI!');
    }
  }
  function voltar(m, r) {
    r.x = Math.max(m.camera + 30, r.x - C.RECUO);
    // volta numa pista sem perigo por perto
    var livres = [0, 1, 2].filter(function (p) { return !perigoPerto(m, p, r.x - 40, r.x + 120) && !(m.onda && m.onda.pista === p && m.onda.estado !== 'fim'); });
    if (livres.length && livres.indexOf(r.pista) < 0) r.pista = livres[0];
    r.vpista = r.pista; r.prot = C.PROTEGIDO;
    ev(m, { tipo: 'volta', id: r.id, x: r.x, pista: r.pista });
  }
  function perigoPerto(m, p, de, ate) {
    return m.obst.some(function (o) { return o.pista === p && o.x > de && o.x < ate && (o.tipo !== 'rachada' || o.estado < 2); });
  }

  function usarPoder(m, r) {
    if (r.caido > 0 || r.chegou || m.t < 1) return;
    var outros = m.corredores.filter(function (q) { return q !== r && !q.chegou && q.caido <= 0; });
    if (r.poder) {
      var p = r.poder; r.poder = null;
      if (p === 'turbo') { r.turbo = C.TURBO; falar(m, r, 'TURBO!'); }
      else if (p === 'escudo') { r.escudo = C.ESCUDO; falar(m, r, 'ESCUDO!'); }
      else if (p === 'ima') { r.ima = C.IMA; falar(m, r, 'ÍMÃ!'); }
      else if (p === 'raio') {
        var alvos = outros.filter(function (q) { return q.x > r.x && q.escudo <= 0; });
        alvos.forEach(function (q) { q.tombo = Math.max(q.tombo, C.RAIO_TOMBO); });
        outros.filter(function (q) { return q.x > r.x && q.escudo > 0; }).forEach(function (q) { q.escudo = 0; });
        falar(m, r, 'ZAP!');
        ev(m, { tipo: 'raio', id: r.id, alvos: alvos.map(function (q) { return q.id; }) });
      }
      ev(m, { tipo: 'poder', id: r.id, poder: p });
      return;
    }
    if (r.cd > 0 || r.tombo > 0) return;
    r.cd = C.EMPURRAO_CD;
    var perto = outros.filter(function (q) { return Math.abs(q.x - r.x) < C.EMPURRAO_ALCANCE && Math.abs(q.pista - r.pista) <= 1 && q.prot <= 0; })
      .sort(function (a, b) { return Math.abs(a.x - r.x) - Math.abs(b.x - r.x); });
    var q = perto[0];
    if (!q) { falar(m, r, 'ERREI!'); ev(m, { tipo: 'empurraoAr', id: r.id }); return; }
    if (q.escudo > 0) { q.escudo = 0; r.tombo = 0.35; ev(m, { tipo: 'bloqueio', id: r.id, alvo: q.id }); falar(m, q, 'NÃO DEU!'); return; }
    // Empurra de lado (para fora da pista de quem empurrou) e atrapalha um pouco.
    var lado = q.pista === r.pista ? (q.pista === 0 ? 1 : q.pista === 2 ? -1 : (m.rnd() < 0.5 ? -1 : 1)) : (q.pista - r.pista);
    q.pista = clamp(q.pista + lado, 0, 2); q.troca = 0.3;
    q.tombo = Math.max(q.tombo, 0.45); q.x = Math.max(m.camera, q.x - 45);
    r.empurroes++;
    falar(m, q, 'EI!');
    ev(m, { tipo: 'empurrao', id: r.id, alvo: q.id, x: q.x, pista: q.pista });
  }

  /* entradas: {id: {cima, baixo, pulo, poder}} com a quantidade de toques desde o último passo. */
  function passo(m, dt, entradas) {
    if (m.fim) return;
    m.t += dt;
    entradas = entradas || {};
    var lid = lider(m);
    var esc = m.mundo.extra === 'escorrega';

    // Onda de perigo numa pista (lava / avalanche / raio), com aviso antes.
    if (!m.treino || m.corredores.length) {
      if (!m.onda && m.t >= m.proximaOnda && lid && lid.x > 600 && lid.x < m.L - 400) {
        var pistaOnda = Math.floor(m.rnd() * 3);
        m.onda = { pista: pistaOnda, estado: 'aviso', ini: m.t, ativa: m.t + C.AVISO_ONDA, acaba: m.t + C.AVISO_ONDA + C.DURA_ONDA };
        ev(m, { tipo: 'aviso', pista: pistaOnda });
      }
      if (m.onda) {
        if (m.onda.estado === 'aviso' && m.t >= m.onda.ativa) { m.onda.estado = 'ativa'; ev(m, { tipo: 'onda', pista: m.onda.pista }); }
        if (m.onda.estado === 'ativa' && m.t >= m.onda.acaba) { m.onda = null; m.proximaOnda = m.t + C.ENTRE_ONDAS; }
      }
    }

    m.corredores.forEach(function (r) {
      var e = entradas[r.id] || {};
      if (r.chegou) { r.x += C.VEL * 0.6 * dt; return; }
      r.cd = Math.max(0, r.cd - dt); r.prot = Math.max(0, r.prot - dt); r.escudo = Math.max(0, r.escudo - dt);
      r.turbo = Math.max(0, r.turbo - dt); r.ima = Math.max(0, r.ima - dt); r.troca = Math.max(0, r.troca - dt);
      r.tombo = Math.max(0, r.tombo - dt);
      if (r.caido > 0) { r.caido -= dt; if (r.caido <= 0) { r.caido = 0; voltar(m, r); } return; }

      // Comandos
      r.filaTroca = clamp(r.filaTroca + (e.baixo || 0) - (e.cima || 0), -2, 2);
      if (r.filaTroca !== 0 && r.troca <= 0) {
        var d = r.filaTroca > 0 ? 1 : -1, nova = clamp(r.pista + d, 0, 2);
        r.filaTroca -= d;
        if (nova !== r.pista) { r.pista = nova; r.troca = esc ? C.TROCA * 1.6 : C.TROCA; ev(m, { tipo: 'troca', id: r.id }); }
      }
      if (e.pulo && r.pulo <= 0 && r.tombo <= 0) { r.pulo = C.PULO * (m.mundo.extra === 'mola' ? 1.12 : 1); ev(m, { tipo: 'pulo', id: r.id }); }
      if (e.poder) usarPoder(m, r);
      r.vpista += (r.pista - r.vpista) * Math.min(1, dt * (esc ? 8 : 14));
      if (r.pulo > 0) r.pulo = Math.max(0, r.pulo - dt);

      // Velocidade: base × alcance (quem está atrás corre mais) × turbo × tombo.
      var atras = lid ? Math.max(0, lid.x - r.x) : 0;
      var v = C.VEL * (r.bot ? C.VEL_BOT : 1) * (1 + C.ALCANCE * clamp(atras / C.ALCANCE_DIST, 0, 1));
      if (r.turbo > 0) v *= C.TURBO_VEL;
      if (r.tombo > 0) v *= 0.35;
      var antes = r.x;
      r.x += v * dt;

      // Perigos atravessados neste passo
      for (var i = 0; i < m.obst.length; i++) {
        var o = m.obst[i];
        if (o.pista !== r.pista) continue;
        var cx = o.x;
        if (cx < antes - 26 || cx > r.x + 26) continue;
        if (o.tipo === 'rachada') {
          if (o.estado === 0 && !noAr(r)) { o.estado = 1; o.t = m.t; ev(m, { tipo: 'racha', x: o.x, pista: o.pista }); }
          if (o.estado === 2 && !noAr(r)) { bater(m, r, 'buraco'); break; }
          continue;
        }
        if (o.tipo === 'pedra' && o.estado === 2) continue;
        if (!noAr(r)) { bater(m, r, o.tipo === 'buraco' ? 'buraco' : o.tipo); if (o.tipo === 'pedra') { o.estado = 2; ev(m, { tipo: 'pedraQuebra', x: o.x, pista: o.pista }); } break; }
      }
      if (r.caido > 0) return;
      if (m.onda && m.onda.estado === 'ativa' && m.onda.pista === r.pista && !noAr(r)) { bater(m, r, 'onda'); if (r.caido > 0) return; }

      // Mola (céu): joga para frente
      m.molas.forEach(function (mo) {
        if (mo.pista === r.pista && mo.x >= antes - 10 && mo.x <= r.x + 10 && !noAr(r)) { r.x += C.MOLA; r.pulo = C.PULO * 1.4; ev(m, { tipo: 'mola', id: r.id, x: mo.x, pista: mo.pista }); falar(m, r, 'IUHUU!'); }
      });
      // Cristais e caixas
      m.cristais.forEach(function (c) {
        if (c.pego) return;
        var pega = (c.pista === r.pista && c.x >= antes - 22 && c.x <= r.x + 22) || (r.ima > 0 && Math.abs(c.x - r.x) < C.IMA_RAIO);
        if (pega) { c.pego = true; r.cristais += 1; ev(m, { tipo: 'cristal', id: r.id, x: c.x, pista: c.pista }); }
      });
      m.caixas.forEach(function (b) {
        if (b.pego[r.id] || b.pista !== r.pista || b.x < antes - 24 || b.x > r.x + 24) return;
        b.pego[r.id] = 1; // cada caixa serve uma vez para cada jogador
        if (r.poder) return;
        r.poder = sortearPoder(m, r);
        ev(m, { tipo: 'caixa', id: r.id, poder: r.poder, x: b.x, pista: b.pista });
      });

      // Chegada
      if (r.x >= m.L && !m.treino) {
        r.chegou = true; m.chegada.push(r.id); r.lugar = m.chegada.length;
        if (m.primeiroEm === null) m.primeiroEm = m.t;
        ev(m, { tipo: 'chegou', id: r.id, lugar: r.lugar });
      } else if (r.x >= m.L && m.treino) {
        r.x = 40; r.pista = 1; r.vpista = 1; ev(m, { tipo: 'volta', id: r.id, x: r.x, pista: 1 });
      }
    });

    // Tábuas rachadas caem meio segundo depois de pisadas; pedras rolam na direção dos corredores.
    m.obst.forEach(function (o) {
      if (o.tipo === 'rachada' && o.estado === 1 && m.t - o.t > 0.5) { o.estado = 2; ev(m, { tipo: 'caiuTabua', x: o.x, pista: o.pista }); }
      if (o.tipo === 'pedra' && o.estado === 0 && lid && o.x - lid.x < 700) { o.estado = 1; o.vx = -95; ev(m, { tipo: 'pedraRola', x: o.x, pista: o.pista }); }
      if (o.tipo === 'pedra' && o.estado === 1) o.x += o.vx * dt;
    });

    // Câmera: segue quem está na frente; quem ficar para trás é empurrado pela borda da tela.
    var lid2 = lider(m);
    if (lid2) {
      var alvo = clamp(lid2.x - 780, 0, Math.max(0, m.L - 1000));
      if (m.treino) alvo = clamp(lid2.x - 780, 0, m.L);
      m.camera += (alvo - m.camera) * Math.min(1, dt * 3);
      if (m.treino && lid2.x < m.camera) m.camera = Math.max(0, lid2.x - 200);
    }
    m.corredores.forEach(function (r) {
      if (!r.chegou && r.caido <= 0 && r.x < m.camera + 30) { r.x = m.camera + 30; }
    });

    // Fim da rodada
    if (!m.treino) {
      var todos = m.corredores.length && m.corredores.every(function (r) { return r.chegou; });
      var esgotou = m.primeiroEm !== null && m.t - m.primeiroEm >= C.FALTA_DEPOIS;
      if (todos || esgotou || m.t >= C.TEMPO_MAX) terminar(m);
    }
  }

  function terminar(m) {
    if (m.fim) return;
    m.fim = true;
    // Quem não chegou é ordenado por distância.
    var resto = m.corredores.filter(function (r) { return !r.chegou; }).sort(function (a, b) { return b.x - a.x; });
    resto.forEach(function (r) { r.lugar = m.chegada.length + 1; m.chegada.push(r.id); r.naoChegou = true; });
    m.pontos = {};
    m.corredores.forEach(function (r) {
      var base = r.naoChegou ? 0 : (C.PONTOS_CHEGADA[r.lugar - 1] || 1);
      m.pontos[r.id] = { chegada: base, cristais: r.cristais * C.CRISTAL, total: base + r.cristais * C.CRISTAL, lugar: r.lugar };
    });
    ev(m, { tipo: 'fim' });
  }
  function faltaParaFechar(m) { return m.primeiroEm === null ? null : Math.max(0, C.FALTA_DEPOIS - (m.t - m.primeiroEm)); }

  /* Classificação da partida: pontos, depois vitórias (1º lugares), depois cristais. */
  function classificar(lista) {
    return lista.slice().sort(function (a, b) { return (b.pontos - a.pontos) || (b.vitorias - a.vitorias) || (b.cristais - a.cristais) || (a.ordem - b.ordem); });
  }

  var Mundo = {
    C: C, MUNDOS: MUNDOS, NOME_PODER: NOME_PODER, novaRodada: novaRodada, montarPista: montarPista, adicionar: adicionar, remover: remover,
    corredor: corredor, passo: passo, tirarEventos: tirarEventos, posicoes: posicoes, lider: lider, noAr: noAr,
    terminar: terminar, faltaParaFechar: faltaParaFechar, classificar: classificar, perigoPerto: perigoPerto, gerador: gerador
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Mundo;
  raiz.Mundo = Mundo;
})(typeof window !== 'undefined' ? window : globalThis);
