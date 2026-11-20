// Confere a sintaxe de todos os arquivos JavaScript do jogo (funciona no Windows e no Linux).
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const pasta = path.join(__dirname, '..', 'js');
let falhou = false;
for (const f of fs.readdirSync(pasta).filter(n => n.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', path.join(pasta, f)], { stdio: 'inherit' });
  if (r.status !== 0) falhou = true; else console.log('ok', f);
}
process.exit(falhou ? 1 : 0);
