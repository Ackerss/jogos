/* Grande Prêmio dos Bichos — locutor e efeitos sonoros.
   Locutor: toca o MP3 gravado (audio/narracao/). Cada MP3 só é baixado na primeira vez que toca
   (a TV não baixa tudo de uma vez). Sem o MP3, as frases importantes usam a voz do navegador.
   Efeitos (dado, pulinhos, banana, moedas, fanfarra) são gerados na hora, sem arquivo. */
(function () {
  'use strict';
  var ligado = true, ctx = null;
  var N = window.NARRACAO, prontos = window.NARRACAO_PRONTOS || [], cache = {}, tocando = null, ultima = {}, falaAte = 0;

  function parar() {
    if (tocando) { try { tocando.pause(); } catch (e) {} tocando = null; }
    if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {}
  }
  function vozDoNavegador(texto) {
    if (!('speechSynthesis' in window)) return 0;
    try {
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR'; u.rate = 1.08; u.pitch = 1.05; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { return 0; }
    return 400 + texto.length * 62;
  }
  function audioDe(nome) {
    if (prontos.indexOf(nome) < 0) return null;
    if (cache[nome] === undefined) {
      try { var a = new Audio(); a.preload = 'none'; a.src = N.pasta + nome; a.addEventListener('error', function () { cache[nome] = null; }); cache[nome] = a; }
      catch (e) { cache[nome] = null; }
    }
    return cache[nome];
  }

  function ac() {
    if (!ligado) return null;
    try {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tom(freq, dur, vol, atraso, tipo, freqFim) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (atraso || 0), o = a.createOscillator(), g = a.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function ruido(dur, freq, vol, atraso) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (atraso || 0), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    var s = a.createBufferSource(); s.buffer = b;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    var g = a.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
  }

  var Som = {
    get ligado() { return ligado; },
    alternar: function () { ligado = !ligado; if (!ligado) parar(); return ligado; },
    /* O locutor está falando? (frases menos importantes esperam a vez) */
    ocupado: function () { return Date.now() < falaAte; },
    /* Narra um momento. importante = interrompe a frase atual; senão, só fala se estiver em silêncio.
       Devolve a duração aproximada (ms). */
    narrar: function (momento, importante) {
      if (!ligado || !N || !N.frases[momento]) return 0;
      if (!importante && Som.ocupado()) return 0;
      var f = N.frases[momento], n = f.textos.length, i = Math.floor(Math.random() * n);
      if (n > 1 && i === ultima[momento]) i = (i + 1) % n;
      ultima[momento] = i;
      var texto = f.textos[i], a = audioDe(N.arquivo(momento, i)), ms = 0;
      parar();
      if (a) {
        tocando = a;
        try { a.currentTime = 0; } catch (e) {}
        try { var pr = a.play(); if (pr && pr.catch) pr.catch(function () { if (tocando === a) tocando = null; }); } catch (e) {}
        ms = a.duration > 0 && isFinite(a.duration) ? a.duration * 1000 : 600 + texto.length * 60;
      } else if (f.voz) {
        ms = vozDoNavegador(texto);
      }
      falaAte = Date.now() + ms;
      return ms;
    },
    dado: function () { for (var i = 0; i < 7; i++) ruido(0.05, 1800 + Math.random() * 1600, 0.25, i * 0.09 + Math.random() * 0.03); },
    revelar: function () { tom(660, 0.12, 0.08, 0, 'square'); tom(990, 0.25, 0.08, 0.1, 'square'); },
    pulo: function () { tom(420, 0.14, 0.07, 0, 'triangle', 780); },
    pouso: function () { ruido(0.08, 300, 0.25); },
    banana: function () { tom(900, 0.6, 0.09, 0, 'sawtooth', 160); ruido(0.2, 2500, 0.12, 0.05); },
    moeda: function () { tom(988, 0.1, 0.07, 0, 'square'); tom(1319, 0.3, 0.07, 0.08, 'square'); },
    aposta: function () { ruido(0.12, 3200, 0.18); tom(784, 0.18, 0.06, 0.1, 'triangle'); },
    vez: function () { tom(523, 0.15, 0.05, 0, 'triangle'); tom(784, 0.2, 0.05, 0.12, 'triangle'); },
    perder: function () { tom(330, 0.3, 0.06, 0, 'sawtooth', 220); },
    fanfarra: function () { [523, 659, 784, 1046, 784, 1046].forEach(function (f, i) { tom(f, i > 3 ? 0.6 : 0.2, 0.07, i * 0.14, 'square'); }); }
  };
  window.Som = Som;
})();
