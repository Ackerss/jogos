/* Arena Escorregadia — desenho da TV em Canvas 2D (leve para a TV LG).
   Tudo que não muda (água, gelo, bichinhos, itens) é pintado uma vez numa tela escondida e só copiado a cada quadro.
   Sem desfoque (blur) e sem sombras do canvas: elas pesam muito no navegador da TV.
   v0.2: cada cor é um bichinho, com carinhas (medo na borda, tonto depois de uma batida, feliz quando vence),
   câmera que aproxima quando o gelo encolhe, itens, pinos, buracos, vento e textos de impacto ("POW!"). */
(function (raiz) {
  'use strict';
  var F = raiz.Fisica, C = F.C;

  var CORES = [
    { nome: 'VERMELHA', hex: '#ff4d5e', escura: '#a3122a', bicho: 'Raposa', art: 'a' },
    { nome: 'AZUL', hex: '#3f8cff', escura: '#163f9e', bicho: 'Pinguim', art: 'o' },
    { nome: 'AMARELA', hex: '#ffd23f', escura: '#a77a00', bicho: 'Pintinho', art: 'o' },
    { nome: 'VERDE', hex: '#2fd27a', escura: '#0d7a3f', bicho: 'Sapo', art: 'o' },
    { nome: 'ROXA', hex: '#a86bff', escura: '#5422a8', bicho: 'Coelho', art: 'o' },
    { nome: 'LARANJA', hex: '#ff8a2a', escura: '#a84800', bicho: 'Tigrinho', art: 'o' },
    { nome: 'ROSA', hex: '#ff6fc4', escura: '#a8186b', bicho: 'Porquinho', art: 'o' },
    { nome: 'MARROM', hex: '#a8754d', escura: '#5a3518', bicho: 'Urso', art: 'o' }
  ];
  /* Onde ficam os olhos de cada bichinho (em frações do raio). O sapo tem olhos no alto. */
  var OLHOS = [
    { x: 0.32, y: -0.14, r: 0.24 }, { x: 0.3, y: -0.2, r: 0.23 }, { x: 0.3, y: -0.16, r: 0.23 }, { x: 0.42, y: -0.62, r: 0.25 },
    { x: 0.3, y: -0.12, r: 0.24 }, { x: 0.32, y: -0.14, r: 0.24 }, { x: 0.34, y: -0.2, r: 0.22 }, { x: 0.32, y: -0.14, r: 0.23 }
  ];
  var ITEM_INFO = {
    gigante: { nome: 'GIGANTE', cor: '#2fd27a', escura: '#0d7a3f' },
    turbo: { nome: 'TURBO', cor: '#ffd23f', escura: '#b26b00' },
    mola: { nome: 'MOLA', cor: '#ff6fc4', escura: '#a8186b' }
  };
  var SPR = 1.7; // os desenhos prontos são feitos 1,7× maiores (ficam nítidos quando a câmera aproxima)
  var FONTE = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

  function tela(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  /* ---------- Bichinhos (desenho pronto: corpo, orelhas, focinho) ---------- */
  function contorno(g, r) { g.lineWidth = Math.max(1.5, r * 0.08); g.strokeStyle = 'rgba(10,20,40,0.6)'; g.lineJoin = 'round'; }
  function orelha(g, cor, escura, pts, dentro) {
    g.fillStyle = cor; g.beginPath(); g.moveTo(pts[0], pts[1]); g.lineTo(pts[2], pts[3]); g.lineTo(pts[4], pts[5]); g.closePath(); g.fill(); g.stroke();
    if (dentro) { g.fillStyle = dentro; var cx = (pts[0] + pts[2] + pts[4]) / 3, cy = (pts[1] + pts[3] + pts[5]) / 3; g.beginPath(); g.moveTo((pts[0] + cx) / 2, (pts[1] + cy) / 2); g.lineTo((pts[2] + cx * 0.6) / 1.6, (pts[3] + cy * 0.6) / 1.6); g.lineTo((pts[4] + cx) / 2, (pts[5] + cy) / 2); g.closePath(); g.fill(); }
  }
  function circulo(g, x, y, r, cor, linha) { g.fillStyle = cor; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); if (linha) g.stroke(); }
  function elipse(g, x, y, rx, ry, cor, linha) { g.fillStyle = cor; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); if (linha) g.stroke(); }

  function pintarBicho(g, i, m, r, comSombra) {
    var cor = CORES[i % CORES.length], hex = cor.hex, esc = cor.escura;
    if (comSombra) { g.fillStyle = 'rgba(20,60,90,0.28)'; g.beginPath(); g.ellipse(m + r * 0.15, m + r * 0.36, r * 1.02, r * 0.82, 0, 0, Math.PI * 2); g.fill(); }
    contorno(g, r);
    var k = i % CORES.length;
    /* orelhas e enfeites atrás do corpo */
    if (k === 0) { // raposa: orelhas pontudas
      orelha(g, hex, esc, [m - r * 0.85, m - r * 0.35, m - r * 0.7, m - r * 1.45, m - r * 0.15, m - r * 0.85], '#fff3e8');
      orelha(g, hex, esc, [m + r * 0.85, m - r * 0.35, m + r * 0.7, m - r * 1.45, m + r * 0.15, m - r * 0.85], '#fff3e8');
    } else if (k === 2) { // pintinho: topete
      g.fillStyle = hex;
      for (var p = -1; p <= 1; p++) { g.beginPath(); g.ellipse(m + p * r * 0.22, m - r * 1.05, r * 0.14, r * 0.32, p * 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
    } else if (k === 3) { // sapo: bolotas dos olhos
      circulo(g, m - r * 0.42, m - r * 0.62, r * 0.4, hex, true); circulo(g, m + r * 0.42, m - r * 0.62, r * 0.4, hex, true);
    } else if (k === 4) { // coelho: orelhas compridas
      g.fillStyle = hex;
      g.beginPath(); g.ellipse(m - r * 0.38, m - r * 1.15, r * 0.22, r * 0.62, -0.2, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(m + r * 0.38, m - r * 1.15, r * 0.22, r * 0.62, 0.2, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#ffb6d9';
      g.beginPath(); g.ellipse(m - r * 0.38, m - r * 1.12, r * 0.1, r * 0.42, -0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(m + r * 0.38, m - r * 1.12, r * 0.1, r * 0.42, 0.2, 0, Math.PI * 2); g.fill();
    } else if (k === 5 || k === 7) { // tigrinho e urso: orelhas redondas
      circulo(g, m - r * 0.68, m - r * 0.7, r * 0.32, hex, true); circulo(g, m + r * 0.68, m - r * 0.7, r * 0.32, hex, true);
      circulo(g, m - r * 0.68, m - r * 0.7, r * 0.16, k === 5 ? '#fff3e0' : '#e8c39e'); circulo(g, m + r * 0.68, m - r * 0.7, r * 0.16, k === 5 ? '#fff3e0' : '#e8c39e');
    } else if (k === 6) { // porquinho: orelhas dobradas
      orelha(g, hex, esc, [m - r * 0.9, m - r * 0.45, m - r * 0.85, m - r * 1.15, m - r * 0.3, m - r * 0.85], '#ffc2e2');
      orelha(g, hex, esc, [m + r * 0.9, m - r * 0.45, m + r * 0.85, m - r * 1.15, m + r * 0.3, m - r * 0.85], '#ffc2e2');
    }
    /* corpo redondo com brilho */
    var gr = g.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, hex); gr.addColorStop(1, esc);
    g.fillStyle = gr; g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill(); g.stroke();
    if (k === 3) { circulo(g, m - r * 0.42, m - r * 0.62, r * 0.38, hex); circulo(g, m + r * 0.42, m - r * 0.62, r * 0.38, hex); }
    /* rosto */
    if (k === 0) { // raposa: focinho claro
      elipse(g, m, m + r * 0.32, r * 0.5, r * 0.36, '#fff3e8'); circulo(g, m, m + r * 0.18, r * 0.12, '#2a1a1a');
    } else if (k === 1) { // pinguim: máscara branca e bico
      elipse(g, m - r * 0.3, m - r * 0.1, r * 0.4, r * 0.5, '#f4fbff'); elipse(g, m + r * 0.3, m - r * 0.1, r * 0.4, r * 0.5, '#f4fbff');
      elipse(g, m, m + r * 0.42, r * 0.55, r * 0.4, '#f4fbff');
      g.fillStyle = '#ff9a1f'; g.beginPath(); g.moveTo(m - r * 0.2, m + r * 0.12); g.lineTo(m + r * 0.2, m + r * 0.12); g.lineTo(m, m + r * 0.42); g.closePath(); g.fill(); g.stroke();
    } else if (k === 2) { // pintinho: bico
      g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(m - r * 0.2, m + r * 0.12); g.lineTo(m + r * 0.2, m + r * 0.12); g.lineTo(m, m + r * 0.4); g.closePath(); g.fill(); g.stroke();
      circulo(g, m - r * 0.55, m + r * 0.2, r * 0.13, 'rgba(255,120,80,0.55)'); circulo(g, m + r * 0.55, m + r * 0.2, r * 0.13, 'rgba(255,120,80,0.55)');
    } else if (k === 3) { // sapo: sorrisão
      g.strokeStyle = '#0b4d27'; g.lineWidth = Math.max(1.5, r * 0.08); g.beginPath(); g.arc(m, m - r * 0.05, r * 0.55, 0.35, Math.PI - 0.35); g.stroke();
      circulo(g, m - r * 0.62, m + r * 0.22, r * 0.12, 'rgba(255,140,170,0.6)'); circulo(g, m + r * 0.62, m + r * 0.22, r * 0.12, 'rgba(255,140,170,0.6)');
    } else if (k === 4) { // coelho: nariz e dentinhos
      elipse(g, m, m + r * 0.2, r * 0.11, r * 0.08, '#ff6fa8');
      g.fillStyle = '#fff'; g.fillRect(m - r * 0.11, m + r * 0.3, r * 0.1, r * 0.17); g.fillRect(m + r * 0.01, m + r * 0.3, r * 0.1, r * 0.17);
      contorno(g, r); g.strokeRect(m - r * 0.11, m + r * 0.3, r * 0.22, r * 0.17);
    } else if (k === 5) { // tigrinho: listras e focinho
      g.fillStyle = '#4a1f00';
      [[-0.15, -0.95, 0.1, 0.3], [0.15, -0.95, 0.1, 0.3], [0, -0.98, 0.08, 0.36]].forEach(function (l) { g.beginPath(); g.ellipse(m + l[0] * r, m + l[1] * r, l[2] * r, l[3] * r, 0, 0, Math.PI * 2); g.fill(); });
      [[-0.92, 0.05], [-0.88, 0.32], [0.92, 0.05], [0.88, 0.32]].forEach(function (l) { g.beginPath(); g.ellipse(m + l[0] * r, m + l[1] * r, r * 0.2, r * 0.06, 0, 0, Math.PI * 2); g.fill(); });
      elipse(g, m, m + r * 0.32, r * 0.45, r * 0.3, '#fff3e0'); circulo(g, m, m + r * 0.18, r * 0.1, '#4a1f00');
    } else if (k === 6) { // porquinho: focinho
      contorno(g, r); elipse(g, m, m + r * 0.28, r * 0.32, r * 0.22, '#ff9fd2', true);
      elipse(g, m - r * 0.1, m + r * 0.28, r * 0.05, r * 0.08, '#a8186b'); elipse(g, m + r * 0.1, m + r * 0.28, r * 0.05, r * 0.08, '#a8186b');
    } else if (k === 7) { // urso: focinho
      elipse(g, m, m + r * 0.32, r * 0.4, r * 0.3, '#e8c39e'); elipse(g, m, m + r * 0.22, r * 0.14, r * 0.1, '#2a1608');
    }
    /* brilho */
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(m - r * 0.5, m - r * 0.5, r * 0.18, r * 0.1, -0.7, 0, Math.PI * 2); g.fill();
  }

  /* Olhos e expressão (desenhados a cada quadro, olham para onde o bichinho quer ir). */
  function pintarOlhos(g, x, y, r, cor, ox, oy, cara, t) {
    var o = OLHOS[cor % OLHOS.length], ex = o.x * r, ey = y + o.y * r, er = o.r * r;
    var lx = ox * r * 0.12, ly = oy * r * 0.1, i;
    if (cara === 'tonto') {
      g.strokeStyle = '#10182a'; g.lineWidth = Math.max(1.5, r * 0.09); g.lineCap = 'round';
      for (i = -1; i <= 1; i += 2) {
        var cx = x + i * ex, d = er * 0.6;
        g.beginPath(); g.moveTo(cx - d, ey - d); g.lineTo(cx + d, ey + d); g.moveTo(cx + d, ey - d); g.lineTo(cx - d, ey + d); g.stroke();
      }
      // estrelinhas girando em volta da cabeça
      g.fillStyle = '#ffe14d';
      for (i = 0; i < 3; i++) { var a = t * 7 + i * 2.1; estrela(g, x + Math.cos(a) * r * 0.9, y - r * 1.15 + Math.sin(a) * r * 0.25, r * 0.17); }
      return;
    }
    if (cara === 'feliz') {
      g.strokeStyle = '#10182a'; g.lineWidth = Math.max(1.5, r * 0.1); g.lineCap = 'round';
      g.beginPath(); g.arc(x - ex, ey + er * 0.3, er * 0.7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.beginPath(); g.arc(x + ex, ey + er * 0.3, er * 0.7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      return;
    }
    if (cara === 'esforco') {
      g.strokeStyle = '#10182a'; g.lineWidth = Math.max(1.5, r * 0.1); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - ex - er * 0.8 + lx, ey - er * 0.5); g.lineTo(x - ex + er * 0.6 + lx, ey); g.lineTo(x - ex - er * 0.8 + lx, ey + er * 0.5);
      g.moveTo(x + ex + er * 0.8 + lx, ey - er * 0.5); g.lineTo(x + ex - er * 0.6 + lx, ey); g.lineTo(x + ex + er * 0.8 + lx, ey + er * 0.5); g.stroke();
      return;
    }
    var medo = cara === 'medo', rr = medo ? er * 1.25 : er;
    g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(10,20,40,0.55)'; g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath(); g.arc(x - ex + lx * 0.5, ey + ly * 0.5, rr, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(x + ex + lx * 0.5, ey + ly * 0.5, rr, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#10182a';
    var pr = medo ? er * 0.32 : er * 0.5;
    g.beginPath(); g.arc(x - ex + lx * 1.4, ey + ly * 1.4, pr, 0, Math.PI * 2); g.arc(x + ex + lx * 1.4, ey + ly * 1.4, pr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(x - ex + lx * 1.4 - pr * 0.35, ey + ly * 1.4 - pr * 0.35, pr * 0.32, 0, Math.PI * 2); g.arc(x + ex + lx * 1.4 - pr * 0.35, ey + ly * 1.4 - pr * 0.35, pr * 0.32, 0, Math.PI * 2); g.fill();
    if (medo) { // gota de suor
      g.fillStyle = '#7fd3ff'; g.beginPath(); var gx = x + r * 0.85, gy = y - r * 0.55;
      g.moveTo(gx, gy - r * 0.25); g.quadraticCurveTo(gx + r * 0.16, gy, gx, gy + r * 0.08); g.quadraticCurveTo(gx - r * 0.16, gy, gx, gy - r * 0.25); g.fill();
    }
  }
  function estrela(g, x, y, r) {
    g.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }

  /* Ícone de cada item (num círculo). */
  function pintarItem(g, tipo, m, r) {
    var info = ITEM_INFO[tipo];
    g.fillStyle = 'rgba(10,30,60,0.3)'; g.beginPath(); g.ellipse(m + r * 0.1, m + r * 0.3, r, r * 0.8, 0, 0, Math.PI * 2); g.fill();
    var gr = g.createRadialGradient(m - r * 0.3, m - r * 0.35, r * 0.1, m, m, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, info.cor); gr.addColorStop(1, info.escura);
    g.fillStyle = gr; g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = Math.max(2, r * 0.14); g.strokeStyle = '#ffffff'; g.stroke();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#10223d'; g.lineWidth = Math.max(1.5, r * 0.08); g.lineJoin = 'round';
    if (tipo === 'gigante') { // seta para cima e bolinha crescendo
      g.beginPath(); g.moveTo(m, m - r * 0.62); g.lineTo(m + r * 0.48, m - r * 0.08); g.lineTo(m + r * 0.2, m - r * 0.08); g.lineTo(m + r * 0.2, m + r * 0.55);
      g.lineTo(m - r * 0.2, m + r * 0.55); g.lineTo(m - r * 0.2, m - r * 0.08); g.lineTo(m - r * 0.48, m - r * 0.08); g.closePath(); g.fill(); g.stroke();
    } else if (tipo === 'turbo') { // raio
      g.beginPath(); g.moveTo(m + r * 0.15, m - r * 0.65); g.lineTo(m - r * 0.4, m + r * 0.08); g.lineTo(m - r * 0.02, m + r * 0.08); g.lineTo(m - r * 0.15, m + r * 0.65);
      g.lineTo(m + r * 0.4, m - r * 0.12); g.lineTo(m + r * 0.02, m - r * 0.12); g.closePath(); g.fill(); g.stroke();
    } else { // mola
      g.lineWidth = Math.max(2, r * 0.16); g.strokeStyle = '#ffffff'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(m - r * 0.45, m + r * 0.5);
      for (var i = 0; i < 5; i++) g.lineTo(m + (i % 2 ? -0.45 : 0.45) * r, m + r * (0.3 - i * 0.2));
      g.stroke();
      g.fillStyle = '#ffffff'; g.fillRect(m - r * 0.5, m + r * 0.48, r, r * 0.12); g.fillRect(m - r * 0.5, m - r * 0.62, r, r * 0.12);
    }
  }

  /* Retrato de um bichinho (para o celular, a sala e o pódio). Fica guardado. */
  var retratos = {};
  function retrato(cor, px) {
    var chave = cor + ':' + px;
    if (retratos[chave]) return retratos[chave];
    var c = tela(px, px), g = c.getContext('2d'), r = px * 0.3, m = px / 2;
    g.translate(0, px * 0.08);
    pintarBicho(g, cor, m, r, true);
    pintarOlhos(g, m, m, r, cor, 0, 0.4, 'normal', 0);
    try { retratos[chave] = c.toDataURL(); } catch (e) { retratos[chave] = ''; }
    return retratos[chave];
  }

  function criar(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var R = { qualidade: 'alta', W: 0, H: 0, escala: 1, cx: 0, cy: 0, zoom: 1, S: 1 };
    var agua = null, gelo = null, sprites = [], fantasmas = [], itens = {}, buracoSp = null, rachaduras = [];
    var particulas = [], aneis = [], textos = [], riscos = [], tremor = 0, ultimoT = 0;
    var semente = 7;
    function rnd() { semente = (semente * 16807) % 2147483647; return semente / 2147483647; }

    /* Tamanho interno do canvas. Na TV (ou no modo leve) desenha em até 1280×720 e o navegador amplia. */
    R.redimensionar = function () {
      var box = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var maxW = R.qualidade === 'leve' ? 1280 : 1920;
      var w = Math.max(320, box.width * dpr), h = Math.max(180, box.height * dpr);
      if (w > maxW) { h = h * maxW / w; w = maxW; }
      w = Math.round(w); h = Math.round(h);
      if (w === R.W && h === R.H) return;
      canvas.width = R.W = w; canvas.height = R.H = h;
      R.escala = h * 0.425 / C.RAIO_INICIAL;
      R.cx = w / 2; R.cy = h * 0.535;
      pintarFixos();
    };
    R.mudarQualidade = function (q) { R.qualidade = q; R.W = 0; R.redimensionar(); };

    function pintarFixos() {
      var W = R.W, H = R.H, s = R.escala, i;
      semente = 7;
      /* Água: azul profundo com ondinhas e placas de gelo soltas. */
      agua = tela(W, H);
      var g = agua.getContext('2d');
      var grad = g.createRadialGradient(R.cx, R.cy, s * 6, R.cx, R.cy, Math.max(W, H) * 0.75);
      grad.addColorStop(0, '#1b5d8f'); grad.addColorStop(0.55, '#0f3a66'); grad.addColorStop(1, '#071a35');
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(160,220,255,0.10)'; g.lineWidth = Math.max(1, s * 0.06); g.lineCap = 'round';
      for (i = 0; i < 70; i++) {
        var wx = rnd() * W, wy = rnd() * H, wl = s * (0.6 + rnd() * 1.4);
        if (Math.hypot(wx - R.cx, wy - R.cy) < s * (C.RAIO_INICIAL + 0.6)) continue;
        g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + wl / 2, wy - s * 0.18, wx + wl, wy); g.stroke();
      }
      for (i = 0; i < 14; i++) { // placas de gelo boiando, só na metade de baixo (em cima ficam o placar e os textos)
        var px = rnd() * W, py = H * (0.62 + rnd() * 0.38), pr = s * (0.4 + rnd() * 0.7);
        if (Math.hypot(px - R.cx, py - R.cy) < s * (C.RAIO_INICIAL + 1.6)) continue;
        g.fillStyle = 'rgba(8,30,60,0.45)'; poligono(g, px + pr * 0.12, py + pr * 0.18, pr, 7, i);
        g.fillStyle = 'rgba(220,245,255,0.75)'; poligono(g, px, py, pr, 7, i);
      }
      /* Gelo: disco claro com riscos de patins e rachaduras finas (feito maior, para a câmera aproximar). */
      var sg = s * 1.35, rg = C.RAIO_INICIAL * sg, lado = Math.ceil(rg * 2 + 4);
      gelo = tela(lado, lado); gelo.k = sg;
      var h = gelo.getContext('2d'), m = lado / 2;
      var gg = h.createRadialGradient(m - rg * 0.25, m - rg * 0.3, rg * 0.05, m, m, rg);
      gg.addColorStop(0, '#f7feff'); gg.addColorStop(0.6, '#d3f1fb'); gg.addColorStop(1, '#a6daf0');
      h.fillStyle = gg; h.beginPath(); h.arc(m, m, rg, 0, Math.PI * 2); h.fill();
      h.strokeStyle = 'rgba(255,255,255,0.55)'; h.lineWidth = Math.max(1, sg * 0.05);
      for (i = 0; i < 26; i++) {
        var ar = rg * (0.15 + rnd() * 0.8), a0 = rnd() * 6.28;
        h.beginPath(); h.arc(m + (rnd() - 0.5) * rg * 0.4, m + (rnd() - 0.5) * rg * 0.4, ar, a0, a0 + 0.3 + rnd() * 0.7); h.stroke();
      }
      h.strokeStyle = 'rgba(70,140,180,0.28)'; h.lineWidth = Math.max(1, sg * 0.035);
      for (i = 0; i < 9; i++) {
        var cx2 = m + (rnd() - 0.5) * rg * 1.3, cy2 = m + (rnd() - 0.5) * rg * 1.3, ca = rnd() * 6.28;
        h.beginPath(); h.moveTo(cx2, cy2);
        for (var k = 0; k < 4; k++) { ca += (rnd() - 0.5) * 1.6; cx2 += Math.cos(ca) * sg * 0.8; cy2 += Math.sin(ca) * sg * 0.8; h.lineTo(cx2, cy2); }
        h.stroke();
      }
      h.fillStyle = 'rgba(255,255,255,0.8)';
      for (i = 0; i < 40; i++) { var bx = m + (rnd() - 0.5) * rg * 1.8, by = m + (rnd() - 0.5) * rg * 1.8; if (Math.hypot(bx - m, by - m) < rg) h.fillRect(bx, by, Math.max(1, sg * 0.07), Math.max(1, sg * 0.07)); }
      h.strokeStyle = 'rgba(80,160,210,0.25)'; h.lineWidth = Math.max(1, sg * 0.08);
      h.beginPath(); h.arc(m, m, sg * 1.6, 0, Math.PI * 2); h.stroke();
      for (i = 0; i < 6; i++) { var aa = i * Math.PI / 3; h.beginPath(); h.moveTo(m, m); h.lineTo(m + Math.cos(aa) * sg * 0.9, m + Math.sin(aa) * sg * 0.9); h.stroke(); }

      rachaduras = [];
      for (i = 0; i < 28; i++) rachaduras.push({ a: i / 28 * Math.PI * 2 + rnd() * 0.15, d: [rnd(), rnd(), rnd()] });

      /* Bichinhos, fantasmas, itens e buraco: desenhados uma vez. */
      var sb = s * SPR, r = C.RAIO_BOLA * sb;
      sprites = CORES.map(function (cor, i) {
        var lado2 = Math.ceil(r * 3.6), c = tela(lado2, lado2), m2 = lado2 / 2;
        pintarBicho(c.getContext('2d'), i, m2, r, true);
        return { c: c, m: m2 };
      });
      fantasmas = CORES.map(function (cor) { return spriteFantasma(cor, sb); });
      Object.keys(ITEM_INFO).forEach(function (tipo) {
        var ri = C.ITEM_RAIO * sb, l = Math.ceil(ri * 2.8), c = tela(l, l);
        pintarItem(c.getContext('2d'), tipo, l / 2, ri);
        itens[tipo] = { c: c, m: l / 2 };
      });
      var rb = C.BURACO_RAIO * sb, lb = Math.ceil(rb * 2.6), cb = tela(lb, lb), gb = cb.getContext('2d'), mb = lb / 2;
      gb.fillStyle = '#ffffff'; poligono(gb, mb, mb, rb * 1.12, 14, 0.3, 1);
      gb.fillStyle = '#5aa6c8'; poligono(gb, mb, mb, rb * 1.02, 14, 0.3, 1);
      var gh = gb.createRadialGradient(mb, mb - rb * 0.3, rb * 0.1, mb, mb, rb);
      gh.addColorStop(0, '#2a7db0'); gh.addColorStop(1, '#0b2a4d');
      gb.fillStyle = gh; poligono(gb, mb, mb + rb * 0.08, rb * 0.92, 14, 0.3, 1);
      gb.strokeStyle = 'rgba(200,240,255,0.35)'; gb.lineWidth = Math.max(1, rb * 0.06);
      gb.beginPath(); gb.ellipse(mb, mb + rb * 0.1, rb * 0.5, rb * 0.25, 0, 0, Math.PI * 2); gb.stroke();
      buracoSp = { c: cb, m: mb };
    }

    function poligono(g, x, y, r, lados, giro, achatado) {
      g.beginPath();
      for (var i = 0; i < lados; i++) { var a = i / lados * Math.PI * 2 + giro, rr = r * (0.75 + 0.25 * Math.sin(i * 2.3 + giro)); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr * (achatado || 0.8)); }
      g.closePath(); g.fill();
    }

    function spriteFantasma(cor, s) {
      var r = C.RAIO_BOLA * s, lado = Math.ceil(r * 3), c = tela(lado, lado), g = c.getContext('2d'), m = lado / 2;
      g.fillStyle = 'rgba(240,250,255,0.9)'; g.strokeStyle = cor.hex; g.lineWidth = Math.max(2, r * 0.16);
      g.beginPath(); g.arc(m, m - r * 0.2, r * 0.95, Math.PI, 0);
      var base = m + r * 0.95;
      g.lineTo(m + r * 0.95, base);
      for (var i = 0; i < 4; i++) { var x0 = m + r * 0.95 - (i + 0.5) * r * 0.475; g.quadraticCurveTo(x0, base - r * 0.38, x0 - r * 0.2375, base); }
      g.closePath(); g.fill(); g.stroke();
      return { c: c, m: m };
    }

    function tx(x) { return R.cx + x * R.S; }
    function ty(y) { return R.cy + y * R.S; }
    /* Desenha um sprite pronto centrado em (x, y), com escala extra k. */
    function sprite(sp, x, y, k) {
      var f = (R.S / (R.escala * SPR)) * (k || 1);
      ctx.drawImage(sp.c, x - sp.m * f, y - sp.m * f, sp.c.width * f, sp.c.height * f);
    }

    /* ---------- Efeitos ---------- */
    function texto(x, y, txt, cor, tam, dur) { textos.push({ x: x, y: y, txt: txt, cor: cor || '#ffe14d', tam: tam || 1, ini: ultimoT, dur: dur || 0.9 }); if (textos.length > 14) textos.shift(); }
    R.texto = texto;
    R.efeito = function (ev) {
      var leve = R.qualidade === 'leve', i, n;
      if (ev.tipo === 'batida') {
        n = leve ? 4 : 8;
        for (i = 0; i < n; i++) { var a = rnd() * 6.28, v = (2 + rnd() * 3) * Math.min(2, ev.forca / 4); particulas.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.3, max: 0.3, tipo: 'faisca', cor: ev.mola ? '#ff9fd2' : '#ffffff', tam: 0.12 }); }
        if (ev.mola) texto(ev.x, ev.y - 0.8, 'BOING!', '#ff9fd2', 1.1);
        else if (ev.forca > 7.5) texto(ev.x, ev.y - 0.8, ev.forca > 11 ? 'KABUM!' : 'POW!', '#ffe14d', Math.min(1.5, 0.9 + ev.forca / 25));
        if (ev.forca > 6 && !leve) tremor = Math.min(0.4, ev.forca * 0.03);
      } else if (ev.tipo === 'queda') {
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT + 0.25, dur: 1.1, cor: 'rgba(200,240,255,', r: 1.8 });
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT + 0.4, dur: 1.3, cor: 'rgba(200,240,255,', r: 2.6 });
        n = leve ? 6 : 14;
        for (i = 0; i < n; i++) { var a2 = rnd() * 6.28, v2 = 1.5 + rnd() * 3; particulas.push({ x: ev.x, y: ev.y, vx: Math.cos(a2) * v2, vy: Math.sin(a2) * v2 - 2, vida: 0.7, max: 0.7, tipo: 'gota', cor: '#cdefff', tam: 0.14, atraso: 0.25, g: 7 }); }
        texto(ev.x, ev.y - 0.4, 'TCHIBUM!', '#9fe6ff', 1.05, 1.1);
      } else if (ev.tipo === 'sopro') {
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT, dur: 0.45, cor: 'rgba(255,255,255,', r: C.SOPRO_RAIO, grosso: true });
        n = leve ? 6 : 12;
        for (i = 0; i < n; i++) { var a3 = i / n * 6.28; particulas.push({ x: ev.x, y: ev.y, vx: Math.cos(a3) * 7, vy: Math.sin(a3) * 7, vida: 0.4, max: 0.4, tipo: 'vento', cor: '#ffffff', tam: 0.16 }); }
        texto(ev.x, ev.y - 1, 'FUUU!', '#ffffff', 0.9);
      } else if (ev.tipo === 'tranco') {
        n = leve ? 3 : 6;
        for (i = 0; i < n; i++) particulas.push({ x: ev.x + (rnd() - 0.5) * 0.8, y: ev.y + (rnd() - 0.5) * 0.8, vx: (rnd() - 0.5) * 2, vy: (rnd() - 0.5) * 2, vida: 0.35, max: 0.35, tipo: 'neve', cor: '#ffffff', tam: 0.18 });
      } else if (ev.tipo === 'quebra') {
        n = leve ? 14 : 30;
        for (i = 0; i < n; i++) {
          var a4 = rnd() * 6.28, rr = ev.para + (ev.de - ev.para) * (0.2 + rnd() * 0.8);
          particulas.push({ x: Math.cos(a4) * rr, y: Math.sin(a4) * rr, vx: Math.cos(a4) * (0.6 + rnd()), vy: Math.sin(a4) * (0.6 + rnd()), vida: 1.6, max: 1.6, tipo: 'placa', tam: 0.35 + rnd() * 0.45, giro: rnd() * 6 });
        }
        if (!leve) tremor = 0.3;
      } else if (ev.tipo === 'pegou') {
        var info = ITEM_INFO[ev.item];
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT, dur: 0.5, cor: info.cor === '#ffd23f' ? 'rgba(255,225,77,' : info.cor === '#2fd27a' ? 'rgba(47,210,122,' : 'rgba(255,111,196,', r: 2.2, grosso: true });
        texto(ev.x, ev.y - 1.1, info.nome + '!', info.cor, 1.15, 1.2);
      } else if (ev.tipo === 'item') {
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT, dur: 0.6, cor: 'rgba(255,255,255,', r: 1.6 });
      } else if (ev.tipo === 'boia') {
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT, dur: 0.6, cor: 'rgba(255,90,90,', r: 1.8, grosso: true });
        texto(ev.x, ev.y - 1.1, 'BOIA!', '#ff8080', 1.1);
      } else if (ev.tipo === 'pino') {
        texto(ev.x, ev.y - 0.6, 'PLIM!', '#ffe14d', 0.85, 0.6);
        n = leve ? 3 : 6;
        for (i = 0; i < n; i++) { var a5 = rnd() * 6.28; particulas.push({ x: ev.x, y: ev.y, vx: Math.cos(a5) * 4, vy: Math.sin(a5) * 4, vida: 0.3, max: 0.3, tipo: 'faisca', cor: '#ffe14d', tam: 0.14 }); }
      } else if (ev.tipo === 'buraco') {
        n = leve ? 6 : 12;
        for (i = 0; i < n; i++) { var a6 = rnd() * 6.28; particulas.push({ x: ev.x + Math.cos(a6) * C.BURACO_RAIO, y: ev.y + Math.sin(a6) * C.BURACO_RAIO, vx: Math.cos(a6) * 1.5, vy: Math.sin(a6) * 1.5, vida: 0.9, max: 0.9, tipo: 'placa', tam: 0.25 + rnd() * 0.25, giro: rnd() * 6 }); }
        texto(ev.x, ev.y, 'CRACK!', '#ffffff', 1);
        if (!leve) tremor = 0.2;
      }
      if (particulas.length > 180) particulas.splice(0, particulas.length - 180);
    };

    /* ---------- Quadro ---------- */
    /* m = mundo da física; info = {nomes: {id: nome}, lider: id, vencedores: [id]} */
    R.quadro = function (m, info, dt) {
      var W = R.W, H = R.H, leve = R.qualidade === 'leve', i, b;
      ultimoT += dt;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(agua, 0, 0);
      if (!m) return;
      /* câmera: aproxima quando o gelo encolhe (bichinhos maiores na TV) */
      var alvoZoom = Math.max(1, Math.min(1.75, (C.RAIO_INICIAL + 0.6) / (m.raio + 1.7)));
      R.zoom += (alvoZoom - R.zoom) * Math.min(1, dt * 2.2);
      R.S = R.escala * R.zoom;
      var s = R.S;
      if (tremor > 0) { ctx.setTransform(1, 0, 0, 1, (rnd() - 0.5) * tremor * s, (rnd() - 0.5) * tremor * s); tremor = Math.max(0, tremor - dt * 1.2); }
      var raio = m.raio * s;

      /* bolinhas caindo pela borda ficam por baixo do gelo (afundando na água) */
      for (i = 0; i < m.bolas.length; i++) { b = m.bolas[i]; if (b.estado === 'caindo' && !b.noBuraco) desenharQueda(b, m.t); }

      /* gelo: espessura (lado escuro), disco e borda de neve */
      ctx.fillStyle = '#5aa6c8';
      ctx.beginPath(); ctx.arc(R.cx, R.cy + s * 0.32, raio, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(R.cx, R.cy, raio, 0, Math.PI * 2); ctx.clip();
      var kg = s / gelo.k;
      ctx.drawImage(gelo, R.cx - gelo.width * kg / 2, R.cy - gelo.height * kg / 2, gelo.width * kg, gelo.height * kg);
      ctx.restore();
      ctx.lineWidth = Math.max(2, s * 0.22); ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(R.cx, R.cy, raio - s * 0.11, 0, Math.PI * 2); ctx.stroke();

      /* aviso: a faixa que vai quebrar pisca em vermelho, com rachaduras */
      var falta = F.proximaQuebra(m);
      if (falta !== null && falta <= C.AVISO_QUEBRA && falta > 0) {
        var depois = Math.max(C.RAIO_MINIMO, F.raioDepois(m)) * s;
        var pisca = 0.25 + 0.25 * Math.sin(m.t * (falta < 1 ? 26 : 14));
        ctx.fillStyle = 'rgba(255,60,80,' + pisca.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(R.cx, R.cy, raio, 0, Math.PI * 2); ctx.arc(R.cx, R.cy, depois, 0, Math.PI * 2, true); ctx.fill();
        ctx.strokeStyle = 'rgba(40,90,130,0.7)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
        ctx.beginPath();
        for (i = 0; i < rachaduras.length; i++) {
          var rc = rachaduras[i], ca = Math.cos(rc.a), sa = Math.sin(rc.a);
          ctx.moveTo(R.cx + ca * depois, R.cy + sa * depois);
          for (var k = 0; k < 3; k++) { var f = depois + (raio - depois) * (k + 1) / 3, des = (rc.d[k] - 0.5) * 0.12; ctx.lineTo(R.cx + Math.cos(rc.a + des) * f, R.cy + Math.sin(rc.a + des) * f); }
        }
        ctx.arc(R.cx, R.cy, depois, 0, Math.PI * 2);
        ctx.stroke();
      }

      desenharBuracos(m);
      for (i = 0; i < m.bolas.length; i++) { b = m.bolas[i]; if (b.estado === 'caindo' && b.noBuraco) desenharQueda(b, m.t); }
      desenharParticulas(dt, true);
      desenharVentoAviso(m);
      desenharItens(m);
      desenharPinos(m, false);

      /* bichinhos no gelo (os de baixo na tela por cima, para parecer 3D) */
      var vivos = m.bolas.filter(function (x) { return x.estado === 'gelo'; }).sort(function (a, c) { return a.y - c.y; });
      for (i = 0; i < vivos.length; i++) desenharBola(vivos[i], m, info, leve);
      desenharPinos(m, true);
      for (i = 0; i < vivos.length; i++) desenharNome(vivos[i], info, info.lider === vivos[i].id);

      desenharAneis();
      desenharParticulas(dt, false);
      desenharVento(m, dt, leve);

      for (i = 0; i < m.bolas.length; i++) { b = m.bolas[i]; if (b.estado === 'fantasma') desenharFantasma(b, m.t, info); }
      desenharTextos();
    };

    function desenharBola(b, m, info, leve) {
      var s = R.S, x = tx(b.x), y = ty(b.y), sp = sprites[b.cor % sprites.length], esc = b.esc || 1, r = C.RAIO_BOLA * s * esc;
      var dash = m.t < b.trancoAte;
      /* rastro do tranco e do turbo */
      if ((dash || (F.temItem(b, 'turbo', m.t) && Math.hypot(b.vx, b.vy) > 4)) && !leve) {
        ctx.globalAlpha = 0.22;
        for (var k = 1; k <= 3; k++) sprite(sp, x - b.vx * s * 0.035 * k, y - b.vy * s * 0.035 * k, esc);
        ctx.globalAlpha = 1;
      }
      /* boia do modo criança */
      if (b.boias > 0) {
        var piscaBoia = m.t - b.boiaEm < 0.6 ? 1.15 : 1;
        ctx.lineWidth = r * 0.34;
        ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 1.08 * piscaBoia, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ff4d5e';
        for (var q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 1.08 * piscaBoia, q * Math.PI / 2, q * Math.PI / 2 + Math.PI / 4); ctx.stroke(); }
      }
      /* amassa quando bate (squash) */
      var amassa = Math.max(0, 1 - (m.t - b.batidaEm) / 0.18), sx = 1 + 0.16 * amassa, sy = 1 - 0.16 * amassa;
      if (amassa > 0) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.translate(-x, -y); }
      sprite(sp, x, y, esc);
      var dc = Math.hypot(b.x, b.y), perto = m.raio - dc < 1.7 + (b.esc - 1) || F.buracoEm(m, b.x, b.y, 1.0, true);
      var cara = m.t < b.tontoAte ? 'tonto' : dash ? 'esforco' : (m.fim && info.vencedores && info.vencedores.indexOf(b.id) >= 0) ? 'feliz' : perto ? 'medo' : 'normal';
      pintarOlhos(ctx, x, y, r, b.cor, b.olhoX, b.olhoY, cara, m.t);
      if (amassa > 0) ctx.restore();
      /* item ativo: anel com o tempo que falta */
      if (b.item && m.t < b.itemAte) {
        var info2 = ITEM_INFO[b.item], resta = (b.itemAte - m.t) / C.ITEM_DURACAO;
        ctx.strokeStyle = info2.cor; ctx.lineWidth = Math.max(2, s * 0.12);
        if (resta > 0.25 || Math.sin(m.t * 20) > 0) { ctx.beginPath(); ctx.arc(x, y, r * 1.25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * resta); ctx.stroke(); }
        sprite(itens[b.item], x + r * 1.05, y - r * 0.95, 0.55);
      } else if (b.recarga > 0 && !m.treino) {
        /* recarga do tranco: anel fino em volta */
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
        ctx.beginPath(); ctx.arc(x, y, r * 1.18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.recarga / C.TRANCO_RECARGA)); ctx.stroke();
      }
    }

    function desenharNome(b, info, lider) {
      var s = R.S, x = tx(b.x), y = ty(b.y) - C.RAIO_BOLA * s * (b.esc || 1) * 1.5 - s * 0.15, nome = (info.nomes && info.nomes[b.id]) || '';
      if (!nome) return;
      var tam = Math.round(Math.min(s, R.escala * 1.3) * 0.6);
      ctx.font = '800 ' + tam + 'px ' + FONTE;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = Math.max(2, tam * 0.24); ctx.strokeStyle = 'rgba(8,22,45,0.85)'; ctx.lineJoin = 'round';
      ctx.strokeText(nome, x, y); ctx.fillStyle = CORES[b.cor % CORES.length].hex; ctx.fillText(nome, x, y);
      if (lider) { // coroa de quem lidera a partida (desenhada: emoji não aparece em toda TV)
        var cw = tam * 1.2, ch = tam * 0.72, cy = y - tam * 1.15;
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = 'rgba(8,22,45,0.85)'; ctx.lineWidth = Math.max(1.5, tam * 0.1);
        ctx.beginPath(); ctx.moveTo(x - cw / 2, cy); ctx.lineTo(x - cw / 2, cy - ch); ctx.lineTo(x - cw / 4, cy - ch * 0.45); ctx.lineTo(x, cy - ch * 1.1);
        ctx.lineTo(x + cw / 4, cy - ch * 0.45); ctx.lineTo(x + cw / 2, cy - ch); ctx.lineTo(x + cw / 2, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    function desenharQueda(b, t) {
      var k = Math.min(1, (t - b.caiuEm) / C.QUEDA_DURACAO), sp = sprites[b.cor % sprites.length];
      var esc = (b.esc || 1) * (1 - k * 0.7), x = tx(b.x), y = ty(b.y) + k * R.S * (b.noBuraco ? 0.2 : 0.6);
      ctx.globalAlpha = 1 - k;
      sprite(sp, x, y, esc);
      ctx.globalAlpha = 1;
    }

    function desenharFantasma(b, t, info) {
      var sp = fantasmas[b.cor % fantasmas.length], s = R.S, x = tx(b.x), y = ty(b.y) + Math.sin(t * 3 + b.cor) * s * 0.15, r = C.RAIO_BOLA * s;
      ctx.globalAlpha = 0.8;
      sprite(sp, x, y, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#20304a';
      ctx.beginPath(); ctx.arc(x - r * 0.3 + b.olhoX * r * 0.15, y - r * 0.3 + b.olhoY * r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.arc(x + r * 0.3 + b.olhoX * r * 0.15, y - r * 0.3 + b.olhoY * r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.fill();
      if (b.recarga <= 0) { // pronto para soprar: bochechas cheias
        ctx.fillStyle = 'rgba(255,140,170,0.7)';
        ctx.beginPath(); ctx.arc(x - r * 0.55, y + r * 0.05, r * 0.14, 0, Math.PI * 2); ctx.arc(x + r * 0.55, y + r * 0.05, r * 0.14, 0, Math.PI * 2); ctx.fill();
      }
      var nome = (info.nomes && info.nomes[b.id]) || '';
      if (nome) {
        ctx.font = '700 ' + Math.round(Math.min(s, R.escala * 1.3) * 0.48) + 'px ' + FONTE;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(nome, x, y - r * 1.1);
      }
    }

    function desenharItens(m) {
      var s = R.S;
      for (var i = 0; i < m.itens.length; i++) {
        var it = m.itens[i], idade = m.t - it.nasceu, x = tx(it.x), y = ty(it.y);
        if (idade > C.ITEM_VIDA - 2 && Math.sin(idade * 18) < 0) continue; // pisca antes de sumir
        var nasce = Math.min(1, idade / 0.3), pula = Math.sin(idade * 5) * 0.08;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.3 * Math.sin(idade * 6)).toFixed(2) + ')'; ctx.lineWidth = Math.max(1.5, s * 0.06);
        ctx.beginPath(); ctx.arc(x, y, C.ITEM_RAIO * s * (1.35 + 0.1 * Math.sin(idade * 6)), 0, Math.PI * 2); ctx.stroke();
        sprite(itens[it.tipo], x, y - pula * s, nasce * (1 + pula));
        var tam = Math.round(Math.min(s, R.escala * 1.3) * 0.38);
        ctx.font = '900 ' + tam + 'px ' + FONTE; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.lineWidth = Math.max(2, tam * 0.25); ctx.strokeStyle = 'rgba(8,22,45,0.8)'; ctx.lineJoin = 'round';
        ctx.strokeText(ITEM_INFO[it.tipo].nome, x, y + C.ITEM_RAIO * s * 1.15); ctx.fillStyle = '#ffffff'; ctx.fillText(ITEM_INFO[it.tipo].nome, x, y + C.ITEM_RAIO * s * 1.15);
      }
    }

    /* Pinos do Pinball: base (atrás dos bichinhos) e topo (na frente) dão a ideia de altura. */
    function desenharPinos(m, topo) {
      var s = R.S;
      for (var i = 0; i < m.pinos.length; i++) {
        var p = m.pinos[i], k = 1;
        if (!p.vivo) { k = 1 - (m.t - p.afundaEm) / 0.6; if (k <= 0) continue; }
        var x = tx(p.x), y = ty(p.y), r = p.r * s * k, brilho = m.t - p.batidaEm < 0.15;
        if (!topo) {
          ctx.fillStyle = 'rgba(20,60,90,0.3)'; ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.4, r * 1.05, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#a3122a'; ctx.fillRect(x - r, y - r * 0.5, r * 2, r * 0.75);
          ctx.beginPath(); ctx.ellipse(x, y + r * 0.25, r, r * 0.5, 0, 0, Math.PI); ctx.fill();
        } else {
          ctx.fillStyle = brilho ? '#ffffff' : '#ff4d5e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, r * 0.12);
          ctx.beginPath(); ctx.ellipse(x, y - r * 0.5, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = brilho ? '#ff4d5e' : '#ffe14d'; estrela(ctx, x, y - r * 0.5, r * 0.42);
        }
      }
    }

    function desenharBuracos(m) {
      var s = R.S;
      for (var i = 0; i < m.buracos.length; i++) {
        var h = m.buracos[i], x = tx(h.x), y = ty(h.y), r = h.r * s;
        if (!h.aberto) {
          var k = (m.t - h.nasce) / C.BURACO_AVISO, pisca = 0.35 + 0.35 * Math.sin(m.t * (k > 0.6 ? 26 : 13));
          ctx.fillStyle = 'rgba(255,60,80,' + (pisca * 0.6).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, r * (0.4 + 0.6 * Math.min(1, k * 1.5)), 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(40,90,130,0.8)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
          ctx.beginPath();
          for (var j = 0; j < 7; j++) { var a = j / 7 * 6.28 + i, f = r * Math.min(1, k * 1.3); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * f * 0.5, y + Math.sin(a + 0.3) * f * 0.5); ctx.lineTo(x + Math.cos(a + 0.15) * f, y + Math.sin(a + 0.15) * f); }
          ctx.stroke();
        } else {
          var abre = Math.min(1, (m.t - h.abre) / 0.25);
          sprite(buracoSp, x, y, abre);
        }
      }
    }

    function seta(x, y, dx, dy, tam) {
      var px = -dy, py = dx;
      ctx.beginPath();
      ctx.moveTo(x + dx * tam, y + dy * tam);
      ctx.lineTo(x - dx * tam * 0.2 + px * tam * 0.8, y - dy * tam * 0.2 + py * tam * 0.8);
      ctx.lineTo(x - dx * tam * 0.2 + px * tam * 0.35, y - dy * tam * 0.2 + py * tam * 0.35);
      ctx.lineTo(x - dx * tam, y - dy * tam);
      ctx.lineTo(x - dx * tam * 0.2 - px * tam * 0.35, y - dy * tam * 0.2 - py * tam * 0.35);
      ctx.lineTo(x - dx * tam * 0.2 - px * tam * 0.8, y - dy * tam * 0.2 - py * tam * 0.8);
      ctx.closePath(); ctx.fill();
    }
    function desenharVentoAviso(m) {
      var v = m.vento;
      if (!v || v.fase !== 'aviso') return;
      var s = R.S, pisca = 0.25 + 0.2 * Math.sin(m.t * 12);
      ctx.fillStyle = 'rgba(255,255,255,' + pisca.toFixed(3) + ')';
      for (var i = -1; i <= 1; i++) seta(R.cx + v.dx * i * s * 3.2, R.cy + v.dy * i * s * 3.2, v.dx, v.dy, s * 1.3);
    }
    function desenharVento(m, dt, leve) {
      var v = m.vento, s = R.S, i;
      if (v && v.k > 0) {
        var n = leve ? 14 : 32;
        while (riscos.length < n) riscos.push({ x: rnd() * R.W, y: rnd() * R.H, l: 0.6 + rnd() * 1.6, vel: 0.8 + rnd() * 0.6 });
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 * v.k).toFixed(3) + ')'; ctx.lineWidth = Math.max(1.5, R.escala * 0.07); ctx.lineCap = 'round';
        ctx.beginPath();
        for (i = 0; i < riscos.length; i++) {
          var rs = riscos[i];
          rs.x += v.dx * rs.vel * R.W * dt * 0.9; rs.y += v.dy * rs.vel * R.W * dt * 0.9;
          if (rs.x < -50 || rs.x > R.W + 50 || rs.y < -50 || rs.y > R.H + 50) { rs.x = v.dx > 0.3 ? -40 : v.dx < -0.3 ? R.W + 40 : rnd() * R.W; rs.y = v.dy > 0.3 ? -40 : v.dy < -0.3 ? R.H + 40 : rnd() * R.H; if (Math.abs(v.dx) > 0.3 && Math.abs(v.dy) > 0.3) { if (rnd() < 0.5) rs.x = rnd() * R.W; else rs.y = rnd() * R.H; } }
          ctx.moveTo(rs.x, rs.y); ctx.lineTo(rs.x - v.dx * rs.l * s, rs.y - v.dy * rs.l * s);
        }
        ctx.stroke();
      } else if (riscos.length) riscos = [];
    }

    function desenharTextos() {
      for (var i = textos.length - 1; i >= 0; i--) {
        var tt = textos[i], k = (ultimoT - tt.ini) / tt.dur;
        if (k >= 1) { textos.splice(i, 1); continue; }
        var pop = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : k < 0.25 ? 1.2 - (k - 0.15) * 2 : 1;
        var tam = Math.round(Math.min(R.S, R.escala * 1.3) * 0.8 * tt.tam * pop);
        var x = tx(tt.x), y = ty(tt.y) - k * R.escala * 1.2;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.font = '900 ' + tam + 'px ' + FONTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(3, tam * 0.22); ctx.strokeStyle = '#10223d'; ctx.lineJoin = 'round';
        ctx.strokeText(tt.txt, x, y); ctx.fillStyle = tt.cor; ctx.fillText(tt.txt, x, y);
        ctx.globalAlpha = 1;
      }
    }

    function desenharAneis() {
      for (var i = aneis.length - 1; i >= 0; i--) {
        var a = aneis[i], k = (ultimoT - a.ini) / a.dur;
        if (k < 0) continue;
        if (k >= 1) { aneis.splice(i, 1); continue; }
        ctx.strokeStyle = a.cor + (0.7 * (1 - k)).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1.5, R.S * (a.grosso ? 0.25 : 0.1) * (1 - k * 0.5));
        ctx.beginPath(); ctx.ellipse(tx(a.x), ty(a.y), a.r * k * R.S, a.r * k * R.S * (a.grosso ? 1 : 0.6), 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    function desenharParticulas(dt, embaixo) {
      var s = R.S;
      for (var i = particulas.length - 1; i >= 0; i--) {
        var p = particulas[i];
        if ((p.tipo === 'placa') !== embaixo) continue;
        if (p.atraso > 0) { p.atraso -= dt; continue; }
        p.vida -= dt;
        if (p.vida <= 0) { particulas.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt;
        var k = p.vida / p.max;
        if (p.tipo === 'placa') {
          var tam = p.tam * s * (0.4 + 0.6 * k);
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.fillStyle = '#5aa6c8'; poligono(ctx, tx(p.x), ty(p.y) + s * 0.15, tam, 5, p.giro);
          ctx.fillStyle = '#dff6ff'; poligono(ctx, tx(p.x), ty(p.y), tam, 5, p.giro);
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = k; ctx.fillStyle = p.cor;
          var t2 = p.tam * s * (p.tipo === 'vento' ? 1 : 0.6 + k * 0.4);
          ctx.fillRect(tx(p.x) - t2 / 2, ty(p.y) - t2 / 2, t2, t2);
          ctx.globalAlpha = 1;
        }
      }
    }

    R.limparEfeitos = function () { particulas = []; aneis = []; textos = []; riscos = []; tremor = 0; R.zoom = 1; };
    return R;
  }

  raiz.Desenho = { criar: criar, CORES: CORES, ITEM_INFO: ITEM_INFO, retrato: retrato };
})(window);
