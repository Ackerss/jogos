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
  function montar(el) {
    el.innerHTML = '<div class="palco"><canvas width="' + L + '" height="' + H + '"></canvas><div class="hud" hidden>' +
      '<div class="barra"><div class="barra-trilha"><i class="b0"></i><i class="b1"></i><i class="b2"></i></div><span class="barra-ninho"></span><span class="barra-dino"></span></div></div>' +
      '<div class="placas"></div><div class="camada"></div></div>';
    palco = el.querySelector('.palco'); canvas = el.querySelector('canvas'); ctx = canvas.getContext('2d');
    hud = el.querySelector('.hud'); camada = el.querySelector('.camada');
    barra = el.querySelector('.barra'); marcador = el.querySelector('.barra-dino');
    var ninho = A.tela(90, 50), nc = ninho.getContext('2d'); nc.drawImage(A.figNinho(0.5).c, 0, 0);
    el.querySelector('.barra-ninho').style.backgroundImage = 'url(' + ninho.toDataURL() + ')';
    ajustar(); window.addEventListener('resize', ajustar);
    preparar();
  }
  function ajustar() {
    var pai = palco.parentNode, w = pai.clientWidth, h = pai.clientHeight || w * 9 / 16;
    var k = Math.min(w / L, h / H);
    palco.style.transform = 'translate(' + ((w - L * k) / 2) + 'px,' + ((h - H * k) / 2) + 'px) scale(' + k + ')';
  }

  /* ---------- cenário pronto (figurinhas grandes) ---------- */
  var ceus = [], longes = [], meios = [], gradChao = [];
  function preparar() {
    for (var b = 0; b < 3; b++) {
      var B = A.BIOMAS[b], c = A.tela(L, 460), x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 0, 460); g.addColorStop(0, B.ceu[0]); g.addColorStop(1, B.ceu[1]);
      x.fillStyle = g; x.fillRect(0, 0, L, 460);
      var s = x.createRadialGradient(1080, 110, 10, 1080, 110, 120); s.addColorStop(0, 'rgba(255,255,220,.9)'); s.addColorStop(1, 'rgba(255,255,220,0)');
      x.fillStyle = s; x.fillRect(900, 0, 380, 260); A.circulo(x, 1080, 110, 46, B.sol);
      ceus.push(c);
      longes.push(A.camadaLonge(b, L, 200));
      meios.push(A.camadaMeio(b, L, 150));
    }
  }

  /* ---------- partículas (efeitos) ---------- */
  var parts = [];
  function part(p) { if (parts.length < 160) parts.push(p); }
  function efeito(e, faixa, cena) {
    var y0 = faixa.y, s = faixa.s, p = cena.jogadores[e.j] && cena.jogadores[e.j].p, yd = y0 - (p ? p.y : 0) * s;
    if (e.tipo === 'fruta') {
      part({ tipo: 'txt', x: DX + 30 * s, y: yd - 110 * s, vx: 0, vy: -70, vida: 0.8, txt: '+1', cor: '#fff', tam: 34 * s });
      for (var i = 0; i < 6; i++) part({ tipo: 'pt', x: DX + 20 * s, y: yd - 50 * s, vx: (Math.random() - 0.3) * 260, vy: -Math.random() * 260, vida: 0.45, cor: ['#fff36b', '#ff86bd', '#7fe0ff'][i % 3], r: 5 * s });
    } else if (e.tipo === 'tombo') {
      for (var k = 0; k < 8; k++) part({ tipo: 'pt', x: DX + 30 * s, y: y0 - 10 * s, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 160, vida: 0.5, cor: 'rgba(255,255,255,.85)', r: (8 + Math.random() * 8) * s });
      for (var f = 0; f < e.perdeu; f++) part({ tipo: 'fruta', f: f * 2 % 6, x: DX, y: yd - 60 * s, vx: -120 - Math.random() * 200, vy: -360 - Math.random() * 200, g: 1100, vida: 1.1, s: s });
      part({ tipo: 'tonto', x: DX + 20 * s, y: yd - 120 * s, vida: 1, s: s });
    } else if (e.tipo === 'quebrou') {
      for (var q = 0; q < 10; q++) part({ tipo: 'pt', x: DX + 50 * s, y: y0 - 30 * s, vx: Math.random() * 500, vy: -200 - Math.random() * 400, g: 1400, vida: 0.8, cor: ['#9aa3b5', '#ffd23f', '#ff86bd'][q % 3], r: (6 + Math.random() * 6) * s });
      part({ tipo: 'txt', x: DX + 60 * s, y: yd - 120 * s, vx: 0, vy: -80, vida: 0.9, txt: 'POW!', cor: '#ffd23f', tam: 44 * s });
    } else if (e.tipo === 'estrela') {
      for (var z = 0; z < 16; z++) { var a = z / 16 * Math.PI * 2; part({ tipo: 'brilho', x: DX, y: yd - 50 * s, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, vida: 0.7, r: 9 * s, cor: 'hsl(' + z * 22 + ',100%,65%)' }); }
    } else if (e.tipo === 'pulo' || e.tipo === 'pousou') {
      for (var d = 0; d < 3; d++) part({ tipo: 'pt', x: DX - 10 * s + d * 12 * s, y: y0 - 4 * s, vx: -80 - d * 40, vy: -40, vida: 0.3, cor: 'rgba(255,255,255,.7)', r: 6 * s });
    }
  }
  function desenharParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vida -= dt; if (p.vida <= 0) { parts.splice(i, 1); continue; }
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.g) p.vy += p.g * dt;
      ctx.globalAlpha = Math.min(1, p.vida * 3);
      if (p.tipo === 'pt' || p.tipo === 'brilho') { A.circulo(ctx, p.x, p.y, p.r, p.cor); }
      else if (p.tipo === 'txt') {
        ctx.font = '700 ' + Math.round(p.tam) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 6; ctx.strokeStyle = '#2b2140'; ctx.strokeText(p.txt, p.x, p.y); ctx.fillStyle = p.cor; ctx.fillText(p.txt, p.x, p.y);
      } else if (p.tipo === 'fruta') { var f = A.figFruta(p.f, p.s); ctx.drawImage(f.c, p.x - f.ox, p.y - f.oy); }
      else if (p.tipo === 'tonto') {
        for (var k = 0; k < 3; k++) { var a = p.vida * 9 + k * 2.1; ctx.save(); ctx.translate(p.x + Math.cos(a) * 26 * p.s, p.y + Math.sin(a) * 8 * p.s); A.estrelaPath(ctx, 0, 0, 9 * p.s, 4 * p.s, 5); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.restore(); }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- desenho da pista ----------
     cena: { dist, relogio, jogadores: [{id, nome, ajuda, p:{y, chao, tombo, invul, poder, pegou, bateu}}], itens, quebrados: [{id:1}], ninhoX, bioma (0..2.99), festa } */
  var ultimo = 0;
  function desenhar(cena, dt) {
    var n = Math.max(1, Math.min(4, cena.jogadores.length || 1)), lay = LAYOUTS[n], hz = lay.horiz, t = cena.relogio, dist = cena.dist;
    var bf = cena.bioma || 0, b0 = Math.floor(bf), mix = Math.max(0, Math.min(1, (bf - b0 - 0.88) / 0.12)), b1 = Math.min(2, b0 + 1);
    function camadas(b, alfa) {
      ctx.globalAlpha = alfa;
      ctx.drawImage(ceus[b], 0, 0, L, hz + 30, 0, 0, L, hz + 30);
      if (alfa === 1 || b === b1) {
        for (var i = 0; i < 4; i++) { var nx = ((i * 380 - t * 14 - dist * 0.02) % 1520 + 1520) % 1520 - 160; A.nuvem(ctx, nx, 60 + (i % 2) * 70 + (i === 3 ? 30 : 0), 0.9 + (i % 3) * 0.25, 0.9 * alfa); }
      }
      ctx.globalAlpha = alfa;
      var o1 = -((dist * 0.05) % L), o2 = -((dist * 0.22) % L);
      ctx.drawImage(longes[b], o1, hz - 190); ctx.drawImage(longes[b], o1 + L, hz - 190);
      ctx.drawImage(meios[b], o2, hz - 146); ctx.drawImage(meios[b], o2 + L, hz - 146);
      var B = A.BIOMAS[b];
      if (!gradChao[b] || gradChao[b].hz !== hz) { var g = ctx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, B.chao[0]); g.addColorStop(1, B.chao[1]); gradChao[b] = { g: g, hz: hz }; }
      ctx.fillStyle = gradChao[b].g; ctx.fillRect(0, hz, L, H - hz);
      lay.faixas.forEach(function (f) {
        var y = f[0], s = f[1];
        ctx.fillStyle = B.trilhaBorda; ctx.fillRect(0, y - 15 * s, L, 30 * s);
        ctx.fillStyle = B.trilha; ctx.fillRect(0, y - 12 * s, L, 24 * s);
        // pedrinhas e tufos que passam (dão a sensação de velocidade)
        var passo = 110, k0 = Math.floor((dist - DX / s) / passo), k1 = Math.ceil((dist + (L - DX) / s) / passo);
        for (var k = k0; k <= k1; k++) {
          var h = (k * 2654435761 >>> 0) % 100, x = DX + (k * passo + h - dist) * s;
          A.elipse(ctx, x, y - 2 * s + (h % 3) * 4 * s, (4 + h % 4) * s, 2.6 * s, B.trilhaBorda);
          if (h < 45) { var ty = y - 24 * s; ctx.strokeStyle = B.tufo; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x - 6 * s, ty); ctx.lineTo(x - 9 * s, ty - 10 * s); ctx.moveTo(x, ty); ctx.lineTo(x, ty - 13 * s); ctx.moveTo(x + 6 * s, ty); ctx.lineTo(x + 9 * s, ty - 10 * s); ctx.stroke(); }
        }
      });
      ctx.globalAlpha = 1;
    }
    camadas(b0, 1);
    if (mix > 0 && b1 !== b0) camadas(b1, mix);

    // faixas: de trás para a frente
    for (var j = 0; j < n; j++) {
      var f = lay.faixas[j], y0 = f[0], s = f[1], jog = cena.jogadores[j];
      var p = jog ? jog.p : null, qb = (cena.quebrados && cena.quebrados[j]) || {};
      // ninho
      if (cena.ninhoX) { var nx = DX + (cena.ninhoX - dist) * s; if (nx > -200 && nx < L + 200) { var fn = A.figNinho(s); ctx.drawImage(fn.c, nx - fn.ox, y0 + 6 * s - fn.oy); } }
      // itens
      var its = cena.itens || [];
      for (var i = 0; i < its.length; i++) {
        var it = its[i], sx = DX + (it.x - dist) * s;
        if (sx < -120 || sx > L + 120) continue;
        if (it.tipo === 'obs') { if (qb[it.id]) continue; var fo = A.figObs(it.forma, s); ctx.drawImage(fo.c, sx - fo.ox, y0 + 4 * s - fo.oy); }
        else if (p && p.pegou[it.id]) continue;
        else if (it.tipo === 'fruta') {
          var ff = A.figFruta(it.f, s), puxa = p && p.poder > 0 && it.x - dist < 260 && it.x - dist > 0 ? (1 - (it.x - dist) / 260) : 0;
          var fy = y0 - (it.y + Math.sin(t * 4 + it.id) * 4) * s, fx = sx;
          if (puxa) { fx += (DX - sx) * puxa * 0.6; fy += (y0 - (p.y + 40) * s - fy) * puxa * 0.6; }
          ctx.drawImage(ff.c, fx - ff.ox, fy - ff.oy);
        } else if (it.tipo === 'estrela') {
          var fe = A.figEstrela(s * (1 + Math.sin(t * 6) * 0.08));
          ctx.drawImage(fe.c, sx - fe.ox, y0 - (it.y + Math.sin(t * 3) * 10) * s - fe.oy);
        }
      }
      if (!jog) continue;
      // sombra
      var alt = p ? p.y : 0;
      ctx.globalAlpha = 0.22; A.elipse(ctx, DX, y0 + 2 * s, 34 * s * Math.max(0.4, 1 - alt / 400), 7 * s, '#000'); ctx.globalAlpha = 1;
      // poder de estrela: aura de arco-íris
      if (p && p.poder > 0) {
        ctx.globalAlpha = p.poder < 1.5 ? 0.25 + 0.25 * Math.sin(t * 20) : 0.45;
        A.circulo(ctx, DX, y0 - (alt + 48) * s, 70 * s, 'hsl(' + Math.round(t * 360) % 360 + ',100%,65%)');
        ctx.globalAlpha = 1;
        if (Math.random() < 0.4) part({ tipo: 'brilho', x: DX - 30 * s, y: y0 - (alt + 20 + Math.random() * 70) * s, vx: -260, vy: 0, vida: 0.35, r: 5 * s, cor: 'hsl(' + Math.round(Math.random() * 360) + ',100%,70%)' });
      }
      var q = cena.festa ? (Math.sin(t * 8 + j) > 0 ? 'feliz' : 'pulo') : !p ? 'parado' : p.tombo > 0 ? 'tombo' : !p.chao ? 'pulo' : cena.parado ? 'parado' : (Math.floor(t * 9 + j * 0.5) % 2 ? 'corre0' : 'corre1');
      var fd = A.figDino(jog.id, q, s), pisca = p && p.invul > 0 && p.tombo <= 0 && Math.floor(t * 10) % 2;
      var pulinho = cena.festa ? Math.abs(Math.sin(t * 8 + j)) * 40 : 0;
      if (pisca) ctx.globalAlpha = 0.4;
      ctx.drawImage(fd.c, DX - fd.ox, y0 - (alt + pulinho) * s - fd.oy);
      ctx.globalAlpha = 1;
    }
    desenharParts(dt);
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
    lobby: lobby, contagem: contagem, fim: fim, vazio: vazio, logo: logo, LAYOUTS: LAYOUTS, DX: DX,
    limparEfeitos: function () { parts.length = 0; }
  };
})();
