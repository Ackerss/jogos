/* Arena Escorregadia — efeitos sonoros gerados na hora (sem arquivos de áudio). */
(function (raiz) {
  'use strict';
  var ctx = null, mestre = null, ruido = null, ligado = true, comMusica = true, ultimo = {};
  try { var gs = localStorage.getItem('arena-som'); ligado = gs !== '0'; comMusica = gs !== '0' && gs !== '2'; } catch (e) { /* opcional */ }

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
    s.buffer = ruido; s.loop = true; f.type = filtro; f.frequency.setValueAtTime(freq, t0);
    if (freqFim) f.frequency.exponentialRampToValueAtTime(freqFim, t0 + dur);
    g.gain.setValueAtTime(vol || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(mestre); s.start(t0, Math.random() * 0.2); s.stop(t0 + dur + 0.05);
  }

  /* ---------- Musiquinha (gerada na hora, bem baixinha) ----------
     Um baixo saltitante e uma melodia alegre em escala pentatônica. Fica mais rápida na morte súbita. */
  var musicaLigada = false, passoMus = 0, proximaNota = 0, timerMus = 0, rapida = false;
  var MELODIA = [0, 4, 7, 4, 9, 7, 4, 2, 0, 2, 4, 7, 9, 12, 9, 7, 0, 4, 7, 9, 12, 9, 7, 4, 2, 4, 2, 0, -1, 0, -1, -1];
  var BAIXO = [0, 0, 7, 7, 5, 5, 7, 7];
  function nota(semitons) { return 261.63 * Math.pow(2, semitons / 12); }
  function tocarMusica() {
    if (!musicaLigada || !ligado || !comMusica || !ctx) return;
    var batida = rapida ? 0.16 : 0.2;
    if (proximaNota < ctx.currentTime - 0.1) proximaNota = ctx.currentTime + 0.05; // voltou depois de uma pausa
    while (proximaNota < ctx.currentTime + 0.3) {
      var t0 = proximaNota, atraso = Math.max(0, t0 - ctx.currentTime), i = passoMus % MELODIA.length;
      var mel = MELODIA[i];
      if (mel >= 0 && passoMus % 2 === 0) tom(nota(mel + 12), batida * 1.6, 'triangle', 0.045, null, atraso);
      else if (mel >= 0 && i % 4 === 1) tom(nota(mel + 12), batida * 0.8, 'triangle', 0.03, null, atraso);
      if (passoMus % 4 === 0) tom(nota(BAIXO[(passoMus / 4) % BAIXO.length] - 12), batida * 1.8, 'sine', 0.1, null, atraso);
      if (passoMus % 4 === 2) chiado(0.04, 'highpass', 7000, 0.03, null, atraso);
      passoMus++; proximaNota += batida;
    }
  }

  var Som = {
    abrir: abrir,
    get ligado() { return ligado; },
    get comMusica() { return comMusica; },
    /* Com música → só efeitos → desligado → com música */
    alternar: function () {
      if (ligado && comMusica) comMusica = false; else if (ligado) ligado = false; else { ligado = true; comMusica = true; }
      try { localStorage.setItem('arena-som', !ligado ? '0' : comMusica ? '1' : '2'); } catch (e) { /* */ }
      if (ligado) abrir();
      return ligado;
    },
    musica: function (ligar, maisRapida) {
      rapida = !!maisRapida;
      if (ligar === musicaLigada) return;
      musicaLigada = ligar; clearInterval(timerMus);
      if (ligar && abrir()) { passoMus = 0; proximaNota = ctx.currentTime + 0.1; timerMus = setInterval(tocarMusica, 120); }
    },
    rapida: function (sim) { rapida = !!sim; },
    batida: function (forca, mola) {
      if (!pode('batida', 70)) return;
      var v = Math.min(0.5, 0.12 + forca * 0.04);
      if (mola) { tom(300, 0.3, 'sine', 0.3, 900); return; }
      tom(170, 0.16, 'sine', v, 60); chiado(0.06, 'lowpass', 1500, v * 0.5);
    },
    item: function () { tom(1318, 0.08, 'sine', 0.12); tom(1760, 0.12, 'sine', 0.12, null, 0.07); },
    pegou: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tom(f, 0.1, 'square', 0.07, null, i * 0.05); }); },
    boia: function () { tom(220, 0.25, 'sine', 0.3, 660); tom(660, 0.15, 'triangle', 0.15, null, 0.2); },
    pino: function () { if (!pode('pino', 60)) return; tom(1200, 0.12, 'square', 0.08, 1800); },
    racha: function () { for (var i = 0; i < 3; i++) tom(1400 + Math.random() * 600, 0.04, 'square', 0.05, null, i * 0.09); },
    vento: function () { chiado(3, 'bandpass', 400, 0.18, 1200); },
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
