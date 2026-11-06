// Relay de TESTE local (sem internet): imita o relay CLASP para testes automáticos.
// Uso: node scripts/relay-local.mjs [porta]   e abra o jogo com ?relay=ws://localhost:PORTA
// Guarda o último valor de cada endereço e entrega a quem se inscrever depois (como o relay real).
import http from 'node:http';
import crypto from 'node:crypto';
const porta = Number(process.argv[2] || 8790);
const store = new Map(), clientes = new Set();
const casa = (p, a) => {const x = p.split('/'), y = a.split('/'); return x.length === y.length && x.every((s, i) => s === '*' || s === y[i]);};
function quadro(txt) {
  const b = Buffer.from(txt), n = b.length;
  const cab = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : (() => {const h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); return h;})();
  return Buffer.concat([cab, b]);
}
function mandar(c, m) {try {c.sock.write(quadro(JSON.stringify(m)));} catch {}}
function tratar(c, m) {
  if (m.op === 'sub') {c.subs.set(m.id, m.pattern); for (const [a, v] of store) if (casa(m.pattern, a)) mandar(c, {op: 'val', address: a, value: v});}
  if (m.op === 'unsub') c.subs.delete(m.id);
  if (m.op === 'set' || m.op === 'emit') {
    if (m.op === 'set') store.set(m.address, m.value);
    for (const o of clientes) for (const p of o.subs.values()) if (casa(p, m.address)) {mandar(o, {op: 'val', address: m.address, value: m.value}); break;}
  }
  if (m.op === 'get') mandar(c, {op: 'got', id: m.id, value: store.has(m.address) ? store.get(m.address) : null});
}
const srv = http.createServer((_q, r) => {r.writeHead(200); r.end('relay local');});
srv.on('upgrade', (req, sock) => {
  const chave = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + chave + '\r\n\r\n');
  const c = {sock, subs: new Map()}; clientes.add(c);
  let buf = Buffer.alloc(0);
  sock.on('data', d => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= 2) {
      const op = buf[0] & 15; let n = buf[1] & 127, off = 2;
      if (n === 126) {if (buf.length < 4) return; n = buf.readUInt16BE(2); off = 4;}
      else if (n === 127) {if (buf.length < 10) return; n = Number(buf.readBigUInt64BE(2)); off = 10;}
      const mascarado = buf[1] & 128; if (buf.length < off + (mascarado ? 4 : 0) + n) return;
      const m = mascarado ? buf.subarray(off, off + 4) : null; off += mascarado ? 4 : 0;
      const dados = Buffer.from(buf.subarray(off, off + n)); if (m) for (let i = 0; i < n; i++) dados[i] ^= m[i % 4];
      buf = buf.subarray(off + n);
      if (op === 8) {sock.end(); return;}
      if (op === 1) {try {tratar(c, JSON.parse(dados.toString()));} catch {}}
    }
  });
  const fim = () => clientes.delete(c); sock.on('close', fim); sock.on('error', fim);
});
srv.listen(porta, () => console.log('relay local em ws://localhost:' + porta));
