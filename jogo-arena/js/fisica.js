/* Arena Escorregadia — física e regras puras (sem tela, sem rede).
   Um lago de gelo redondo que encolhe. Bichinhos-bolinha deslizam, batem e caem na água.
   Quem cai vira fantasminha e pode soprar os outros para fora.
   v0.2: 4 arenas (Clássica, Pinball, Ventania, Gelo Fino), itens no gelo e modo criança (boia).
   Funciona no navegador (window.Fisica) e no Node (testes). */
(function (raiz) {
  'use strict';

  var C = {
    RAIO_INICIAL: 10,          // raio do lago no começo (unidades do mundo)
    RAIO_BOLA: 0.95,
    ETAPAS: [10, 8.2, 6.5],    // raio depois de cada quebra
    INTERVALO_QUEBRA: 15,      // segundos entre quebras da borda
    AVISO_QUEBRA: 3,           // segundos de aviso (borda piscando) antes de quebrar
    DURACAO_QUEBRA: 0.8,       // a borda cai em 0,8 s
    MORTE_SUBITA: 45,          // depois disso o gelo encolhe sem parar
    ENCOLHE_SUBITA: 0.28,      // unidades por segundo na morte súbita
    RAIO_MINIMO: 2.2,
    LIMITE_RODADA: 80,         // segurança: a rodada nunca passa disso
    ACEL: 17, VMAX: 6.5, ATRITO: 0.7,
    TRANCO_VEL: 10.5, TRANCO_RECARGA: 2.2, TRANCO_DURACAO: 0.3, TRANCO_MASSA: 2.4,
    RESTITUICAO: 0.9, EMPURRAO_EXTRA: 2.4,
    FANT_VEL: 7.5, SOPRO_RAIO: 3.3, SOPRO_FORCA: 7.5, SOPRO_RECARGA: 3.5,
    CREDITO_TEMPO: 3,          // quem encostou nos últimos 3 s ganha a derrubada
    PONTOS_VENCEDOR: 3, PONTOS_DERRUBADA: 1,
    QUEDA_DURACAO: 0.75,
    TREINO_VOLTA: 1.4,         // no treino (sala de espera), quem cai volta depois disso
    TONTO: 0.7,                // segundos de "olhinho tonto" depois de uma batida forte

    /* Itens que aparecem no gelo */
    ITEM_PRIMEIRO: 5, ITEM_INTERVALO: 8, ITEM_VIDA: 10, ITEM_DURACAO: 7, ITEM_RAIO: 0.7,
    GIGANTE_ESCALA: 1.5, GIGANTE_MASSA: 2.4,
    TURBO_RECARGA: 0.6, TURBO_VMAX: 1.2,
    MOLA_EXTRA: 6,

    /* Modo criança: mais pesado e com boias (salva da queda) */
    FACIL_MASSA: 1.6, BOIAS_FACIL: 2, BOIA_VOLTA: 5,

    /* Arenas */
    PINO_RAIO: 0.8, PINO_DIST: 4.6, PINO_FORCA: 6,
    VENTO_PRIMEIRO: 6, VENTO_INTERVALO: 9, VENTO_AVISO: 1.6, VENTO_DURACAO: 3, VENTO_ACEL: 6,
    BURACO_PRIMEIRO: 5, BURACO_INTERVALO: 6, BURACO_AVISO: 1.8, BURACO_RAIO: 1.3, BURACO_MAX: 6
  };

  var ARENAS = ['classica', 'pinball', 'ventania', 'buracos'];
  var ITENS = ['gigante', 'turbo', 'mola'];

  /* Sorteio com semente (as rodadas dos testes se repetem iguais). */
  function sorteio(semente) {
    var s = (semente >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  function novaBola(j, x, y) {
    return {
      id: j.id, cor: j.cor, x: x, y: y, vx: 0, vy: 0,
      estado: 'gelo',            // gelo | caindo | fantasma | espera (treino)
      caiuEm: 0, trancoAte: -1, recarga: 0, olhoX: -x, olhoY: -y,
      ultimoToque: null, tempoToque: -99, voltaEm: 0,
      facil: !!j.facil, boias: j.facil ? C.BOIAS_FACIL : 0, boiaEm: -9,
      item: null, itemAte: 0, esc: 1, batidaEm: -9, tontoAte: -9, noBuraco: false, alvoX: 0, alvoY: 0
    };
  }

  /* Começa uma rodada. jogadores = [{id, cor, facil}].
     opcoes: treino (sala de espera: sem quebra e sem fim), arena, itens (true/false), aleatorio. */
  function novaRodada(jogadores, opcoes) {
    opcoes = opcoes || {};
    var rnd = opcoes.aleatorio || Math.random, n = jogadores.length;
    var giro = rnd() * Math.PI * 2, dist = C.RAIO_INICIAL * (n <= 2 ? 0.5 : 0.62);
    var arena = ARENAS.indexOf(opcoes.arena) >= 0 ? opcoes.arena : 'classica';
    if (arena === 'pinball') giro += Math.PI / 3; // começa entre os pinos
    var bolas = jogadores.map(function (j, i) {
      var a = giro + (i / Math.max(1, n)) * Math.PI * 2;
      var b = novaBola(j, Math.cos(a) * dist, Math.sin(a) * dist);
      var d = Math.hypot(b.x, b.y) || 1; b.olhoX = -b.x / d; b.olhoY = -b.y / d;
      return b;
    });
    var m = {
      t: 0, raio: C.RAIO_INICIAL, raioAntes: C.RAIO_INICIAL, raioAlvo: C.RAIO_INICIAL,
      quebras: 0, quebraIni: -1, subita: false, treino: !!opcoes.treino,
      bolas: bolas, eventos: [], fim: false, vencedores: [], pontos: {}, derrubadas: {}, quedas: [],
      aleatorio: rnd, arena: arena,
      usaItens: opcoes.itens !== false, itens: [], proxItem: C.ITEM_PRIMEIRO + rnd() * 2, nItem: 0,
      pinos: [], vento: { fase: 'calmo', dx: 1, dy: 0, k: 0, n: 0 }, buracos: [], proxBuraco: C.BURACO_PRIMEIRO
    };
    if (arena === 'pinball') {
      var g2 = rnd() * Math.PI * 2;
      for (var k = 0; k < 3; k++) {
        var ap = g2 + k * Math.PI * 2 / 3;
        m.pinos.push({ x: Math.cos(ap) * C.PINO_DIST, y: Math.sin(ap) * C.PINO_DIST, r: C.PINO_RAIO, vivo: true, batidaEm: -9, afundaEm: 0 });
      }
      m.pinos.push({ x: 0, y: 0, r: C.PINO_RAIO * 0.75, vivo: true, batidaEm: -9, afundaEm: 0 });
      // ninguém começa em cima de um pino
      bolas.forEach(function (b) { m.pinos.forEach(function (p) { var d = Math.hypot(b.x - p.x, b.y - p.y); if (d < p.r + C.RAIO_BOLA + 0.2) { var a2 = Math.atan2(b.y, b.x) + 0.45; var r2 = Math.hypot(b.x, b.y); b.x = Math.cos(a2) * r2; b.y = Math.sin(a2) * r2; } }); });
    }
    return m;
  }

  function bolaDe(m, id) { for (var i = 0; i < m.bolas.length; i++) if (m.bolas[i].id === id) return m.bolas[i]; return null; }
  function naArena(m) { return m.bolas.filter(function (b) { return b.estado === 'gelo'; }); }
  function raioBola(b) { return C.RAIO_BOLA * (b.esc || 1); }
  function temItem(b, tipo, t) { return b.item === tipo && t < b.itemAte; }
  function massa(b, t) {
    return (t < b.trancoAte ? C.TRANCO_MASSA : 1) * (temItem(b, 'gigante', t) ? C.GIGANTE_MASSA : 1) * (b.facil ? C.FACIL_MASSA : 1);
  }

  /* Segundos até a próxima quebra da borda (null se não haverá mais quebra com aviso). */
  function proximaQuebra(m) {
    if (m.treino || m.fim) return null;
    if (m.quebras < C.ETAPAS.length - 1) return (m.quebras + 1) * C.INTERVALO_QUEBRA - m.t;
    if (!m.subita) return C.MORTE_SUBITA - m.t;
    return null;
  }
  /* Raio que o gelo terá depois da próxima quebra (para desenhar o aviso). */
  function raioDepois(m) {
    if (m.quebras < C.ETAPAS.length - 1) return C.ETAPAS[m.quebras + 1];
    return m.raio - 1.2;
  }
  /* Buraco aberto (ou prestes a abrir) neste ponto? margem > 0 = considera uma folga. */
  function buracoEm(m, x, y, margem, contarAviso) {
    for (var i = 0; i < m.buracos.length; i++) {
      var h = m.buracos[i];
      if (!contarAviso && m.t < h.abre) continue;
      if (Math.hypot(x - h.x, y - h.y) < h.r + (margem || 0)) return h;
    }
    return null;
  }

  function adicionarBola(m, j) {
    var ja = bolaDe(m, j.id);
    if (ja) return ja;
    var a = m.aleatorio() * Math.PI * 2, d = m.raio * 0.3 * m.aleatorio();
    var b = novaBola(j, Math.cos(a) * d, Math.sin(a) * d);
    m.bolas.push(b); return b;
  }
  function removerBola(m, id) { m.bolas = m.bolas.filter(function (b) { return b.id !== id; }); }
  /* Liga/desliga o modo criança de uma bolinha (sala de espera). */
  function mudarFacil(b, facil) {
    if (!!b.facil === !!facil) return;
    b.facil = !!facil; b.boias = facil ? C.BOIAS_FACIL : 0;
  }

  function marcarToque(b, por, t) { if (por && por !== b.id) { b.ultimoToque = por; b.tempoToque = t; } }

  /* ---------- Itens ---------- */
  function soltarItem(m) {
    var rnd = m.aleatorio, maxR = Math.max(1, m.raio * 0.6), x = 0, y = 0;
    for (var k = 0; k < 8; k++) {
      var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * maxR;
      x = Math.cos(a) * d; y = Math.sin(a) * d;
      var livre = !buracoEm(m, x, y, 1, true) && m.bolas.every(function (b) { return b.estado !== 'gelo' || Math.hypot(b.x - x, b.y - y) > 2; }) &&
        m.pinos.every(function (p) { return !p.vivo || Math.hypot(p.x - x, p.y - y) > p.r + 1.2; });
      if (livre) break;
    }
    // sorteia um tipo diferente do último
    var ti = Math.floor(rnd() * ITENS.length);
    if (ti === m.ultimoTipo) ti = (ti + 1 + Math.floor(rnd() * (ITENS.length - 1))) % ITENS.length;
    var tipo = ITENS[ti];
    m.nItem++; m.ultimoTipo = ti;
    var it = { id: m.nItem, tipo: tipo, x: x, y: y, nasceu: m.t };
    m.itens.push(it);
    m.eventos.push({ tipo: 'item', item: tipo, x: x, y: y });
  }
  function atualizarItens(m, t) {
    if (!m.usaItens || m.fim) return;
    var max = m.bolas.length >= 5 ? 2 : 1;
    if (t >= m.proxItem) {
      if (m.itens.length < max && m.raio > 3) soltarItem(m);
      m.proxItem = t + C.ITEM_INTERVALO * (m.treino ? 1.4 : 1) + m.aleatorio() * 3;
    }
    for (var i = m.itens.length - 1; i >= 0; i--) {
      var it = m.itens[i];
      if (t - it.nasceu > C.ITEM_VIDA || Math.hypot(it.x, it.y) > m.raio - 0.3 || buracoEm(m, it.x, it.y, 0, false)) {
        m.itens.splice(i, 1); m.eventos.push({ tipo: 'itemSome', x: it.x, y: it.y }); continue;
      }
      for (var j = 0; j < m.bolas.length; j++) {
        var b = m.bolas[j];
        if (b.estado !== 'gelo') continue;
        if (Math.hypot(b.x - it.x, b.y - it.y) < raioBola(b) + C.ITEM_RAIO * 0.8) {
          b.item = it.tipo; b.itemAte = t + C.ITEM_DURACAO;
          if (it.tipo === 'turbo') b.recarga = 0;
          m.itens.splice(i, 1);
          m.eventos.push({ tipo: 'pegou', id: b.id, item: it.tipo, x: it.x, y: it.y });
          break;
        }
      }
    }
  }

  /* ---------- Arenas ---------- */
  function atualizarVento(m, t) {
    var v = m.vento, ciclo = C.VENTO_INTERVALO, t0 = C.VENTO_PRIMEIRO;
    if (m.arena !== 'ventania' || m.treino || m.fim) { v.fase = 'calmo'; v.k = 0; return; }
    var n = Math.floor((t - t0) / ciclo), dentro = t - t0 - n * ciclo;
    if (t < t0) { v.fase = 'calmo'; v.k = 0; return; }
    if (n !== v.n - 1) { // começou um ciclo novo: sorteia a direção
      v.n = n + 1;
      var a = m.aleatorio() * Math.PI * 2; v.dx = Math.cos(a); v.dy = Math.sin(a);
    }
    var fase = dentro < C.VENTO_AVISO ? 'aviso' : dentro < C.VENTO_AVISO + C.VENTO_DURACAO ? 'sopra' : 'calmo';
    if (fase !== v.fase) {
      v.fase = fase;
      if (fase === 'aviso') m.eventos.push({ tipo: 'ventoAviso', dx: v.dx, dy: v.dy });
      if (fase === 'sopra') m.eventos.push({ tipo: 'vento', dx: v.dx, dy: v.dy });
    }
    if (fase === 'sopra') { var k = (dentro - C.VENTO_AVISO) / C.VENTO_DURACAO; v.k = Math.min(1, k * 5, (1 - k) * 5); }
    else v.k = 0;
  }
  function atualizarBuracos(m, t) {
    if (m.arena !== 'buracos' || m.treino || m.fim) return;
    if (t >= m.proxBuraco && m.buracos.length < C.BURACO_MAX && m.raio > 3.5) {
      var rnd = m.aleatorio, x = 0, y = 0, ok = false;
      for (var k = 0; k < 12 && !ok; k++) {
        var a = rnd() * Math.PI * 2, d = 1.2 + rnd() * Math.max(0.5, m.raio * 0.8 - C.BURACO_RAIO - 1.2);
        x = Math.cos(a) * d; y = Math.sin(a) * d;
        ok = m.buracos.every(function (h) { return Math.hypot(h.x - x, h.y - y) > h.r + C.BURACO_RAIO + 1.4; }) &&
          Math.hypot(x, y) + C.BURACO_RAIO < m.raio - 0.8;
      }
      if (ok) {
        m.buracos.push({ x: x, y: y, r: C.BURACO_RAIO, nasce: t, abre: t + C.BURACO_AVISO, aberto: false });
        m.eventos.push({ tipo: 'buracoAviso', x: x, y: y });
      }
      m.proxBuraco = t + C.BURACO_INTERVALO;
    }
    m.buracos.forEach(function (h) { if (!h.aberto && t >= h.abre) { h.aberto = true; m.eventos.push({ tipo: 'buraco', x: h.x, y: h.y }); } });
  }

  /* Avança o mundo dt segundos. entradas[id] = {x, y (−1 a 1), tranco: true quando apertou agora}. */
  function passo(m, dt, entradas) {
    entradas = entradas || {};
    m.t += dt;
    var t = m.t, i, j, b, e;

    /* 1. O gelo encolhe */
    if (!m.treino) {
      var etapa = Math.floor(t / C.INTERVALO_QUEBRA);
      if (etapa > m.quebras && m.quebras < C.ETAPAS.length - 1 && !m.fim) {
        m.quebras++; m.raioAntes = m.raio; m.raioAlvo = C.ETAPAS[m.quebras]; m.quebraIni = t;
        m.eventos.push({ tipo: 'quebra', de: m.raioAntes, para: m.raioAlvo });
      }
      if (m.quebraIni >= 0) {
        var k = Math.min(1, (t - m.quebraIni) / C.DURACAO_QUEBRA);
        m.raio = m.raioAntes + (m.raioAlvo - m.raioAntes) * (1 - Math.pow(1 - k, 2));
        if (k >= 1) m.quebraIni = -1;
      }
      if (t >= C.MORTE_SUBITA && !m.fim) {
        if (!m.subita) { m.subita = true; m.eventos.push({ tipo: 'subita' }); }
        m.raio = Math.max(C.RAIO_MINIMO, m.raio - C.ENCOLHE_SUBITA * dt);
      }
    }
    atualizarVento(m, t);
    atualizarBuracos(m, t);
    m.pinos.forEach(function (p) {
      if (p.vivo && Math.hypot(p.x, p.y) + p.r * 0.3 > m.raio) { p.vivo = false; p.afundaEm = t; m.eventos.push({ tipo: 'pinoAfunda', x: p.x, y: p.y }); }
    });

    /* 2. Movimento de quem está no gelo e dos fantasmas */
    for (i = 0; i < m.bolas.length; i++) {
      b = m.bolas[i]; e = entradas[b.id] || {};
      var ex = +e.x || 0, ey = +e.y || 0, mag = Math.hypot(ex, ey);
      if (mag > 1) { ex /= mag; ey /= mag; mag = 1; }
      if (b.recarga > 0) b.recarga = Math.max(0, b.recarga - dt);
      if (b.item && t >= b.itemAte) { m.eventos.push({ tipo: 'itemAcabou', id: b.id, item: b.item }); b.item = null; }
      // tamanho (o gigante cresce e encolhe devagar)
      var alvoEsc = temItem(b, 'gigante', t) && b.estado === 'gelo' ? C.GIGANTE_ESCALA : 1;
      b.esc += (alvoEsc - b.esc) * Math.min(1, dt * 5);

      if (b.estado === 'gelo') {
        if (mag > 0.15) { b.olhoX = ex / mag; b.olhoY = ey / mag; }
        if (e.tranco && b.recarga <= 0) {
          var dx = ex, dy = ey;
          if (mag < 0.2) { var vv = Math.hypot(b.vx, b.vy); if (vv > 0.5) { dx = b.vx / vv; dy = b.vy / vv; } else { dx = b.olhoX; dy = b.olhoY; } }
          else { dx /= mag; dy /= mag; }
          b.vx = b.vx * 0.35 + dx * C.TRANCO_VEL; b.vy = b.vy * 0.35 + dy * C.TRANCO_VEL;
          b.olhoX = dx; b.olhoY = dy;
          b.trancoAte = t + C.TRANCO_DURACAO; b.recarga = temItem(b, 'turbo', t) ? C.TURBO_RECARGA : C.TRANCO_RECARGA;
          m.eventos.push({ tipo: 'tranco', id: b.id, x: b.x, y: b.y });
        }
        // Acelera na direção do joystick, sem passar da velocidade máxima "de pé".
        var vmax = C.VMAX * (temItem(b, 'turbo', t) ? C.TURBO_VMAX : 1);
        var nvx = b.vx + ex * C.ACEL * dt, nvy = b.vy + ey * C.ACEL * dt;
        var v0 = Math.hypot(b.vx, b.vy), v1 = Math.hypot(nvx, nvy);
        if (v1 > vmax && v1 > v0) { var lim = Math.max(v0, vmax) / v1; nvx *= lim; nvy *= lim; }
        b.vx = nvx; b.vy = nvy;
        // Vento (arena Ventania): empurra todo mundo para o mesmo lado. Quem é pesado sente menos.
        if (m.vento.k > 0) { var fv = C.VENTO_ACEL * m.vento.k * dt / Math.sqrt(massa(b, t)); b.vx += m.vento.dx * fv; b.vy += m.vento.dy * fv; }
      } else if (b.estado === 'fantasma') {
        // O fantasma voa livre (sem deslizar muito) sobre o lago.
        b.vx += (ex * C.FANT_VEL - b.vx) * Math.min(1, dt * 6);
        b.vy += (ey * C.FANT_VEL - b.vy) * Math.min(1, dt * 6);
        if (mag > 0.15) { b.olhoX = ex / mag; b.olhoY = ey / mag; }
        if (e.tranco && b.recarga <= 0) {
          b.recarga = C.SOPRO_RECARGA;
          m.eventos.push({ tipo: 'sopro', id: b.id, x: b.x, y: b.y });
          for (j = 0; j < m.bolas.length; j++) {
            var o = m.bolas[j]; if (o.estado !== 'gelo') continue;
            var sx = o.x - b.x, sy = o.y - b.y, sd = Math.hypot(sx, sy);
            if (sd >= C.SOPRO_RAIO) continue;
            if (sd < 0.01) { sx = 1; sy = 0; sd = 1; }
            var f = C.SOPRO_FORCA * (1 - 0.6 * sd / C.SOPRO_RAIO) / Math.sqrt(massa(o, t));
            o.vx += sx / sd * f; o.vy += sy / sd * f;
            marcarToque(o, b.id, t);
          }
        }
      }
      // Atrito do gelo (pouco: escorrega!). Quem está caindo escorrega mais devagar.
      var atr = b.estado === 'caindo' ? (b.noBuraco ? 8 : 3) : b.estado === 'fantasma' ? 0 : C.ATRITO;
      if (atr) { var q = Math.exp(-atr * dt); b.vx *= q; b.vy *= q; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.estado === 'fantasma') {
        // O fantasma fica perto do gelo (a câmera aproxima quando o gelo encolhe).
        var fd = Math.hypot(b.x, b.y), fl = Math.min(C.RAIO_INICIAL + 1.5, m.raio + 1.6);
        if (fd > fl) { b.x *= fl / fd; b.y *= fl / fd; }
      }
    }

    /* 3. Batidas entre bolinhas no gelo */
    for (i = 0; i < m.bolas.length; i++) {
      var a = m.bolas[i]; if (a.estado !== 'gelo') continue;
      var ra = raioBola(a);
      for (j = i + 1; j < m.bolas.length; j++) {
        b = m.bolas[j]; if (b.estado !== 'gelo') continue;
        var soma2 = ra + raioBola(b);
        var nx = b.x - a.x, ny = b.y - a.y, d = Math.hypot(nx, ny);
        if (d >= soma2) continue;
        if (d < 1e-6) { nx = 1; ny = 0; d = 1e-6; } else { nx /= d; ny /= d; }
        var ma = massa(a, t), mb = massa(b, t);
        var sobra = soma2 - d, ia = 1 / ma, ib = 1 / mb, soma = ia + ib;
        a.x -= nx * sobra * ia / soma; a.y -= ny * sobra * ia / soma;
        b.x += nx * sobra * ib / soma; b.y += ny * sobra * ib / soma;
        var vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn <= 0) continue;
        var vemA = a.vx * nx + a.vy * ny, vemB = -(b.vx * nx + b.vy * ny); // quem veio com mais vontade
        var imp = (1 + C.RESTITUICAO) * vn / soma;
        // Empurrão extra: deixa a batida mais "gostosa" (quem vem com mais força empurra mais).
        var extra = Math.min(C.EMPURRAO_EXTRA, vn * 0.45);
        a.vx -= nx * (imp * ia + extra * ia / soma); a.vy -= ny * (imp * ia + extra * ia / soma);
        b.vx += nx * (imp * ib + extra * ib / soma); b.vy += ny * (imp * ib + extra * ib / soma);
        // Mola: quem encosta em quem tem a mola é arremessado.
        var mola = false;
        if (temItem(a, 'mola', t)) { var fm = C.MOLA_EXTRA / Math.sqrt(mb); b.vx += nx * fm; b.vy += ny * fm; mola = true; marcarToque(b, a.id, t); }
        if (temItem(b, 'mola', t)) { var fm2 = C.MOLA_EXTRA / Math.sqrt(ma); a.vx -= nx * fm2; a.vy -= ny * fm2; mola = true; }
        marcarToque(a, b.id, t); marcarToque(b, a.id, t);
        a.batidaEm = b.batidaEm = t;
        if (vn > 6) { if (vemA >= vemB) b.tontoAte = t + C.TONTO; else a.tontoAte = t + C.TONTO; }
        if (vn > 1.2 || mola) m.eventos.push({ tipo: 'batida', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, forca: vn + (mola ? 5 : 0), a: a.id, b: b.id, mola: mola });
      }
      /* Pinos do Pinball: rebatem forte */
      for (j = 0; j < m.pinos.length; j++) {
        var p = m.pinos[j]; if (!p.vivo) continue;
        var px = a.x - p.x, py = a.y - p.y, pd = Math.hypot(px, py), lim2 = ra + p.r;
        if (pd >= lim2) continue;
        if (pd < 1e-6) { px = 1; py = 0; pd = 1e-6; } else { px /= pd; py /= pd; }
        a.x = p.x + px * lim2; a.y = p.y + py * lim2;
        var pv = a.vx * px + a.vy * py;
        if (pv < 0) { a.vx -= 2 * pv * px; a.vy -= 2 * pv * py; }
        a.vx += px * C.PINO_FORCA / Math.sqrt(massa(a, t)); a.vy += py * C.PINO_FORCA / Math.sqrt(massa(a, t));
        p.batidaEm = t; a.batidaEm = t;
        m.eventos.push({ tipo: 'pino', x: p.x + px * p.r, y: p.y + py * p.r, id: a.id });
      }
    }

    /* 4. Quem saiu do gelo (ou pisou num buraco) cai na água. A boia do modo criança salva. */
    for (i = 0; i < m.bolas.length; i++) {
      b = m.bolas[i];
      var dc = Math.hypot(b.x, b.y), buraco = b.estado === 'gelo' ? buracoEm(m, b.x, b.y, 0, false) : null;
      if (b.estado === 'gelo' && (dc > m.raio || buraco)) {
        if (b.boias > 0 && t - b.boiaEm > 0.4) {
          // Boia: quica de volta para o gelo.
          b.boias--; b.boiaEm = t;
          var ux, uy;
          if (buraco) { ux = b.x - buraco.x; uy = b.y - buraco.y; var ud = Math.hypot(ux, uy) || 1; ux /= ud; uy /= ud; b.x = buraco.x + ux * (buraco.r + 0.15); b.y = buraco.y + uy * (buraco.r + 0.15); }
          else { ux = -b.x / (dc || 1); uy = -b.y / (dc || 1); b.x = -ux * (m.raio - 0.15); b.y = -uy * (m.raio - 0.15); }
          var vo = b.vx * ux + b.vy * uy; if (vo < 0) { b.vx -= vo * ux * 1.6; b.vy -= vo * uy * 1.6; }
          b.vx += ux * C.BOIA_VOLTA; b.vy += uy * C.BOIA_VOLTA;
          m.eventos.push({ tipo: 'boia', id: b.id, x: b.x, y: b.y, resta: b.boias });
          continue;
        }
        b.estado = 'caindo'; b.caiuEm = t; b.noBuraco = !!buraco && dc <= m.raio;
        if (b.noBuraco) { b.vx *= 0.3; b.vy *= 0.3; b.x += (buraco.x - b.x) * 0.5; b.y += (buraco.y - b.y) * 0.5; }
        var por = b.ultimoToque && t - b.tempoToque <= C.CREDITO_TEMPO ? b.ultimoToque : null;
        m.eventos.push({ tipo: 'queda', id: b.id, x: b.x, y: b.y, por: por, buraco: b.noBuraco });
        if (!m.treino && !m.fim) {
          m.quedas.push({ id: b.id, t: t });
          if (por && bolaDe(m, por)) {
            m.pontos[por] = (m.pontos[por] || 0) + C.PONTOS_DERRUBADA;
            m.derrubadas[por] = (m.derrubadas[por] || 0) + 1;
          }
        }
      } else if (b.estado === 'caindo' && t - b.caiuEm >= C.QUEDA_DURACAO) {
        b.item = null; b.esc = 1; b.noBuraco = false;
        if (m.treino) { b.estado = 'espera'; b.voltaEm = t + C.TREINO_VOLTA - C.QUEDA_DURACAO; b.vx = b.vy = 0; }
        else {
          b.estado = 'fantasma'; b.vx = b.vy = 0; b.recarga = 1;
          var gd = Math.hypot(b.x, b.y), gl = Math.min(C.RAIO_INICIAL + 1, m.raio + 1.2); if (gd > gl) { b.x *= gl / gd; b.y *= gl / gd; }
          m.eventos.push({ tipo: 'fantasma', id: b.id });
        }
      } else if (b.estado === 'espera' && t >= b.voltaEm) {
        b.estado = 'gelo'; b.x = (m.aleatorio() - 0.5) * 2; b.y = (m.aleatorio() - 0.5) * 2; b.vx = b.vy = 0;
        b.ultimoToque = null; b.recarga = 0; if (b.facil) b.boias = C.BOIAS_FACIL;
        m.eventos.push({ tipo: 'volta', id: b.id });
      }
    }

    atualizarItens(m, t);

    /* 5. Fim da rodada: sobrou 1 (ou nenhum) no gelo */
    if (!m.treino && !m.fim && m.bolas.length >= 2) {
      var vivos = naArena(m);
      if (vivos.length <= 1 || t >= C.LIMITE_RODADA) {
        m.fim = true; m.fimEm = t;
        if (vivos.length >= 1) m.vencedores = vivos.map(function (x) { return x.id; });
        else {
          // Caíram juntos: divide a vitória entre os últimos que caíram (no mesmo instante).
          var ult = m.quedas.length ? m.quedas[m.quedas.length - 1].t : t;
          m.vencedores = m.quedas.filter(function (q) { return ult - q.t < 0.1; }).map(function (q) { return q.id; });
        }
        m.vencedores.forEach(function (id) { m.pontos[id] = (m.pontos[id] || 0) + C.PONTOS_VENCEDOR; });
        m.itens = [];
        m.eventos.push({ tipo: 'fim', vencedores: m.vencedores.slice() });
      }
    }
  }

  /* Pega e limpa os eventos (sons, partículas e textos da TV). */
  function tirarEventos(m) { var e = m.eventos; m.eventos = []; return e; }

  /* Classificação da partida: pontos, depois rodadas vencidas, depois derrubadas. */
  function classificar(jogadores) {
    return jogadores.slice().sort(function (a, b) {
      return (b.pontos - a.pontos) || (b.vitorias - a.vitorias) || (b.derrubadas - a.derrubadas) || (a.ordem - b.ordem);
    });
  }

  /* Ordem das arenas numa partida: a 1ª rodada é sempre a Clássica (para aprender),
     depois as outras sorteadas sem repetir seguido. */
  function ordemArenas(total, rnd) {
    rnd = rnd || Math.random;
    var lista = ['classica'], resto = [];
    while (lista.length < total) {
      if (!resto.length) {
        resto = ARENAS.slice(lista.length === 1 ? 1 : 0);
        for (var i = resto.length - 1; i > 0; i--) { var k = Math.floor(rnd() * (i + 1)), x = resto[i]; resto[i] = resto[k]; resto[k] = x; }
        if (resto[0] === lista[lista.length - 1]) resto.push(resto.shift());
      }
      lista.push(resto.shift());
    }
    return lista;
  }

  var Fisica = {
    C: C, ARENAS: ARENAS, ITENS: ITENS, sorteio: sorteio, novaRodada: novaRodada, passo: passo, tirarEventos: tirarEventos,
    proximaQuebra: proximaQuebra, raioDepois: raioDepois, naArena: naArena, bolaDe: bolaDe, buracoEm: buracoEm,
    adicionarBola: adicionarBola, removerBola: removerBola, mudarFacil: mudarFacil, classificar: classificar,
    raioBola: raioBola, temItem: temItem, massa: massa, ordemArenas: ordemArenas
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Fisica;
  else raiz.Fisica = Fisica;
})(typeof window !== 'undefined' ? window : this);
