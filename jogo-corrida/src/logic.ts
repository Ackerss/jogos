export const DURATION = 20_000;
export const COUNTDOWN = 3_000;
export const MAX_PLAYERS = 4;
export const COLORS = ['#ffd25a', '#ff70ad', '#63e7d0', '#b1a1ff'];
export type Racer = { id: string; name: string; score: number; color: string; slot: number };
export type Race = { id: string; status: 'countdown' | 'running' | 'finished'; startAt: number; endAt: number; remainingMs: number; players: Racer[]; winners: string[] };
export type TapInput = { raceId: string; count: number };

export function createRace(players: {id: string; name: string}[], id: string, now: number): Race {
  return {id, status: 'countdown', startAt: now + COUNTDOWN, endAt: now + COUNTDOWN + DURATION,
    remainingMs: COUNTDOWN, winners: [], players: players.slice(0, MAX_PLAYERS).map((p, slot) =>
      ({id:p.id, name:p.name, slot, color:COLORS[slot]!, score:0}))};
}

export function advanceRace(race: Race, now: number): Race {
  if (race.status === 'finished') return race;
  if (now >= race.endAt) {
    const best = Math.max(0, ...race.players.map(p => p.score));
    return {...race, status:'finished', remainingMs:0, winners:race.players.filter(p => p.score === best).map(p => p.id)};
  }
  const running = now >= race.startAt;
  return {...race, status:running ? 'running' : 'countdown', remainingMs:Math.max(0, (running ? race.endAt : race.startAt) - now)};
}

// Cumulative counters tolerate delayed, duplicated and out-of-order relay snapshots.
// The TV decides when inputs stop. The limit is a casual-play sanity bound, not anti-cheat.
export function applyTap(race: Race, pid: string, value: unknown, now: number): Race {
  if (race.status !== 'running' || now < race.startAt || now >= race.endAt || !value || typeof value !== 'object') return race;
  const input = value as Partial<TapInput>;
  if (input.raceId !== race.id || !Number.isSafeInteger(input.count) || (input.count ?? -1) < 0) return race;
  const player = race.players.find(p => p.id === pid);
  if (!player || input.count! <= player.score) return race;
  const bound = Math.floor((now - race.startAt) / 1000 * 20) + 10;
  if (input.count! > bound) return race;
  return {...race, players:race.players.map(p => p.id === pid ? {...p, score:input.count!} : p)};
}

export function readRace(value: unknown): Race | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Race;
  if (typeof v.id !== 'string' || !['countdown','running','finished'].includes(v.status) || !Number.isFinite(v.startAt) || !Number.isFinite(v.endAt) || !Number.isFinite(v.remainingMs) || !Array.isArray(v.players) || v.players.length > MAX_PLAYERS || !Array.isArray(v.winners)) return null;
  if (!v.players.every(p => typeof p.id === 'string' && /^p_[a-z0-9]+$/.test(p.id) && typeof p.name === 'string' && p.name.length <= 24 && Number.isSafeInteger(p.score) && p.score >= 0 && Number.isInteger(p.slot) && p.slot >= 0 && p.slot < MAX_PLAYERS && COLORS.includes(p.color))) return null;
  if (!v.winners.every(id => typeof id === 'string' && v.players.some(p => p.id === id))) return null;
  return v;
}
