// Relay de TESTE local (ws://localhost): só é usado com ?relay=ws://localhost:PORTA nos testes automáticos.
// Cópia do mesmo cliente usado em jogo-lobisomem/rede/rede.ts. O jogo real usa createClaspRelay.
import {createClaspRelay, type RelayClient, type RelayValue, type RelayCallback} from '../vendor/doot-engine/src/index';
function relayLocal(url: string): RelayClient {
  let ws: WebSocket | null = null;
  const subs = new Map<number, {pattern: string; cb: RelayCallback}>();
  const store = new Map<string, RelayValue>();
  const pend = new Map<number, (v: RelayValue) => void>();
  const onC: Array<() => void> = [], onD: Array<(r?: string) => void> = [];
  let seq = 0, aberto = false;
  const casa = (p: string, a: string) => {const x = p.split('/'), y = a.split('/'); return x.length === y.length && x.every((s, i) => s === '*' || s === y[i]);};
  const enviar = (m: unknown) => {if (ws && aberto) ws.send(JSON.stringify(m));};
  const cli: RelayClient = {
    get connected() {return aberto;},
    connect() {
      return new Promise<void>((ok, falha) => {
        ws = new WebSocket(url);
        ws.onopen = () => {aberto = true; for (const [id, s] of subs) enviar({op: 'sub', id, pattern: s.pattern}); ok(); onC.forEach(f => f());};
        ws.onerror = () => falha(new Error('relay local indisponível'));
        ws.onclose = () => {aberto = false; onD.forEach(f => f('fechou'));};
        ws.onmessage = ev => {
          const m = JSON.parse(String(ev.data));
          if (m.op === 'val') {store.set(m.address, m.value); for (const s of subs.values()) if (casa(s.pattern, m.address)) s.cb(m.value, m.address);}
          if (m.op === 'got') {const f = pend.get(m.id); pend.delete(m.id); f && f(m.value);}
        };
      });
    },
    on(pattern, cb) {const id = ++seq; subs.set(id, {pattern, cb}); enviar({op: 'sub', id, pattern}); return () => {subs.delete(id); enviar({op: 'unsub', id});};},
    set(address, value) {store.set(address, value); enviar({op: 'set', address, value});},
    emit(address, payload) {enviar({op: 'emit', address, value: payload ?? 1});},
    cached(address) {return store.get(address);},
    get(address) {const id = ++seq; return new Promise(ok => {pend.set(id, ok); enviar({op: 'get', id, address}); setTimeout(() => {if (pend.has(id)) {pend.delete(id); ok(undefined as unknown as RelayValue);}}, 3000);});},
    onConnect(cb) {onC.push(cb);}, onDisconnect(cb) {onD.push(cb);}, onReconnect() {}, onError() {},
    close() {try {ws?.close();} catch {/* */}}
  };
  return cli;
}
const localUrl = () => {const v = new URLSearchParams(location.search).get('relay'); return v && /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(v) ? v : '';};
export function newRelay(name: string): RelayClient {
  const local = localUrl();
  return local ? relayLocal(local) : createClaspRelay(undefined, {name});
}
export function relayParam(): string {return localUrl();}
