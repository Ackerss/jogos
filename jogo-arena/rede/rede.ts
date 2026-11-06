/* Arena Escorregadia: conexão TV ↔ celulares.
   Usa o motor Doot (RoomRuntime + relay CLASP), o mesmo da Corrida dos Toques e dos Lobos.
   A TV é a autoridade: roda a física e manda para cada celular um estado pequeno (cor, vivo, pontos).
   O celular só manda o joystick e o contador de trancos, cerca de 20 vezes por segundo.

   Gerado em js/rede.js por `npm run rede` (não edite js/rede.js à mão). */
import {RoomRuntime, createClaspRelay, makeRoomCode, isValidRoomCode, addr, type RelayClient, type RelayValue, type RelayCallback, type LoadedGame} from '../../jogo-corrida/vendor/doot-engine/src/index';
import qrcode from 'qrcode-generator';

const PLUGIN = 'acker-arena';
const jogo: LoadedGame = {meta:{pluginId:PLUGIN,pluginVersion:'0.1.0',title:'Arena Escorregadia',themeId:'acker',playerCap:8},config:{},rounds:[{timer:0}],resumable:true} as unknown as LoadedGame;
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
export interface Controle {x: number; y: number; t: number}
type Ouvinte = () => void;

/* ---------- TV (anfitriã) ---------- */
export function criarSala() {
  let room: RoomRuntime | null = null, relay: RelayClient | null = null;
  const sessao = uuid().slice(0, 8);
  const ultimos = new Map<string, number>();
  const enviadas = new Map<string, string>();
  let aoMudar: Ouvinte = () => {}, aoControle: (pid: string, c: Controle) => void = () => {};
  const S = {
    codigo: '', conectado: false, erro: '', pessoas: [] as Pessoa[], qr: '', link: '',
    async iniciar() {
      const antes = JSON.parse(ler('arena-tv') || '{}') as {sala?: string; token?: string};
      const codigo = antes.sala && isValidRoomCode(antes.sala) ? antes.sala : makeRoomCode();
      const token = antes.token || uuid();
      relay = novoRelay('ACKER TV Arena');
      room = new RoomRuntime({room: codigo, hostToken: token, role: 'host', relay});
      room.loadGame(jogo);
      room.onChange(() => atualizar());
      try {
        await room.connect();
        const snap = room.getSnapshot();
        guardar('arena-tv', JSON.stringify({sala: snap.code, token}));
        room.publishExtra('arena/sessao', sessao);
        // Joystick e trancos de cada celular. "n" cresce sempre: mensagem velha que chega atrasada é ignorada.
        room.onExtra('arena/ctl/*', (v, k) => {
          const pid = k.slice('arena/ctl/'.length), m = v as {s?: string; n?: number; x?: number; y?: number; t?: number};
          if (!m || m.s !== sessao || typeof m.n !== 'number') return;
          if ((ultimos.get(pid) || 0) >= m.n) return;
          ultimos.set(pid, m.n);
          const num = (q: unknown) => typeof q === 'number' && isFinite(q) ? q : 0;
          aoControle(pid, {x: Math.max(-1, Math.min(1, num(m.x))), y: Math.max(-1, Math.min(1, num(m.y))), t: Math.max(0, Math.floor(num(m.t)))});
        });
        // Celular que (re)entra pede o estado de novo.
        room.onExtra('arena/oi/*', (_v, k) => {const pid = k.slice('arena/oi/'.length); enviadas.delete(pid); aoMudar();});
        atualizar();
      } catch (e) {S.erro = 'Não foi possível abrir a sala. Confira a internet da TV.'; console.error(e); aoMudar();}
    },
    aoMudar(f: Ouvinte) {aoMudar = f;},
    aoControle(f: (pid: string, c: Controle) => void) {aoControle = f;},
    /* Manda o estado de um celular (só quando mudou). */
    tela(pid: string, t: Record<string, unknown>) {
      if (!room || !S.conectado) return;
      const txt = JSON.stringify(t);
      if (enviadas.get(pid) === txt) return;
      enviadas.set(pid, txt);
      room.publishExtra('arena/tela/' + pid, {s: sessao, t: txt} as unknown as RelayValue);
    },
    reenviarTudo() {enviadas.clear();}
  };
  function atualizar() {
    if (!room) return;
    const snap = room.getSnapshot();
    S.conectado = !!(snap.connected && snap.ready);
    S.pessoas = snap.players.map(p => ({pid: p.id, nome: p.name}));
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
  let aoTela: (t: Record<string, unknown>) => void = () => {}, aoMudar: Ouvinte = () => {};
  const C = {
    codigo: '', nome: '', pid: '', conectado: false, tvPresente: true, erro: '', ocupado: false, nomeRepetido: '',
    lembrado(): {codigo?: string; nome?: string} {try {return JSON.parse(ler('arena-cel') || '{}');} catch {return {};}},
    /* Entra na sala. reconectar = true pula a checagem de nome repetido (é a mesma pessoa voltando). */
    async conectar(codigo: string, nome: string, reconectar = false) {
      if (C.ocupado) return;
      codigo = codigo.trim().toUpperCase(); nome = nome.trim().replace(/\s+/g, ' ').slice(0, 12);
      if (!isValidRoomCode(codigo)) {C.erro = 'Digite o código de 4 letras que aparece na TV.'; aoMudar(); return;}
      if (!nome) {C.erro = 'Coloque o seu nome.'; aoMudar(); return;}
      C.ocupado = true; C.erro = ''; C.nomeRepetido = ''; aoMudar();
      const teste = novoRelay('ACKER Celular Arena');
      try {
        await teste.connect();
        const meta = await Promise.race([teste.get(addr.meta(codigo)), new Promise(ok => setTimeout(() => ok(null), 8000))]);
        if (!meta || typeof meta !== 'object' || (meta as {pluginId?: string}).pluginId !== PLUGIN) throw new Error('sala-nao-existe');
        if (!reconectar) {
          const p = await RoomRuntime.probePresence(teste, codigo, nome);
          if (p.present) {teste.close(); C.ocupado = false; C.nomeRepetido = nome; C.erro = 'Já tem alguém com o nome "' + nome + '" na arena. Use outro nome (se for você mesmo, toque em "sou eu voltando").'; aoMudar(); return;}
        }
        // Cada connect() abre um socket novo: o de teste não é reaproveitado.
        teste.close();
        relay = novoRelay('ACKER Celular Arena');
        room = new RoomRuntime({room: codigo, role: 'player', name: nome, relay});
        room.onChange(() => {const s = room!.getSnapshot(); C.conectado = !!(s.connected && s.ready); C.tvPresente = s.hostPresent; aoMudar();});
        room.onExtra('arena/sessao', v => {sessao = String(v || ''); if (C.pid) room!.publishExtra('arena/oi/' + C.pid, Date.now());});
        await room.connect();
        const s = room.getSnapshot();
        C.codigo = codigo; C.nome = nome; C.pid = s.me.id;
        room.onExtra('arena/tela/' + C.pid, v => {
          const m = v as {s?: string; t?: string};
          if (!m || !m.t || (sessao && m.s !== sessao)) return;
          try {aoTela(JSON.parse(m.t));} catch {/* */}
        });
        room.publishExtra('arena/oi/' + C.pid, Date.now());
        guardar('arena-cel', JSON.stringify({codigo, nome}));
        C.conectado = true; C.ocupado = false; aoMudar();
      } catch (e) {
        console.error(e); try {teste.close(); room?.dispose(); relay?.close();} catch {/* */}
        room = null; C.ocupado = false;
        C.erro = e instanceof Error && e.message === 'sala-nao-existe' ? 'Arena não encontrada. Confira se a TV está aberta no jogo e o código.' : 'Não deu para entrar. Confira o código e a internet.';
        aoMudar();
      }
    },
    /* Joystick (x, y de -1 a 1) e contador de trancos (só cresce). */
    controle(x: number, y: number, t: number) {
      if (room && sessao && C.pid) room.publishExtra('arena/ctl/' + C.pid, {s: sessao, n: ++n, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, t} as unknown as RelayValue);
    },
    aoTela(f: (t: Record<string, unknown>) => void) {aoTela = f;},
    aoMudar(f: Ouvinte) {aoMudar = f;},
    sair() {try {room?.dispose(); relay?.close();} catch {/* */} room = null; relay = null; sessao = ''; C.pid = ''; C.conectado = false; guardar('arena-cel', '{}'); aoMudar();}
  };
  return C;
}
