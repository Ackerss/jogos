// Gera js/rede.js (conexão TV ↔ celulares) a partir de rede/rede.ts.
// Usa as dependências já instaladas da Corrida dos Toques: rode antes `npm ci` em ../jogo-corrida.
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const aqui = path.dirname(fileURLToPath(import.meta.url));
const corrida = path.join(aqui, '..', '..', 'jogo-corrida');
const require = createRequire(path.join(corrida, 'package.json'));
const {build} = require('esbuild');
await build({
  entryPoints: [path.join(aqui, '..', 'rede', 'rede.ts')],
  outfile: path.join(aqui, '..', 'js', 'rede.js'),
  bundle: true, minify: true, format: 'iife', globalName: 'Rede', target: ['chrome61', 'safari12'],
  nodePaths: [path.join(corrida, 'node_modules')], legalComments: 'eof'
});
console.log('js/rede.js gerado');
