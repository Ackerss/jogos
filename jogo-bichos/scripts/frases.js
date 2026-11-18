// Lista das frases do narrador e conferência dos MP3.
// Uso:  node scripts/frases.js          → atualiza audio/narracao/FRASES.md e prontos.js, e mostra o que falta
//       node scripts/frases.js --conferir → só confere (não reescreve a lista)
'use strict';
const fs = require('fs'), path = require('path');
const N = require('../js/narracao.js');
const pasta = path.join(__dirname, '..', 'audio', 'narracao');
const existentes = fs.existsSync(pasta) ? fs.readdirSync(pasta).filter(n => n.toLowerCase().endsWith('.mp3')) : [];

const linhas = [], esperados = [];
let caracteres = 0;
for (const [momento, f] of Object.entries(N.frases)) {
  f.textos.forEach((texto, i) => {
    const arq = N.arquivo(momento, i);
    esperados.push(arq);
    caracteres += texto.length;
    const ok = existentes.includes(arq);
    const kb = ok ? Math.round(fs.statSync(path.join(pasta, arq)).size / 1024) : 0;
    linhas.push({ arq, texto, quando: f.quando, tom: f.tom, ok, kb });
  });
}
const faltando = linhas.filter(l => !l.ok), extras = existentes.filter(n => !esperados.includes(n)), grandes = linhas.filter(l => l.kb > 300);

if (!process.argv.includes('--conferir')) {
  const md = [
    '# Frases do narrador — Grande Prêmio dos Bichos',
    '',
    'Gerado por `node scripts/frases.js` a partir de `js/narracao.js` (não edite à mão: mude lá e rode de novo).',
    '',
    `Total: **${linhas.length} arquivos**, **${caracteres} caracteres** (cabe no plano grátis do ElevenLabs).`,
    '',
    'Salve cada MP3 nesta pasta (`jogo-bichos/audio/narracao/`) com o **nome exato** da coluna Arquivo.',
    '',
    '| Arquivo | Frase (falar exatamente assim) | Quando toca | Tom |',
    '|---|---|---|---|',
    ...linhas.map(l => `| \`${l.arq}\` | ${l.texto} | ${l.quando} | ${l.tom} |`),
    ''
  ].join('\n');
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, 'FRASES.md'), md);
  // Lista dos MP3 que existem: o jogo só carrega estes (evita pedir arquivos que não existem).
  const prontos = linhas.filter(l => l.ok).map(l => l.arq);
  fs.writeFileSync(path.join(pasta, 'prontos.js'),
    '/* Gerado por node scripts/frases.js — MP3 de narração disponíveis. */\nwindow.NARRACAO_PRONTOS = ' + JSON.stringify(prontos, null, 1) + ';\n');
}

console.log(`Frases: ${linhas.length} (${caracteres} caracteres). MP3 prontos: ${linhas.length - faltando.length}/${linhas.length}.`);
if (faltando.length) console.log('Faltando:\n  ' + faltando.map(l => l.arq).join('\n  '));
if (extras.length) console.log('Arquivos com nome errado ou sobrando (renomeie ou apague):\n  ' + extras.join('\n  '));
if (grandes.length) console.log('Arquivos grandes demais (>300 KB, confira se não tem silêncio longo):\n  ' + grandes.map(l => `${l.arq} (${l.kb} KB)`).join('\n  '));
if (!faltando.length && !extras.length) console.log('Tudo certo! Todos os áudios estão na pasta.');
