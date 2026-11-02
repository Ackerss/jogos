import http from 'node:http';
import os from 'node:os';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../dist/',import.meta.url));
const port = Number(process.env.PORT || 8787);
const ips = Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)).map(n => n.address);
const origins = ips.map(ip => `http://${ip}:${port}`);
const publicOrigin = process.env.PUBLIC_ORIGIN || origins[0] || `http://localhost:${port}`;
const files = new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/game.js','game.js'],['/LICENSES.txt','LICENSES.txt']]);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server = http.createServer(async(req,res) => {
  const url = new URL(req.url || '/',`http://localhost:${port}`);
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (url.pathname === '/network.json') {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({origin:publicOrigin,origins}));return;}
  const file = files.get(url.pathname);
  if (!file) {res.writeHead(404);res.end('Pagina nao encontrada. Abra o endereco principal do jogo.');return;}
  try {res.setHeader('Content-Type',mime[path.extname(file)]);res.end(await readFile(path.join(root,file)));}
  catch {res.writeHead(500);res.end('Jogo ainda nao gerado. Execute PREPARAR_JOGO.bat.');}
});
server.on('error', async err => {
  if (err.code === 'EADDRINUSE') {
    try {const r=await fetch(`http://localhost:${port}/network.json`);if(r.ok){console.log(`O jogo ja esta aberto. Na TV: ${publicOrigin}/?tela=tv`);process.exit(0);}} catch {}
  }
  console.error(`Nao foi possivel abrir a porta ${port}: ${err.message}`);process.exit(1);
});
server.listen(port,'0.0.0.0',() => {
  console.log('\n  ACKER | CORRIDA DOS TOQUES\n');
  console.log(`  NA TV: ${publicOrigin}/?tela=tv`);
  console.log(`  NO PC: http://localhost:${port}/`);
  for(const origin of origins.slice(1)) console.log(`  Outra rede: ${origin}/?tela=tv`);
  console.log('\n  TV e celulares precisam acessar este PC. Mantenha esta janela aberta.');
  console.log('  Internet necessaria para o servico de salas Doot/CLASP.');
  console.log('  Para encerrar: Ctrl+C.\n');
});
