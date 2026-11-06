'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/regras.js');
const B = require('../js/bots.js');

function semente(s) { return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
const GENTE = [{ id: 0, nome: 'Ana', humano: true }, { id: 1, nome: 'Léo', humano: false }, { id: 2, nome: 'Bia', humano: false }];

test('largada: cada bicho começa nas casas 0 a 2, todos na pista', () => {
  const p = R.criarPartida(GENTE, semente(7));
  assert.strictEqual(R.ordem(p).length, 5);
  R.IDS.forEach(id => assert.ok(p.pos[id] >= 0 && p.pos[id] <= 2));
  assert.strictEqual(p.jogadores[0].moedas, R.MOEDAS_INICIO);
});

test('quem anda carrega quem está nas costas', () => {
  const p = R.criarPartida(GENTE, semente(1));
  p.casas = p.casas.map(() => []);
  p.casas[3] = ['tartaruga', 'porco', 'pato']; // tartaruga embaixo, pato em cima
  p.casas[0] = ['coelho']; p.casas[1] = ['gato'];
  Object.assign(p.pos, { tartaruga: 3, porco: 3, pato: 3, coelho: 0, gato: 1 });
  p.copo = ['porco'];
  const ev = R.rolar(p, 0, () => 0.99); // porco, valor 3
  assert.strictEqual(ev[0].bicho, 'porco');
  assert.strictEqual(ev[0].valor, 3);
  assert.deepStrictEqual(p.casas[6], ['porco', 'pato']);
  assert.deepStrictEqual(p.casas[3], ['tartaruga']);
  assert.strictEqual(p.jogadores[0].moedas, R.MOEDAS_INICIO + 1);
});

test('cair em casa ocupada: sobe nas costas e fica na frente', () => {
  const p = R.criarPartida(GENTE, semente(1));
  p.casas = p.casas.map(() => []);
  p.casas[2] = ['gato']; p.casas[4] = ['pato']; p.casas[0] = ['tartaruga', 'porco', 'coelho'];
  Object.assign(p.pos, { gato: 2, pato: 4, tartaruga: 0, porco: 0, coelho: 0 });
  p.copo = ['gato'];
  R.rolar(p, 0, (() => { const v = [0, 0.5]; let i = 0; return () => v[i++]; })()); // gato, valor 2
  assert.deepStrictEqual(p.casas[4], ['pato', 'gato']);
  assert.strictEqual(R.ordem(p)[0], 'gato');
});

test('banana: escorrega 1 casa, dono ganha 1 moeda', () => {
  const p = R.criarPartida(GENTE, semente(3));
  p.casas = p.casas.map(() => []);
  p.casas[0] = ['tartaruga']; p.casas[1] = ['porco']; p.casas[2] = ['pato']; p.casas[3] = ['coelho']; p.casas[10] = ['gato'];
  Object.assign(p.pos, { tartaruga: 0, porco: 1, pato: 2, coelho: 3, gato: 10 });
  assert.strictEqual(R.casaDaBanana(p, 2, 'coelho'), 5);
  R.porBanana(p, 2, 'coelho');
  assert.strictEqual(p.bananas[5], 2);
  p.copo = ['coelho'];
  const ev = R.rolar(p, 0, (() => { const v = [0, 0.5]; let i = 0; return () => v[i++]; })()); // coelho anda 2 → casa 5
  assert.ok(ev.some(e => e.tipo === 'banana'));
  assert.strictEqual(p.pos.coelho, 4);
  assert.strictEqual(p.jogadores[2].moedas, R.MOEDAS_INICIO + 1);
});

test('banana não fica ao lado da banana de outro, nem em casa ocupada', () => {
  const p = R.criarPartida(GENTE, semente(3));
  p.casas = p.casas.map(() => []);
  p.casas[0] = ['tartaruga', 'porco', 'pato', 'coelho', 'gato'];
  R.IDS.forEach(id => { p.pos[id] = 0; });
  R.porBanana(p, 1, 'gato'); // casa 2
  assert.strictEqual(p.bananas[2], 1);
  assert.strictEqual(R.casaDaBanana(p, 2, 'gato'), null); // 2 ocupada, 1 e 3 vizinhas
  assert.strictEqual(R.casaDaBanana(p, 1, 'gato'), 2);    // a própria banana pode mudar de lugar
});

test('pagamento da volta: 1º vale o bilhete, 2º vale 1, os outros perdem 1 (sem ficar negativo)', () => {
  const p = R.criarPartida(GENTE, semente(5));
  p.casas = p.casas.map(() => []);
  p.casas[8] = ['pato']; p.casas[7] = ['gato']; p.casas[2] = ['tartaruga', 'porco', 'coelho'];
  Object.assign(p.pos, { pato: 8, gato: 7, tartaruga: 2, porco: 2, coelho: 2 });
  R.apostar(p, 0, 'pato');   // 5
  R.apostar(p, 1, 'pato');   // 3
  R.apostar(p, 1, 'gato');   // 5 → 2º: +1
  p.jogadores[2].moedas = 0;
  R.apostar(p, 2, 'porco');  // perde, mas fica em 0
  const r = R.pagarVolta(p);
  assert.strictEqual(r.primeiro, 'pato');
  assert.strictEqual(p.jogadores[0].moedas, 3 + 5);
  assert.strictEqual(p.jogadores[1].moedas, 3 + 3 + 1);
  assert.strictEqual(p.jogadores[2].moedas, 0);
  R.novaVolta(p);
  assert.strictEqual(p.copo.length, 5);
  assert.deepStrictEqual(p.bilhetes.pato, [5, 3, 2]);
});

test('bilhetes acabam depois de 3 apostas no mesmo bicho', () => {
  const p = R.criarPartida(GENTE, semente(9));
  assert.ok(R.apostar(p, 0, 'sapo') === null);
  [5, 3, 2].forEach(v => assert.strictEqual(R.apostar(p, 0, 'porco').valor, v));
  assert.strictEqual(R.apostar(p, 1, 'porco'), null);
});

test('chances somam 1 e o líder isolado tem mais chance', () => {
  const p = R.criarPartida(GENTE, semente(2));
  p.casas = p.casas.map(() => []);
  p.casas[9] = ['gato']; p.casas[0] = ['tartaruga', 'porco', 'pato', 'coelho'];
  Object.assign(p.pos, { gato: 9, tartaruga: 0, porco: 0, pato: 0, coelho: 0 });
  const ch = R.chances(p, semente(4), 400);
  const soma = R.IDS.reduce((s, id) => s + ch.primeiro[id], 0);
  assert.ok(Math.abs(soma - 1) < 1e-9);
  assert.ok(ch.primeiro.gato > 0.9);
});

test('300 corridas só com bots terminam, com vencedor e sem moeda negativa', () => {
  const rnd = semente(42);
  let voltasTotal = 0, jogadas = 0;
  for (let k = 0; k < 300; k++) {
    const n = 2 + (k % 7);
    const gente = Array.from({ length: n }, (_, i) => ({ id: i, nome: 'Bot' + i, humano: false }));
    const p = R.criarPartida(gente, rnd);
    let guarda = 0;
    while (!p.fim && guarda++ < 2000) {
      const j = R.daVez(p);
      const d = B.decidir(p, j.id, rnd, j.id);
      if (d.tipo === 'apostar') assert.ok(R.apostar(p, j.id, d.bicho));
      else if (d.tipo === 'banana') assert.ok(R.porBanana(p, j.id, d.bicho));
      else R.rolar(p, j.id, rnd);
      jogadas++;
      if (R.voltaAcabou(p)) { R.pagarVolta(p); if (!p.fim) R.novaVolta(p); }
      R.passarVez(p);
    }
    assert.ok(p.fim, 'corrida terminou');
    voltasTotal += p.volta;
    p.jogadores.forEach(j => assert.ok(j.moedas >= 0));
    assert.ok(R.vencedores(p).length >= 1);
    assert.ok(R.ordem(p).length === 5);
  }
  const media = voltasTotal / 300;
  assert.ok(media >= 3 && media <= 9, 'média de voltas razoável: ' + media);
  console.log('média de voltas por corrida:', media.toFixed(2), '· jogadas por corrida:', (jogadas / 300).toFixed(1));
});
