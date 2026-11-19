// Testes das regras do Rabisco sem Fio (node --test).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const T = require('../js/traco.js');
const P = require('../js/partida.js');
const F = require('../js/frases.js');
const B = require('../js/bots.js');

function semente(n) { return function () { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }

test('desenho vai e volta pela rede sem perder pontos', () => {
  const tracos = [{ c: 2, t: 1, p: [0, 0, 250, 250, 500, 500] }, { c: 0, t: 3, p: [10, 20] }];
  const txt = T.codificar(tracos);
  assert.deepStrictEqual(T.decodificar(txt), tracos);
  assert.ok(!T.vazio(txt));
  assert.ok(T.vazio(''));
  assert.ok(T.vazio(T.codificar([{ c: 1, t: 1, p: [1, 1, 5, 5] }])), 'só borracha conta como vazio');
  assert.deepStrictEqual(T.decodificar('lixo!!'), []);
  assert.deepStrictEqual(T.decodificar(null), []);
});

test('desenho grande cabe numa mensagem do relay (limite 58 KB)', () => {
  const p = []; for (let i = 0; i < T.MAX_PONTOS; i++) p.push(i % 500, (i * 7) % 500);
  const txt = T.codificar([{ c: 0, t: 1, p }]);
  assert.ok(txt.length < 40000, 'tamanho ' + txt.length);
});

test('cada livro passa uma vez por cada jogador', () => {
  for (let n = 3; n <= 10; n++) {
    const p = P.criar(Array.from({ length: n }, (_, i) => ({ nome: 'J' + i })), { desafios: true, rand: semente(n) });
    for (let e = 0; e < n; e++) {
      const livros = new Set();
      for (let j = 0; j < n; j++) { const t = P.tarefa(p, j); livros.add(t.livro); assert.strictEqual(t.tipo, P.tipo(e)); }
      assert.strictEqual(livros.size, n, 'na etapa todos os livros estão em mãos diferentes');
      for (let j = 0; j < n; j++) P.entregar(p, j, P.tipo(e) === 'desenho' ? '' : 'texto ' + j, e);
      P.fecharEtapa(p);
    }
    assert.ok(p.fim);
    p.livros.forEach(l => {
      assert.strictEqual(l.passos.length, n);
      assert.strictEqual(new Set(l.passos.map(x => x.autor)).size, n, 'ninguém repete no mesmo livro');
      assert.strictEqual(l.passos[0].autor, l.dono);
    });
  }
});

test('tipos das etapas: frase, desenho, palpite, desenho…', () => {
  assert.deepStrictEqual([0, 1, 2, 3, 4].map(P.tipo), ['frase', 'desenho', 'palpite', 'desenho', 'palpite']);
});

test('quem não entrega fica com o rascunho ou com algo padrão', () => {
  const p = P.criar([{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }], {});
  P.entregar(p, 0, 'Gato voando', 0);
  P.rascunho(p, 1, 'Cachorro sur', 0);
  P.fecharEtapa(p, () => 'Frase sugerida');
  assert.strictEqual(p.livros[0].passos[0].conteudo, 'Gato voando');
  assert.strictEqual(p.livros[1].passos[0].conteudo, 'Cachorro sur');
  assert.strictEqual(p.livros[2].passos[0].conteudo, 'Frase sugerida');
  assert.ok(p.livros[2].passos[0].auto);
  P.fecharEtapa(p); // ninguém desenhou
  assert.strictEqual(p.livros[0].passos[1].conteudo, '');
  P.fecharEtapa(p); // ninguém adivinhou
  assert.strictEqual(p.livros[0].passos[2].conteudo, P.SEM_PALPITE);
  assert.ok(p.fim);
});

test('entrega de etapa velha ou texto vazio é recusada; texto é limpo', () => {
  const p = P.criar([{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }], {});
  assert.ok(!P.entregar(p, 0, '   ', 0));
  assert.ok(!P.entregar(p, 0, 'oi', 3));
  assert.ok(P.entregar(p, 0, '  <b>oi</b>   tudo  ', 0));
  assert.strictEqual(p.entregas[0], 'b oi /b tudo');
  assert.ok(!P.entregar(p, 9, 'x', 0));
});

test('palpite parecido: acentos, plural e palavras pequenas não atrapalham', () => {
  assert.ok(P.parecido('Vovó surfando num tsunami', 'vovo surfista'));
  assert.ok(P.parecido('Gato fazendo yoga', 'gatos na yoga'));
  assert.ok(P.parecido('Um polvo tocando bateria', 'polvo baterista'));
  assert.ok(!P.parecido('Pizza voadora atacando a cidade', 'um disco voador'));
  assert.ok(!P.parecido('Gato fazendo yoga', '???'));
  assert.ok(!P.parecido('', 'gato'));
});

test('pontos: entendeu, chegou inteiro e reações', () => {
  const p = P.criar([{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }], {});
  P.entregar(p, 0, 'Gato fazendo yoga', 0); P.entregar(p, 1, 'Pizza voadora', 0); P.entregar(p, 2, 'Rio de chocolate', 0);
  P.fecharEtapa(p);
  for (let j = 0; j < 3; j++) P.entregar(p, j, T.codificar([{ c: 0, t: 1, p: [1, 1, 9, 9] }]), 1);
  P.fecharEtapa(p);
  // livro 0 (de A): etapa 2 é feita por C (j=2)
  P.entregar(p, 2, 'gato na yoga', 2); P.entregar(p, 0, 'um disco', 2); P.entregar(p, 1, 'mar de lama', 2);
  P.fecharEtapa(p);
  assert.ok(p.fim);
  const l0 = p.livros[0];
  assert.ok(l0.passos[2].acertou && l0.passos[1].entendido && l0.inteiro);
  // A: inteiro 3; B (desenhou): entendeu 2 + inteiro 3; C: entendeu 2 + inteiro 3
  assert.deepStrictEqual(p.pontos, [3, 5, 5]);
  assert.ok(P.reagir(p, 0, 0, 1, 'riso'));
  assert.ok(!P.reagir(p, 0, 0, 1, 'riso'), 'não repete o mesmo tipo');
  assert.ok(P.reagir(p, 0, 0, 1, 'arte'));
  assert.ok(!P.reagir(p, 1, 0, 1, 'riso'), 'não reage ao próprio');
  assert.ok(!P.reagir(p, 0, 0, 1, 'xx'));
  assert.strictEqual(p.pontos[1], 7);
  const pr = P.premios(p);
  assert.ok(pr.some(x => x.id === 'riso' && x.j === 1));
  assert.ok(pr.some(x => x.id === 'olho' && x.j === 2));
  assert.strictEqual(P.ranking(p)[0].nome, 'B');
});

test('desafios: só em etapas de desenho e no máximo ~1/3 da roda', () => {
  const p = P.criar(Array.from({ length: 6 }, (_, i) => ({ nome: 'J' + i })), { desafios: true, rand: semente(3) });
  Object.keys(p.desafios).forEach(e => {
    assert.strictEqual(P.tipo(+e), 'desenho');
    assert.ok(Object.keys(p.desafios[e]).length <= 2);
    Object.values(p.desafios[e]).forEach(d => assert.ok(P.DESAFIOS[d]));
  });
  const sem = P.criar(Array.from({ length: 6 }, (_, i) => ({ nome: 'J' + i })), { desafios: false });
  assert.deepStrictEqual(sem.desafios, {});
});

test('banco de frases e bots', () => {
  assert.ok(F.LISTA.length >= 200);
  assert.strictEqual(new Set(F.LISTA).size, F.LISTA.length, 'sem frases repetidas');
  const s = F.sugestoes(3, semente(1));
  assert.strictEqual(new Set(s).size, 3);
  const d = B.desenhar('Gato fazendo yoga', semente(2));
  assert.strictEqual(d.rotulo, 'gato');
  assert.ok(!T.vazio(d.texto));
  B.RABISCOS.forEach(r => assert.ok(!T.vazio(B.desenhar(r.chaves[0], semente(4)).texto), r.id));
  assert.ok(typeof B.palpite('gato', semente(5)) === 'string');
  assert.ok(!T.vazio(B.avatar(semente(6))));
});

test('200 partidas inteiras com bots terminam com pontos válidos', () => {
  for (let k = 0; k < 200; k++) {
    const rand = semente(k + 11), n = 3 + (k % 8);
    const p = P.criar(Array.from({ length: n }, (_, i) => ({ nome: 'B' + i })), { desafios: k % 2 === 0, rand });
    const rot = {};
    while (!p.fim) {
      const e = p.etapa;
      for (let j = 0; j < n; j++) {
        if (rand() < 0.1) continue; // alguns não entregam
        const t = P.tarefa(p, j);
        if (t.tipo === 'frase') P.entregar(p, j, B.frase(rand), e);
        else if (t.tipo === 'desenho') { const d = B.desenhar(t.anterior, rand); rot[t.livro + ':' + e] = d.rotulo; P.entregar(p, j, d.texto, e); }
        else P.entregar(p, j, B.palpite(rot[t.livro + ':' + (e - 1)], rand), e);
      }
      P.fecharEtapa(p, () => F.sugestoes(1, rand)[0]);
    }
    for (let l = 0; l < n; l++) for (let x = 0; x < n; x++) P.reagir(p, x, l, Math.floor(rand() * n), ['riso', 'arte', 'confuso'][x % 3]);
    assert.ok(p.pontos.every(v => Number.isInteger(v) && v >= 0));
    assert.strictEqual(P.ranking(p).length, n);
  }
});
