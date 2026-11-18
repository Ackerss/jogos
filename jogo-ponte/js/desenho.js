/* Ponte do Desespero — desenho da corrida na TV (Canvas 2D).
   Pensado para a TV LG: sem sombras/desfoque do canvas; céu e montanhas são pintados uma vez
   numa tela escondida e só copiados a cada quadro. No modo "leve", menos partículas. */
(function (raiz) {
  'use strict';
  var W = 1280, H = 720, PISTA_Y = [392, 478, 564], ALT = 84, TOPO = 344, BASE = 612, X0 = 100;

  /* Bichinhos (um por cor). */
  var BICHOS = [
    { nome: 'Raposa', hex: '#ff7a3d', escura: '#b8461a', claro: '#fff1e6', orelha: 'pontuda' },
    { nome: 'Sapo', hex: '#41d36b', escura: '#1d8a3c', claro: '#e9ffe9', orelha: 'sapo' },
    { nome: 'Coelho', hex: '#ff8fc8', escura: '#c24c8a', claro: '#fff0f8', orelha: 'longa' },
    { nome: 'Pinguim', hex: '#4aa8ff', escura: '#1d5fae', claro: '#f2f8ff', orelha: 'nenhuma' },
    { nome: 'Leão', hex: '#ffd23f', escura: '#c48a00', claro: '#fff8dc', orelha: 'juba' },
    { nome: 'Gato', hex: '#b48cff', escura: '#6d45c4', claro: '#f5efff', orelha: 'pontuda' },
    { nome: 'Urso', hex: '#c98b5a', escura: '#7a4a26', claro: '#f7e8db', orelha: 'redonda' },
    { nome: 'Panda', hex: '#f4f4f4', escura: '#2b2b33', claro: '#ffffff', orelha: 'panda' }
  ];

  var TEMAS = {
    vulcao: { ceu: ['#1b1036', '#4a1d4f', '#a3382c'], monte1: '#3a1f3f', monte2: '#2a1830', abismo: ['#ff9d2e', '#d9431c', '#5a1424'], brilho: '#ffb347',
      tabua: '#8a5a3c', tabua2: '#6e452c', junta: '#4a2c1a', corda: '#e7c39a', poste: '#3b2418', fundoBuraco: '#ff7a1f', espinho: '#4a4458', espinho2: '#cfc8e0', pedra: '#6b3a2a', pedra2: '#ff7a1f', onda: '#ff5a1f', onda2: '#ffd04a', sol: '#ff8a4a' },
    gelo: { ceu: ['#8fd3ff', '#c9ecff', '#f1fbff'], monte1: '#b6dcf2', monte2: '#8bbcdc', abismo: ['#2f6fa8', '#1d4f86', '#0d2d55'], brilho: '#bff0ff',
      tabua: '#bfe9ff', tabua2: '#95d4f2', junta: '#6aa9cc', corda: '#ffffff', poste: '#5d8fb3', fundoBuraco: '#16467a', espinho: '#9fdcf3', espinho2: '#ffffff', pedra: '#ffffff', pedra2: '#cdeeff', onda: '#ffffff', onda2: '#cdeeff', sol: '#fff6c9' },
    ceu: { ceu: ['#5b8cff', '#a8b8ff', '#ffc4d6'], monte1: '#ffffff', monte2: '#ffe4ef', abismo: ['#ffffff', '#ffd9e8', '#c6b8ff'], brilho: '#fff',
      tabua: '#ffe3a3', tabua2: '#f0c86a', junta: '#c79a3a', corda: '#ffd23f', poste: '#c08a2a', fundoBuraco: '#8fb0ff', espinho: '#7a6ab8', espinho2: '#e8e0ff', pedra: '#6f6f99', pedra2: '#ffe14a', onda: '#ffe14a', onda2: '#ffffff', sol: '#fff2b0' }
  };

  function criar(canvas) {
    var g = canvas.getContext('2d', { alpha: false });
    var R = { qualidade: 'alta', escala: 1, ox: 0, oy: 0 };
    var fundos = {}, particulas = [], textos = [], flash = 0, tremor = 0;
    var tempo = 0;

    R.redimensionar = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, R.qualidade === 'leve' ? 1 : 2);
      var w = window.innerWidth, h = window.innerHeight;
      var cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (R.qualidade === 'leve') { var k = Math.min(1, 1280 / cw, 720 / ch); cw = Math.round(cw * k); ch = Math.round(ch * k); }
      canvas.width = cw; canvas.height = ch;
      R.escala = Math.min(cw / W, ch / H); R.ox = (cw - W * R.escala) / 2; R.oy = (ch - H * R.escala) / 2;
    };
    R.mudarQualidade = function (q) { R.qualidade = q; R.redimensionar(); };
    R.limparEfeitos = function () { particulas = []; textos = []; flash = 0; tremor = 0; };

    /* ---------- Fundo pré-pintado (céu + montanhas) ---------- */
    function fundo(id) {
      if (fundos[id]) return fundos[id];
      var T = TEMAS[id], c = document.createElement('canvas'); c.width = W; c.height = TOPO + 10;
      var q = c.getContext('2d');
      var gr = q.createLinearGradient(0, 0, 0, TOPO);
      gr.addColorStop(0, T.ceu[0]); gr.addColorStop(0.6, T.ceu[1]); gr.addColorStop(1, T.ceu[2]);
      q.fillStyle = gr; q.fillRect(0, 0, W, TOPO + 10);
      // sol / lua
      q.fillStyle = T.sol; q.globalAlpha = 0.25; q.beginPath(); q.arc(1000, 150, 110, 0, 7); q.fill();
      q.globalAlpha = 1; q.beginPath(); q.arc(1000, 150, 64, 0, 7); q.fill();
      if (id === 'vulcao') {
        // estrelas
        q.fillStyle = '#ffe6c9'; for (var i = 0; i < 60; i++) q.fillRect((i * 263) % W, (i * 97) % 170, 2, 2);
      }
      // montanhas
      function serra(base, amp, cor, fase, pico) {
        q.fillStyle = cor; q.beginPath(); q.moveTo(0, TOPO + 10);
        for (var x = 0; x <= W; x += 16) q.lineTo(x, base - amp * Math.abs(Math.sin(x * 0.006 + fase)) - amp * 0.35 * Math.sin(x * 0.021 + fase * 2) - (pico ? Math.max(0, 140 - Math.abs(x - pico) * 0.9) : 0));
        q.lineTo(W, TOPO + 10); q.fill();
      }
      if (id === 'ceu') {
        // nuvens grandes no lugar das montanhas
        q.fillStyle = T.monte2; for (var n = 0; n < 9; n++) nuvem(q, n * 160 + 40, 270 + (n % 3) * 18, 70 + (n % 2) * 30);
        q.fillStyle = T.monte1; for (var n2 = 0; n2 < 8; n2++) nuvem(q, n2 * 180 + 110, 310 + (n2 % 2) * 14, 80);
      } else {
        serra(250, 70, T.monte2, 1.3, id === 'vulcao' ? 380 : 0);
        if (id === 'vulcao') { q.fillStyle = '#ff6a2a'; q.beginPath(); q.moveTo(355, 92); q.lineTo(405, 92); q.lineTo(395, 110); q.lineTo(365, 110); q.fill(); }
        if (id === 'gelo') { q.fillStyle = '#ffffff'; for (var k = 0; k < 6; k++) { var px = 120 + k * 210; q.beginPath(); q.moveTo(px - 40, 215); q.lineTo(px, 170); q.lineTo(px + 40, 215); q.fill(); } }
        serra(300, 50, T.monte1, 0.4, 0);
      }
      fundos[id] = c; return c;
    }
    function nuvem(q, x, y, r) { q.beginPath(); q.arc(x, y, r * 0.6, 0, 7); q.arc(x + r * 0.6, y + r * 0.1, r * 0.5, 0, 7); q.arc(x - r * 0.6, y + r * 0.15, r * 0.45, 0, 7); q.arc(x + r * 0.1, y - r * 0.35, r * 0.5, 0, 7); q.fill(); }

    function sx(m, x) { return X0 + x - m.camera; }

    /* ---------- Efeitos ---------- */
    function particula(x, y, cor, n, forca) {
      var max = R.qualidade === 'leve' ? 50 : 140;
      n = R.qualidade === 'leve' ? Math.ceil(n / 2) : n;
      for (var i = 0; i < n && particulas.length < max; i++) {
        var a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 160) * (forca || 1);
        particulas.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, vida: 0.4 + Math.random() * 0.5, max: 0.9, cor: cor, r: 3 + Math.random() * 4 });
      }
    }
    function texto(x, y, txt, cor) { textos.push({ x: x, y: y, txt: txt, cor: cor || '#fff', vida: 1.1 }); }
    R.efeito = function (m, e) {
      var r = e.id ? window.Mundo.corredor(m, e.id) : null;
      var x = e.x != null ? e.x : r ? r.x : 0, y = PISTA_Y[e.pista != null ? e.pista : r ? r.pista : 1];
      var T = TEMAS[m.mundo.id];
      if (e.tipo === 'cristal') { particula(x, y - 40, '#ffe680', 5, 0.6); texto(x, y - 60, '+1', '#ffe680'); }
      else if (e.tipo === 'caixa') { particula(x, y - 30, '#c99bff', 14, 1); texto(x, y - 70, window.Mundo.NOME_PODER[e.poder] + '!', '#e2c6ff'); }
      else if (e.tipo === 'queda') { particula(x, y, T.fundoBuraco, 18, 1.2); tremor = 8; }
      else if (e.tipo === 'tombo') { particula(x, y - 20, '#ffffff', 10, 0.8); tremor = 5; }
      else if (e.tipo === 'empurrao') { particula(x, y - 20, '#ffd23f', 16, 1.2); texto(x, y - 80, 'EMPURRÃO!', '#ffd23f'); tremor = 6; }
      else if (e.tipo === 'raio') { flash = 0.5; tremor = 10; }
      else if (e.tipo === 'onda') { tremor = 9; }
      else if (e.tipo === 'chegou') { particula(x, y - 30, BICHOS[(r ? r.cor : 0) % 8].hex, 30, 1.4); }
      else if (e.tipo === 'escudo') { particula(x, y - 30, '#7fe8ff', 14, 1); texto(x, y - 80, 'ESCUDO!', '#7fe8ff'); }
      else if (e.tipo === 'mola') { particula(x, y, '#ff5b6b', 10, 1); }
      else if (e.tipo === 'pedraQuebra') { particula(x, y - 20, T.pedra, 14, 1); }
      else if (e.tipo === 'caiuTabua') { particula(x, y, T.tabua, 10, 0.8); }
    };

    /* ---------- Quadro ---------- */
    R.quadro = function (m, extra, dt) {
      tempo += dt;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#0a0c18'; g.fillRect(0, 0, canvas.width, canvas.height);
      if (!m) return;
      var T = TEMAS[m.mundo.id];
      var tx = R.ox, ty = R.oy;
      if (tremor > 0 && R.qualidade !== 'leve') { tx += (Math.random() - 0.5) * tremor * R.escala; ty += (Math.random() - 0.5) * tremor * R.escala; }
      tremor = Math.max(0, tremor - dt * 30);
      g.setTransform(R.escala, 0, 0, R.escala, tx, ty);
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();

      // céu com leve paralaxe
      var f = fundo(m.mundo.id), off = (m.camera * 0.08) % W;
      g.drawImage(f, -off, 0); g.drawImage(f, W - off, 0);
      abismo(m, T);
      ponte(m, T);
      onda(m, T);
      obstaculos(m, T);
      itens(m, T);
      // corredores (de trás para frente na tela: pista de cima primeiro)
      var lista = m.corredores.slice().sort(function (a, b) { return a.vpista - b.vpista; });
      var nomes = (extra && extra.nomes) || {};
      lista.forEach(function (r) { corredor(m, r, nomes[r.id] || '', extra && extra.lider === r.id); });
      efeitos(m, dt);
      chegada(m, T);
      if (extra && extra.fita !== false) fita(m, nomes);
      if (flash > 0) { g.globalAlpha = Math.min(0.7, flash); g.fillStyle = '#fffbe0'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; flash -= dt * 1.6; }
      g.restore();
    };

    function abismo(m, T) {
      var gr = g.createLinearGradient(0, BASE - 10, 0, H);
      gr.addColorStop(0, T.abismo[2]); gr.addColorStop(0.45, T.abismo[1]); gr.addColorStop(1, T.abismo[0]);
      g.fillStyle = gr; g.fillRect(0, TOPO - 20, W, H - TOPO + 20);
      // ondinhas
      g.strokeStyle = T.brilho; g.lineWidth = 3; g.globalAlpha = 0.35;
      for (var l = 0; l < 3; l++) {
        g.beginPath();
        var yb = BASE + 30 + l * 28, fase = tempo * (1 + l * 0.4) - m.camera * 0.01;
        for (var x = 0; x <= W; x += 32) { var y = yb + Math.sin(x * 0.02 + fase + l) * 5; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    function ponte(m, T) {
      // tábuas por pista
      for (var p = 0; p < 3; p++) {
        var y = PISTA_Y[p] - ALT / 2;
        g.fillStyle = p % 2 ? T.tabua2 : T.tabua; g.fillRect(0, y, W, ALT - 4);
        g.fillStyle = T.junta; g.fillRect(0, y + ALT - 6, W, 4);
        // juntas das tábuas (andam com a câmera)
        var ini = Math.floor((m.camera - X0) / 48) * 48;
        g.fillStyle = T.junta; g.globalAlpha = 0.55;
        for (var x = ini; x < m.camera + W; x += 48) { var s = sx(m, x); if (s > -4 && s < W) g.fillRect(s, y + 3, 3, ALT - 10); }
        g.globalAlpha = 1;
      }
      // postes e cordas
      var iniP = Math.floor((m.camera - X0) / 320) * 320;
      g.fillStyle = T.poste;
      for (var xp = iniP; xp < m.camera + W + 40; xp += 320) { var s2 = sx(m, xp); g.fillRect(s2 - 6, TOPO - 34, 12, 40); g.fillRect(s2 - 6, BASE - 6, 12, 40); }
      g.strokeStyle = T.corda; g.lineWidth = 4;
      [TOPO - 26, BASE + 6].forEach(function (yc) {
        g.beginPath();
        for (var x2 = iniP; x2 < m.camera + W + 360; x2 += 320) { var a = sx(m, x2), b = sx(m, x2 + 320); g.moveTo(a, yc); g.quadraticCurveTo((a + b) / 2, yc + 16, b, yc); }
        g.stroke();
      });
      // largada
      var sl = sx(m, 0); if (sl > -20 && sl < W) { g.fillStyle = '#ffffff'; g.fillRect(sl, TOPO, 6, BASE - TOPO); }
    }

    function chegada(m, T) {
      var s = sx(m, m.L); if (s < -60 || s > W + 60) return;
      // faixa quadriculada
      for (var i = 0; i < 14; i++) for (var j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(s + j * 14, TOPO + i * 19.2, 14, 19.2); }
      g.fillStyle = '#ffd23f'; g.fillRect(s - 8, TOPO - 120, 10, 120); g.fillRect(s + 30, TOPO - 120, 10, 120);
      g.fillStyle = '#ff5e3a'; g.fillRect(s - 8, TOPO - 130, 48, 30);
      g.fillStyle = '#fff'; g.font = '900 22px sans-serif'; g.textAlign = 'center'; g.fillText('FIM', s + 16, TOPO - 107);
    }

    function onda(m, T) {
      var o = m.onda; if (!o) return;
      var y = PISTA_Y[o.pista] - ALT / 2;
      if (o.estado === 'aviso') {
        var pisca = 0.25 + 0.25 * (Math.sin(tempo * 14) > 0 ? 1 : 0);
        g.fillStyle = '#ff2a2a'; g.globalAlpha = pisca; g.fillRect(0, y, W, ALT - 4); g.globalAlpha = 1;
        g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.setLineDash([24, 16]); g.strokeRect(3, y + 2, W - 6, ALT - 8); g.setLineDash([]);
        var falta = Math.max(0, o.ativa - m.t);
        aviso(W / 2, y + ALT / 2, (m.mundo.perigo + ' EM ' + Math.ceil(falta)) + '!');
      } else {
        if (m.mundo.id === 'vulcao') {
          g.fillStyle = T.onda; g.fillRect(0, y, W, ALT - 4);
          g.fillStyle = T.onda2;
          for (var x = 0; x < W; x += 40) { var h = 30 + 18 * Math.sin(tempo * 9 + x * 0.05); g.beginPath(); g.moveTo(x, y + ALT - 4); g.quadraticCurveTo(x + 20, y + ALT - 4 - h * 2, x + 40, y + ALT - 4); g.fill(); }
        } else if (m.mundo.id === 'gelo') {
          g.fillStyle = '#e6f6ff'; g.globalAlpha = 0.6; g.fillRect(0, y, W, ALT - 4); g.globalAlpha = 1;
          for (var b = 0; b < 7; b++) { var bx = (W + 120) - ((tempo * 520 + b * 190) % (W + 240)); bola(bx, y + ALT / 2 - 6, 34, '#ffffff', '#cdeeff', tempo * -8); }
        } else {
          g.fillStyle = '#fff6a8'; g.globalAlpha = 0.55; g.fillRect(0, y, W, ALT - 4); g.globalAlpha = 1;
          g.strokeStyle = '#ffe14a'; g.lineWidth = 7;
          for (var r = 0; r < 6; r++) { var rx = ((r * 230 + Math.floor(tempo * 12) * 97) % W); g.beginPath(); g.moveTo(rx, y - 40); g.lineTo(rx + 18, y + 20); g.lineTo(rx - 6, y + 30); g.lineTo(rx + 14, y + ALT); g.stroke(); }
        }
      }
    }
    function aviso(x, y, txt) {
      g.font = '900 30px sans-serif'; g.textAlign = 'center';
      var w = g.measureText(txt).width + 70;
      g.fillStyle = 'rgba(20,6,10,.85)'; rr(x - w / 2, y - 24, w, 46, 12); g.fill();
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x - w / 2 + 16, y + 14); g.lineTo(x - w / 2 + 34, y - 16); g.lineTo(x - w / 2 + 52, y + 14); g.fill();
      g.fillStyle = '#20100a'; g.font = '900 22px sans-serif'; g.fillText('!', x - w / 2 + 34, y + 11);
      g.fillStyle = '#fff'; g.font = '900 30px sans-serif'; g.fillText(txt, x + 20, y + 10);
    }

    function obstaculos(m, T) {
      m.obst.forEach(function (o) {
        var x = sx(m, o.x); if (x < -60 || x > W + 60) return;
        var y = PISTA_Y[o.pista];
        if (o.tipo === 'buraco' || (o.tipo === 'rachada' && o.estado === 2)) {
          var yt = y - ALT / 2, hh = ALT - 4;
          g.fillStyle = '#12060c'; g.fillRect(x - 30, yt, 60, hh);
          g.fillStyle = T.fundoBuraco; g.fillRect(x - 30, yt + hh * 0.55, 60, hh * 0.45);
          g.fillStyle = T.brilho; g.globalAlpha = 0.7;
          for (var bb = 0; bb < 3; bb++) { g.beginPath(); g.arc(x - 16 + bb * 16, yt + hh * 0.62 + Math.sin(tempo * 5 + bb + o.x) * 4, 4, 0, 7); g.fill(); }
          g.globalAlpha = 1;
          // pontas de tábua quebrada nas bordas
          g.fillStyle = T.tabua;
          for (var d2 = 0; d2 < 4; d2++) {
            var ty2 = yt + d2 * hh / 4;
            g.beginPath(); g.moveTo(x - 31, ty2); g.lineTo(x - 18, ty2 + hh / 8); g.lineTo(x - 31, ty2 + hh / 4); g.fill();
            g.beginPath(); g.moveTo(x + 31, ty2); g.lineTo(x + 20, ty2 + hh / 8); g.lineTo(x + 31, ty2 + hh / 4); g.fill();
          }
        } else if (o.tipo === 'espinhos') {
          g.fillStyle = T.espinho; rr(x - 30, y + 6, 60, 18, 5); g.fill();
          for (var i = 0; i < 4; i++) { g.fillStyle = i % 2 ? T.espinho2 : T.espinho; g.beginPath(); g.moveTo(x - 28 + i * 15, y + 10); g.lineTo(x - 21 + i * 15, y - 26); g.lineTo(x - 13 + i * 15, y + 10); g.fill(); }
        } else if (o.tipo === 'rachada') {
          var tre = o.estado === 1 ? Math.sin(tempo * 60) * 2 : 0;
          g.fillStyle = o.estado === 1 ? '#c9734a' : T.tabua2; rr(x - 30 + tre, y - 36, 60, 72, 6); g.fill();
          g.strokeStyle = '#2a140a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 10 + tre, y - 36); g.lineTo(x + 2 + tre, y - 10); g.lineTo(x - 12 + tre, y + 8); g.lineTo(x + 10 + tre, y + 34); g.stroke();
          if (o.estado === 0) { g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect(x - 30, y - 36, 60, 72); g.setLineDash([]); }
        } else if (o.tipo === 'pedra' && o.estado !== 2) {
          bola(x, y - 14, 30, T.pedra, T.pedra2, -o.x * 0.04);
        }
      });
    }
    function bola(x, y, r, cor, cor2, giro) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + r + 4, r, 7, 0, 0, 7); g.fill();
      g.fillStyle = cor; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = cor2; g.lineWidth = 5; g.beginPath(); g.arc(x, y, r * 0.6, giro, giro + 2); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.6, giro + 3.2, giro + 4.4); g.stroke();
    }

    function itens(m, T) {
      m.cristais.forEach(function (c) {
        if (c.pego) return; var x = sx(m, c.x); if (x < -20 || x > W + 20) return;
        var y = PISTA_Y[c.pista] - 30 + Math.sin(tempo * 5 + c.x * 0.1) * 4;
        g.fillStyle = '#ffdf4a'; g.beginPath(); g.moveTo(x, y - 15); g.lineTo(x + 11, y); g.lineTo(x, y + 15); g.lineTo(x - 11, y); g.fill();
        g.fillStyle = '#fff8c4'; g.beginPath(); g.moveTo(x, y - 15); g.lineTo(x + 4, y - 2); g.lineTo(x - 4, y - 2); g.fill();
      });
      m.caixas.forEach(function (b) {
        var x = sx(m, b.x); if (x < -40 || x > W + 40) return;
        var y = PISTA_Y[b.pista] - 30 + Math.sin(tempo * 4 + b.x) * 3;
        g.fillStyle = '#6a2fc4'; rr(x - 22, y - 22, 44, 44, 9); g.fill();
        g.fillStyle = '#9b5cff'; rr(x - 18, y - 18, 36, 32, 7); g.fill();
        g.fillStyle = '#fff'; g.font = '900 30px sans-serif'; g.textAlign = 'center'; g.fillText('?', x, y + 10);
      });
      m.molas.forEach(function (mo) {
        var x = sx(m, mo.x); if (x < -40 || x > W + 40) return; var y = PISTA_Y[mo.pista];
        g.fillStyle = '#7a7a99'; g.fillRect(x - 24, y + 14, 48, 10);
        g.strokeStyle = '#d0d0e8'; g.lineWidth = 4; g.beginPath(); for (var i = 0; i < 4; i++) { g.moveTo(x - 16, y + 12 - i * 8); g.lineTo(x + 16, y + 8 - i * 8); } g.stroke();
        g.fillStyle = '#ff4d6d'; rr(x - 26, y - 26, 52, 12, 5); g.fill();
      });
    }

    /* Um bichinho correndo. */
    function corredor(m, r, nome, lider) {
      var b = BICHOS[r.cor % BICHOS.length];
      var x = sx(m, r.x), base = PISTA_Y[0] + (PISTA_Y[1] - PISTA_Y[0]) * r.vpista;
      if (x < -60 || x > W + 80) return;
      var C = window.Mundo.C, pulo = 0;
      if (r.pulo > 0) { var k = 1 - r.pulo / C.PULO; pulo = Math.sin(Math.max(0, Math.min(1, k)) * Math.PI) * 74; }
      var caindo = r.caido > 0, esc = 1;
      if (caindo) { var kc = 1 - r.caido / C.QUEDA; esc = Math.max(0, 1 - kc * 1.4); }
      if (esc <= 0) { // aparece uma bolhinha onde caiu
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x, base + 4, 10 + Math.sin(tempo * 10) * 3, 0, 7); g.fill();
        return;
      }
      var passo = r.chegou ? Math.sin(tempo * 8) : Math.sin(tempo * 18 + r.cor);
      var y = base - pulo + (r.tombo > 0 ? Math.sin(tempo * 30) * 3 : 0);
      var pisca = r.prot > 0 && !caindo && Math.floor(tempo * 12) % 2 === 0;
      g.save();
      if (pisca) g.globalAlpha = 0.45;
      // sombra
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, base + 26, 24 - pulo * 0.12, 7, 0, 0, 7); g.fill();
      g.translate(x, y + 10); g.scale(esc, esc); if (r.tombo > 0) g.rotate(Math.sin(tempo * 25) * 0.25);
      // turbo
      if (r.turbo > 0) { g.fillStyle = '#ffe14a'; for (var t = 0; t < 3; t++) g.fillRect(-58 - t * 14, -26 + t * 12, 34, 5); }
      // pernas
      g.fillStyle = b.escura;
      if (pulo > 6) { g.fillRect(-14, 6, 10, 12); g.fillRect(4, 6, 10, 12); }
      else { g.fillRect(-14 + passo * 6, 6, 10, 16); g.fillRect(4 - passo * 6, 6, 10, 16); }
      // corpo
      g.fillStyle = b.hex; rr(-20, -24, 40, 36, 14); g.fill();
      g.fillStyle = b.claro; rr(-11, -14, 22, 22, 9); g.fill();
      // braços
      g.strokeStyle = b.hex; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-17, -12); g.lineTo(-27, -2 - passo * 8); g.moveTo(17, -12); g.lineTo(27, -2 + passo * 8); g.stroke();
      cabeca(b, r);
      // escudo
      if (r.escudo > 0) { g.strokeStyle = '#7fe8ff'; g.lineWidth = 4; g.globalAlpha = (pisca ? 0.45 : 1) * 0.8; g.beginPath(); g.arc(0, -30, 50, 0, 7); g.stroke(); g.globalAlpha = 0.15; g.fillStyle = '#7fe8ff'; g.fill(); g.globalAlpha = pisca ? 0.45 : 1; }
      if (r.ima > 0) { g.strokeStyle = '#ff4d6d'; g.lineWidth = 3; g.setLineDash([6, 8]); g.beginPath(); g.arc(0, -20, 60 + Math.sin(tempo * 8) * 5, 0, 7); g.stroke(); g.setLineDash([]); }
      g.restore();
      // nome e balão de fala
      var ny = y - 88;
      if (nome) {
        g.font = '800 19px sans-serif'; g.textAlign = 'center';
        var w = Math.max(44, g.measureText(nome).width + 22);
        g.fillStyle = b.escura; rr(x - w / 2, ny - 17, w, 26, 9); g.fill();
        g.fillStyle = '#fff'; g.fillText(nome, x, ny + 3);
        if (r.facil) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + w / 2 + 2, ny - 14, 9, 0, 7); g.fill(); g.fillStyle = '#5a3a00'; g.font = '900 12px sans-serif'; g.fillText('F', x + w / 2 + 2, ny - 10); }
        if (lider) { coroa(x, ny - 26); }
      }
      if (r.fala && m.t < r.falaAte) {
        g.font = '900 17px sans-serif'; g.textAlign = 'center';
        var wf = g.measureText(r.fala).width + 18, fy = ny - (lider ? 54 : 34);
        g.fillStyle = '#fff'; rr(x - wf / 2, fy - 16, wf, 24, 8); g.fill();
        g.fillStyle = '#1b1530'; g.fillText(r.fala, x, fy + 3);
      }
      if (r.poder && !r.chegou) {
        var px = x + 34, py = y - 52;
        g.fillStyle = '#6a2fc4'; rr(px - 13, py - 13, 26, 26, 6); g.fill(); icone(r.poder, px, py, 9);
      }
    }
    function cabeca(b, r) {
      var hy = -42;
      // orelhas
      g.fillStyle = b.hex;
      if (b.orelha === 'pontuda') { g.beginPath(); g.moveTo(-18, hy - 4); g.lineTo(-12, hy - 28); g.lineTo(-2, hy - 10); g.fill(); g.beginPath(); g.moveTo(18, hy - 4); g.lineTo(12, hy - 28); g.lineTo(2, hy - 10); g.fill(); }
      else if (b.orelha === 'longa') { rr(-14, hy - 40, 9, 30, 5); g.fill(); rr(5, hy - 40, 9, 30, 5); g.fill(); g.fillStyle = b.claro; rr(-12, hy - 36, 5, 22, 3); g.fill(); rr(7, hy - 36, 5, 22, 3); g.fill(); g.fillStyle = b.hex; }
      else if (b.orelha === 'redonda' || b.orelha === 'panda') { g.fillStyle = b.orelha === 'panda' ? b.escura : b.hex; g.beginPath(); g.arc(-15, hy - 15, 8, 0, 7); g.arc(15, hy - 15, 8, 0, 7); g.fill(); }
      else if (b.orelha === 'juba') { g.fillStyle = '#e07a1a'; g.beginPath(); g.arc(0, hy, 27, 0, 7); g.fill(); }
      else if (b.orelha === 'sapo') { g.beginPath(); g.arc(-11, hy - 15, 9, 0, 7); g.arc(11, hy - 15, 9, 0, 7); g.fill(); }
      // rosto
      g.fillStyle = b.orelha === 'panda' ? '#ffffff' : b.hex; g.beginPath(); g.arc(0, hy, 20, 0, 7); g.fill();
      if (b.orelha === 'nenhuma') { g.fillStyle = b.escura; g.beginPath(); g.arc(0, hy, 20, Math.PI, 0); g.fill(); g.fillStyle = b.claro; g.beginPath(); g.ellipse(0, hy + 3, 14, 13, 0, 0, 7); g.fill(); }
      if (b.orelha === 'panda') { g.fillStyle = b.escura; g.beginPath(); g.ellipse(-8, hy - 1, 6, 7, -0.4, 0, 7); g.ellipse(8, hy - 1, 6, 7, 0.4, 0, 7); g.fill(); }
      // olhos (olham para a frente)
      var tonto = r.tombo > 0 || r.caido > 0;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-6, hy - 3, 6, 0, 7); g.arc(8, hy - 3, 6, 0, 7); g.fill();
      g.fillStyle = '#1b1530';
      if (tonto) { g.lineWidth = 2.5; g.strokeStyle = '#1b1530'; g.beginPath(); g.moveTo(-9, hy - 6); g.lineTo(-3, hy); g.moveTo(-3, hy - 6); g.lineTo(-9, hy); g.moveTo(5, hy - 6); g.lineTo(11, hy); g.moveTo(11, hy - 6); g.lineTo(5, hy); g.stroke(); }
      else { g.beginPath(); g.arc(-4, hy - 3, 3, 0, 7); g.arc(10, hy - 3, 3, 0, 7); g.fill(); }
      // focinho / boca
      g.fillStyle = b.orelha === 'nenhuma' ? '#ffb020' : '#1b1530';
      if (b.orelha === 'nenhuma') { g.beginPath(); g.moveTo(2, hy + 4); g.lineTo(14, hy + 7); g.lineTo(2, hy + 10); g.fill(); }
      else { g.beginPath(); g.arc(3, hy + 7, tonto ? 4 : 3, 0, Math.PI); g.fill(); }
      g.fillStyle = 'rgba(255,90,120,.45)'; g.beginPath(); g.arc(-12, hy + 5, 4, 0, 7); g.arc(15, hy + 5, 4, 0, 7); g.fill();
    }
    function coroa(x, y) { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x - 14, y + 8); g.lineTo(x - 14, y - 6); g.lineTo(x - 7, y + 1); g.lineTo(x, y - 9); g.lineTo(x + 7, y + 1); g.lineTo(x + 14, y - 6); g.lineTo(x + 14, y + 8); g.fill(); }

    /* Ícones dos poderes (desenhados: emoji nem sempre aparece no navegador da TV). */
    function icone(p, x, y, s) {
      g.save(); g.translate(x, y);
      if (p === 'turbo') { g.fillStyle = '#ffe14a'; g.beginPath(); g.moveTo(-s, s * 0.6); g.lineTo(s * 0.2, -s); g.lineTo(s, -s * 0.2); g.lineTo(-s * 0.2, s); g.fill(); g.fillStyle = '#ff5e3a'; g.fillRect(-s, s * 0.5, s * 0.6, s * 0.5); }
      else if (p === 'escudo') { g.fillStyle = '#7fe8ff'; g.beginPath(); g.moveTo(0, -s); g.lineTo(s, -s * 0.5); g.lineTo(s * 0.7, s * 0.5); g.lineTo(0, s); g.lineTo(-s * 0.7, s * 0.5); g.lineTo(-s, -s * 0.5); g.fill(); }
      else if (p === 'ima') { g.strokeStyle = '#ff4d6d'; g.lineWidth = s * 0.55; g.beginPath(); g.arc(0, -s * 0.1, s * 0.65, Math.PI, 0); g.stroke(); g.fillStyle = '#fff'; g.fillRect(-s * 0.95, -s * 0.1, s * 0.6, s * 0.5); g.fillRect(s * 0.35, -s * 0.1, s * 0.6, s * 0.5); }
      else if (p === 'raio') { g.fillStyle = '#ffe14a'; g.beginPath(); g.moveTo(s * 0.3, -s); g.lineTo(-s * 0.6, s * 0.15); g.lineTo(0, s * 0.15); g.lineTo(-s * 0.3, s); g.lineTo(s * 0.6, -s * 0.15); g.lineTo(0, -s * 0.15); g.fill(); }
      g.restore();
    }
    R.icone = icone;

    function efeitos(m, dt) {
      for (var i = particulas.length - 1; i >= 0; i--) {
        var p = particulas[i]; p.vida -= dt; if (p.vida <= 0) { particulas.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt;
        g.globalAlpha = Math.min(1, p.vida / 0.4); g.fillStyle = p.cor; g.fillRect(sx(m, p.x) - p.r / 2, p.y - p.r / 2, p.r, p.r);
      }
      g.globalAlpha = 1;
      g.textAlign = 'center';
      for (var j = textos.length - 1; j >= 0; j--) {
        var t = textos[j]; t.vida -= dt; if (t.vida <= 0) { textos.splice(j, 1); continue; }
        t.y -= 50 * dt; g.globalAlpha = Math.min(1, t.vida * 2);
        g.font = '900 24px sans-serif'; g.fillStyle = '#1b1530'; g.fillText(t.txt, sx(m, t.x) + 2, t.y + 2); g.fillStyle = t.cor; g.fillText(t.txt, sx(m, t.x), t.y);
      }
      g.globalAlpha = 1;
    }

    /* Fita de progresso embaixo (quem está onde até a chegada). */
    function fita(m, nomes) {
      if (m.treino) return;
      var x0 = 240, x1 = 1040, y = 686;
      g.fillStyle = 'rgba(10,12,24,.75)'; rr(x0 - 20, y - 16, x1 - x0 + 40, 32, 16); g.fill();
      g.fillStyle = '#ffffff'; g.globalAlpha = 0.25; g.fillRect(x0, y - 2, x1 - x0, 4); g.globalAlpha = 1;
      g.fillStyle = '#ffd23f'; g.fillRect(x1 - 3, y - 12, 6, 24);
      m.corredores.forEach(function (r) {
        var b = BICHOS[r.cor % BICHOS.length], k = Math.max(0, Math.min(1, r.x / m.L)), px = x0 + k * (x1 - x0);
        g.fillStyle = b.escura; g.beginPath(); g.arc(px, y, 11, 0, 7); g.fill();
        g.fillStyle = b.hex; g.beginPath(); g.arc(px, y, 8, 0, 7); g.fill();
      });
    }

    function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    return R;
  }

  raiz.Desenho = { criar: criar, BICHOS: BICHOS, CORES: BICHOS, PISTA_Y: PISTA_Y };
})(window);
