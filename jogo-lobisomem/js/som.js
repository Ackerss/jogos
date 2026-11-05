/* A Noite dos Lobos — narração e efeitos sonoros curtos.
   Narração: toca o MP3 gravado (audio/narracao/, roteiro em js/narracao.js).
   Se o MP3 não existir ou falhar, fala a mesma frase com a voz do navegador.
   Efeitos (cartas, sino, tambor) são gerados na hora. Tudo desliga com o botão de som. */
(function () {
  'use strict';
  var ligado = true, ctx = null;
  var N = window.NARRACAO, arquivos = {}, tocando = null, ultima = {};

  /* Pré-carrega os MP3 de narração; os que não existirem ficam marcados como "erro". */
  function prepararNarracao() {
    if (!N || typeof Audio === 'undefined') return;
    var prontos = window.NARRACAO_PRONTOS; // lista gerada por scripts/frases.js
    Object.keys(N.frases).forEach(function (m) {
      N.frases[m].textos.forEach(function (t, i) {
        var nome = N.arquivo(m, i), reg = { erro: false, a: null };
        if (prontos && prontos.indexOf(nome) < 0) { reg.erro = true; arquivos[nome] = reg; return; }
        try {
          var a = new Audio();
          a.preload = 'auto';
          a.addEventListener('error', function () { reg.erro = true; });
          a.src = N.pasta + nome;
          reg.a = a;
        } catch (e) { reg.erro = true; }
        arquivos[nome] = reg;
      });
    });
  }
  function pararNarracao() {
    if (tocando) { try { tocando.pause(); } catch (e) {} tocando = null; }
    if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {}
  }
  function vozDoNavegador(texto) {
    if (!('speechSynthesis' in window)) return;
    try {
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR'; u.rate = 0.95; u.pitch = 0.86; u.volume = 0.8;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  /* Duração aproximada de uma frase falada pelo navegador (ms). */
  function estimar(texto) { return 500 + String(texto).length * 70; }

  function audio() {
    if (!ligado) return null;
    try {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  /* Ruído filtrado: "fff" de carta deslizando ou virando. */
  function ruido(duracao, freq, volume, atraso) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (atraso || 0);
    var n = Math.floor(a.sampleRate * duracao), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var src = a.createBufferSource(); src.buffer = buf;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    var g = a.createGain(); g.gain.setValueAtTime(volume, t);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t);
  }
  function tom(freq, duracao, volume, atraso, tipo) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (atraso || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + duracao + 0.05);
  }

  var Som = {
    get ligado() { return ligado; },
    alternar: function () {
      ligado = !ligado;
      if (!ligado) pararNarracao();
      return ligado;
    },
    falar: function (texto) {
      if (!ligado) return 0;
      pararNarracao(); vozDoNavegador(texto);
      return estimar(texto);
    },
    /* Narra um momento do roteiro. "reserva" = texto alternativo para a voz do navegador
       (ex.: com o nome do jogador) quando não houver MP3.
       Devolve quanto tempo (ms) a frase deve durar, para o jogo esperar o narrador terminar. */
    narrar: function (momento, reserva) {
      if (!ligado) return 0;
      var f = N && N.frases[momento];
      if (!f) return Som.falar(reserva || '');
      var n = f.textos.length, i = Math.floor(Math.random() * n);
      if (n > 1 && i === ultima[momento]) i = (i + 1) % n;
      ultima[momento] = i;
      var texto = f.textos[i], reg = arquivos[N.arquivo(momento, i)];
      pararNarracao();
      if (reg && reg.a && !reg.erro) {
        var a = reg.a;
        tocando = a;
        try { a.currentTime = 0; } catch (e) {}
        a.volume = 1;
        var p;
        try { p = a.play(); } catch (e) { reg.erro = true; }
        if (!reg.erro) {
          if (p && p.catch) p.catch(function () { reg.erro = true; if (tocando === a && ligado) { tocando = null; vozDoNavegador(reserva || texto); } });
          return a.duration > 0 && isFinite(a.duration) ? Math.round(a.duration * 1000) : estimar(texto);
        }
      }
      vozDoNavegador(reserva || texto);
      return estimar(reserva || texto);
    },
    /* Quais MP3 carregaram (para conferência). */
    statusNarracao: function () {
      var r = { ok: [], faltando: [] };
      Object.keys(arquivos).forEach(function (k) { (arquivos[k].erro || !(arquivos[k].a && arquivos[k].a.readyState > 0) ? r.faltando : r.ok).push(k); });
      return r;
    },
    carta: function (atraso) { ruido(0.16, 2600, 0.22, atraso); },
    virar: function (atraso) { ruido(0.11, 1700, 0.28, atraso); tom(900, 0.05, 0.03, (atraso || 0) + 0.06, 'triangle'); },
    sino: function () { [523, 659, 784].forEach(function (f, i) { tom(f, 1.1, 0.05, i * 0.16); }); },
    noite: function () { [392, 311, 262].forEach(function (f, i) { tom(f, 1.3, 0.04, i * 0.22); }); },
    tambor: function (atraso) { tom(95, 0.35, 0.18, atraso, 'sine'); ruido(0.08, 400, 0.12, atraso); },
    vitoria: function () { [523, 659, 784, 1046].forEach(function (f, i) { tom(f, 0.9, 0.05, i * 0.12, 'triangle'); }); },
    derrota: function () { [330, 294, 247].forEach(function (f, i) { tom(f, 1, 0.05, i * 0.2, 'sawtooth'); }); }
  };
  prepararNarracao();
  window.Som = Som;
})();
