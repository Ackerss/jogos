/* Arena Escorregadia — física e regras puras (sem tela, sem rede).
   Um lago de gelo redondo que encolhe. Bolinhas deslizam, batem e caem na água.
   Quem cai vira fantasminha e pode soprar os outros para fora.
   Funciona no navegador (window.Fisica) e no Node (testes). */
(function (raiz) {
  'use strict';

  var C = {
    RAIO_INICIAL: 10,          // raio do lago no começo (unidades do mundo)
    RAIO_BOLA: 0.85,
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
    TREINO_VOLTA: 1.4          // no treino (sala de espera), quem cai volta depois disso
  };

  /* Sorteio com semente (as rodadas dos testes se repetem iguais). */
  function sorteio(semente) {
    var s = (semente >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  function novaBola(j, x, y) {
    return {
      id: j.id, cor: j.cor, x: x, y: y, vx: 0, vy: 0,
      estado: 'gelo',            // gelo | caindo | fantasma
      caiuEm: 0, trancoAte: -1, recarga: 0, olhoX: -x, olhoY: -y,
      ultimoToque: null, tempoToque: -99, voltaEm: 0
    };
  }

  /* Começa uma rodada. jogadores = [{id, cor}]. treino = sala de espera (sem quebra e sem fim). */
  function novaRodada(jogadores, opcoes) {
    opcoes = opcoes || {};
    var rnd = opcoes.aleatorio || Math.random, n = jogadores.length;
    var giro = rnd() * Math.PI * 2, dist = C.RAIO_INICIAL * (n <= 2 ? 0.5 : 0.62);
    var bolas = jogadores.map(function (j, i) {
      var a = giro + (i / Math.max(1, n)) * Math.PI * 2;
      var b = novaBola(j, Math.cos(a) * dist, Math.sin(a) * dist);
      var d = Math.hypot(b.x, b.y) || 1; b.olhoX = -b.x / d; b.olhoY = -b.y / d;
      return b;
    });
    return {
      t: 0, raio: C.RAIO_INICIAL, raioAntes: C.RAIO_INICIAL, raioAlvo: C.RAIO_INICIAL,
      quebras: 0, quebraIni: -1, subita: false, treino: !!opcoes.treino,
      bolas: bolas, eventos: [], fim: false, vencedores: [], pontos: {}, derrubadas: {}, quedas: [],
      aleatorio: rnd
    };
  }

  function bolaDe(m, id) { for (var i = 0; i < m.bolas.length; i++) if (m.bolas[i].id === id) return m.bolas[i]; return null; }
  function naArena(m) { return m.bolas.filter(function (b) { return b.estado === 'gelo'; }); }

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

  function adicionarBola(m, j) {
    if (bolaDe(m, j.id)) return bolaDe(m, j.id);
    var a = m.aleatorio() * Math.PI * 2, d = m.raio * 0.3 * m.aleatorio();
    var b = novaBola(j, Math.cos(a) * d, Math.sin(a) * d);
    m.bolas.push(b); return b;
  }
  function removerBola(m, id) { m.bolas = m.bolas.filter(function (b) { return b.id !== id; }); }

  function marcarToque(b, por, t) { if (por && por !== b.id) { b.ultimoToque = por; b.tempoToque = t; } }

  /* Avança o mundo dt segundos. entradas[id] = {x, y (−1 a 1), tranco: true quando apertou agora}. */
  function passo(m, dt, entradas) {
    entradas = entradas || {};
    m.t += dt;
    var t = m.t, r = C.RAIO_BOLA, i, j, b, e;

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

    /* 2. Movimento de quem está no gelo e dos fantasmas */
    for (i = 0; i < m.bolas.length; i++) {
      b = m.bolas[i]; e = entradas[b.id] || {};
      var ex = +e.x || 0, ey = +e.y || 0, mag = Math.hypot(ex, ey);
      if (mag > 1) { ex /= mag; ey /= mag; mag = 1; }
      if (b.recarga > 0) b.recarga = Math.max(0, b.recarga - dt);

      if (b.estado === 'gelo') {
        if (mag > 0.15) { b.olhoX = ex / mag; b.olhoY = ey / mag; }
        if (e.tranco && b.recarga <= 0) {
          var dx = ex, dy = ey;
          if (mag < 0.2) { var vv = Math.hypot(b.vx, b.vy); if (vv > 0.5) { dx = b.vx / vv; dy = b.vy / vv; } else { dx = b.olhoX; dy = b.olhoY; } }
          else { dx /= mag; dy /= mag; }
          b.vx = b.vx * 0.35 + dx * C.TRANCO_VEL; b.vy = b.vy * 0.35 + dy * C.TRANCO_VEL;
          b.olhoX = dx; b.olhoY = dy;
          b.trancoAte = t + C.TRANCO_DURACAO; b.recarga = C.TRANCO_RECARGA;
          m.eventos.push({ tipo: 'tranco', id: b.id, x: b.x, y: b.y });
        }
        // Acelera na direção do joystick, sem passar da velocidade máxima "de pé".
        var nvx = b.vx + ex * C.ACEL * dt, nvy = b.vy + ey * C.ACEL * dt;
        var v0 = Math.hypot(b.vx, b.vy), v1 = Math.hypot(nvx, nvy);
        if (v1 > C.VMAX && v1 > v0) { var lim = Math.max(v0, C.VMAX) / v1; nvx *= lim; nvy *= lim; }
        b.vx = nvx; b.vy = nvy;
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
            var f = C.SOPRO_FORCA * (1 - 0.6 * sd / C.SOPRO_RAIO);
            o.vx += sx / sd * f; o.vy += sy / sd * f;
            marcarToque(o, b.id, t);
          }
        }
      }
      // Atrito do gelo (pouco: escorrega!). Quem está caindo escorrega mais devagar.
      var atr = b.estado === 'caindo' ? 3 : b.estado === 'fantasma' ? 0 : C.ATRITO;
      if (atr) { var q = Math.exp(-atr * dt); b.vx *= q; b.vy *= q; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.estado === 'fantasma') {
        var fd = Math.hypot(b.x, b.y), fl = C.RAIO_INICIAL + 1.5;
        if (fd > fl) { b.x *= fl / fd; b.y *= fl / fd; }
      }
    }

    /* 3. Batidas entre bolinhas no gelo */
    for (i = 0; i < m.bolas.length; i++) {
      var a = m.bolas[i]; if (a.estado !== 'gelo') continue;
      for (j = i + 1; j < m.bolas.length; j++) {
        b = m.bolas[j]; if (b.estado !== 'gelo') continue;
        var nx = b.x - a.x, ny = b.y - a.y, d = Math.hypot(nx, ny);
        if (d >= 2 * r) continue;
        if (d < 1e-6) { nx = 1; ny = 0; d = 1e-6; } else { nx /= d; ny /= d; }
        var ma = t < a.trancoAte ? C.TRANCO_MASSA : 1, mb = t < b.trancoAte ? C.TRANCO_MASSA : 1;
        var sobra = 2 * r - d, ia = 1 / ma, ib = 1 / mb, soma = ia + ib;
        a.x -= nx * sobra * ia / soma; a.y -= ny * sobra * ia / soma;
        b.x += nx * sobra * ib / soma; b.y += ny * sobra * ib / soma;
        var vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (vn <= 0) continue;
        var imp = (1 + C.RESTITUICAO) * vn / soma;
        // Empurrão extra: deixa a batida mais "gostosa" (quem vem com mais força empurra mais).
        var extra = Math.min(C.EMPURRAO_EXTRA, vn * 0.45);
        a.vx -= nx * (imp * ia + extra * ia / soma); a.vy -= ny * (imp * ia + extra * ia / soma);
        b.vx += nx * (imp * ib + extra * ib / soma); b.vy += ny * (imp * ib + extra * ib / soma);
        marcarToque(a, b.id, t); marcarToque(b, a.id, t);
        if (vn > 1.2) m.eventos.push({ tipo: 'batida', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, forca: vn, a: a.id, b: b.id });
      }
    }

    /* 4. Quem saiu do gelo cai na água */
    for (i = 0; i < m.bolas.length; i++) {
      b = m.bolas[i];
      if (b.estado === 'gelo' && Math.hypot(b.x, b.y) > m.raio) {
        b.estado = 'caindo'; b.caiuEm = t;
        var por = b.ultimoToque && t - b.tempoToque <= C.CREDITO_TEMPO ? b.ultimoToque : null;
        m.eventos.push({ tipo: 'queda', id: b.id, x: b.x, y: b.y, por: por });
        if (!m.treino && !m.fim) {
          m.quedas.push({ id: b.id, t: t });
          if (por && bolaDe(m, por)) {
            m.pontos[por] = (m.pontos[por] || 0) + C.PONTOS_DERRUBADA;
            m.derrubadas[por] = (m.derrubadas[por] || 0) + 1;
          }
        }
      } else if (b.estado === 'caindo' && t - b.caiuEm >= C.QUEDA_DURACAO) {
        if (m.treino) { b.estado = 'espera'; b.voltaEm = t + C.TREINO_VOLTA - C.QUEDA_DURACAO; b.vx = b.vy = 0; }
        else {
          b.estado = 'fantasma'; b.vx = b.vy = 0; b.recarga = 1;
          var gd = Math.hypot(b.x, b.y), gl = C.RAIO_INICIAL + 1; if (gd > gl) { b.x *= gl / gd; b.y *= gl / gd; }
          m.eventos.push({ tipo: 'fantasma', id: b.id });
        }
      } else if (b.estado === 'espera' && t >= b.voltaEm) {
        b.estado = 'gelo'; b.x = (m.aleatorio() - 0.5) * 2; b.y = (m.aleatorio() - 0.5) * 2; b.vx = b.vy = 0;
        b.ultimoToque = null; b.recarga = 0;
        m.eventos.push({ tipo: 'volta', id: b.id });
      }
    }

    /* 5. Fim da rodada: sobrou 1 (ou nenhum) no gelo */
    if (!m.treino && !m.fim && m.bolas.length >= 2) {
      var vivos = naArena(m);
      if (vivos.length <= 1 || t >= C.LIMITE_RODADA) {
        m.fim = true;
        if (vivos.length >= 1) m.vencedores = vivos.map(function (x) { return x.id; });
        else {
          // Caíram juntos: divide a vitória entre os últimos que caíram (no mesmo instante).
          var ult = m.quedas.length ? m.quedas[m.quedas.length - 1].t : t;
          m.vencedores = m.quedas.filter(function (q) { return ult - q.t < 0.1; }).map(function (q) { return q.id; });
        }
        m.vencedores.forEach(function (id) { m.pontos[id] = (m.pontos[id] || 0) + C.PONTOS_VENCEDOR; });
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

  var Fisica = {
    C: C, sorteio: sorteio, novaRodada: novaRodada, passo: passo, tirarEventos: tirarEventos,
    proximaQuebra: proximaQuebra, raioDepois: raioDepois, naArena: naArena, bolaDe: bolaDe,
    adicionarBola: adicionarBola, removerBola: removerBola, classificar: classificar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Fisica;
  else raiz.Fisica = Fisica;
})(typeof window !== 'undefined' ? window : this);
