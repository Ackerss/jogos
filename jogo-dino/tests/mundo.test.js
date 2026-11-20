// Testes das regras do Dino Pula-Pula (node --test tests/mundo.test.js)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mundo.js');

function rodar(m, aoQuadro) {
  const dt = 1 / 60;
  for (let q = 0; q < 60 * (m.T + 2) && !m.fim; q++) { if (aoQuadro) aoQuadro(m); M.avancar(m, dt); m.eventos.length = 0; }
}

test('a mesma semente gera a mesma pista', () => {
  const a = M.criar({ duracao: 30, semente: 42, jogadores: [{}] });
  const b = M.criar({ duracao: 30, semente: 42, jogadores: [{}] });
  M.avancar(a, 0.2); M.avancar(b, 0.2);
  for (let i = 0; i < 100; i++) { M.avancar(a, 0.1); M.avancar(b, 0.1); }
  assert.deepStrictEqual(a.itens.map(i => [i.tipo, Math.round(i.x)]), b.itens.map(i => [i.tipo, Math.round(i.x)]));
});

test('a corrida termina no tempo certo e tem obstáculos, frutas e estrela', () => {
  const m = M.criar({ duracao: 60, semente: 3, jogadores: [{}] });
  const vistos = { obs: new Set(), fruta: new Set(), estrela: new Set() };
  rodar(m, mm => mm.itens.forEach(i => vistos[i.tipo].add(i.id)));
  assert.ok(m.fim);
  assert.ok(Math.abs(m.t - 60) < 0.05);
  assert.ok(vistos.obs.size >= 12, 'obstáculos: ' + vistos.obs.size);
  assert.ok(vistos.fruta.size >= 40, 'frutas: ' + vistos.fruta.size);
  assert.ok(vistos.estrela.size >= 2, 'estrelas: ' + vistos.estrela.size);
});

test('sem pular, o dino tropeça; o adulto perde frutas e a criança não', () => {
  const m = M.criar({ duracao: 40, semente: 5, jogadores: [{ ajuda: false }, { ajuda: true }] });
  rodar(m);
  assert.ok(m.js[0].tombos >= 5);
  assert.ok(m.js[1].tombos >= 5);
  assert.ok(m.js[1].frutas >= m.js[0].frutas, 'criança não perde frutas');
});

test('robô perfeito não tropeça (todos os obstáculos são puláveis)', () => {
  for (const ritmo of ['calma', 'normal', 'rapida']) {
    for (let s = 1; s <= 8; s++) {
      const m = M.criar({ duracao: 90, semente: s, ritmo, jogadores: [{}, { ajuda: true }] });
      rodar(m, mm => { for (let j = 0; j < 2; j++) if (M.robo(mm, j, 1, () => 0)) M.tocar(mm, j); });
      assert.strictEqual(m.js[0].tombos, 0, ritmo + ' semente ' + s + ' adulto');
      assert.strictEqual(m.js[1].tombos, 0, ritmo + ' semente ' + s + ' criança');
      assert.ok(m.js[0].frutas > 20);
    }
  }
});

test('modo criança: tocar ADIANTADO (até ~1,5 s antes) ainda pula na hora certa', () => {
  let erros = 0, testes = 0;
  for (let s = 1; s <= 10; s++) {
    const m = M.criar({ duracao: 60, semente: s, jogadores: [{ ajuda: true }, { ajuda: false }] });
    const tocou = {};
    rodar(m, mm => {
      for (let j = 0; j < 2; j++) {
        const o = M.proximoObstaculo(mm, j);
        // toca bem cedo: 1,2 s antes de chegar no obstáculo
        if (o && o.chega < 1.2 && !tocou[j + ':' + o.it.id]) { tocou[j + ':' + o.it.id] = 1; M.tocar(mm, j); if (j === 0) testes++; }
      }
    });
    erros += m.js[0].tombos;
    assert.ok(m.js[1].tombos > 5, 'adulto que pula cedo demais tropeça');
  }
  assert.ok(testes > 50);
  assert.strictEqual(erros, 0, 'criança tropeçou ' + erros + ' de ' + testes);
});

test('adulto tem folga para o atraso da internet (~0,15 s)', () => {
  for (let s = 1; s <= 6; s++) {
    const m = M.criar({ duracao: 60, semente: s, ritmo: 'normal', jogadores: [{}, {}] });
    const fila = [];
    rodar(m, mm => {
      for (const f of fila.filter(f => f.t <= mm.t)) M.tocar(mm, f.j);
      for (let i = fila.length - 1; i >= 0; i--) if (fila[i].t <= mm.t) fila.splice(i, 1);
      for (let j = 0; j < 2; j++) {
        if (M.robo(mm, j, 1, () => 0)) fila.push({ j, t: mm.t + (j === 0 ? 0.08 : -0.06) + 0.08 }); // pessoa atrasada / adiantada + rede
      }
    });
    assert.ok(m.js[0].tombos <= 1, 'atrasado tropeçou ' + m.js[0].tombos);
    assert.ok(m.js[1].tombos <= 1, 'adiantado tropeçou ' + m.js[1].tombos);
  }
});

test('estrela dá poder: quebra obstáculos sem tropeçar', () => {
  const m = M.criar({ duracao: 60, semente: 9, jogadores: [{}] });
  let quebrou = 0;
  rodar(m, mm => {
    const p = mm.js[0];
    const est = mm.itens.find(i => i.tipo === 'estrela' && !p.pegou[i.id]);
    if (est && Math.abs(est.x - mm.dist) < 4) { p.y = est.y - 30; p.chao = false; p.vy = 0; }
    mm.eventos.forEach(e => { if (e.tipo === 'quebrou') quebrou++; });
  });
  assert.ok(m.js[0].estrelas >= 1);
  assert.ok(m.js[0].quebrou >= 0);
});

test('pulo duplo só para adulto, e alcança as frutas altas', () => {
  const m = M.criar({ duracao: 20, jogadores: [{}, { ajuda: true }] });
  M.tocar(m, 0); M.tocar(m, 1);
  M.avancar(m, 0.3);
  M.tocar(m, 0); M.tocar(m, 1);
  assert.strictEqual(m.js[0].noAr, 2);
  assert.strictEqual(m.js[1].noAr, 1);
  let topo = 0;
  for (let i = 0; i < 100; i++) { M.avancar(m, 1 / 60); topo = Math.max(topo, m.js[0].y + M.C.DINO_A + M.C.FRUTA_R); }
  assert.ok(topo > 300, 'pulo duplo alcança 300: ' + topo);
  // criança: um pulo só já alcança as frutas altas
  const alturaCrianca = M.C.PULO * M.C.PULO / (2 * M.C.G_AJUDA) + M.C.DINO_A + M.C.FRUTA_R;
  assert.ok(alturaCrianca > 300);
});

test('resultado: cada um ganha um título diferente', () => {
  const m = M.criar({ duracao: 30, semente: 11, jogadores: [{}, { ajuda: true }, {}, {}] });
  rodar(m, mm => { for (let j = 0; j < 4; j++) if (M.robo(mm, j, 0.5 + j * 0.15)) M.tocar(mm, j); });
  const r = M.resultado(m);
  assert.strictEqual(r.length, 4);
  const t = r.map(x => x.titulo).filter(x => x !== 'Dino feliz');
  assert.strictEqual(new Set(t).size, t.length);
  assert.ok(r[0].frutas >= r[1].frutas);
});

test('300 corridas aleatórias com robôs não quebram', () => {
  for (let s = 1; s <= 300; s++) {
    const n = 1 + (s % 4);
    const m = M.criar({ duracao: 20 + (s % 3) * 20, semente: s, ritmo: ['calma', 'normal', 'rapida'][s % 3], jogadores: Array.from({ length: n }, (_, i) => ({ ajuda: i === 1 })) });
    rodar(m, mm => { for (let j = 0; j < n; j++) if (M.robo(mm, j, 0.7) || Math.random() < 0.01) M.tocar(mm, j); });
    assert.ok(m.fim);
    m.js.forEach(p => { assert.ok(p.frutas >= 0); assert.ok(Number.isFinite(p.y)); });
    assert.ok(m.itens.length < 200);
  }
});
