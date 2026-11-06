'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const N = require('../js/narracao.js');

test('todo momento narrado pelo jogo existe no roteiro', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
  const usados = new Set([...main.matchAll(/narra\('([a-z0-9_]+)'/g)].map(m => m[1]));
  ['lobo', 'vidente', 'ladrao', 'encrenqueiro'].forEach(p => { usados.add(p + '_acorda'); usados.add(p + '_dorme'); });
  usados.forEach(m => assert.ok(N.frases[m], 'falta o momento ' + m));
  ['vitoria_lobos', 'ninguem_venceu', 'vitoria_aldeia_sem_lobos', 'vitoria_aldeia', 'eliminado', 'empate', 'ninguem_sai',
   'troca_ladrao', 'troca_encrenqueiro', 'replay_fim', 'replay_sem_trocas'].forEach(m => assert.ok(N.frases[m], m));
});

test('modo rápido só aponta para momentos que existem', () => {
  for (const [m, alvo] of Object.entries(N.curto)) {
    assert.ok(N.frases[m], 'momento ' + m);
    if (alvo) assert.ok(N.frases[alvo], 'curto ' + alvo);
  }
});

test('roteiro curto: frases pequenas e total dentro do plano grátis', () => {
  let total = 0;
  const nomes = new Set();
  for (const [m, f] of Object.entries(N.frases)) {
    assert.ok(/^[a-z0-9_]+$/.test(m), m);
    assert.ok(f.textos.length >= 1 && f.textos.length <= 3, m);
    f.textos.forEach((t, i) => {
      assert.ok(t.length <= 110, 'frase longa demais: ' + m);
      const arq = N.arquivo(m, i);
      assert.ok(!nomes.has(arq)); nomes.add(arq);
      total += t.length;
    });
  }
  assert.ok(total < 4000, 'roteiro com ' + total + ' caracteres');
});
