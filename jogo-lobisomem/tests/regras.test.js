'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/regras.js');
const Bots = require('../js/bots.js');

function semente(s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
function mesa(n) {
  return Array.from({ length: n }, (_, i) => ({ id: i, nome: 'J' + i, genero: i % 2 ? 'f' : 'm', humano: i === 0 }));
}
/* Força uma distribuição conhecida: papéis na ordem dada (jogadores + centro). */
function partidaCom(papeis) {
  const n = papeis.length - 3;
  const e = R.criarPartida(mesa(n), semente(1));
  papeis.forEach((p, i) => { e.cartas[i].papel = p; });
  e.jogadores.forEach(j => { e.inicial[j.id] = papeis[j.id]; });
  return e;
}

test('baralho tem jogadores + 3 cartas, com 2 lobos e 1 de cada poder', () => {
  for (let n = 3; n <= 6; n++) {
    const b = R.montarBaralho(n);
    assert.strictEqual(b.length, n + 3);
    assert.strictEqual(b.filter(x => x === 'wolf').length, 2);
    ['seer', 'robber', 'trouble'].forEach(p => assert.strictEqual(b.filter(x => x === p).length, 1));
  }
  assert.throws(() => R.criarPartida(mesa(2)));
  assert.throws(() => R.criarPartida(mesa(7)));
});

test('lobos com parceiro se reconhecem e não precisam agir', () => {
  const e = partidaCom(['wolf', 'wolf', 'seer', 'robber', 'trouble', 'villager', 'villager']);
  R.iniciarEtapa(e, 0);
  assert.deepStrictEqual(e.notas[0].aliados, [1]);
  assert.strictEqual(R.podeAgir(e, 0), false);
});

test('lobo sozinho pode espiar só uma carta do centro', () => {
  const e = partidaCom(['wolf', 'seer', 'robber', 'trouble', 'wolf', 'villager', 'villager']);
  R.iniciarEtapa(e, 0);
  assert.strictEqual(R.podeAgir(e, 0), true);
  assert.ok(R.agir(e, 0, { tipo: 'espiarCentro', indice: 0 }).ok);
  assert.strictEqual(e.notas[0].centroVisto[0].papel, 'wolf');
  assert.strictEqual(R.agir(e, 0, { tipo: 'espiarCentro', indice: 1 }).ok, false);
});

test('ninguém age fora da própria etapa', () => {
  const e = partidaCom(['wolf', 'seer', 'robber', 'trouble', 'wolf', 'villager', 'villager']);
  R.iniciarEtapa(e, 0);
  assert.strictEqual(R.agir(e, 2, { tipo: 'roubar', alvo: 1 }).ok, false);
  R.iniciarEtapa(e, 2);
  assert.strictEqual(R.agir(e, 2, { tipo: 'roubar', alvo: 2 }).ok, false, 'não rouba de si mesmo');
  assert.ok(R.agir(e, 2, { tipo: 'roubar', alvo: 1 }).ok);
  assert.strictEqual(R.agir(e, 2, { tipo: 'roubar', alvo: 0 }).ok, false, 'só uma vez');
});

test('Ladrão troca e vê a nova carta; Encrenqueiro troca sem ver', () => {
  const e = partidaCom(['wolf', 'seer', 'robber', 'trouble', 'villager', 'wolf', 'villager']);
  R.iniciarEtapa(e, 2);
  R.agir(e, 2, { tipo: 'roubar', alvo: 0 });
  assert.strictEqual(R.papelAtual(e, 2), 'wolf');
  assert.strictEqual(R.papelAtual(e, 0), 'robber');
  assert.strictEqual(e.notas[2].cartaNova.papel, 'wolf');
  R.iniciarEtapa(e, 3);
  assert.strictEqual(R.agir(e, 3, { tipo: 'trocar', a: 3, b: 1 }).ok, false, 'não troca a própria');
  assert.ok(R.agir(e, 3, { tipo: 'trocar', a: 2, b: 1 }).ok);
  assert.strictEqual(R.papelAtual(e, 1), 'wolf');
  assert.strictEqual(R.papelAtual(e, 2), 'seer');
  assert.deepStrictEqual(e.trocas.map(t => t.tipo), ['robber', 'trouble']);
  // O papel INICIAL continua o mesmo: define quem acordou à noite.
  assert.strictEqual(e.inicial[2], 'robber');
});

test('Vidente vê a carta como ela está na hora (antes das trocas)', () => {
  const e = partidaCom(['seer', 'wolf', 'robber', 'trouble', 'villager', 'wolf', 'villager']);
  R.iniciarEtapa(e, 1);
  R.agir(e, 0, { tipo: 'verJogador', alvo: 1 });
  R.iniciarEtapa(e, 2);
  R.agir(e, 2, { tipo: 'roubar', alvo: 1 });
  assert.strictEqual(e.notas[0].viu[0].papel, 'wolf');
  assert.strictEqual(R.papelAtual(e, 1), 'robber');
});

test('votação: mais votado sai; todos com 1 voto, ninguém sai; empate elimina os empatados', () => {
  let e = partidaCom(['wolf', 'villager', 'seer', 'robber', 'trouble', 'wolf', 'villager']);
  [[0, 1], [1, 0], [2, 0], [3, 0]].forEach(([a, b]) => R.votar(e, a, b));
  let r = R.apurar(e);
  assert.deepStrictEqual(r.eliminados, [0]);
  assert.strictEqual(r.time, 'aldeia');
  assert.deepStrictEqual(r.vencedores, [1, 2, 3]);

  e = partidaCom(['wolf', 'villager', 'seer', 'robber', 'trouble', 'wolf', 'villager']);
  [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => R.votar(e, a, b));
  r = R.apurar(e);
  assert.deepStrictEqual(r.eliminados, []);
  assert.strictEqual(r.time, 'lobos');

  e = partidaCom(['wolf', 'villager', 'seer', 'robber', 'trouble', 'wolf', 'villager']);
  [[0, 1], [1, 0], [2, 1], [3, 0]].forEach(([a, b]) => R.votar(e, a, b));
  r = R.apurar(e);
  assert.deepStrictEqual(r.eliminados.sort(), [0, 1]);
  assert.strictEqual(r.time, 'aldeia');
  assert.strictEqual(R.votar(e, 0, 2).ok, false, 'não vota duas vezes');
  assert.strictEqual(R.votar(e, 1, 1).ok, false, 'não vota em si');
});

test('sem lobos entre os jogadores: aldeia vence só se ninguém sair', () => {
  let e = partidaCom(['seer', 'robber', 'trouble', 'villager', 'wolf', 'wolf', 'villager']);
  [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => R.votar(e, a, b));
  assert.strictEqual(R.apurar(e).time, 'aldeia');
  e = partidaCom(['seer', 'robber', 'trouble', 'villager', 'wolf', 'wolf', 'villager']);
  [[0, 1], [1, 0], [2, 0], [3, 0]].forEach(([a, b]) => R.votar(e, a, b));
  const r = R.apurar(e);
  assert.strictEqual(r.time, 'ninguem');
  assert.deepStrictEqual(r.vencedores, []);
});

test('Paz na vila: empatando ou ganhando, ninguém sai', () => {
  // Sem lobos entre os jogadores: a maioria pede paz e a aldeia vence.
  let e = partidaCom(['seer', 'robber', 'trouble', 'villager', 'wolf', 'wolf', 'villager']);
  [[0, R.PAZ], [1, R.PAZ], [2, R.PAZ], [3, 0]].forEach(([a, b]) => assert.ok(R.votar(e, a, b).ok));
  let r = R.apurar(e);
  assert.ok(r.pazVenceu);
  assert.strictEqual(r.paz, 3);
  assert.deepStrictEqual(r.eliminados, []);
  assert.strictEqual(r.time, 'aldeia');

  // Com lobo: paz empata com o mais votado, ninguém sai e os lobos vencem.
  e = partidaCom(['wolf', 'villager', 'seer', 'robber', 'trouble', 'wolf', 'villager']);
  [[0, R.PAZ], [1, R.PAZ], [2, 0], [3, 0]].forEach(([a, b]) => R.votar(e, a, b));
  r = R.apurar(e);
  assert.ok(r.pazVenceu);
  assert.deepStrictEqual(r.eliminados, []);
  assert.strictEqual(r.time, 'lobos');

  // Paz perde: sai o mais votado.
  e = partidaCom(['wolf', 'villager', 'seer', 'robber', 'trouble', 'wolf', 'villager']);
  [[0, R.PAZ], [1, 0], [2, 0], [3, 0]].forEach(([a, b]) => R.votar(e, a, b));
  r = R.apurar(e);
  assert.ok(!r.pazVenceu);
  assert.deepStrictEqual(r.eliminados, [0]);
  assert.strictEqual(r.time, 'aldeia');
  assert.strictEqual(R.votar(e, 9, R.PAZ).ok, false, 'jogador inexistente não vota');
});

test('a vitória vale pelo papel FINAL', () => {
  const e = partidaCom(['robber', 'wolf', 'seer', 'villager', 'trouble', 'wolf', 'villager']);
  R.iniciarEtapa(e, 2);
  R.agir(e, 0, { tipo: 'roubar', alvo: 1 }); // J0 vira lobo, J1 vira ladrão
  [[0, 1], [1, 2], [2, 1], [3, 1]].forEach(([a, b]) => R.votar(e, a, b));
  const r = R.apurar(e);
  assert.deepStrictEqual(r.eliminados, [1]);
  assert.deepStrictEqual(r.lobos, [0]);
  assert.strictEqual(r.time, 'lobos');
  assert.deepStrictEqual(r.vencedores, [0]);
});

test('partidas inteiras com bots terminam sempre com resultado válido', () => {
  for (let s = 1; s <= 300; s++) {
    const rnd = semente(s), n = 3 + (s % 4);
    const e = R.criarPartida(mesa(n).map(j => ({ ...j, humano: false })), rnd);
    for (let k = 0; k < R.ORDEM_NOITE.length; k++) {
      R.iniciarEtapa(e, k);
      e.jogadores.forEach(b => Bots.agirNoite(e, b, rnd));
    }
    const ids = Object.values(e.maos).concat(e.centro).sort((a, b) => a - b);
    assert.deepStrictEqual(ids, Array.from({ length: n + 3 }, (_, i) => i), 'nenhuma carta some ou duplica');
    e.jogadores.forEach(b => { R.votar(e, b.id, Bots.voto(e, b, [], rnd)); Bots.falaInicial(e, b, rnd); });
    assert.ok(R.todosVotaram(e));
    const r = R.apurar(e);
    assert.ok(['aldeia', 'lobos', 'ninguem'].includes(r.time));
    if (r.pazVenceu) assert.deepStrictEqual(r.eliminados, []);
  }
});
