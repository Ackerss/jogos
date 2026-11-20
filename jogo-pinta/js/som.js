/* Pinta-Chão dos Bichos — sons gerados na hora (sem arquivos): tinta, balde, itens, porquinhos e uma musiquinha animada. */
(function () {
  'use strict';
  var ctx = null, mestre = null, ruidoBuf = null, ligado = true;
  function audio() {
    if (!ligado) return null;
    try {
      if (!ctx) {
        var A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
        ctx = new A(); mestre = ctx.createGain(); mestre.gain.value = 0.5; mestre.connect(ctx.destination);
        var n = Math.floor(ctx.sampleRate * 0.3); ruidoBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        var d = ruidoBuf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  function tom(f, ini, dur, tipo, vol, f2, quando) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = (quando || a.currentTime) + (ini || 0);
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + 0.05);
  }
  function ruido(ini, dur, vol, freq, quando) {
    var a = audio(); if (!a || !ruidoBuf) return;
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = (quando || a.currentTime) + (ini || 0);
    s.buffer = ruidoBuf; f.type = 'bandpass'; f.frequency.value = freq || 2500; f.Q.value = 1;
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(mestre); s.start(t); s.stop(t + dur + 0.02);
  }

  /* ---------- musiquinha (agendada um pouco à frente; leve para a TV) ---------- */
  var tocando = false, timer = null, prox = 0, passo = 0, BPM = 126;
  var BAIXO = [98.0, 130.81, 110.0, 87.31];               // Sol, Dó, Lá, Fá
  var MEL = [                                             // 16 passos por compasso (0 = pausa)
    [784, 0, 784, 880, 0, 784, 659, 0, 587, 0, 659, 0, 784, 0, 0, 0],
    [659, 0, 659, 784, 0, 659, 523, 0, 587, 0, 523, 0, 440, 0, 0, 0],
    [523, 0, 587, 0, 659, 0, 784, 0, 880, 0, 784, 0, 659, 0, 587, 0],
    [698, 0, 659, 0, 587, 0, 523, 0, 587, 0, 0, 659, 523, 0, 0, 0]
  ];
  var turbo = 0;
  function agendar() {
    var a = audio(); if (!a || !tocando) return;
    var dur = 60 / (turbo > 0 ? BPM * 1.25 : BPM) / 4;
    while (prox < a.currentTime + 0.25) {
      var c = Math.floor(passo / 16) % 4, k = passo % 16;
      if (k % 8 === 0) tom(BAIXO[c], 0, dur * 3, 'triangle', 0.22, 0, prox);
      if (k % 8 === 4) tom(BAIXO[c] * 2, 0, dur * 1.5, 'triangle', 0.1, 0, prox);
      if (k % 4 === 2) ruido(0, 0.05, 0.05, 7000, prox);
      if (k % 8 === 4) ruido(0, 0.09, 0.1, 1800, prox);
      var f = MEL[c][k];
      if (f) { tom(f, 0, dur * 1.6, 'square', 0.03, 0, prox); tom(f * 2, 0, dur * 0.9, 'sine', 0.025, 0, prox); }
      if (turbo > 0 && k % 2 === 1) tom([1047, 1319, 1568, 2093][k % 4], 0, dur, 'sine', 0.03, 0, prox);
      prox += dur; passo++;
    }
  }

  var Som = {
    ligar: function (v) { ligado = v !== false; if (!ligado) Som.musica(false); },
    destravar: function () { audio(); },
    musica: function (v) {
      if (v && !tocando) { var a = audio(); if (!a) return; tocando = true; prox = a.currentTime + 0.1; passo = 0; timer = setInterval(agendar, 90); agendar(); }
      if (!v && tocando) { tocando = false; clearInterval(timer); }
    },
    turbo: function (seg) { turbo = seg; },
    pinta: function () { tom(880 + Math.random() * 500, 0, 0.05, 'sine', 0.035); },
    balde: function () { ruido(0, 0.35, 0.3, 700); tom(180, 0, 0.3, 'sine', 0.25, 70); [660, 880, 1100].forEach(function (f, i) { tom(f, 0.08 + i * 0.05, 0.12, 'triangle', 0.1); }); },
    pincel: function () { [523, 659, 784, 1047].forEach(function (f, i) { tom(f, i * 0.05, 0.14, 'triangle', 0.14); }); },
    raio: function () { tom(300, 0, 0.35, 'sawtooth', 0.05, 1600); tom(600, 0.05, 0.3, 'sine', 0.12, 2000); },
    apareceu: function () { tom(1319, 0, 0.08, 'sine', 0.08); tom(1760, 0.06, 0.1, 'sine', 0.07); },
    lavou: function () { for (var i = 0; i < 6; i++) tom(500 + Math.random() * 900, i * 0.05, 0.08, 'sine', 0.12, 1400); tom(330, 0, 0.18, 'square', 0.05, 200); },
    oinc: function () { tom(330, 0, 0.12, 'square', 0.06, 250); tom(300, 0.14, 0.14, 'square', 0.06, 220); },
    ultimos: function () { Som.turbo(1); [880, 0, 880].forEach(function (f, i) { if (f) tom(f, i * 0.15, 0.12, 'square', 0.06); }); },
    apito: function () { Som.turbo(0); tom(1568, 0, 0.5, 'square', 0.05); tom(1568, 0, 0.5, 'sine', 0.2); },
    entrou: function () { tom(660, 0, 0.12, 'triangle', 0.2); tom(990, 0.09, 0.18, 'triangle', 0.2); },
    clique: function () { tom(700, 0, 0.06, 'triangle', 0.12); },
    bip: function (alto) { tom(alto ? 1046 : 523, 0, alto ? 0.5 : 0.22, 'square', 0.08); tom(alto ? 1046 : 523, 0, alto ? 0.5 : 0.22, 'sine', 0.2); },
    fanfarra: function () {
      [[523, 0], [659, .14], [784, .28], [1047, .42], [784, .62], [1047, .76], [1319, .9]].forEach(function (x) { tom(x[0], x[1], 0.32, 'square', 0.06); tom(x[0] / 2, x[1], 0.32, 'triangle', 0.14); });
    }
  };
  window.Som = Som;
})();
