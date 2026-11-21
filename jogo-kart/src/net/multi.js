// Kart Acker TV — peças do multiplayer que não dependem do 3D (testadas em tests/multi.test.mjs).
// TV = autoridade da corrida (largada, robôs, resultado). Cada celular cuida da física do próprio kart.

export const MAX_KARTS = 4;

// Cores dos karts (mesma paleta de alto contraste do jogo). O robô usa o nome da cor que sobrou.
export const CORES = [
  { cor: '#dc2626', acento: '#ffffff', nome: 'Vermelho', robo: 'Foguete Vermelho', numero: '1' },
  { cor: '#0284c7', acento: '#fde047', nome: 'Azul', robo: 'Trovão Azul', numero: '7' },
  { cor: '#f59e0b', acento: '#18181b', nome: 'Amarelo', robo: 'Sol Dourado', numero: '22' },
  { cor: '#e11d98', acento: '#f8fafc', nome: 'Rosa', robo: 'Fúria Rosa', numero: '88' }
];

/** Relógio da TV visto do celular: guarda a menor diferença (celular - TV) dos últimos recados. */
export function criarRelogio() {
  const amostras = [];
  let desvio = null;
  return {
    amostra(diferencaMs) {
      if (!Number.isFinite(diferencaMs)) return;
      amostras.push(diferencaMs);
      if (amostras.length > 60) amostras.shift();
      desvio = Math.min(...amostras);
    },
    /** Horário da TV agora (ms). Sem amostra ainda, usa o relógio do próprio aparelho. */
    agoraTv(agoraLocal = Date.now()) {
      return desvio === null ? agoraLocal : agoraLocal - desvio;
    },
    get desvio() {
      return desvio;
    }
  };
}

/** Prevê onde o kart está "agora", a partir do último estado recebido há idadeS segundos. */
export function preverEstado(st, idadeS) {
  const a = Math.max(0, Math.min(0.35, idadeS || 0));
  const p = { ...st };
  if (a <= 0) return p;
  const spinning = (st.sp || 0) > 0;
  const v = spinning ? (st.v || 0) * 0.5 : st.v || 0;
  p.x = st.x + Math.sin(st.h) * v * a;
  p.z = st.z + Math.cos(st.h) * v * a;
  if (!st.g) p.y = st.y + (st.vy || 0) * a - 0.5 * 30 * a * a;
  p.sp = Math.max(0, (st.sp || 0) - a);
  p.b = Math.max(0, (st.b || 0) - a);
  return p;
}

/**
 * Classificação: quem terminou vem primeiro (menor tempo), depois quem andou mais.
 * Cada item: {id, f (terminou), ft (tempo de chegada em s), p (progresso total em voltas)}
 */
export function classificar(lista) {
  return [...lista].sort((a, b) => {
    if (a.f && b.f) return (a.ft || 0) - (b.ft || 0);
    if (a.f) return -1;
    if (b.f) return 1;
    return (b.p || 0) - (a.p || 0);
  });
}

/**
 * Monta o grid de largada. jogadores: [{pid, nome, cor (índice ou -1), crianca}]
 * - cada jogador fica com a cor que escolheu (se repetida, a próxima livre);
 * - os robôs completam até totalKarts com as cores que sobraram;
 * - na largada: crianças na frente, depois robôs, depois adultos.
 */
export function montarGrid(jogadores, totalKarts = MAX_KARTS, comRobos = true) {
  const usadas = new Set();
  const humanos = [];
  for (const j of jogadores.slice(0, MAX_KARTS)) {
    let c = Number.isInteger(j.cor) && j.cor >= 0 && j.cor < CORES.length && !usadas.has(j.cor) ? j.cor : -1;
    if (c < 0) c = CORES.findIndex((_, i) => !usadas.has(i));
    usadas.add(c);
    humanos.push({ id: 'h-' + j.pid, pid: j.pid, nome: j.nome, cor: c, humano: true, crianca: Boolean(j.crianca) });
  }
  const robos = [];
  const alvo = comRobos ? Math.max(humanos.length, Math.min(MAX_KARTS, totalKarts)) : humanos.length;
  for (let i = 0; i < CORES.length && humanos.length + robos.length < alvo; i++) {
    if (usadas.has(i)) continue;
    robos.push({ id: 'bot-' + i, pid: '', nome: CORES[i].robo, cor: i, humano: false, crianca: false });
  }
  const ordem = [...humanos.filter((h) => h.crianca), ...robos, ...humanos.filter((h) => !h.crianca)];
  return ordem.map((k, slot) => ({ ...k, slot }));
}

/** Registro dos últimos eventos (banana, casco, acerto) de um aparelho. Reenvia os últimos N para não perder nada. */
export function criarRegistroEventos(origem, guardar = 12) {
  let n = 0;
  const lista = [];
  return {
    novo(ev) {
      n += 1;
      const e = { ...ev, u: origem + '#' + n };
      lista.push(e);
      if (lista.length > guardar) lista.shift();
      return e;
    },
    get lista() {
      return lista.slice();
    },
    limpar() {
      lista.length = 0;
    }
  };
}

/** Filtra eventos já vistos (pelo campo u). Devolve só os novos. */
export function criarFiltroEventos(max = 400) {
  const vistos = new Set();
  return function novos(lista) {
    const out = [];
    for (const e of lista || []) {
      if (!e || !e.u || vistos.has(e.u)) continue;
      vistos.add(e.u);
      if (vistos.size > max) vistos.delete(vistos.values().next().value);
      out.push(e);
    }
    return out;
  };
}

/** Quando a TV encerra a corrida: todos os humanos chegaram, ou 30 s depois do primeiro humano chegar, ou 6 min. */
export function corridaAcabou({ humanos, tempo, primeiroHumanoChegouEm }) {
  const ativos = humanos.filter((h) => !h.sumiu);
  if (ativos.length === 0) return tempo > 3;
  if (ativos.every((h) => h.f)) return true;
  if (primeiroHumanoChegouEm != null && tempo - primeiroHumanoChegouEm > 30) return true;
  return tempo > 360;
}

export function formatarTempo(seconds) {
  if (!Number.isFinite(seconds)) return '--:--.-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}
