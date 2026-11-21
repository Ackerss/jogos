import * as THREE from 'three';

const ITEM_TYPES = ['banana', 'shell', 'turbo'];

const BOX_ROWS = [
  { t: 0.055, offsets: [-5.0, 0.0, 5.0] },
  { t: 0.21, offsets: [-5.2, -1.7, 1.7, 5.2] },
  { t: 0.36, offsets: [-5.0, 0.0, 5.0] },
  { t: 0.62, offsets: [-5.2, -1.7, 1.7, 5.2] },
  { t: 0.85, offsets: [-5.0, 0.0, 5.0] }
];

const BOX_FLOAT_HEIGHT = 1.05;
const BOX_PICKUP_RADIUS_XZ = 3.0;
const BOX_PICKUP_MAX_DY = 2.6;
const BOX_RESPAWN_TIME = 4.5;
const MAX_FRAME_SEGMENT_DIST = 15.0;

const BANANA_DROP_DISTANCE = 2.6;
const BANANA_GROUND_OFFSET = 0.25;
const BANANA_GRACE_PERIOD = 0.35;
const BANANA_HIT_RADIUS = 1.7;
const BANANA_SPINOUT_DURATION = 1.25;
const MAX_ACTIVE_BANANAS = 28;

const SHELL_SPAWN_DISTANCE = 2.8;
const SHELL_GROUND_OFFSET = 0.38;
const SHELL_SPEED = 64.0;
const SHELL_OWNER_GRACE = 0.25;
const SHELL_HIT_RADIUS = 1.85;
const SHELL_BANANA_HIT_RADIUS = 1.65;
const SHELL_SPINOUT_DURATION = 1.4;
const SHELL_MAX_BOUNCES = 3;
const SHELL_MAX_LIFETIME = 6.0;
const SHELL_BORDER_MARGIN = 0.5;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

/**
 * Normaliza um par (x, z) no plano horizontal XZ.
 */
function normalizeXZ(x, z) {
  const len = Math.hypot(x, z);
  if (len < 1e-6) {
    return { x: 0, z: 1 };
  }
  return { x: x / len, z: z / len };
}

/**
 * Mantém o parâmetro t da spline dentro de [0, 1).
 */
function wrapT(t) {
  const mod = t % 1;
  return mod < 0 ? mod + 1 : mod;
}

/**
 * Distância quadrada mínima no plano XZ entre um ponto P e o segmento AB.
 */
function distancePointToSegmentXZSq(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq <= 1e-8) {
    const dx = px - ax;
    const dz = pz - az;
    return dx * dx + dz * dz;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  const cx = ax + abx * t;
  const cz = az + abz * t;
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz;
}

/**
 * Calcula progresso contínuo do kart para ranking e rubber-banding.
 */
function getKartProgress(kart) {
  if (!kart) return 0;
  if (typeof kart.totalProgress === 'number' && Number.isFinite(kart.totalProgress)) {
    return kart.totalProgress;
  }
  return (kart.lap || 0) + (kart.trackT || 0);
}

/**
 * Calcula coordenada 3D na superfície da pista a partir de t e deslocamento lateral.
 */
function sampleTrackSurfacePosition(track, t, lateralOffset) {
  const wrappedT = wrapT(t);
  const frame = track.getTrackFrame(wrappedT);
  const rightXZ = normalizeXZ(frame.right.x, frame.right.z);
  const x = frame.point.x + rightXZ.x * lateralOffset;
  const z = frame.point.z + rightXZ.z * lateralOffset;
  const info = track.getClosestPointInfo(x, z, wrappedT);
  const surfaceHeight = info?.surfaceHeight ?? frame.height ?? frame.point.y ?? 0;
  const upVec = info?.up ?? frame.up ?? WORLD_UP;
  return {
    x,
    z,
    surfaceHeight,
    up: new THREE.Vector3(upVec.x, upVec.y, upVec.z).normalize(),
    info
  };
}

function createCanvas(width, height) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Mescla várias geometrias indexadas (ex: barras e cantoneiras) em um único BufferGeometry.
 */
function mergeIndexedGeometries(geometries) {
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;
  for (const g of geometries) {
    const posArr = g.attributes.position.array;
    const normArr = g.attributes.normal.array;
    const vCount = g.attributes.position.count;

    positions.set(posArr, vOffset * 3);
    normals.set(normArr, vOffset * 3);

    if (g.index) {
      const idxArr = g.index.array;
      for (let i = 0; i < idxArr.length; i++) {
        indices[iOffset + i] = idxArr[i] + vOffset;
      }
      iOffset += idxArr.length;
    } else {
      for (let i = 0; i < vCount; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += vCount;
    }

    vOffset += vCount;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

/**
 * Gera textura HD 512x512 sólida metálica/arco-íris com '?' gigante e contrastado para as 6 faces do cubo.
 */
function createSolidItemBoxTexture() {
  const canvas = createCanvas(512, 512);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');

  // Fundo sólido vibrante em gradiente ouro-âmbar / arco-íris metálico
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
  bgGrad.addColorStop(0.0, '#ffb703');
  bgGrad.addColorStop(0.28, '#fb5607');
  bgGrad.addColorStop(0.55, '#ff006e');
  bgGrad.addColorStop(0.82, '#8338ec');
  bgGrad.addColorStop(1.0, '#00bbf9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Brilho radial central dourado para realce estilo arcade premium
  const centerGlow = ctx.createRadialGradient(256, 256, 24, 256, 256, 250);
  centerGlow.addColorStop(0.0, 'rgba(255, 248, 180, 0.52)');
  centerGlow.addColorStop(0.55, 'rgba(255, 195, 0, 0.18)');
  centerGlow.addColorStop(1.0, 'rgba(15, 10, 35, 0.25)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, 512, 512);

  // Padrão geométrico tech/diagonal sutil
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 14;
  for (let offset = -512; offset < 1024; offset += 56) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + 512, 512);
    ctx.stroke();
  }
  ctx.restore();

  // Moldura escura chanfrada nas bordas + filete interno brilhante
  ctx.strokeStyle = '#1b112c';
  ctx.lineWidth = 42;
  ctx.strokeRect(21, 21, 470, 470);

  ctx.strokeStyle = 'rgba(255, 232, 130, 0.92)';
  ctx.lineWidth = 8;
  ctx.strokeRect(48, 48, 416, 416);

  // Símbolo '?' gigantesco, nítido e super contrastado
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 326px "Arial Black", "Impact", sans-serif';

  // Sombra projetada profunda
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 12;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 36;
  ctx.strokeStyle = '#09090b';
  ctx.strokeText('?', 256, 272);
  ctx.restore();

  // Contorno dourado sutil + preenchimento branco puro brilhante
  ctx.lineJoin = 'round';
  ctx.lineWidth = 28;
  ctx.strokeStyle = '#0f0a1a';
  ctx.strokeText('?', 256, 272);

  const qGrad = ctx.createLinearGradient(0, 108, 0, 410);
  qGrad.addColorStop(0.0, '#ffffff');
  qGrad.addColorStop(0.6, '#fff8cc');
  qGrad.addColorStop(1.0, '#ffd60a');
  ctx.fillStyle = qGrad;
  ctx.fillText('?', 256, 272);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Gera textura segmentada para o anel de mira no asfalto.
 */
function createGroundRingTexture() {
  const canvas = createCanvas(256, 256);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  const cx = 128;
  const cy = 128;
  const segments = 8;
  const gap = 0.14;
  const step = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    const start = i * step + gap;
    const end = (i + 1) * step - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, 98, start, end);
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.strokeStyle = i % 2 === 0 ? '#facc15' : '#22d3ee';
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 66, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255, 245, 180, 0.75)';
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Gera textura segmentada hexagonal verde para a cúpula do casco.
 */
function createTurtleShellTexture() {
  const canvas = createCanvas(256, 256);
  if (!canvas) return null;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#047857';
  ctx.fillRect(0, 0, 256, 256);

  const cols = 4;
  const rows = 4;
  const cellW = 256 / cols;
  const cellH = 256 / rows;

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const offsetX = (row % 2) * (cellW * 0.5);
      const cx = col * cellW + offsetX;
      const cy = row * cellH;
      const r = cellW * 0.44;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const plateGrad = ctx.createRadialGradient(cx, cy - r * 0.2, 4, cx, cy, r);
      plateGrad.addColorStop(0, '#6ee7b7');
      plateGrad.addColorStop(0.55, '#10b981');
      plateGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = plateGrad;
      ctx.fill();

      ctx.lineWidth = 5;
      ctx.strokeStyle = '#022c22';
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Constrói a geometria mesclada da moldura 3D metálica (12 barras de aresta + 8 cantoneiras).
 */
function createBoxFrameGeometry(size = 1.55) {
  const h = size * 0.5;
  const barThick = 0.105;
  const barLen = size + 0.08;
  const cornerSize = 0.23;
  const parts = [];

  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const gx = new THREE.BoxGeometry(barLen, barThick, barThick);
      gx.translate(0, sy * h, sz * h);
      parts.push(gx);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const gy = new THREE.BoxGeometry(barThick, barLen, barThick);
      gy.translate(sx * h, 0, sz * h);
      parts.push(gy);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const gz = new THREE.BoxGeometry(barThick, barThick, barLen);
      gz.translate(sx * h, sy * h, 0);
      parts.push(gz);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const gc = new THREE.BoxGeometry(cornerSize, cornerSize, cornerSize);
        gc.translate(sx * h, sy * h, sz * h);
        parts.push(gc);
      }
    }
  }

  return mergeIndexedGeometries(parts);
}

/**
 * Cria geometrias, texturas e materiais compartilhados entre caixas, bananas, cascos e partículas.
 */
function createSharedAssets() {
  const solidBoxTexture = createSolidItemBoxTexture();
  const groundRingTexture = createGroundRingTexture();
  const shellTexture = createTurtleShellTexture();

  // Cubo de item sólido (100% opaco) + moldura 3D metálica + anel de mira no asfalto
  const boxGeo = new THREE.BoxGeometry(1.55, 1.55, 1.55);
  const boxFrameGeo = createBoxFrameGeometry(1.55);
  const boxFrameMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0x5c3d00,
    emissiveIntensity: 0.28,
    metalness: 0.9,
    roughness: 0.12
  });

  const groundRingGeo = new THREE.RingGeometry(0.65, 1.48, 32);
  groundRingGeo.rotateX(-Math.PI / 2);
  const groundRingMat = new THREE.MeshBasicMaterial({
    map: groundRingTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // Banana 3D estilizada com acabamento brilhante
  const bananaYellowMat = new THREE.MeshPhysicalMaterial({
    color: 0xffe135,
    emissive: 0x4a3800,
    emissiveIntensity: 0.32,
    roughness: 0.25,
    metalness: 0.08,
    clearcoat: 0.7,
    clearcoatRoughness: 0.15
  });
  const bananaBrownMat = new THREE.MeshStandardMaterial({
    color: 0x5c3317,
    roughness: 0.72,
    metalness: 0.06
  });

  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.24, 0),
    new THREE.Vector3(0.05, 0.56, 0.04),
    new THREE.Vector3(0.18, 0.78, 0.09)
  ]);
  const bananaStemGeo = new THREE.TubeGeometry(stemCurve, 10, 0.11, 8, false);

  const petalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.32, 0),
    new THREE.Vector3(0.24, 0.16, 0),
    new THREE.Vector3(0.46, -0.06, 0),
    new THREE.Vector3(0.58, -0.18, 0)
  ]);
  const bananaPetalGeo = new THREE.TubeGeometry(petalCurve, 12, 0.115, 8, false);
  const bananaTipGeo = new THREE.ConeGeometry(0.095, 0.18, 8);
  const bananaTopCapGeo = new THREE.CylinderGeometry(0.065, 0.095, 0.14, 8);

  // Casco de tartaruga verde esmeralda metálico 3D
  const shellDomeGeo = new THREE.SphereGeometry(0.66, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const shellRimGeo = new THREE.TorusGeometry(0.65, 0.11, 10, 24);
  const shellBaseGeo = new THREE.CylinderGeometry(0.61, 0.55, 0.18, 20);
  const shellRidgeGeo = new THREE.TorusGeometry(0.46, 0.045, 8, 20);
  const shellHaloGeo = new THREE.TorusGeometry(0.77, 0.038, 8, 24);

  const shellDomeMat = new THREE.MeshPhysicalMaterial({
    map: shellTexture,
    color: 0x10b981,
    emissive: 0x064e3b,
    emissiveIntensity: 0.34,
    roughness: 0.18,
    metalness: 0.35,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1
  });
  const shellRimMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.38,
    metalness: 0.1
  });
  const shellBaseMat = new THREE.MeshStandardMaterial({
    color: 0x262626,
    roughness: 0.72,
    metalness: 0.12
  });
  const shellHaloMat = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.55
  });

  // Partícula efêmera de impacto/coleta/rastro
  const sparkGeo = new THREE.SphereGeometry(0.17, 8, 8);

  return {
    solidBoxTexture,
    boxGeo,
    boxFrameGeo,
    boxFrameMat,
    groundRingGeo,
    groundRingMat,
    bananaYellowMat,
    bananaBrownMat,
    bananaStemGeo,
    bananaPetalGeo,
    bananaTipGeo,
    bananaTopCapGeo,
    shellDomeGeo,
    shellRimGeo,
    shellBaseGeo,
    shellRidgeGeo,
    shellHaloGeo,
    shellDomeMat,
    shellRimMat,
    shellBaseMat,
    shellHaloMat,
    sparkGeo
  };
}

function createItemBoxVisual(assets, phase, surfaceUp) {
  const cubeRoot = new THREE.Group();
  const spinGroup = new THREE.Group();

  const cubeMaterial = new THREE.MeshPhysicalMaterial({
    map: assets.solidBoxTexture,
    color: 0xffffff,
    emissive: new THREE.Color().setHSL((phase * 0.12) % 1, 0.85, 0.32),
    emissiveIntensity: 0.26,
    transparent: false,
    opacity: 1.0,
    metalness: 0.55,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.45
  });

  const cube = new THREE.Mesh(assets.boxGeo, cubeMaterial);
  cube.castShadow = true;
  cube.receiveShadow = true;

  const frame = new THREE.Mesh(assets.boxFrameGeo, assets.boxFrameMat);
  cube.add(frame);

  // Inclinação estilosa de bloco clássico de corrida girando em torno do eixo Y
  cube.rotation.x = 0.26;
  cube.rotation.z = 0.22;
  spinGroup.add(cube);
  cubeRoot.add(spinGroup);

  // Anel luminoso no asfalto abaixo do cubo orientado pela normal da pista
  const ringPivot = new THREE.Group();
  ringPivot.quaternion.setFromUnitVectors(WORLD_UP, surfaceUp);
  const ringMesh = new THREE.Mesh(assets.groundRingGeo, assets.groundRingMat);
  ringPivot.add(ringMesh);

  return { cubeRoot, spinGroup, cubeMaterial, ringPivot, ringMesh };
}

function createBananaMesh(assets) {
  const group = new THREE.Group();

  const stem = new THREE.Mesh(assets.bananaStemGeo, assets.bananaYellowMat);
  stem.castShadow = true;
  group.add(stem);

  const topCap = new THREE.Mesh(assets.bananaTopCapGeo, assets.bananaBrownMat);
  topCap.position.set(0.21, 0.82, 0.1);
  topCap.rotation.z = -0.58;
  topCap.rotation.x = 0.28;
  group.add(topCap);

  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + 0.35;
    const petalHolder = new THREE.Group();
    petalHolder.rotation.y = angle;

    const petal = new THREE.Mesh(assets.bananaPetalGeo, assets.bananaYellowMat);
    petal.castShadow = true;
    petalHolder.add(petal);

    const tip = new THREE.Mesh(assets.bananaTipGeo, assets.bananaBrownMat);
    tip.position.set(0.62, -0.2, 0);
    tip.rotation.z = -2.15;
    petalHolder.add(tip);

    group.add(petalHolder);
  }

  group.scale.setScalar(1.22);
  return group;
}

function createShellMesh(assets) {
  const group = new THREE.Group();

  const dome = new THREE.Mesh(assets.shellDomeGeo, assets.shellDomeMat);
  dome.position.y = -0.05;
  dome.scale.set(1.0, 0.72, 1.12);
  dome.castShadow = true;
  group.add(dome);

  const ridge = new THREE.Mesh(assets.shellRidgeGeo, assets.shellRimMat);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = 0.21;
  ridge.scale.set(1.0, 1.12, 1.0);
  group.add(ridge);

  const rim = new THREE.Mesh(assets.shellRimGeo, assets.shellRimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.05;
  rim.scale.set(1.0, 1.12, 1.0);
  rim.castShadow = true;
  group.add(rim);

  const base = new THREE.Mesh(assets.shellBaseGeo, assets.shellBaseMat);
  base.position.y = -0.18;
  base.scale.set(1.0, 1.0, 1.12);
  group.add(base);

  const halo = new THREE.Mesh(assets.shellHaloGeo, assets.shellHaloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.16;
  halo.scale.set(1.0, 1.12, 1.0);
  group.add(halo);

  return group;
}

/**
 * Sorteia um item com pesos balanceados segundo a colocação relativa na corrida.
 */
function rollItemForKart(kart, karts) {
  let rank = 1;
  const myProgress = getKartProgress(kart);
  const totalKarts = Math.max(1, karts.length);

  for (let i = 0; i < karts.length; i++) {
    const other = karts[i];
    if (other && other !== kart && getKartProgress(other) > myProgress) {
      rank += 1;
    }
  }

  const ratio = totalKarts > 1 ? (rank - 1) / (totalKarts - 1) : 0.5;
  let weights;
  if (kart.luckyItems) {
    weights = [0.2, 0.25, 0.55];
  } else if (ratio <= 0.25) {
    weights = [0.46, 0.30, 0.24];
  } else if (ratio <= 0.65) {
    weights = [0.28, 0.38, 0.34];
  } else {
    weights = [0.16, 0.38, 0.46];
  }

  const roll = Math.random();
  if (roll < weights[0]) return ITEM_TYPES[0];
  if (roll < weights[0] + weights[1]) return ITEM_TYPES[1];
  return ITEM_TYPES[2];
}

/**
 * Cria e gerencia o sistema completo de Caixas de Item, Bananas, Cascos e Turbos.
 * @param {THREE.Scene} scene
 * @param {object} track
 * @param {Array<object>} karts
 * @param {object} callbacks
 */
export function createItemSystem(scene, track, karts = [], callbacks = {}, options = {}) {
  const idPrefix = options.idPrefix || '';
  const assets = createSharedAssets();
  const trackWidth = track?.trackWidth ?? 18;
  const halfTrackBounceLimit = trackWidth * 0.5 - SHELL_BORDER_MARGIN;
  const kartList = Array.isArray(karts) ? karts : [];
  const cb = callbacks || {};

  const boxes = [];
  const bananas = [];
  const shells = [];
  const bursts = [];
  const prevPositions = new Map();

  let nextEntityId = 1;
  let internalElapsed = 0;

  // Cria as 5 fileiras de caixas ao longo da pista (1ª já na reta inicial em t=0.055)
  let boxIndex = 0;
  for (let r = 0; r < BOX_ROWS.length; r++) {
    const row = BOX_ROWS[r];
    for (let c = 0; c < row.offsets.length; c++) {
      const lateralOffset = row.offsets[c];
      const sampled = sampleTrackSurfacePosition(track, row.t, lateralOffset);
      const phase = boxIndex * 0.78 + r * 0.55;
      const visual = createItemBoxVisual(assets, phase, sampled.up);

      const box = {
        id: `box-${nextEntityId++}`,
        t: row.t,
        lateralOffset,
        x: sampled.x,
        baseY: sampled.surfaceHeight,
        y: sampled.surfaceHeight + BOX_FLOAT_HEIGHT,
        z: sampled.z,
        phase,
        active: true,
        respawnTimer: 0,
        popTimer: 1,
        group: visual.cubeRoot,
        spinGroup: visual.spinGroup,
        cubeMaterial: visual.cubeMaterial,
        ringPivot: visual.ringPivot,
        ringMesh: visual.ringMesh
      };

      box.group.position.set(box.x, box.y, box.z);
      box.ringPivot.position.set(box.x, box.baseY + 0.06, box.z);
      scene.add(box.group);
      scene.add(box.ringPivot);
      boxes.push(box);
      boxIndex++;
    }
  }

  function spawnBurst(x, y, z, colorOrPalette, count = 6, maxLife = 0.36) {
    const palette = Array.isArray(colorOrPalette) ? colorOrPalette : [colorOrPalette];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
      const speed = 4.5 + Math.random() * 7.5;
      const colorHex = palette[i % palette.length];
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(assets.sparkGeo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);

      bursts.push({
        mesh,
        mat,
        vx: Math.cos(angle) * speed,
        vy: 3.8 + Math.random() * 5.2,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife
      });
    }
  }

  function spawnShellTrail(x, y, z) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.72
    });
    const mesh = new THREE.Mesh(assets.sparkGeo, mat);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.35,
      y + (Math.random() - 0.5) * 0.15,
      z + (Math.random() - 0.5) * 0.35
    );
    mesh.scale.setScalar(0.85);
    scene.add(mesh);

    bursts.push({
      mesh,
      mat,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 0.6 + Math.random() * 0.8,
      vz: (Math.random() - 0.5) * 1.4,
      life: 0,
      maxLife: 0.18
    });
  }

  function removeBananaAt(index) {
    const banana = bananas[index];
    if (!banana) return;
    banana.active = false;
    scene.remove(banana.mesh);
    bananas.splice(index, 1);
  }

  function removeShellAt(index) {
    const shell = shells[index];
    if (!shell) return;
    shell.active = false;
    scene.remove(shell.mesh);
    shells.splice(index, 1);
  }

  function spawnBanana(kart) {
    const fwdX = Math.sin(kart.heading);
    const fwdZ = Math.cos(kart.heading);
    const dropX = kart.position.x - fwdX * BANANA_DROP_DISTANCE;
    const dropZ = kart.position.z - fwdZ * BANANA_DROP_DISTANCE;

    const info = track.getClosestPointInfo(dropX, dropZ, kart.trackT);
    const baseY = info?.surfaceHeight ?? kart.position.y ?? 0;
    const dropY = baseY + BANANA_GROUND_OFFSET;

    if (bananas.length >= MAX_ACTIVE_BANANAS) {
      removeBananaAt(0);
    }

    const mesh = createBananaMesh(assets);
    mesh.position.set(dropX, dropY, dropZ);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);

    bananas.push({
      id: `${idPrefix}banana-${nextEntityId++}`,
      x: dropX,
      y: dropY,
      z: dropZ,
      baseY,
      ownerId: kart.id,
      age: 0,
      active: true,
      trackT: info?.t ?? kart.trackT ?? 0,
      lateralOffset: info?.lateralOffset ?? 0,
      mesh
    });
    const b = bananas[bananas.length - 1];
    cb.onSpawn?.({ k: 'b', id: b.id, x: b.x, y: b.y, z: b.z, by: b.baseY, t: b.trackT, o: b.ownerId });
  }

  function spawnShell(kart) {
    const dirX = Math.sin(kart.heading);
    const dirZ = Math.cos(kart.heading);
    const spawnX = kart.position.x + dirX * SHELL_SPAWN_DISTANCE;
    const spawnZ = kart.position.z + dirZ * SHELL_SPAWN_DISTANCE;

    const info = track.getClosestPointInfo(spawnX, spawnZ, kart.trackT);
    const baseY = info?.surfaceHeight ?? kart.position.y ?? 0;
    const spawnY = baseY + SHELL_GROUND_OFFSET;

    const mesh = createShellMesh(assets);
    mesh.position.set(spawnX, spawnY, spawnZ);
    scene.add(mesh);

    shells.push({
      id: `${idPrefix}shell-${nextEntityId++}`,
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      dirX,
      dirZ,
      speed: SHELL_SPEED,
      ownerId: kart.id,
      age: 0,
      trailAcc: 0,
      bouncesLeft: SHELL_MAX_BOUNCES,
      active: true,
      trackT: info?.t ?? kart.trackT ?? 0,
      mesh
    });
    const sh = shells[shells.length - 1];
    cb.onSpawn?.({ k: 's', id: sh.id, x: sh.x, y: sh.y, z: sh.z, dx: sh.dirX, dz: sh.dirZ, t: sh.trackT, o: sh.ownerId });
  }

  // Multiplayer: cria a banana/casco que outro aparelho jogou (mesmo id em todos)
  function spawnRemote(ev, ageSec = 0) {
    if (!ev || !ev.id) return;
    if (bananas.some((b) => b.id === ev.id) || shells.some((s) => s.id === ev.id)) return;
    if (removedIds.has(ev.id)) return;
    if (ev.k === 'b') {
      if (bananas.length >= MAX_ACTIVE_BANANAS) removeBananaAt(0);
      const mesh = createBananaMesh(assets);
      mesh.position.set(ev.x, ev.y, ev.z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      scene.add(mesh);
      bananas.push({ id: ev.id, x: ev.x, y: ev.y, z: ev.z, baseY: ev.by ?? ev.y, ownerId: ev.o, age: BANANA_GRACE_PERIOD, active: true, trackT: ev.t ?? 0, lateralOffset: 0, mesh });
    } else if (ev.k === 's') {
      const age = Math.min(0.6, Math.max(0, ageSec));
      const mesh = createShellMesh(assets);
      const x = ev.x + ev.dx * SHELL_SPEED * age;
      const z = ev.z + ev.dz * SHELL_SPEED * age;
      mesh.position.set(x, ev.y, z);
      scene.add(mesh);
      shells.push({ id: ev.id, x, y: ev.y, z, dirX: ev.dx, dirZ: ev.dz, speed: SHELL_SPEED, ownerId: ev.o, age, trailAcc: 0, bouncesLeft: SHELL_MAX_BOUNCES, active: true, trackT: ev.t ?? 0, mesh });
    }
  }

  // Multiplayer: outro aparelho avisou que esta banana/casco acertou alguém
  const removedIds = new Set();
  function removeById(id) {
    removedIds.add(id);
    if (removedIds.size > 300) removedIds.delete(removedIds.values().next().value);
    const bi = bananas.findIndex((b) => b.id === id);
    if (bi >= 0) {
      const b = bananas[bi];
      spawnBurst(b.x, b.y + 0.35, b.z, [0xffe135, 0xfef08a], 8);
      removeBananaAt(bi);
      return;
    }
    const si = shells.findIndex((s) => s.id === id);
    if (si >= 0) {
      const sh = shells[si];
      spawnBurst(sh.x, sh.y + 0.35, sh.z, [0x4ade80, 0xfef3c7], 10);
      removeShellAt(si);
    }
  }

  function updateBoxes(dt, time) {
    const pickupRadiusSq = BOX_PICKUP_RADIUS_XZ * BOX_PICKUP_RADIUS_XZ;

    // Pré-computa segmentos prevPos -> currPos de cada kart para coleta contínua sem falhas em alta velocidade
    const kartSegments = [];
    for (let k = 0; k < kartList.length; k++) {
      const kart = kartList[k];
      if (!kart || !kart.position) continue;
      const key = kart.id ?? kart;
      const currX = kart.position.x;
      const currY = kart.position.y;
      const currZ = kart.position.z;

      let prevX = currX;
      let prevZ = currZ;
      if (prevPositions.has(key)) {
        const stored = prevPositions.get(key);
        prevX = stored.x;
        prevZ = stored.z;
      } else if (kart.prevPosition) {
        prevX = kart.prevPosition.x;
        prevZ = kart.prevPosition.z;
      }

      // Evita falso positivo ao atravessar longa distância em teleporte de debug/reset
      if (Math.hypot(currX - prevX, currZ - prevZ) > MAX_FRAME_SEGMENT_DIST) {
        prevX = currX;
        prevZ = currZ;
      }

      if (!kart.finished) {
        kartSegments.push({ kart, prevX, prevZ, currX, currY, currZ });
      }
      prevPositions.set(key, { x: currX, z: currZ });
    }

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];

      if (!box.active) {
        box.respawnTimer -= dt;
        if (box.respawnTimer <= 1e-5) {
          box.active = true;
          box.respawnTimer = 0;
          box.popTimer = 0;
          box.group.visible = true;
          box.ringPivot.visible = true;
          box.group.scale.setScalar(0.1);
          box.ringPivot.scale.setScalar(0.1);
        }
        continue;
      }

      if (box.popTimer < 1) {
        box.popTimer = Math.min(1, box.popTimer + dt * 4.2);
        const s = 0.1 + 0.9 * (1 - Math.pow(1 - box.popTimer, 3));
        box.group.scale.setScalar(s);
        box.ringPivot.scale.setScalar(s);
      }

      // Flutuação ±0.16 e rotação estilosa no eixo Y + anel girando no asfalto
      const bob = Math.sin(time * 2.5 + box.phase) * 0.16;
      box.y = box.baseY + BOX_FLOAT_HEIGHT + bob;
      box.group.position.set(box.x, box.y, box.z);

      box.spinGroup.rotation.y += dt * 1.65;
      box.ringMesh.rotation.y -= dt * 1.45;

      const hue = (time * 0.22 + box.phase * 0.14) % 1;
      box.cubeMaterial.emissive.setHSL(hue, 0.88, 0.34);
      box.cubeMaterial.emissiveIntensity = 0.24 + Math.sin(time * 4.2 + box.phase) * 0.08;

      // Detecção cilíndrica contínua (segmento XZ + altura generosa): sempre estoura ao encostar
      for (let k = 0; k < kartSegments.length; k++) {
        const seg = kartSegments[k];
        const dy = Math.abs((seg.currY + 0.85) - box.y);
        if (dy > BOX_PICKUP_MAX_DY) continue;

        const distXZSq = distancePointToSegmentXZSq(
          box.x,
          box.z,
          seg.prevX,
          seg.prevZ,
          seg.currX,
          seg.currZ
        );

        if (distXZSq <= pickupRadiusSq) {
          const kart = seg.kart;
          if (kart.isRemote) {
            // kart de outro aparelho: só estoura o cubo (o item é sorteado no aparelho dele)
          } else if (kart.currentItem === null) {
            const item = rollItemForKart(kart, kartList);
            kart.currentItem = item;
            cb.onItemCollected?.(kart, item);
          } else {
            cb.onBoxSmashed?.(kart);
          }

          box.active = false;
          box.respawnTimer = BOX_RESPAWN_TIME;
          box.group.visible = false;
          box.ringPivot.visible = false;
          spawnBurst(
            box.x,
            box.y,
            box.z,
            [0xfacc15, 0xffffff, 0x38bdf8, 0xf472b6],
            12,
            0.42
          );
          break;
        }
      }
    }
  }

  function updateBananas(dt) {
    const hitRadiusSq = BANANA_HIT_RADIUS * BANANA_HIT_RADIUS;

    for (let i = bananas.length - 1; i >= 0; i--) {
      const banana = bananas[i];
      banana.age += dt;
      banana.mesh.rotation.y += dt * 0.6;

      for (let k = 0; k < kartList.length; k++) {
        const kart = kartList[k];
        if (!kart || kart.finished || kart.isRemote) continue;
        if (kart.id === banana.ownerId && banana.age < BANANA_GRACE_PERIOD) continue;

        const dx = kart.position.x - banana.x;
        const dy = (kart.position.y + BANANA_GROUND_OFFSET) - banana.y;
        const dz = kart.position.z - banana.z;

        if (dx * dx + dy * dy + dz * dz <= hitRadiusSq) {
          if (typeof kart.triggerSpinout === 'function') {
            kart.triggerSpinout(BANANA_SPINOUT_DURATION);
          }
          cb.onSpinoutHit?.(kart, 'banana', banana.ownerId);
          cb.onEntityHit?.(banana.id, kart, 'banana', banana.ownerId);
          removedIds.add(banana.id);
          spawnBurst(banana.x, banana.y + 0.35, banana.z, [0xffe135, 0xfef08a], 8);
          removeBananaAt(i);
          break;
        }
      }
    }
  }

  function updateShells(dt) {
    const kartHitRadiusSq = SHELL_HIT_RADIUS * SHELL_HIT_RADIUS;
    const bananaHitRadiusSq = SHELL_BANANA_HIT_RADIUS * SHELL_BANANA_HIT_RADIUS;

    for (let i = shells.length - 1; i >= 0; i--) {
      const shell = shells[i];
      shell.age += dt;
      shell.trailAcc += dt;
      shell.mesh.rotation.y += dt * 15.0;

      if (shell.age >= SHELL_MAX_LIFETIME) {
        spawnBurst(shell.x, shell.y + 0.25, shell.z, [0x22c55e, 0x86efac], 8);
        removeShellAt(i);
        continue;
      }

      // Sub-stepping impede tunneling em alta velocidade (64 u/s)
      const totalStep = shell.speed * dt;
      const subSteps = Math.max(1, Math.ceil(totalStep / 0.6));
      const stepDist = totalStep / subSteps;
      let destroyed = false;

      for (let s = 0; s < subSteps; s++) {
        shell.x += shell.dirX * stepDist;
        shell.z += shell.dirZ * stepDist;

        const info = track.getClosestPointInfo(shell.x, shell.z, shell.trackT);
        if (info) {
          shell.trackT = info.t;
          shell.y = (info.surfaceHeight ?? shell.y) + SHELL_GROUND_OFFSET;

          // Ricochete nas bordas da pista
          if (Math.abs(info.lateralOffset) >= halfTrackBounceLimit) {
            const rightXZ = normalizeXZ(info.right.x, info.right.z);
            const offsetVecX = shell.x - info.point.x;
            const offsetVecZ = shell.z - info.point.z;
            const movingOutward = shell.dirX * offsetVecX + shell.dirZ * offsetVecZ > 0;

            if (movingOutward) {
              const dotR = shell.dirX * rightXZ.x + shell.dirZ * rightXZ.z;
              const reflX = shell.dirX - 2 * dotR * rightXZ.x;
              const reflZ = shell.dirZ - 2 * dotR * rightXZ.z;
              const reflNorm = normalizeXZ(reflX, reflZ);
              shell.dirX = reflNorm.x;
              shell.dirZ = reflNorm.z;

              const outNorm = normalizeXZ(offsetVecX, offsetVecZ);
              const safeDist = Math.max(0, halfTrackBounceLimit - 0.08);
              shell.x = info.point.x + outNorm.x * safeDist;
              shell.z = info.point.z + outNorm.z * safeDist;

              shell.bouncesLeft -= 1;
              if (shell.bouncesLeft <= 0) {
                spawnBurst(shell.x, shell.y + 0.25, shell.z, [0x22c55e, 0xfef3c7], 10);
                removeShellAt(i);
                destroyed = true;
                break;
              }
            }
          }
        }

        // Colisão com bananas no chão
        for (let b = bananas.length - 1; b >= 0; b--) {
          const banana = bananas[b];
          const dx = banana.x - shell.x;
          const dz = banana.z - shell.z;
          const dy = banana.y - shell.y;
          if (dx * dx + dy * dy + dz * dz <= bananaHitRadiusSq) {
            spawnBurst(banana.x, banana.y + 0.3, banana.z, [0xfde047, 0x4ade80], 10);
            removeBananaAt(b);
            removeShellAt(i);
            destroyed = true;
            break;
          }
        }
        if (destroyed) break;

        // Colisão com karts
        for (let k = 0; k < kartList.length; k++) {
          const kart = kartList[k];
          if (!kart || kart.finished || kart.isRemote) continue;
          if (kart.id === shell.ownerId && shell.age < SHELL_OWNER_GRACE) continue;

          const dx = kart.position.x - shell.x;
          const dy = (kart.position.y + SHELL_GROUND_OFFSET) - shell.y;
          const dz = kart.position.z - shell.z;

          if (dx * dx + dy * dy + dz * dz <= kartHitRadiusSq) {
            if (typeof kart.triggerSpinout === 'function') {
              kart.triggerSpinout(SHELL_SPINOUT_DURATION);
            }
            cb.onSpinoutHit?.(kart, 'shell', shell.ownerId);
            cb.onEntityHit?.(shell.id, kart, 'shell', shell.ownerId);
            removedIds.add(shell.id);
            spawnBurst(shell.x, shell.y + 0.35, shell.z, [0x4ade80, 0xfef3c7], 10);
            removeShellAt(i);
            destroyed = true;
            break;
          }
        }
        if (destroyed) break;
      }

      if (!destroyed) {
        shell.mesh.position.set(shell.x, shell.y, shell.z);
        if (shell.trailAcc >= 0.04) {
          shell.trailAcc = 0;
          spawnShellTrail(shell.x, shell.y - 0.12, shell.z);
        }
      }
    }
  }

  function updateBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        scene.remove(p.mesh);
        p.mat.dispose();
        bursts.splice(i, 1);
        continue;
      }

      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      const t = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.05, t));
      p.mat.opacity = t;
    }
  }

  function update(dt, elapsed) {
    const safeDt = Math.min(Math.max(dt || 0, 0), 0.1);
    internalElapsed += safeDt;
    const time = typeof elapsed === 'number' && Number.isFinite(elapsed) ? elapsed : internalElapsed;

    updateBoxes(safeDt, time);
    updateBananas(safeDt);
    updateShells(safeDt);
    updateBursts(safeDt);
  }

  function useItem(kart) {
    if (!kart || !kart.currentItem) return null;

    const itemType = kart.currentItem;
    kart.currentItem = null;

    if (itemType === 'banana') {
      spawnBanana(kart);
      cb.onItemUsed?.(kart, 'banana');
      return 'banana';
    }
    if (itemType === 'shell') {
      spawnShell(kart);
      cb.onItemUsed?.(kart, 'shell');
      return 'shell';
    }
    if (itemType === 'turbo') {
      if (typeof kart.applyBoost === 'function') {
        kart.applyBoost(1.8, 17);
      }
      cb.onItemUsed?.(kart, 'turbo');
      return 'turbo';
    }

    return null;
  }

  function giveItem(kart, type) {
    if (!kart) return;
    if (type === null || ITEM_TYPES.includes(type)) {
      kart.currentItem = type;
    }
  }

  function getState() {
    return {
      boxes: boxes.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        z: b.z,
        position: { x: b.x, y: b.y, z: b.z },
        trackT: b.t,
        lateralOffset: b.lateralOffset,
        active: b.active,
        respawnTimer: b.respawnTimer
      })),
      bananas: bananas.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        z: b.z,
        position: { x: b.x, y: b.y, z: b.z },
        ownerId: b.ownerId,
        age: b.age,
        trackT: b.trackT,
        lateralOffset: b.lateralOffset,
        active: b.active
      })),
      shells: shells.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        z: s.z,
        position: { x: s.x, y: s.y, z: s.z },
        vx: s.dirX * s.speed,
        vz: s.dirZ * s.speed,
        ownerId: s.ownerId,
        age: s.age,
        bouncesLeft: s.bouncesLeft,
        trackT: s.trackT,
        active: s.active
      }))
    };
  }

  function reset() {
    while (bananas.length > 0) {
      removeBananaAt(bananas.length - 1);
    }
    while (shells.length > 0) {
      removeShellAt(shells.length - 1);
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i];
      scene.remove(p.mesh);
      p.mat.dispose();
    }
    bursts.length = 0;
    prevPositions.clear();

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      box.active = true;
      box.respawnTimer = 0;
      box.popTimer = 1;
      box.group.visible = true;
      box.ringPivot.visible = true;
      box.group.scale.setScalar(1);
      box.ringPivot.scale.setScalar(1);
    }

    for (let i = 0; i < kartList.length; i++) {
      if (kartList[i]) {
        kartList[i].currentItem = null;
      }
    }
  }

  return {
    update,
    useItem,
    giveItem,
    getState,
    reset,
    spawnRemote,
    removeById
  };
}

/**
 * Cria controlador de Inteligência Artificial competitiva para um kart adversário.
 * @param {object} kart
 * @param {object} track
 * @param {object} itemSystem
 * @param {Array<object>} allKarts
 * @param {number} difficulty
 */
export function createAIController(kart, track, itemSystem, allKarts = [], difficulty = 1.0, tuning = {}) {
  const tune = {
    // velocidade máxima base do bot (1 = igual ao jogador)
    baseSpeed: 1.0,
    // quanto o bot desacelera quando está muito à frente do jogador
    aheadSlow: 0.1,
    // quanto o bot acelera quando está muito atrás do jogador
    behindBoost: 0.05,
    // false = bot não dispara casco/banana (piloto automático do jogador)
    useItems: true,
    ...tuning
  };
  const trackWidth = track?.trackWidth ?? 18;
  const maxSafeLane = trackWidth * 0.36;

  const indexInGrid = Math.max(0, allKarts.indexOf(kart));
  const seed = (indexInGrid + 1) * 1.73;

  let elapsedAI = 0;
  let currentLaneOffset = THREE.MathUtils.clamp(((indexInGrid % 3) - 1) * 2.2, -maxSafeLane, maxSafeLane);
  let lastObservedItem = null;
  let itemHoldTimer = 0;
  let bananaHoldLimit = 2.8;
  let isDrifting = false;
  let driftSign = 0;
  let hasStartedMoving = false;
  let stuckTimer = 0;
  let recoveryTimer = 0;
  let recoverySteerSign = 1;

  function computeControls(dt) {
    const safeDt = Math.min(Math.max(dt || 0.016, 0.001), 0.1);
    elapsedAI += safeDt;

    if (!kart || kart.finished) {
      return { throttle: 0, steer: 0, drift: false, useItem: false };
    }

    if (kart.speed > 6) {
      hasStartedMoving = true;
    }

    const forwardX = Math.sin(kart.heading);
    const forwardZ = Math.cos(kart.heading);
    const rightX = -Math.cos(kart.heading);
    const rightZ = Math.sin(kart.heading);

    const currentInfo = track.getClosestPointInfo(kart.position.x, kart.position.z, kart.trackT);
    const currentT = currentInfo?.t ?? kart.trackT ?? 0;
    const lateralOffset = currentInfo?.lateralOffset ?? 0;
    const trackRightXZ = currentInfo
      ? normalizeXZ(currentInfo.right.x, currentInfo.right.z)
      : { x: rightX, z: rightZ };
    const trackCenterPoint = currentInfo?.point ?? kart.position;

    // 1. Detecção de curvatura adiante e lookahead dinâmico
    const speedFactor = THREE.MathUtils.clamp((kart.speed || 0) / 44, 0, 1.25);
    let lookAhead = THREE.MathUtils.lerp(0.030, 0.047, speedFactor);

    const nearFrame = track.getTrackFrame(wrapT(currentT + 0.02));
    const farFrame = track.getTrackFrame(wrapT(currentT + 0.065));
    const nearTan = normalizeXZ(nearFrame.tangent.x, nearFrame.tangent.z);
    const farTan = normalizeXZ(farFrame.tangent.x, farFrame.tangent.z);
    const curveDot = THREE.MathUtils.clamp(nearTan.x * farTan.x + nearTan.z * farTan.z, -1, 1);
    const upcomingTurnSeverity = Math.acos(curveDot);

    if (upcomingTurnSeverity > 0.45) {
      lookAhead = Math.min(lookAhead, 0.034);
    }

    const offTrackFactor = Math.abs(lateralOffset);
    if (offTrackFactor > trackWidth * 0.48) {
      lookAhead = 0.020;
    }

    // 2. Faixa base (traçado suave + tangência nas curvas)
    let desiredLane = Math.sin(elapsedAI * 0.42 + seed) * 2.2;
    if (upcomingTurnSeverity > 0.28) {
      const curveRightDot =
        (farTan.x - nearTan.x) * trackRightXZ.x + (farTan.z - nearTan.z) * trackRightXZ.z;
      desiredLane += THREE.MathUtils.clamp(curveRightDot * 6.5, -3.6, 3.6);
    }

    // 3. Consulta estado dos itens para desviar de bananas e buscar caixas
    const itemState = itemSystem && typeof itemSystem.getState === 'function'
      ? itemSystem.getState()
      : { boxes: [], bananas: [], shells: [] };

    let avoidingBanana = false;
    const activeBananas = itemState.bananas || [];
    let closestThreatDist = 24;

    for (let i = 0; i < activeBananas.length; i++) {
      const b = activeBananas[i];
      if (!b.active) continue;

      const bx = b.x ?? b.position?.x ?? 0;
      const bz = b.z ?? b.position?.z ?? 0;
      const dx = bx - kart.position.x;
      const dz = bz - kart.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 24) continue;

      const distFwd = dx * forwardX + dz * forwardZ;
      const distRight = dx * rightX + dz * rightZ;

      if (distFwd > 0.6 && distFwd < closestThreatDist && Math.abs(distRight) < 3.4) {
        closestThreatDist = distFwd;
        avoidingBanana = true;

        const bananaTrackOffset =
          (bx - trackCenterPoint.x) * trackRightXZ.x + (bz - trackCenterPoint.z) * trackRightXZ.z;

        const dodgeAmount = 4.1;
        let dodgeLane = bananaTrackOffset + (distRight >= 0 ? -dodgeAmount : dodgeAmount);
        if (Math.abs(dodgeLane) > maxSafeLane) {
          dodgeLane = bananaTrackOffset + (bananaTrackOffset >= 0 ? -dodgeAmount : dodgeAmount);
        }
        desiredLane = dodgeLane;
      }
    }

    // Busca caixa de item ativa à frente quando estiver sem item
    if (!avoidingBanana && kart.currentItem === null) {
      const activeBoxes = itemState.boxes || [];
      let bestBoxScore = Infinity;
      let chosenBoxLane = null;

      for (let i = 0; i < activeBoxes.length; i++) {
        const box = activeBoxes[i];
        if (!box.active) continue;

        const bx = box.x ?? box.position?.x ?? 0;
        const bz = box.z ?? box.position?.z ?? 0;
        const dx = bx - kart.position.x;
        const dz = bz - kart.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 28) continue;

        const distFwd = dx * forwardX + dz * forwardZ;
        const distRight = dx * rightX + dz * rightZ;

        if (distFwd > 2.2 && distFwd < 28 && Math.abs(distRight) < 9.5) {
          const score = dist + Math.abs(distRight) * 1.4;
          if (score < bestBoxScore) {
            bestBoxScore = score;
            chosenBoxLane =
              typeof box.lateralOffset === 'number'
                ? box.lateralOffset
                : (bx - trackCenterPoint.x) * trackRightXZ.x + (bz - trackCenterPoint.z) * trackRightXZ.z;
          }
        }
      }

      if (chosenBoxLane !== null) {
        desiredLane = chosenBoxLane;
      }
    }

    // 4. Desvio suave para ultrapassar karts lentos imediatamente à frente
    if (!avoidingBanana) {
      for (let i = 0; i < allKarts.length; i++) {
        const other = allKarts[i];
        if (!other || other === kart || other.finished) continue;

        const dx = other.position.x - kart.position.x;
        const dz = other.position.z - kart.position.z;
        const distFwd = dx * forwardX + dz * forwardZ;
        const distRight = dx * rightX + dz * rightZ;

        if (distFwd > 1.5 && distFwd < 11.5 && Math.abs(distRight) < 2.2 && (other.speed || 0) <= (kart.speed || 0) + 4) {
          const otherTrackOffset =
            (other.position.x - trackCenterPoint.x) * trackRightXZ.x +
            (other.position.z - trackCenterPoint.z) * trackRightXZ.z;
          const overtakeSide = otherTrackOffset >= 0 ? -3.2 : 3.2;
          desiredLane = THREE.MathUtils.clamp(otherTrackOffset + overtakeSide, -maxSafeLane, maxSafeLane);
          break;
        }
      }
    }

    if (offTrackFactor > trackWidth * 0.45) {
      desiredLane = 0;
    }

    desiredLane = THREE.MathUtils.clamp(desiredLane, -maxSafeLane, maxSafeLane);
    const laneLerpAlpha = 1 - Math.exp(-(avoidingBanana ? 7.5 : 4.2) * safeDt);
    currentLaneOffset = THREE.MathUtils.lerp(currentLaneOffset, desiredLane, laneLerpAlpha);

    // 5. Cálculo do alvo de lookahead e ângulo assinado para direção
    const lookT = wrapT(currentT + lookAhead);
    const targetFrame = track.getTrackFrame(lookT);
    const targetRightXZ = normalizeXZ(targetFrame.right.x, targetFrame.right.z);

    const targetX = targetFrame.point.x + targetRightXZ.x * currentLaneOffset;
    const targetZ = targetFrame.point.z + targetRightXZ.z * currentLaneOffset;

    const toTargetX = targetX - kart.position.x;
    const toTargetZ = targetZ - kart.position.z;

    const dotRight = toTargetX * rightX + toTargetZ * rightZ;
    const dotFwd = toTargetX * forwardX + toTargetZ * forwardZ;
    const signedAngle = Math.atan2(dotRight, dotFwd);

    const steer = THREE.MathUtils.clamp(signedAngle * 2.2, -1, 1);

    // 6. Drift inteligente em curvas médias/fechadas dentro da pista
    const absAngle = Math.abs(signedAngle);
    const onSafeRoadForDrift = Math.abs(lateralOffset) < trackWidth * 0.38;

    if (!isDrifting) {
      if (absAngle > 0.24 && (kart.speed || 0) > 20 && onSafeRoadForDrift && kart.isGrounded !== false && (kart.spinoutTimer || 0) <= 0) {
        isDrifting = true;
        driftSign = Math.sign(signedAngle) || 1;
      }
    } else {
      const reversedTurn = signedAngle * driftSign < -0.18;
      const curveFinishedOrCharged = absAngle <= 0.12 && (upcomingTurnSeverity < 0.24 || (kart.driftCharge || 0) >= 0.85);
      if (
        reversedTurn ||
        curveFinishedOrCharged ||
        (kart.speed || 0) < 16 ||
        Math.abs(lateralOffset) > trackWidth * 0.43 ||
        (kart.spinoutTimer || 0) > 0
      ) {
        isDrifting = false;
        driftSign = 0;
      }
    }
    const drift = isDrifting;

    // 7. Uso estratégico de itens
    if (kart.currentItem !== lastObservedItem) {
      lastObservedItem = kart.currentItem;
      itemHoldTimer = 0;
      bananaHoldLimit = 2.0 + Math.random() * 2.0;
    } else if (kart.currentItem !== null) {
      itemHoldTimer += safeDt;
    }

    let useItem = false;
    if (kart.currentItem !== null && (kart.spinoutTimer || 0) <= 0) {
      if (kart.currentItem === 'turbo') {
        if (absAngle < 0.22 && (kart.boostTimer || 0) <= 0.08 && Math.abs(lateralOffset) < trackWidth * 0.4) {
          useItem = true;
        }
      } else if (kart.currentItem === 'shell') {
        for (let i = 0; i < allKarts.length; i++) {
          const other = allKarts[i];
          if (!other || other === kart || other.finished) continue;

          const dx = other.position.x - kart.position.x;
          const dz = other.position.z - kart.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 2.2 && dist < 35) {
            const cosAngle = (dx * forwardX + dz * forwardZ) / dist;
            if (cosAngle > 0.85) {
              useItem = true;
              break;
            }
          }
        }
        if (!useItem && itemHoldTimer > 9.0 && absAngle < 0.14) {
          useItem = true;
        }
      } else if (kart.currentItem === 'banana') {
        for (let i = 0; i < allKarts.length; i++) {
          const other = allKarts[i];
          if (!other || other === kart || other.finished) continue;

          const dx = other.position.x - kart.position.x;
          const dz = other.position.z - kart.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1.2 && dist < 14) {
            const cosAngle = (dx * forwardX + dz * forwardZ) / dist;
            if (cosAngle < -0.4) {
              useItem = true;
              break;
            }
          }
        }
        if (!useItem && itemHoldTimer >= bananaHoldLimit && Math.abs(lateralOffset) < trackWidth * 0.44) {
          useItem = true;
        }
      }
    }

    if (!tune.useItems) useItem = useItem && kart.currentItem === 'turbo';

    // 8. Rubber-banding suave + ajuste pela dificuldade
    let playerKart = null;
    for (let i = 0; i < allKarts.length; i++) {
      const k = allKarts[i];
      if (k && k.isPlayer && k !== kart && (!playerKart || getKartProgress(k) > getKartProgress(playerKart))) {
        playerKart = k;
      }
    }
    let targetScale = tune.baseSpeed * (0.97 + 0.03 * difficulty);
    if (playerKart && !playerKart.finished) {
      const diff = getKartProgress(kart) - getKartProgress(playerKart);
      if (diff > 0.03) {
        targetScale -= THREE.MathUtils.clamp((diff - 0.03) * 0.8, 0, tune.aheadSlow);
      } else if (diff < -0.03) {
        targetScale += THREE.MathUtils.clamp((-diff - 0.03) * 0.6, 0, tune.behindBoost);
      }
    }
    if (tune.controlSpeed !== false) {
      kart.topSpeedScale += (targetScale - kart.topSpeedScale) * Math.min(1, safeDt * 1.5);
    }
    const baseThrottle = THREE.MathUtils.clamp(0.84 + difficulty * 0.13, 0.72, 1.0);
    let throttle = baseThrottle;

    if (playerKart && playerKart !== kart) {
      const progressDiff = getKartProgress(kart) - getKartProgress(playerKart);
      if (progressDiff > 0.06) {
        const slowdown = THREE.MathUtils.clamp((progressDiff - 0.06) * 1.1, 0, 0.16);
        throttle = Math.max(0.76, baseThrottle - slowdown);
      } else if (progressDiff < -0.05) {
        const catchup = THREE.MathUtils.clamp((-progressDiff - 0.05) * 1.4, 0, 0.16);
        throttle = Math.min(1.0, baseThrottle + catchup);
      }
    }

    if (absAngle > 0.58 && !drift && (kart.speed || 0) > 26) {
      throttle *= 0.86;
    }

    // 9. Anti-travamento (Recovery) para jamais ficar preso em guard-rails
    if (recoveryTimer > 0) {
      recoveryTimer -= safeDt;
      if (recoveryTimer > 0.25) {
        return {
          throttle: -0.85,
          steer: -recoverySteerSign,
          drift: false,
          useItem: false
        };
      }
      return {
        throttle: 1.0,
        steer,
        drift: false,
        useItem: false
      };
    }

    if (hasStartedMoving && (kart.spinoutTimer || 0) <= 0 && (kart.speed || 0) < 4) {
      stuckTimer += safeDt;
      if (stuckTimer > 1.2) {
        stuckTimer = 0;
        recoveryTimer = 0.75;
        recoverySteerSign = signedAngle >= 0 ? 1 : -1;
      }
    } else {
      stuckTimer = Math.max(0, stuckTimer - safeDt * 2);
    }

    return {
      throttle: THREE.MathUtils.clamp(throttle, -1, 1),
      steer,
      drift,
      useItem
    };
  }

  return {
    computeControls
  };
}
