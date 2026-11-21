// Testes das regras do multiplayer (sem 3D): node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { montarGrid, classificar, criarRelogio, preverEstado, criarRegistroEventos, criarFiltroEventos, corridaAcabou, CORES } from '../src/net/multi.js';

test('grid: cores únicas, robôs completam 4, criança na frente e adulto atrás', () => {
  const g = montarGrid([
    { pid: 'a', nome: 'Papai', cor: 1 },
    { pid: 'b', nome: 'Lavigne', cor: 1, crianca: true }
  ], 4, true);
  assert.equal(g.length, 4);
  const cores = g.map((k) => k.cor);
  assert.equal(new Set(cores).size, 4);
  assert.equal(g[0].nome, 'Lavigne');
  assert.equal(g[3].nome, 'Papai');
  assert.equal(g.filter((k) => !k.humano).length, 2);
  assert.deepEqual(g.map((k) => k.slot), [0, 1, 2, 3]);
  const robo = g.find((k) => !k.humano);
  assert.equal(robo.nome, CORES[robo.cor].robo);
});

test('grid: sem robôs só humanos; ninguém = 4 robôs (demonstração)', () => {
  assert.equal(montarGrid([{ pid: 'a', nome: 'A' }], 4, false).length, 1);
  const demo = montarGrid([], 4, true);
  assert.equal(demo.length, 4);
  assert.ok(demo.every((k) => !k.humano));
  assert.equal(montarGrid([1, 2, 3, 4, 5].map((i) => ({ pid: 'p' + i, nome: 'J' + i })), 4, true).length, 4);
});

test('classificação: chegou antes ganha; depois quem andou mais', () => {
  const r = classificar([
    { id: 'a', f: 0, p: 2.5 },
    { id: 'b', f: 1, ft: 80 },
    { id: 'c', f: 1, ft: 75 },
    { id: 'd', f: 0, p: 2.9 }
  ]).map((x) => x.id);
  assert.deepEqual(r, ['c', 'b', 'd', 'a']);
});

test('relógio: usa a menor diferença recebida (menos atraso)', () => {
  const r = criarRelogio();
  assert.equal(r.agoraTv(1000), 1000);
  r.amostra(500);
  r.amostra(320);
  r.amostra(410);
  assert.equal(r.desvio, 320);
  assert.equal(r.agoraTv(10000), 9680);
});

test('previsão: anda na direção do kart e para de prever depois de 0,35 s', () => {
  const st = { x: 0, y: 0, z: 0, h: 0, v: 20, g: 1, sp: 0, b: 1 };
  const p = preverEstado(st, 0.1);
  assert.ok(Math.abs(p.z - 2) < 1e-9 && Math.abs(p.x) < 1e-9);
  assert.ok(Math.abs(p.b - 0.9) < 1e-9);
  assert.ok(Math.abs(preverEstado(st, 5).z - 7) < 1e-9);
});

test('eventos: reenvia os últimos e o filtro não repete', () => {
  const reg = criarRegistroEventos('tv', 3);
  for (let i = 0; i < 5; i++) reg.novo({ k: 'b', id: 'x' + i });
  assert.equal(reg.lista.length, 3);
  const filtro = criarFiltroEventos();
  assert.equal(filtro(reg.lista).length, 3);
  reg.novo({ k: 'h', id: 'x9' });
  const novos = filtro(reg.lista);
  assert.equal(novos.length, 1);
  assert.equal(novos[0].id, 'x9');
});

test('fim da corrida: todos chegaram, ou 30 s depois do primeiro, ou ninguém conectado', () => {
  assert.equal(corridaAcabou({ humanos: [{ f: true }, { f: false }], tempo: 50, primeiroHumanoChegouEm: 40 }), false);
  assert.equal(corridaAcabou({ humanos: [{ f: true }, { f: false }], tempo: 71, primeiroHumanoChegouEm: 40 }), true);
  assert.equal(corridaAcabou({ humanos: [{ f: true }, { f: true }], tempo: 50, primeiroHumanoChegouEm: 40 }), true);
  assert.equal(corridaAcabou({ humanos: [{ f: false, sumiu: true }], tempo: 10, primeiroHumanoChegouEm: null }), true);
  assert.equal(corridaAcabou({ humanos: [{ f: false }, { f: false, sumiu: true }], tempo: 30, primeiroHumanoChegouEm: null }), false);
});
