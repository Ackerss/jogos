/* O Impostor — regras puras (sem tela). Testadas em tests/.
   Uma rodada: todos recebem a mesma palavra secreta, menos o impostor (que só vê o tema e a grade).
   Cada um dá uma pista por vez, todos votam, e o impostor pego ainda pode chutar a palavra. */
(function (raiz) {
  'use strict';
  var P = raiz.Palavras || (typeof require === 'function' ? require('./palavras.js') : null);
  var MIN = 3, MAX = 10;

  /* Texto sem acentos, minúsculo e sem espaços sobrando (para comparar palavras). */
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function embaralhar(a, rnd) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function sortear(a, rnd) { return a[Math.floor(rnd() * a.length)]; }

  /* Tema e palavra secreta. temaNome vazio = sorteia entre todos.
     recentes: lista de "tema|palavra" já usadas (evita repetir; esquece as mais antigas quando acabam). */
  function sortearPalavra(temaNome, recentes, rnd, temaAnterior) {
    var temas = P.TEMAS.filter(function (t) { return !temaNome || t.nome === temaNome; });
    if (!temas.length) temas = P.TEMAS;
    recentes = recentes || [];
    var chave = function (t, p) { return t.nome + '|' + p.palavra; };
    var livres = function (t) { return t.palavras.filter(function (p) { return recentes.indexOf(chave(t, p)) < 0; }); };
    var comLivres = temas.filter(function (t) { return livres(t).length; });
    if (!comLivres.length) comLivres = temas; // tudo já saiu: recomeça
    var semRepetirTema = comLivres.filter(function (t) { return t.nome !== temaAnterior; });
    var t = sortear(semRepetirTema.length ? semRepetirTema : comLivres, rnd);
    var opcoes = livres(t); if (!opcoes.length) opcoes = t.palavras;
    var escolhida = sortear(opcoes, rnd);
    return {
      tema: t.nome, icone: t.icone,
      palavras: t.palavras.map(function (p) { return p.palavra; }),
      pistasBot: t.palavras.map(function (p) { return p.pistas; }),
      segredo: t.palavras.indexOf(escolhida),
      chave: chave(t, escolhida)
    };
  }

  /* Impostor: quem foi impostor menos vezes na partida (sem repetir o da rodada anterior, se der). */
  function escolherImpostor(ids, vezes, ultimo, rnd) {
    vezes = vezes || {};
    var menor = Math.min.apply(null, ids.map(function (id) { return vezes[id] || 0; }));
    var cand = ids.filter(function (id) { return (vezes[id] || 0) === menor; });
    if (cand.length > 1) cand = cand.filter(function (id) { return id !== ultimo; });
    if (!cand.length) cand = ids.filter(function (id) { return id !== ultimo; });
    return sortear(cand.length ? cand : ids, rnd);
  }

  /* Ordem de fala: a roda, a partir de alguém sorteado.
     Quem começa quase nunca é o impostor (começar sem saber a palavra é muito difícil). */
  function ordemDeFala(ids, impostor, rnd) {
    var n = ids.length, ini = Math.floor(rnd() * n);
    if (ids[ini] === impostor && rnd() < 0.8) ini = (ini + 1) % n;
    var ordem = [];
    for (var i = 0; i < n; i++) ordem.push(ids[(ini + i) % n]);
    return ordem;
  }

  /* o: {ids, numero, voltas, tema, recentes, vezes, ultimoImpostor, temaAnterior, rnd} */
  function novaRodada(o) {
    var rnd = o.rnd || Math.random;
    var w = sortearPalavra(o.tema, o.recentes, rnd, o.temaAnterior);
    var impostor = escolherImpostor(o.ids, o.vezes, o.ultimoImpostor, rnd);
    return {
      numero: o.numero || 1, ids: o.ids.slice(),
      tema: w.tema, icone: w.icone, palavras: w.palavras, pistasBot: w.pistasBot, segredo: w.segredo, chave: w.chave,
      impostor: impostor, ordem: ordemDeFala(o.ids, impostor, rnd), voltas: Math.max(1, o.voltas || 1),
      vez: 0, pistas: [], votos: {}, candidatos: o.ids.slice(), desempate: false,
      contagem: null, acusado: null, pego: false, chute: null, acertou: false, resultado: null
    };
  }

  function totalVezes(r) { return r.ordem.length * r.voltas; }
  /* De quem é a vez de dar pista (ou null quando acabaram as voltas). */
  function vezAtual(r) {
    if (r.vez >= totalVezes(r)) return null;
    return { id: r.ordem[r.vez % r.ordem.length], volta: Math.floor(r.vez / r.ordem.length) + 1 };
  }
  function palavraSecreta(r) { return r.palavras[r.segredo]; }

  /* Confere uma pista escrita: até 2 palavras e 20 letras; quem sabe a palavra não pode escrevê-la.
     (Para o impostor tudo vale: recusar entregaria que ele acertou a palavra.) */
  function validarPista(r, id, texto) {
    var t = String(texto || '').replace(/\s+/g, ' ').trim();
    if (!t) return { ok: false, erro: 'Escreva uma pista.' };
    if (t.length > 20) return { ok: false, erro: 'Pista curta: até 20 letras.' };
    if (t.split(' ').length > 2) return { ok: false, erro: 'Use uma palavra só (no máximo duas).' };
    if (id !== r.impostor) {
      var s = norm(palavraSecreta(r)), n = norm(t);
      var partes = s.split(/[ -]/).filter(function (x) { return x.length >= 4; });
      if (n === s || n.indexOf(s) >= 0 || partes.some(function (x) { return n.indexOf(x) >= 0; })) return { ok: false, erro: 'Não vale falar a palavra secreta!' };
    }
    return { ok: true, texto: t };
  }
  /* Registra a pista de quem está na vez. texto vazio = pista falada em voz alta (ou tempo esgotado). */
  function darPista(r, id, texto, falada) {
    var v = vezAtual(r);
    if (!v || v.id !== id) return { ok: false, erro: 'Não é a sua vez.' };
    var t = '';
    if (!falada) { var c = validarPista(r, id, texto); if (!c.ok) return c; t = c.texto; }
    r.pistas.push({ id: id, volta: v.volta, texto: t, falada: !!falada });
    r.vez++;
    return { ok: true };
  }
  function pularVez(r) {
    var v = vezAtual(r); if (!v) return false;
    r.pistas.push({ id: v.id, volta: v.volta, texto: '', pulou: true });
    r.vez++;
    return true;
  }
  function pistasDe(r, id) { return r.pistas.filter(function (p) { return p.id === id; }); }

  /* Votos: cada um vota em alguém (não em si mesmo). No desempate, só nos empatados. */
  function votar(r, id, alvo) {
    if (r.ids.indexOf(id) < 0) return { ok: false, erro: 'Jogador fora da rodada.' };
    if (alvo === id) return { ok: false, erro: 'Não vale votar em você.' };
    if (r.candidatos.indexOf(alvo) < 0) return { ok: false, erro: 'Escolha alguém da lista.' };
    r.votos[id] = alvo;
    return { ok: true };
  }
  /* Quem ainda pode votar (no desempate, um empatado sozinho com ele mesmo não teria opção). */
  function votantes(r) {
    return r.ids.filter(function (id) { return r.candidatos.some(function (c) { return c !== id; }); });
  }
  function todosVotaram(r) { return votantes(r).every(function (id) { return r.votos[id] !== undefined; }); }

  function apurar(r) {
    var cont = {};
    r.candidatos.forEach(function (id) { cont[id] = 0; });
    Object.keys(r.votos).forEach(function (k) { var a = r.votos[k]; if (a in cont) cont[a]++; });
    var max = 0;
    Object.keys(cont).forEach(function (k) { if (cont[k] > max) max = cont[k]; });
    var mais = max > 0 ? r.candidatos.filter(function (id) { return cont[id] === max; }) : [];
    r.contagem = cont;
    return { contagem: cont, max: max, mais: mais };
  }
  /* Empate: nova votação só entre os empatados (uma vez). */
  function iniciarDesempate(r, empatados) {
    r.desempate = true; r.candidatos = empatados.slice(); r.votosAntes = r.votos; r.votos = {};
  }
  function acusar(r, id) { r.acusado = id; r.pego = id === r.impostor; }
  function chutar(r, indice) {
    if (typeof indice !== 'number' || indice < 0 || indice >= r.palavras.length) return { ok: false };
    r.chute = indice; r.acertou = indice === r.segredo;
    return { ok: true };
  }

  /* Pontos da rodada:
     • quem votou no impostor (último voto): +1;
     • impostor escapou: impostor +3;
     • impostor pego e errou a palavra: cada inocente +1;
     • impostor pego e acertou a palavra: impostor +2 (rouba a vitória). */
  var PONTOS = { votoCerto: 1, escapou: 3, inocentes: 1, roubou: 2 };
  function pontuar(r) {
    var tipo = !r.pego ? 'escapou' : r.acertou ? 'roubou' : 'pego';
    var pontos = {}, motivos = {};
    r.ids.forEach(function (id) { pontos[id] = 0; motivos[id] = []; });
    function dar(id, n, m) { pontos[id] += n; motivos[id].push(m); }
    r.ids.forEach(function (id) { if (id !== r.impostor && r.votos[id] === r.impostor) dar(id, PONTOS.votoCerto, 'votou certo'); });
    if (tipo === 'escapou') dar(r.impostor, PONTOS.escapou, 'escapou');
    if (tipo === 'roubou') dar(r.impostor, PONTOS.roubou, 'acertou a palavra');
    if (tipo === 'pego') r.ids.forEach(function (id) { if (id !== r.impostor) dar(id, PONTOS.inocentes, 'pegaram o impostor'); });
    r.resultado = { tipo: tipo, pontos: pontos, motivos: motivos };
    return r.resultado;
  }

  /* Quem tem mais pontos (pode ser mais de um). */
  function lideres(placar, ids) {
    var max = -1;
    ids.forEach(function (id) { if ((placar[id] || 0) > max) max = placar[id] || 0; });
    return ids.filter(function (id) { return (placar[id] || 0) === max; });
  }

  var Regras = {
    MIN: MIN, MAX: MAX, PONTOS: PONTOS, norm: norm, embaralhar: embaralhar,
    sortearPalavra: sortearPalavra, escolherImpostor: escolherImpostor, ordemDeFala: ordemDeFala, novaRodada: novaRodada,
    vezAtual: vezAtual, totalVezes: totalVezes, palavraSecreta: palavraSecreta, validarPista: validarPista, darPista: darPista, pularVez: pularVez, pistasDe: pistasDe,
    votar: votar, votantes: votantes, todosVotaram: todosVotaram, apurar: apurar, iniciarDesempate: iniciarDesempate,
    acusar: acusar, chutar: chutar, pontuar: pontuar, lideres: lideres
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Regras;
  raiz.Regras = Regras;
})(typeof window !== 'undefined' ? window : globalThis);
