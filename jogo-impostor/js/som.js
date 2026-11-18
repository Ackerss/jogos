/* O Impostor — narração e efeitos sonoros curtos (só na TV).
   Narração: toca o MP3 gravado (audio/narracao/, roteiro em js/narracao.js).
   Sem o MP3, fala a mesma frase com a voz do navegador (se a TV tiver).
   Efeitos (vez, tambor, vitória…) são gerados na hora, sem arquivos. */
(function () {
  'use strict';
  if (window.MODO === 'celular') { window.Som = null; return; }
  var ligado = true, ctx = null;
  var N = window.NARRACAO, arquivos = {}, tocando = null, ultima = {};
  var naTV = /web0s|webos|smart-?tv|netcast|tizen|hbbtv/i.test(navigator.userAgent || '');

  /* Prepara os MP3 que existem (lista em audio/narracao/prontos.js). Na TV, sem pré-carregar tudo. */
  function preparar() {
    if (!N || typeof Audio === 'undefined') return;
    var prontos = window.NARRACAO_PRONTOS || [];
    Object.keys(N.frases).forEach(function (m) {
      N.frases[m].textos.forEach(function (t, i) {
        var nome = N.arquivo(m, i), reg = { erro: prontos.indexOf(nome) < 0, a: null };
        if (!reg.erro) {
          try {
            var a = new Audio();
            a.preload = naTV ? 'metadata' : 'auto';
            a.addEventListener('error', function () { reg.erro = true; });
            a.src = N.pasta + nome;
            reg.a = a;
          } catch (e) { reg.erro = true; }
        }
        arquivos[nome] = reg;
      });
    });
  }
  function parar() {
    if (tocando) { try { tocando.pause(); } catch (e) {} tocando = null; }
    if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {}
  }
  function vozDoNavegador(texto) {
    if (!('speechSynthesis' in window) || !texto) return false;
    try {
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR'; u.rate = 1.02; u.pitch = 1; u.volume = 0.85;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function estimar(texto) { return 600 + String(texto).length * 62; }

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
    var s = a.createBufferSource(); s.buffer = buf;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    var g = a.createGain(); g.gain.setValueAtTime(vol, t);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
  }

  var Som = {
    get ligado() { return ligado; },
    alternar: function () { ligado = !ligado; if (!ligado) parar(); return ligado; },
    /* Narra um momento. Devolve a duração (ms) para o jogo esperar o narrador terminar. */
    narrar: function (momento) {
      if (!ligado) return 0;
      var f = N && N.frases[momento]; if (!f) return 0;
      var n = f.textos.length, i = Math.floor(Math.random() * n);
      if (n > 1 && i === ultima[momento]) i = (i + 1) % n;
      ultima[momento] = i;
      var texto = f.textos[i], reg = arquivos[N.arquivo(momento, i)];
      parar();
      if (reg && reg.a && !reg.erro) {
        var a = reg.a, p;
        tocando = a;
        try { a.currentTime = 0; } catch (e) {}
        try { p = a.play(); } catch (e) { reg.erro = true; }
        if (!reg.erro) {
          if (p && p.catch) p.catch(function () { reg.erro = true; if (tocando === a && ligado) { tocando = null; vozDoNavegador(texto); } });
          return a.duration > 0 && isFinite(a.duration) ? Math.round(a.duration * 1000) : estimar(texto);
        }
      }
      return vozDoNavegador(texto) ? estimar(texto) : 0;
    },
    statusNarracao: function () {
      var r = { ok: [], faltando: [] };
      Object.keys(arquivos).forEach(function (k) { (arquivos[k].erro ? r.faltando : r.ok).push(k); });
      return r;
    },
    vez: function () { tom(660, 0.18, 0.06, 0, 'triangle'); tom(990, 0.25, 0.05, 0.09, 'triangle'); },
    toque: function () { tom(520, 0.08, 0.04, 0, 'triangle'); },
    tique: function () { tom(1200, 0.05, 0.025, 0, 'square'); },
    sorteio: function () { for (var i = 0; i < 8; i++) tom(400 + i * 70, 0.08, 0.035, i * 0.09, 'triangle'); },
    tambor: function () { for (var i = 0; i < 10; i++) { tom(90, 0.12, 0.12, i * 0.12); ruido(0.05, 500, 0.05, i * 0.12); } },
    revelar: function () { tom(180, 0.6, 0.12, 0, 'sawtooth', 90); ruido(0.3, 1500, 0.1, 0); },
    vitoria: function () { [523, 659, 784, 1046].forEach(function (f, i) { tom(f, 0.8, 0.05, i * 0.12, 'triangle'); }); },
    derrota: function () { [392, 330, 262].forEach(function (f, i) { tom(f, 0.7, 0.05, i * 0.18, 'sawtooth'); }); }
  };
  preparar();
  window.Som = Som;
})();
