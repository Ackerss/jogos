import * as THREE from 'three';
import { createTrackSystem } from './track/TrackSystem.js';
import { createKart, createSkidMarks } from './kart/KartSystem.js';
import { createItemSystem, createAIController } from './items/ItemAndAISystem.js';
import { CORES, criarRelogio, preverEstado, classificar, montarGrid, criarRegistroEventos, criarFiltroEventos, corridaAcabou } from './net/multi.js';
import { criarTelasTv } from './ui/tv.js';
import { criarTelasCelular } from './ui/celular.js';

// =========================================================================
// Modo da página: 'tv' (TV: sala + transmissão ao vivo), 'celular' (cada jogador corre no seu)
// ou 'solo' (jogo original: um jogador no PC/TV com teclado ou controle)
// =========================================================================
const URLQ = new URLSearchParams(window.location.search);
const MODE = (() => {
  const m = URLQ.get('modo');
  if (URLQ.has('sala')) return 'celular';
  if (m === 'solo' || m === 'tv' || m === 'celular') return m;
  let fone = false;
  try {
    fone = matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 600;
  } catch {
    // navegador antigo
  }
  return fone ? 'celular' : 'tv';
})();
const NET = MODE !== 'solo';
document.documentElement.dataset.modo = MODE;
// Identificador curto deste aparelho (para as bananas/cascos terem o mesmo id em todos os aparelhos)
const DEV = Math.random().toString(36).slice(2, 6);

const TOTAL_LAPS = 3;

// Paleta de alto contraste: fácil de distinguir entre si e contra o asfalto/grama
const KART_ROSTER = [
  {
    id: 'player',
    name: 'Você',
    number: '1',
    badgeLabel: 'VOCÊ #1',
    color: '#dc2626',
    accentColor: '#ffffff',
    isPlayer: true,
    difficulty: 1.0
  },
  {
    id: 'ai-1',
    name: 'Trovão Azul',
    number: '7',
    badgeLabel: 'AZUL #7',
    color: '#0284c7',
    accentColor: '#fde047',
    isPlayer: false,
    difficulty: 1.02
  },
  {
    id: 'ai-2',
    name: 'Sol Dourado',
    number: '22',
    badgeLabel: 'OURO #22',
    color: '#f59e0b',
    accentColor: '#18181b',
    isPlayer: false,
    difficulty: 0.98
  },
  {
    id: 'ai-3',
    name: 'Fúria Rosa',
    number: '88',
    badgeLabel: 'ROSA #88',
    color: '#e11d98',
    accentColor: '#f8fafc',
    isPlayer: false,
    difficulty: 0.94
  }
];

const ITEM_UI = {
  banana: { icon: '🍌', name: 'Banana', hint: 'Shift / E para largar atrás' },
  shell: { icon: '🐢', name: 'Tartaruga', hint: 'Shift / E para disparar' },
  turbo: { icon: '🚀', name: 'Turbo', hint: 'Shift / E para acelerar' }
};

// Elementos da DOM
const canvas = document.getElementById('game-canvas');
const hudEl = document.getElementById('hud');
const startOverlayEl = document.getElementById('start-overlay');
const finishOverlayEl = document.getElementById('finish-overlay');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnAudio = document.getElementById('btn-audio');

const hudRankEl = document.getElementById('hud-rank');
const hudLapEl = document.getElementById('hud-lap');
const hudTimeEl = document.getElementById('hud-time');
const hudItemCardEl = document.getElementById('hud-item-card');
const hudItemIconEl = document.getElementById('hud-item-icon');
const hudItemNameEl = document.getElementById('hud-item-name');
const hudItemHintEl = document.getElementById('hud-item-hint');
const itemToastEl = document.getElementById('item-toast');
const hudSpeedEl = document.getElementById('hud-speed');
const hudSpeedFillEl = document.getElementById('hud-speed-fill');
const hudDriftStatusEl = document.getElementById('hud-drift-status');
const hudDriftFillEl = document.getElementById('hud-drift-fill');
const finishTitleEl = document.getElementById('finish-title');
const finishSubtitleEl = document.getElementById('finish-subtitle');
const finishStandingsEl = document.getElementById('finish-standings');

const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

const isQaMode = new URLSearchParams(window.location.search).get('qa') === '1';
const qaPanelEl = document.getElementById('qa-panel');
const qaTelemetryEl = document.getElementById('qa-telemetry');
if (isQaMode && qaPanelEl) {
  qaPanelEl.classList.add('visible');
}

let qaAirborneSeen = false;
let qaLandedAfterJump = false;
let qaPeakJumpHeight = 0;
let qaPeakAirTime = 0;
let qaLastUsedItem = 'none';
let qaPlayerPickups = 0;
let qaPlayerBoxesSmashed = 0;
let fpsSmoothed = 60;

// =========================================================================
// Áudio Arcade Sintetizado (Web Audio API — zero arquivos externos)
// =========================================================================
function createSoundEngine() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;

  function ensureContext() {
    if (muted) return null;
    try {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        ctx = new AudioCtx();
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!engineOsc && ctx) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 58;

        engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 260;

        engineGain = ctx.createGain();
        engineGain.gain.value = 0.0;

        engineOsc.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(ctx.destination);
        engineOsc.start();
      }
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(freqStart, freqEnd, duration, type = 'sine', volume = 0.12, delay = 0) {
    const c = ensureContext();
    if (!c) return;
    try {
      const now = c.currentTime + delay;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // ignore audio errors
    }
  }

  return {
    unlock() {
      ensureContext();
    },
    toggleMute() {
      muted = !muted;
      if (engineGain && ctx) {
        engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      }
      return muted;
    },
    updateEngine(speed, isBoosting, isRacing) {
      if (!ctx || !engineOsc || !engineGain || !engineFilter) return;
      const now = ctx.currentTime;
      if (muted || !isRacing) {
        engineGain.gain.setTargetAtTime(0, now, 0.06);
        return;
      }
      const norm = THREE.MathUtils.clamp(Math.abs(speed) / 48, 0, 1.25);
      const targetFreq = 56 + norm * 125 + (isBoosting ? 42 : 0);
      const targetCutoff = 220 + norm * 520 + (isBoosting ? 350 : 0);
      const targetVol = 0.018 + norm * 0.026;
      engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
      engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.05);
      engineGain.gain.setTargetAtTime(targetVol, now, 0.06);
    },
    playPickup() {
      tone(523.25, 659.25, 0.09, 'triangle', 0.14, 0);
      tone(659.25, 1046.5, 0.16, 'triangle', 0.15, 0.07);
    },
    playBoxSmash() {
      tone(320, 180, 0.09, 'square', 0.07, 0);
    },
    playBoost() {
      tone(240, 820, 0.28, 'sawtooth', 0.11, 0);
      tone(480, 1180, 0.24, 'triangle', 0.08, 0.04);
    },
    playShell() {
      tone(640, 210, 0.16, 'square', 0.10, 0);
    },
    playBanana() {
      tone(420, 290, 0.12, 'sine', 0.10, 0);
    },
    playSpinout() {
      tone(520, 140, 0.35, 'sawtooth', 0.11, 0);
    },
    playLanding() {
      tone(140, 52, 0.12, 'sine', 0.12, 0);
    },
    playCountBeep() {
      tone(440, 440, 0.18, 'square', 0.09, 0);
    },
    playGo() {
      tone(880, 880, 0.45, 'square', 0.1, 0);
      tone(1320, 1320, 0.45, 'triangle', 0.06, 0);
    },
    playLap() {
      tone(523.25, 523.25, 0.1, 'triangle', 0.12, 0);
      tone(659.25, 659.25, 0.1, 'triangle', 0.12, 0.1);
      tone(783.99, 783.99, 0.18, 'triangle', 0.12, 0.2);
    },
    playFinalLap() {
      [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(f, f, 0.13, 'square', 0.08, i * 0.11));
    },
    playFinish(good) {
      const notes = good ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5] : [392, 349.23, 329.63, 261.63];
      notes.forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.13, i * 0.14));
    },
    playWallHit(strength = 1) {
      tone(130, 55, 0.14, 'square', Math.min(0.12, 0.05 + strength * 0.004), 0);
    },
    playRouletteTick() {
      tone(1400, 1200, 0.03, 'square', 0.04, 0);
    },
    playRespawn() {
      tone(300, 900, 0.3, 'sine', 0.1, 0);
    },
    playWrongWay() {
      tone(330, 330, 0.12, 'square', 0.07, 0);
      tone(262, 262, 0.18, 'square', 0.07, 0.14);
    }
  };
}

const sound = createSoundEngine();

// =========================================================================
// Renderer, Céu Realista com Sol e PMREM Environment Map (Reflexos PBR)
// =========================================================================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// Qualidade: celular até 1,5× (economiza bateria); TV no máximo 1080 linhas; PC até 2×.
const QUALITY = {
  ratio: MODE === 'celular'
    ? Math.min(window.devicePixelRatio || 1, 1.5)
    : MODE === 'tv'
      ? Math.min((window.devicePixelRatio || 1), 1080 / Math.max(1, window.innerHeight))
      : Math.min(window.devicePixelRatio || 1, 2),
  level: 0
};
renderer.setPixelRatio(QUALITY.ratio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#c2dcef', 170, 560);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.25, 1100);

const SUN_OFFSET = new THREE.Vector3(95, 115, 70);
const SUN_DIR = SUN_OFFSET.clone().normalize();

// Skydome procedural com gradiente atmosférico realista + disco solar e halo
function createRealisticSkyTexture(sunDir) {
  const w = 1024;
  const h = 512;
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = w;
  skyCanvas.height = h;
  const ctx = skyCanvas.getContext('2d');

  // Gradiente vertical do zênite até o horizonte e solo
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#1458b0');   // Zênite azul profundo realista
  grad.addColorStop(0.24, '#3486db');  // Céu médio vivo
  grad.addColorStop(0.43, '#8ac6f2');  // Céu baixo
  grad.addColorStop(0.50, '#d8ecfb');  // Brilho atmosférico do horizonte
  grad.addColorStop(0.54, '#799968');  // Reflexo da paisagem abaixo do horizonte
  grad.addColorStop(1.0, '#36522a');   // Solo distante
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Converte direção do sol para coordenadas UV da esfera equiretangular
  const phi = Math.atan2(sunDir.z, sunDir.x);
  const theta = Math.acos(THREE.MathUtils.clamp(sunDir.y, -1, 1));
  const sunU = (phi / (Math.PI * 2) + 0.5 + 0.25) % 1;
  const sunV = theta / Math.PI;
  const sx = sunU * w;
  const sy = sunV * h;

  // Halo solar quente amplo
  const outerHalo = ctx.createRadialGradient(sx, sy, 4, sx, sy, 170);
  outerHalo.addColorStop(0.0, 'rgba(255, 252, 232, 0.98)');
  outerHalo.addColorStop(0.12, 'rgba(255, 241, 194, 0.72)');
  outerHalo.addColorStop(0.35, 'rgba(255, 224, 155, 0.26)');
  outerHalo.addColorStop(1.0, 'rgba(255, 220, 150, 0.0)');
  ctx.fillStyle = outerHalo;
  ctx.fillRect(0, 0, w, h);

  // Núcleo do sol
  ctx.beginPath();
  ctx.arc(sx, sy, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#fffef2';
  ctx.fill();

  // Nuvenzinhas sutis de alta altitude (cirrus) para enriquecer o reflexo no verniz
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let i = 0; i < 28; i++) {
    const cx = ((i * 197 + 45) % w);
    const cy = 90 + ((i * 53) % 130);
    const rx = 40 + ((i * 29) % 75);
    const ry = 5 + ((i * 13) % 12);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(skyCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

const skyTexture = createRealisticSkyTexture(SUN_DIR);

// Céu realista em shader: degradê atmosférico, sol com brilho e nuvens procedurais
// que se movem devagar. 1 único objeto, sem texturas grandes (leve para a TV).
const SKY_QUALITY = { octaves: 5 };
const skyUniforms = {
  uSunDir: { value: SUN_DIR.clone() },
  uTime: { value: 0 },
  uCloudCover: { value: 0.47 }
};
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(560, 48, 24),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform float uTime;
      uniform float uCloudCover;
      varying vec3 vDir;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < ${SKY_QUALITY.octaves}; i++) {
          v += a * noise(p);
          p = m * p;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        float sd = max(dot(d, normalize(uSunDir)), 0.0);

        // Degradê do céu (cores em sRGB, convertidas para linear no final)
        vec3 zenith = vec3(0.16, 0.40, 0.80);
        vec3 midSky = vec3(0.38, 0.62, 0.90);
        vec3 horizon = vec3(0.76, 0.87, 0.95);
        float hp = clamp(h, 0.0, 1.0);
        vec3 col = mix(horizon, midSky, smoothstep(0.0, 0.22, hp));
        col = mix(col, zenith, smoothstep(0.18, 0.85, hp));
        // Abaixo do horizonte: névoa clara (fica atrás das montanhas)
        col = mix(col, vec3(0.70, 0.80, 0.86), smoothstep(0.0, -0.08, h));
        // Brilho do sol espalhado na atmosfera
        col += vec3(1.0, 0.82, 0.55) * pow(sd, 6.0) * 0.28;
        col += vec3(1.0, 0.95, 0.85) * pow(sd, 90.0) * 0.55;

        // Nuvens cúmulos projetadas num "teto" de nuvens
        if (h > 0.0) {
          vec2 uv = d.xz / (h + 0.12) * 1.15;
          vec2 wind = vec2(uTime * 0.010, uTime * 0.0035);
          float base = fbm(uv * 0.55 + wind * 0.6);
          float detail = fbm(uv * 1.7 + wind);
          float n = base * 0.68 + detail * 0.42;
          float c = smoothstep(uCloudCover, uCloudCover + 0.22, n);
          // Luz: compara com a densidade um pouco na direção do sol
          float nSun = fbm((uv + normalize(uSunDir.xz) * 0.10) * 0.55 + wind * 0.6) * 0.68 + detail * 0.42;
          float lit = clamp(0.62 + (n - nSun) * 4.0, 0.0, 1.0);
          float thick = smoothstep(uCloudCover + 0.1, uCloudCover + 0.45, n);
          vec3 shadowCol = vec3(0.58, 0.64, 0.74);
          vec3 sunCol = vec3(1.0, 0.99, 0.96);
          vec3 cloudCol = mix(sunCol, shadowCol, thick * (1.0 - lit) * 0.9 + thick * 0.18);
          // Borda prateada perto do sol
          cloudCol += vec3(1.0, 0.9, 0.7) * pow(sd, 5.0) * 0.35 * (1.0 - thick);
          float fade = smoothstep(0.0, 0.16, h);
          // Perto do horizonte as nuvens somem na névoa
          cloudCol = mix(horizon, cloudCol, smoothstep(0.0, 0.3, h));
          col = mix(col, cloudCol, c * fade);
        }

        // Disco do sol (por cima das nuvens finas)
        col += vec3(1.0, 0.97, 0.9) * smoothstep(0.99955, 0.99975, sd) * 1.6;

        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  })
);
skyDome.renderOrder = -10;
skyDome.frustumCulled = false;
scene.add(skyDome);

// Environment Map PBR via PMREMGenerator para reflexos reais (clearcoat, cromo, asfalto, cubos)
function buildEnvironmentMap() {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();

  const envDome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide })
  );
  envScene.add(envDome);

  // Painéis luminosos extras na cena de ambiente para highlights automotivos nítidos
  const sunPanel = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 12, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 4.1, 3.4) })
  );
  sunPanel.position.copy(SUN_DIR).multiplyScalar(32);
  envScene.add(sunPanel);

  const skyStrip = new THREE.Mesh(
    new THREE.BoxGeometry(36, 4, 4),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.75, 2.2) })
  );
  skyStrip.position.set(-14, 24, -18);
  envScene.add(skyStrip);

  const rt = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();
  return rt.texture;
}

scene.environment = buildEnvironmentMap();

// Iluminação cinematográfica ensolarada
const hemiLight = new THREE.HemisphereLight('#dbeafe', '#4d7c0f', 0.92);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight('#fff6e0', 2.15);
sunLight.position.copy(SUN_OFFSET);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(MODE === 'celular' ? 1024 : 2048, MODE === 'celular' ? 1024 : 2048);
sunLight.shadow.camera.near = 15;
sunLight.shadow.camera.far = 320;
const shadowBounds = 105; // Frustum mais focado = sombras muito mais nítidas
sunLight.shadow.camera.left = -shadowBounds;
sunLight.shadow.camera.right = shadowBounds;
sunLight.shadow.camera.top = shadowBounds;
sunLight.shadow.camera.bottom = -shadowBounds;
sunLight.shadow.bias = -0.00045;
sunLight.shadow.normalBias = 0.035;
scene.add(sunLight);
scene.add(sunLight.target);

const fillLight = new THREE.DirectionalLight('#93c5fd', 0.48);
fillLight.position.set(-90, 60, -80);
scene.add(fillLight);

// =========================================================================
// Níveis de dificuldade (o modo Fácil foi pensado para crianças pequenas)
// =========================================================================
const DIFFICULTIES = {
  facil: {
    label: 'Fácil',
    botSpeed: 0.88,
    aheadSlow: 0.2,
    behindBoost: 0.1,
    botItems: false,
    playerSlot: 0,
    steerAssist: true,
    autoAccel: true,
    spinoutScale: 0.55,
    luckyItems: true,
    rocketStartFree: true
  },
  normal: {
    label: 'Normal',
    botSpeed: 0.94,
    aheadSlow: 0.1,
    behindBoost: 0.04,
    botItems: true,
    playerSlot: 3,
    steerAssist: false,
    autoAccel: false,
    spinoutScale: 1,
    luckyItems: false,
    rocketStartFree: false
  },
  dificil: {
    label: 'Difícil',
    botSpeed: 1.03,
    aheadSlow: 0.03,
    behindBoost: 0.08,
    botItems: true,
    playerSlot: 3,
    steerAssist: false,
    autoAccel: false,
    spinoutScale: 1,
    luckyItems: false,
    rocketStartFree: false
  }
};

const SETTINGS_KEY = 'kartacker.config';
const settings = { difficulty: 'normal', autoAccel: false };
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  if (saved && DIFFICULTIES[saved.difficulty]) settings.difficulty = saved.difficulty;
  if (saved && typeof saved.autoAccel === 'boolean') settings.autoAccel = saved.autoAccel;
} catch {
  // sem armazenamento: usa padrão
}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignora
  }
}
function currentDifficulty() {
  return DIFFICULTIES[settings.difficulty] || DIFFICULTIES.normal;
}

// =========================================================================
// Elementos extras do HUD
// =========================================================================
const bigBannerEl = document.getElementById('big-banner');
const speedLinesEl = document.getElementById('speed-lines');
const hitFlashEl = document.getElementById('hit-flash');
const pauseOverlayEl = document.getElementById('pause-overlay');
const wrongWayEl = document.getElementById('wrong-way');
const hudLapTimeEl = document.getElementById('hud-lap-time');
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
const diffButtons = Array.from(document.querySelectorAll('[data-difficulty]'));
const autoAccelToggle = document.getElementById('opt-auto-accel');
const finishBestLapEl = document.getElementById('finish-best-lap');
const btnMenu = document.getElementById('btn-menu');
const btnResume = document.getElementById('btn-resume');
const btnPauseRestart = document.getElementById('btn-pause-restart');
const btnPauseMenu = document.getElementById('btn-pause-menu');

// =========================================================================
// Toast, banner central e efeitos de tela
// =========================================================================
let toastTimeout = null;
let popTimeout = null;
let bannerTimeout = null;

function showToast(text) {
  if (!itemToastEl) return;
  itemToastEl.textContent = text;
  itemToastEl.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    itemToastEl.classList.remove('show');
  }, 1350);
}

function flashItemSlot() {
  if (!hudItemCardEl) return;
  hudItemCardEl.classList.add('pop-flash');
  if (popTimeout) clearTimeout(popTimeout);
  popTimeout = setTimeout(() => {
    hudItemCardEl.classList.remove('pop-flash');
  }, 360);
}

function showBanner(text, variant = '', durationMs = 1400) {
  if (!bigBannerEl) return;
  bigBannerEl.textContent = text;
  bigBannerEl.className = `show ${variant}`;
  // reinicia a animação
  void bigBannerEl.offsetWidth;
  bigBannerEl.classList.add('pop');
  if (bannerTimeout) clearTimeout(bannerTimeout);
  if (durationMs > 0) {
    bannerTimeout = setTimeout(() => {
      bigBannerEl.className = '';
    }, durationMs);
  }
}

function hideBanner() {
  if (!bigBannerEl) return;
  if (bannerTimeout) clearTimeout(bannerTimeout);
  bigBannerEl.className = '';
}

function flashScreen(color = 'rgba(239, 68, 68, 0.45)') {
  if (!hitFlashEl) return;
  hitFlashEl.style.background = `radial-gradient(circle at center, transparent 35%, ${color} 100%)`;
  hitFlashEl.classList.remove('on');
  void hitFlashEl.offsetWidth;
  hitFlashEl.classList.add('on');
}

let cameraShake = 0;
function addShake(amount) {
  cameraShake = Math.min(1.2, cameraShake + amount);
}

// Confete simples em canvas 2D (leve, só aparece no pódio)
const confetti = [];
let confettiTime = 0;
function launchConfetti() {
  if (!confettiCanvas || !confettiCtx) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confetti.length = 0;
  const colors = ['#facc15', '#ef4444', '#38bdf8', '#4ade80', '#e879f9', '#ffffff', '#f97316'];
  for (let i = 0; i < 170; i++) {
    confetti.push({
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * confettiCanvas.height * 0.6,
      vx: (Math.random() - 0.5) * 120,
      vy: 120 + Math.random() * 180,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 10,
      w: 7 + Math.random() * 8,
      h: 4 + Math.random() * 5,
      color: colors[i % colors.length]
    });
  }
  confettiTime = 5.5;
  confettiCanvas.style.display = 'block';
}
function updateConfetti(dt) {
  if (confettiTime <= 0 || !confettiCtx) return;
  confettiTime -= dt;
  const w = confettiCanvas.width;
  const h = confettiCanvas.height;
  confettiCtx.clearRect(0, 0, w, h);
  for (const c of confetti) {
    c.x += c.vx * dt + Math.sin(c.y * 0.02) * 0.6;
    c.y += c.vy * dt;
    c.rot += c.vr * dt;
    if (c.y > h + 20 && confettiTime > 1.5) {
      c.y = -10;
      c.x = Math.random() * w;
    }
    confettiCtx.save();
    confettiCtx.translate(c.x, c.y);
    confettiCtx.rotate(c.rot);
    confettiCtx.fillStyle = c.color;
    confettiCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    confettiCtx.restore();
  }
  if (confettiTime <= 0) {
    confettiCtx.clearRect(0, 0, w, h);
    confettiCanvas.style.display = 'none';
  }
}

// =========================================================================
// Pista, Karts, Itens e IAs
// =========================================================================
const track = createTrackSystem(scene);
const skidMarks = createSkidMarks(scene);
const karts = [];
let playerKart = null;
let aiControllers = [];
let playerAutopilot = null;
let debugAutopilot = false;

// Roleta do item (efeito "caça-níquel" antes de mostrar o item sorteado)
const ROULETTE_TIME = 0.85;
let rouletteTimer = 0;
let rouletteTickAcc = 0;
let rouletteIndex = 0;
const ROULETTE_ICONS = ['🍌', '🐢', '🚀'];

const itemSystem = createItemSystem(scene, track, karts, {
  onSpawn(ev) {
    netLocalSpawn(ev);
  },
  onEntityHit(id, kart, type, ownerId) {
    netLocalHit(id, kart, type, ownerId);
  },
  onItemCollected(kart, itemType) {
    if (kart.isPlayer) {
      qaPlayerPickups += 1;
      rouletteTimer = ROULETTE_TIME;
      rouletteTickAcc = 0;
      flashItemSlot();
      sound.playPickup();
      setTimeout(() => {
        const ui = ITEM_UI[itemType];
        if (raceState === 'racing' && playerKart && playerKart.currentItem === itemType) {
          showToast(ui ? `${ui.icon} ${ui.name.toUpperCase()}!` : 'ITEM!');
          flashItemSlot();
        }
      }, ROULETTE_TIME * 1000);
    }
  },
  onBoxSmashed(kart) {
    if (kart.isPlayer) {
      qaPlayerBoxesSmashed += 1;
      sound.playBoxSmash();
    }
  },
  onItemUsed(kart, itemType) {
    if (kart.isPlayer) {
      qaLastUsedItem = itemType || 'none';
      if (itemType === 'turbo') {
        sound.playBoost();
        addShake(0.15);
      } else if (itemType === 'shell') sound.playShell();
      else if (itemType === 'banana') sound.playBanana();
    }
  },
  onSpinoutHit(targetKart) {
    if (targetKart.isPlayer) {
      showToast('💥 RODOU!');
      sound.playSpinout();
      addShake(0.7);
      flashScreen();
    }
  }
}, { idPrefix: DEV + '-' });

let raceState = 'menu'; // 'menu' | 'countdown' | 'racing' | 'finishing' | 'finished'
let paused = false;
let raceTime = 0;
let totalElapsed = 0;
let countdownTime = 0;
let countdownStep = -1;
let finishingTimer = 0;
let playerFinishRank = 0;
let lastRank = 0;

// Dados de volta por kart (tempo de cada volta)
const lapMeta = new Map();
// Anti-travamento por kart
const stuckMeta = new Map();
// Largada turbo
let throttlePressedAt = -1;
let wrongWayTimer = 0;
let wrongWayShown = false;
let playerStuckTimer = 0;

const COUNTDOWN_TOTAL = 3.6;
const GO_TIME = 3.0;

// Pré-cálculo do minimapa
const minimapPoints = [];
let minimapTransform = null;
function initMinimapGeometry() {
  minimapPoints.length = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const samples = 180;
  for (let i = 0; i < samples; i++) {
    const f = track.getTrackFrame(i / samples);
    minimapPoints.push({ x: f.point.x, z: f.point.z });
    if (f.point.x < minX) minX = f.point.x;
    if (f.point.x > maxX) maxX = f.point.x;
    if (f.point.z < minZ) minZ = f.point.z;
    if (f.point.z > maxZ) maxZ = f.point.z;
  }
  const pad = 14;
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  minimapTransform = {
    toCanvas(x, z) {
      return {
        x: w * 0.5 + (x - cx) * scale,
        y: h * 0.5 + (z - cz) * scale
      };
    }
  };
}
initMinimapGeometry();

function spawnAllKarts() {
  for (const k of karts) {
    k.dispose();
  }
  karts.length = 0;
  aiControllers = [];
  lapMeta.clear();
  stuckMeta.clear();
  skidMarks.clear();

  const diff = currentDifficulty();
  const spawns = track.getSpawnTransforms(KART_ROSTER.length);
  // Ordem do grid: o jogador larga na posição definida pela dificuldade
  const slotOrder = [];
  const playerSlot = Math.min(diff.playerSlot, KART_ROSTER.length - 1);
  let botSlot = 0;
  for (let i = 0; i < KART_ROSTER.length; i++) {
    if (KART_ROSTER[i].isPlayer) {
      slotOrder.push(playerSlot);
    } else {
      if (botSlot === playerSlot) botSlot += 1;
      slotOrder.push(botSlot);
      botSlot += 1;
    }
  }

  for (let i = 0; i < KART_ROSTER.length; i++) {
    const cfg = KART_ROSTER[i];
    const startTransform = spawns[slotOrder[i]] || spawns[0];
    const kart = createKart(scene, track, {
      id: cfg.id,
      name: cfg.name,
      number: cfg.number,
      badgeLabel: cfg.badgeLabel,
      color: cfg.color,
      accentColor: cfg.accentColor,
      isPlayer: cfg.isPlayer,
      startTransform,
      skidMarks
    });
    karts.push(kart);
    lapMeta.set(kart, { lap: 1, lapStart: 0, laps: [], best: Infinity });
    stuckMeta.set(kart, { slowTimer: 0 });
    if (cfg.isPlayer) {
      playerKart = kart;
      kart.spinoutScale = diff.spinoutScale;
      kart.luckyItems = diff.luckyItems;
    } else {
      kart.topSpeedScale = diff.botSpeed;
      aiControllers.push({
        kart,
        controller: createAIController(kart, track, itemSystem, karts, cfg.difficulty, {
          baseSpeed: diff.botSpeed,
          aheadSlow: diff.aheadSlow,
          behindBoost: diff.behindBoost,
          useItems: diff.botItems
        })
      });
    }
  }

  // Piloto automático do jogador: usado no modo Fácil (ajuda a virar) e depois da chegada
  playerAutopilot = createAIController(playerKart, track, itemSystem, karts, 1.0, {
    useItems: false,
    controlSpeed: false
  });
}

spawnAllKarts();

// Estado da Câmera
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const camUp = new THREE.Vector3(0, 1, 0);
const desiredCamPos = new THREE.Vector3();
const desiredCamTarget = new THREE.Vector3();
const worldUpVec = new THREE.Vector3(0, 1, 0);
const shakeOffset = new THREE.Vector3();

function snapCameraToPlayer() {
  if (!playerKart) return;
  const anchor = playerKart.getCameraAnchor();
  camPos
    .copy(anchor.position)
    .addScaledVector(anchor.forward, -7.8)
    .addScaledVector(anchor.up, 3.3);
  camTarget
    .copy(anchor.position)
    .addScaledVector(anchor.forward, 10.5)
    .addScaledVector(anchor.up, 1.3);
  camUp.copy(anchor.up).lerp(worldUpVec, 0.35).normalize();

  camera.position.copy(camPos);
  camera.up.copy(camUp);
  camera.lookAt(camTarget);
  camera.fov = 62;
  camera.updateProjectionMatrix();
}

function placeSunAround(position) {
  skyDome.position.copy(camera.position);
  sunLight.position.set(position.x + SUN_OFFSET.x, position.y + SUN_OFFSET.y, position.z + SUN_OFFSET.z);
  sunLight.target.position.copy(position);
  sunLight.target.updateMatrixWorld();
}

// Câmera de vitrine no menu: passeia devagar na frente do grid de largada
const menuCenter = new THREE.Vector3();
function updateMenuCamera() {
  const refKart = playerKart || karts[0];
  if (!refKart || karts.length === 0) return;
  menuCenter.set(0, 0, 0);
  for (const k of karts) menuCenter.add(k.position);
  menuCenter.multiplyScalar(1 / karts.length);
  const fx = Math.sin(refKart.heading);
  const fz = Math.cos(refKart.heading);
  const sway = Math.sin(totalElapsed * 0.22);
  camera.position.set(
    menuCenter.x + fx * 13 + fz * sway * 7,
    menuCenter.y + 3.2 + Math.sin(totalElapsed * 0.31) * 0.8,
    menuCenter.z + fz * 13 - fx * sway * 7
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(menuCenter.x, menuCenter.y + 1.1, menuCenter.z);
  camera.fov = 55;
  camera.updateProjectionMatrix();
  camPos.copy(camera.position);
  placeSunAround(menuCenter);
}

// Câmera de chegada: gira em volta do kart do jogador
function updateFinishCamera(dt, focusKart = playerKart) {
  if (!focusKart) return;
  const anchor = focusKart.getCameraAnchor();
  const ang = Math.atan2(anchor.forward.x, anchor.forward.z) + Math.PI * 0.85 + finishingTimer * 0.35;
  desiredCamPos.set(
    anchor.position.x + Math.sin(ang) * 8,
    anchor.position.y + 3.2,
    anchor.position.z + Math.cos(ang) * 8
  );
  camPos.lerp(desiredCamPos, 1 - Math.exp(-4 * dt));
  camTarget.lerp(anchor.position, 1 - Math.exp(-8 * dt));
  camera.position.copy(camPos);
  camera.up.set(0, 1, 0);
  camera.lookAt(camTarget.x, camTarget.y + 1, camTarget.z);
  camera.fov += (58 - camera.fov) * (1 - Math.exp(-4 * dt));
  camera.updateProjectionMatrix();
  placeSunAround(anchor.position);
}

function updateCamera(dt) {
  if (!playerKart) return;
  const anchor = playerKart.getCameraAnchor();
  const boostExtra = anchor.isBoosting ? 1.15 : 0;
  const speedRatio = THREE.MathUtils.clamp(Math.abs(anchor.speed) / 45, 0, 1.3);
  const dist = 7.5 + speedRatio * 0.7 + boostExtra;
  const height = 3.25 + (playerKart.isGrounded ? 0 : 0.35);

  desiredCamPos
    .copy(anchor.position)
    .addScaledVector(anchor.forward, -dist)
    .addScaledVector(anchor.up, height);

  const camGroundInfo = track.getClosestPointInfo(desiredCamPos.x, desiredCamPos.z, playerKart.trackT);
  const minCamY = (camGroundInfo?.onRoad ? camGroundInfo.surfaceHeight : 0) + 1.15;
  if (desiredCamPos.y < minCamY) {
    desiredCamPos.y = minCamY;
  }

  desiredCamTarget
    .copy(anchor.position)
    .addScaledVector(anchor.forward, 10.5)
    .addScaledVector(anchor.up, 1.25);

  const posAlpha = 1 - Math.exp(-9.5 * dt);
  const targetAlpha = 1 - Math.exp(-13.0 * dt);
  camPos.lerp(desiredCamPos, posAlpha);
  camTarget.lerp(desiredCamTarget, targetAlpha);

  const blendedUp = worldUpVec.clone().lerp(anchor.up, 0.38).normalize();
  camUp.lerp(blendedUp, 1 - Math.exp(-8 * dt)).normalize();

  // Tremida de câmera em batidas, quedas e cascos
  cameraShake = Math.max(0, cameraShake - dt * 2.4);
  const sAmp = cameraShake * cameraShake * 0.55;
  shakeOffset.set(
    (Math.random() - 0.5) * sAmp,
    (Math.random() - 0.5) * sAmp,
    (Math.random() - 0.5) * sAmp
  );

  camera.position.copy(camPos).add(shakeOffset);
  camera.up.copy(camUp);
  camera.lookAt(camTarget);

  const targetFov = 62 + speedRatio * 5 + (anchor.isBoosting ? 9 : 0);
  camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-7 * dt));
  camera.updateProjectionMatrix();

  // Mantém skydome centrado na câmera e shadow frustum centrado no jogador
  placeSunAround(anchor.position);
}

snapCameraToPlayer();

// =========================================================================
// Entrada de Teclado + Gamepad (compatível com TV LG / controles USB/BT)
// =========================================================================
const keys = new Set();
// Botões de toque do celular (preenchidos por ui/celular.js)
const touchState = { left: false, right: false, gas: false, brake: false, drift: false, item: false, respawn: false };
let useItemQueued = false;
let respawnQueued = false;
let prevGamepadItemBtn = false;
let prevGamepadStartBtn = false;
let prevGamepadBackBtn = false;
let prevGamepadDpadX = 0;

function isRacingState() {
  return raceState === 'countdown' || raceState === 'racing';
}

function togglePause(force) {
  if (NET || !isRacingState()) return;
  paused = typeof force === 'boolean' ? force : !paused;
  pauseOverlayEl?.classList.toggle('hidden', !paused);
  if (paused) {
    sound.updateEngine(0, false, false);
    btnResume?.focus();
  }
}

function pickDifficulty(key) {
  if (!DIFFICULTIES[key]) return;
  settings.difficulty = key;
  if (key === 'facil') settings.autoAccel = true;
  saveSettings();
  refreshMenuUi();
  spawnAllKarts();
  itemSystem.reset();
}

function cycleDifficulty(dir) {
  const order = ['facil', 'normal', 'dificil'];
  const idx = order.indexOf(settings.difficulty);
  const next = order[(idx + dir + order.length) % order.length];
  pickDifficulty(next);
}

function refreshMenuUi() {
  for (const b of diffButtons) {
    b.classList.toggle('selected', b.dataset.difficulty === settings.difficulty);
  }
  if (autoAccelToggle) autoAccelToggle.checked = settings.autoAccel;
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  sound.unlock();
  if (NET) {
    // Multiplayer: teclado só dirige (para testar o celular no PC); menus são da TV/celular
    if (!e.repeat && (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE')) useItemQueued = true;
    if (!e.repeat && e.code === 'KeyT') respawnQueued = true;
    keys.add(e.code);
    return;
  }
  if (raceState === 'menu' && !e.repeat) {
    if (e.code === 'ArrowLeft') cycleDifficulty(-1);
    if (e.code === 'ArrowRight') cycleDifficulty(1);
  }
  if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) {
    togglePause();
  }
  if (!e.repeat && (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE')) {
    useItemQueued = true;
  }
  if (!e.repeat && (e.code === 'KeyT' || e.code === 'Backspace')) {
    respawnQueued = true;
  }
  if (!e.repeat && e.code === 'KeyR' && raceState !== 'menu') {
    restartRace();
  }
  if (!e.repeat && e.code === 'Enter') {
    if (raceState === 'menu') startRace();
    else if (raceState === 'finished') restartRace();
  }
  keys.add(e.code);
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

window.addEventListener('blur', () => {
  keys.clear();
  togglePause(true);
});

function readPlayerControls(applyAutoAccel = true) {
  const up = keys.has('KeyW') || keys.has('ArrowUp');
  const down = keys.has('KeyS') || keys.has('ArrowDown');
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const tq = touchState;
  let throttle = (up || tq.gas ? 1 : 0) - (down || tq.brake ? 1 : 0);
  let steer = (right || tq.right ? 1 : 0) - (left || tq.left ? 1 : 0);
  let drift = keys.has('Space') || tq.drift;
  let useItem = useItemQueued || tq.item;
  let respawn = respawnQueued || tq.respawn;
  tq.item = false;
  tq.respawn = false;
  useItemQueued = false;
  respawnQueued = false;

  // Gamepad opcional
  if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
    const pads = navigator.getGamepads();
    const gp = pads && pads[0];
    if (gp) {
      const ax = gp.axes[0] || 0;
      if (Math.abs(ax) > 0.16) steer = THREE.MathUtils.clamp(ax, -1, 1);
      if (gp.buttons[14]?.pressed) steer = -1;
      if (gp.buttons[15]?.pressed) steer = 1;
      if (gp.buttons[0]?.pressed || gp.buttons[7]?.value > 0.25 || gp.buttons[12]?.pressed) {
        throttle = 1;
      } else if (gp.buttons[1]?.pressed || gp.buttons[6]?.value > 0.25 || gp.buttons[13]?.pressed) {
        throttle = -1;
      }
      if (gp.buttons[2]?.pressed || gp.buttons[5]?.pressed) drift = true;
      const itemBtn = Boolean(gp.buttons[3]?.pressed || gp.buttons[4]?.pressed);
      if (itemBtn && !prevGamepadItemBtn) useItem = true;
      prevGamepadItemBtn = itemBtn;
      const backBtn = Boolean(gp.buttons[8]?.pressed);
      if (backBtn && !prevGamepadBackBtn) respawn = true;
      prevGamepadBackBtn = backBtn;
    }
  }

  // Acelerar sozinho: só precisa virar (o freio continua funcionando)
  if (applyAutoAccel && settings.autoAccel && throttle >= 0) {
    throttle = 1;
  }

  return { throttle, steer, drift, useItem, respawn };
}

// Gamepad no menu / pausa / resultado (Start = confirmar, direcional = escolher)
function pollGamepadMenus() {
  if (NET) return;
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
  const gp = navigator.getGamepads()?.[0];
  if (!gp) return;
  const startBtn = Boolean(gp.buttons[9]?.pressed || (raceState !== 'racing' && raceState !== 'countdown' && gp.buttons[0]?.pressed));
  if (startBtn && !prevGamepadStartBtn) {
    if (raceState === 'menu') startRace();
    else if (raceState === 'finished') restartRace();
    else if (gp.buttons[9]?.pressed) togglePause();
  }
  prevGamepadStartBtn = startBtn;
  if (raceState === 'menu') {
    const dx = gp.buttons[14]?.pressed ? -1 : gp.buttons[15]?.pressed ? 1 : (Math.abs(gp.axes[0] || 0) > 0.6 ? Math.sign(gp.axes[0]) : 0);
    if (dx !== 0 && prevGamepadDpadX === 0) cycleDifficulty(dx);
    prevGamepadDpadX = dx;
  }
}

// Classificação e Formatação
function kartColorCfg(k) {
  if (k.netEntry) {
    const c = CORES[k.netEntry.cor] || CORES[0];
    return { color: c.cor };
  }
  return KART_ROSTER.find((r) => r.id === k.id);
}
function kartFinishTime(k) {
  if (NET && k === playerKart && netMyFinish) return netMyFinish;
  if (MODE === 'tv' && typeof k.netFinish === 'number') return k.netFinish;
  return k.finishTime;
}

function getRankedKarts() {
  return [...karts].sort((a, b) => {
    if (a.finished && b.finished) return kartFinishTime(a) - kartFinishTime(b);
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.totalProgress - a.totalProgress;
  });
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '--:--.-';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

function updateHUD() {
  if (!playerKart) return;
  const ranked = getRankedKarts();
  const rank = ranked.findIndex((k) => k === playerKart) + 1;

  hudRankEl.textContent = `${rank}º`;
  if (hudRankEl.nextElementSibling) hudRankEl.nextElementSibling.textContent = `/ ${karts.length}`;
  if (lastRank && rank !== lastRank && raceState === 'racing') {
    hudRankEl.classList.remove('rank-up', 'rank-down');
    void hudRankEl.offsetWidth;
    hudRankEl.classList.add(rank < lastRank ? 'rank-up' : 'rank-down');
  }
  lastRank = rank;
  hudLapEl.textContent = String(Math.min(playerKart.lap, TOTAL_LAPS));
  hudTimeEl.textContent = formatTime(raceTime);
  const meta = lapMeta.get(playerKart);
  if (hudLapTimeEl && meta) {
    hudLapTimeEl.textContent = Number.isFinite(meta.best) ? `Melhor ${formatTime(meta.best)}` : `Volta ${formatTime(Math.max(0, raceTime - meta.lapStart))}`;
  }

  const kmh = Math.round(Math.abs(playerKart.speed) * 3.8);
  hudSpeedEl.textContent = String(kmh);
  const speedPct = THREE.MathUtils.clamp((kmh / 205) * 100, 0, 100);
  hudSpeedFillEl.style.width = `${speedPct}%`;

  // Drift UI
  const charge = playerKart.driftCharge || 0;
  const chargePct = THREE.MathUtils.clamp((charge / 2.5) * 100, 0, 100);
  hudDriftFillEl.style.width = `${chargePct}%`;
  if (playerKart.isDrifting) {
    if (charge >= 2.0) {
      hudDriftStatusEl.textContent = 'ULTRA!';
      hudDriftFillEl.style.backgroundColor = '#e879f9';
    } else if (charge >= 0.8) {
      hudDriftStatusEl.textContent = 'TURBO!';
      hudDriftFillEl.style.backgroundColor = '#fb923c';
    } else {
      hudDriftStatusEl.textContent = 'DRIFT';
      hudDriftFillEl.style.backgroundColor = '#38bdf8';
    }
    hudDriftStatusEl.className = 'active-tag';
  } else if (playerKart.boostTimer > 0) {
    hudDriftStatusEl.textContent = 'BOOST!';
    hudDriftStatusEl.className = 'active-tag';
    hudDriftFillEl.style.backgroundColor = '#facc15';
  } else {
    hudDriftStatusEl.textContent = '—';
    hudDriftStatusEl.className = '';
    hudDriftFillEl.style.backgroundColor = '#38bdf8';
  }

  // Linhas de velocidade no turbo
  if (speedLinesEl) {
    speedLinesEl.classList.toggle('on', playerKart.boostTimer > 0 && raceState === 'racing');
  }

  // Item UI (com roleta)
  const item = playerKart.currentItem;
  if (rouletteTimer > 0 && item) {
    hudItemIconEl.textContent = ROULETTE_ICONS[rouletteIndex % ROULETTE_ICONS.length];
    hudItemNameEl.textContent = 'Sorteando...';
    hudItemHintEl.textContent = 'Segura aí!';
    hudItemCardEl.classList.add('has-item', 'rolling');
  } else if (item && ITEM_UI[item]) {
    const info = ITEM_UI[item];
    hudItemIconEl.textContent = info.icon;
    hudItemNameEl.textContent = info.name;
    hudItemHintEl.textContent = info.hint;
    hudItemCardEl.classList.add('has-item');
    hudItemCardEl.classList.remove('rolling');
  } else {
    hudItemIconEl.textContent = '—';
    hudItemNameEl.textContent = 'Sem Item';
    hudItemHintEl.textContent = 'Passe num cubo ?';
    hudItemCardEl.classList.remove('has-item', 'rolling');
  }

  drawMinimap();
}

function drawMinimap() {
  if (!minimapTransform) return;
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  minimapCtx.clearRect(0, 0, w, h);

  minimapCtx.beginPath();
  for (let i = 0; i < minimapPoints.length; i++) {
    const pt = minimapTransform.toCanvas(minimapPoints[i].x, minimapPoints[i].z);
    if (i === 0) minimapCtx.moveTo(pt.x, pt.y);
    else minimapCtx.lineTo(pt.x, pt.y);
  }
  minimapCtx.closePath();
  minimapCtx.lineWidth = 8;
  minimapCtx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
  minimapCtx.stroke();
  minimapCtx.lineWidth = 3;
  minimapCtx.strokeStyle = '#e2e8f0';
  minimapCtx.stroke();

  const sl = track.startLine;
  if (sl) {
    const p1 = minimapTransform.toCanvas(
      sl.position.x - sl.right.x * 7,
      sl.position.z - sl.right.z * 7
    );
    const p2 = minimapTransform.toCanvas(
      sl.position.x + sl.right.x * 7,
      sl.position.z + sl.right.z * 7
    );
    minimapCtx.beginPath();
    minimapCtx.moveTo(p1.x, p1.y);
    minimapCtx.lineTo(p2.x, p2.y);
    minimapCtx.lineWidth = 3;
    minimapCtx.strokeStyle = '#facc15';
    minimapCtx.stroke();
  }

  for (const k of karts) {
    if (k === playerKart) continue;
    const cfg = kartColorCfg(k);
    const pt = minimapTransform.toCanvas(k.position.x, k.position.z);
    minimapCtx.beginPath();
    minimapCtx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
    minimapCtx.fillStyle = cfg ? cfg.color : '#38bdf8';
    minimapCtx.fill();
    minimapCtx.lineWidth = 1.6;
    minimapCtx.strokeStyle = '#ffffff';
    minimapCtx.stroke();
  }

  if (playerKart) {
    const pt = minimapTransform.toCanvas(playerKart.position.x, playerKart.position.z);
    const pulse = 5.8 + Math.sin(totalElapsed * 8) * 1.2;
    minimapCtx.beginPath();
    minimapCtx.arc(pt.x, pt.y, pulse, 0, Math.PI * 2);
    minimapCtx.fillStyle = kartColorCfg(playerKart)?.color || '#dc2626';
    minimapCtx.fill();
    minimapCtx.lineWidth = 2.2;
    minimapCtx.strokeStyle = '#ffffff';
    minimapCtx.stroke();
  }
}

const MEDALS = ['🥇', '🥈', '🥉', '4º'];

function renderStandings() {
  const ranked = getRankedKarts();
  finishStandingsEl.innerHTML = '';
  ranked.forEach((k, idx) => {
    const li = document.createElement('li');
    li.className = `standing-row${k === playerKart ? ' is-player' : ''}`;
    const cfg = kartColorCfg(k);
    const timeLabel = k.finished ? formatTime(kartFinishTime(k)) : 'correndo…';
    const medal = MEDALS[idx] || `${idx + 1}º`;
    li.innerHTML =
      `<span class="standing-name"><span class="standing-medal">${medal}</span>` +
      `<span class="roster-dot" style="background:${cfg ? cfg.color : '#fff'}"></span>${k.name}</span>` +
      `<span>${timeLabel}</span>`;
    finishStandingsEl.appendChild(li);
  });
}

function showFinishScreen() {
  raceState = 'finished';
  if (MODE === 'celular') {
    hudEl.classList.remove('visible');
    netPhoneShowFinish();
    return;
  }
  const ranked = getRankedKarts();
  const playerRank = ranked.findIndex((k) => k === playerKart) + 1;

  finishTitleEl.textContent = playerRank === 1 ? '🏆 1º LUGAR!' : `${playerRank}º LUGAR`;
  finishSubtitleEl.textContent =
    playerRank === 1
      ? `Vitória incrível em ${formatTime(playerKart.finishTime)}!`
      : playerRank <= 3
        ? `Pódio! Corrida concluída em ${formatTime(playerKart.finishTime)}.`
        : `Corrida concluída em ${formatTime(playerKart.finishTime)}. Tente o pódio na próxima!`;
  const meta = lapMeta.get(playerKart);
  if (finishBestLapEl) {
    finishBestLapEl.textContent = meta && Number.isFinite(meta.best) ? `Melhor volta: ${formatTime(meta.best)}` : '';
  }
  renderStandings();
  hudEl.classList.remove('visible');
  finishOverlayEl.classList.remove('hidden');
  btnRestart?.focus();
}

function startRace() {
  sound.unlock();
  if (raceState !== 'menu') {
    resetRace();
  }
  startOverlayEl.classList.add('hidden');
  finishOverlayEl.classList.add('hidden');
  pauseOverlayEl?.classList.add('hidden');
  hudEl.classList.add('visible');
  paused = false;
  raceState = 'countdown';
  countdownTime = 0;
  countdownStep = -1;
  throttlePressedAt = -1;
  snapCameraToPlayer();
  track.setStartLights(0, false);
}

function restartRace() {
  resetRace();
  startRace();
}

function goToMenu() {
  resetRace();
  raceState = 'menu';
  paused = false;
  pauseOverlayEl?.classList.add('hidden');
  finishOverlayEl.classList.add('hidden');
  hudEl.classList.remove('visible');
  startOverlayEl.classList.remove('hidden');
  hideBanner();
  refreshMenuUi();
  btnStart?.focus();
}

function resetRace() {
  raceTime = 0;
  useItemQueued = false;
  respawnQueued = false;
  rouletteTimer = 0;
  wrongWayTimer = 0;
  wrongWayShown = false;
  playerStuckTimer = 0;
  finishingTimer = 0;
  playerFinishRank = 0;
  lastRank = 0;
  cameraShake = 0;
  qaPlayerPickups = 0;
  qaPlayerBoxesSmashed = 0;
  qaLastUsedItem = 'none';
  resetQaJumpTracking();
  if (!NET) spawnAllKarts();
  itemSystem.reset();
  snapCameraToPlayer();
  finishOverlayEl.classList.add('hidden');
  wrongWayEl?.classList.remove('show');
  hideBanner();
  track.setStartLights(0, false);
  updateHUD();
}

btnStart.addEventListener('click', () => {
  btnStart.blur();
  startRace();
});

btnRestart.addEventListener('click', () => {
  btnRestart.blur();
  if (MODE === 'celular') netPhoneAction({ tipo: 'comecar' });
  else if (MODE === 'tv') tvStartRace();
  else restartRace();
});

btnMenu?.addEventListener('click', () => {
  btnMenu.blur();
  if (MODE === 'celular') netPhoneAction({ tipo: 'sala' });
  else if (MODE === 'tv') tvBackToLobby();
  else goToMenu();
});

btnResume?.addEventListener('click', () => {
  btnResume.blur();
  togglePause(false);
});
btnPauseRestart?.addEventListener('click', () => {
  btnPauseRestart.blur();
  restartRace();
});
btnPauseMenu?.addEventListener('click', () => {
  btnPauseMenu.blur();
  goToMenu();
});

for (const b of diffButtons) {
  b.addEventListener('click', () => {
    b.blur();
    pickDifficulty(b.dataset.difficulty);
  });
}
autoAccelToggle?.addEventListener('change', () => {
  settings.autoAccel = autoAccelToggle.checked;
  saveSettings();
});
refreshMenuUi();

if (btnAudio) {
  btnAudio.addEventListener('click', () => {
    btnAudio.blur();
    const isMuted = sound.toggleMute();
    btnAudio.textContent = isMuted ? '🔇' : '🔊';
  });
}

function resetQaJumpTracking() {
  qaAirborneSeen = false;
  qaLandedAfterJump = false;
  qaPeakJumpHeight = 0;
  qaPeakAirTime = 0;
}

if (isQaMode) {
  const bindQa = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      el.blur();
      fn();
    });
  };
  bindQa('qa-btn-startline', () => window.__KART_DEBUG__.teleportToStartLineView());
  bindQa('qa-btn-ramp', () => window.__KART_DEBUG__.teleportToRampApproach());
  bindQa('qa-btn-banked', () => window.__KART_DEBUG__.teleportToBankedCurve());
  bindQa('qa-btn-boxline', () => window.__KART_DEBUG__.teleportToBoxApproach());
  bindQa('qa-btn-banana', () => window.__KART_DEBUG__.giveItem('banana'));
  bindQa('qa-btn-shell', () => window.__KART_DEBUG__.giveItem('shell'));
  bindQa('qa-btn-turbo', () => window.__KART_DEBUG__.giveItem('turbo'));
  bindQa('qa-btn-use', () => {
    qaLastUsedItem = window.__KART_DEBUG__.usePlayerItem() || 'none';
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================================================
// Regras da corrida: voltas, contramão e "voltar à pista"
// =========================================================================
function respawnKart(kart) {
  kart.respawnAt(kart.trackT, 0);
  const st = stuckMeta.get(kart);
  if (st) st.slowTimer = 0;
  if (kart === playerKart) {
    sound.playRespawn();
    showToast('🔄 DE VOLTA À PISTA!');
    wrongWayTimer = 0;
    playerStuckTimer = 0;
    snapCameraToPlayer();
  }
}

function trackLaps(kart) {
  const meta = lapMeta.get(kart);
  if (!meta) return;
  if (kart.lap > meta.lap) {
    const lapTime = raceTime - meta.lapStart;
    meta.laps.push(lapTime);
    meta.best = Math.min(meta.best, lapTime);
    meta.lapStart = raceTime;
    meta.lap = kart.lap;
    if (kart === playerKart && !kart.finished) {
      if (kart.lap === TOTAL_LAPS) {
        showBanner('ÚLTIMA VOLTA!', 'final', 1900);
        sound.playFinalLap();
      } else {
        showBanner(`VOLTA ${kart.lap}/${TOTAL_LAPS}`, 'lap', 1400);
        sound.playLap();
      }
    }
  } else if (kart.lap < meta.lap) {
    meta.lap = kart.lap;
  }
}

function checkPlayerWrongWayAndStuck(dt, controls) {
  const frame = track.getTrackFrame(playerKart.trackT);
  const fx = Math.sin(playerKart.heading);
  const fz = Math.cos(playerKart.heading);
  const tl = Math.hypot(frame.tangent.x, frame.tangent.z) || 1;
  const dot = (fx * frame.tangent.x + fz * frame.tangent.z) / tl;
  const goingBackwards = (dot < -0.35 && playerKart.speed > 4) || (dot > 0.35 && playerKart.speed < -4);
  if (goingBackwards && playerKart.spinoutTimer <= 0) {
    wrongWayTimer += dt;
  } else {
    wrongWayTimer = Math.max(0, wrongWayTimer - dt * 2);
  }
  const show = wrongWayTimer > 0.9;
  if (show !== wrongWayShown) {
    wrongWayShown = show;
    wrongWayEl?.classList.toggle('show', show);
    if (show) sound.playWrongWay();
  }

  // Preso: acelerando mas sem sair do lugar
  if (controls.throttle > 0.5 && Math.abs(playerKart.speed) < 2.5 && playerKart.spinoutTimer <= 0) {
    playerStuckTimer += dt;
  } else {
    playerStuckTimer = 0;
  }
  const kidMode = currentDifficulty().steerAssist;
  if (playerStuckTimer > 3 || wrongWayTimer > (kidMode ? 2.5 : 7)) {
    respawnKart(playerKart);
  }
}

function checkBotStuck(kart, dt) {
  const st = stuckMeta.get(kart);
  if (!st || kart.finished) return;
  if (Math.abs(kart.speed) < 3 && kart.spinoutTimer <= 0) {
    st.slowTimer += dt;
    if (st.slowTimer > 4) respawnKart(kart);
  } else {
    st.slowTimer = 0;
  }
}

// =========================================================================
// Contagem regressiva com semáforo e largada turbo
// =========================================================================
function updateCountdown(dt, controls) {
  if (NET) {
    // Largada combinada pela TV: todos os aparelhos contam até o mesmo horário
    countdownTime = Math.max(0, GO_TIME - (netGoAt - nowTv()) / 1000);
  } else {
    countdownTime += dt;
  }
  // Momento em que o jogador começou a acelerar (para a largada turbo)
  if (controls.throttle > 0.5) {
    if (throttlePressedAt < 0) throttlePressedAt = countdownTime;
  } else {
    throttlePressedAt = -1;
  }

  const steps = [
    { at: 0.0, text: 'PREPARAR...', red: 0 },
    { at: 0.6, text: '3', red: 2 },
    { at: 1.4, text: '2', red: 4 },
    { at: 2.2, text: '1', red: 5 }
  ];
  let step = -1;
  for (let i = 0; i < steps.length; i++) {
    if (countdownTime >= steps[i].at) step = i;
  }
  if (step !== countdownStep && countdownTime < GO_TIME) {
    countdownStep = step;
    const s = steps[step];
    track.setStartLights(s.red, false);
    if (step === 0) {
      showBanner(MODE === 'tv' ? 'PREPARAR...' : currentDifficulty().steerAssist || settings.autoAccel ? 'PREPARAR...' : 'SEGURE ACELERAR NO 1!', 'ready', 0);
    } else {
      showBanner(s.text, 'count', 0);
      sound.playCountBeep();
    }
  }

  if (countdownTime >= GO_TIME) {
    track.setStartLights(0, true);
    showBanner('VAI!', 'go', 900);
    sound.playGo();
    raceState = 'racing';
    raceTime = NET ? Math.max(0, (nowTv() - netGoAt) / 1000) : 0;
    for (const meta of lapMeta.values()) meta.lapStart = 0;

    // Largada turbo: acelerar logo depois do "1" (nem antes, nem depois)
    const diff = currentDifficulty();
    const perfect = throttlePressedAt >= 2.15 && throttlePressedAt <= GO_TIME && controls.throttle > 0.5;
    if (!playerKart) {
      // TV: sem jogador local
    } else if (perfect || diff.rocketStartFree || (NET && settings.autoAccel)) {
      playerKart.applyBoost(1.1, 14);
      showToast('🔥 LARGADA TURBO!');
      sound.playBoost();
    } else if (throttlePressedAt >= 0 && throttlePressedAt < 1.0) {
      // acelerou cedo demais: o motor "afoga" por um instante
      playerKart.triggerSpinout(0.45);
      playerKart.speed = 0;
      showToast('💨 Afogou o motor! Acelere só no 1');
    }
    // Bots: alguns também acertam a largada
    for (const entry of aiControllers) {
      if (Math.random() < 0.5) entry.kart.applyBoost(0.8, 10);
    }
  }
}

// =========================================================================
// Debug API rigorosa
// =========================================================================
function teleportPlayerAlongTrack(t, speedValue = 0) {
  if (!playerKart) return;
  const normT = ((t % 1) + 1) % 1;
  const frame = track.getTrackFrame(normT);
  const heading = Math.atan2(frame.tangent.x, frame.tangent.z);

  playerKart.position.copy(frame.point);
  const info = track.getClosestPointInfo(frame.point.x, frame.point.z, normT);
  if (info) {
    playerKart.position.y = info.surfaceHeight;
  }
  if (playerKart.prevPosition) {
    playerKart.prevPosition.copy(playerKart.position);
  }
  playerKart.heading = heading;
  playerKart.speed = speedValue;
  playerKart.vy = 0;
  playerKart.isGrounded = true;
  playerKart.airTime = 0;
  playerKart.maxJumpHeight = 0;
  playerKart.isDrifting = false;
  playerKart.driftDir = 0;
  playerKart.driftCharge = 0;
  playerKart.spinoutTimer = 0;
  playerKart.boostTimer = 0;
  playerKart.trackT = normT;

  playerKart.update(0.001, {
    throttle: speedValue > 0 ? 1 : 0,
    steer: 0,
    drift: false,
    useItem: false
  }, karts);
  snapCameraToPlayer();
  renderer.render(scene, camera);
}

function forceRacing() {
  if (raceState === 'menu' || raceState === 'countdown') {
    if (raceState === 'menu') startRace();
    raceState = 'racing';
    track.setStartLights(0, true);
    hideBanner();
  }
}

window.__KART_DEBUG__ = {
  startRace() {
    forceRacing();
    updateHUD();
    renderer.render(scene, camera);
  },
  startWithCountdown() {
    startRace();
  },
  resetRace() {
    resetRace();
    renderer.render(scene, camera);
  },
  setDifficulty(key) {
    pickDifficulty(key);
  },
  setAutopilot(on) {
    debugAutopilot = Boolean(on);
  },
  // Avança a simulação sem desenhar (para testes automáticos de corrida inteira)
  fastForward(seconds, step = 1 / 60) {
    const n = Math.ceil(seconds / step);
    for (let i = 0; i < n; i++) {
      stepSimulation(step, true);
      if (raceState === 'menu') break;
    }
    updateHUD();
    return this.getState();
  },
  getState() {
    const ranked = getRankedKarts();
    const serializeKart = (k) => ({
      id: k.id,
      name: k.name,
      isPlayer: k.isPlayer,
      position: { x: k.position.x, y: k.position.y, z: k.position.z },
      velocity: { x: k.velocity.x, y: k.velocity.y, z: k.velocity.z },
      speed: k.speed,
      vy: k.vy,
      heading: k.heading,
      isGrounded: k.isGrounded,
      airTime: k.airTime,
      maxJumpHeight: k.maxJumpHeight,
      isDrifting: k.isDrifting,
      driftDir: k.driftDir,
      driftCharge: k.driftCharge,
      boostTimer: k.boostTimer,
      spinoutTimer: k.spinoutTimer,
      trackT: k.trackT,
      lap: k.lap,
      totalProgress: k.totalProgress,
      finished: k.finished,
      finishTime: k.finishTime,
      currentItem: k.currentItem,
      topSpeedScale: k.topSpeedScale,
      laps: lapMeta.get(k)?.laps.slice() || [],
      rank: ranked.indexOf(k) + 1
    });

    return {
      raceState,
      paused,
      difficulty: settings.difficulty,
      raceTime,
      fps: Math.round(fpsSmoothed),
      playerPickups: qaPlayerPickups,
      player: playerKart ? serializeKart(playerKart) : null,
      opponents: karts.filter((k) => !k.isPlayer).map(serializeKart),
      items: itemSystem.getState(),
      ramps: track.ramps.map((r) => ({
        tStart: r.tStart,
        tPeak: r.tPeak,
        tEnd: r.tEnd,
        height: r.height,
        position: { x: r.position.x, y: r.position.y, z: r.position.z }
      }))
    };
  },
  teleportToStartLineView() {
    forceRacing();
    const distBeforeLine = 18;
    const t = 1 - distBeforeLine / track.totalLength;
    teleportPlayerAlongTrack(t, 0);
  },
  teleportToRampApproach() {
    forceRacing();
    resetQaJumpTracking();
    const ramp = track.ramps[0];
    const distBeforeRamp = 32;
    const t = ramp ? ramp.tStart - distBeforeRamp / track.totalLength : 0.21;
    teleportPlayerAlongTrack(t, 36);
  },
  teleportToBankedCurve() {
    forceRacing();
    teleportPlayerAlongTrack(0.59, 32);
  },
  teleportToBoxApproach() {
    forceRacing();
    if (playerKart) {
      playerKart.currentItem = null;
    }
    itemSystem.reset();
    // Alinha exatamente na reta antes da 1ª fileira de cubos (t = 0.055, caixa central em offset 0)
    const t = 0.055 - 24 / track.totalLength;
    teleportPlayerAlongTrack(t, 30);
  },
  giveItem(type) {
    if (!playerKart) return;
    itemSystem.giveItem(playerKart, type);
    updateHUD();
  },
  usePlayerItem() {
    if (!playerKart) return null;
    const used = itemSystem.useItem(playerKart);
    updateHUD();
    return used;
  },
  respawnPlayer() {
    if (playerKart) respawnKart(playerKart);
  }
};

// =========================================================================
// Simulação (separada do desenho para permitir testes acelerados)
// =========================================================================
function updateBots(dt) {
  for (let i = 0; i < aiControllers.length; i++) {
    const entry = aiControllers[i];
    const aiCtrl = entry.controller.computeControls(dt);
    entry.last = aiCtrl;
    if (aiCtrl.useItem && entry.kart.currentItem) {
      itemSystem.useItem(entry.kart);
    }
    entry.kart.update(dt, aiCtrl, karts);
    trackLaps(entry.kart);
    checkBotStuck(entry.kart, dt);
  }
}

function getAssistedControls(dt, controls) {
  const diff = currentDifficulty();
  if (debugAutopilot || raceState === 'finishing' || raceState === 'finished') {
    const auto = playerAutopilot.computeControls(dt);
    return {
      throttle: auto.throttle > 0 ? 1 : auto.throttle,
      steer: auto.steer,
      drift: debugAutopilot ? auto.drift : false,
      useItem: debugAutopilot ? controls.useItem || (playerKart.currentItem !== null && Math.random() < 0.01) : false,
      respawn: false
    };
  }
  if (diff.steerAssist) {
    // Modo criança: o kart segue a pista sozinho; a criança vira para mudar de faixa
    const auto = playerAutopilot.computeControls(dt);
    const steer = Math.abs(controls.steer) > 0.1
      ? THREE.MathUtils.clamp(controls.steer * 0.75 + auto.steer * 0.35, -1, 1)
      : auto.steer;
    return { ...controls, steer };
  }
  return controls;
}

function stepSimulation(dt, headless = false) {
  if (MODE === 'tv') {
    stepSimulationTv(dt, headless);
    return;
  }
  totalElapsed += dt;
  skyUniforms.uTime.value = totalElapsed;
  track.update(dt, totalElapsed);
  if (!headless) pollGamepadMenus();

  if (paused) {
    return;
  }

  if (raceState === 'countdown') {
    const controls = readPlayerControls(false);
    if (debugAutopilot) controls.throttle = countdownTime > 2.3 ? 1 : 0;
    updateCountdown(dt, controls);
    itemSystem.update(dt, totalElapsed);
    if (!headless) updateCamera(dt);
    sound.updateEngine(controls.throttle > 0 ? 20 : 4, false, true);
  } else if (raceState === 'racing') {
    raceTime += dt;

    const raw = readPlayerControls();
    const playerControls = getAssistedControls(dt, raw);
    netLastControls = playerControls;
    if (rouletteTimer > 0) {
      rouletteTimer = Math.max(0, rouletteTimer - dt);
      rouletteTickAcc += dt;
      if (rouletteTickAcc > 0.08) {
        rouletteTickAcc = 0;
        rouletteIndex += 1;
        sound.playRouletteTick();
      }
    }
    if (playerControls.useItem && playerKart.currentItem && rouletteTimer <= 0) {
      itemSystem.useItem(playerKart);
    }
    if (raw.respawn) {
      respawnKart(playerKart);
    }
    playerKart.update(dt, playerControls, karts);
    trackLaps(playerKart);
    checkPlayerWrongWayAndStuck(dt, playerControls);

    // Áudio e câmera sincronizados com eventos físicos do kart do jogador
    if (playerKart.events) {
      if (playerKart.events.justReleasedBoost) sound.playBoost();
      if (playerKart.events.justLanded) {
        sound.playLanding();
        addShake(0.25);
      }
      if (playerKart.events.justHitWall) {
        sound.playWallHit(playerKart.wallImpact);
        addShake(Math.min(0.5, playerKart.wallImpact * 0.02));
      }
    }
    sound.updateEngine(playerKart.speed, playerKart.boostTimer > 0, true);

    updateBots(dt);
    itemSystem.update(dt, totalElapsed);
    if (!headless) {
      updateCamera(dt);
      updateHUD();
    }

    if (isQaMode && qaTelemetryEl && playerKart && !headless) {
      if (!playerKart.isGrounded) {
        qaAirborneSeen = true;
      } else if (qaAirborneSeen) {
        qaLandedAfterJump = true;
      }
      qaPeakJumpHeight = Math.max(qaPeakJumpHeight, playerKart.maxJumpHeight || 0);
      qaPeakAirTime = Math.max(qaPeakAirTime, playerKart.airTime || 0);
      const itemState = itemSystem.getState();
      const activeBoxes = itemState.boxes.filter((b) => b.active).length;
      const oppLines = karts
        .filter((k) => !k.isPlayer)
        .map((k) => `${k.name.split(' ')[0]}: spd=${k.speed.toFixed(1)} t=${k.trackT.toFixed(3)} prog=${k.totalProgress.toFixed(3)}`)
        .join('\n');
      qaTelemetryEl.textContent =
        `FPS=${Math.round(fpsSmoothed)} | P: y=${playerKart.position.y.toFixed(2)} vy=${playerKart.vy.toFixed(2)} spd=${playerKart.speed.toFixed(1)}\n` +
        `ground=${playerKart.isGrounded} air=${playerKart.airTime.toFixed(2)} (peak=${qaPeakAirTime.toFixed(2)})\n` +
        `jumpH=${playerKart.maxJumpHeight.toFixed(2)} (peak=${qaPeakJumpHeight.toFixed(2)}) airSeen=${qaAirborneSeen} landed=${qaLandedAfterJump}\n` +
        `drift=${playerKart.isDrifting} chg=${playerKart.driftCharge.toFixed(2)} boost=${playerKart.boostTimer.toFixed(2)} t=${playerKart.trackT.toFixed(3)}\n` +
        `item=${playerKart.currentItem || 'none'} pickups=${qaPlayerPickups} smash=${qaPlayerBoxesSmashed} lastUsed=${qaLastUsedItem}\n` +
        `boxes=${activeBoxes}/${itemState.boxes.length} ban=${itemState.bananas.length} sh=${itemState.shells.length}\n` +
        oppLines;
    }

    if (playerKart.finished) {
      raceState = 'finishing';
      finishingTimer = 0;
      if (NET) netMyFinish = Math.max(0.1, (nowTv() - netGoAt) / 1000);
      wrongWayEl?.classList.remove('show');
      speedLinesEl?.classList.remove('on');
      const ranked = getRankedKarts();
      playerFinishRank = ranked.findIndex((k) => k === playerKart) + 1;
      showBanner(playerFinishRank === 1 ? '🏁 VOCÊ VENCEU!' : `🏁 CHEGADA! ${playerFinishRank}º`, 'finish', 0);
      sound.playFinish(playerFinishRank <= 3);
      if (playerFinishRank <= 3 && !headless) launchConfetti();
    }
  } else if (raceState === 'finishing' || raceState === 'finished') {
    raceTime += dt;
    sound.updateEngine(0, false, false);
    const auto = getAssistedControls(dt, { throttle: 0, steer: 0, drift: false, useItem: false });
    playerKart.update(dt, auto, karts);
    updateBots(dt);
    itemSystem.update(dt, totalElapsed);
    if (raceState === 'finishing') {
      finishingTimer += dt;
      if (!headless) updateFinishCamera(dt);
      if (finishingTimer > 3.6) {
        hideBanner();
        showFinishScreen();
      }
    } else {
      if (!headless) updateFinishCamera(dt);
      // Atualiza a tabela enquanto os bots terminam
      if (!headless && !netResultShown && Math.floor(raceTime * 2) !== Math.floor((raceTime - dt) * 2)) {
        renderStandings();
      }
    }
  } else {
    sound.updateEngine(0, false, false);
    itemSystem.update(dt, totalElapsed);
    if (!headless) updateMenuCamera();
  }
}

// =========================================================================
// MULTIPLAYER: TV (sala + robôs + transmissão ao vivo) e celulares (cada um corre no seu)
// A TV é a autoridade: monta o grid, marca o horário do "VAI", roda os robôs e fecha o resultado.
// Cada celular cuida da física do próprio kart e manda a posição 10× por segundo.
// Bananas e cascos: quem joga avisa todos (mesmo id); quem é atingido avisa que acertou.
// =========================================================================
const relogio = criarRelogio();
const registro = criarRegistroEventos(DEV);
const eventoNovo = criarFiltroEventos();
const remotos = new Map(); // id do kart -> { st, em, kart, ex, ez, ey, eh, visto }
let netRace = '';
let netGoAt = 0;
let netMyId = '';
let netMyFinish = 0;
let netResultShown = false;
let netSendAcc = 0;
let netLastControls = { throttle: 0, steer: 0 };
let rede = null;
const NET_LAG = 0.06; // compensa parte do atraso da internet ao prever os outros karts

function nowTv() {
  return MODE === 'celular' ? relogio.agoraTv() : Date.now();
}
function netPublish(chave, v) {
  if (rede && typeof rede.publicar === 'function') rede.publicar(chave, v);
}

// Cria os karts do grid recebido da TV. Na TV: robôs locais e humanos remotos.
// No celular: o meu kart local e todos os outros (humanos e robôs) remotos.
function spawnNetKarts(grid) {
  for (const k of karts) k.dispose();
  karts.length = 0;
  aiControllers = [];
  lapMeta.clear();
  stuckMeta.clear();
  skidMarks.clear();
  remotos.clear();
  playerKart = null;
  playerAutopilot = null;
  const diff = currentDifficulty();
  const spawns = track.getSpawnTransforms(Math.max(4, grid.length));
  const botSkill = [1.0, 1.02, 0.98, 0.94];
  for (const entry of grid) {
    const c = CORES[entry.cor] || CORES[0];
    const mine = MODE === 'celular' && entry.id === netMyId;
    const local = MODE === 'celular' ? mine : !entry.humano;
    const kart = createKart(scene, track, {
      id: entry.id,
      name: entry.nome,
      number: c.numero,
      badgeLabel: entry.humano ? entry.nome : `${entry.nome.split(' ')[0]} #${c.numero}`,
      color: c.cor,
      accentColor: c.acento,
      isPlayer: mine,
      isRemote: !local,
      startTransform: spawns[entry.slot] || spawns[0],
      skidMarks,
      badgeScale: MODE === 'tv' ? 2.5 : 1.35
    });
    kart.netEntry = entry;
    kart.netFinish = undefined;
    karts.push(kart);
    lapMeta.set(kart, { lap: 1, lapStart: 0, laps: [], best: Infinity });
    stuckMeta.set(kart, { slowTimer: 0 });
    if (mine) {
      playerKart = kart;
      kart.spinoutScale = entry.crianca ? 0.55 : 1;
      kart.luckyItems = Boolean(entry.crianca);
    } else if (local) {
      kart.topSpeedScale = diff.botSpeed;
      aiControllers.push({
        kart,
        controller: createAIController(kart, track, itemSystem, karts, botSkill[entry.cor] || 1, {
          baseSpeed: diff.botSpeed,
          aheadSlow: diff.aheadSlow,
          behindBoost: diff.behindBoost,
          useItems: diff.botItems
        })
      });
    }
    if (!local) remotos.set(entry.id, { st: null, em: 0, kart, ex: 0, ez: 0, ey: 0, eh: 0, visto: 0, primeiro: true });
  }
  if (playerKart) {
    playerAutopilot = createAIController(playerKart, track, itemSystem, karts, 1.0, { useItems: false, controlSpeed: false });
  }
}

// Chegou a posição de um kart de outro aparelho
function netReceiveKart(v) {
  if (!v || v.r !== netRace || !v.id || v.id === netMyId) return;
  const rem = remotos.get(v.id);
  if (!rem) return;
  const k = rem.kart;
  if (rem.st && !rem.primeiro) {
    // Diferença entre onde o kart está desenhado e onde a nova notícia diz que ele está:
    // some aos poucos (sem "teletransporte" na tela).
    const pred = preverEstado(v, NET_LAG);
    rem.ex = k.position.x - pred.x;
    rem.ez = k.position.z - pred.z;
    rem.ey = k.position.y - pred.y;
    rem.eh = Math.atan2(Math.sin(k.heading - pred.h), Math.cos(k.heading - pred.h));
    if (Math.hypot(rem.ex, rem.ez) > 14) {
      rem.ex = rem.ez = rem.ey = rem.eh = 0;
    }
  }
  rem.st = v;
  rem.em = performance.now();
  rem.visto = Date.now();
}

const remoteTarget = {};
function updateRemoteKarts(dt) {
  const now = performance.now();
  const decay = Math.exp(-6 * dt);
  for (const rem of remotos.values()) {
    if (!rem.st) continue;
    const pred = preverEstado(rem.st, (now - rem.em) / 1000 + NET_LAG);
    rem.ex *= decay;
    rem.ez *= decay;
    rem.ey *= decay;
    rem.eh *= decay;
    Object.assign(remoteTarget, pred);
    remoteTarget.x = pred.x + rem.ex;
    remoteTarget.z = pred.z + rem.ez;
    remoteTarget.y = pred.y + rem.ey;
    remoteTarget.h = pred.h + rem.eh;
    rem.kart.updateRemote(dt, remoteTarget, true);
    rem.primeiro = false;
    if (MODE === 'tv' && rem.st.f && typeof rem.st.ft === 'number') rem.kart.netFinish = rem.st.ft;
  }
}

// ---------- Eventos (bananas, cascos, acertos) ----------
function netEvent(ev) {
  const e = registro.novo(ev);
  netPublish('ev/' + DEV, { r: netRace, l: registro.lista });
  return e;
}
function netLocalSpawn(ev) {
  if (!NET || !netRace) return;
  const owner = karts.find((k) => k.id === ev.o);
  if (!owner || owner.isRemote) return;
  netEvent(ev);
}
function netLocalHit(id, kart, type, ownerId) {
  if (!NET || !netRace) return;
  const e = netEvent({ k: 'h', id, alvo: kart.id, por: ownerId, tipo: type });
  netAnnounceHit(e);
}
function netReceiveEvents(v) {
  if (!v || v.r !== netRace) return;
  for (const e of eventoNovo(v.l)) {
    if (String(e.u).startsWith(DEV + '#')) continue;
    if (e.k === 'b' || e.k === 's') itemSystem.spawnRemote(e, 0.12);
    else if (e.k === 'h') {
      itemSystem.removeById(e.id);
      netAnnounceHit(e);
    }
  }
}
function netAnnounceHit(e) {
  const alvo = karts.find((k) => k.id === e.alvo);
  const por = karts.find((k) => k.id === e.por);
  if (!alvo) return;
  if (MODE === 'tv') {
    let txt;
    if (e.tipo === 'shell') txt = por && por !== alvo ? `🐢 ${por.name} acertou ${alvo.name}!` : `🐢 ${alvo.name} levou o próprio casco!`;
    else txt = por && por !== alvo ? `🍌 ${alvo.name} escorregou na banana de ${por.name}!` : `🍌 ${alvo.name} escorregou na banana!`;
    telasTv?.aviso(txt, alvo.netEntry ? CORES[alvo.netEntry.cor].cor : '#fff');
    sound.playSpinout();
    if (alvo.netEntry?.humano) directorCutTo(alvo, 0);
  } else if (MODE === 'celular' && por && por === playerKart && alvo !== playerKart) {
    showToast(e.tipo === 'shell' ? `🎯 Acertou ${alvo.name}!` : `🍌 ${alvo.name} escorregou!`);
    sound.playPickup();
  }
}

// =========================================================================
// CELULAR
// =========================================================================
let telasCel = null;

function netPhoneAction(d) {
  if (rede && rede.pid) rede.acao(d);
}

function netPhoneInit() {
  rede = window.Rede ? window.Rede.entrar({ plugin: 'acker-kart', prefixo: 'kart' }) : null;
  startOverlayEl.classList.add('hidden');
  telasCel = criarTelasCelular({
    rede,
    toque: touchState,
    som: sound,
    acao: netPhoneAction,
    estadoItem: () => (playerKart && raceState === 'racing' ? (rouletteTimer > 0 ? 'roleta' : playerKart.currentItem) : null)
  });
  if (!rede) return;
  rede.ouvir('k/*', (v) => netReceiveKart(v));
  rede.ouvir('bots', (v, _k, a) => {
    if (typeof a === 'number') relogio.amostra(Date.now() - a);
    if (!v || v.r !== netRace) return;
    for (const st of v.l || []) netReceiveKart({ ...st, r: v.r });
  });
  rede.ouvir('ev/*', (v) => netReceiveEvents(v));
  rede.aoTela((t, desvio) => {
    relogio.amostra(desvio);
    netPhoneScreen(t);
  });
}

function netPhoneScreen(t) {
  if (!t || typeof t.tela !== 'string') return;
  if (t.tela === 'corrida') {
    if (t.r !== netRace) netPhoneStartRace(t);
    telasCel.corrida(t);
  } else if (t.tela === 'resultado') {
    if (t.r === netRace && raceState !== 'finished') {
      raceState = 'finished';
      finishingTimer = 0;
    }
    hudEl.classList.remove('visible');
    hideBanner();
    netPhoneResult(t);
    telasCel.resultado(t);
  } else {
    if (netRace && raceState !== 'menu') {
      // voltou para a sala
      netRace = '';
      finishOverlayEl.classList.add('hidden');
      hudEl.classList.remove('visible');
      hideBanner();
      raceState = 'menu';
    }
    if (t.tela === 'sala') telasCel.sala(t);
    else telasCel.espera(t);
  }
}

function netPhoneStartRace(t) {
  netRace = t.r;
  netMyId = t.eu;
  netGoAt = t.goAt;
  netMyFinish = 0;
  netResultShown = false;
  netSendAcc = 0;
  const me = (t.grid || []).find((g) => g.id === t.eu);
  settings.difficulty = me && me.crianca ? 'facil' : 'normal';
  settings.autoAccel = Boolean(t.auto) || Boolean(me && me.crianca);
  registro.limpar();
  resetRace();
  spawnNetKarts(t.grid || []);
  raceState = 'menu';
  startRace();
  if (wrongWayEl) wrongWayEl.innerHTML = '⚠ CONTRAMÃO!<small>Vire o kart · toque em 🔄 para voltar à pista</small>';
}

function netPhoneTick(dt) {
  if (!rede || !netRace || !playerKart || raceState === 'menu') return;
  netSendAcc += dt;
  if (netSendAcc < 0.1) return;
  netSendAcc = 0;
  const st = playerKart.getNetState(netLastControls.throttle || 0, netLastControls.steer || 0);
  st.r = netRace;
  st.id = netMyId;
  if (netMyFinish) {
    st.f = 1;
    st.ft = netMyFinish;
  }
  netPublish('k/' + rede.pid, st);
}

// Cheguei: mostra a tabela parcial enquanto os outros terminam (a TV manda o resultado oficial)
function netPhoneShowFinish() {
  const ranked = getRankedKarts();
  const rank = ranked.findIndex((k) => k === playerKart) + 1;
  finishTitleEl.textContent = rank === 1 ? '🏆 1º LUGAR!' : `${rank}º LUGAR`;
  finishSubtitleEl.textContent = `Você chegou em ${formatTime(netMyFinish)}! Esperando os outros…`;
  const meta = lapMeta.get(playerKart);
  if (finishBestLapEl) finishBestLapEl.textContent = meta && Number.isFinite(meta.best) ? `Melhor volta: ${formatTime(meta.best)}` : '';
  renderStandings();
  btnRestart.style.display = 'none';
  if (btnMenu) btnMenu.style.display = 'none';
  finishOverlayEl.classList.remove('hidden');
}

function netPhoneResult(t) {
  netResultShown = true;
  const tabela = t.tabela || [];
  const meu = tabela.find((r) => r.id === netMyId);
  finishTitleEl.textContent = meu ? (meu.pos === 1 ? '🏆 VOCÊ VENCEU!' : `${meu.pos}º LUGAR`) : 'RESULTADO';
  finishSubtitleEl.textContent = meu && meu.chegou ? `Seu tempo: ${formatTime(meu.tempo)}` : 'Corrida encerrada!';
  if (finishBestLapEl) finishBestLapEl.textContent = '';
  finishStandingsEl.innerHTML = '';
  tabela.forEach((r) => {
    const li = document.createElement('li');
    li.className = `standing-row${r.id === netMyId ? ' is-player' : ''}`;
    const c = CORES[r.cor] || CORES[0];
    li.innerHTML =
      `<span class="standing-name"><span class="standing-medal">${MEDALS[r.pos - 1] || r.pos + 'º'}</span>` +
      `<span class="roster-dot" style="background:${c.cor}"></span>${escapeHtml(r.nome)}${r.humano ? '' : ' 🤖'}</span>` +
      `<span>${r.chegou ? formatTime(r.tempo) : 'não chegou'}</span>`;
    finishStandingsEl.appendChild(li);
  });
  btnRestart.style.display = '';
  btnRestart.textContent = 'Jogar de novo';
  if (btnMenu) {
    btnMenu.style.display = '';
    btnMenu.textContent = 'Voltar para a sala';
  }
  finishOverlayEl.classList.remove('hidden');
  if (meu && meu.pos <= 3) launchConfetti();
}

function escapeHtml(x) {
  return String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// =========================================================================
// TV
// =========================================================================
let telasTv = null;
const tvJogadores = new Map(); // pid -> { pid, nome, cor, crianca, auto }
const TV_CFG_KEY = 'kartacker.tv';
const tvConfig = { robos: 'normal', visao: 'camera' };
try {
  const salvo = JSON.parse(localStorage.getItem(TV_CFG_KEY) || 'null');
  if (salvo && ['facil', 'normal', 'dificil', 'nenhum'].includes(salvo.robos)) tvConfig.robos = salvo.robos;
  if (salvo && ['camera', 'mapa'].includes(salvo.visao)) tvConfig.visao = salvo.visao;
} catch {
  // sem armazenamento
}
let tvMapaAuto = false; // a TV ficou lenta e passou sozinha para o mapa
let tvFase = 'lobby'; // 'lobby' | 'corrida' | 'resultado'
let tvGrid = [];
let tvResultado = null;
let tvPublishAcc = 0;
let tvHudAcc = 0;
let tvLeaderLap = 1;
let tvLeaderId = '';
let tvLeaderNoticeAt = 0;
let tvFirstHumanFinish = null;
const tvFinishSeen = new Set();

function tvSaveConfig() {
  try {
    localStorage.setItem(TV_CFG_KEY, JSON.stringify(tvConfig));
  } catch {
    // ignora
  }
}
function tvMapMode() {
  return tvConfig.visao === 'mapa' || tvMapaAuto;
}

function tvPresentes() {
  if (!rede) return [];
  return rede.pessoas.map((p) => {
    let j = tvJogadores.get(p.pid);
    if (!j) {
      j = { pid: p.pid, nome: p.nome, cor: -1, crianca: false, auto: true };
      tvJogadores.set(p.pid, j);
    }
    j.nome = p.nome;
    return j;
  }).slice(0, 4);
}
// Cada jogador presente fica com uma cor só dele (a primeira livre, se não escolheu)
function tvGarantirCores() {
  const presentes = tvPresentes();
  const usadas = new Set();
  for (const j of presentes) {
    if (j.cor >= 0 && !usadas.has(j.cor)) usadas.add(j.cor);
    else j.cor = -1;
  }
  for (const j of presentes) {
    if (j.cor < 0) {
      j.cor = CORES.findIndex((_, i) => !usadas.has(i));
      usadas.add(j.cor);
    }
  }
  return presentes;
}

function tvTelaPara(pid) {
  const presentes = tvGarantirCores();
  const j = tvJogadores.get(pid);
  const lista = presentes.map((p) => ({ nome: p.nome, cor: p.cor, crianca: p.crianca, eu: p.pid === pid }));
  if (!presentes.some((p) => p.pid === pid)) return { tela: 'cheia' };
  if (tvFase === 'corrida') {
    const meu = tvGrid.find((g) => g.pid === pid);
    if (!meu) return { tela: 'espera', jogadores: lista };
    return { tela: 'corrida', r: netRace, grid: tvGrid, eu: meu.id, goAt: netGoAt, auto: j ? j.auto !== false : true };
  }
  if (tvFase === 'resultado' && tvResultado) {
    const meu = tvGrid.find((g) => g.pid === pid);
    return { tela: 'resultado', r: netRace, tabela: tvResultado, eu: meu ? meu.id : '' };
  }
  return {
    tela: 'sala',
    eu: { cor: j ? j.cor : 0, crianca: Boolean(j && j.crianca), auto: j ? j.auto !== false : true },
    ocupadas: presentes.filter((p) => p.pid !== pid).map((p) => p.cor),
    jogadores: lista,
    robos: tvConfig.robos
  };
}

function tvSync() {
  if (!rede) return;
  for (const p of rede.pessoas) rede.tela(p.pid, tvTelaPara(p.pid));
  if (tvFase === 'lobby') telasTv?.sala({ jogadores: tvGarantirCores(), config: tvConfig, codigo: rede.codigo, qr: rede.qr, link: rede.link, conectado: rede.conectado, erro: rede.erro });
}

function tvOnAction(pid, d) {
  if (!d || typeof d.tipo !== 'string') return;
  const j = tvJogadores.get(pid);
  if (d.tipo === 'perfil' && j) {
    if (Number.isInteger(d.cor) && d.cor >= 0 && d.cor < CORES.length) {
      const ocupada = tvPresentes().some((p) => p.pid !== pid && p.cor === d.cor);
      if (!ocupada && tvFase === 'lobby') j.cor = d.cor;
    }
    if (typeof d.crianca === 'boolean') j.crianca = d.crianca;
    if (typeof d.auto === 'boolean') j.auto = d.auto;
    tvSync();
  } else if (d.tipo === 'comecar') {
    if (tvFase === 'lobby' || tvFase === 'resultado') tvStartRace();
  } else if (d.tipo === 'sala') {
    if (tvFase === 'resultado') tvBackToLobby();
  }
}

function tvInit() {
  startOverlayEl.classList.add('hidden');
  rede = window.Rede ? window.Rede.criarSala({ plugin: 'acker-kart', prefixo: 'kart', titulo: 'Kart Acker TV', cap: 8 }) : null;
  telasTv = criarTelasTv({
    config: tvConfig,
    pontosPista: minimapPoints,
    linhaChegada: track.startLine,
    aoComecar: () => {
      sound.unlock();
      tvStartRace();
    },
    aoConfig: (chave, valor) => {
      tvConfig[chave] = valor;
      if (chave === 'visao') tvMapaAuto = false;
      tvSaveConfig();
      tvSync();
    },
    aoDenovo: () => {
      sound.unlock();
      tvStartRace();
    },
    aoSala: () => tvBackToLobby(),
    aoSolo: () => {
      window.location.href = './?modo=solo';
    },
    som: sound
  });
  // Vitrine: 4 robôs no grid enquanto a sala enche
  spawnNetKarts(montarGrid([], 4, true));
  raceState = 'menu';
  if (!rede) {
    telasTv.sala({ jogadores: [], config: tvConfig, codigo: '----', qr: '', link: '', conectado: false, erro: 'Não foi possível carregar a conexão. Recarregue a página.' });
    return;
  }
  rede.aoMudar(() => tvSync());
  rede.aoAcao(tvOnAction);
  rede.ouvir('k/*', (v) => netReceiveKart(v));
  rede.ouvir('ev/*', (v) => netReceiveEvents(v));
  rede.iniciar();
  tvSync();
}

function tvStartRace() {
  const presentes = tvGarantirCores();
  const comRobos = tvConfig.robos !== 'nenhum' || presentes.length === 0;
  settings.difficulty = tvConfig.robos === 'nenhum' ? 'normal' : tvConfig.robos;
  tvGrid = montarGrid(presentes, 4, comRobos);
  netRace = 'c' + Date.now().toString(36);
  netGoAt = Date.now() + 5400;
  registro.limpar();
  tvResultado = null;
  tvLeaderLap = 1;
  tvLeaderId = '';
  tvFirstHumanFinish = null;
  tvFinishSeen.clear();
  resetRace();
  spawnNetKarts(tvGrid);
  raceState = 'menu';
  startRace();
  hudEl.classList.remove('visible');
  finishOverlayEl.classList.add('hidden');
  tvFase = 'corrida';
  director.alvo = null;
  director.troca = 0;
  telasTv.corrida();
  tvSync();
}

function tvBackToLobby() {
  tvFase = 'lobby';
  netRace = '';
  raceState = 'menu';
  hideBanner();
  finishOverlayEl.classList.add('hidden');
  itemSystem.reset();
  spawnNetKarts(montarGrid([], 4, true));
  telasTv.voltarSala();
  tvSync();
}

function tvRanked() {
  return getRankedKarts();
}

function tvRaceRules() {
  const ranked = tvRanked();
  // Chegadas
  for (const k of karts) {
    if (!k.finished || tvFinishSeen.has(k.id)) continue;
    tvFinishSeen.add(k.id);
    if (!k.isRemote) k.netFinish = raceTime;
    const pos = tvFinishSeen.size;
    const cor = k.netEntry ? CORES[k.netEntry.cor].cor : '#fff';
    if (pos === 1) {
      showBanner(`🏁 ${k.name.toUpperCase()} VENCEU!`, 'finish', 3200);
      sound.playFinish(true);
    } else {
      sound.playLap();
    }
    telasTv.aviso(`🏁 ${k.name} chegou em ${pos}º!`, cor);
    if (k.netEntry?.humano && tvFirstHumanFinish === null) tvFirstHumanFinish = raceTime;
  }
  // Volta do líder
  const leader = ranked[0];
  if (leader && !leader.finished && leader.lap > tvLeaderLap && leader.lap <= TOTAL_LAPS) {
    tvLeaderLap = leader.lap;
    if (leader.lap === TOTAL_LAPS) {
      showBanner('ÚLTIMA VOLTA!', 'final', 1900);
      sound.playFinalLap();
    } else {
      showBanner(`VOLTA ${leader.lap}/${TOTAL_LAPS}`, 'lap', 1400);
      sound.playLap();
    }
  }
  // Troca de liderança
  if (leader && leader.id !== tvLeaderId) {
    if (tvLeaderId && raceTime > 6 && raceTime - tvLeaderNoticeAt > 4 && !leader.finished) {
      telasTv.aviso(`🏆 ${leader.name} assumiu a liderança!`, leader.netEntry ? CORES[leader.netEntry.cor].cor : '#fff');
      tvLeaderNoticeAt = raceTime;
    }
    tvLeaderId = leader.id;
  }
  // Fim da corrida
  const agora = Date.now();
  const presentes = new Set(rede ? rede.pessoas.map((p) => p.pid) : []);
  const humanos = tvGrid.filter((g) => g.humano).map((g) => {
    const k = karts.find((x) => x.id === g.id);
    const rem = remotos.get(g.id);
    const sumiu = !presentes.has(g.pid) || (rem && rem.visto && agora - rem.visto > 9000) || (!rem?.visto && raceTime > 12);
    return { f: Boolean(k && k.finished), sumiu };
  });
  if (corridaAcabou({ humanos, tempo: raceTime, primeiroHumanoChegouEm: tvFirstHumanFinish }) && (humanos.length > 0 || ranked.every((k) => k.finished) || raceTime > 200)) {
    tvFinishRace();
  }
}

function tvFinishRace() {
  raceState = 'finished';
  finishingTimer = 0;
  tvFase = 'resultado';
  const ranked = tvRanked();
  tvResultado = ranked.map((k, i) => ({
    pos: i + 1,
    id: k.id,
    nome: k.name,
    cor: k.netEntry ? k.netEntry.cor : 0,
    humano: Boolean(k.netEntry?.humano),
    chegou: Boolean(k.finished),
    tempo: k.finished ? Math.round(kartFinishTime(k) * 10) / 10 : null
  }));
  hideBanner();
  telasTv.resultado(tvResultado);
  launchConfetti();
  tvSync();
}

// Simulação da TV: robôs (física local), regras da corrida. Os humanos andam por updateRemoteKarts.
function stepSimulationTv(dt) {
  totalElapsed += dt;
  skyUniforms.uTime.value = totalElapsed;
  track.update(dt, totalElapsed);
  if (raceState === 'countdown') {
    updateCountdown(dt, { throttle: 0 });
    itemSystem.update(dt, totalElapsed);
  } else if (raceState === 'racing' || raceState === 'finishing') {
    raceTime += dt;
    updateBots(dt);
    itemSystem.update(dt, totalElapsed);
    tvRaceRules();
  } else if (raceState === 'finished') {
    raceTime += dt;
    finishingTimer += dt;
    updateBots(dt);
    itemSystem.update(dt, totalElapsed);
  } else {
    itemSystem.update(dt, totalElapsed);
  }
}

// ---------- Câmera de TV (diretor de transmissão) ----------
const director = { alvo: null, tipo: 3, troca: 0, corte: true, ultimoCorte: -10 };
const camRight = new THREE.Vector3();
function directorPick() {
  const humanos = karts.filter((k) => k.netEntry?.humano && !k.finished);
  const pool = humanos.length ? humanos : karts.filter((k) => !k.finished);
  if (!pool.length) return tvRanked()[0] || karts[0];
  const i = pool.indexOf(director.alvo);
  return pool[(i + 1) % pool.length];
}
function directorCutTo(k, tipo) {
  if (!k || totalElapsed - director.ultimoCorte < 2.5 || raceState !== 'racing' || tvMapMode()) return;
  director.alvo = k;
  director.tipo = tipo;
  director.troca = totalElapsed + 5.5;
  director.corte = true;
  director.ultimoCorte = totalElapsed;
}
function updateBroadcastCamera(dt) {
  if (raceState === 'menu' || raceState === 'countdown') {
    updateMenuCamera();
    telasTv?.camera(raceState === 'countdown' ? '🎥 Largada' : '');
    return;
  }
  if (raceState === 'finished') {
    const winner = tvRanked()[0];
    updateFinishCamera(dt, winner);
    telasTv?.camera(winner ? `🎥 ${winner.name}` : '');
    return;
  }
  if (!director.alvo || totalElapsed > director.troca || !karts.includes(director.alvo)) {
    director.alvo = directorPick();
    director.tipo = (director.tipo + 1) % 4;
    director.troca = totalElapsed + 6.5 + Math.random() * 2;
    director.corte = true;
    director.ultimoCorte = totalElapsed;
  }
  const k = director.alvo;
  if (!k) return;
  const a = k.getCameraAnchor();
  const f = a.forward;
  camRight.set(-f.z, 0, f.x).normalize();
  const p = a.position;
  let fov = 60;
  if (director.tipo === 0) {
    // perseguição alta
    desiredCamPos.copy(p).addScaledVector(f, -10.5).addScaledVector(worldUpVec, 4.8);
    desiredCamTarget.copy(p).addScaledVector(f, 9).addScaledVector(worldUpVec, 1.0);
  } else if (director.tipo === 1) {
    // helicóptero de lado
    desiredCamPos.copy(p).addScaledVector(f, -4).addScaledVector(camRight, 15).addScaledVector(worldUpVec, 12);
    desiredCamTarget.copy(p).addScaledVector(f, 5);
    fov = 55;
  } else if (director.tipo === 2) {
    // câmera na frente olhando para trás (mostra quem vem atrás)
    desiredCamPos.copy(p).addScaledVector(f, 9.5).addScaledVector(camRight, 3.2).addScaledVector(worldUpVec, 2.6);
    desiredCamTarget.copy(p).addScaledVector(worldUpVec, 0.9).addScaledVector(f, -3);
    fov = 58;
  } else {
    // drone alto mostrando o pelotão
    desiredCamPos.copy(p).addScaledVector(f, -22).addScaledVector(worldUpVec, 25);
    desiredCamTarget.copy(p).addScaledVector(f, 12);
    fov = 58;
  }
  const g = track.getClosestPointInfo(desiredCamPos.x, desiredCamPos.z, k.trackT);
  const minY = (g?.onRoad ? g.surfaceHeight : p.y) + 1.4;
  if (desiredCamPos.y < minY) desiredCamPos.y = minY;
  if (director.corte) {
    camPos.copy(desiredCamPos);
    camTarget.copy(desiredCamTarget);
    camera.fov = fov;
    director.corte = false;
  } else {
    camPos.lerp(desiredCamPos, 1 - Math.exp(-5 * dt));
    camTarget.lerp(desiredCamTarget, 1 - Math.exp(-9 * dt));
    camera.fov += (fov - camera.fov) * (1 - Math.exp(-4 * dt));
  }
  camera.position.copy(camPos);
  camera.up.set(0, 1, 0);
  camera.lookAt(camTarget);
  camera.updateProjectionMatrix();
  placeSunAround(p);
  const pos = tvRanked().indexOf(k) + 1;
  telasTv?.camera(`🎥 ${k.name} · ${pos}º`);
}

function tvAfterFrame(dt) {
  // Robôs para os celulares (10× por segundo)
  tvPublishAcc += dt;
  if (tvPublishAcc >= 0.1 && netRace && raceState !== 'menu') {
    tvPublishAcc = 0;
    const l = aiControllers.map((e) => {
      const st = e.kart.getNetState(e.last ? e.last.throttle : 1, e.last ? e.last.steer : 0);
      st.id = e.kart.id;
      if (typeof e.kart.netFinish === 'number') st.ft = Math.round(e.kart.netFinish * 100) / 100;
      return st;
    });
    netPublish('bots', { r: netRace, l });
  }
  // Placar e mapa
  tvHudAcc += dt;
  if (tvHudAcc >= 0.25) {
    tvHudAcc = 0;
    if (tvFase !== 'lobby') {
      const ranked = tvRanked();
      telasTv.placar(ranked.map((k, i) => ({
        pos: i + 1,
        nome: k.name,
        cor: k.netEntry ? CORES[k.netEntry.cor].cor : '#fff',
        humano: Boolean(k.netEntry?.humano),
        crianca: Boolean(k.netEntry?.crianca),
        volta: Math.max(1, Math.min(k.lap, TOTAL_LAPS)),
        chegou: Boolean(k.finished),
        tempo: k.finished ? kartFinishTime(k) : null,
        foco: k === director.alvo && !tvMapMode()
      })), { voltas: TOTAL_LAPS, tempo: raceState === 'countdown' ? 0 : raceTime });
    }
  }
  telasTv.mapa(karts.map((k) => ({
    x: k.position.x,
    z: k.position.z,
    cor: k.netEntry ? CORES[k.netEntry.cor].cor : '#fff',
    nome: k.name,
    humano: Boolean(k.netEntry?.humano),
    foco: k === director.alvo
  })), tvMapMode(), tvFase !== 'lobby');
}

// ---------- Qualidade automática (só baixa se ficar lento de verdade) ----------
let qualityTimer = 0;
function autoQuality(dt) {
  if (MODE === 'solo') return;
  if (MODE === 'tv' && tvMapMode()) return;
  const active = raceState === 'racing' || raceState === 'countdown';
  const limit = MODE === 'tv' ? 24 : 30;
  if (active && fpsSmoothed < limit) qualityTimer += dt;
  else qualityTimer = Math.max(0, qualityTimer - dt * 0.5);
  if (qualityTimer < (MODE === 'tv' ? 8 : 6)) return;
  qualityTimer = 0;
  QUALITY.level += 1;
  if (QUALITY.level === 1 || QUALITY.level === 3) {
    QUALITY.ratio *= 0.75;
    renderer.setPixelRatio(QUALITY.ratio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else if (QUALITY.level === 2) {
    renderer.shadowMap.enabled = false;
    sunLight.castShadow = false;
    scene.traverse((o) => {
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.needsUpdate = true;
      }
    });
  } else if (QUALITY.level === 4 && MODE === 'tv') {
    tvMapaAuto = true;
    telasTv?.aviso('📺 A TV ficou lenta: mostrando o mapa ao vivo (dá para voltar na sala)', '#facc15');
  }
}

// Inicia o modo da página
if (MODE === 'tv') tvInit();
else if (MODE === 'celular') netPhoneInit();

// Loop Principal (60fps)
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

  if (rawDt > 0.001 && rawDt < 0.5) {
    fpsSmoothed = fpsSmoothed * 0.92 + (1 / rawDt) * 0.08;
  }

  if (!NET) {
    stepSimulation(dt, false);
    updateConfetti(dt);
    renderer.render(scene, camera);
    return;
  }

  // Multiplayer: o tempo do jogo acompanha o relógio de verdade (mesmo se o aparelho ficar lento),
  // para ninguém correr "em câmera lenta" contra os outros.
  const frameDt = Math.min(Math.max(rawDt, 0.001), 0.25);
  updateRemoteKarts(Math.min(frameDt, 0.1));
  // Se o aparelho travou um pouco, o cronômetro da corrida volta a bater com o relógio da TV.
  if (netGoAt && (raceState === 'racing' || raceState === 'finishing' || raceState === 'finished')) {
    const alvo = (nowTv() - netGoAt) / 1000 - frameDt;
    if (raceTime < alvo - 0.1) raceTime = alvo;
  }
  const steps = Math.max(1, Math.ceil(frameDt / 0.02));
  const stepDt = frameDt / steps;
  for (let i = 0; i < steps; i++) stepSimulation(stepDt, i < steps - 1);
  updateConfetti(Math.min(frameDt, 0.05));
  autoQuality(frameDt);
  if (MODE === 'tv') {
    updateBroadcastCamera(Math.min(frameDt, 0.1));
    tvAfterFrame(frameDt);
    if (!tvMapMode()) renderer.render(scene, camera);
  } else {
    netPhoneTick(frameDt);
    renderer.render(scene, camera);
  }
}

updateHUD();
requestAnimationFrame(animate);
