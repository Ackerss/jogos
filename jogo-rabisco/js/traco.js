/* Rabisco sem Fio — desenhos: guardar, mandar pela rede, desenhar e refazer traço por traço.
   Um desenho é uma lista de traços {c: cor, t: tamanho, p: [x, y, x, y, ...]} num quadro de 500 × 500.
   Pela rede ele viaja como texto curto (2 letras por coordenada).
   Funciona no navegador (window.Traco) e no Node (testes). */
(function (raiz) {
  'use strict';
  var LADO = 500;
  var CORES = ['#22223a', '#ffffff', '#e63946', '#ff8c1a', '#ffd23f', '#3bb273', '#1f9bd7', '#6c4cf5', '#ff6fb5', '#8d5a3b', '#9aa3ad', '#f7c8a0'];
  var NOMES_CORES = ['preto', 'borracha', 'vermelho', 'laranja', 'amarelo', 'verde', 'azul', 'roxo', 'rosa', 'marrom', 'cinza', 'pele'];
  var TAMANHOS = [5, 11, 22, 44];
  var MAX_PONTOS = 9000;
  var B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var V = {}; for (var i = 0; i < B.length; i++) V[B.charAt(i)] = i;

  function lim(v) { v = Math.round(v); return v < 0 ? 0 : v > LADO ? LADO : v; }

  /* ---------- texto <-> traços ---------- */
  function codificar(tracos) {
    var partes = [];
    (tracos || []).forEach(function (t) {
      if (!t || !t.p || t.p.length < 2) return;
      var s = B.charAt(t.c % CORES.length) + B.charAt(t.t % TAMANHOS.length);
      for (var k = 0; k + 1 < t.p.length; k += 2) {
        var x = lim(t.p[k]), y = lim(t.p[k + 1]);
        s += B.charAt(x >> 6) + B.charAt(x & 63) + B.charAt(y >> 6) + B.charAt(y & 63);
      }
      partes.push(s);
    });
    return partes.join('.');
  }
  function decodificar(txt) {
    var out = [];
    if (typeof txt !== 'string' || !txt) return out;
    txt.split('.').forEach(function (s) {
      if (s.length < 6) return;
      var c = V[s.charAt(0)], t = V[s.charAt(1)];
      if (c === undefined || t === undefined || c >= CORES.length || t >= TAMANHOS.length) return;
      var p = [];
      for (var k = 2; k + 3 < s.length; k += 4) {
        var a = V[s.charAt(k)], b = V[s.charAt(k + 1)], d = V[s.charAt(k + 2)], e = V[s.charAt(k + 3)];
        if (a === undefined || b === undefined || d === undefined || e === undefined) return;
        p.push(Math.min(LADO, (a << 6) | b), Math.min(LADO, (d << 6) | e));
      }
      if (p.length >= 2) out.push({ c: c, t: t, p: p });
    });
    return out;
  }
  function contarPontos(tracos) { var n = 0; (tracos || []).forEach(function (t) { n += t.p.length / 2; }); return n; }
  function vazio(txt) { return !decodificar(txt).some(function (t) { return t.c !== 1; }); }

  /* ---------- desenhar num canvas ---------- */
  function preparar(ctx, w, h) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }
  function tracoInteiro(ctx, t, esc, ate) {
    var p = t.p, n = Math.min(p.length / 2, ate === undefined ? Infinity : ate);
    if (n <= 0) return;
    ctx.strokeStyle = ctx.fillStyle = CORES[t.c];
    ctx.lineWidth = TAMANHOS[t.t] * esc;
    if (n === 1) { ctx.beginPath(); ctx.arc(p[0] * esc, p[1] * esc, TAMANHOS[t.t] * esc / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.beginPath(); ctx.moveTo(p[0] * esc, p[1] * esc);
    for (var k = 1; k < n - 1; k++) {
      var mx = (p[k * 2] + p[k * 2 + 2]) / 2, my = (p[k * 2 + 1] + p[k * 2 + 3]) / 2;
      ctx.quadraticCurveTo(p[k * 2] * esc, p[k * 2 + 1] * esc, mx * esc, my * esc);
    }
    ctx.lineTo(p[(n - 1) * 2] * esc, p[(n - 1) * 2 + 1] * esc);
    ctx.stroke();
  }
  /* Desenha tudo (ou só os primeiros "ate" pontos) ocupando o canvas inteiro. */
  function desenhar(canvas, tracos, ate) {
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, esc = Math.min(w, h) / LADO;
    preparar(ctx, w, h);
    var resto = ate === undefined ? Infinity : ate;
    for (var i = 0; i < tracos.length && resto > 0; i++) {
      var n = tracos[i].p.length / 2;
      tracoInteiro(ctx, tracos[i], esc, Math.min(n, resto));
      resto -= n;
    }
  }
  /* Ajusta o tamanho real do canvas ao tamanho na tela (nítido em TV 4K e celular). */
  function ajustar(canvas, max) {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var lado = Math.max(50, Math.round(Math.min(r.width || 300, r.height || r.width || 300) * dpr));
    if (max) lado = Math.min(lado, max);
    if (canvas.width !== lado) { canvas.width = lado; canvas.height = lado; return true; }
    return false;
  }

  /* Refaz o desenho traço por traço em "duracao" ms (o momento das risadas na TV). Devolve uma função que cancela. */
  function animar(canvas, txtOuTracos, duracao, aoFim) {
    var tracos = typeof txtOuTracos === 'string' ? decodificar(txtOuTracos) : txtOuTracos;
    var total = contarPontos(tracos), inicio = 0, parado = false, id = 0;
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, esc = Math.min(w, h) / LADO;
    preparar(ctx, w, h);
    if (!total) { if (aoFim) setTimeout(aoFim, 300); return function () {}; }
    var feito = 0, ti = 0, pj = 0;
    function passo(agora) {
      if (parado) return;
      if (!inicio) inicio = agora;
      var f = Math.min(1, (agora - inicio) / duracao);
      var alvo = Math.round(total * (f < 1 ? 1 - Math.pow(1 - f, 1.35) : 1));
      // Desenha só os pedaços novos (leve até em TV).
      while (feito < alvo && ti < tracos.length) {
        var t = tracos[ti], p = t.p, n = p.length / 2;
        ctx.strokeStyle = ctx.fillStyle = CORES[t.c]; ctx.lineWidth = TAMANHOS[t.t] * esc;
        if (n === 1 || pj === 0) {
          ctx.beginPath(); ctx.arc(p[0] * esc, p[1] * esc, TAMANHOS[t.t] * esc / 2, 0, Math.PI * 2); ctx.fill();
          pj = 1; feito++;
          if (n === 1) { ti++; pj = 0; }
          continue;
        }
        var fim = Math.min(n, pj + (alvo - feito));
        ctx.beginPath(); ctx.moveTo(p[(pj - 1) * 2] * esc, p[(pj - 1) * 2 + 1] * esc);
        for (var k = pj; k < fim; k++) ctx.lineTo(p[k * 2] * esc, p[k * 2 + 1] * esc);
        ctx.stroke();
        feito += fim - pj; pj = fim;
        if (pj >= n) { ti++; pj = 0; }
      }
      if (f < 1) id = requestAnimationFrame(passo);
      else { desenhar(canvas, tracos); if (aoFim) aoFim(); }
    }
    id = requestAnimationFrame(passo);
    return function () { parado = true; cancelAnimationFrame(id); };
  }

  /* ---------- prancheta do celular ---------- */
  function criarPad(canvas, op) {
    op = op || {};
    var tracos = op.tracos ? op.tracos.slice() : [];
    var cor = 0, tam = 1, atual = null, travado = false, cego = !!op.cego, unico = !!op.unico, treme = !!op.treme;
    var aoMudar = op.aoMudar || function () {}, aoCheio = op.aoCheio || function () {};
    var ponteiro = null, ultimo = null;
    function redesenhar() {
      ajustar(canvas);
      if (cego) { preparar(canvas.getContext('2d'), canvas.width, canvas.height); return; }
      desenhar(canvas, atual ? tracos.concat([atual]) : tracos);
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * LADO, (e.clientY - r.top) / r.height * LADO];
    }
    function tremer(x, y) {
      if (!treme) return [x, y];
      var a = Date.now() / 37;
      return [x + Math.sin(a) * 9 + (Math.random() - .5) * 10, y + Math.cos(a * 1.3) * 9 + (Math.random() - .5) * 10];
    }
    function inicio(e) {
      if (travado || ponteiro !== null) return;
      if (contarPontos(tracos) >= MAX_PONTOS) { aoCheio(); return; }
      e.preventDefault();
      ponteiro = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      var q = tremer.apply(null, pos(e));
      atual = { c: cor, t: tam, p: [lim(q[0]), lim(q[1])] };
      ultimo = q;
      redesenharParcial();
    }
    function move(e) {
      if (ponteiro !== e.pointerId || !atual) return;
      e.preventDefault();
      var lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!lista.length) lista = [e];
      for (var i = 0; i < lista.length; i++) {
        var q = tremer.apply(null, pos(lista[i]));
        var dx = q[0] - ultimo[0], dy = q[1] - ultimo[1];
        if (dx * dx + dy * dy < 6.25) continue;   // ignora pontos colados (desenho fica leve)
        if (contarPontos(tracos) + atual.p.length / 2 >= MAX_PONTOS) { fim(e); aoCheio(); return; }
        atual.p.push(lim(q[0]), lim(q[1])); ultimo = q;
      }
      redesenharParcial();
    }
    function fim(e) {
      if (ponteiro !== e.pointerId) return;
      ponteiro = null;
      if (atual) { tracos.push(atual); atual = null; }
      if (unico) travado = true;
      redesenhar(); aoMudar();
    }
    var pendente = false;
    function redesenharParcial() {
      if (pendente) return; pendente = true;
      requestAnimationFrame(function () { pendente = false; if (cego) return; desenhar(canvas, atual ? tracos.concat([atual]) : tracos); });
    }
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', inicio);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', fim);
    canvas.addEventListener('pointercancel', fim);
    var aoRedim = function () { redesenhar(); };
    window.addEventListener('resize', aoRedim);
    redesenhar();
    return {
      tracos: function () { return tracos.slice(); },
      texto: function () { return codificar(tracos); },
      cor: function (c) { if (c !== undefined) cor = c; return cor; },
      tamanho: function (t) { if (t !== undefined) tam = t; return tam; },
      desfazer: function () { if (travado) return; tracos.pop(); redesenhar(); aoMudar(); },
      limpar: function () { if (travado) return; tracos = []; redesenhar(); aoMudar(); },
      travar: function (v) { travado = v !== false; },
      travado: function () { return travado; },
      revelar: function () { cego = false; redesenhar(); },
      cheio: function () { return contarPontos(tracos) >= MAX_PONTOS; },
      redesenhar: redesenhar,
      destruir: function () {
        window.removeEventListener('resize', aoRedim);
        canvas.removeEventListener('pointerdown', inicio); canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', fim); canvas.removeEventListener('pointercancel', fim);
      }
    };
  }

  var Traco = {
    LADO: LADO, CORES: CORES, NOMES_CORES: NOMES_CORES, TAMANHOS: TAMANHOS, MAX_PONTOS: MAX_PONTOS,
    codificar: codificar, decodificar: decodificar, contarPontos: contarPontos, vazio: vazio,
    desenhar: desenhar, ajustar: ajustar, animar: animar, criarPad: criarPad
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Traco;
  else raiz.Traco = Traco;
})(typeof window !== 'undefined' ? window : this);
