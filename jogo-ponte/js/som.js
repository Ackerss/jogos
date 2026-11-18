/* Ponte do Desespero — efeitos sonoros gerados na hora (sem arquivos de áudio). */
(function (raiz) {
  'use strict';
  var ctx = null, mestre = null, ruido = null, ligado = true, ultimo = {};
  try { ligado = localStorage.getItem('ponte-som') !== '0'; } catch (e) { /* opcional */ }

  function abrir() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = raiz.AudioContext || raiz.webkitAudioContext; if (!AC) return null;
    try {
      ctx = new AC(); mestre = ctx.createGain(); mestre.gain.value = 0.42; mestre.connect(ctx.destination);
      var n = ctx.sampleRate * 0.6, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      ruido = buf;
    } catch (e) { ctx = null; }
    return ctx;
  }
  function pode(nome, ms) { var t = Date.now(); if (ultimo[nome] && t - ultimo[nome] < ms) return false; ultimo[nome] = t; return true; }
  function tom(freq, dur, tipo, vol, freqFim, atraso) {
    if (!ligado || !abrir()) return;
    var t0 = ctx.currentTime + (atraso || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(mestre); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function chiado(dur, filtro, freq, vol, freqFim, atraso) {
    if (!ligado || !abrir() || !ruido) return;
    var t0 = ctx.currentTime + (atraso || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruido; f.type = filtro; f.frequency.setValueAtTime(freq, t0);
    if (freqFim) f.frequency.exponentialRampToValueAtTime(freqFim, t0 + dur);
    g.gain.setValueAtTime(vol || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(mestre); s.start(t0, Math.random() * 0.2); s.stop(t0 + dur + 0.05);
  }
  var Som = {
    abrir: abrir,
    get ligado() { return ligado; },
    alternar: function () { ligado = !ligado; try { localStorage.setItem('ponte-som', ligado ? '1' : '0'); } catch (e) { /* */ } if (ligado) abrir(); return ligado; },
    pulo: function () { if (pode('pulo', 60)) tom(330, 0.16, 'triangle', 0.16, 700); },
    cristal: function () { if (pode('cristal', 50)) { tom(1180, 0.08, 'sine', 0.14); tom(1580, 0.1, 'sine', 0.12, null, 0.05); } },
    caixa: function () { if (pode('caixa', 80)) [660, 880, 1100].forEach(function (f, i) { tom(f, 0.1, 'square', 0.07, null, i * 0.06); }); },
    queda: function () { if (pode('queda', 90)) { tom(600, 0.45, 'sine', 0.22, 110); chiado(0.4, 'lowpass', 1800, 0.22, 200, 0.25); } },
    tombo: function () { if (pode('tombo', 90)) { tom(200, 0.18, 'sawtooth', 0.12, 70); chiado(0.1, 'lowpass', 1200, 0.2); } },
    empurrao: function () { if (pode('emp', 80)) { chiado(0.18, 'bandpass', 500, 0.3, 1800); tom(140, 0.15, 'sine', 0.25, 60); } },
    poder: function (p) {
      if (p === 'turbo') chiado(0.6, 'bandpass', 400, 0.25, 3000);
      else if (p === 'escudo') tom(500, 0.35, 'sine', 0.2, 1000);
      else if (p === 'ima') { tom(300, 0.3, 'square', 0.06, 900); }
      else if (p === 'raio') { chiado(0.5, 'highpass', 3000, 0.35); tom(80, 0.5, 'sawtooth', 0.2, 40); }
    },
    mola: function () { tom(220, 0.35, 'triangle', 0.22, 990); },
    escudo: function () { tom(900, 0.2, 'sine', 0.2, 500); },
    racha: function () { if (pode('racha', 120)) chiado(0.12, 'highpass', 2500, 0.15); },
    aviso: function () { tom(880, 0.12, 'square', 0.1); tom(880, 0.12, 'square', 0.1, null, 0.22); tom(880, 0.12, 'square', 0.1, null, 0.44); },
    onda: function () { chiado(1.2, 'lowpass', 600, 0.35, 150); },
    chegou: function (lugar) { var b = lugar === 1 ? 784 : 587; [b, b * 1.25, b * 1.5].forEach(function (f, i) { tom(f, 0.16, 'triangle', 0.2, null, i * 0.09); }); },
    bip: function (alto) { tom(alto ? 1046 : 660, alto ? 0.4 : 0.15, 'triangle', 0.3); },
    vitoria: function () { [523, 659, 784, 1046].forEach(function (f, i) { tom(f, 0.22, 'triangle', 0.25, null, i * 0.12); }); },
    entrou: function () { tom(660, 0.08, 'sine', 0.2); tom(990, 0.12, 'sine', 0.2, null, 0.08); }
  };
  raiz.Som = Som;
})(window);
