'use strict';
const test = require('node:test');
const assert = require('node:assert');
const A = require('../js/auditoria.js');
const B = require('../js/banco.js');
const P = require('../js/partida.js');

function rndSeed(s) { return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
const Q = { id: 1, categoria: '🐾 Bichos', frase: 'O animal nacional da Escócia é o ___.', resposta: 'Unicórnio', aceitas: [], falsas: ['Cervo', 'Leão', 'Águia-real', 'Cão pastor'] };

test('banco: formato certo, frase com uma lacuna e mentiras prontas suficientes', () => {
  assert.ok(B.BANCO.length >= 250);
  const ids = new Set();
  for (const q of B.BANCO) {
    assert.ok(!ids.has(q.id)); ids.add(q.id);
    assert.strictEqual(q.frase.split('___').length, 2, 'uma lacuna: ' + q.frase);
    assert.ok(q.resposta && q.resposta.length <= A.MAX, q.frase);
    assert.ok(P.prontas(q).length >= 3, 'mentiras prontas: ' + q.frase);
  }
});

test('mentir: recusa a verdade, repetidas e vazias; normaliza o texto', () => {
  const r = P.novaRodada({ ids: ['a', 'b', 'c'], pergunta: Q });
  assert.strictEqual(P.mentir(r, 'a', 'unicornio').ok, false);
  assert.strictEqual(P.mentir(r, 'a', 'Unicórnios').ok, false);
  assert.strictEqual(P.mentir(r, 'a', '   ').ok, false);
  const ok = P.mentir(r, 'a', 'o dragao kkkk');
  assert.ok(ok.ok); assert.strictEqual(r.mentiras.a, 'Dragão');
  assert.strictEqual(P.mentir(r, 'b', 'DRAGÃO').ok, false, 'repetida');
  assert.ok(P.mentir(r, 'a', 'Cavalo').ok, 'pode trocar');
  assert.strictEqual(P.mentir(r, 'x', 'Gato').ok, false, 'fora da rodada');
});

test('opções: verdade + mentiras + casa até o mínimo; ninguém vê a própria mentira', () => {
  const r = P.novaRodada({ ids: ['a', 'b', 'c'], pergunta: Q });
  P.mentir(r, 'a', 'Dragão'); P.mentir(r, 'b', 'Cervo');
  P.montarOpcoes(r, rndSeed(3));
  assert.ok(r.opcoes.length >= P.MIN_OPCOES);
  assert.strictEqual(r.opcoes.filter(o => o.verdade).length, 1);
  const textos = r.opcoes.map(o => A.chave(o.texto));
  assert.strictEqual(new Set(textos).size, textos.length, 'sem opções repetidas');
  assert.ok(P.opcoesPara(r, 'a').every(o => o.t !== 'Dragão'));
  const minha = r.opcoes.findIndex(o => o.texto === 'Dragão');
  assert.strictEqual(P.escolher(r, 'a', minha).ok, false);
  assert.strictEqual(P.curtir(r, 'a', minha).ok, false);
});

test('pontos: verdade +1000, cada enganado +500 ao autor, curtida +100, última rodada vale dobro', () => {
  for (const dobro of [false, true]) {
    const m = dobro ? 2 : 1;
    const r = P.novaRodada({ ids: ['a', 'b', 'c'], pergunta: Q, dobro });
    P.mentir(r, 'a', 'Dragão'); P.mentir(r, 'b', 'Lobo'); P.mentir(r, 'c', 'Gato');
    P.montarOpcoes(r, rndSeed(9));
    const idx = t => r.opcoes.findIndex(o => o.texto === t);
    P.escolher(r, 'a', idx('Unicórnio')); P.escolher(r, 'b', idx('Dragão')); P.escolher(r, 'c', idx('Dragão'));
    P.curtir(r, 'b', idx('Gato'));
    const p = P.pontuar(r);
    assert.strictEqual(p.pontos.a, (1000 + 2 * 500) * m);
    assert.strictEqual(p.pontos.b, 0);
    assert.strictEqual(p.pontos.c, 100);
    assert.strictEqual(p.enganou.a, 2); assert.strictEqual(p.acertou.a, 1);
    const ordem = P.ordemRevelacao(r);
    assert.ok(r.opcoes[ordem[ordem.length - 1]].verdade, 'verdade por último');
    assert.strictEqual(ordem.length, 2, 'só o que foi escolhido + verdade');
  }
});

test('partidas inteiras com bots: sempre termina, opções válidas, pontos coerentes', () => {
  const rnd = rndSeed(42);
  let acertos = 0, escolhas = 0;
  for (let jogo = 0; jogo < 60; jogo++) {
    const n = 3 + (jogo % 6), ids = Array.from({ length: n }, (_, i) => 'j' + i);
    const fila = P.sortearPerguntas(7, [], rnd);
    for (let k = 0; k < 7; k++) {
      const r = P.novaRodada({ ids, pergunta: fila[k], dobro: k === 6 });
      ids.forEach(id => { const t = P.Bots.mentira(r, id, rnd); if (t) assert.ok(P.mentir(r, id, t).ok, t); });
      P.montarOpcoes(r, rnd);
      assert.ok(r.opcoes.length >= 4, 'opções: ' + r.opcoes.length);
      ids.forEach(id => { assert.ok(P.escolher(r, id, P.Bots.escolha(r, id, rnd)).ok); const c = P.Bots.curtida(r, id, rnd); if (c >= 0) P.curtir(r, id, c); });
      assert.ok(P.todosEscolheram(r));
      const p = P.pontuar(r);
      ids.forEach(id => { escolhas++; if (p.acertou[id]) acertos++; assert.ok(p.pontos[id] >= 0); });
    }
  }
  const taxa = acertos / escolhas;
  assert.ok(taxa > 0.3 && taxa < 0.6, 'bots acertam às vezes: ' + taxa);
});

test('sorteio de perguntas não repete as já usadas e o tema tem 3 categorias diferentes', () => {
  const usadas = B.BANCO.slice(0, 100).map(q => q.id);
  const fila = P.sortearPerguntas(7, usadas, rndSeed(5));
  assert.ok(fila.every(q => usadas.indexOf(q.id) < 0));
  const t = P.opcoesDeTema(fila);
  assert.strictEqual(t.length, 3);
  assert.strictEqual(new Set(t.map(q => q.categoria)).size, 3);
});
