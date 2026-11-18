'use strict';
const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/palavras.js');
global.Palavras = P;
const R = require('../js/regras.js');
global.Regras = R;
const B = require('../js/bots.js');
const F = require('../js/figuras.js');
const N = require('../js/narracao.js');

test('banco: 16 palavras por tema, sem repetir, 3 pistas cada', () => {
  P.TEMAS.forEach(t => {
    assert.strictEqual(t.palavras.length, 16, t.nome);
    assert.strictEqual(new Set(t.palavras.map(p => R.norm(p.palavra))).size, 16, t.nome + ' repetida');
    t.palavras.forEach(p => assert.strictEqual(p.pistas.length, 3, t.nome + '/' + p.palavra));
  });
});

test('modo criança: todos os temas da lista existem e têm figura para as 16 palavras', () => {
  F.CRIANCA.forEach(nome => {
    const t = P.TEMAS.find(x => x.nome === nome);
    assert.ok(t, nome);
    t.palavras.forEach(p => assert.ok(F.de(nome, p.palavra), nome + '/' + p.palavra));
  });
  for (let i = 0; i < 50; i++) assert.ok(F.CRIANCA.includes(R.sortearPalavra(F.CRIANCA, [], Math.random).tema));
});

test('impostor é revezado: em 10 rodadas com 5 jogadores, cada um é impostor 2 vezes', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'], vezes = {};
  let ult = null;
  for (let i = 0; i < 10; i++) { const r = R.novaRodada({ ids, vezes, ultimoImpostor: ult }); vezes[r.impostor] = (vezes[r.impostor] || 0) + 1; ult = r.impostor; }
  ids.forEach(id => assert.strictEqual(vezes[id], 2));
});

test('pista do inocente não pode ser a palavra secreta; a do impostor pode', () => {
  const r = R.novaRodada({ ids: ['a', 'b', 'c'] });
  const ino = r.ids.find(x => x !== r.impostor), sec = R.palavraSecreta(r);
  assert.strictEqual(R.validarPista(r, ino, sec).ok, false);
  assert.strictEqual(R.validarPista(r, r.impostor, sec).ok, true);
  assert.strictEqual(R.validarPista(r, ino, 'uma duas tres').ok, false);
});

test('500 rodadas com bots: votação, desempate, chute e pontos sempre fecham', () => {
  let pego = 0, escapou = 0, roubou = 0;
  for (let i = 0; i < 500; i++) {
    const ids = ['a', 'b', 'c', 'd', 'e'].slice(0, 3 + (i % 3));
    const r = R.novaRodada({ ids, voltas: ids.length <= 4 ? 2 : 1 });
    let v;
    while ((v = R.vezAtual(r))) assert.ok(R.darPista(r, v.id, B.pista(r, v.id, Math.random)).ok || R.pularVez(r));
    ids.forEach(id => R.votar(r, id, B.voto(r, id, Math.random)));
    assert.ok(R.todosVotaram(r));
    let a = R.apurar(r);
    if (a.mais.length > 1) { R.iniciarDesempate(r, a.mais); R.votantes(r).forEach(id => R.votar(r, id, B.voto(r, id, Math.random))); a = R.apurar(r); }
    if (a.mais.length === 1) { R.acusar(r, a.mais[0]); if (r.pego) R.chutar(r, B.chute(r, r.impostor, Math.random)); }
    const res = R.pontuar(r);
    ({ pego: () => pego++, escapou: () => escapou++, roubou: () => roubou++ })[res.tipo]();
    const total = Object.values(res.pontos).reduce((s, x) => s + x, 0);
    assert.ok(total >= 0);
  }
  assert.ok(pego > 50 && escapou > 20, `pego ${pego} escapou ${escapou} roubou ${roubou}`);
});

test('narração: todo momento tem texto e os essenciais existem', () => {
  N.essenciais.forEach(m => assert.ok(N.frases[m], m));
  Object.keys(N.frases).forEach(m => assert.ok(N.frases[m].textos.length >= 1));
});
