/* Mentira Convincente — efeitos curtos gerados na hora (sem arquivos) e leitura da pergunta
   com a voz do navegador, quando a TV tem (só na TV). */
(function () {
  'use strict';
  if (window.MODO === 'celular') { window.Som = null; return; }
  var ligado = true, voz = true, ctx = null;
  try { var s = JSON.parse(localStorage.getItem('mentira-som') || '{}'); if (s.ligado === false) ligado = false; if (s.voz === false) voz = false; } catch (e) { /* */ }
  function guardar() { try { localStorage.setItem('mentira-som', JSON.stringify({ ligado: ligado, voz: voz })); } catch (e) { /* */ } }
  var temVoz = 'speechSynthesis' in window;

  function audio() {
    if (!ligado) return null;
    try {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tom(freq, dur, vol, atraso, tipo, freqFim) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (atraso || 0), o = a.createOscillator(), g = a.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function ruido(dur, freq, vol, atraso) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (atraso || 0), n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var src = a.createBufferSource(); src.buffer = buf;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    var g = a.createGain(); g.gain.setValueAtTime(vol, t);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t);
  }

  window.Som = {
    get ligado() { return ligado; },
    get voz() { return voz && temVoz; },
    temVoz: temVoz,
    alternar: function () { ligado = !ligado; if (!ligado) this.calar(); guardar(); return ligado; },
    alternarVoz: function () { voz = !voz; if (!voz) this.calar(); guardar(); return voz; },
    calar: function () { if (temVoz) try { speechSynthesis.cancel(); } catch (e) { /* */ } },
    /* Lê a pergunta em voz alta ("___" vira "tchan tchan"). */
    falar: function (texto) {
      if (!ligado || !voz || !temVoz || !texto) return;
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(String(texto).replace(/_{3,}/g, ', tchan tchan, '));
        u.lang = 'pt-BR'; u.rate = 1.0; u.volume = 0.9;
        speechSynthesis.speak(u);
      } catch (e) { /* */ }
    },
    toque: function () { tom(520, 0.08, 0.04, 0, 'triangle'); },
    tique: function () { tom(1200, 0.05, 0.025, 0, 'square'); },
    pronto: function () { tom(660, 0.1, 0.05, 0, 'triangle'); tom(990, 0.16, 0.05, 0.08, 'triangle'); },
    sorteio: function () { for (var i = 0; i < 8; i++) tom(400 + i * 70, 0.08, 0.035, i * 0.09, 'triangle'); },
    tambor: function () { for (var i = 0; i < 8; i++) { tom(90, 0.12, 0.12, i * 0.11); ruido(0.05, 500, 0.05, i * 0.11); } },
    mentira: function () { tom(300, 0.25, 0.08, 0, 'sawtooth', 120); tom(200, 0.35, 0.06, 0.18, 'sawtooth', 90); ruido(0.25, 900, 0.08, 0); },
    verdade: function () { [523, 659, 784, 1046].forEach(function (f, i) { tom(f, 0.6, 0.05, i * 0.1, 'triangle'); }); },
    curtida: function () { tom(880, 0.08, 0.03, 0, 'sine'); tom(1320, 0.12, 0.03, 0.06, 'sine'); },
    vitoria: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tom(f, 0.8, 0.05, i * 0.12, 'triangle'); }); }
  };
})();
