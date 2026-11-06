/* Arena Escorregadia — bots que completam a arena.
   Eles só "apertam" o mesmo joystick e o mesmo botão que um celular: {x, y, tranco}.
   Decidem a cada 0,15–0,35 s (como alguém reagindo), erram a mira um pouco e às vezes se empolgam. */
(function (raiz) {
  'use strict';
  var F = raiz.Fisica || (typeof require !== 'undefined' ? require('./fisica.js') : null);
  var C = F.C;

  var NOMES = ['Picolé', 'Pinguim', 'Foca', 'Iglu', 'Floquinho', 'Morsa', 'Geladinho', 'Yeti'];

  function norm(x, y) { var d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d, d: d }; }

  /* mem guarda a decisão do bot entre um quadro e outro. nivel: 0,5 (calmo) a 1 (esperto). */
  function pensar(m, id, mem, nivel) {
    var rnd = m.aleatorio || Math.random;
    nivel = nivel == null ? 0.8 : nivel;
    var eu = F.bolaDe(m, id);
    if (!eu || eu.estado === 'caindo' || eu.estado === 'espera') return { x: 0, y: 0 };
    if (m.t < 0.6 + (1 - nivel) * 0.6) return { x: 0, y: 0 }; // reage ao "JÁ!" com um pequeno atraso
    if (mem.ate && m.t < mem.ate) { var s = mem.saida; mem.saida = { x: s.x, y: s.y }; return s; }
    mem.ate = m.t + 0.15 + (1 - nivel) * 0.25 + rnd() * 0.1;
    var erro = (rnd() - 0.5) * (1 - nivel) * 1.4, saida = { x: 0, y: 0 };
    var outros = F.naArena(m).filter(function (b) { return b.id !== id; });

    if (eu.estado === 'fantasma') {
      // Fantasma: vai para o lado de dentro de quem está mais perto da borda e sopra.
      var alvo = null, melhor = -1;
      outros.forEach(function (b) { var k = Math.hypot(b.x, b.y) / m.raio; if (k > melhor) { melhor = k; alvo = b; } });
      if (!alvo) return (mem.saida = saida);
      var fora = norm(alvo.x, alvo.y), px = alvo.x - fora.x * 1.6, py = alvo.y - fora.y * 1.6;
      var ida = norm(px - eu.x, py - eu.y);
      var vel = Math.min(1, ida.d / 1.5);
      saida = { x: ida.x * vel, y: ida.y * vel };
      if (ida.d < 1.4 && eu.recarga <= 0 && melhor > 0.55 && rnd() < 0.5 + nivel * 0.4) saida.tranco = true;
      mem.saida = { x: saida.x, y: saida.y }; return saida;
    }

    var dc = Math.hypot(eu.x, eu.y);
    var raioSeguro = m.raio;
    var falta = F.proximaQuebra(m);
    if (falta !== null && falta < 2.5) raioSeguro = Math.min(raioSeguro, F.raioDepois(m));
    // Onde estarei daqui a pouco, se não fizer nada?
    var px2 = eu.x + eu.vx * 0.55, py2 = eu.y + eu.vy * 0.55, dPrev = Math.hypot(px2, py2);
    var margem = 1.3 + (1 - nivel) * 0.5;

    if (dPrev > raioSeguro - margem || dc > raioSeguro - margem) {
      // Perigo: volta para o meio. Se estiver escorregando para fora rápido, dá um tranco para dentro.
      var dentro = norm(-px2, -py2);
      saida = { x: dentro.x, y: dentro.y };
      var saindo = (eu.vx * eu.x + eu.vy * eu.y) / (dc || 1);
      if (saindo > 3 && eu.recarga <= 0 && dPrev > raioSeguro - 0.6 && rnd() < nivel) saida.tranco = true;
    } else if (outros.length) {
      // Escolhe um alvo (o mesmo por um tempo) e tenta chegar pelo lado de dentro dele.
      var alvo2 = mem.alvo && F.bolaDe(m, mem.alvo);
      if (!alvo2 || alvo2.estado !== 'gelo' || m.t > (mem.trocaAlvo || 0)) {
        var nota = Infinity;
        outros.forEach(function (b) {
          var dist = Math.hypot(b.x - eu.x, b.y - eu.y), borda = m.raio - Math.hypot(b.x, b.y);
          var n2 = dist + borda * 0.8 + rnd() * 2;
          if (n2 < nota) { nota = n2; alvo2 = b; }
        });
        mem.alvo = alvo2.id; mem.trocaAlvo = m.t + 1.5 + rnd() * 2;
      }
      var fora2 = norm(alvo2.x, alvo2.y);
      var atrasX = alvo2.x - fora2.x * 1.9, atrasY = alvo2.y - fora2.y * 1.9;
      var paraAlvo = norm(alvo2.x - eu.x, alvo2.y - eu.y);
      var dentroDoAlvo = (eu.x - alvo2.x) * fora2.x + (eu.y - alvo2.y) * fora2.y < 0;
      var dir = dentroDoAlvo ? norm(alvo2.x + alvo2.vx * 0.3 - eu.x, alvo2.y + alvo2.vy * 0.3 - eu.y) : norm(atrasX - eu.x, atrasY - eu.y);
      var ang = Math.atan2(dir.y, dir.x) + erro;
      saida = { x: Math.cos(ang), y: Math.sin(ang) };
      // Tranco: perto, alinhado e vindo de dentro (assim empurra o outro para fora).
      var alinhado = (eu.vx * paraAlvo.x + eu.vy * paraAlvo.y) > -0.5;
      if (dentroDoAlvo && paraAlvo.d < 3.2 && alinhado && eu.recarga <= 0 && rnd() < 0.25 + nivel * 0.5) {
        // Não dá tranco se isso o levaria para fora.
        var fimX = eu.x + paraAlvo.x * 3.2, fimY = eu.y + paraAlvo.y * 3.2;
        if (Math.hypot(fimX, fimY) < raioSeguro + 0.5) { saida = { x: paraAlvo.x, y: paraAlvo.y, tranco: true }; }
      }
      // De vez em quando o bot se empolga e dá um tranco à toa (bom para rir).
      if (!saida.tranco && eu.recarga <= 0 && rnd() < (1 - nivel) * 0.04 && dc < raioSeguro * 0.5) saida.tranco = true;
    }
    mem.saida = { x: saida.x, y: saida.y };
    return saida;
  }

  var Bots = { NOMES: NOMES, pensar: pensar };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bots;
  else raiz.Bots = Bots;
})(typeof window !== 'undefined' ? window : this);
