/* Pinta-Chão dos Bichos — a TELA DA TV: palco 1280×720 (canvas do chão + placar por cima) e as telas de sala, contagem e fim. */
(function () {
  'use strict';
  var A = window.Arte, M = window.Mundo;
  var L = 1280, H = 720, CEL = 50, AX = 40, AY = 104, AW = M.COLS * CEL, AH = M.ROWS * CEL;
  var palco, canvas, ctx, hud, camada, fundoC = null, tinta, tctx, tema = 0, mapa = 0;

  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- montagem ---------- */
  var RES = 1, forcarRes = +(new URLSearchParams(location.search).get('res') || 0);
  function montar(el) {
    el.innerHTML = '<div class="palco"><canvas></canvas><div class="hud" hidden>' +
      '<div class="relogio"><span>60</span></div><div class="barra"><div class="barra-trilha"></div><div class="barra-rostos"></div><div class="barra-metas"></div></div></div>' +
      '<div class="camada"></div></div>';
    palco = el.querySelector('.palco'); canvas = el.querySelector('canvas'); ctx = canvas.getContext('2d');
    hud = el.querySelector('.hud'); camada = el.querySelector('.camada');
    tinta = A.tela(AW, AH); tctx = tinta.getContext('2d');
    ajustar(); window.addEventListener('resize', ajustar);
  }
  function ajustar() {
    var pai = palco.parentNode, w = pai.clientWidth, h = pai.clientHeight || w * 9 / 16;
    var k = Math.min(w / L, h / H);
    palco.style.transform = 'translate(' + ((w - L * k) / 2) + 'px,' + ((h - H * k) / 2) + 'px) scale(' + k + ')';
    var dpr = window.devicePixelRatio || 1;
    var r = forcarRes || Math.max(1, Math.min(1.5, Math.round(k * dpr * 2) / 2));
    if (lento) r = 1;
    if (r !== RES || !fundoC) mudarRes(r);
  }
  function mudarRes(r) {
    RES = r; A.definirRes(r);
    canvas.width = Math.round(L * r); canvas.height = Math.round(H * r);
    canvas.style.width = L + 'px'; canvas.style.height = H + 'px';
    var velha = tinta; tinta = A.tela(AW * r, AH * r); tctx = tinta.getContext('2d'); tctx.drawImage(velha, 0, 0, tinta.width, tinta.height); tctx.setTransform(r, 0, 0, r, 0, 0);
    fundoC = A.fundo(tema, L, H, { x: AX, y: AY, w: AW, h: AH, cel: CEL }, r);
  }
  // Se a TV não der conta (quadros lentos), volta para a resolução normal sozinha.
  var lento = false, somaDt = 0, quadros = 0;
  function medir(dt) {
    if (lento || RES <= 1 || forcarRes) return;
    somaDt += dt; quadros++;
    if (quadros >= 120) { if (somaDt / quadros > 0.03) { lento = true; mudarRes(1); } somaDt = 0; quadros = 0; }
  }

  /* ---------- chão pintado ---------- */
  function limparTinta(novoTema, novoMapa) {
    if (novoTema !== undefined && novoTema !== tema) { tema = novoTema; fundoC = A.fundo(tema, L, H, { x: AX, y: AY, w: AW, h: AH, cel: CEL }, RES); }
    if (novoMapa !== undefined) mapa = novoMapa;
    tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, tinta.width, tinta.height); tctx.setTransform(RES, 0, 0, RES, 0, 0);
  }
  function hash(k) { return (Math.imul(k ^ 0x5bd1e995, 2654435761) >>> 0) % 1000; }
  // uma "mancha" de tinta no quadradinho i (com respingos, para parecer tinta de verdade)
  function pingo(i, cor) {
    var x = (i % M.COLS) * CEL + CEL / 2, y = Math.floor(i / M.COLS) * CEL + CEL / 2, h = hash(i + (pingos++ & 3) * 131);
    tctx.fillStyle = cor;
    tctx.beginPath(); tctx.arc(x, y, CEL * 0.68, 0, 6.2832); tctx.fill();
    var a = h / 1000 * 6.28, d = CEL * (0.62 + (h % 7) / 30);
    tctx.beginPath(); tctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 5 + h % 5, 0, 6.2832); tctx.fill();
    if (h % 3 === 0) { tctx.beginPath(); tctx.arc(x - Math.cos(a) * d * 0.9, y + Math.sin(a * 2) * d * 0.7, 3 + h % 4, 0, 6.2832); tctx.fill(); }
    // brilho de tinta molhada
    tctx.fillStyle = 'rgba(255,255,255,.22)'; tctx.beginPath(); tctx.ellipse(x - CEL * 0.18, y - CEL * 0.2, CEL * 0.2, CEL * 0.11, -0.6, 0, 6.2832); tctx.fill();
  }
  var pingos = 0;
  function tintaEv(e, cores) {
    pingo(e.i, e.slot === M.LAMA ? A.LAMA : cores[e.slot] || '#999');
  }

  /* ---------- partículas ---------- */
  var parts = [];
  function part(p) { if (parts.length < 260) parts.push(p); }
  var CORES = ['#ff4f9a', '#ffc21a', '#2fc24f', '#2f8cff', '#9b5cff', '#ff7a1a'];
  function px(x) { return AX + x * CEL; }
  function py(y) { return AY + y * CEL; }
  function efeito(e, cores) {
    var x = px(e.x || 0), y = py(e.y || 0), cor = e.slot !== undefined ? cores[e.slot] : '#fff';
    if (e.tipo === 'item') {
      if (e.item === 'balde') {
        for (var i = 0; i < 26; i++) { var a = i / 26 * 6.28; part({ tipo: 'pt', x: x, y: y, vx: Math.cos(a) * (300 + Math.random() * 200), vy: Math.sin(a) * (300 + Math.random() * 200) - 100, g: 600, vida: 0.6, cor: cor, r: 7 + Math.random() * 6 }); }
        part({ tipo: 'anel', x: x, y: y, vida: 0.5, r: 120, cor: cor });
        part({ tipo: 'txt', x: x, y: y - 50, vx: 0, vy: -60, vida: 1.1, txt: 'SPLASH!', cor: cor, tam: 48 });
        tremor = 0.18;
      } else {
        for (var k = 0; k < 14; k++) part({ tipo: 'brilho', x: x, y: y - 20, vx: (Math.random() - 0.5) * 400, vy: -Math.random() * 380, g: 500, vida: 0.7, r: 7, cor: e.item === 'raio' ? '#ffe066' : CORES[k % 6] });
        part({ tipo: 'txt', x: x, y: y - 60, vx: 0, vy: -60, vida: 1.1, txt: e.item === 'raio' ? 'ZUUUM!' : 'PINCELZÃO!', cor: e.item === 'raio' ? '#ffe066' : cor, tam: 40 });
      }
    } else if (e.tipo === 'apareceu') {
      for (var z = 0; z < 8; z++) { var b = z / 8 * 6.28; part({ tipo: 'brilho', x: x, y: y - 16, vx: Math.cos(b) * 160, vy: Math.sin(b) * 160, vida: 0.45, r: 6, cor: '#fff' }); }
    } else if (e.tipo === 'lavou') {
      for (var q = 0; q < 16; q++) part({ tipo: 'bolha', x: x + (Math.random() - 0.5) * 50, y: y - Math.random() * 40, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 120, vida: 1 + Math.random() * 0.5, r: 5 + Math.random() * 9 });
      part({ tipo: 'txt', x: x, y: y - 60, vx: 0, vy: -50, vida: 1.1, txt: 'Tchibum!', cor: '#7fd6ff', tam: 40 });
    } else if (e.tipo === 'porcoVoltou') {
      for (var w = 0; w < 10; w++) part({ tipo: 'pt', x: x + (Math.random() - 0.5) * 40, y: y - 10, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 160, vida: 0.5, cor: A.LAMA, r: 6 + Math.random() * 5 });
    } else if (e.tipo === 'ultimos10') {
      part({ tipo: 'txt', x: L / 2, y: 380, vx: 0, vy: -20, vida: 2, txt: 'Últimos 10 segundos!', cor: '#ffe066', tam: 66 });
    }
  }
  function confete() { for (var i = 0; i < 150; i++) part({ tipo: 'confete', x: Math.random() * L, y: -20 - Math.random() * 400, vx: (Math.random() - 0.5) * 80, vy: 120 + Math.random() * 160, vida: 5, cor: CORES[i % 6], r: 6 + Math.random() * 5, rot: Math.random() * 6 }); }
  var tremor = 0;
  function desenharParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vida -= dt; if (p.vida <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
      p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.g) p.vy += p.g * dt;
      ctx.globalAlpha = Math.min(1, p.vida * 3);
      if (p.tipo === 'pt') A.circulo(ctx, p.x, p.y, p.r, p.cor);
      else if (p.tipo === 'brilho') { A.estrelaPath(ctx, p.x, p.y, p.r * 1.4, p.r * 0.5, 4); ctx.fillStyle = p.cor; ctx.fill(); }
      else if (p.tipo === 'bolha') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = 'rgba(190,235,255,.45)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.stroke(); }
      else if (p.tipo === 'confete') { p.rot += dt * 6; ctx.save(); ctx.translate(p.x + Math.sin(p.rot) * 10, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.cor; ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8); ctx.restore(); }
      else if (p.tipo === 'anel') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.1 - p.vida * 1.4) + 10, 0, 7); ctx.strokeStyle = p.cor; ctx.lineWidth = 8; ctx.stroke(); }
      else if (p.tipo === 'txt') {
        ctx.font = '700 ' + Math.round(p.tam) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
        ctx.lineWidth = 8; ctx.strokeStyle = '#2b2140'; ctx.strokeText(p.txt, p.x, p.y); ctx.fillStyle = p.cor; ctx.fillText(p.txt, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- desenho de um quadro ----------
     cena: { m (mundo), jogadores: [{id, nome, ajuda, cor}], cores: [cor de cada "slot" de tinta], relogio, festa, equipes } */
  function desenhar(cena, dt) {
    medir(dt);
    var m = cena.m, t = cena.relogio;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    if (tremor > 0) { tremor -= dt; ctx.translate((Math.random() - 0.5) * 12 * tremor / 0.18, (Math.random() - 0.5) * 9 * tremor / 0.18); }
    ctx.drawImage(fundoC, 0, 0, L, H);
    ctx.drawImage(tinta, AX, AY, AW, AH);
    if (!m) { desenharParts(dt); return; }
    // tudo que fica "em pé" no chão, do fundo para a frente
    var lista = [];
    M.MAPAS[m.mapa].forEach(function (c, k) { lista.push({ y: c[1] + 0.5, f: function () { var x = px(c[0] + 0.5), y = py(c[1] + 0.5) + 18; A.elipse(ctx, x, y - 2, 20, 7, 'rgba(0,0,0,.2)'); A.por(ctx, A.figObs(tema, (c[0] + c[1]) % 2, 1), x, y); } }); });
    m.itens.forEach(function (it) {
      lista.push({ y: it.y, f: function () {
        if (it.vida < 2 && Math.floor(t * 8) % 2) return;
        var x = px(it.x), y = py(it.y) + 14, pula = Math.abs(Math.sin(t * 4 + it.id)) * 8;
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 6 + it.id); A.circulo(ctx, x, y - 16, 30, '#fff'); ctx.globalAlpha = 1;
        A.elipse(ctx, x, y, 16, 5, 'rgba(0,0,0,.2)');
        A.por(ctx, A.figItem(it.tipo, 0.85), x, y - pula);
      } });
    });
    m.porcos.forEach(function (g, k) {
      if (g.fora > 0) return;
      lista.push({ y: g.y, f: function () {
        var x = px(g.x), y = py(g.y) + 16, q = g.andando ? (Math.floor(t * 8 + k) % 2 ? 'anda0' : 'anda1') : 'parado';
        A.elipse(ctx, x, y, 20, 6, 'rgba(0,0,0,.22)');
        ctx.save(); ctx.translate(x, y - (g.andando ? Math.abs(Math.sin(t * 12 + k)) * 3 : 0)); if (g.dir === 'e') ctx.scale(-1, 1); A.por(ctx, A.figPorco(q, 0.9), 0, 0); ctx.restore();
      } });
    });
    m.js.forEach(function (p, j) {
      var jog = cena.jogadores[j]; if (!jog) return;
      lista.push({ y: p.y + 0.01, f: function () {
        var x = px(p.x), y = py(p.y) + 18, anda = p.andando || cena.festa;
        var q = cena.festa ? (Math.sin(t * 7 + j) > 0 ? 'feliz' : 'parado') : p.dir === 'c' && p.andando ? 'costas' : anda ? (Math.floor(t * 10 + j * 0.5) % 2 ? 'anda0' : 'anda1') : 'parado';
        var cor = cena.cores[p.slot] || '#fff';
        // anel com a cor da tinta (no modo Equipes, a cor do time)
        ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(x, y - 1, 24, 9, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fill(); ctx.strokeStyle = cor; ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1;
        if (p.raio > 0) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 20); A.circulo(ctx, x, y - 30, 40, '#fff27a'); ctx.globalAlpha = 1; if (Math.random() < 0.5) part({ tipo: 'brilho', x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 50, vx: 0, vy: -40, vida: 0.35, r: 5, cor: '#ffe066' }); }
        if (p.pincel > 0) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 10); A.circulo(ctx, x, y - 16, 46, cor); ctx.globalAlpha = 1; }
        var pulo = cena.festa ? Math.abs(Math.sin(t * 7 + j)) * 22 : anda ? Math.abs(Math.sin(t * 14 + j)) * 4 : 0;
        var incl = anda && !cena.festa ? (p.dir === 'e' ? -0.07 : p.dir === 'd' ? 0.07 : 0) : 0;
        ctx.save(); ctx.translate(x, y - pulo); ctx.rotate(incl); A.por(ctx, A.figBicho(jog.id, q, cena.festa ? '' : (p.olhar || 'b'), 0.78), 0, 0); ctx.restore();
        if (p.pincel > 0) { ctx.save(); ctx.translate(x + 26, y - 62 - pulo); ctx.rotate(Math.sin(t * 8) * 0.3); A.por(ctx, A.figItem('pincel', 0.45), 0, 0); ctx.restore(); }
        // respingos de tinta no caminho
        if (p.andando && Math.random() < dt * 9) part({ tipo: 'pt', x: x + (Math.random() - 0.5) * 20, y: y - 4, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 60, g: 400, vida: 0.35, cor: cor, r: 3 + Math.random() * 3 });
        if (!cena.semNomes) A.por(ctx, A.figEtiqueta((jog.ajuda ? '🧸 ' : '') + jog.nome, cor, 0.85), x, y - 82 - pulo);
      } });
    });
    lista.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < lista.length; i++) lista[i].f();
    desenharParts(dt);
  }

  /* ---------- placar no topo (HTML) ---------- */
  var hudK = '', segs = [], rostos = [];
  function placar(d) {
    // d: {tempo, total, barras: [{cor, n, rostos: [id]}], metas: [frac] | null, estrelas}
    hud.hidden = false;
    var rel = hud.querySelector('.relogio'), s = Math.max(0, Math.ceil(d.tempo));
    var span = rel.firstChild; if (span.textContent !== String(s)) { span.textContent = s; rel.classList.toggle('acabando', s <= 10); }
    var k = d.barras.map(function (b) { return b.cor + b.rostos.join('+'); }).join('|') + '|' + (d.metas || '');
    var trilha = hud.querySelector('.barra-trilha'), rs = hud.querySelector('.barra-rostos'), mt = hud.querySelector('.barra-metas');
    if (k !== hudK) {
      hudK = k;
      trilha.innerHTML = d.barras.map(function (b) { return '<i style="background:' + b.cor + '"></i>'; }).join('');
      rs.innerHTML = d.barras.map(function (b) { return '<span>' + b.rostos.map(function (id) { return '<img src="' + A.urlBicho(id, 'parado', 64, 'b') + '" alt="">'; }).join('') + '</span>'; }).join('');
      mt.innerHTML = (d.metas || []).map(function (f) { return '<b style="left:' + (f * 100) + '%">★</b>'; }).join('');
      segs = trilha.querySelectorAll('i'); rostos = rs.querySelectorAll('span');
    }
    var acum = 0;
    d.barras.forEach(function (b, i) {
      var f = b.n / d.total, w = (f * 100).toFixed(1) + '%';
      if (segs[i].style.width !== w) segs[i].style.width = w;
      var l = ((acum + f / 2) * 100).toFixed(1) + '%';
      if (rostos[i].style.left !== l) rostos[i].style.left = l;
      rostos[i].style.opacity = f > 0.03 || d.barras.length === 1 ? 1 : 0.6;
      acum += f;
    });
    if (d.metas) { var est = mt.querySelectorAll('b'); for (var e = 0; e < est.length; e++) est[e].classList.toggle('ok', e < d.estrelas); }
  }
  function esconderHud() { hud.hidden = true; }

  /* ---------- telas por cima (HTML) ---------- */
  function mostrar(html, classe) { camada.className = 'camada ' + (classe || ''); camada.innerHTML = html; }
  function logo(cls) {
    var letras = 'Pinta-Chão'.split('').map(function (c, i) { return '<i style="color:' + CORES[i % 6] + '">' + c + '</i>'; }).join('');
    return '<div class="logo ' + (cls || '') + '"><img src="' + A.urlBicho('gata', 'feliz', 140) + '" alt=""><span>' + letras + '<b>dos Bichos</b></span></div>';
  }
  var NOMES_MODO = { cada: '🏆 Cada um por si', equipes: '👥 Equipes', juntos: '🤝 Todos juntos' };
  function lobby(d) {
    var botoes = [
      ['comecar', '▶ Começar', 'grande verde' + (d.jogadores.length ? '' : ' apagado')],
      ['op:modo', 'Jogo: <b>' + NOMES_MODO[d.cfg.modo] + '</b>'],
      ['op:tempo', '⏱️ Tempo: <b>' + ({ 45: 'curto', 60: 'médio', 90: 'longo' }[d.cfg.tempo] || d.cfg.tempo + ' s') + '</b>'],
      ['op:ritmo', (d.cfg.ritmo === 'calma' ? '🐢' : d.cfg.ritmo === 'rapida' ? '🐆' : '🐇') + ' Velocidade: <b>' + ({ calma: 'calma', normal: 'normal', rapida: 'rápida' }[d.cfg.ritmo]) + '</b>'],
      ['op:controle', '🎮 Controle da TV joga: <b>' + ({ nao: 'não', sim: 'sim', crianca: 'sim, criança 🧸' }[d.cfg.controle]) + '</b>'],
      ['op:musica', '🎵 Música: <b>' + (d.cfg.musica ? 'sim' : 'não') + '</b>']
    ];
    var dicaModo = { cada: 'Quem pintar mais chão ganha!', equipes: 'Dois times: rosa contra azul.', juntos: 'Todos pintam juntos e lavam os porquinhos de lama!' }[d.cfg.modo];
    var qr = d.erro ? '<div class="qr-erro">' + esc(d.erro) + '<br><button data-tv="reconectar" class="botao">Tentar de novo</button></div>'
      : d.codigo === 'TEST' && !d.qr ? '<div class="qr-espera">Simulador:<br>os celulares estão<br>aqui embaixo ⬇</div>'
      : d.qr ? '<div class="qr-img">' + d.qr + '</div><div class="qr-codigo">' + esc(d.codigo) + '</div>'
      : '<div class="qr-espera">Abrindo a sala…</div>';
    mostrar(
      '<div class="lb-esq">' + logo() +
        '<div class="lb-meio">' + botoes.map(function (b) { return '<button class="botao ' + (b[2] || '') + '" data-tv="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '</div>' +
        '<p class="lb-dica">' + dicaModo + '</p>' +
        (d.cheia ? '<p class="lb-dica">Cheio: só 4 bichinhos por vez.</p>' : '') + '</div>' +
      '<div class="lb-qr"><div class="qr-cartao">' + qr + '<div class="qr-txt">📱 Aponte a câmera<br>do celular</div></div>' +
        '<p class="lb-treino">' + (d.jogadores.length ? 'Já pode treinar: aperte as setas no celular!' : 'Cada um entra pelo celular e escolhe um bichinho.') + '</p></div>' +
      '<div class="cantinho"><button data-tv="testeTv" class="mini">teste tv</button><a class="mini" href="?modo=pc">teste pc</a><button data-tv="telaCheia" class="mini">⛶</button></div>',
      'em-lobby');
  }
  function contagem(n, txt) { mostrar('<div class="contagem"><span class="num">' + (n > 0 ? n : 'Já!') + '</span>' + (txt ? '<p>' + esc(txt) + '</p>' : '') + '</div>', 'em-contagem'); }
  function vazio() { mostrar('', ''); }
  function fim(r, jogadores, cores) {
    var titulo, topo = '';
    if (r.modo === 'equipes') {
      titulo = r.vencedora < 0 ? 'Empate! 🤝' : A.EQUIPES[r.vencedora].nome + ' venceu! 🏆';
      topo = '<div class="fim-times">' + r.equipes.map(function (e) {
        var membros = r.jogadores.filter(function (x) { return x.slot === e.slot; });
        return '<div class="fim-time' + (r.vencedora === e.slot ? ' venceu' : '') + '" style="--cor:' + A.EQUIPES[e.slot].cor + '"><b>' + e.pct + '%</b><span>' +
          membros.map(function (x) { return '<img src="' + A.urlBicho(jogadores[x.j].id, 'feliz', 80) + '" alt="">'; }).join('') + '</span></div>';
      }).join('') + '</div>';
    } else if (r.modo === 'juntos') {
      titulo = r.estrelas >= 3 ? 'Vocês conseguiram! 🎉' : r.estrelas > 0 ? 'Muito bem, equipe!' : 'Quase! Vamos de novo?';
      topo = '<div class="fim-juntos"><b>' + r.pct + '%</b><span class="fim-estrelas">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < r.estrelas ? 'ok' : '') + '" style="--atraso:' + (0.5 + i * 0.35) + 's">★</i>'; }).join('') + '</span></div>';
    } else titulo = r.jogadores.length > 1 ? 'Quem pintou mais?' : 'Que pintura linda!';
    mostrar(
      '<div class="fim"><div class="fim-cartao">' +
        '<h2>' + titulo + '</h2>' + topo +
        '<div class="fim-lista">' + r.jogadores.map(function (x, i) {
          var jg = jogadores[x.j];
          return '<div class="fim-bicho" style="--atraso:' + (i * 0.2) + 's;--cor:' + cores[x.slot] + '">' +
            (r.modo === 'cada' && r.jogadores.length > 1 ? '<i class="fim-pos">' + x.pos + 'º</i>' : '') +
            '<img class="fim-foto" src="' + A.urlBicho(jg.id, 'feliz', 120) + '" alt="">' +
            '<div class="fim-nome">' + (jg.ajuda ? '🧸 ' : '') + esc(jg.nome) + '</div>' +
            (r.modo === 'cada' ? '<div class="fim-pct">' + x.pct + '%</div>' : '') +
            '<div class="fim-titulo"><span>' + x.icone + '</span>' + esc(x.titulo) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="fim-botoes"><button class="botao grande verde" data-tv="denovo">🔁 Jogar de novo</button><button class="botao" data-tv="menu">👥 Trocar jogadores</button></div>' +
      '</div></div>', 'em-fim');
  }

  window.TV = {
    montar: montar, ajustar: ajustar, desenhar: desenhar, efeito: efeito, tinta: tintaEv, limparTinta: limparTinta, placar: placar, esconderHud: esconderHud,
    lobby: lobby, contagem: contagem, fim: fim, vazio: vazio, logo: logo, confete: confete, NOMES_MODO: NOMES_MODO,
    limparEfeitos: function () { parts.length = 0; }
  };
})();
