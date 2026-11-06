// Testes da física e das regras da Arena Escorregadia (node --test).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const F = require('../js/fisica.js');
const B = require('../js/bots.js');
const C = F.C;

function rodada(n, semente, opcoes) {
  const js = Array.from({ length: n }, (_, i) => ({ id: 'j' + i, cor: i }));
  return { js, m: F.novaRodada(js, Object.assign({ aleatorio: F.sorteio(semente) }, opcoes || {})) };
}
function andar(m, s, entradas) { for (let i = 0; i < Math.round(s * 60); i++) F.passo(m, 1 / 60, typeof entradas === 'function' ? entradas(m) : entradas); }

test('todos começam dentro do gelo, separados e olhando para o meio', () => {
  const { m } = rodada(8, 1);
  for (const b of m.bolas) {
    assert.ok(Math.hypot(b.x, b.y) < C.RAIO_INICIAL - 2);
    assert.ok(b.olhoX * b.x + b.olhoY * b.y < 0);
  }
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    const a = m.bolas[i], b = m.bolas[j];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 2 * C.RAIO_BOLA);
  }
});

test('o joystick acelera até a velocidade máxima e o gelo escorrega (atrito baixo)', () => {
  const { m } = rodada(2, 2);
  const b = m.bolas[0]; b.x = -7; b.y = 0; m.bolas[1].x = 0; m.bolas[1].y = 6;
  andar(m, 1, { j0: { x: 1, y: 0 } });
  const v = Math.hypot(b.vx, b.vy);
  assert.ok(v <= C.VMAX + 1e-6 && v > C.VMAX * 0.9, 'velocidade ' + v);
  b.x = 0; b.vx = 3; b.vy = 0;
  andar(m, 1, {});
  assert.ok(b.vx > 1.2, 'continua deslizando: ' + b.vx);
});

test('tranco dá velocidade e só recarrega depois do tempo', () => {
  const { m } = rodada(2, 3);
  const b = m.bolas[0]; b.x = 0; b.y = 0; b.vx = b.vy = 0; m.bolas[1].x = 0; m.bolas[1].y = 7;
  F.passo(m, 1 / 60, { j0: { x: 1, y: 0, tranco: true } });
  assert.ok(b.vx > C.TRANCO_VEL * 0.9);
  assert.ok(F.tirarEventos(m).some(e => e.tipo === 'tranco'));
  b.vx = 0;
  F.passo(m, 1 / 60, { j0: { x: 1, y: 0, tranco: true } });
  assert.ok(b.vx < 1, 'sem tranco na recarga');
  andar(m, C.TRANCO_RECARGA, {});
  b.vx = 0; b.x = 0;
  F.passo(m, 1 / 60, { j0: { x: -1, y: 0, tranco: true } });
  assert.ok(b.vx < -C.TRANCO_VEL * 0.9, 'recarregou');
});

test('batida conserva o movimento (massas iguais) e não deixa bolinhas sobrepostas', () => {
  const { m } = rodada(2, 4);
  const [a, b] = m.bolas;
  a.x = -2; a.y = 0; a.vx = 5; a.vy = 0; b.x = 0; b.y = 0; b.vx = 0; b.vy = 0;
  const antes = a.vx + b.vx;
  let bateu = false;
  for (let i = 0; i < 30; i++) { F.passo(m, 1 / 60, {}); if (F.tirarEventos(m).some(e => e.tipo === 'batida')) bateu = true; }
  assert.ok(bateu);
  assert.ok(b.vx > a.vx, 'quem foi atingido sai mais rápido');
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 2 * C.RAIO_BOLA - 1e-6);
  assert.ok(a.vx + b.vx > 0 && a.vx + b.vx <= antes * 1.6, 'empurrão extra limitado');
});

test('tranco pesa mais: quem dá o tranco empurra mais do que é empurrado', () => {
  const { m } = rodada(2, 5);
  const [a, b] = m.bolas;
  a.x = -1.9; a.y = 0; a.vx = 0; a.vy = 0; b.x = 0; b.y = 0; b.vx = -3; b.vy = 0;
  F.passo(m, 1 / 60, { j0: { x: 1, y: 0, tranco: true } });
  for (let i = 0; i < 20; i++) F.passo(m, 1 / 60, {});
  assert.ok(b.vx > 4, 'o outro voa: ' + b.vx);
  assert.ok(a.vx > 0, 'quem deu o tranco segue em frente: ' + a.vx);
});

test('quem sai do gelo cai, vira fantasma e quem empurrou ganha 1 ponto', () => {
  const { m } = rodada(3, 6);
  const [a, b] = m.bolas;
  a.x = 7.4; a.y = 0; a.vx = 6; b.x = 9.3; b.y = 0; b.vx = 0;
  m.bolas[2].x = -5; m.bolas[2].y = 0;
  andar(m, 1.5, {});
  assert.notStrictEqual(b.estado, 'gelo');
  assert.strictEqual(m.pontos.j0, C.PONTOS_DERRUBADA);
  assert.strictEqual(m.derrubadas.j0, 1);
  andar(m, 1, {});
  assert.strictEqual(b.estado, 'fantasma');
});

test('escorregar sozinho não dá ponto para ninguém', () => {
  const { m } = rodada(3, 7);
  const b = m.bolas[0]; b.x = 9; b.y = 0; b.vx = 5;
  andar(m, 1, {});
  assert.strictEqual(b.estado === 'gelo', false);
  assert.deepStrictEqual(m.pontos, {});
});

test('a borda quebra a cada 15 s e depois vem a morte súbita', () => {
  const { m } = rodada(2, 8);
  // os dois ficam parados perto do meio
  m.bolas[0].x = -1; m.bolas[0].y = 0; m.bolas[1].x = 1.2; m.bolas[1].y = 0;
  andar(m, 14.5, {});
  assert.strictEqual(m.raio, C.RAIO_INICIAL);
  assert.ok(F.proximaQuebra(m) > 0 && F.proximaQuebra(m) <= 0.6);
  andar(m, 2, {});
  assert.ok(Math.abs(m.raio - C.ETAPAS[1]) < 1e-6, 'raio ' + m.raio);
  andar(m, 15, {});
  assert.ok(Math.abs(m.raio - C.ETAPAS[2]) < 1e-6);
  andar(m, 14, {});
  assert.ok(m.subita);
  assert.ok(m.raio < C.ETAPAS[2]);
  andar(m, 30, {});
  assert.ok(m.raio >= C.RAIO_MINIMO - 1e-9);
});

test('quem estiver na faixa que quebra cai na água', () => {
  const { m } = rodada(3, 9);
  m.bolas[0].x = 9; m.bolas[0].y = 0;
  m.bolas[1].x = 0; m.bolas[1].y = 0; m.bolas[2].x = -3; m.bolas[2].y = 0;
  andar(m, 16, {});
  assert.notStrictEqual(m.bolas[0].estado, 'gelo');
  assert.strictEqual(m.bolas[1].estado, 'gelo');
});

test('a rodada acaba quando sobra um, e ele leva os pontos de vencedor', () => {
  const { m } = rodada(2, 10);
  m.bolas[0].x = 0; m.bolas[0].y = 0; m.bolas[1].x = 9.5; m.bolas[1].y = 0; m.bolas[1].vx = 4;
  andar(m, 1, {});
  assert.ok(m.fim);
  assert.deepStrictEqual(m.vencedores, ['j0']);
  assert.strictEqual(m.pontos.j0, C.PONTOS_VENCEDOR);
});

test('se os últimos caem juntos, a vitória é dividida', () => {
  const { m } = rodada(2, 11);
  m.bolas[0].x = 9.5; m.bolas[0].y = 0; m.bolas[0].vx = 4;
  m.bolas[1].x = -9.5; m.bolas[1].y = 0; m.bolas[1].vx = -4;
  andar(m, 1, {});
  assert.ok(m.fim);
  assert.deepStrictEqual(m.vencedores.sort(), ['j0', 'j1']);
});

test('o sopro do fantasma empurra quem está perto e dá o crédito da derrubada', () => {
  const { m } = rodada(3, 12);
  const [g, alvo, outro] = m.bolas;
  g.estado = 'fantasma'; g.recarga = 0; g.x = 7; g.y = 0;
  alvo.x = 8.6; alvo.y = 0; alvo.vx = 0; outro.x = -4; outro.y = 0;
  F.passo(m, 1 / 60, { j0: { x: 0, y: 0, tranco: true } });
  assert.ok(alvo.vx > 3, 'empurrado: ' + alvo.vx);
  assert.ok(Math.abs(outro.vx) < 0.01, 'longe não sente');
  andar(m, 1, {});
  assert.notStrictEqual(alvo.estado, 'gelo');
  assert.strictEqual(m.pontos.j0, C.PONTOS_DERRUBADA);
});

test('treino (sala de espera): quem cai volta para o gelo e não há quebra nem fim', () => {
  const { m } = rodada(2, 13, { treino: true });
  m.bolas[0].x = 9.8; m.bolas[0].vx = 5;
  andar(m, 4, {});
  assert.strictEqual(m.bolas[0].estado, 'gelo');
  andar(m, 40, {});
  assert.strictEqual(m.raio, C.RAIO_INICIAL);
  assert.ok(!m.fim);
});

test('classificação: pontos, depois rodadas vencidas, depois derrubadas', () => {
  const cl = F.classificar([
    { id: 'a', pontos: 5, vitorias: 1, derrubadas: 2, ordem: 0 },
    { id: 'b', pontos: 7, vitorias: 0, derrubadas: 7, ordem: 1 },
    { id: 'c', pontos: 5, vitorias: 1, derrubadas: 3, ordem: 2 },
    { id: 'd', pontos: 5, vitorias: 2, derrubadas: 0, ordem: 3 }
  ]);
  assert.deepStrictEqual(cl.map(j => j.id), ['b', 'd', 'c', 'a']);
});

test('300 rodadas só com bots: sempre terminam, dentro do limite, com vencedor', () => {
  let soma = 0;
  for (let s = 1; s <= 300; s++) {
    const n = 2 + (s % 7);
    const { js, m } = rodada(n, s);
    const mem = {}; js.forEach(j => { mem[j.id] = {}; });
    let passos = 0;
    while (!m.fim) {
      const e = {}; js.forEach((j, i) => { e[j.id] = B.pensar(m, j.id, mem[j.id], 0.6 + 0.4 * (i % 3) / 2); });
      F.passo(m, 1 / 60, e); F.tirarEventos(m);
      assert.ok(++passos < 60 * (C.LIMITE_RODADA + 1), 'rodada infinita');
    }
    assert.ok(m.vencedores.length >= 1, 'sem vencedor na rodada ' + s);
    for (const b of m.bolas) assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
    soma += m.t;
  }
  const media = soma / 300;
  assert.ok(media > 8 && media < 60, 'duração média ' + media.toFixed(1) + ' s');
});
