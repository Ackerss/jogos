/* Arena Escorregadia — efeitos sonoros gerados na hora (sem arquivos de áudio). */
(function (raiz) {
  'use strict';
  var ctx = null, mestre = null, ruido = null, ligado = true, ultimo = {};
  try { ligado = localStorage.getItem('arena-som') !== '0'; } catch (e) { /* opcional */ }

  function abrir() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = raiz.AudioContext || raiz.webkitAudioContext; if (!AC) return null;
    try {
      ctx = new AC(); mestre = ctx.createGain(); mestre.gain.value = 0.45; mestre.connect(ctx.destination);
      var n = ctx.sampleRate * 0.6, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      ruido = buf;
    } catch (e) { ctx = null; }
    return ctx;
  }
  /* Evita amontoar o mesmo som (ex.: várias batidas no mesmo instante). */
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
    alternar: function () { ligado = !ligado; try { localStorage.setItem('arena-som', ligado ? '1' : '0'); } catch (e) { /* */ } if (ligado) abrir(); return ligado; },
    batida: function (forca) { if (!pode('batida', 70)) return; var v = Math.min(0.5, 0.12 + forca * 0.04); tom(170, 0.16, 'sine', v, 60); chiado(0.06, 'lowpass', 1500, v * 0.5); },
    tranco: function () { if (!pode('tranco', 60)) return; chiado(0.22, 'bandpass', 600, 0.22, 2400); },
    queda: function () { if (!pode('queda', 90)) return; tom(520, 0.35, 'sine', 0.25, 120); chiado(0.5, 'lowpass', 2200, 0.32, 300, 0.22); },
    sopro: function () { if (!pode('sopro', 90)) return; chiado(0.45, 'bandpass', 1800, 0.2, 400); },
    quebra: function () { chiado(0.5, 'highpass', 2500, 0.3); for (var i = 0; i < 5; i++) tom(900 + Math.random() * 900, 0.05, 'square', 0.06, null, i * 0.07); tom(90, 0.5, 'sine', 0.3, 40, 0.1); },
    aviso: function () { tom(880, 0.08, 'square', 0.08); },
    bip: function (alto) { tom(alto ? 1046 : 660, alto ? 0.4 : 0.15, 'triangle', 0.3); },
    vitoria: function () { [523, 659, 784, 1046].forEach(function (f, i) { tom(f, 0.22, 'triangle', 0.25, null, i * 0.12); }); },
    entrou: function () { tom(660, 0.08, 'sine', 0.2); tom(990, 0.12, 'sine', 0.2, null, 0.08); }
  };
  raiz.Som = Som;
})(window);
