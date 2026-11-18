// Regras puras da Corrida dos Toques (sem tela e sem rede). A TV é a autoridade:
// ela recebe os contadores cumulativos dos celulares e decide distância, tombos e chegada.

export type Mode = 'classica' | 'sinal';
export const MODES: Record<Mode, {track: number; duration: number; name: string}> = {
  classica: {track: 100, duration: 30_000, name: 'Corrida Clássica'},
  sinal: {track: 70, duration: 40_000, name: 'Sinal Verde'},
};
export const COUNTDOWN = 3_000;
export const AFTER_FIRST = 6_000;   // depois que alguém chega, os outros têm 6 s para cruzar
export const MAX_PLAYERS = 4;
export const ANIMALS = 6;
export const STUN_MS = 1_500;        // tempo parado depois de tocar no vermelho
export const SLIP_BACK = 4;          // quanto o carrinho escorrega para trás
export const RED_GRACE = 350;        // tolerância depois que o sinal fica vermelho (no celular)
export const KID_BOOST = 2;          // "Pequeno corredor": cada toque vale 2
export const WIND_BOOST = 1.3;       // "Vento a favor" para quem está bem atrás
export const WIND_GAP = 8;
export const COLORS = ['#ffc533', '#ff5fa2', '#2fd6b5', '#8f7bff'];

export type Racer = {
  id: string; name: string; slot: number; color: string; animal: number; kid: boolean;
  taps: number; red: number; dist: number; finishMs: number; stunUntil: number; slips: number; wind: boolean; place: number;
};
export type Race = {
  id: string; mode: Mode; status: 'countdown' | 'running' | 'finished';
  startAt: number; endAt: number; now: number; remainingMs: number; track: number; wind: boolean;
  lights: number[]; players: Racer[]; winners: string[];
};
export type Entrant = {id: string; name: string; animal?: number; kid?: boolean};
export type TapInput = {raceId: string; count: number; red?: number};

const round2 = (n: number) => Math.round(n * 100) / 100;
export const isMode = (v: unknown): v is Mode => v === 'classica' || v === 'sinal';

// Sinal Verde: lista de instantes (ms desde a largada) em que o sinal troca.
// Índice par = começa verde, índice ímpar = começa vermelho. Sempre começa verde.
export function makeLights(duration: number, rnd: () => number = Math.random): number[] {
  const out: number[] = [0];
  let t = 0;
  while (t < duration) {
    const green = out.length % 2 === 1; // o trecho que acabou de começar
    t += green ? 2_200 + Math.floor(rnd() * 2_600) : 1_300 + Math.floor(rnd() * 1_400);
    if (t < duration) out.push(t);
  }
  return out;
}
export function lightIndex(lights: number[], ms: number): number {
  let i = 0;
  while (i + 1 < lights.length && lights[i + 1]! <= ms) i++;
  return i;
}
export function isGreen(race: Pick<Race, 'mode' | 'lights'>, ms: number): boolean {
  return race.mode !== 'sinal' || lightIndex(race.lights, ms) % 2 === 0;
}
/** Ms desde que o sinal ficou vermelho (ou -1 se está verde). */
export function redFor(race: Pick<Race, 'mode' | 'lights'>, ms: number): number {
  if (race.mode !== 'sinal') return -1;
  const i = lightIndex(race.lights, ms);
  return i % 2 === 1 ? ms - race.lights[i]! : -1;
}

export function createRace(players: Entrant[], id: string, now: number, mode: Mode = 'classica', wind = true, rnd: () => number = Math.random): Race {
  const cfg = MODES[mode];
  return {
    id, mode, status: 'countdown', startAt: now + COUNTDOWN, endAt: now + COUNTDOWN + cfg.duration, now,
    remainingMs: COUNTDOWN, track: cfg.track, wind, winners: [],
    lights: mode === 'sinal' ? makeLights(cfg.duration, rnd) : [0],
    players: players.slice(0, MAX_PLAYERS).map((p, slot) => ({
      id: p.id, name: p.name, slot, color: COLORS[slot]!,
      animal: Number.isInteger(p.animal) && p.animal! >= 0 && p.animal! < ANIMALS ? p.animal! : slot,
      kid: !!p.kid, taps: 0, red: 0, dist: 0, finishMs: -1, stunUntil: 0, slips: 0, wind: false, place: 1,
    })),
  };
}

/** Posições: quem chegou (pelo tempo), depois quem andou mais. Empate = mesma posição. */
export function rank(players: Racer[]): Racer[] {
  const key = (p: Racer) => p.finishMs >= 0 ? [0, p.finishMs] : [1, -p.dist];
  const sorted = [...players].sort((a, b) => {const x = key(a), y = key(b); return x[0]! - y[0]! || x[1]! - y[1]! || a.slot - b.slot;});
  let place = 0, prev = '';
  return sorted.map((p, i) => {const k = key(p).join(':'); if (k !== prev) {place = i + 1; prev = k;} return {...p, place};});
}
function withPlaces(players: Racer[]): Racer[] {
  const places = new Map(rank(players).map(p => [p.id, p.place]));
  return players.map(p => p.place === places.get(p.id) ? p : {...p, place: places.get(p.id)!});
}

export function advanceRace(race: Race, now: number): Race {
  if (race.status === 'finished') return race;
  const allIn = race.players.length > 0 && race.players.every(p => p.finishMs >= 0);
  if (now >= race.endAt || allIn) {
    const players = withPlaces(race.players).map(p => ({...p, wind: false}));
    const moved = players.some(p => p.dist > 0);
    return {...race, status: 'finished', now, remainingMs: 0, players,
      winners: moved ? players.filter(p => p.place === 1).map(p => p.id) : []};
  }
  const running = now >= race.startAt;
  return {...race, now, status: running ? 'running' : 'countdown', remainingMs: Math.max(0, (running ? race.endAt : race.startAt) - now)};
}

// Contadores cumulativos toleram mensagens atrasadas, repetidas e fora de ordem.
// O limite de 20 toques/s é só uma trava de bom senso, não um antitrapaça.
export function applyTap(race: Race, pid: string, value: unknown, now: number): Race {
  if (race.status !== 'running' || now < race.startAt || now >= race.endAt || !value || typeof value !== 'object') return race;
  const input = value as Partial<TapInput>;
  if (input.raceId !== race.id || !Number.isSafeInteger(input.count) || input.count! < 0) return race;
  const red = input.red === undefined ? 0 : input.red;
  if (!Number.isSafeInteger(red) || red < 0) return race;
  const player = race.players.find(p => p.id === pid);
  if (!player || player.finishMs >= 0) return race;
  const bound = Math.floor((now - race.startAt) / 1000 * 20) + 10;
  if (input.count! > bound || red > bound) return race;
  const delta = Math.max(0, input.count! - player.taps);
  const slipped = race.mode === 'sinal' && red > player.red;
  if (!delta && !slipped) return race;

  const p: Racer = {...player, taps: player.taps + delta};
  if (delta && now >= player.stunUntil) {
    const leader = Math.max(0, ...race.players.filter(o => o.id !== pid).map(o => o.dist));
    const behind = race.wind && leader - p.dist >= WIND_GAP;
    p.wind = behind;
    p.dist = round2(Math.min(race.track, p.dist + delta * (p.kid ? KID_BOOST : 1) * (behind ? WIND_BOOST : 1)));
  }
  if (slipped) {
    p.red = red; p.slips++; p.stunUntil = now + STUN_MS; p.wind = false;
    p.dist = round2(Math.max(0, p.dist - SLIP_BACK));
  }
  let endAt = race.endAt;
  if (p.dist >= race.track && p.finishMs < 0) {
    p.finishMs = now - race.startAt;
    if (!race.players.some(o => o.finishMs >= 0)) endAt = Math.min(endAt, now + AFTER_FIRST);
  }
  return {...race, endAt, players: withPlaces(race.players.map(o => o.id === pid ? p : o))};
}

export type Award = {icon: string; title: string; who: string; detail: string};
export function awards(race: Race): Award[] {
  if (race.status !== 'finished' || !race.players.some(p => p.taps > 0)) return [];
  const out: Award[] = [];
  const most = [...race.players].sort((a, b) => b.taps - a.taps)[0]!;
  out.push({icon: '👆', title: 'Dedo de ouro', who: most.name, detail: `${most.taps} toques`});
  const finished = race.players.filter(p => p.finishMs >= 0).sort((a, b) => a.finishMs - b.finishMs);
  if (finished.length >= 2 && finished[1]!.finishMs - finished[0]!.finishMs < 600)
    out.push({icon: '📸', title: 'Foto de chegada', who: `${finished[0]!.name} e ${finished[1]!.name}`, detail: 'chegaram quase juntos'});
  if (race.mode === 'sinal') {
    const calm = race.players.filter(p => p.slips === 0 && p.taps > 0);
    if (calm.length) out.push({icon: '🗿', title: 'Estátua perfeita', who: calm.map(p => p.name).join(', '), detail: 'nenhum escorregão'});
    const slippy = [...race.players].sort((a, b) => b.slips - a.slips)[0]!;
    if (slippy.slips > 0) out.push({icon: '🍌', title: 'Rei do escorregão', who: slippy.name, detail: `${slippy.slips} ${slippy.slips === 1 ? 'tombo' : 'tombos'}`});
  }
  const fastest = finished[0];
  if (fastest) out.push({icon: '⏱️', title: 'Tempo da vitória', who: fastest.name, detail: `${(fastest.finishMs / 1000).toFixed(1).replace('.', ',')} segundos`});
  return out.slice(0, 4);
}

export function readRace(value: unknown): Race | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Race;
  const fin = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (typeof v.id !== 'string' || !isMode(v.mode) || !['countdown', 'running', 'finished'].includes(v.status) || !fin(v.startAt) || !fin(v.endAt) || !fin(v.now) || !fin(v.remainingMs) || !fin(v.track) || v.track <= 0) return null;
  if (!Array.isArray(v.lights) || v.lights.length > 80 || !v.lights.every(fin) || !Array.isArray(v.players) || v.players.length > MAX_PLAYERS || !Array.isArray(v.winners)) return null;
  if (!v.players.every(p => p && typeof p.id === 'string' && /^p_[a-z0-9]+$/.test(p.id) && typeof p.name === 'string' && p.name.length <= 24
    && Number.isInteger(p.slot) && p.slot >= 0 && p.slot < MAX_PLAYERS && COLORS.includes(p.color) && Number.isInteger(p.animal) && p.animal >= 0 && p.animal < ANIMALS
    && Number.isSafeInteger(p.taps) && p.taps >= 0 && Number.isSafeInteger(p.red) && p.red >= 0 && Number.isSafeInteger(p.slips) && p.slips >= 0
    && fin(p.dist) && p.dist >= 0 && fin(p.finishMs) && fin(p.stunUntil) && Number.isInteger(p.place) && p.place >= 1)) return null;
  if (!v.winners.every(id => typeof id === 'string' && v.players.some(p => p.id === id))) return null;
  return v;
}
