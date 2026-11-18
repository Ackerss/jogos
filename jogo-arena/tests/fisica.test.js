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

test('300 rodadas só com bots (nas 4 arenas, com itens e modo criança): sempre terminam, com vencedor', () => {
  let soma = 0;
  for (let s = 1; s <= 300; s++) {
    const n = 2 + (s % 7);
    const js = Array.from({ length: n }, (_, i) => ({ id: 'j' + i, cor: i, facil: (s + i) % 5 === 0 }));
    const m = F.novaRodada(js, { aleatorio: F.sorteio(s), arena: F.ARENAS[s % 4] });
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

test('itens aparecem no gelo, quem passa por cima pega, e o efeito acaba depois de um tempo', () => {
  const { m } = rodada(2, 21);
  m.bolas[0].x = -6; m.bolas[0].y = 0; m.bolas[1].x = 6; m.bolas[1].y = 0;
  andar(m, C.ITEM_PRIMEIRO + 2.1, {});
  assert.strictEqual(m.itens.length, 1, 'um item no gelo');
  const it = m.itens[0], b = m.bolas[0];
  b.x = it.x; b.y = it.y; b.vx = b.vy = 0;
  F.passo(m, 1 / 60, {});
  assert.strictEqual(b.item, it.tipo);
  assert.strictEqual(m.itens.length, 0);
  andar(m, C.ITEM_DURACAO + 0.2, {});
  assert.strictEqual(b.item, null);
});

test('gigante: fica maior e mais pesado (empurra mais do que é empurrado)', () => {
  const { m } = rodada(2, 22, { itens: false });
  const [a, b] = m.bolas;
  a.item = 'gigante'; a.itemAte = 99;
  andar(m, 1, {});
  assert.ok(F.raioBola(a) > C.RAIO_BOLA * 1.4);
  a.x = -3; a.y = 0; a.vx = 4; a.vy = 0; b.x = 0; b.y = 0; b.vx = -4; b.vy = 0;
  andar(m, 0.5, {});
  assert.ok(b.vx > 2 && a.vx > -1, 'gigante ganha a batida: a=' + a.vx.toFixed(2) + ' b=' + b.vx.toFixed(2));
});

test('turbo: o tranco recarrega muito mais rápido', () => {
  const { m } = rodada(2, 23, { itens: false });
  const b = m.bolas[0]; b.x = 0; b.y = 0; m.bolas[1].x = 0; m.bolas[1].y = 7;
  b.item = 'turbo'; b.itemAte = 99;
  F.passo(m, 1 / 60, { j0: { x: 1, y: 0, tranco: true } });
  assert.ok(b.recarga <= C.TURBO_RECARGA + 1e-9);
});

test('mola: quem encosta em quem tem a mola é arremessado', () => {
  const sem = rodada(2, 24, { itens: false }).m, com = rodada(2, 24, { itens: false }).m;
  for (const m of [sem, com]) { const [a, b] = m.bolas; a.x = -2; a.y = 0; a.vx = 0; a.vy = 0; b.x = 0; b.y = 0; b.vx = -3; b.vy = 0; }
  com.bolas[0].item = 'mola'; com.bolas[0].itemAte = 99;
  andar(sem, 0.4, {}); andar(com, 0.4, {});
  assert.ok(com.bolas[1].vx > sem.bolas[1].vx + 2, 'com mola: ' + com.bolas[1].vx.toFixed(2) + ' sem: ' + sem.bolas[1].vx.toFixed(2));
});

test('modo criança: a boia salva da queda 2 vezes e depois cai normalmente', () => {
  const js = [{ id: 'k', cor: 0, facil: true }, { id: 'a', cor: 1 }, { id: 'b', cor: 2 }];
  const m = F.novaRodada(js, { aleatorio: F.sorteio(25), itens: false });
  const k = m.bolas[0]; m.bolas[1].x = -3; m.bolas[1].y = 0; m.bolas[2].x = -3; m.bolas[2].y = 3;
  for (let vez = 0; vez < 2; vez++) {
    k.x = 9.9; k.y = 0; k.vx = 6; k.vy = 0;
    andar(m, 0.6, {});
    assert.strictEqual(k.estado, 'gelo', 'boia ' + (vez + 1) + ' salvou');
    assert.ok(k.vx < 0, 'voltou para dentro');
  }
  assert.strictEqual(k.boias, 0);
  k.x = 9.9; k.y = 0; k.vx = 6; k.vy = 0;
  andar(m, 0.6, {});
  assert.notStrictEqual(k.estado, 'gelo');
});

test('arena Gelo Fino: buraco avisa antes, depois abre, e quem pisa cai', () => {
  const { m } = rodada(3, 26, { arena: 'buracos', itens: false });
  m.bolas.forEach((b, i) => { b.x = -8 + i * 0.1; b.y = (i - 1) * 2.2; });
  andar(m, C.BURACO_PRIMEIRO + 0.1, {});
  assert.strictEqual(m.buracos.length, 1);
  const h = m.buracos[0];
  assert.ok(!h.aberto, 'primeiro só a rachadura');
  andar(m, C.BURACO_AVISO, {});
  assert.ok(h.aberto);
  const b = m.bolas[0]; b.x = h.x; b.y = h.y; b.vx = b.vy = 0;
  F.passo(m, 1 / 60, {});
  assert.strictEqual(b.estado, 'caindo');
  assert.ok(b.noBuraco);
});

test('arena Ventania: avisa e depois o vento empurra todo mundo para o mesmo lado', () => {
  const { m } = rodada(2, 27, { arena: 'ventania', itens: false });
  m.bolas[0].x = -1; m.bolas[0].y = 0; m.bolas[1].x = 1; m.bolas[1].y = 0;
  let aviso = false, sopra = false;
  for (let i = 0; i < 60 * (C.VENTO_PRIMEIRO + C.VENTO_AVISO + 1); i++) {
    F.passo(m, 1 / 60, {});
    for (const e of F.tirarEventos(m)) { if (e.tipo === 'ventoAviso') aviso = true; if (e.tipo === 'vento') { sopra = true; assert.ok(aviso, 'aviso antes'); } }
    m.bolas.forEach(b => { if (Math.hypot(b.x, b.y) > 6) { b.x *= 0.5; b.y *= 0.5; } });
  }
  assert.ok(sopra && m.vento.k > 0);
  const b = m.bolas[0]; b.vx = b.vy = 0;
  F.passo(m, 1 / 60, {});
  assert.ok(b.vx * m.vento.dx + b.vy * m.vento.dy > 0, 'empurrado na direção do vento');
});

test('arena Pinball: o pino rebate quem bate nele', () => {
  const { m } = rodada(2, 28, { arena: 'pinball', itens: false });
  const p = m.pinos[0], b = m.bolas[0];
  m.bolas[1].x = -p.x; m.bolas[1].y = -p.y; m.pinos[3].vivo = false;
  const ux = p.x / Math.hypot(p.x, p.y), uy = p.y / Math.hypot(p.x, p.y);
  b.x = p.x - ux * 2.5; b.y = p.y - uy * 2.5; b.vx = ux * 5; b.vy = uy * 5;
  let bateu = false;
  for (let i = 0; i < 40; i++) { F.passo(m, 1 / 60, {}); if (F.tirarEventos(m).some(e => e.tipo === 'pino')) bateu = true; }
  assert.ok(bateu);
  assert.ok(b.vx * ux + b.vy * uy < -3, 'voltou rebatido');
});

test('ordem das arenas: começa na Clássica e não repete a mesma seguida', () => {
  for (let s = 1; s < 50; s++) {
    const o = F.ordemArenas(7, F.sorteio(s));
    assert.strictEqual(o.length, 7);
    assert.strictEqual(o[0], 'classica');
    for (let i = 1; i < 7; i++) assert.notStrictEqual(o[i], o[i - 1]);
    assert.ok(F.ARENAS.every(a => o.includes(a)), 'as 4 aparecem em 7 rodadas');
  }
});
