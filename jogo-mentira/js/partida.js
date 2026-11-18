/* Mentira Convincente — regras puras da rodada (sem tela e sem rede; testadas em tests/).
   Rodada: uma curiosidade verdadeira com lacuna → cada um escreve uma MENTIRA → todas as mentiras
   se misturam com a verdade → cada um escolhe a que acha verdadeira → revelação → pontos. */
(function (raiz) {
  'use strict';
  var A = raiz.Auditoria || (typeof require === 'function' ? require('./auditoria.js') : null);
  var Bc = raiz.Banco || (typeof require === 'function' ? require('./banco.js') : null);

  var MIN = 3, MAX = 8, MIN_OPCOES = 5;
  var PONTOS = { VERDADE: 1000, ENGANOU: 500, CURTIDA: 100 };

  function embaralhar(v, rnd) { v = v.slice(); for (var i = v.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = v[i]; v[i] = v[j]; v[j] = t; } return v; }
  function antes(frase) { return String(frase).split('___')[0]; }
  function verdades(q) { return [q.resposta].concat(q.aceitas || []); }

  /* Mentiras prontas que servem (não parecem a verdade). */
  function prontas(q) { return (q.falsas || []).filter(function (f) { return !A.pareceVerdade(f, verdades(q)); }); }

  /* Escolhe as perguntas da partida: categorias variadas, sem repetir as já usadas nesta TV. */
  function sortearPerguntas(n, usadas, rnd, banco) {
    rnd = rnd || Math.random; banco = banco || Bc.BANCO;
    var u = {}; (usadas || []).forEach(function (id) { u[id] = 1; });
    var livres = banco.filter(function (q) { return !u[q.id] && prontas(q).length >= 2; });
    if (livres.length < n * 3) livres = banco.filter(function (q) { return prontas(q).length >= 2; }); // acabou: recomeça
    return embaralhar(livres, rnd);
  }

  /* Três opções de tema para quem escolhe (categorias diferentes). */
  function opcoesDeTema(fila, rnd, ja) {
    var vistos = {}, out = [];
    (fila || []).forEach(function (q) { if (out.length < 3 && !vistos[q.categoria] && !(ja && ja[q.id])) { vistos[q.categoria] = 1; out.push(q); } });
    return out;
  }

  function novaRodada(o) {
    return {
      q: o.pergunta, ids: o.ids.slice(), numero: o.numero || 1, mult: o.dobro ? 2 : 1,
      mentiras: {},   // id → texto
      opcoes: null,   // [{texto, autores:[ids], verdade, casa}]
      escolhas: {},   // id → índice da opção
      curtidas: {}    // id → {índice: 1}
    };
  }

  /* Confere e guarda a mentira de alguém. Pode trocar enquanto o tempo corre. */
  function mentir(r, id, bruto) {
    if (r.ids.indexOf(id) < 0) return { ok: false, erro: 'Você não está nesta rodada.' };
    if (r.opcoes) return { ok: false, erro: 'O tempo de escrever acabou.' };
    var n = A.normalizar(bruto, antes(r.q.frase));
    if (!n.ok) return n;
    if (A.pareceVerdade(n.texto, verdades(r.q))) return { ok: false, texto: n.texto, erro: 'Ops! Isso é a VERDADE (ou quase). Invente uma mentira.', verdade: true };
    for (var k in r.mentiras) if (k !== id && A.iguais(r.mentiras[k], n.texto)) return { ok: false, texto: n.texto, erro: 'Alguém já escreveu essa! Invente outra.' };
    r.mentiras[id] = n.texto;
    return { ok: true, texto: n.texto, mudou: n.mudou };
  }
  function todosMentiram(r, ids) { return (ids || r.ids).every(function (id) { return r.mentiras[id]; }); }

  /* Sugestão para o botão "Me dá uma ideia" e para os bots: mentira pronta que ninguém usou. */
  function ideia(r, rnd, pular) {
    var usadas = Object.keys(r.mentiras).map(function (k) { return r.mentiras[k]; }).concat(pular || []);
    var livres = prontas(r.q).filter(function (f) { return !usadas.some(function (u) { return A.iguais(u, f); }); });
    return livres.length ? livres[Math.floor((rnd || Math.random)() * livres.length)] : '';
  }

  /* Junta verdade + mentiras (+ mentiras da casa até MIN_OPCOES) e embaralha. */
  function montarOpcoes(r, rnd) {
    rnd = rnd || Math.random;
    var ops = [{ texto: r.q.resposta, autores: [], verdade: true, casa: false }];
    r.ids.forEach(function (id) { if (r.mentiras[id]) ops.push({ texto: r.mentiras[id], autores: [id], verdade: false, casa: false }); });
    var extras = embaralhar(prontas(r.q), rnd);
    for (var i = 0; i < extras.length && ops.length < MIN_OPCOES; i++) {
      if (!ops.some(function (o) { return A.iguais(o.texto, extras[i]); })) ops.push({ texto: extras[i], autores: [], verdade: false, casa: true });
    }
    r.opcoes = embaralhar(ops, rnd);
    return r.opcoes;
  }
  /* Opções que a pessoa vê no celular (a própria mentira não aparece). */
  function opcoesPara(r, id) {
    var out = []; (r.opcoes || []).forEach(function (o, i) { if (o.autores.indexOf(id) < 0) out.push({ i: i, t: o.texto }); });
    return out;
  }
  function escolher(r, id, i) {
    var o = r.opcoes && r.opcoes[i];
    if (!o || r.ids.indexOf(id) < 0) return { ok: false };
    if (o.autores.indexOf(id) >= 0) return { ok: false, erro: 'Essa é a sua mentira!' };
    r.escolhas[id] = i;
    return { ok: true };
  }
  function curtir(r, id, i) {
    var o = r.opcoes && r.opcoes[i];
    if (!o || o.autores.indexOf(id) >= 0 || r.ids.indexOf(id) < 0) return { ok: false };
    var c = r.curtidas[id] = r.curtidas[id] || {};
    if (c[i]) delete c[i]; else c[i] = 1;
    return { ok: true, curtiu: !!c[i] };
  }
  function todosEscolheram(r, ids) { return (ids || r.ids).every(function (id) { return r.escolhas[id] !== undefined; }); }

  /* Ordem da revelação: só as opções que alguém escolheu (mentiras primeiro, das menos às mais escolhidas), a verdade por último. */
  function ordemRevelacao(r) {
    var cont = quemEscolheu(r), lista = [];
    r.opcoes.forEach(function (o, i) { if (!o.verdade && cont[i].length) lista.push(i); });
    lista.sort(function (a, b) { return cont[a].length - cont[b].length; });
    r.opcoes.forEach(function (o, i) { if (o.verdade) lista.push(i); });
    return lista;
  }
  function quemEscolheu(r) {
    var c = r.opcoes.map(function () { return []; });
    r.ids.forEach(function (id) { var i = r.escolhas[id]; if (i !== undefined && c[i]) c[i].push(id); });
    return c;
  }

  function pontuar(r) {
    var pts = {}, enganou = {}, acertou = {}, curtidas = {}, cont = quemEscolheu(r);
    r.ids.forEach(function (id) { pts[id] = 0; enganou[id] = 0; acertou[id] = 0; curtidas[id] = 0; });
    r.opcoes.forEach(function (o, i) {
      cont[i].forEach(function (quem) {
        if (o.verdade) { pts[quem] += PONTOS.VERDADE * r.mult; acertou[quem] = 1; }
        else o.autores.forEach(function (a) { pts[a] += PONTOS.ENGANOU * r.mult; enganou[a]++; });
      });
    });
    Object.keys(r.curtidas).forEach(function (quem) {
      Object.keys(r.curtidas[quem]).forEach(function (i) { var o = r.opcoes[+i]; if (o) o.autores.forEach(function (a) { pts[a] += PONTOS.CURTIDA; curtidas[a]++; }); });
    });
    return { pontos: pts, enganou: enganou, acertou: acertou, curtidas: curtidas };
  }

  /* ---------- Bots ---------- */
  var Bots = {
    mentira: function (r, id, rnd) { return ideia(r, rnd); }, // '' = o bot não achou mentira boa e fica sem
    /* Acerta a verdade às vezes (≈40%); senão cai numa mentira qualquer. */
    escolha: function (r, id, rnd) {
      rnd = rnd || Math.random;
      var ops = opcoesPara(r, id), v = ops.filter(function (o) { return r.opcoes[o.i].verdade; })[0];
      if (v && rnd() < 0.4) return v.i;
      var outras = ops.filter(function (o) { return !r.opcoes[o.i].verdade; });
      var lista = outras.length ? outras : ops;
      return lista[Math.floor(rnd() * lista.length)].i;
    },
    curtida: function (r, id, rnd) {
      rnd = rnd || Math.random;
      if (rnd() > 0.3) return -1;
      var ops = opcoesPara(r, id).filter(function (o) { return !r.opcoes[o.i].verdade && !r.opcoes[o.i].casa; });
      return ops.length ? ops[Math.floor(rnd() * ops.length)].i : -1;
    }
  };

  var Partida = {
    MIN: MIN, MAX: MAX, MIN_OPCOES: MIN_OPCOES, PONTOS: PONTOS,
    embaralhar: embaralhar, antes: antes, prontas: prontas, sortearPerguntas: sortearPerguntas, opcoesDeTema: opcoesDeTema,
    novaRodada: novaRodada, mentir: mentir, todosMentiram: todosMentiram, ideia: ideia, montarOpcoes: montarOpcoes,
    opcoesPara: opcoesPara, escolher: escolher, curtir: curtir, todosEscolheram: todosEscolheram,
    ordemRevelacao: ordemRevelacao, quemEscolheu: quemEscolheu, pontuar: pontuar, Bots: Bots
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Partida;
  raiz.Partida = Partida;
})(typeof window !== 'undefined' ? window : globalThis);
