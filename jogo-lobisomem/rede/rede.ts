/* A Noite dos Lobos: conexão TV ↔ celulares.
   Usa o motor Doot (RoomRuntime + relay CLASP), o mesmo da Corrida dos Toques.
   A TV é a autoridade: roda o jogo e manda para cada celular a tela pronta.
   O celular só mostra a tela e devolve os toques.

   Gerado em js/rede.js por `npm run rede` (não edite js/rede.js à mão). */
import {RoomRuntime, createClaspRelay, makeRoomCode, isValidRoomCode, addr, type RelayClient, type RelayValue, type RelayCallback, type LoadedGame} from '../../jogo-corrida/vendor/doot-engine/src/index';
import qrcode from 'qrcode-generator';

const PLUGIN = 'acker-lobos';
const jogo: LoadedGame = {meta:{pluginId:PLUGIN,pluginVersion:'0.3.0',title:'A Noite dos Lobos',themeId:'acker',playerCap:6},config:{},rounds:[{timer:0}],resumable:true} as unknown as LoadedGame;
const guardar = (k: string, v: string) => {try{sessionStorage.setItem(k,v);}catch{/* opcional */}};
const ler = (k: string) => {try{return sessionStorage.getItem(k);}catch{return null;}};
const uuid = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* Relay de teste local (ws://localhost): só usado com ?relay=ws://... nos testes automáticos. */
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
function novoRelay(nome: string): RelayClient {
  const local = new URLSearchParams(location.search).get('relay');
  if (local && /^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(local)) return relayLocal(local);
  return createClaspRelay(undefined, {name: nome});
}
function linkBase(): string {
  const u = new URL(location.href); u.search = ''; u.hash = '';
  const local = new URLSearchParams(location.search).get('relay');
  if (local) u.searchParams.set('relay', local);
  return u.href;
}

export interface Pessoa {pid: string; nome: string}
type Ouvinte = () => void;

/* ---------- TV (anfitriã) ---------- */
export function criarSala() {
  let room: RoomRuntime | null = null, relay: RelayClient | null = null;
  const sessao = uuid().slice(0, 8);
  const ultimos = new Map<string, number>();
  const enviadas = new Map<string, string>();
  let aoMudar: Ouvinte = () => {}, aoAcao: (pid: string, d: Record<string, unknown>) => void = () => {};
  const S = {
    codigo: '', conectado: false, erro: '', pessoas: [] as Pessoa[], qr: '', link: '',
    async iniciar() {
      const antes = JSON.parse(ler('lobos-tv') || '{}') as {sala?: string; token?: string};
      const codigo = antes.sala && isValidRoomCode(antes.sala) ? antes.sala : makeRoomCode();
      const token = antes.token || uuid();
      relay = novoRelay('ACKER TV Lobos');
      room = new RoomRuntime({room: codigo, hostToken: token, role: 'host', relay});
      room.loadGame(jogo);
      room.onChange(() => atualizar());
      try {
        await room.connect();
        const snap = room.getSnapshot();
        guardar('lobos-tv', JSON.stringify({sala: snap.code, token}));
        room.publishExtra('lobos/sessao', sessao);
        room.onExtra('lobos/acao/*', (v, k) => {
          const pid = k.slice('lobos/acao/'.length), m = v as {s?: string; n?: number; d?: Record<string, unknown>};
          if (!m || m.s !== sessao || typeof m.n !== 'number' || !m.d) return;
          if ((ultimos.get(pid) || 0) >= m.n) return;
          ultimos.set(pid, m.n);
          aoAcao(pid, m.d);
        });
        // Celular que (re)entra pede a tela de novo.
        room.onExtra('lobos/oi/*', (_v, k) => {const pid = k.slice('lobos/oi/'.length); enviadas.delete(pid); enviadas.delete('t:' + pid); aoMudar();});
        atualizar();
      } catch (e) {S.erro = 'Não foi possível abrir a sala. Confira a internet da TV.'; console.error(e); aoMudar();}
    },
    aoMudar(f: Ouvinte) {aoMudar = f;},
    aoAcao(f: (pid: string, d: Record<string, unknown>) => void) {aoAcao = f;},
    /* Manda a tela pronta para um celular (só quando mudou). */
    tela(pid: string, t: Record<string, unknown>) {
      if (!room || !S.conectado) return;
      const txt = JSON.stringify(t);
      if (enviadas.get(pid) === txt) return;
      enviadas.set(pid, txt);
      room.publishExtra('lobos/tela/' + pid, {s: sessao, t: txt} as unknown as RelayValue);
    },
    /* Relógio do celular (texto curto), separado da tela para não reenviar tudo a cada segundo. */
    tempo(pid: string, txt: string) {
      if (!room || !S.conectado) return;
      if (enviadas.get('t:' + pid) === txt) return;
      enviadas.set('t:' + pid, txt);
      room.publishExtra('lobos/tempo/' + pid, {s: sessao, t: txt} as unknown as RelayValue);
    },
    reenviarTudo() {enviadas.clear();}
  };
  function atualizar() {
    if (!room) return;
    const snap = room.getSnapshot();
    S.conectado = !!(snap.connected && snap.ready);
    const pessoas = snap.players.map(p => ({pid: p.id, nome: p.name}));
    S.pessoas = pessoas;
    if (snap.code && snap.code !== S.codigo) {
      S.codigo = snap.code;
      const u = new URL(linkBase()); u.searchParams.set('sala', snap.code); S.link = u.href;
      const qr = qrcode(0, 'M'); qr.addData(S.link); qr.make();
      S.qr = qr.createSvgTag({cellSize: 4, margin: 2, scalable: true});
    }
    aoMudar();
  }
  setInterval(() => {if (room && S.conectado) room.tick();}, 1000);
  return S;
}

/* ---------- Celular (controle) ---------- */
export function entrar() {
  let room: RoomRuntime | null = null, relay: RelayClient | null = null;
  let sessao = '', n = Date.now();
  let aoTela: (t: Record<string, unknown>) => void = () => {}, aoTempo: (t: string) => void = () => {}, aoMudar: Ouvinte = () => {};
  const C = {
    codigo: '', nome: '', pid: '', conectado: false, tvPresente: true, erro: '', ocupado: false, nomeRepetido: '',
    lembrado(): {codigo?: string; nome?: string} {try {return JSON.parse(ler('lobos-cel') || '{}');} catch {return {};}},
    /* Entra na sala. reconectar = true pula a checagem de nome repetido (é a mesma pessoa voltando). */
    async conectar(codigo: string, nome: string, reconectar = false) {
      if (C.ocupado) return;
      codigo = codigo.trim().toUpperCase(); nome = nome.trim().replace(/\s+/g, ' ').slice(0, 14);
      if (!isValidRoomCode(codigo)) {C.erro = 'Digite o código de 4 letras que aparece na TV.'; aoMudar(); return;}
      if (!nome) {C.erro = 'Coloque o seu nome.'; aoMudar(); return;}
      C.ocupado = true; C.erro = ''; C.nomeRepetido = ''; aoMudar();
      const teste = novoRelay('ACKER Celular Lobos');
      try {
        await teste.connect();
        const meta = await Promise.race([teste.get(addr.meta(codigo)), new Promise(ok => setTimeout(() => ok(null), 8000))]);
        if (!meta || typeof meta !== 'object' || (meta as {pluginId?: string}).pluginId !== PLUGIN) throw new Error('sala-nao-existe');
        if (!reconectar) {
          const p = await RoomRuntime.probePresence(teste, codigo, nome);
          if (p.present) {teste.close(); C.ocupado = false; C.nomeRepetido = nome; C.erro = 'Já tem alguém com o nome "' + nome + '" na sala. Use outro nome (se for você mesmo, toque em "sou eu voltando").'; aoMudar(); return;}
        }
        // Cada connect() abre um socket novo: o de teste não é reaproveitado.
        teste.close();
        relay = novoRelay('ACKER Celular Lobos');
        room = new RoomRuntime({room: codigo, role: 'player', name: nome, relay});
        room.onChange(() => {const s = room!.getSnapshot(); C.conectado = !!(s.connected && s.ready); C.tvPresente = s.hostPresent; aoMudar();});
        room.onExtra('lobos/sessao', v => {sessao = String(v || ''); if (C.pid) room!.publishExtra('lobos/oi/' + C.pid, Date.now());});
        await room.connect();
        const s = room.getSnapshot();
        C.codigo = codigo; C.nome = nome; C.pid = s.me.id;
        room.onExtra('lobos/tela/' + C.pid, v => {
          const m = v as {s?: string; t?: string};
          if (!m || !m.t || (sessao && m.s !== sessao)) return;
          try {aoTela(JSON.parse(m.t));} catch {/* */}
        });
        room.onExtra('lobos/tempo/' + C.pid, v => {const m = v as {s?: string; t?: string}; if (m && (!sessao || m.s === sessao)) aoTempo(String(m.t || ''));});
        room.publishExtra('lobos/oi/' + C.pid, Date.now());
        guardar('lobos-cel', JSON.stringify({codigo, nome}));
        C.conectado = true; C.ocupado = false; aoMudar();
      } catch (e) {
        console.error(e); try {teste.close(); room?.dispose(); relay?.close();} catch {/* */}
        room = null; C.ocupado = false;
        C.erro = e instanceof Error && e.message === 'sala-nao-existe' ? 'Sala não encontrada. Confira se a TV está aberta no jogo e o código.' : 'Não deu para entrar. Confira o código e a internet.';
        aoMudar();
      }
    },
    acao(d: Record<string, unknown>) {if (room && sessao) room.publishExtra('lobos/acao/' + C.pid, {s: sessao, n: ++n, d} as unknown as RelayValue);},
    aoTela(f: (t: Record<string, unknown>) => void) {aoTela = f;},
    aoTempo(f: (t: string) => void) {aoTempo = f;},
    aoMudar(f: Ouvinte) {aoMudar = f;},
    sair() {try {room?.dispose(); relay?.close();} catch {/* */} room = null; relay = null; sessao = ''; C.pid = ''; C.conectado = false; guardar('lobos-cel', '{}'); aoMudar();}
  };
  return C;
}
