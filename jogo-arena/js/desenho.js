/* Arena Escorregadia — desenho da TV em Canvas 2D (leve para a TV LG).
   Tudo que não muda (água, gelo, bolinhas) é pintado uma vez numa tela escondida e só copiado a cada quadro.
   Sem desfoque (blur) e sem sombras do canvas: elas pesam muito no navegador da TV. */
(function (raiz) {
  'use strict';
  var F = raiz.Fisica, C = F.C;

  var CORES = [
    { nome: 'VERMELHA', hex: '#ff4d5e', escura: '#a3122a' },
    { nome: 'AZUL', hex: '#3f8cff', escura: '#163f9e' },
    { nome: 'AMARELA', hex: '#ffd23f', escura: '#a77a00' },
    { nome: 'VERDE', hex: '#2fd27a', escura: '#0d7a3f' },
    { nome: 'ROXA', hex: '#a86bff', escura: '#5422a8' },
    { nome: 'LARANJA', hex: '#ff8a2a', escura: '#a84800' },
    { nome: 'ROSA', hex: '#ff6fc4', escura: '#a8186b' },
    { nome: 'MARROM', hex: '#a8754d', escura: '#5a3518' }
  ];

  function tela(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  function criar(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var R = { qualidade: 'alta', W: 0, H: 0, escala: 1, cx: 0, cy: 0 };
    var agua = null, gelo = null, sprites = [], fantasmas = [], rachaduras = [];
    var particulas = [], aneis = [], tremor = 0, ultimoT = 0;
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
      // placas de gelo boiando longe da arena
      for (i = 0; i < 14; i++) { // só na metade de baixo (em cima ficam o placar e os textos)
        var px = rnd() * W, py = H * (0.62 + rnd() * 0.38), pr = s * (0.4 + rnd() * 0.7);
        if (Math.hypot(px - R.cx, py - R.cy) < s * (C.RAIO_INICIAL + 1.6)) continue;
        g.fillStyle = 'rgba(8,30,60,0.45)'; poligono(g, px + pr * 0.12, py + pr * 0.18, pr, 7, i);
        g.fillStyle = 'rgba(220,245,255,0.75)'; poligono(g, px, py, pr, 7, i);
      }
      /* Gelo: disco claro com riscos de patins e rachaduras finas. */
      var rg = C.RAIO_INICIAL * s, lado = Math.ceil(rg * 2 + 4);
      gelo = tela(lado, lado);
      var h = gelo.getContext('2d'), m = lado / 2;
      var gg = h.createRadialGradient(m - rg * 0.25, m - rg * 0.3, rg * 0.05, m, m, rg);
      gg.addColorStop(0, '#f7feff'); gg.addColorStop(0.6, '#d3f1fb'); gg.addColorStop(1, '#a6daf0');
      h.fillStyle = gg; h.beginPath(); h.arc(m, m, rg, 0, Math.PI * 2); h.fill();
      h.strokeStyle = 'rgba(255,255,255,0.55)'; h.lineWidth = Math.max(1, s * 0.05);
      for (i = 0; i < 26; i++) { // riscos de patins (arcos)
        var ar = rg * (0.15 + rnd() * 0.8), a0 = rnd() * 6.28;
        h.beginPath(); h.arc(m + (rnd() - 0.5) * rg * 0.4, m + (rnd() - 0.5) * rg * 0.4, ar, a0, a0 + 0.3 + rnd() * 0.7); h.stroke();
      }
      h.strokeStyle = 'rgba(70,140,180,0.28)'; h.lineWidth = Math.max(1, s * 0.035);
      for (i = 0; i < 9; i++) { // rachaduras
        var cx2 = m + (rnd() - 0.5) * rg * 1.3, cy2 = m + (rnd() - 0.5) * rg * 1.3, ca = rnd() * 6.28;
        h.beginPath(); h.moveTo(cx2, cy2);
        for (var k = 0; k < 4; k++) { ca += (rnd() - 0.5) * 1.6; cx2 += Math.cos(ca) * s * 0.8; cy2 += Math.sin(ca) * s * 0.8; h.lineTo(cx2, cy2); }
        h.stroke();
      }
      h.fillStyle = 'rgba(255,255,255,0.8)';
      for (i = 0; i < 40; i++) { var bx = m + (rnd() - 0.5) * rg * 1.8, by = m + (rnd() - 0.5) * rg * 1.8; if (Math.hypot(bx - m, by - m) < rg) h.fillRect(bx, by, Math.max(1, s * 0.07), Math.max(1, s * 0.07)); }
      // linha do centro (um círculo e uma estrela de neve) para dar referência
      h.strokeStyle = 'rgba(80,160,210,0.25)'; h.lineWidth = Math.max(1, s * 0.08);
      h.beginPath(); h.arc(m, m, s * 1.6, 0, Math.PI * 2); h.stroke();
      for (i = 0; i < 6; i++) { var aa = i * Math.PI / 3; h.beginPath(); h.moveTo(m, m); h.lineTo(m + Math.cos(aa) * s * 0.9, m + Math.sin(aa) * s * 0.9); h.stroke(); }

      /* Rachaduras do aviso de quebra (zigue-zagues em volta da borda). */
      rachaduras = [];
      for (i = 0; i < 28; i++) rachaduras.push({ a: i / 28 * Math.PI * 2 + rnd() * 0.15, d: [rnd(), rnd(), rnd()] });

      /* Bolinhas: corpo com brilho e sombra, uma por cor. */
      sprites = CORES.map(function (cor) { return spriteBola(cor, s); });
      fantasmas = CORES.map(function (cor) { return spriteFantasma(cor, s); });
    }

    function poligono(g, x, y, r, lados, giro) {
      g.beginPath();
      for (var i = 0; i < lados; i++) { var a = i / lados * Math.PI * 2 + giro, rr = r * (0.75 + 0.25 * Math.sin(i * 2.3 + giro)); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
      g.closePath(); g.fill();
    }

    function spriteBola(cor, s) {
      var r = C.RAIO_BOLA * s, lado = Math.ceil(r * 2.9), c = tela(lado, lado), g = c.getContext('2d'), m = lado / 2;
      g.fillStyle = 'rgba(20,60,90,0.28)'; // sombra no gelo
      g.beginPath(); g.ellipse(m + r * 0.18, m + r * 0.32, r * 1.02, r * 0.86, 0, 0, Math.PI * 2); g.fill();
      var gr = g.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.1, m, m, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, cor.hex); gr.addColorStop(1, cor.escura);
      g.fillStyle = gr; g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fill();
      g.lineWidth = Math.max(1.5, r * 0.09); g.strokeStyle = 'rgba(10,20,40,0.55)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(m - r * 0.38, m - r * 0.45, r * 0.26, r * 0.15, -0.6, 0, Math.PI * 2); g.fill();
      return { c: c, m: m };
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

    function tx(x) { return R.cx + x * R.escala; }
    function ty(y) { return R.cy + y * R.escala; }

    /* ---------- Efeitos ---------- */
    R.efeito = function (ev, cores) {
      var s = R.escala, leve = R.qualidade === 'leve', i, n;
      if (ev.tipo === 'batida') {
        n = leve ? 4 : 7;
        for (i = 0; i < n; i++) { var a = rnd() * 6.28, v = (2 + rnd() * 3) * Math.min(2, ev.forca / 4); particulas.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.3, max: 0.3, tipo: 'faisca', cor: '#ffffff', tam: 0.12 }); }
        if (ev.forca > 6 && !leve) tremor = Math.min(0.35, ev.forca * 0.03);
      } else if (ev.tipo === 'queda') {
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT + 0.25, dur: 1.1, cor: 'rgba(200,240,255,', r: 1.8 });
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT + 0.4, dur: 1.3, cor: 'rgba(200,240,255,', r: 2.6 });
        n = leve ? 6 : 12;
        for (i = 0; i < n; i++) { var a2 = rnd() * 6.28, v2 = 1.5 + rnd() * 3; particulas.push({ x: ev.x, y: ev.y, vx: Math.cos(a2) * v2, vy: Math.sin(a2) * v2 - 2, vida: 0.7, max: 0.7, tipo: 'gota', cor: '#cdefff', tam: 0.14, atraso: 0.25, g: 7 }); }
      } else if (ev.tipo === 'sopro') {
        aneis.push({ x: ev.x, y: ev.y, ini: ultimoT, dur: 0.45, cor: 'rgba(255,255,255,', r: C.SOPRO_RAIO, grosso: true });
        n = leve ? 6 : 12;
        for (i = 0; i < n; i++) { var a3 = i / n * 6.28; particulas.push({ x: ev.x, y: ev.y, vx: Math.cos(a3) * 7, vy: Math.sin(a3) * 7, vida: 0.4, max: 0.4, tipo: 'vento', cor: '#ffffff', tam: 0.16 }); }
      } else if (ev.tipo === 'tranco') {
        n = leve ? 3 : 6;
        for (i = 0; i < n; i++) particulas.push({ x: ev.x + (rnd() - 0.5) * 0.8, y: ev.y + (rnd() - 0.5) * 0.8, vx: (rnd() - 0.5) * 2, vy: (rnd() - 0.5) * 2, vida: 0.35, max: 0.35, tipo: 'neve', cor: '#ffffff', tam: 0.18 });
      } else if (ev.tipo === 'quebra') {
        // Pedaços da borda que se soltam e afundam.
        n = leve ? 14 : 30;
        for (i = 0; i < n; i++) {
          var a4 = rnd() * 6.28, rr = ev.para + (ev.de - ev.para) * (0.2 + rnd() * 0.8);
          particulas.push({ x: Math.cos(a4) * rr, y: Math.sin(a4) * rr, vx: Math.cos(a4) * (0.6 + rnd()), vy: Math.sin(a4) * (0.6 + rnd()), vida: 1.6, max: 1.6, tipo: 'placa', tam: 0.35 + rnd() * 0.45, giro: rnd() * 6 });
        }
        if (!leve) tremor = 0.3;
      }
      if (particulas.length > 160) particulas.splice(0, particulas.length - 160);
    };

    /* ---------- Quadro ---------- */
    /* m = mundo da física; info = {nomes: {id: nome}, lider: id, agora: s, aviso: bool} */
    R.quadro = function (m, info, dt) {
      var s = R.escala, W = R.W, H = R.H, leve = R.qualidade === 'leve', i, b;
      ultimoT += dt;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(agua, 0, 0);
      var sx = 0, sy = 0;
      if (tremor > 0) { sx = (rnd() - 0.5) * tremor * s; sy = (rnd() - 0.5) * tremor * s; tremor = Math.max(0, tremor - dt * 1.2); ctx.setTransform(1, 0, 0, 1, sx, sy); }
      if (!m) return;
      var raio = m.raio * s;

      /* bolinhas caindo ficam por baixo do gelo (afundando na água) */
      for (i = 0; i < m.bolas.length; i++) { b = m.bolas[i]; if (b.estado === 'caindo') desenharQueda(b, m.t); }

      /* gelo: espessura (lado escuro), disco e borda de neve */
      ctx.fillStyle = '#5aa6c8';
      ctx.beginPath(); ctx.arc(R.cx, R.cy + s * 0.32, raio, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(R.cx, R.cy, raio, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(gelo, R.cx - gelo.width / 2, R.cy - gelo.height / 2);
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

      /* partículas de baixo (placas de gelo afundando) */
      desenharParticulas(dt, true);

      /* bolinhas no gelo: rastro do tranco, corpo, olhos e nome */
      for (i = 0; i < m.bolas.length; i++) { b = m.bolas[i]; if (b.estado === 'gelo') desenharBola(b, m, info, leve); }
      for (i = 0; i < m.bolas.length; i++) { b = m.bolas[i]; if (b.estado === 'gelo') desenharNome(b, info, info.lider === b.id); }

      /* anéis (respingos e sopros) e partículas de cima */
      desenharAneis();
      desenharParticulas(dt, false);

      /* fantasmas por cima de tudo */
      for (i = 0; i < m.bolas.length; i++) { b = m.bolas[i]; if (b.estado === 'fantasma') desenharFantasma(b, m.t, info); }
    };

    function desenharBola(b, m, info, leve) {
      var s = R.escala, x = tx(b.x), y = ty(b.y), sp = sprites[b.cor % sprites.length], r = C.RAIO_BOLA * s;
      var dash = m.t < b.trancoAte;
      if (dash && !leve) {
        ctx.globalAlpha = 0.25;
        for (var k = 1; k <= 3; k++) ctx.drawImage(sp.c, x - b.vx * s * 0.035 * k - sp.m, y - b.vy * s * 0.035 * k - sp.m);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(sp.c, x - sp.m, y - sp.m);
      // olhos: olham para onde a bolinha quer ir
      var ox = b.olhoX * r * 0.3, oy = b.olhoY * r * 0.3, ex = r * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x - ex + ox, y - r * 0.12 + oy, r * 0.25, 0, Math.PI * 2); ctx.arc(x + ex + ox, y - r * 0.12 + oy, r * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10182a';
      var px = b.olhoX * r * 0.11, py = b.olhoY * r * 0.11;
      if (dash) { // cara de esforço: olhos apertados
        ctx.fillRect(x - ex + ox - r * 0.18, y - r * 0.14 + oy, r * 0.36, r * 0.07);
        ctx.fillRect(x + ex + ox - r * 0.18, y - r * 0.14 + oy, r * 0.36, r * 0.07);
      } else {
        ctx.beginPath(); ctx.arc(x - ex + ox + px, y - r * 0.12 + oy + py, r * 0.12, 0, Math.PI * 2); ctx.arc(x + ex + ox + px, y - r * 0.12 + oy + py, r * 0.12, 0, Math.PI * 2); ctx.fill();
      }
      // recarga do tranco: anel fino em volta quando está recarregando
      if (b.recarga > 0 && !m.treino) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
        ctx.beginPath(); ctx.arc(x, y, r * 1.18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - b.recarga / C.TRANCO_RECARGA)); ctx.stroke();
      }
    }

    function desenharNome(b, info, lider) {
      var s = R.escala, x = tx(b.x), y = ty(b.y) - C.RAIO_BOLA * s * 1.45, nome = (info.nomes && info.nomes[b.id]) || '';
      if (!nome) return;
      ctx.font = '800 ' + Math.round(s * 0.62) + 'px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = Math.max(2, s * 0.14); ctx.strokeStyle = 'rgba(8,22,45,0.85)'; ctx.lineJoin = 'round';
      ctx.strokeText(nome, x, y); ctx.fillStyle = CORES[b.cor % CORES.length].hex; ctx.fillText(nome, x, y);
      if (lider) { // coroa de quem lidera a partida (desenhada: emoji não aparece em toda TV)
        var cw = s * 0.75, ch = s * 0.45, cy = y - s * 0.72;
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = 'rgba(8,22,45,0.85)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
        ctx.beginPath(); ctx.moveTo(x - cw / 2, cy); ctx.lineTo(x - cw / 2, cy - ch); ctx.lineTo(x - cw / 4, cy - ch * 0.45); ctx.lineTo(x, cy - ch * 1.1);
        ctx.lineTo(x + cw / 4, cy - ch * 0.45); ctx.lineTo(x + cw / 2, cy - ch); ctx.lineTo(x + cw / 2, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }

    function desenharQueda(b, t) {
      var k = Math.min(1, (t - b.caiuEm) / C.QUEDA_DURACAO), sp = sprites[b.cor % sprites.length];
      var esc = 1 - k * 0.65, x = tx(b.x), y = ty(b.y) + k * R.escala * 0.6;
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(sp.c, x - sp.m * esc, y - sp.m * esc, sp.c.width * esc, sp.c.height * esc);
      ctx.globalAlpha = 1;
    }

    function desenharFantasma(b, t, info) {
      var sp = fantasmas[b.cor % fantasmas.length], s = R.escala, x = tx(b.x), y = ty(b.y) + Math.sin(t * 3 + b.cor) * s * 0.15, r = C.RAIO_BOLA * s;
      ctx.globalAlpha = 0.78;
      ctx.drawImage(sp.c, x - sp.m, y - sp.m);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#20304a';
      ctx.beginPath(); ctx.arc(x - r * 0.3 + b.olhoX * r * 0.15, y - r * 0.3 + b.olhoY * r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.arc(x + r * 0.3 + b.olhoX * r * 0.15, y - r * 0.3 + b.olhoY * r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.fill();
      if (b.recarga <= 0) { // pronto para soprar: bochechas cheias
        ctx.fillStyle = 'rgba(255,140,170,0.7)';
        ctx.beginPath(); ctx.arc(x - r * 0.55, y + r * 0.05, r * 0.14, 0, Math.PI * 2); ctx.arc(x + r * 0.55, y + r * 0.05, r * 0.14, 0, Math.PI * 2); ctx.fill();
      }
      var nome = (info.nomes && info.nomes[b.id]) || '';
      if (nome) {
        ctx.font = '700 ' + Math.round(s * 0.48) + 'px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(nome, x, y - r * 1.1);
      }
    }

    function desenharAneis() {
      for (var i = aneis.length - 1; i >= 0; i--) {
        var a = aneis[i], k = (ultimoT - a.ini) / a.dur;
        if (k < 0) continue;
        if (k >= 1) { aneis.splice(i, 1); continue; }
        ctx.strokeStyle = a.cor + (0.7 * (1 - k)).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1.5, R.escala * (a.grosso ? 0.25 : 0.1) * (1 - k * 0.5));
        ctx.beginPath(); ctx.ellipse(tx(a.x), ty(a.y), a.r * k * R.escala, a.r * k * R.escala * (a.grosso ? 1 : 0.6), 0, 0, Math.PI * 2); ctx.stroke();
      }
    }

    function desenharParticulas(dt, embaixo) {
      var s = R.escala;
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

    R.limparEfeitos = function () { particulas = []; aneis = []; tremor = 0; };
    return R;
  }

  raiz.Desenho = { criar: criar, CORES: CORES };
})(window);
