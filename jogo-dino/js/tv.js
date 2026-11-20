/* Dino Pula-Pula — a TELA DA TV: palco 1280×720 (canvas da pista + placas por cima) e as telas de sala, contagem e fim. */
(function () {
  'use strict';
  var A = window.Arte, M = window.Mundo;
  var L = 1280, H = 720, DX = 330;  // DX: onde os dinos ficam na tela (x)
  var palco, canvas, ctx, hud, camada, placas = [], barra, marcador;

  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Faixas: 1 a 4 jogadores. As de trás são menores (parece que estão mais longe). */
  var LAYOUTS = {
    1: { horiz: 430, faixas: [[640, 1.3]] },
    2: { horiz: 340, faixas: [[490, 1.0], [655, 1.15]] },
    3: { horiz: 305, faixas: [[430, 0.82], [548, 0.93], [672, 1.04]] },
    4: { horiz: 292, faixas: [[396, 0.7], [488, 0.78], [584, 0.87], [686, 0.96]] }
  };

  /* ---------- montagem ---------- */
  var RES = 1;     // pixels de verdade por pixel do palco (até 1,5 numa TV Full HD: imagem nítida)
  var forcarRes = +(new URLSearchParams(location.search).get('res') || 0);
  function montar(el) {
    el.innerHTML = '<div class="palco"><canvas></canvas><div class="hud" hidden>' +
      '<div class="barra"><div class="barra-trilha"><i class="b0"></i><i class="b1"></i><i class="b2"></i></div><span class="barra-ninho"></span><span class="barra-dino"></span></div></div>' +
      '<div class="placas"></div><div class="camada"></div></div>';
    palco = el.querySelector('.palco'); canvas = el.querySelector('canvas'); ctx = canvas.getContext('2d');
    hud = el.querySelector('.hud'); camada = el.querySelector('.camada');
    barra = el.querySelector('.barra'); marcador = el.querySelector('.barra-dino');
    var ninho = A.tela(90, 55), nc = ninho.getContext('2d'); A.por(nc, A.figNinho(0.5), 45, 50);
    el.querySelector('.barra-ninho').style.backgroundImage = 'url(' + ninho.toDataURL() + ')';
    ajustar(); window.addEventListener('resize', ajustar);
  }
  function ajustar() {
    var pai = palco.parentNode, w = pai.clientWidth, h = pai.clientHeight || w * 9 / 16;
    var k = Math.min(w / L, h / H);
    palco.style.transform = 'translate(' + ((w - L * k) / 2) + 'px,' + ((h - H * k) / 2) + 'px) scale(' + k + ')';
    var dpr = window.devicePixelRatio || 1;
    var r = forcarRes || Math.max(1, Math.min(1.5, Math.round(k * dpr * 2) / 2));
    if (lento) r = 1;
    if (r !== RES || !ceus.length) mudarRes(r);
  }
  function mudarRes(r) {
    RES = r; A.definirRes(r);
    canvas.width = Math.round(L * r); canvas.height = Math.round(H * r);
    canvas.style.width = L + 'px'; canvas.style.height = H + 'px';
    gradChao = []; preparar();
  }
  // Se a TV não der conta (quadros lentos), volta para a resolução normal sozinha.
  var lento = false, somaDt = 0, quadros = 0;
  function medir(dt) {
    if (lento || RES <= 1 || forcarRes) return;
    somaDt += dt; quadros++;
    if (quadros >= 120) { if (somaDt / quadros > 0.03) { lento = true; mudarRes(1); } somaDt = 0; quadros = 0; }
  }

  /* ---------- cenário pronto (figurinhas grandes) ---------- */
  var ceus = [], bemLonges = [], longes = [], meios = [], gradChao = [], vinheta = null;
  function preparar() {
    ceus = []; bemLonges = []; longes = []; meios = [];
    for (var b = 0; b < 3; b++) {
      var B = A.BIOMAS[b], c = A.tela(L * RES, 460 * RES), x = c.getContext('2d');
      x.scale(RES, RES);
      var g = x.createLinearGradient(0, 0, 0, 460); g.addColorStop(0, B.ceu[0]); g.addColorStop(1, B.ceu[1]);
      x.fillStyle = g; x.fillRect(0, 0, L, 460);
      // raios de sol
      x.save(); x.translate(1080, 110); x.fillStyle = 'rgba(255,255,230,.10)';
      for (var i = 0; i < 12; i++) { x.rotate(Math.PI / 6); x.beginPath(); x.moveTo(0, 0); x.lineTo(-40, -520); x.lineTo(40, -520); x.closePath(); x.fill(); }
      x.restore();
      var s = x.createRadialGradient(1080, 110, 10, 1080, 110, 150); s.addColorStop(0, 'rgba(255,255,220,.95)'); s.addColorStop(1, 'rgba(255,255,220,0)');
      x.fillStyle = s; x.fillRect(880, 0, 400, 300); A.circulo(x, 1080, 110, 46, B.sol); A.circulo(x, 1068, 98, 30, 'rgba(255,255,255,.35)');
      ceus.push(c);
      bemLonges.push(A.camadaLonge(b, L, 200, RES, true));
      longes.push(A.camadaLonge(b, L, 200, RES));
      meios.push(A.camadaMeio(b, L, 150, RES));
    }
    vinheta = A.tela(L * RES / 2, H * RES / 2);
    var v = vinheta.getContext('2d'), gv = v.createRadialGradient(vinheta.width / 2, vinheta.height / 2, vinheta.height * 0.45, vinheta.width / 2, vinheta.height / 2, vinheta.width * 0.62);
    gv.addColorStop(0, 'rgba(20,10,40,0)'); gv.addColorStop(1, 'rgba(20,10,40,.22)'); v.fillStyle = gv; v.fillRect(0, 0, vinheta.width, vinheta.height);
  }
  function bloco(img, x, y, w, h) { ctx.drawImage(img, x, y, w, h); }

  /* ---------- partículas (efeitos) ---------- */
  var parts = [], tremor = 0;
  function part(p) { if (parts.length < 220) parts.push(p); }
  var CORES = ['#ff5d8f', '#ffd23f', '#3fcf5c', '#4fb8ff', '#a77bff', '#ff9248'];
  function efeito(e, faixa, cena) {
    var y0 = faixa.y, s = faixa.s, p = cena.jogadores[e.j] && cena.jogadores[e.j].p, yd = y0 - (p ? p.y : 0) * s;
    if (e.tipo === 'fruta') {
      part({ tipo: 'txt', x: DX + 30 * s, y: yd - 110 * s, vx: 0, vy: -80, vida: e.ouro ? 1.2 : 0.8, txt: e.ouro ? '+3' : '+1', cor: e.ouro ? '#ffd23f' : '#fff', tam: (e.ouro ? 48 : 34) * s });
      for (var i = 0; i < (e.ouro ? 14 : 6); i++) part({ tipo: e.ouro ? 'brilho' : 'pt', x: DX + 20 * s, y: yd - 50 * s, vx: (Math.random() - 0.3) * 300, vy: -Math.random() * 300, vida: 0.5, cor: e.ouro ? '#ffe680' : CORES[i % 6], r: 5 * s });
    } else if (e.tipo === 'tombo') {
      tremor = 0.22;
      for (var k = 0; k < 9; k++) part({ tipo: 'pt', x: DX + 30 * s, y: y0 - 10 * s, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 170, vida: 0.55, cor: 'rgba(255,255,255,.85)', r: (8 + Math.random() * 9) * s });
      for (var f = 0; f < e.perdeu; f++) part({ tipo: 'fruta', f: f * 2 % 6, x: DX, y: yd - 60 * s, vx: -120 - Math.random() * 200, vy: -360 - Math.random() * 200, g: 1100, vida: 1.1, s: s });
      part({ tipo: 'tonto', x: DX + 20 * s, y: yd - 120 * s, vida: 1, s: s });
    } else if (e.tipo === 'quebrou') {
      tremor = 0.12;
      for (var q = 0; q < 12; q++) part({ tipo: 'pt', x: DX + 50 * s, y: y0 - 30 * s, vx: Math.random() * 520, vy: -200 - Math.random() * 420, g: 1400, vida: 0.8, cor: ['#9aa3b5', '#ffd23f', '#ff86bd'][q % 3], r: (6 + Math.random() * 6) * s });
      part({ tipo: 'txt', x: DX + 60 * s, y: yd - 120 * s, vx: 0, vy: -80, vida: 0.9, txt: 'POW!', cor: '#ffd23f', tam: 46 * s });
    } else if (e.tipo === 'estrela') {
      for (var z = 0; z < 20; z++) { var a = z / 20 * Math.PI * 2; part({ tipo: 'brilho', x: DX, y: yd - 50 * s, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, vida: 0.75, r: 9 * s, cor: 'hsl(' + z * 18 + ',100%,65%)' }); }
      if (!parts.some(function (q) { return q.txt === 'ARCO-ÍRIS!'; })) part({ tipo: 'txt', x: L / 2, y: 190, vx: 0, vy: -30, vida: 1.4, txt: 'ARCO-ÍRIS!', cor: '#fff36b', tam: 64 });
    } else if (e.tipo === 'pulo' || e.tipo === 'pousou') {
      for (var d = 0; d < 4; d++) part({ tipo: 'pt', x: DX - 14 * s + d * 12 * s, y: y0 - 4 * s, vx: -90 - d * 40, vy: -30 - d * 10, vida: 0.35, cor: 'rgba(255,255,255,.75)', r: (5 + d) * s });
    } else if (e.tipo === 'prepara') {
      part({ tipo: 'anel', x: DX, y: y0 - 40 * s, vida: 0.4, r: 30 * s, cor: '#ffd23f' });
    }
  }
  function confete() {
    for (var i = 0; i < 140; i++) part({ tipo: 'confete', x: Math.random() * L, y: -20 - Math.random() * 400, vx: (Math.random() - 0.5) * 80, vy: 120 + Math.random() * 160, vida: 5, cor: CORES[i % 6], r: 6 + Math.random() * 5, rot: Math.random() * 6 });
  }
  function desenharParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vida -= dt; if (p.vida <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.g) p.vy += p.g * dt;
      ctx.globalAlpha = Math.min(1, p.vida * 3);
      if (p.tipo === 'pt') { A.circulo(ctx, p.x, p.y, p.r, p.cor); }
      else if (p.tipo === 'brilho') { A.estrelaPath(ctx, p.x, p.y, p.r * 1.4, p.r * 0.5, 4); ctx.fillStyle = p.cor; ctx.fill(); }
      else if (p.tipo === 'confete') { p.rot += dt * 6; ctx.save(); ctx.translate(p.x + Math.sin(p.rot) * 10, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.cor; ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8); ctx.restore(); }
      else if (p.tipo === 'anel') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - p.vida), 0, 7); ctx.strokeStyle = p.cor; ctx.lineWidth = 5; ctx.stroke(); }
      else if (p.tipo === 'txt') {
        ctx.font = '700 ' + Math.round(p.tam) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        ctx.lineWidth = 7; ctx.strokeStyle = '#2b2140'; ctx.strokeText(p.txt, p.x, p.y); ctx.fillStyle = p.cor; ctx.fillText(p.txt, p.x, p.y);
      } else if (p.tipo === 'fruta') { A.por(ctx, A.figFruta(p.f, p.s), p.x, p.y); }
      else if (p.tipo === 'tonto') {
        for (var k = 0; k < 3; k++) { var a = p.vida * 9 + k * 2.1; A.estrelaPath(ctx, p.x + Math.cos(a) * 26 * p.s, p.y + Math.sin(a) * 8 * p.s, 9 * p.s, 4 * p.s, 5); ctx.fillStyle = '#ffd23f'; ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1;
  }
  function hash(k) { return (Math.imul(k ^ 0x5bd1e995, 2654435761) >>> 0) % 1000; }

  /* ---------- desenho da pista ----------
     cena: { dist, relogio, jogadores: [{id, nome, ajuda, p:{y, vy, chao, tombo, invul, poder, pendente, pegou, bateu}}], itens, quebrados: [{id:1}], ninhoX, chocado, bioma (0..2.99), festa } */
  function desenhar(cena, dt) {
    medir(dt);
    var n = Math.max(1, Math.min(4, cena.jogadores.length || 1)), lay = LAYOUTS[n], hz = lay.horiz, t = cena.relogio, dist = cena.dist;
    var bf = cena.bioma || 0, b0 = Math.floor(bf), mix = Math.max(0, Math.min(1, (bf - b0 - 0.88) / 0.12)), b1 = Math.min(2, b0 + 1);
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    if (tremor > 0) { tremor -= dt; ctx.translate((Math.random() - 0.5) * 14 * tremor / 0.22, (Math.random() - 0.5) * 10 * tremor / 0.22); }
    var sFrente = lay.faixas[n - 1][1];
    function camadas(b, alfa) {
      ctx.globalAlpha = alfa;
      bloco(ceus[b], 0, 0, L, 460);
      ctx.globalAlpha = 0.9 * alfa;
      for (var i = 0; i < 4; i++) { var nx = ((i * 380 - t * 14 - dist * 0.02) % 1520 + 1520) % 1520 - 160; A.nuvem(ctx, nx, 60 + (i % 2) * 70 + (i === 3 ? 30 : 0), 0.9 + (i % 3) * 0.25, 0.9 * alfa); }
      ctx.globalAlpha = alfa;
      // passarinhos
      if (b < 2) {
        ctx.strokeStyle = 'rgba(43,33,64,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (var pb = 0; pb < 3; pb++) {
          var bx = ((pb * 560 + t * 38) % 1700) - 200, by = 120 + pb * 34 + Math.sin(t + pb) * 10, asa = Math.sin(t * 9 + pb * 2) * 7;
          ctx.beginPath(); ctx.moveTo(bx - 12, by - asa); ctx.quadraticCurveTo(bx - 5, by - 4, bx, by); ctx.quadraticCurveTo(bx + 5, by - 4, bx + 12, by - asa); ctx.stroke();
        }
      }
      var o0 = -((dist * 0.02) % L), o1 = -((dist * 0.06) % L), o2 = -((dist * 0.22) % L);
      bloco(bemLonges[b], o0, hz - 230, L, 200); bloco(bemLonges[b], o0 + L, hz - 230, L, 200);
      bloco(longes[b], o1, hz - 190, L, 200); bloco(longes[b], o1 + L, hz - 190, L, 200);
      bloco(meios[b], o2, hz - 146, L, 150); bloco(meios[b], o2 + L, hz - 146, L, 150);
      var B = A.BIOMAS[b];
      if (!gradChao[b] || gradChao[b].hz !== hz) { var g = ctx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, B.chao[0]); g.addColorStop(1, B.chao[1]); gradChao[b] = { g: g, hz: hz }; }
      ctx.fillStyle = gradChao[b].g; ctx.fillRect(0, hz, L, H - hz);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, hz, L, 5);
      lay.faixas.forEach(function (f, fj) {
        var y = f[0], s = f[1], jog = cena.jogadores[fj];
        ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(0, y - 58 * s, L, 40 * s);   // grama mais clarinha perto da trilha
        ctx.fillStyle = B.trilhaBorda; ctx.fillRect(0, y - 15 * s, L, 30 * s);
        ctx.fillStyle = B.trilha; ctx.fillRect(0, y - 12 * s, L, 22 * s);
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(0, y - 12 * s, L, 3 * s);
        if (jog) { ctx.fillStyle = A.dino(jog.id).corpo; ctx.globalAlpha = 0.75 * alfa; ctx.fillRect(0, y + 10 * s, L, 5 * s); ctx.globalAlpha = alfa; }
        // pedrinhas na trilha e florzinhas na grama que passam (sensação de velocidade)
        var passo = 90, k0 = Math.floor((dist - DX / s) / passo), k1 = Math.ceil((dist + (L - DX) / s) / passo);
        for (var k = k0; k <= k1; k++) {
          var h = hash(k + fj * 7919), x = DX + (k * passo + (h % 60) - dist) * s;
          if (h % 3 === 0) A.elipse(ctx, x, y - 2 * s + (h % 3) * 3 * s, (3 + h % 4) * s, 2.4 * s, B.trilhaBorda);
          if (h < 330) A.por(ctx, A.figEnfeite(b, h % 4, s), x, y - 18 * s);
          else if (h < 620) { var ty = y - 20 * s; ctx.strokeStyle = B.tufo; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x - 6 * s, ty); ctx.lineTo(x - 9 * s, ty - 10 * s); ctx.moveTo(x, ty); ctx.lineTo(x, ty - 13 * s); ctx.moveTo(x + 6 * s, ty); ctx.lineTo(x + 9 * s, ty - 10 * s); ctx.stroke(); }
        }
      });
      ctx.globalAlpha = 1;
    }
    camadas(b0, 1);
    if (mix > 0 && b1 !== b0) camadas(b1, mix);

    // linhas de velocidade quando alguém está com a estrela
    var algumPoder = cena.jogadores.some(function (j) { return j.p && j.p.poder > 0; });
    if (algumPoder) {
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
      for (var ln = 0; ln < 10; ln++) { var lx = ((hash(ln) * 3 - dist * 2.2) % (L + 300) + L + 300) % (L + 300) - 150, ly = 80 + hash(ln + 50) % 560; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 120, ly); ctx.stroke(); }
    }

    // faixas: de trás para a frente
    for (var j = 0; j < n; j++) {
      var f = lay.faixas[j], y0 = f[0], s = f[1], jog = cena.jogadores[j];
      var p = jog ? jog.p : null, qb = (cena.quebrados && cena.quebrados[j]) || {};
      // ninho
      if (cena.ninhoX) { var nx = DX + (cena.ninhoX - dist) * s; if (nx > -200 && nx < L + 200) { ctx.globalAlpha = 0.2; A.elipse(ctx, nx, y0 + 4 * s, 80 * s, 10 * s, '#000'); ctx.globalAlpha = 1; A.por(ctx, A.figNinho(s, cena.chocado), nx, y0 + 6 * s); } }
      // itens
      var its = cena.itens || [];
      for (var i = 0; i < its.length; i++) {
        var it = its[i], sx = DX + (it.x - dist) * s;
        if (sx < -120 || sx > L + 120) continue;
        if (it.tipo === 'obs') {
          if (qb[it.id]) continue;
          ctx.globalAlpha = 0.2; A.elipse(ctx, sx + 4 * s, y0 + 3 * s, it.w * 0.55 * s, 7 * s, '#000'); ctx.globalAlpha = 1;
          A.por(ctx, A.figObs(it.forma, s), sx, y0 + 4 * s);
        }
        else if (p && p.pegou[it.id]) continue;
        else if (it.tipo === 'fruta') {
          var puxa = p && p.poder > 0 && it.x - dist < 260 && it.x - dist > 0 ? (1 - (it.x - dist) / 260) : 0;
          var fy = y0 - (it.y + Math.sin(t * 4 + it.id) * 4) * s, fx = sx;
          if (puxa) { fx += (DX - sx) * puxa * 0.6; fy += (y0 - (p.y + 40) * s - fy) * puxa * 0.6; }
          ctx.globalAlpha = 0.16; A.elipse(ctx, sx, y0 + 1 * s, 13 * s * Math.max(0.5, 1 - it.y / 500), 4 * s, '#000'); ctx.globalAlpha = 1; // sombra na trilha: mostra de quem é a fruta
          if (it.ouro) { ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 8); A.circulo(ctx, fx, fy, 32 * s, '#fff3a0'); ctx.globalAlpha = 1; }
          A.por(ctx, A.figFruta(it.f, s), fx, fy, it.ouro ? 1.25 + Math.sin(t * 6) * 0.06 : 1);
        } else if (it.tipo === 'estrela') {
          var ey = y0 - (it.y + Math.sin(t * 3) * 10) * s;
          ctx.globalAlpha = 0.16; A.elipse(ctx, sx, y0 + 1 * s, 14 * s, 4 * s, '#000'); ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(sx, ey); ctx.rotate(Math.sin(t * 2) * 0.25); A.por(ctx, A.figEstrela(s), 0, 0, 1 + Math.sin(t * 6) * 0.08); ctx.restore();
        }
      }
      if (!jog) continue;
      // sombra
      var alt = p ? p.y : 0;
      ctx.globalAlpha = 0.22; A.elipse(ctx, DX, y0 + 2 * s, 34 * s * Math.max(0.4, 1 - alt / 400), 7 * s, '#000'); ctx.globalAlpha = 1;
      // poder de estrela: aura de arco-íris
      if (p && p.poder > 0) {
        ctx.globalAlpha = p.poder < 1.5 ? 0.2 + 0.2 * Math.sin(t * 20) : 0.32;
        A.circulo(ctx, DX, y0 - (alt + 48) * s, 62 * s, 'hsl(' + Math.round(t * 360) % 360 + ',100%,65%)');
        ctx.globalAlpha = 1;
        if (Math.random() < 0.5) part({ tipo: 'brilho', x: DX - 30 * s, y: y0 - (alt + 20 + Math.random() * 70) * s, vx: -300, vy: 0, vida: 0.35, r: 5 * s, cor: 'hsl(' + Math.round(Math.random() * 360) + ',100%,70%)' });
      }
      var q = cena.festa ? (Math.sin(t * 8 + j) > 0 ? 'feliz' : 'pulo') : !p ? 'parado' : p.tombo > 0 ? 'tombo' : !p.chao ? 'pulo' : cena.parado ? 'parado' : (Math.floor(t * 9 + j * 0.5) % 2 ? 'corre0' : 'corre1');
      var fd = A.figDino(jog.id, q, s), pisca = p && p.invul > 0 && p.tombo <= 0 && Math.floor(t * 10) % 2;
      var pulinho = cena.festa ? Math.abs(Math.sin(t * 8 + j)) * 40 : 0;
      // estica no ar, agacha esperando o pulo (modo criança) — o desenho fica mais vivo
      var ex = 1, ey2 = 1;
      if (p && !p.chao && p.tombo <= 0) { var v = Math.max(-1, Math.min(1, (p.vy || 0) / 900)); ey2 = 1 + v * 0.1; ex = 1 - v * 0.06; }
      else if (p && p.pendente >= 0) { ey2 = 0.86; ex = 1.1; }
      else if (q === 'corre0' || q === 'corre1') { ey2 = q === 'corre0' ? 1.02 : 0.98; }
      if (pisca) ctx.globalAlpha = 0.4;
      ctx.save(); ctx.translate(DX, y0 - (alt + pulinho) * s); ctx.scale(ex, ey2); A.por(ctx, fd, 0, 0); ctx.restore();
      ctx.globalAlpha = 1;
    }
    // enfeites na frente de tudo (passam rápido: dão profundidade)
    var fy0 = lay.faixas[n - 1][0] + 24 * sFrente, altF = H + 24 - fy0;
    if (altF > 34) {
      var sf = altF / 130, passoF = 640, bF = mix > 0.5 ? b1 : b0, dF = dist * 1.35 * sFrente;
      for (var kf = Math.floor(dF / passoF) - 1; kf <= Math.ceil((dF + L) / passoF); kf++) {
        var hf = hash(kf + 999); if (hf < 400) continue;
        A.por(ctx, A.figFrente(bF, hf % 2, sf), kf * passoF + hf % 200 - dF, H + 24);
      }
    }
    desenharParts(dt);
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.drawImage(vinheta, 0, 0, L, H);
    posicionarPlacas(cena, lay);
  }

  /* placas com nome e frutas ao lado de cada dino (HTML por cima do canvas) */
  var placasEl = null, fotoFruta = '';
  function posicionarPlacas(cena, lay) {
    if (!placasEl) placasEl = palco.querySelector('.placas');
    if (!fotoFruta) fotoFruta = A.urlFruta(0, 40);
    var n = cena.jogadores.length;
    while (placas.length < n) {
      var d = document.createElement('div'); d.className = 'placa';
      d.innerHTML = '<b></b><span class="pf"><img src="' + fotoFruta + '" alt=""><i>0</i></span>';
      placasEl.appendChild(d); placas.push({ el: d, nome: d.querySelector('b'), num: d.querySelector('i'), k: '' });
    }
    for (var j = 0; j < placas.length; j++) {
      var pl = placas[j], jog = cena.jogadores[j];
      if (!jog || cena.semPlacas) { if (pl.k !== 'x') { pl.el.style.display = 'none'; pl.k = 'x'; } continue; }
      var f = lay.faixas[j], frutas = jog.p ? jog.p.frutas : 0;
      var k = jog.nome + '|' + (jog.ajuda ? 1 : 0) + '|' + frutas + '|' + f[0] + '|' + jog.id + '|' + (cena.mostrarFrutas ? 1 : 0);
      if (pl.k === k) continue;
      pl.k = k;
      pl.el.style.display = '';
      pl.el.style.top = (f[0] - 66 * f[1]) + 'px';
      pl.el.style.left = '10px';
      pl.el.style.fontSize = Math.round(24 * f[1]) + 'px';
      pl.el.style.borderColor = A.dino(jog.id).escuro;
      pl.nome.textContent = (jog.ajuda ? '🧸 ' : '') + jog.nome;
      pl.num.textContent = frutas;
      pl.el.querySelector('.pf').style.display = cena.mostrarFrutas ? '' : 'none';
      if (cena.mostrarFrutas && frutas > 0) { pl.el.classList.remove('pulsa'); void pl.el.offsetWidth; pl.el.classList.add('pulsa'); }
    }
  }

  function progresso(fr, dinoId) {
    hud.hidden = false;
    marcador.style.left = (fr * 100) + '%';
    if (marcador.dataset.id !== dinoId) { marcador.dataset.id = dinoId; marcador.style.backgroundImage = 'url(' + A.urlDino(dinoId, 'corre0', 96) + ')'; }
  }
  function esconderHud() { hud.hidden = true; }

  /* ---------- telas por cima (HTML) ---------- */
  function mostrar(html, classe) { camada.className = 'camada ' + (classe || ''); camada.innerHTML = html; }
  function logo(cls) {
    return '<div class="logo ' + (cls || '') + '"><img src="' + A.urlDino('verde', 'pulo', 140) + '" alt=""><span>Dino<br><b>Pula-Pula</b></span></div>';
  }

  function lobby(d) {
    // d: {qr, codigo, link, erro, conectado, jogadores: [{nome, id, ajuda, tipo}], cfg, foco, cheia, n}
    var botoes = [
      ['comecar', d.jogadores.length ? '▶ Começar' : '▶ Começar', 'grande verde' + (d.jogadores.length ? '' : ' apagado')],
      ['op:tempo', '⏱️ Corrida: <b>' + ({ 45: 'curta', 60: 'média', 90: 'longa' }[d.cfg.tempo] || d.cfg.tempo + ' s') + '</b>'],
      ['op:ritmo', (d.cfg.ritmo === 'calma' ? '🐢' : d.cfg.ritmo === 'rapida' ? '🐆' : '🐇') + ' Velocidade: <b>' + ({ calma: 'calma', normal: 'normal', rapida: 'rápida' }[d.cfg.ritmo]) + '</b>'],
      ['op:controle', '🎮 Controle da TV joga: <b>' + ({ nao: 'não', sim: 'sim', crianca: 'sim, criança 🧸' }[d.cfg.controle]) + '</b>'],
      ['op:musica', '🎵 Música: <b>' + (d.cfg.musica ? 'sim' : 'não') + '</b>']
    ];
    var qr = d.erro ? '<div class="qr-erro">' + esc(d.erro) + '<br><button data-tv="reconectar" class="botao">Tentar de novo</button></div>'
      : d.qr ? '<div class="qr-img">' + d.qr + '</div><div class="qr-codigo">' + esc(d.codigo) + '</div>'
      : '<div class="qr-espera">Abrindo a sala…</div>';
    mostrar(
      '<div class="lb">' +
        '<div class="lb-esq">' + logo() + '<p class="lb-sub">Cada um pega um celular.<br><b>Tocou, o dino pula!</b></p>' +
          (d.jogadores.length ? '' : '<p class="lb-dica">Aponte a câmera do celular para o QR Code ➜</p>') +
          (d.cheia ? '<p class="lb-dica">Corrida cheia: só 4 dinos por vez.</p>' : '') + '</div>' +
        '<div class="lb-meio">' + botoes.map(function (b) { return '<button class="botao ' + (b[2] || '') + '" data-tv="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '</div>' +
        '<div class="lb-qr"><div class="qr-cartao">' + qr + '<div class="qr-txt">📱 Aponte a câmera<br>do celular</div></div></div>' +
      '</div>' +
      '<div class="cantinho"><button data-tv="testeTv" class="mini">teste tv</button><a class="mini" href="?modo=pc">teste pc</a><button data-tv="telaCheia" class="mini">⛶</button></div>',
      'em-lobby');
  }
  function contagem(n) {
    mostrar('<div class="contagem"><span class="num">' + (n > 0 ? n : 'Já!') + '</span></div>', 'em-contagem');
  }
  function vazio() { mostrar('', ''); }
  function fim(res) {
    // res: [{nome, id, frutas, titulo, icone, pos, ajuda}]
    var fruta = A.urlFruta(0, 48);
    mostrar(
      '<div class="fim"><div class="fim-cartao">' +
        '<h2>Chegamos ao ninho! 🥚</h2>' +
        '<div class="fim-lista">' + res.map(function (r, i) {
          return '<div class="fim-dino" style="--atraso:' + (i * 0.25) + 's;--cor:' + A.dino(r.id).corpo + '">' +
            '<img class="fim-foto" src="' + A.urlDino(r.id, 'feliz', 160) + '" alt="">' +
            '<div class="fim-nome">' + (r.ajuda ? '🧸 ' : '') + esc(r.nome) + '</div>' +
            '<div class="fim-frutas"><img src="' + fruta + '" alt="">' + r.frutas + '</div>' +
            '<div class="fim-titulo"><span>' + r.icone + '</span>' + esc(r.titulo) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="fim-botoes"><button class="botao grande verde" data-tv="denovo">🔁 Correr de novo</button><button class="botao" data-tv="menu">👥 Trocar jogadores</button></div>' +
      '</div></div>', 'em-fim');
  }

  window.TV = {
    montar: montar, ajustar: ajustar, desenhar: desenhar, efeito: efeito, progresso: progresso, esconderHud: esconderHud,
    lobby: lobby, contagem: contagem, fim: fim, vazio: vazio, logo: logo, LAYOUTS: LAYOUTS, DX: DX, confete: confete,
    limparEfeitos: function () { parts.length = 0; }
  };
})();
