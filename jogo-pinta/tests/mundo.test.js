// Testes das regras do Pinta-Chão dos Bichos (node --test tests/mundo.test.js)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mundo.js');

function rodar(m, aoQuadro) {
  const dt = 1 / 60;
  for (let q = 0; q < 60 * (m.T + 2) && !m.fim; q++) { if (aoQuadro) aoQuadro(m, q); M.avancar(m, dt); m.eventos.length = 0; }
}
// confere se o placar bate com o chão pintado
function conferir(m) {
  const conta = new Array(m.slots).fill(0);
  m.dono.forEach(d => { if (d >= 0) conta[d]++; });
  assert.deepStrictEqual(conta, m.placar);
  M.MAPAS[m.mapa].forEach(c => assert.strictEqual(m.dono[c[1] * M.COLS + c[0]], M.BLOQ, 'obstáculo nunca é pintado'));
}

test('a mesma semente gera os mesmos itens', () => {
  const a = M.criar({ duracao: 30, semente: 42, jogadores: [{ bot: true }, { bot: true }] });
  const b = M.criar({ duracao: 30, semente: 42, jogadores: [{ bot: true }, { bot: true }] });
  const ia = [], ib = [];
  rodar(a, m => m.itens.forEach(i => ia[i.id] = i.tipo + i.x + ',' + i.y));
  rodar(b, m => m.itens.forEach(i => ib[i.id] = i.tipo + i.x + ',' + i.y));
  assert.ok(ia.length > 5);
  assert.deepStrictEqual(ia, ib);
});

test('o bichinho anda reto, para na parede (adulto) e vira sozinho (criança)', () => {
  const m = M.criar({ duracao: 30, mapa: 0, jogadores: [{}, { ajuda: true }] });
  // os dois andam para a direita na linha de cima, sem obstáculo na frente
  m.js[0].x = 15.5; m.js[0].y = 0.5; m.js[0].dir = 'd';
  m.js[1].x = 15.5; m.js[1].y = 1.5; m.js[1].dir = 'd';
  M.avancar(m, 4);
  assert.strictEqual(m.js[0].x, 23.5); assert.strictEqual(m.js[0].dir, null, 'adulto para na parede');
  assert.ok(m.js[1].dir === 'c' || m.js[1].dir === 'b', 'criança virou: ' + m.js[1].dir);
  assert.strictEqual(m.js[1].x, 23.5);
});

test('a curva acontece no meio do quadradinho, mesmo apertando um pouco antes', () => {
  const m = M.criar({ duracao: 30, mapa: 0, jogadores: [{}] });
  const p = m.js[0]; p.x = 8.2; p.y = 1.5; p.dir = 'd';
  M.setinha(m, 0, 'b');                        // apertou para baixo antes do meio
  M.avancar(m, 0.05);
  assert.strictEqual(p.dir, 'd', 'ainda não chegou no meio');
  M.avancar(m, 0.3);
  assert.strictEqual(p.dir, 'b');
  assert.strictEqual(p.x, 8.5, 'ficou certinho na coluna');
  assert.ok(p.y > 1.5);
});

test('seta para trás vira na hora; parado, seta para a parede não faz nada', () => {
  const m = M.criar({ duracao: 30, mapa: 0, jogadores: [{}] });
  const p = m.js[0]; p.x = 8.3; p.y = 1.5; p.dir = 'd';
  M.setinha(m, 0, 'e'); M.avancar(m, 0.1);
  assert.strictEqual(p.dir, 'e'); assert.ok(p.x < 8.3);
  p.x = 0.5; p.y = 0.5; p.dir = null;
  M.setinha(m, 0, 'c'); M.avancar(m, 0.3);
  assert.strictEqual(p.dir, null); assert.strictEqual(p.y, 0.5);
});

test('pintar: o placar sempre bate com o chão, e obstáculo nunca é pintado', () => {
  for (const modo of ['cada', 'equipes', 'juntos']) {
    for (let s = 1; s <= 12; s++) {
      const m = M.criar({ duracao: 40, modo, semente: s, mapa: s, jogadores: [{ bot: true, ajuda: true }, { bot: true, equipe: 1 }, { bot: true, forca: 0.3 }] });
      rodar(m, (mm, q) => { if (q % 97 === 0) conferir(mm); });
      conferir(m);
      assert.ok(m.fim);
    }
  }
});

test('modo criança pinta mais largo pelo mesmo caminho', () => {
  const m = M.criar({ duracao: 30, mapa: 0, jogadores: [{}, { ajuda: true }] });
  m.js[0].x = 0.5; m.js[0].y = 1.5; m.js[0].dir = 'd';
  m.js[1].x = 0.5; m.js[1].y = 10.5; m.js[1].dir = 'd';
  m.placar = [0, 0]; m.dono = m.dono.map(d => d === M.BLOQ ? d : M.LIVRE);
  m.proxItem = 99;
  M.avancar(m, 3);
  assert.ok(m.placar[1] >= m.placar[0] * 2.5, 'criança ' + m.placar[1] + ' x adulto ' + m.placar[0]);
});

test('balde de tinta pinta uma área grande de uma vez', () => {
  const m = M.criar({ duracao: 30, mapa: 0, jogadores: [{}] });
  const p = m.js[0]; p.x = 12.5; p.y = 9.5; p.dir = null;
  m.itens.push({ id: 99, tipo: 'balde', x: 12.5, y: 9.5, vida: 10 });
  const antes = m.placar[0];
  M.avancar(m, 1 / 60);
  assert.ok(m.placar[0] - antes >= 18, 'pintou ' + (m.placar[0] - antes));
  assert.strictEqual(p.conta.itens, 1);
});

test('pincel e raio duram alguns segundos', () => {
  const m = M.criar({ duracao: 30, mapa: 0, jogadores: [{}] });
  const p = m.js[0]; p.x = 12.5; p.y = 9.5; p.dir = null; m.proxItem = 99;
  m.itens.push({ id: 98, tipo: 'raio', x: 12.5, y: 9.5, vida: 10 }, { id: 99, tipo: 'pincel', x: 12.5, y: 9.5, vida: 10 });
  M.avancar(m, 0.1);
  assert.ok(p.raio > 4 && p.pincel > 5);
  M.avancar(m, 6.5);
  assert.strictEqual(p.raio, 0); assert.strictEqual(p.pincel, 0);
});

test('Todos juntos: porquinhos sujam de lama e somem quando alguém encosta', () => {
  const m = M.criar({ duracao: 60, modo: 'juntos', mapa: 0, semente: 3, jogadores: [{ bot: true }, { bot: true }, { bot: true }] });
  assert.strictEqual(m.porcos.length, 3);
  let lama = 0, lavou = 0;
  for (let q = 0; q < 60 * 60 && !m.fim; q++) {
    M.avancar(m, 1 / 60);
    m.eventos.forEach(e => { if (e.tipo === 'tinta' && e.slot === M.LAMA) lama++; if (e.tipo === 'lavou') lavou++; });
    m.eventos.length = 0;
  }
  assert.ok(lama > 0, 'fez lama'); assert.ok(lavou > 0, 'lavou porquinho');
  const r = M.resultado(m);
  assert.ok(r.estrelas >= 0 && r.estrelas <= 3);
  assert.strictEqual(r.metas.length, 3);
});

test('robôs: 300 partidas terminam no tempo certo e todo mundo ganha um título', () => {
  const modos = ['cada', 'equipes', 'juntos'];
  for (let s = 1; s <= 300; s++) {
    const n = 1 + s % 4, js = [];
    for (let i = 0; i < n; i++) js.push({ bot: true, forca: (s * 7 + i * 13) % 10 / 10, ajuda: i === 0 && s % 2 === 0, equipe: i % 2 });
    const m = M.criar({ duracao: 20, modo: modos[s % 3], semente: s, ritmo: ['calma', 'normal', 'rapida'][s % 3], jogadores: js });
    rodar(m);
    assert.ok(m.fim && Math.abs(m.t - 20) < 1e-6);
    const r = M.resultado(m);
    assert.strictEqual(r.jogadores.length, n);
    r.jogadores.forEach(x => assert.ok(x.titulo && x.icone, 'título'));
    assert.ok(r.pct >= 0 && r.pct <= 100);
    if (r.modo === 'equipes') assert.ok([-1, 0, 1].includes(r.vencedora));
    m.js.forEach(p => assert.ok(p.x > 0 && p.x < M.COLS && p.y > 0 && p.y < M.ROWS, 'dentro do chão'));
  }
});

test('criança tocando ao acaso ainda tem chance contra um adulto bom', () => {
  let vitorias = 0;
  for (let s = 1; s <= 40; s++) {
    const m = M.criar({ duracao: 60, semente: s, jogadores: [{ ajuda: true }, { bot: true, forca: 0.7 }] });
    let prox = 0, k = s;
    rodar(m, mm => { if (mm.t > prox) { k = (k * 1103515245 + 12345) >>> 0; prox = mm.t + 0.8 + ((k >>> 8) % 100) / 70; M.setinha(mm, 0, 'cbed'[(k >>> 16) % 4]); } });
    if (m.placar[0] > m.placar[1]) vitorias++;
  }
  assert.ok(vitorias >= 12 && vitorias <= 36, 'vitórias da criança: ' + vitorias + '/40');
});
