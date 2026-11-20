/* Dino Pula-Pula — os DESENHOS (feitos em código, sem arquivos de imagem): dinos, obstáculos, frutas, estrela, ninho e cenários.
   Tudo é desenhado uma vez numa "figurinha" (canvas escondido) e depois só copiado na tela: leve para a TV.
   Usado pela TV e pelo celular. Coordenadas: o chão é y = 0 e para cima é negativo (como no canvas). */
(function () {
  'use strict';

  var DINOS = [
    { id: 'verde', nome: 'Rex', corpo: '#5fd35b', escuro: '#2e9e3f', barriga: '#dcf8a6', extra: 'manchas' },
    { id: 'rosa', nome: 'Lili', corpo: '#ff86bd', escuro: '#e24d90', barriga: '#ffe0ee', extra: 'laco' },
    { id: 'azul', nome: 'Tuca', corpo: '#4fb8ff', escuro: '#1f78c8', barriga: '#d2efff', extra: 'oculos' },
    { id: 'amarelo', nome: 'Bolota', corpo: '#ffcb3d', escuro: '#e58f0c', barriga: '#fff3bf', extra: 'coroa' },
    { id: 'laranja', nome: 'Fofo', corpo: '#ff9248', escuro: '#d6561b', barriga: '#ffe2c6', extra: 'chapeu' },
    { id: 'roxo', nome: 'Nina', corpo: '#a77bff', escuro: '#6d43d8', barriga: '#ece2ff', extra: 'flor' }
  ];
  function dino(id) { for (var i = 0; i < DINOS.length; i++) if (DINOS[i].id === id) return DINOS[i]; return DINOS[0]; }

  /* ---------- utilidades ---------- */
  function tela(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function elipse(ctx, x, y, rx, ry, cor, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill(); }
  function circulo(ctx, x, y, r, cor) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill(); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function contorno(ctx, cor, l) { ctx.strokeStyle = cor; ctx.lineWidth = l; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  function estrelaPath(ctx, x, y, r1, r2, pontas) {
    ctx.beginPath();
    for (var i = 0; i < pontas * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / pontas, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }

  /* ---------- DINO ----------
     q: 'corre0' | 'corre1' | 'pulo' | 'tombo' | 'feliz' | 'parado'. Pés no (0,0), olhando para a direita. */
  var LINHA = '#2b2140';
  function desenharDino(ctx, d, q) {
    var tombo = q === 'tombo', pulo = q === 'pulo' || q === 'feliz';
    ctx.save();
    if (tombo) { ctx.translate(0, -6); ctx.rotate(-0.22); }
    // pernas (a de trás mais escura)
    var p1 = 0, p2 = 0;
    if (q === 'corre0') { p1 = -9; p2 = 0; } else if (q === 'corre1') { p1 = 0; p2 = -9; } else if (pulo) { p1 = -10; p2 = -12; }
    ctx.lineWidth = 3.2;
    rr(ctx, -20, -26 + p1, 17, 26, 7); ctx.fillStyle = d.escuro; ctx.fill(); contorno(ctx, LINHA, 3.2);
    rr(ctx, 6, -26 + p2, 17, 26, 7); ctx.fillStyle = d.corpo; ctx.fill(); contorno(ctx, LINHA, 3.2);
    // rabo
    ctx.beginPath(); ctx.moveTo(-18, -52); ctx.quadraticCurveTo(-48, -50, -66, -30 + (pulo ? -8 : 0)); ctx.quadraticCurveTo(-44, -24, -16, -24); ctx.closePath();
    ctx.fillStyle = d.corpo; ctx.fill(); contorno(ctx, LINHA, 3.2);
    // espinhos das costas
    ctx.fillStyle = d.escuro;
    [[-46, -40, 9], [-32, -54, 11], [-14, -66, 12], [4, -76, 12]].forEach(function (e) {
      ctx.beginPath(); ctx.moveTo(e[0] - e[2], e[1] + 6); ctx.lineTo(e[0] - 2, e[1] - e[2] - 2); ctx.lineTo(e[0] + e[2], e[1] + 3); ctx.closePath(); ctx.fill(); contorno(ctx, LINHA, 3);
    });
    // corpo
    elipse(ctx, -2, -44, 33, 29, d.corpo); contorno(ctx, LINHA, 3.2);
    elipse(ctx, 6, -36, 21, 18, d.barriga);
    if (d.extra === 'manchas') { elipse(ctx, -16, -56, 6, 4.5, d.escuro, -0.3); elipse(ctx, -26, -40, 4.5, 3.5, d.escuro); elipse(ctx, -6, -64, 3.5, 3, d.escuro); }
    // cabeça
    ctx.beginPath(); ctx.ellipse(26, -74, 27, 24, -0.12, 0, Math.PI * 2); ctx.fillStyle = d.corpo; ctx.fill(); contorno(ctx, LINHA, 3.2);
    elipse(ctx, 26, -74, 25.4, 22.4, d.corpo, -0.12); // apaga a linha entre cabeça e corpo
    ctx.beginPath(); ctx.ellipse(-2, -44, 31.4, 27.4, 0, -1.1, 0.2); ctx.fillStyle = d.corpo; ctx.fill();
    elipse(ctx, 6, -36, 21, 18, d.barriga);
    if (d.extra === 'manchas') elipse(ctx, 18, -92, 5, 3.5, d.escuro, 0.2);
    // focinho
    elipse(ctx, 44, -66, 6, 4, 'rgba(0,0,0,.0)');
    circulo(ctx, 49, -72, 2.2, LINHA);
    // bracinho
    ctx.beginPath(); ctx.ellipse(20, -40 + (pulo ? -8 : 0), 9, 5.5, pulo ? -0.9 : 0.5, 0, Math.PI * 2); ctx.fillStyle = d.corpo; ctx.fill(); contorno(ctx, LINHA, 3);
    // bochecha
    elipse(ctx, 36, -62, 6, 4, 'rgba(255,90,120,.35)');
    // olho
    if (tombo) {
      ctx.beginPath(); ctx.moveTo(26, -86); ctx.lineTo(36, -76); ctx.moveTo(36, -86); ctx.lineTo(26, -76); contorno(ctx, LINHA, 3.6);
      ctx.beginPath(); ctx.arc(42, -60, 4.5, 0, Math.PI * 2); ctx.fillStyle = LINHA; ctx.fill(); // boca "ó"
    } else if (q === 'feliz') {
      ctx.beginPath(); ctx.arc(31, -79, 7, Math.PI * 1.1, Math.PI * 1.9); contorno(ctx, LINHA, 3.6);
      ctx.beginPath(); ctx.moveTo(32, -62); ctx.quadraticCurveTo(42, -50, 52, -62); ctx.closePath(); ctx.fillStyle = '#c2304f'; ctx.fill(); contorno(ctx, LINHA, 2.6);
    } else {
      circulo(ctx, 31, -80, 10.5, '#fff'); ctx.beginPath(); ctx.arc(31, -80, 10.5, 0, Math.PI * 2); contorno(ctx, LINHA, 2.6);
      circulo(ctx, 34, -79, 6, LINHA); circulo(ctx, 36, -82, 2.4, '#fff');
      if (pulo) { ctx.beginPath(); ctx.moveTo(33, -62); ctx.quadraticCurveTo(42, -52, 51, -63); ctx.closePath(); ctx.fillStyle = '#c2304f'; ctx.fill(); contorno(ctx, LINHA, 2.6); }
      else { ctx.beginPath(); ctx.moveTo(34, -61); ctx.quadraticCurveTo(43, -55, 51, -63); contorno(ctx, LINHA, 3); }
    }
    // enfeites
    if (d.extra === 'laco') {
      ctx.save(); ctx.translate(14, -97); ctx.rotate(-0.25);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, -9); ctx.lineTo(-15, 9); ctx.closePath(); ctx.fillStyle = '#ff3d7f'; ctx.fill(); contorno(ctx, LINHA, 2.6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -9); ctx.lineTo(15, 9); ctx.closePath(); ctx.fill(); contorno(ctx, LINHA, 2.6);
      circulo(ctx, 0, 0, 5, '#ff7aa8'); ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); contorno(ctx, LINHA, 2.4);
      ctx.restore();
    } else if (d.extra === 'oculos') {
      ctx.beginPath(); ctx.arc(31, -80, 13.5, 0, 7); contorno(ctx, '#ff5d73', 3.6);
      ctx.beginPath(); ctx.moveTo(17.5, -82); ctx.lineTo(8, -86); contorno(ctx, '#ff5d73', 3.4);
    } else if (d.extra === 'coroa') {
      ctx.beginPath(); ctx.moveTo(4, -95); ctx.lineTo(6, -112); ctx.lineTo(13, -102); ctx.lineTo(20, -116); ctx.lineTo(26, -102); ctx.lineTo(33, -110); ctx.lineTo(33, -93); ctx.closePath();
      ctx.fillStyle = '#ffd84a'; ctx.fill(); contorno(ctx, LINHA, 2.6); circulo(ctx, 20, -100, 3, '#ff4d6d');
    } else if (d.extra === 'chapeu') {
      ctx.save(); ctx.translate(18, -96); ctx.rotate(-0.25);
      ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(0, -26); ctx.lineTo(12, 2); ctx.closePath(); ctx.fillStyle = '#5ad1ff'; ctx.fill(); contorno(ctx, LINHA, 2.6);
      ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(6, -12); ctx.moveTo(-4, -17); ctx.lineTo(4, -19); contorno(ctx, '#fff', 3);
      circulo(ctx, 0, -28, 5, '#ffd84a'); ctx.restore();
    } else if (d.extra === 'flor') {
      ctx.save(); ctx.translate(12, -96);
      for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5; elipse(ctx, Math.cos(a) * 7, Math.sin(a) * 7, 6, 6, '#fff'); }
      circulo(ctx, 0, 0, 5, '#ffcf33'); ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- OBSTÁCULOS (base no y = 0, centro em x = 0) ---------- */
  function desenharObs(ctx, forma) {
    ctx.lineWidth = 3;
    if (forma === 'pedra' || forma === 'pedraLaranja') {
      var c = forma === 'pedra' ? ['#9aa3b5', '#6f7890', '#c9d0dc'] : ['#e39a5b', '#b56a35', '#f6c18f'];
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-32, -30, -12, -42); ctx.quadraticCurveTo(10, -50, 26, -30); ctx.quadraticCurveTo(34, -12, 30, 0); ctx.closePath();
      ctx.fillStyle = c[0]; ctx.fill(); contorno(ctx, LINHA, 3);
      elipse(ctx, -8, -30, 10, 6, c[2], -0.4); elipse(ctx, 14, -10, 9, 5, c[1]);
    } else if (forma === 'tronco') {
      rr(ctx, -42, -42, 84, 42, 18); ctx.fillStyle = '#a8673a'; ctx.fill(); contorno(ctx, LINHA, 3);
      ctx.beginPath(); ctx.moveTo(-26, -28); ctx.lineTo(10, -28); ctx.moveTo(-18, -14); ctx.lineTo(18, -14); contorno(ctx, '#7a4524', 3);
      elipse(ctx, 30, -21, 13, 20, '#e8b878'); ctx.beginPath(); ctx.ellipse(30, -21, 13, 20, 0, 0, 7); contorno(ctx, LINHA, 3);
      ctx.beginPath(); ctx.ellipse(30, -21, 6, 10, 0, 0, 7); contorno(ctx, '#b77c43', 2.5);
      elipse(ctx, -14, -46, 7, 4, '#62c552', -0.3);
    } else if (forma === 'arbusto') {
      [[-18, -20, 16], [16, -20, 16], [0, -34, 20]].forEach(function (b) { circulo(ctx, b[0], b[1], b[2], '#3fae4e'); ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, 7); contorno(ctx, LINHA, 3); });
      [[-18, -20, 14.5], [16, -20, 14.5], [0, -34, 18.5]].forEach(function (b) { circulo(ctx, b[0], b[1], b[2], '#3fae4e'); });
      rr(ctx, -32, -12, 64, 12, 6); ctx.fillStyle = '#3fae4e'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(32, 0); contorno(ctx, LINHA, 3);
      [[-14, -26], [6, -40], [18, -16], [-2, -18]].forEach(function (b) { circulo(ctx, b[0], b[1], 4, '#ff4d6d'); });
    } else if (forma === 'cacto' || forma === 'pinheirinho') {
      if (forma === 'cacto') {
        rr(ctx, -12, -66, 24, 66, 12); ctx.fillStyle = '#4fbf6a'; ctx.fill(); contorno(ctx, LINHA, 3);
        rr(ctx, -26, -46, 12, 26, 6); ctx.fill(); contorno(ctx, LINHA, 3);
        rr(ctx, 14, -54, 12, 24, 6); ctx.fill(); contorno(ctx, LINHA, 3);
        rr(ctx, -10, -64, 20, 62, 10); ctx.fillStyle = '#4fbf6a'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2, -56); ctx.lineTo(-2, -10); ctx.moveTo(5, -48); ctx.lineTo(5, -16); contorno(ctx, '#2f9150', 2.5);
        circulo(ctx, 0, -68, 6, '#ff7ac6');
      } else {
        ctx.beginPath(); ctx.moveTo(0, -64); ctx.lineTo(24, -22); ctx.lineTo(14, -22); ctx.lineTo(28, -4); ctx.lineTo(-28, -4); ctx.lineTo(-14, -22); ctx.lineTo(-24, -22); ctx.closePath();
        ctx.fillStyle = '#2f9e6b'; ctx.fill(); contorno(ctx, LINHA, 3);
        ctx.beginPath(); ctx.moveTo(0, -64); ctx.lineTo(10, -46); ctx.lineTo(-10, -46); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
        rr(ctx, -5, -6, 10, 6, 2); ctx.fillStyle = '#8a5a35'; ctx.fill();
      }
    } else if (forma === 'cactoBola') {
      circulo(ctx, 0, -24, 26, '#5cc777'); ctx.beginPath(); ctx.arc(0, -24, 26, 0, 7); contorno(ctx, LINHA, 3);
      ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, -2); ctx.moveTo(-12, -44); ctx.quadraticCurveTo(-20, -24, -12, -4); ctx.moveTo(12, -44); ctx.quadraticCurveTo(20, -24, 12, -4); contorno(ctx, '#2f9150', 2.5);
      [[-8, -50], [6, -51]].forEach(function (b) { circulo(ctx, b[0], b[1], 5, '#ffcf33'); });
    } else if (forma === 'gelo') {
      rr(ctx, -30, -52, 60, 52, 10); ctx.fillStyle = '#a7e3ff'; ctx.fill(); contorno(ctx, LINHA, 3);
      ctx.beginPath(); ctx.moveTo(-18, -40); ctx.lineTo(-6, -40); ctx.moveTo(-18, -30); ctx.lineTo(-12, -30); contorno(ctx, '#fff', 4);
      rr(ctx, -30, -56, 60, 10, 5); ctx.fillStyle = '#fff'; ctx.fill();
    } else if (forma === 'boneco') {
      circulo(ctx, 0, -20, 22, '#fff'); ctx.beginPath(); ctx.arc(0, -20, 22, 0, 7); contorno(ctx, LINHA, 3);
      circulo(ctx, 0, -52, 15, '#fff'); ctx.beginPath(); ctx.arc(0, -52, 15, 0, 7); contorno(ctx, LINHA, 3);
      circulo(ctx, -5, -56, 2.4, LINHA); circulo(ctx, 5, -56, 2.4, LINHA);
      ctx.beginPath(); ctx.moveTo(0, -51); ctx.lineTo(14, -48); ctx.lineTo(0, -46); ctx.closePath(); ctx.fillStyle = '#ff8a2a'; ctx.fill();
      rr(ctx, -14, -40, 28, 7, 3); ctx.fillStyle = '#ff4d6d'; ctx.fill();
      circulo(ctx, 0, -24, 2.5, LINHA); circulo(ctx, 0, -14, 2.5, LINHA);
    }
  }

  /* ---------- FRUTAS e ESTRELA (centro em 0,0) ---------- */
  function desenharFruta(ctx, f) {
    ctx.lineWidth = 2.6;
    if (f === 0) { // maçã
      circulo(ctx, -6, 2, 15, '#ff3b4e'); circulo(ctx, 6, 2, 15, '#ff3b4e');
      ctx.beginPath(); ctx.arc(-6, 2, 15, 0, 7); contorno(ctx, LINHA, 2.6); ctx.beginPath(); ctx.arc(6, 2, 15, 0, 7); contorno(ctx, LINHA, 2.6);
      circulo(ctx, -6, 2, 13.6, '#ff3b4e'); circulo(ctx, 6, 2, 13.6, '#ff3b4e');
      elipse(ctx, -8, -4, 4, 6, 'rgba(255,255,255,.55)', 0.4);
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(2, -20); contorno(ctx, '#6b3d1f', 3);
      elipse(ctx, 9, -18, 7, 3.5, '#4fc256', -0.5);
    } else if (f === 1) { // banana
      ctx.beginPath(); ctx.moveTo(-18, -10); ctx.quadraticCurveTo(-14, 18, 18, 10); ctx.quadraticCurveTo(-4, 8, -10, -12); ctx.closePath();
      ctx.fillStyle = '#ffd93b'; ctx.fill(); contorno(ctx, LINHA, 2.6);
      circulo(ctx, -14, -12, 3, '#6b3d1f');
    } else if (f === 2) { // morango
      ctx.beginPath(); ctx.moveTo(-16, -8); ctx.quadraticCurveTo(-14, 16, 0, 20); ctx.quadraticCurveTo(14, 16, 16, -8); ctx.quadraticCurveTo(0, -14, -16, -8); ctx.closePath();
      ctx.fillStyle = '#ff3b5c'; ctx.fill(); contorno(ctx, LINHA, 2.6);
      [[-7, -1], [5, -2], [-2, 7], [8, 8], [-8, 9], [1, 14]].forEach(function (s) { elipse(ctx, s[0], s[1], 1.5, 2.2, '#ffe680'); });
      ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-4, -18); ctx.lineTo(0, -11); ctx.lineTo(5, -18); ctx.lineTo(12, -10); ctx.closePath(); ctx.fillStyle = '#4fc256'; ctx.fill(); contorno(ctx, LINHA, 2.2);
    } else if (f === 3) { // uva
      [[-8, -6], [8, -6], [0, -8], [-5, 4], [5, 4], [0, 13]].forEach(function (u) { circulo(ctx, u[0], u[1], 7.5, '#9b5cff'); ctx.beginPath(); ctx.arc(u[0], u[1], 7.5, 0, 7); contorno(ctx, LINHA, 2.2); circulo(ctx, u[0] - 2, u[1] - 2, 2, 'rgba(255,255,255,.6)'); });
      elipse(ctx, 6, -17, 7, 3.5, '#4fc256', -0.4);
    } else if (f === 4) { // laranja
      circulo(ctx, 0, 2, 17, '#ff9a1f'); ctx.beginPath(); ctx.arc(0, 2, 17, 0, 7); contorno(ctx, LINHA, 2.6);
      elipse(ctx, -6, -4, 4, 6, 'rgba(255,255,255,.5)', 0.4); elipse(ctx, 5, -16, 7, 3.5, '#4fc256', -0.3);
    } else { // melancia
      ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(20, -8); ctx.arc(0, -8, 20, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#3fae4e'; ctx.fill(); contorno(ctx, LINHA, 2.6);
      ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(16, -8); ctx.arc(0, -8, 16, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#ff4d6d'; ctx.fill();
      [[-8, -2], [0, 2], [8, -2]].forEach(function (s) { elipse(ctx, s[0], s[1], 1.6, 2.6, LINHA); });
    }
  }
  function desenharEstrela(ctx) {
    var g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40); g.addColorStop(0, 'rgba(255,255,200,.9)'); g.addColorStop(1, 'rgba(255,220,80,0)');
    circulo(ctx, 0, 0, 40, g);
    estrelaPath(ctx, 0, 0, 27, 12, 5); ctx.fillStyle = '#ffd23f'; ctx.fill(); contorno(ctx, LINHA, 3);
    estrelaPath(ctx, -2, -2, 15, 7, 5); ctx.fillStyle = '#fff3a8'; ctx.fill();
    circulo(ctx, -5, -2, 2.4, LINHA); circulo(ctx, 5, -2, 2.4, LINHA);
    ctx.beginPath(); ctx.arc(0, 3, 5, 0.2, Math.PI - 0.2); contorno(ctx, LINHA, 2);
  }
  function desenharNinho(ctx) {
    // ovos
    [[-34, -36, '#fff6e0', '#7fd6ff'], [0, -46, '#fff6e0', '#ff86bd'], [34, -36, '#fff6e0', '#a5e86b']].forEach(function (o) {
      elipse(ctx, o[0], o[1], 20, 26, o[2]); ctx.beginPath(); ctx.ellipse(o[0], o[1], 20, 26, 0, 0, 7); contorno(ctx, LINHA, 3);
      circulo(ctx, o[0] - 6, o[1] - 8, 4.5, o[3]); circulo(ctx, o[0] + 7, o[1] + 2, 5.5, o[3]); circulo(ctx, o[0] - 3, o[1] + 12, 3.5, o[3]);
    });
    // ninho de gravetos
    ctx.beginPath(); ctx.moveTo(-80, -26); ctx.quadraticCurveTo(-70, 6, 0, 6); ctx.quadraticCurveTo(70, 6, 80, -26); ctx.quadraticCurveTo(0, -6, -80, -26); ctx.closePath();
    ctx.fillStyle = '#b77a3f'; ctx.fill(); contorno(ctx, LINHA, 3.4);
    ctx.strokeStyle = '#7b4a22'; ctx.lineWidth = 3;
    for (var i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-72 + i * 17, -18 + (i % 2) * 6); ctx.lineTo(-56 + i * 17, -4 - (i % 2) * 8); ctx.stroke(); }
  }

  /* ---------- figurinhas (cache) ---------- */
  var cache = {};
  function figura(chave, w, h, ox, oy, s, fn) {
    var k = chave + '@' + s.toFixed(3);
    if (cache[k]) return cache[k];
    var c = tela(w * s, h * s), ctx = c.getContext('2d');
    ctx.scale(s, s); ctx.translate(ox, oy); fn(ctx);
    cache[k] = { c: c, ox: ox * s, oy: oy * s };
    return cache[k];
  }
  // Figurinhas: desenhar com ctx.drawImage(f.c, x - f.ox, y - f.oy)
  function figDino(id, q, s) { return figura('d:' + id + ':' + q, 136, 132, 72, 122, s, function (ctx) { desenharDino(ctx, dino(id), q); }); }
  function figObs(forma, s) { return figura('o:' + forma, 100, 84, 50, 76, s, function (ctx) { desenharObs(ctx, forma); }); }
  function figFruta(f, s) { return figura('f:' + f, 52, 52, 26, 26, s, function (ctx) { desenharFruta(ctx, f); }); }
  function figEstrela(s) { return figura('e', 84, 84, 42, 42, s, function (ctx) { desenharEstrela(ctx); }); }
  function figNinho(s) { return figura('n', 180, 90, 90, 80, s, function (ctx) { desenharNinho(ctx); }); }

  /* Imagem (data URL) de um dino, para o celular e para os placares. */
  var urls = {};
  function urlDino(id, q, tam) {
    var k = id + ':' + (q || 'parado') + ':' + (tam || 160);
    if (urls[k]) return urls[k];
    var t = tam || 160, s = t / 136, c = tela(t, t), ctx = c.getContext('2d');
    ctx.translate(0, (t - 132 * s) / 2 + 6 * s); ctx.scale(s, s); ctx.translate(72, 122);
    desenharDino(ctx, dino(id), q || 'parado');
    try { urls[k] = c.toDataURL('image/png'); } catch (e) { urls[k] = ''; }
    return urls[k];
  }
  var urlsF = {};
  function urlFruta(f, tam) {
    var k = f + ':' + tam; if (urlsF[k]) return urlsF[k];
    var t = tam || 48, c = tela(t, t), ctx = c.getContext('2d'); ctx.scale(t / 52, t / 52); ctx.translate(26, 26); desenharFruta(ctx, f);
    try { urlsF[k] = c.toDataURL('image/png'); } catch (e) { urlsF[k] = ''; }
    return urlsF[k];
  }

  /* ---------- CENÁRIOS (floresta, deserto, neve) ---------- */
  var BIOMAS = [
    { nome: 'Floresta', ceu: ['#6fc6ff', '#c9ecff'], longe: '#8fd17c', longe2: '#6bbd6b', chao: ['#7fd35d', '#5fb846'], trilha: '#d9a868', trilhaBorda: '#b98446', tufo: '#4ea83a', sol: '#ffe36b' },
    { nome: 'Deserto', ceu: ['#ffb76b', '#ffe7b8'], longe: '#f1b56f', longe2: '#e09a55', chao: ['#f7d58e', '#efc172'], trilha: '#e6a964', trilhaBorda: '#c98647', tufo: '#d79a4a', sol: '#fff3a0' },
    { nome: 'Neve', ceu: ['#86b6ff', '#e3efff'], longe: '#dfeaff', longe2: '#b8cdf2', chao: ['#f6fbff', '#e2eefb'], trilha: '#c5d8ef', trilhaBorda: '#9fb7d8', tufo: '#a9c4e6', sol: '#fff7d6' }
  ];

  // Camada de longe (montanhas/dunas) e do meio (árvores, cactos, pinheiros): tiras que se repetem
  function camadaLonge(b, w, h) {
    var c = tela(w, h), ctx = c.getContext('2d'), B = BIOMAS[b];
    function morros(cor, base, alt, n, fase, pontudo) {
      ctx.beginPath(); ctx.moveTo(0, h);
      for (var x = 0; x <= w; x += 8) {
        var t = x / w * Math.PI * 2 * n + fase, y = base - alt * (0.55 + 0.45 * Math.sin(t)) * (pontudo ? (0.7 + 0.3 * Math.abs(Math.sin(t * 2.5))) : 1);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = cor; ctx.fill();
    }
    morros(B.longe, h * 0.75, h * 0.6, 2, 0.5, b === 2);
    if (b === 2) { // neve no topo das montanhas
      ctx.save(); ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h * 0.32); ctx.restore();
    }
    morros(B.longe2, h, h * 0.45, 3, 2.1, false);
    return c;
  }
  function camadaMeio(b, w, h) {
    var c = tela(w, h), ctx = c.getContext('2d'), rnd = semente(b * 31 + 5);
    var base = h;
    for (var i = 0; i < 9; i++) {
      var x = (i + 0.2 + rnd() * 0.6) * w / 9, s = 0.75 + rnd() * 0.5;
      ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
      if (b === 0) { // árvore redonda
        rr(ctx, -7, -60, 14, 60, 5); ctx.fillStyle = '#9a6337'; ctx.fill();
        circulo(ctx, 0, -80, 34, '#45b34e'); circulo(ctx, -24, -62, 24, '#45b34e'); circulo(ctx, 24, -62, 24, '#45b34e');
        circulo(ctx, -8, -90, 14, '#62c95e');
        if (rnd() < 0.5) { circulo(ctx, 12, -70, 4.5, '#ff4d6d'); circulo(ctx, -16, -64, 4.5, '#ff4d6d'); }
      } else if (b === 1) { // cacto alto ou palmeira
        if (rnd() < 0.6) {
          rr(ctx, -10, -96, 20, 96, 10); ctx.fillStyle = '#5ab873'; ctx.fill();
          rr(ctx, -30, -66, 12, 34, 6); ctx.fill(); rr(ctx, -30, -40, 30, 12, 6); ctx.fill();
          rr(ctx, 18, -80, 12, 34, 6); ctx.fill(); rr(ctx, 0, -54, 30, 12, 6); ctx.fill();
        } else {
          ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-2, -60, 10, -110); ctx.lineTo(18, -108); ctx.quadraticCurveTo(6, -60, 8, 0); ctx.closePath(); ctx.fillStyle = '#b07a45'; ctx.fill();
          ctx.fillStyle = '#4fb05a';
          [-2.6, -1.9, -1.2, -0.5, 0.2].forEach(function (a) { ctx.beginPath(); ctx.ellipse(14 + Math.cos(a) * 26, -110 + Math.sin(a) * 14, 30, 8, a, 0, 7); ctx.fill(); });
        }
      } else { // pinheiro com neve
        rr(ctx, -6, -24, 12, 24, 3); ctx.fillStyle = '#8a5a35'; ctx.fill();
        [[0, -120, 30], [0, -86, 40], [0, -52, 50]].forEach(function (p) {
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[1] + 52); ctx.lineTo(-p[2], p[1] + 52); ctx.closePath(); ctx.fillStyle = '#2f9e6b'; ctx.fill();
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2] * 0.4, p[1] + 20); ctx.lineTo(-p[2] * 0.4, p[1] + 20); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
        });
      }
      ctx.restore();
    }
    return c;
  }
  function semente(s) { var a = s >>> 0 || 1; return function () { a = a * 1664525 + 1013904223 >>> 0; return a / 4294967296; }; }

  function nuvem(ctx, x, y, s, alfa) {
    ctx.globalAlpha = alfa;
    elipse(ctx, x, y, 46 * s, 20 * s, '#fff'); elipse(ctx, x - 30 * s, y + 4 * s, 28 * s, 15 * s, '#fff'); elipse(ctx, x + 32 * s, y + 4 * s, 30 * s, 15 * s, '#fff'); elipse(ctx, x + 6 * s, y - 14 * s, 26 * s, 20 * s, '#fff');
    ctx.globalAlpha = 1;
  }

  window.Arte = {
    DINOS: DINOS, BIOMAS: BIOMAS, dino: dino, desenharDino: desenharDino, figDino: figDino, figObs: figObs, figFruta: figFruta,
    figEstrela: figEstrela, figNinho: figNinho, urlDino: urlDino, urlFruta: urlFruta, camadaLonge: camadaLonge, camadaMeio: camadaMeio,
    nuvem: nuvem, tela: tela, estrelaPath: estrelaPath, circulo: circulo, elipse: elipse, rr: rr
  };
})();
