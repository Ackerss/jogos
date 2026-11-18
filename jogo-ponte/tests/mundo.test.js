'use strict';
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mundo.js');
const B = require('../js/bots.js');

function correr(js, o, entradasExtras) {
  const m = M.novaRodada(js, o), mem = {};
  let n = 0;
  while (!m.fim && n++ < 60 * 200) {
    const e = {};
    m.corredores.forEach(r => {
      if (r.bot) { mem[r.id] = mem[r.id] || {}; e[r.id] = B.pensar(m, r.id, mem[r.id], 0.6); }
      else e[r.id] = r.facil ? B.ajuda(m, r, {}) : (entradasExtras ? entradasExtras(m, r) : {});
    });
    M.passo(m, 1 / 60, e);
    M.tirarEventos(m);
  }
  return m;
}

test('pista justa: nunca as 3 pistas bloqueadas no mesmo trecho', () => {
  for (let s = 1; s < 200; s++) for (const mu of M.MUNDOS) {
    const p = M.montarPista(mu, s);
    p.obst.forEach(o => {
      const junto = new Set(p.obst.filter(q => Math.abs(q.x - o.x) < 60).map(q => q.pista));
      assert.ok(junto.size < 3, 'trecho bloqueado em ' + o.x);
    });
    assert.ok(p.obst.every(o => o.x >= 400), 'começo calmo');
  }
});

test('300 corridas só com bots: sempre terminam, todo mundo recebe pontos', () => {
  for (let s = 1; s <= 300; s++) {
    const js = [0, 1, 2, 3, 4].map(i => ({ id: 'b' + i, cor: i, bot: true }));
    const m = correr(js, { mundo: s % 3, semente: s * 31 });
    assert.ok(m.fim);
    assert.ok(m.t <= M.C.TEMPO_MAX + 0.1);
    assert.strictEqual(m.chegada.length, 5);
    const lugares = Object.values(m.pontos).map(p => p.lugar).sort();
    assert.deepStrictEqual(lugares, [1, 2, 3, 4, 5]);
    Object.values(m.pontos).forEach(p => assert.ok(p.total >= 0));
  }
});

test('modo fácil: criança que não aperta nada quase não cai', () => {
  let quedas = 0;
  for (let s = 1; s <= 40; s++) {
    const m = correr([{ id: 'h', cor: 0, facil: true }, { id: 'b', cor: 1, bot: true }], { mundo: s % 3, semente: s * 7 });
    quedas += M.corredor(m, 'h').quedas;
  }
  assert.ok(quedas / 40 < 1.5, 'média de quedas no fácil: ' + quedas / 40);
});

test('quem fica para trás corre mais (ninguém some da tela)', () => {
  const m = M.novaRodada([{ id: 'a', cor: 0 }, { id: 'b', cor: 1 }], { mundo: 0, semente: 3 });
  M.corredor(m, 'b').x = 0; M.corredor(m, 'a').x = 900;
  M.passo(m, 1 / 60, {});
  for (let i = 0; i < 120; i++) M.passo(m, 1 / 60, {});
  const a = M.corredor(m, 'a'), b = M.corredor(m, 'b');
  assert.ok(b.x >= m.camera + 29, 'o de trás é puxado pela borda da tela');
});

test('empurrão tira da pista e escudo bloqueia', () => {
  const m = M.novaRodada([{ id: 'a', cor: 0 }, { id: 'b', cor: 1 }], { mundo: 0, semente: 3 });
  m.obst = []; m.t = 5;
  const a = M.corredor(m, 'a'), b = M.corredor(m, 'b');
  a.x = 500; b.x = 560; a.pista = 1; b.pista = 1; a.cd = 0; b.prot = 0;
  M.passo(m, 1 / 60, { a: { poder: 1 } });
  assert.notStrictEqual(b.pista, 1);
  assert.strictEqual(a.empurroes, 1);
  a.cd = 0; b.escudo = 3; b.prot = 0; b.pista = a.pista; b.x = a.x + 40;
  M.passo(m, 1 / 60, { a: { poder: 1 } });
  assert.strictEqual(b.escudo, 0);
  assert.strictEqual(a.empurroes, 1);
});

test('caixa dá poder melhor para quem está em último', () => {
  const m = M.novaRodada([0, 1, 2, 3].map(i => ({ id: 'j' + i, cor: i })), { mundo: 0, semente: 9 });
  m.corredores.forEach((r, i) => r.x = 1000 + i * 100);
  const cont = {};
  const ultimo = M.corredor(m, 'j0');
  for (let i = 0; i < 300; i++) { ultimo.poder = null; m.caixas = [{ x: ultimo.x + 5, pista: ultimo.pista, pego: {} }]; m.obst = []; M.passo(m, 1 / 60, {}); cont[ultimo.poder] = (cont[ultimo.poder] || 0) + 1; }
  assert.ok(!cont.escudo, 'último não ganha escudo');
  assert.ok(cont.raio > 0 && cont.turbo > 0);
});

test('pontos: chegada + cristais; quem não chega não ganha pontos de chegada', () => {
  const m = M.novaRodada([{ id: 'a', cor: 0 }, { id: 'b', cor: 1 }], { mundo: 0, semente: 1 });
  M.corredor(m, 'a').cristais = 4;
  M.corredor(m, 'a').x = m.L + 1; M.passo(m, 1 / 60, {});
  M.terminar(m);
  assert.strictEqual(m.pontos.a.total, M.C.PONTOS_CHEGADA[0] + 4);
  assert.strictEqual(m.pontos.b.chegada, 0);
  assert.strictEqual(m.pontos.b.lugar, 2);
});
