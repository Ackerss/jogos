/* Pinta-Chão dos Bichos — os DESENHOS (feitos em código, sem arquivos de imagem): bichinhos, itens, porquinho de lama,
   obstáculos e os três cenários (Jardim, Neve e Lua). Tudo vira "figurinha" (canvas guardado) e depois só é copiado na tela.
   Coordenadas dos bichos: os pés ficam em (0,0) e para cima é negativo. */
(function () {
  'use strict';
  var LINHA = '#2b2140';
  var BICHOS = [
    { id: 'gata', nome: 'Mimi', cor: '#ff4f9a', corpo: '#ff8cc0', escuro: '#d93a80', barriga: '#ffe3f0' },
    { id: 'pinguim', nome: 'Pingo', cor: '#2f8cff', corpo: '#4c8fe6', escuro: '#2a5fb8', barriga: '#ffffff' },
    { id: 'pintinho', nome: 'Piu', cor: '#ffc21a', corpo: '#ffd94a', escuro: '#e8a400', barriga: '#fff4bf' },
    { id: 'sapo', nome: 'Sapeca', cor: '#2fc24f', corpo: '#6fd46a', escuro: '#2a9a3c', barriga: '#e2f9c4' },
    { id: 'coelha', nome: 'Lulu', cor: '#9b5cff', corpo: '#bb98ff', escuro: '#7a45e0', barriga: '#f1e8ff' },
    { id: 'raposa', nome: 'Foguinho', cor: '#ff7a1a', corpo: '#ff9b4f', escuro: '#d85d14', barriga: '#fff1e2' }
  ];
  var EQUIPES = [
    { nome: 'Time Rosa', cor: '#ff3d8b', claro: '#ffd0e4' },
    { nome: 'Time Azul', cor: '#1f86ff', claro: '#cfe4ff' }
  ];
  var LAMA = '#7a5230';
  function bicho(id) { for (var i = 0; i < BICHOS.length; i++) if (BICHOS[i].id === id) return BICHOS[i]; return BICHOS[0]; }

  /* ---------- utilidades ---------- */
  function tela(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function elipse(ctx, x, y, rx, ry, cor, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill(); }
  function circulo(ctx, x, y, r, cor) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill(); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function contorno(ctx, l, cor) { ctx.strokeStyle = cor || LINHA; ctx.lineWidth = l || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  function forma(ctx, cor, l) { ctx.fillStyle = cor; ctx.fill(); contorno(ctx, l); }
  function el(ctx, x, y, rx, ry, cor, rot, l) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); forma(ctx, cor, l); }
  function estrelaPath(ctx, x, y, r1, r2, pontas) {
    ctx.beginPath();
    for (var i = 0; i < pontas * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / pontas, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }
  function tri(ctx, ax, ay, bx, by, cx, cy) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); }
  function clarear(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * k); g = Math.round(g + (255 - g) * k); b = Math.round(b + (255 - b) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function escurecer(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgb(' + Math.round((n >> 16) * (1 - k)) + ',' + Math.round(((n >> 8) & 255) * (1 - k)) + ',' + Math.round((n & 255) * (1 - k)) + ')';
  }

  /* ---------- BICHINHO (de frente) ----------
     q: 'parado' | 'anda0' | 'anda1' | 'feliz' | 'costas'.  olhar: 'c' | 'b' | 'e' | 'd' | '' (para onde as pupilas olham) */
  function desenharBicho(ctx, b, q, olhar) {
    var costas = q === 'costas', feliz = q === 'feliz', e = b.id;
    var p1 = q === 'anda0' ? -6 : 0, p2 = q === 'anda1' ? -6 : 0;
    var pe = e === 'pinguim' || e === 'pintinho' ? '#ff9f1c' : b.escuro;
    // rabo atrás (de frente)
    if (!costas) rabo(ctx, b, false);
    // pés
    el(ctx, -10, -4 + p1, 9, 5.5, pe, 0, 3); el(ctx, 10, -4 + p2, 9, 5.5, pe, 0, 3);
    // corpo
    el(ctx, 0, -21, 19, 17, b.corpo, 0, 3.2);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -21, 17.4, 15.4, 0, 0, 7); ctx.clip();
    elipse(ctx, 0, -5, 22, 8, 'rgba(40,20,60,.16)');
    if (!costas) elipse(ctx, 0, -18, 12, 11, b.barriga);
    ctx.restore();
    // bracinhos
    if (e === 'pinguim' || e === 'pintinho') {
      var ang = feliz ? -1.0 : 0.35;
      el(ctx, -18, -24, 5.5, 11, b.escuro, ang, 3); el(ctx, 18, -24, 5.5, 11, b.escuro, -ang, 3);
    } else if (feliz) {
      el(ctx, -20, -34, 5.5, 8, b.corpo, -0.5, 3); el(ctx, 20, -34, 5.5, 8, b.corpo, 0.5, 3);
    } else {
      el(ctx, -17, -21 + p2 * 0.4, 5.5, 7.5, b.corpo, 0.4, 3); el(ctx, 17, -21 + p1 * 0.4, 5.5, 7.5, b.corpo, -0.4, 3);
    }
    // orelhas (atrás da cabeça)
    orelhas(ctx, b, costas);
    // cabeça
    if (e === 'sapo') el(ctx, 0, -46, 26, 20, b.corpo, 0, 3.2);
    else el(ctx, 0, -48, 23, 22, b.corpo, 0, 3.2);
    ctx.save(); ctx.beginPath(); if (e === 'sapo') ctx.ellipse(0, -46, 24.4, 18.4, 0, 0, 7); else ctx.ellipse(0, -48, 21.4, 20.4, 0, 0, 7); ctx.clip();
    elipse(ctx, 0, -28, 28, 9, 'rgba(40,20,60,.13)');
    elipse(ctx, -9, -63, 8, 4, 'rgba(255,255,255,.45)', -0.4);
    ctx.restore();
    if (costas) { rabo(ctx, b, true); if (e === 'pintinho') topete(ctx, b); return; }
    rosto(ctx, b, feliz, olhar);
  }
  function rabo(ctx, b, costas) {
    var e = b.id;
    if (e === 'gata') {
      ctx.beginPath(); ctx.moveTo(costas ? 0 : 14, -14); ctx.bezierCurveTo(costas ? 4 : 34, -16, costas ? 22 : 34, -40, costas ? 12 : 26, -46);
      ctx.strokeStyle = LINHA; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = b.corpo; ctx.lineWidth = 5.5; ctx.stroke();
    } else if (e === 'raposa') {
      var x = costas ? 0 : 22, y = costas ? -14 : -24;
      el(ctx, x, y, 11, 17, b.corpo, costas ? 0 : 0.5, 3);
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, 9.6, 15.6, costas ? 0 : 0.5, 0, 7); ctx.clip();
      circulo(ctx, x + (costas ? 0 : 6), y - 13, 9, '#fff'); ctx.restore();
    } else if (e === 'coelha' && costas) {
      el(ctx, 0, -12, 8, 7.5, '#fff', 0, 3);
    } else if (e === 'pintinho' && costas) {
      tri(ctx, -6, -12, 6, -12, 0, -2); forma(ctx, b.escuro, 2.5);
    }
  }
  function orelhas(ctx, b, costas) {
    var e = b.id;
    if (e === 'gata') {
      [-1, 1].forEach(function (s) { tri(ctx, s * 21, -54, s * 6, -66, s * 20, -76); forma(ctx, b.corpo, 3); if (!costas) { tri(ctx, s * 18, -58, s * 10, -65, s * 18, -71); ctx.fillStyle = '#ffc2dc'; ctx.fill(); } });
    } else if (e === 'raposa') {
      [-1, 1].forEach(function (s) { tri(ctx, s * 22, -52, s * 5, -64, s * 22, -80); forma(ctx, b.corpo, 3); tri(ctx, s * 21.5, -71, s * 17, -68, s * 21.5, -79); ctx.fillStyle = LINHA; ctx.fill(); if (!costas) { tri(ctx, s * 19, -58, s * 11, -63, s * 19, -70); ctx.fillStyle = '#fff1e2'; ctx.fill(); } });
    } else if (e === 'coelha') {
      [-1, 1].forEach(function (s) { el(ctx, s * 10, -80, 7.5, 21, b.corpo, s * 0.12, 3); if (!costas) elipse(ctx, s * 10, -80, 3.8, 15, '#ffc2dc', s * 0.12); });
    } else if (e === 'sapo') {
      [-1, 1].forEach(function (s) { el(ctx, s * 13, -62, 11, 10.5, b.corpo, 0, 3); });
    }
  }
  function topete(ctx, b) {
    ctx.strokeStyle = LINHA; ctx.lineWidth = 3; ctx.lineCap = 'round';
    [[-6, -66, -9, -78], [0, -68, 1, -82], [6, -66, 10, -77]].forEach(function (t) {
      ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.quadraticCurveTo(t[0], t[3] + 4, t[2], t[3]); ctx.strokeStyle = LINHA; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = b.corpo; ctx.lineWidth = 2.6; ctx.stroke();
    });
  }
  function olho(ctx, x, y, rx, ry, olhar, feliz) {
    if (feliz) { ctx.beginPath(); ctx.arc(x, y + 2, rx * 0.8, Math.PI * 1.1, Math.PI * 1.9); contorno(ctx, 3.4); return; }
    el(ctx, x, y, rx, ry, '#fff', 0, 2.6);
    var ox = olhar === 'e' ? -rx * 0.38 : olhar === 'd' ? rx * 0.38 : 0, oy = olhar === 'c' ? -ry * 0.4 : olhar === 'b' ? ry * 0.38 : ry * 0.12;
    circulo(ctx, x + ox, y + oy, rx * 0.62, LINHA);
    circulo(ctx, x + ox - rx * 0.22, y + oy - ry * 0.25, rx * 0.24, '#fff');
  }
  function rosto(ctx, b, feliz, olhar) {
    var e = b.id;
    if (e === 'pinguim') { el(ctx, 0, -44, 17, 15, '#fff', 0, 0.01); elipse(ctx, -8, -44, 10, 13, '#fff'); elipse(ctx, 8, -44, 10, 13, '#fff'); }
    if (e === 'raposa') { ctx.beginPath(); ctx.ellipse(0, -38, 15, 10, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff1e2'; ctx.fill(); }
    if (e === 'sapo') { olho(ctx, -13, -63, 7, 7.5, olhar, feliz); olho(ctx, 13, -63, 7, 7.5, olhar, feliz); }
    else { olho(ctx, -9, -50, 6.5, 7.5, olhar, feliz); olho(ctx, 9, -50, 6.5, 7.5, olhar, feliz); }
    // bochechas
    elipse(ctx, -15, -39, 4.5, 3, 'rgba(255,80,120,.4)'); elipse(ctx, 15, -39, 4.5, 3, 'rgba(255,80,120,.4)');
    if (e === 'pinguim' || e === 'pintinho') {
      tri(ctx, -5, -42, 5, -42, 0, feliz ? -33 : -35); forma(ctx, '#ff9f1c', 2.4);
      if (feliz) { tri(ctx, -4, -37, 4, -37, 0, -31); ctx.fillStyle = '#e8711c'; ctx.fill(); }
      if (e === 'pintinho') topete(ctx, b);
      return;
    }
    if (e === 'gata') {
      tri(ctx, -3, -42, 3, -42, 0, -39); forma(ctx, '#ff7aa8', 1.6);
      ctx.strokeStyle = LINHA; ctx.lineWidth = 1.8;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s * 12, -41); ctx.lineTo(s * 25, -44); ctx.moveTo(s * 12, -38); ctx.lineTo(s * 25, -37); ctx.stroke(); });
    }
    if (e === 'raposa') circulo(ctx, 0, -41, 3.2, LINHA);
    if (e === 'coelha') { el(ctx, 0, -41, 3, 2.2, '#ff7aa8', 0, 1.4); }
    // boca
    ctx.beginPath();
    if (feliz) { ctx.arc(0, -36, e === 'sapo' ? 9 : 6, 0.1, Math.PI - 0.1); ctx.closePath(); forma(ctx, '#ff5d7a', 2.4); }
    else if (e === 'sapo') { ctx.arc(0, -44, 12, 0.35, Math.PI - 0.35); contorno(ctx, 2.8); }
    else { ctx.moveTo(-5, -37); ctx.quadraticCurveTo(-2.5, -34, 0, -37); ctx.quadraticCurveTo(2.5, -34, 5, -37); contorno(ctx, 2.4); }
    if (e === 'coelha' && !feliz) { rr(ctx, -3.5, -36.5, 7, 5, 1.5); forma(ctx, '#fff', 1.6); }
  }

  /* ---------- itens ---------- */
  function desenharBalde(ctx) {
    // balde com tinta de arco-íris espirrando
    ctx.beginPath(); ctx.moveTo(-16, -30); ctx.lineTo(16, -30); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.closePath(); forma(ctx, '#9fb3c8', 3);
    ctx.fillStyle = '#c9d6e3'; ctx.fillRect(-12, -27, 6, 24);
    el(ctx, 0, -30, 16, 5, '#5a6b80', 0, 3);
    ctx.beginPath(); ctx.arc(0, -30, 19, Math.PI * 1.08, Math.PI * 1.92); contorno(ctx, 3);
    [['#ff4f9a', -9, -38, 7], ['#ffc21a', 0, -43, 8], ['#2f8cff', 9, -38, 7], ['#2fc24f', -3, -51, 5], ['#9b5cff', 7, -50, 4.5]].forEach(function (g) { el(ctx, g[1], g[2], g[3], g[3], g[0], 0, 2.4); });
    // escorrendo
    ctx.beginPath(); ctx.moveTo(-12, -30); ctx.quadraticCurveTo(-14, -20, -10, -17); ctx.quadraticCurveTo(-7, -20, -6, -30); forma(ctx, '#ff4f9a', 2.2);
  }
  function desenharPincel(ctx) {
    ctx.save(); ctx.rotate(-0.6);
    rr(ctx, -5, -46, 10, 30, 4); forma(ctx, '#c98a4a', 3);
    rr(ctx, -8, -18, 16, 8, 2); forma(ctx, '#c0c9d6', 3);
    ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.quadraticCurveTo(12, 4, 0, 10); ctx.quadraticCurveTo(-12, 4, -10, -10); forma(ctx, '#ff4f9a', 3);
    ctx.save(); ctx.clip(); ctx.fillStyle = '#ffc21a'; ctx.fillRect(-12, -2, 24, 5); ctx.fillStyle = '#2f8cff'; ctx.fillRect(-12, 3, 24, 8); ctx.restore();
    ctx.restore();
  }
  function desenharRaio(ctx) {
    circulo(ctx, 0, -20, 22, '#fff7b0'); ctx.beginPath(); ctx.arc(0, -20, 22, 0, 7); contorno(ctx, 3);
    ctx.beginPath(); ctx.moveTo(4, -40); ctx.lineTo(-10, -18); ctx.lineTo(0, -18); ctx.lineTo(-5, 0); ctx.lineTo(11, -24); ctx.lineTo(1, -24); ctx.closePath(); forma(ctx, '#ffc21a', 3);
  }

  /* ---------- porquinho de lama ---------- */
  function desenharPorco(ctx, q) {
    var p1 = q === 'anda0' ? -5 : 0, p2 = q === 'anda1' ? -5 : 0, rosa = '#ffaac6', esc = '#e57aa0';
    el(ctx, -9, -4 + p1, 7, 5, esc, 0, 3); el(ctx, 9, -4 + p2, 7, 5, esc, 0, 3);
    el(ctx, 0, -20, 21, 17, rosa, 0, 3);
    [-1, 1].forEach(function (s) { tri(ctx, s * 19, -42, s * 8, -52, s * 22, -58); forma(ctx, rosa, 3); });
    el(ctx, 0, -40, 20, 17, rosa, 0, 3);
    // lama
    [[-12, -22, 7, 5], [10, -14, 6, 4], [8, -48, 5, 3.5], [-14, -44, 4, 3], [2, -8, 5, 3]].forEach(function (l) { elipse(ctx, l[0], l[1], l[2], l[3], LAMA, 0.3); });
    // olhos e focinho
    circulo(ctx, -7, -44, 3.2, LINHA); circulo(ctx, 7, -44, 3.2, LINHA); circulo(ctx, -8, -45, 1.1, '#fff'); circulo(ctx, 6, -45, 1.1, '#fff');
    el(ctx, 0, -34, 8.5, 6, '#ff8fb5', 0, 2.6); elipse(ctx, -3, -34, 1.6, 2.4, LINHA); elipse(ctx, 3, -34, 1.6, 2.4, LINHA);
  }

  /* ---------- obstáculos (um por quadradinho) ---------- */
  function desenharObs(ctx, tema, k) {
    if (tema === 0 && k === 0) { // vaso de flores
      ctx.beginPath(); ctx.moveTo(-17, -26); ctx.lineTo(17, -26); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.closePath(); forma(ctx, '#e0784a', 3);
      rr(ctx, -20, -32, 40, 9, 3); forma(ctx, '#f08a5a', 3);
      [[-12, -44, '#ff5d8f'], [0, -54, '#ffd23f'], [12, -44, '#a77bff']].forEach(function (f) {
        ctx.strokeStyle = '#3f9c3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f[0] * 0.5, -32); ctx.lineTo(f[0], f[1]); ctx.stroke();
        for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2; circulo(ctx, f[0] + Math.cos(a) * 5.5, f[1] + Math.sin(a) * 5.5, 4.5, f[2]); }
        circulo(ctx, f[0], f[1], 3.4, '#fff3a0');
      });
    } else if (tema === 0) { // arbusto
      [[-12, -16, 15], [12, -16, 15], [0, -30, 18]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, 7); forma(ctx, '#3fae4e', 3); });
      [[-12, -16, 13.5], [12, -16, 13.5], [0, -30, 16.5]].forEach(function (c) { circulo(ctx, c[0], c[1], c[2], '#3fae4e'); });
      circulo(ctx, -6, -36, 6, '#6cd06a'); [[-10, -20], [8, -32], [14, -12]].forEach(function (c) { circulo(ctx, c[0], c[1], 3.5, '#ff4d6d'); });
    } else if (tema === 1 && k === 0) { // boneco de neve
      el(ctx, 0, -14, 17, 15, '#fff', 0, 3); el(ctx, 0, -38, 12.5, 12, '#fff', 0, 3);
      rr(ctx, -10, -62, 20, 14, 3); forma(ctx, '#3a3f5c', 3); rr(ctx, -15, -50, 30, 5, 2); forma(ctx, '#3a3f5c', 3);
      circulo(ctx, -4, -41, 2.2, LINHA); circulo(ctx, 4, -41, 2.2, LINHA);
      tri(ctx, 0, -37, 0, -33, 10, -35); forma(ctx, '#ff8c1a', 1.6);
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(-12, -28, 24, 5);
    } else if (tema === 1) { // pinheiro com neve
      rr(ctx, -4, -12, 8, 12, 2); forma(ctx, '#8a5a3a', 3);
      [[-22, -10, 22, -10, 0, -38], [-18, -26, 18, -26, 0, -52], [-13, -40, 13, -40, 0, -64]].forEach(function (t) { tri(ctx, t[0], t[1], t[2], t[3], t[4], t[5]); forma(ctx, '#2f9a6a', 3); });
      tri(ctx, -7, -54, 7, -54, 0, -64); ctx.fillStyle = '#fff'; ctx.fill();
      [[-10, -30], [9, -20], [-4, -16]].forEach(function (c) { elipse(ctx, c[0], c[1], 5, 2.5, '#fff'); });
    } else if (k === 0) { // foguetinho
      el(ctx, 0, -12, 6, 10, '#ff9f1c', 0, 0.01); el(ctx, 0, -8, 3, 6, '#ffe066', 0, 0.01);
      tri(ctx, -10, -18, -18, -6, -10, -6); forma(ctx, '#ff4d6d', 3); tri(ctx, 10, -18, 18, -6, 10, -6); forma(ctx, '#ff4d6d', 3);
      ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(11, -14); ctx.quadraticCurveTo(14, -44, 0, -64); ctx.quadraticCurveTo(-14, -44, -11, -14); forma(ctx, '#f2f4fb', 3);
      el(ctx, 0, -36, 6, 6, '#7fd6ff', 0, 3);
      ctx.beginPath(); ctx.moveTo(-8, -50); ctx.quadraticCurveTo(0, -46, 8, -50); ctx.lineTo(4, -58); ctx.quadraticCurveTo(0, -64, -4, -58); ctx.closePath(); ctx.fillStyle = '#ff4d6d'; ctx.fill();
    } else { // pedra da lua
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-24, -20, -10, -28); ctx.quadraticCurveTo(4, -36, 16, -24); ctx.quadraticCurveTo(26, -10, 20, 0); ctx.closePath(); forma(ctx, '#9d97b8', 3);
      elipse(ctx, -6, -16, 5, 3.5, '#7f7a9c'); elipse(ctx, 8, -8, 3.5, 2.5, '#7f7a9c'); elipse(ctx, -8, -24, 6, 2.5, 'rgba(255,255,255,.3)', -0.3);
    }
  }

  /* ---------- figurinhas (cache) ---------- */
  var cache = {}, RES = 1;
  function figura(chave, w, h, ox, oy, s, fn) {
    var k = chave + '@' + s + '@' + RES, f = cache[k]; if (f) return f;
    var r = s * RES, c = tela(w * r, h * r), ctx = c.getContext('2d');
    ctx.scale(r, r); ctx.translate(ox, oy); fn(ctx);
    f = cache[k] = { c: c, w: w * s, h: h * s, ox: ox * s, oy: oy * s };
    return f;
  }
  function por(ctx, f, x, y, esc) { var e = esc || 1; ctx.drawImage(f.c, x - f.ox * e, y - f.oy * e, f.w * e, f.h * e); }
  function definirRes(r) { if (r !== RES) { RES = r; cache = {}; } }
  function figBicho(id, q, olhar, s) { return figura('b:' + id + ':' + q + ':' + (olhar || ''), 84, 112, 42, 104, s, function (ctx) { desenharBicho(ctx, bicho(id), q, olhar); }); }
  function figPorco(q, s) { return figura('p:' + q, 70, 74, 35, 66, s, function (ctx) { desenharPorco(ctx, q); }); }
  function figItem(tipo, s) { return figura('i:' + tipo, 64, 70, 32, 62, s, function (ctx) { (tipo === 'balde' ? desenharBalde : tipo === 'pincel' ? desenharPincel : desenharRaio)(ctx); }); }
  function figObs(tema, k, s) { return figura('o:' + tema + ':' + k, 64, 84, 32, 76, s, function (ctx) { desenharObs(ctx, tema, k); }); }
  function figEtiqueta(texto, cor, s) {
    return figura('t:' + texto + ':' + cor, 180, 34, 90, 17, s, function (ctx) {
      ctx.font = '700 19px Fredoka, "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var w = Math.min(176, ctx.measureText(texto).width + 20);
      rr(ctx, -w / 2, -14, w, 28, 12); ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.strokeStyle = cor; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.fillStyle = LINHA; ctx.fillText(texto, 0, 1, 160);
    });
  }
  function url(fn, w, h, ox, oy, tam) {
    var c = tela(tam, tam * h / w), ctx = c.getContext('2d'), k = tam / w;
    ctx.scale(k, k); ctx.translate(ox, oy); fn(ctx);
    return c.toDataURL();
  }
  var urls = {};
  function urlBicho(id, q, tam, olhar) { var k = id + q + tam + (olhar || ''); return urls[k] || (urls[k] = url(function (ctx) { desenharBicho(ctx, bicho(id), q, olhar || ''); }, 84, 100, 42, 96, tam)); }
  function urlItem(tipo, tam) { var k = 'i' + tipo + tam; return urls[k] || (urls[k] = url(function (ctx) { (tipo === 'balde' ? desenharBalde : tipo === 'pincel' ? desenharPincel : desenharRaio)(ctx); }, 64, 70, 32, 62, tam)); }
  function urlPorco(tam) { return urls['p' + tam] || (urls['p' + tam] = url(function (ctx) { desenharPorco(ctx, 'parado'); }, 70, 74, 35, 66, tam)); }

  /* ---------- cenários ---------- */
  var TEMAS = [
    { nome: 'Jardim', chao: ['#c9c1b3', '#bfb6a6'], junta: 'rgba(90,70,50,.10)', borda: '#8a6a4a', fora: ['#7fcf6a', '#5fb84e'] },
    { nome: 'Neve', chao: ['#b8c7d8', '#adbdd0'], junta: 'rgba(40,60,90,.10)', borda: '#7d93b0', fora: ['#f4f8ff', '#dce8f6'] },
    { nome: 'Lua', chao: ['#aaa6bb', '#a09cb2'], junta: 'rgba(40,30,70,.12)', borda: '#5d567c', fora: ['#25205a', '#0f0c2e'] }
  ];
  function semente(s) { var a = s >>> 0 || 1; return function () { a = a * 1664525 + 1013904223 >>> 0; return a / 4294967296; }; }
  /* fundo inteiro 1280×720 (fora + chão da arena), desenhado uma vez por partida */
  function fundo(tema, L, H, area, r) {
    var T = TEMAS[tema], c = tela(L * r, H * r), ctx = c.getContext('2d'), rnd = semente(tema * 97 + 5);
    ctx.scale(r, r);
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.fora[0]); g.addColorStop(1, T.fora[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
    var i;
    if (tema === 0) {
      for (i = 0; i < 90; i++) { var fx = rnd() * L, fy = rnd() * H; ctx.strokeStyle = 'rgba(40,110,40,.35)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(fx - 4, fy); ctx.lineTo(fx - 6, fy - 8); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 10); ctx.moveTo(fx + 4, fy); ctx.lineTo(fx + 6, fy - 8); ctx.stroke(); }
      for (i = 0; i < 40; i++) { var cx = rnd() * L, cy = rnd() * H, cor = ['#ff5d8f', '#ffd23f', '#fff', '#a77bff'][i % 4]; for (var k = 0; k < 5; k++) { var a = k / 5 * 6.28; circulo(ctx, cx + Math.cos(a) * 4, cy + Math.sin(a) * 4, 3.4, cor); } circulo(ctx, cx, cy, 2.4, '#ffb000'); }
    } else if (tema === 1) {
      for (i = 0; i < 60; i++) { elipse(ctx, rnd() * L, rnd() * H, 20 + rnd() * 40, 6 + rnd() * 8, 'rgba(160,190,230,.25)'); }
      for (i = 0; i < 30; i++) { var px = rnd() * L, py = rnd() * H; ctx.save(); ctx.translate(px, py); ctx.scale(0.55, 0.55); desenharObs(ctx, 1, 1); ctx.restore(); }
    } else {
      for (i = 0; i < 160; i++) circulo(ctx, rnd() * L, rnd() * H, rnd() * 1.8 + 0.4, 'rgba(255,255,255,' + (0.4 + rnd() * 0.6) + ')');
      // a Terra
      circulo(ctx, 1180, 46, 34, '#3a8ee6'); elipse(ctx, 1170, 38, 14, 9, '#4fc96a', 0.4); elipse(ctx, 1192, 58, 10, 7, '#4fc96a', -0.3); circulo(ctx, 1172, 36, 30, 'rgba(255,255,255,.08)');
    }
    // sombra e borda da arena
    var ax = area.x, ay = area.y, aw = area.w, ah = area.h;
    rr(ctx, ax - 14, ay - 10, aw + 28, ah + 28, 26); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill();
    rr(ctx, ax - 14, ay - 14, aw + 28, ah + 28, 26); ctx.fillStyle = T.borda; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = LINHA; ctx.stroke();
    rr(ctx, ax - 6, ay - 6, aw + 12, ah + 12, 18); ctx.fillStyle = clarear(T.borda.length === 7 ? T.borda : '#888888', 0.25); ctx.fill();
    // chão em ladrilhos
    ctx.save(); rr(ctx, ax, ay, aw, ah, 12); ctx.clip();
    var cel = area.cel;
    for (var y = 0; y < ah / cel; y++) for (var x = 0; x < aw / cel; x++) { ctx.fillStyle = T.chao[(x + y) % 2]; ctx.fillRect(ax + x * cel, ay + y * cel, cel, cel); }
    ctx.strokeStyle = T.junta; ctx.lineWidth = 2;
    for (x = 0; x <= aw / cel; x++) { ctx.beginPath(); ctx.moveTo(ax + x * cel, ay); ctx.lineTo(ax + x * cel, ay + ah); ctx.stroke(); }
    for (y = 0; y <= ah / cel; y++) { ctx.beginPath(); ctx.moveTo(ax, ay + y * cel); ctx.lineTo(ax + aw, ay + y * cel); ctx.stroke(); }
    if (tema === 2) for (i = 0; i < 14; i++) { var kx = ax + rnd() * aw, ky = ay + rnd() * ah, kr = 10 + rnd() * 18; elipse(ctx, kx, ky, kr, kr * 0.6, 'rgba(60,50,90,.13)'); elipse(ctx, kx, ky - 2, kr * 0.8, kr * 0.45, 'rgba(255,255,255,.08)'); }
    if (tema === 1) for (i = 0; i < 18; i++) { var sx = ax + rnd() * aw, sy = ay + rnd() * ah; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 26, sy - 8); ctx.stroke(); }
    var gi = ctx.createLinearGradient(0, ay, 0, ay + 40); gi.addColorStop(0, 'rgba(0,0,0,.16)'); gi.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gi; ctx.fillRect(ax, ay, aw, 40);
    ctx.restore();
    return c;
  }

  window.Arte = {
    BICHOS: BICHOS, EQUIPES: EQUIPES, TEMAS: TEMAS, LAMA: LAMA, LINHA: LINHA, bicho: bicho,
    tela: tela, elipse: elipse, circulo: circulo, rr: rr, estrelaPath: estrelaPath, clarear: clarear, escurecer: escurecer,
    por: por, definirRes: definirRes, figBicho: figBicho, figPorco: figPorco, figItem: figItem, figObs: figObs, figEtiqueta: figEtiqueta,
    urlBicho: urlBicho, urlItem: urlItem, urlPorco: urlPorco, fundo: fundo, desenharBicho: desenharBicho
  };
})();
