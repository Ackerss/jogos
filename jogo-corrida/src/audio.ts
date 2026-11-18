// Sons sintetizados na hora (Web Audio): nada para baixar, leve para a TV.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
try {muted = localStorage.getItem('corrida-som') === 'off';} catch {/* opcional */}

export function isMuted() {return muted;}
export function setMuted(v: boolean) {
  muted = v;
  try {localStorage.setItem('corrida-som', v ? 'off' : 'on');} catch {/* opcional */}
  if (master) master.gain.value = v ? 0 : 0.8;
  if (v) stopMusic();
}
/** Precisa de um toque/clique do usuário antes (regra dos navegadores). */
export function unlock() {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      if (!C) return;
      ctx = new C(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {/* sem som */}
}
export function audioReady() {return !!ctx && ctx.state === 'running';}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, at = 0, slideTo = 0) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, vol = 0.1, at = 0, hp = 1000) {
  if (!ctx || !master || muted) return;
  if (!noiseBuf) {noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;}
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}

export const sfx = {
  count: () => tone(523, 0.18, 'square', 0.14),
  go: () => {tone(1046, 0.5, 'square', 0.16); tone(1318, 0.5, 'triangle', 0.1);},
  pop: (slot: number, progress: number) => tone(260 + slot * 40 + progress * 520, 0.05, 'triangle', 0.05),
  overtake: () => {noise(0.25, 0.08, 0, 2500); tone(500, 0.2, 'sine', 0.06, 0, 1100);},
  slip: () => {tone(700, 0.45, 'sawtooth', 0.07, 0, 120); noise(0.2, 0.05, 0.05, 600);},
  red: () => {tone(220, 0.35, 'square', 0.12); tone(185, 0.35, 'square', 0.08, 0.05);},
  green: () => {tone(784, 0.12, 'triangle', 0.14); tone(1046, 0.2, 'triangle', 0.14, 0.1);},
  cross: () => {[784, 988, 1175].forEach((f, i) => tone(f, 0.16, 'square', 0.1, i * 0.08));},
  fanfare: () => {[523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i === 5 ? 0.7 : 0.18, 'square', 0.11, i * 0.15)); noise(0.6, 0.04, 0.9, 3000);},
  click: () => tone(880, 0.05, 'triangle', 0.08),
  join: () => {tone(660, 0.1, 'triangle', 0.1); tone(990, 0.15, 'triangle', 0.1, 0.09);},
};

// Musiquinha de corrida (sequenciador simples). No modo Sinal Verde ela para no vermelho.
const BASS = [131, 0, 131, 196, 0, 196, 175, 0, 147, 0, 147, 196, 0, 220, 196, 0];
const LEAD = [523, 0, 659, 0, 784, 0, 659, 0, 587, 0, 698, 0, 880, 784, 698, 0, 523, 0, 659, 0, 784, 0, 1046, 0, 988, 0, 880, 0, 784, 0, 0, 0];
let musicTimer: ReturnType<typeof setInterval> | undefined;
let step = 0;
let nextAt = 0;
export function startMusic() {
  if (musicTimer || !ctx || muted) return;
  step = 0; nextAt = ctx.currentTime + 0.05;
  musicTimer = setInterval(() => {
    if (!ctx) return;
    while (nextAt < ctx.currentTime + 0.2) {
      const at = nextAt - ctx.currentTime;
      const b = BASS[step % 16]!; const l = LEAD[step % 32]!;
      if (b) tone(b, 0.12, 'triangle', 0.09, at);
      if (l) tone(l, 0.1, 'square', 0.035, at);
      if (step % 2 === 0) noise(0.03, step % 4 === 0 ? 0.04 : 0.02, at, 6000);
      step++; nextAt += 0.125;
    }
  }, 60);
}
export function stopMusic() {if (musicTimer) {clearInterval(musicTimer); musicTimer = undefined;}}
export function musicOn() {return !!musicTimer;}

// Locutor com a voz do próprio aparelho (quando houver voz em português).
let voiceOk = true;
try {voiceOk = localStorage.getItem('corrida-locutor') !== 'off';} catch {/* opcional */}
export function announcerOn() {return voiceOk && !muted && 'speechSynthesis' in window;}
export function setAnnouncer(v: boolean) {voiceOk = v; try {localStorage.setItem('corrida-locutor', v ? 'on' : 'off');} catch {/* */} if (!v) try {speechSynthesis.cancel();} catch {/* */}}
export function announcerPref() {return voiceOk;}
export function say(text: string, urgent = false) {
  if (!announcerOn()) return;
  try {
    if (speechSynthesis.speaking && !urgent) return;
    if (urgent) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR'; u.rate = 1.12; u.pitch = 1.1; u.volume = 1;
    const v = speechSynthesis.getVoices().find(x => /^pt[-_]BR/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^pt/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {/* sem voz */}
}
