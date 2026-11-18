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

test('banana: escorrega 1 casa, vai para baixo da pilha, dono ganha 1 moeda', () => {
  const p = R.criarPartida(GENTE, semente(3));
  p.casas = p.casas.map(() => []);
  p.casas[0] = ['tartaruga']; p.casas[1] = ['porco']; p.casas[2] = ['pato']; p.casas[3] = ['coelho']; p.casas[4] = []; p.casas[10] = ['gato'];
  Object.assign(p.pos, { tartaruga: 0, porco: 1, pato: 2, coelho: 3, gato: 10 });
  assert.strictEqual(R.casaDaPeca(p, 2, 'coelho'), 5);
  R.porPeca(p, 2, 'coelho', 'banana');
  assert.deepStrictEqual(p.pecas[5], { dono: 2, tipo: 'banana' });
  // tartaruga vai para a casa 4 antes, para o coelho cair embaixo dela
  p.casas[0] = []; p.casas[4] = ['tartaruga']; p.pos.tartaruga = 4;
  p.copo = ['coelho'];
  const ev = R.rolar(p, 0, (() => { const v = [0, 0.5]; let i = 0; return () => v[i++]; })()); // coelho anda 2 → casa 5
  assert.ok(ev.some(e => e.tipo === 'peca' && e.qual === 'banana'));
  assert.strictEqual(p.pos.coelho, 4);
  assert.deepStrictEqual(p.casas[4], ['coelho', 'tartaruga']); // embaixo
  assert.strictEqual(p.jogadores[2].moedas, R.MOEDAS_INICIO + 1);
});

test('mola: pula 1 casa para a frente e cai em cima da pilha', () => {
  const p = R.criarPartida(GENTE, semente(3));
  p.casas = p.casas.map(() => []);
  p.casas[0] = ['tartaruga', 'porco']; p.casas[6] = ['pato']; p.casas[9] = ['coelho']; p.casas[10] = ['gato'];
  Object.assign(p.pos, { tartaruga: 0, porco: 0, pato: 6, coelho: 9, gato: 10 });
  R.porPeca(p, 1, 'tartaruga', 'mola'); // casa 2
  assert.strictEqual(p.pecas[2].tipo, 'mola');
  p.casas[3] = ['pato']; p.casas[6] = []; p.pos.pato = 3;
  p.copo = ['tartaruga'];
  const ev = R.rolar(p, 0, (() => { const v = [0, 0.5]; let i = 0; return () => v[i++]; })()); // tartaruga (+porco) anda 2 → mola → 3
  assert.ok(ev.some(e => e.tipo === 'mola'));
  assert.deepStrictEqual(p.casas[3], ['pato', 'tartaruga', 'porco']);
  assert.strictEqual(p.jogadores[1].moedas, R.MOEDAS_INICIO + 1);
});

test('peça não fica ao lado da peça de outro, nem em casa ocupada', () => {
  const p = R.criarPartida(GENTE, semente(3));
  p.casas = p.casas.map(() => []);
  p.casas[0] = ['tartaruga', 'porco', 'pato', 'coelho', 'gato'];
  R.IDS.forEach(id => { p.pos[id] = 0; });
  R.porPeca(p, 1, 'gato', 'banana'); // casa 2
  assert.strictEqual(p.pecas[2].dono, 1);
  assert.strictEqual(R.casaDaPeca(p, 2, 'gato'), null); // 2 ocupada, 1 e 3 vizinhas
  assert.strictEqual(R.casaDaPeca(p, 1, 'gato'), 2);    // a própria peça pode mudar de lugar
  R.porPeca(p, 1, 'gato', 'mola');
  assert.strictEqual(p.pecas[2].tipo, 'mola');
  assert.strictEqual(Object.keys(p.pecas).length, 1);
});

test('aposta de campeão: 1 por jogador, paga 8/5/3… na ordem e tira 1 de quem errou', () => {
  const p = R.criarPartida(GENTE, semente(5));
  assert.ok(R.apostarCampeao(p, 1, 'pato'));
  assert.strictEqual(R.apostarCampeao(p, 1, 'gato'), null); // só uma vez
  assert.ok(R.apostarCampeao(p, 0, 'pato'));
  assert.ok(R.apostarCampeao(p, 2, 'gato'));
  p.casas = p.casas.map(() => []);
  p.casas[16] = ['pato']; p.casas[3] = ['tartaruga', 'porco', 'coelho', 'gato'];
  Object.assign(p.pos, { pato: 16, tartaruga: 3, porco: 3, coelho: 3, gato: 3 });
  const r = R.pagarCampeao(p);
  assert.strictEqual(r.vencedor, 'pato');
  assert.strictEqual(p.jogadores[1].moedas, 3 + 8);
  assert.strictEqual(p.jogadores[0].moedas, 3 + 5);
  assert.strictEqual(p.jogadores[2].moedas, 3 - 1);
});

test('palpite: quem acertou o bicho do dado ganha 1 moeda', () => {
  const p = R.criarPartida(GENTE, semente(5));
  const certos = R.pagarPalpites(p, { 1: 'porco', 2: 'gato' }, 'porco');
  assert.deepStrictEqual(certos, [1]);
  assert.strictEqual(p.jogadores[1].moedas, 4);
  assert.strictEqual(p.jogadores[2].moedas, 3);
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
  let voltasTotal = 0, jogadas = 0, campeoes = 0;
  for (let k = 0; k < 300; k++) {
    const n = 2 + (k % 7);
    const gente = Array.from({ length: n }, (_, i) => ({ id: i, nome: 'Bot' + i, humano: false }));
    const p = R.criarPartida(gente, rnd);
    let guarda = 0;
    while (!p.fim && guarda++ < 2000) {
      const j = R.daVez(p);
      const d = B.decidir(p, j.id, rnd, j.id);
      if (d.tipo === 'apostar') assert.ok(R.apostar(p, j.id, d.bicho));
      else if (d.tipo === 'peca') assert.ok(R.porPeca(p, j.id, d.bicho, d.qual));
      else if (d.tipo === 'campeao') assert.ok(R.apostarCampeao(p, j.id, d.bicho));
      else R.rolar(p, j.id, rnd);
      jogadas++;
      if (R.voltaAcabou(p)) { R.pagarVolta(p); if (!p.fim) R.novaVolta(p); else R.pagarCampeao(p); }
      R.passarVez(p);
    }
    assert.ok(p.fim, 'corrida terminou');
    voltasTotal += p.volta; campeoes += p.campeoes.length / p.jogadores.length;
    p.jogadores.forEach(j => assert.ok(j.moedas >= 0));
    assert.ok(R.vencedores(p).length >= 1);
    assert.ok(R.ordem(p).length === 5);
  }
  const media = voltasTotal / 300;
  assert.ok(media >= 3 && media <= 9, 'média de voltas razoável: ' + media);
  console.log('média de voltas por corrida:', media.toFixed(2), '· jogadas por corrida:', (jogadas / 300).toFixed(1), '· bots que apostaram no campeão:', Math.round(100 * campeoes / 300) + '%');
});
