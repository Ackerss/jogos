/* Rabisco sem Fio — sons gerados na hora (sem arquivos) e a voz que lê as frases na revelação. */
(function () {
  'use strict';
  var ctx = null, ligado = true, voz = true, mestre = null;
  function audio() {
    if (!ligado) return null;
    try {
      if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); mestre = ctx.createGain(); mestre.gain.value = 0.55; mestre.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  function tom(f, ini, dur, tipo, vol, f2) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (ini || 0);
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + 0.05);
  }
  function ruido(ini, dur, vol, freq, q) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + (ini || 0);
    s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq || 2500; f.Q.value = q || 1.2; g.gain.value = vol || 0.15;
    s.connect(f); f.connect(g); g.connect(mestre); s.start(t);
  }
  var Som = {
    ligar: function (v) { ligado = v !== false; },
    ligado: function () { return ligado; },
    voz: function (v) { if (v !== undefined) voz = !!v; return voz; },
    destravar: function () { audio(); },
    entrou: function () { tom(660, 0, 0.12, 'triangle', 0.22); tom(990, 0.09, 0.18, 'triangle', 0.2); },
    pop: function () { tom(500, 0, 0.09, 'sine', 0.25, 900); },
    pronto: function () { tom(880, 0, 0.08, 'square', 0.06); tom(1320, 0.06, 0.12, 'triangle', 0.12); },
    virar: function () { ruido(0, 0.28, 0.22, 1800, 0.8); },
    rabisco: function () { for (var i = 0; i < 5; i++) ruido(i * 0.11, 0.09, 0.07, 3200 + Math.random() * 1500, 2.5); },
    tique: function (urgente) { tom(urgente ? 1100 : 760, 0, 0.05, 'square', urgente ? 0.07 : 0.035); },
    gongo: function () { tom(196, 0, 1.2, 'sine', 0.3); tom(392, 0, 0.9, 'sine', 0.12); tom(588, 0.02, 0.6, 'triangle', 0.06); },
    etapa: function () { [523, 659, 784].forEach(function (f, i) { tom(f, i * 0.09, 0.22, 'triangle', 0.18); }); },
    acerto: function () { tom(784, 0, 0.14, 'triangle', 0.22); tom(1047, 0.12, 0.3, 'triangle', 0.22); tom(1568, 0.24, 0.35, 'sine', 0.1); },
    riso: function () { [0, 0.1, 0.2].forEach(function (t, i) { tom(420 - i * 30, t, 0.08, 'sawtooth', 0.04, 360 - i * 30); }); },
    tambor: function (dur) { for (var t = 0; t < (dur || 1.6); t += 0.06) ruido(t, 0.05, 0.08 + t * 0.04, 180, 0.7); },
    fanfarra: function () { [[523, 0], [659, .14], [784, .28], [1047, .42], [784, .62], [1047, .76]].forEach(function (x) { tom(x[0], x[1], 0.3, 'square', 0.07); tom(x[0] / 2, x[1], 0.3, 'triangle', 0.12); }); },
    /* Lê uma frase em voz alta (se o aparelho tiver voz em português). Chama "fim" ao terminar (ou logo, se não houver voz). */
    falar: function (texto, fim) {
      var ok = false;
      try {
        if (ligado && voz && window.speechSynthesis && window.SpeechSynthesisUtterance) {
          var u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR'; u.rate = 1.02; u.pitch = 1.05;
          var todas = speechSynthesis.getVoices(), vs = todas.filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
          if (!vs.length) vs = todas.filter(function (v) { return /^pt/i.test(v.lang); });
          if (todas.length && !vs.length) throw new Error('sem voz em português');   // melhor calar do que ler com sotaque de outra língua
          if (vs.length) u.voice = vs[0];
          var feito = false, terminar = function () { if (!feito) { feito = true; if (fim) fim(); } };
          u.onend = terminar; u.onerror = terminar;
          speechSynthesis.cancel(); speechSynthesis.speak(u); ok = true;
          setTimeout(terminar, 1200 + texto.length * 90);   // garante que segue mesmo se a voz travar
        }
      } catch (e) { ok = false; }
      if (!ok && fim) setTimeout(fim, 0);
    },
    calar: function () { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* */ } }
  };
  try { if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () { speechSynthesis.getVoices(); }; } } catch (e) { /* */ }
  window.Som = Som;
})();
