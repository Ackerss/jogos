import * as THREE from 'three';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const BASE_MAX_SPEED = 38.0;
const BOOST_CAP_SPEED = 55.0;
const OFFROAD_MAX_SPEED = 22.0;
const REVERSE_MAX_SPEED = -14.0;
const GRAVITY = 26.0;
const SUSP_K = 140.0;
const SUSP_C = 16.0;
const SUSP_MIN = -0.28;
const SUSP_MAX = 0.22;
const KART_COLLISION_RADIUS = 1.35;
const TOTAL_LAPS = 3;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function extractKartNumber(options) {
  if (options?.number !== undefined && options?.number !== null) {
    const explicit = String(options.number).trim();
    if (explicit.length > 0) return explicit;
  }
  const idStr = String(options?.id ?? '');
  const match = idStr.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (options?.isPlayer && num === 0) return '1';
    return String(num);
  }
  if (options?.isPlayer) return '1';
  const nameStr = String(options?.name ?? 'K');
  let hash = 0;
  for (let i = 0; i < nameStr.length; i++) {
    hash = (hash * 31 + nameStr.charCodeAt(i)) % 99;
  }
  return String((hash % 8) + 2);
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createEmblemTexture(numberLabel, bodyColor, accentColor) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);

  // Outer circle badge with vivid border
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 20;
  ctx.strokeStyle = new THREE.Color(accentColor ?? '#facc15').getStyle();
  ctx.stroke();

  // Inner pinstripe
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = new THREE.Color(bodyColor ?? '#0f172a').getStyle();
  ctx.stroke();

  // Crisp racing number
  const fontSize = numberLabel.length >= 3 ? 86 : numberLabel.length === 2 ? 108 : 124;
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberLabel, 128, 134);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createRearPlateTexture(numberLabel, bodyColor, accentColor) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 144);

  drawRoundedRectPath(ctx, 8, 8, 240, 128, 22);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = new THREE.Color(bodyColor ?? '#2563eb').getStyle();
  ctx.stroke();

  drawRoundedRectPath(ctx, 18, 18, 220, 108, 14);
  ctx.lineWidth = 5;
  ctx.strokeStyle = new THREE.Color(accentColor ?? '#facc15').getStyle();
  ctx.stroke();

  const fontSize = numberLabel.length >= 3 ? 66 : numberLabel.length === 2 ? 82 : 94;
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${numberLabel}`, 128, 76);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createCarbonFiberTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#11151d';
  ctx.fillRect(0, 0, 64, 64);

  const cell = 8;
  for (let y = 0; y < 64; y += cell) {
    for (let x = 0; x < 64; x += cell) {
      const ix = (x / cell) | 0;
      const iy = (y / cell) | 0;
      const phase = (ix + iy) % 4;
      if (phase === 0 || phase === 1) {
        const grad = ctx.createLinearGradient(x, y, x + cell, y);
        grad.addColorStop(0, '#171c26');
        grad.addColorStop(0.5, '#2b3444');
        grad.addColorStop(1, '#141922');
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(x, y, x, y + cell);
        grad.addColorStop(0, '#0d1016');
        grad.addColorStop(0.5, '#202735');
        grad.addColorStop(1, '#0d1016');
        ctx.fillStyle = grad;
      }
      ctx.fillRect(x, y, cell, cell);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createTireTreadTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#181b22';
  ctx.fillRect(0, 0, 128, 128);

  // Subtle rubber grain + circumferential & diagonal tread grooves
  ctx.fillStyle = '#101218';
  ctx.fillRect(0, 36, 128, 6);
  ctx.fillRect(0, 86, 128, 6);

  ctx.strokeStyle = '#0c0e13';
  ctx.lineWidth = 4;
  for (let x = -32; x < 160; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x + 18, 56);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 18, 72);
    ctx.lineTo(x, 106);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createBotBadgeTexture(label, colorHex) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 136;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 136);

  const badgeColor = new THREE.Color(colorHex ?? '#38bdf8').getStyle();

  // Dark translucent pill background with thick colored border
  drawRoundedRectPath(ctx, 10, 10, 492, 116, 28);
  ctx.fillStyle = 'rgba(10, 15, 28, 0.82)';
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = badgeColor;
  ctx.stroke();

  // Luminous indicator dot on left
  ctx.save();
  ctx.beginPath();
  ctx.arc(62, 68, 28, 0, Math.PI * 2);
  ctx.fillStyle = badgeColor;
  ctx.shadowColor = badgeColor;
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.restore();

  // Specular highlight inside dot
  ctx.beginPath();
  ctx.arc(54, 59, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fill();

  // Crisp label text
  const text = String(label || 'BOT').toUpperCase();
  let fontSize = 44;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  while (ctx.measureText(text).width > 368 && fontSize > 24) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, 106, 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createTireGeometry(radius, width) {
  const halfW = width * 0.5;
  const points = [
    new THREE.Vector2(radius * 0.54, -halfW * 0.82),
    new THREE.Vector2(radius * 0.86, -halfW * 0.96),
    new THREE.Vector2(radius * 0.985, -halfW * 0.72),
    new THREE.Vector2(radius, -halfW * 0.28),
    new THREE.Vector2(radius, halfW * 0.28),
    new THREE.Vector2(radius * 0.985, halfW * 0.72),
    new THREE.Vector2(radius * 0.86, halfW * 0.96),
    new THREE.Vector2(radius * 0.54, halfW * 0.82)
  ];
  const geo = new THREE.LatheGeometry(points, 28);
  geo.rotateZ(Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createCoilSpringGeometry(coilRadius, height, turns, tubeRadius) {
  const pts = [];
  const totalSamples = turns * 14;
  for (let i = 0; i <= totalSamples; i++) {
    const u = i / totalSamples;
    const angle = u * turns * Math.PI * 2;
    const y = (u - 0.5) * height;
    pts.push(new THREE.Vector3(Math.cos(angle) * coilRadius, y, Math.sin(angle) * coilRadius));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, totalSamples, tubeRadius, 6, false);
}

function buildWheelMesh(radius, width, isLeft, mats) {
  const wheelGroup = new THREE.Group();

  // Molded treaded rubber tire
  const tireGeo = createTireGeometry(radius, width);
  const tireMesh = new THREE.Mesh(tireGeo, mats.rubber);
  tireMesh.castShadow = true;
  tireMesh.receiveShadow = true;
  wheelGroup.add(tireMesh);

  // Inner dark wheel barrel
  const drumGeo = new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width * 0.78, 20);
  drumGeo.rotateZ(Math.PI * 0.5);
  const drumMesh = new THREE.Mesh(drumGeo, mats.chassis);
  wheelGroup.add(drumMesh);

  const sideSign = isLeft ? 1 : -1;
  const outerRimX = sideSign * (width * 0.41);

  // Inner metallic brake rotor (spins with wheel inside fixed caliper)
  const rotorGeo = new THREE.CylinderGeometry(radius * 0.46, radius * 0.46, width * 0.09, 20);
  rotorGeo.rotateZ(Math.PI * 0.5);
  const rotorMesh = new THREE.Mesh(rotorGeo, mats.chrome);
  rotorMesh.position.x = -sideSign * (width * 0.14);
  wheelGroup.add(rotorMesh);

  // F1-style colored sidewall stripe
  const sidewallStripeGeo = new THREE.TorusGeometry(radius * 0.73, radius * 0.022, 6, 28);
  sidewallStripeGeo.rotateY(Math.PI * 0.5);
  const sidewallStripe = new THREE.Mesh(sidewallStripeGeo, mats.accent);
  sidewallStripe.position.x = sideSign * (width * 0.465);
  wheelGroup.add(sidewallStripe);

  // Polished alloy rim lip
  const rimRingGeo = new THREE.TorusGeometry(radius * 0.55, radius * 0.055, 8, 24);
  rimRingGeo.rotateY(Math.PI * 0.5);
  const rimRing = new THREE.Mesh(rimRingGeo, mats.chrome);
  rimRing.position.x = outerRimX;
  wheelGroup.add(rimRing);

  // 5-spoke metallic alloy wheel rim
  const spokeCount = 5;
  const spokeGeo = new THREE.BoxGeometry(width * 0.13, radius * 0.50, radius * 0.105);
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, mats.chrome);
    spoke.position.x = outerRimX * 0.96;
    spoke.position.y = Math.cos(angle) * radius * 0.27;
    spoke.position.z = Math.sin(angle) * radius * 0.27;
    spoke.rotation.x = -angle;
    wheelGroup.add(spoke);
  }

  // Painted center-lock nut & rim trim ring
  const capGeo = new THREE.CylinderGeometry(radius * 0.19, radius * 0.21, width * 0.18, 12);
  capGeo.rotateZ(Math.PI * 0.5);
  const capMesh = new THREE.Mesh(capGeo, mats.body);
  capMesh.position.x = outerRimX * 1.03;
  wheelGroup.add(capMesh);

  const innerCap = new THREE.Mesh(capGeo, mats.chrome);
  innerCap.position.x = -outerRimX * 0.92;
  wheelGroup.add(innerCap);

  return wheelGroup;
}

function buildBrakeCaliperMesh(radius, width, isLeft, mats) {
  const sideSign = isLeft ? 1 : -1;
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.28, radius * 0.34, radius * 0.26),
    mats.accent
  );
  caliper.position.set(-sideSign * (width * 0.14), radius * 0.25, -radius * 0.27);
  return caliper;
}

function createNoseFairingGeometry() {
  // Profile in XY where X = +Z forward, Y = +Y up
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, 0.14);
  shape.lineTo(1.12, 0.14);
  shape.quadraticCurveTo(1.25, 0.18, 1.24, 0.28);
  shape.quadraticCurveTo(1.06, 0.44, 0.62, 0.48);
  shape.lineTo(0.24, 0.62);
  shape.quadraticCurveTo(0.05, 0.64, -0.08, 0.50);
  shape.closePath();

  const extrudeSettings = {
    depth: 0.72,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.045
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.translate(0, 0, -0.36);
  geo.rotateY(-Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function createSidepodGeometry() {
  // Profile in XY -> rotated to +Z forward
  const shape = new THREE.Shape();
  shape.moveTo(-0.42, 0.12);
  shape.lineTo(0.46, 0.12);
  shape.quadraticCurveTo(0.54, 0.24, 0.44, 0.38);
  shape.lineTo(-0.22, 0.44);
  shape.quadraticCurveTo(-0.46, 0.40, -0.46, 0.20);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035
  });
  geo.translate(0, 0, -0.14);
  geo.rotateY(-Math.PI * 0.5);
  geo.computeVertexNormals();
  return geo;
}

function buildKartModel(options) {
  const bodyColor = options?.color ?? '#e11d48';
  const accentColor = options?.accentColor ?? '#facc15';
  const numberLabel = extractKartNumber(options);

  const emblemTexture = createEmblemTexture(numberLabel, bodyColor, accentColor);
  const rearPlateTexture = createRearPlateTexture(numberLabel, bodyColor, accentColor);
  const carbonTexture = createCarbonFiberTexture();
  const tireTreadTexture = createTireTreadTexture();
  const botBadgeTexture = !options?.isPlayer
    ? createBotBadgeTexture(options?.badgeLabel || options?.name || `BOT #${numberLabel}`, bodyColor)
    : null;

  const mats = {
    // Automotive metallic clearcoat paint
    body: new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      metalness: 0.38,
      roughness: 0.22,
      clearcoat: 1.0,
      clearcoatRoughness: 0.10,
      envMapIntensity: 1.4
    }),
    accent: new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 0.40,
      roughness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.10,
      envMapIntensity: 1.4
    }),
    carbon: new THREE.MeshStandardMaterial({
      color: carbonTexture ? 0xffffff : 0x161b24,
      map: carbonTexture,
      roughness: 0.36,
      metalness: 0.28,
      envMapIntensity: 1.15
    }),
    chassis: new THREE.MeshStandardMaterial({
      color: 0x1d232f,
      roughness: 0.48,
      metalness: 0.50,
      envMapIntensity: 1.1
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: tireTreadTexture ? 0xffffff : 0x161920,
      map: tireTreadTexture,
      roughness: 0.84,
      metalness: 0.06
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xe6edf6,
      metalness: 0.95,
      roughness: 0.08,
      envMapIntensity: 1.65
    }),
    seat: new THREE.MeshStandardMaterial({
      color: 0x1a1c24,
      roughness: 0.78,
      metalness: 0.08
    }),
    visor: new THREE.MeshPhysicalMaterial({
      color: 0x060c18,
      metalness: 0.88,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.65
    }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0xbae6fd,
      emissiveIntensity: 1.85,
      roughness: 0.10,
      metalness: 0.15
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xff2244,
      emissive: 0xff0022,
      emissiveIntensity: 0.9,
      roughness: 0.16,
      metalness: 0.2
    }),
    darkHole: new THREE.MeshBasicMaterial({
      color: 0x040507
    }),
    emblem: new THREE.MeshStandardMaterial({
      color: emblemTexture ? 0xffffff : 0xf8fafc,
      map: emblemTexture,
      roughness: 0.28,
      metalness: 0.08
    }),
    rearPlate: new THREE.MeshStandardMaterial({
      color: rearPlateTexture ? 0xffffff : 0xf8fafc,
      map: rearPlateTexture,
      roughness: 0.28,
      metalness: 0.08
    }),
    flameOuter: new THREE.MeshBasicMaterial({
      color: 0xff6a00,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    }),
    flameCore: new THREE.MeshBasicMaterial({
      color: 0x56ccf2,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    }),
    driftGlow: new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  };

  const rootGroup = new THREE.Group();
  rootGroup.name = `kart-${options?.id ?? 'unit'}`;

  // Optional floating bot badge sprite above opponents for easy recognition
  let botBadgeSprite = null;
  if (!options?.isPlayer && botBadgeTexture) {
    const spriteMat = new THREE.SpriteMaterial({
      map: botBadgeTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
    botBadgeSprite = new THREE.Sprite(spriteMat);
    botBadgeSprite.position.set(0, 2.25, 0);
    const badgeScale = options?.badgeScale || 1;
    botBadgeSprite.scale.set(1.85 * badgeScale, 0.48 * badgeScale, 1);
    botBadgeSprite.position.y = 2.25 + (badgeScale - 1) * 0.35;
    rootGroup.add(botBadgeSprite);
  }

  // Spins during spinout & holds visual drift slip angle
  const spinoutGroup = new THREE.Group();
  rootGroup.add(spinoutGroup);

  // Sprung chassis assembly
  const suspensionGroup = new THREE.Group();
  spinoutGroup.add(suspensionGroup);

  // --- 1. Carbon Fiber Floorpan & Tubular Frame ---
  const floorGeo = new THREE.BoxGeometry(0.94, 0.1, 2.08);
  const floorMesh = new THREE.Mesh(floorGeo, mats.carbon);
  floorMesh.position.set(0, 0.18, 0.02);
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  suspensionGroup.add(floorMesh);

  // Chrome tubular side rails
  const railGeo = new THREE.CylinderGeometry(0.036, 0.036, 1.88, 10);
  railGeo.rotateX(Math.PI * 0.5);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, mats.chrome);
    rail.position.set(side * 0.44, 0.21, 0.02);
    suspensionGroup.add(rail);
  }

  // --- 2. Aerodynamic Nose Fairing + Racing Stripe + Front Emblem + LED Headlights ---
  const noseGeo = createNoseFairingGeometry();
  const noseMesh = new THREE.Mesh(noseGeo, mats.body);
  noseMesh.position.set(0, 0.06, 0.12);
  noseMesh.castShadow = true;
  noseMesh.receiveShadow = true;
  suspensionGroup.add(noseMesh);

  // Twin racing stripes along nose
  const stripeGeo = new THREE.BoxGeometry(0.24, 0.04, 0.88);
  const stripeMesh = new THREE.Mesh(stripeGeo, mats.accent);
  stripeMesh.position.set(0, 0.47, 0.86);
  stripeMesh.rotation.x = 0.24;
  suspensionGroup.add(stripeMesh);

  // Front circular emblem/number plate
  const emblemGeo = new THREE.CircleGeometry(0.175, 24);
  const emblemMesh = new THREE.Mesh(emblemGeo, mats.emblem);
  emblemMesh.position.set(0, 0.528, 0.82);
  emblemMesh.rotation.x = -Math.PI * 0.5 + 0.24;
  suspensionGroup.add(emblemMesh);

  // Front LED Headlights with chrome bezel
  const bezelGeo = new THREE.BoxGeometry(0.17, 0.068, 0.08);
  const lensGeo = new THREE.BoxGeometry(0.14, 0.045, 0.04);
  for (const side of [-1, 1]) {
    const bezel = new THREE.Mesh(bezelGeo, mats.chrome);
    bezel.position.set(side * 0.29, 0.28, 1.24);
    bezel.rotation.y = side * -0.18;
    bezel.rotation.x = 0.14;
    suspensionGroup.add(bezel);

    const lens = new THREE.Mesh(lensGeo, mats.headlight);
    lens.position.set(side * 0.29, 0.28, 1.265);
    lens.rotation.y = side * -0.18;
    lens.rotation.x = 0.14;
    suspensionGroup.add(lens);
  }

  // --- 3. Sculpted Sidepods ---
  const sidepodGeo = createSidepodGeometry();
  const intakeGeo = new THREE.BoxGeometry(0.22, 0.16, 0.06);
  const podStripeGeo = new THREE.BoxGeometry(0.045, 0.075, 0.70);
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(sidepodGeo, mats.body);
    pod.position.set(side * 0.54, 0.09, 0.02);
    pod.castShadow = true;
    pod.receiveShadow = true;
    suspensionGroup.add(pod);

    const podStripe = new THREE.Mesh(podStripeGeo, mats.accent);
    podStripe.position.set(side * 0.695, 0.32, 0.03);
    suspensionGroup.add(podStripe);

    const intake = new THREE.Mesh(intakeGeo, mats.darkHole);
    intake.position.set(side * 0.54, 0.29, 0.48);
    suspensionGroup.add(intake);
  }

  // --- 4. Carbon & Rubberized Front/Rear Bumpers + Rear Diffuser + LED Taillights ---
  const frontBumperMain = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.13, 0.16),
    mats.carbon
  );
  frontBumperMain.position.set(0, 0.22, 1.32);
  frontBumperMain.castShadow = true;
  suspensionGroup.add(frontBumperMain);

  const frontBumperLip = new THREE.Mesh(
    new THREE.BoxGeometry(1.06, 0.045, 0.07),
    mats.accent
  );
  frontBumperLip.position.set(0, 0.165, 1.37);
  suspensionGroup.add(frontBumperLip);

  const cornerPadGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12);
  for (const side of [-1, 1]) {
    const corner = new THREE.Mesh(cornerPadGeo, mats.rubber);
    corner.position.set(side * 0.59, 0.22, 1.27);
    suspensionGroup.add(corner);

    const bumperBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8),
      mats.chrome
    );
    bumperBar.rotation.x = Math.PI * 0.5;
    bumperBar.position.set(side * 0.34, 0.22, 1.2);
    suspensionGroup.add(bumperBar);
  }

  // Rear bumper wrap-around (carbon) + under-body carbon diffuser
  const rearBumperBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.12, 0.15),
    mats.carbon
  );
  rearBumperBar.position.set(0, 0.28, -1.21);
  rearBumperBar.castShadow = true;
  suspensionGroup.add(rearBumperBar);

  const diffuserBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.04, 0.34),
    mats.carbon
  );
  diffuserBase.position.set(0, 0.15, -1.03);
  diffuserBase.rotation.x = -0.22;
  suspensionGroup.add(diffuserBase);

  const finGeo = new THREE.BoxGeometry(0.03, 0.11, 0.28);
  for (const finX of [-0.30, -0.10, 0.10, 0.30]) {
    const fin = new THREE.Mesh(finGeo, mats.carbon);
    fin.position.set(finX, 0.16, -1.06);
    suspensionGroup.add(fin);
  }

  for (const side of [-1, 1]) {
    const sideRearCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 0.32),
      mats.rubber
    );
    sideRearCap.position.set(side * 0.72, 0.28, -1.11);
    suspensionGroup.add(sideRearCap);

    // Rear LED taillight bars (brighten on brake/reverse/drift)
    const tailHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.078, 0.06),
      mats.carbon
    );
    tailHousing.position.set(side * 0.48, 0.36, -1.16);
    suspensionGroup.add(tailHousing);

    const tailLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.052, 0.04),
      mats.taillight
    );
    tailLed.position.set(side * 0.48, 0.36, -1.182);
    suspensionGroup.add(tailLed);
  }

  // --- 5. Cockpit: Seat, Steering Column & Interactive Steering Wheel ---
  const seatGroup = new THREE.Group();
  seatGroup.position.set(0, 0.25, -0.24);
  suspensionGroup.add(seatGroup);

  const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.48), mats.seat);
  seatCushion.position.set(0, 0.04, 0.02);
  seatGroup.add(seatCushion);

  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.11), mats.seat);
  seatBack.position.set(0, 0.31, -0.21);
  seatBack.rotation.x = -0.22;
  seatBack.castShadow = true;
  seatGroup.add(seatBack);

  const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.1), mats.accent);
  headrest.position.set(0, 0.59, -0.27);
  headrest.rotation.x = -0.22;
  seatGroup.add(headrest);

  for (const side of [-1, 1]) {
    const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.34), mats.seat);
    bolster.position.set(side * 0.27, 0.18, -0.05);
    bolster.rotation.z = side * -0.14;
    seatGroup.add(bolster);
  }

  // Steering column tilted toward driver (+Y_col points toward -Z/+Y)
  const steeringColumnGroup = new THREE.Group();
  steeringColumnGroup.position.set(0, 0.44, 0.36);
  steeringColumnGroup.rotation.x = -0.58;
  suspensionGroup.add(steeringColumnGroup);

  const shaftMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.038, 0.42, 10),
    mats.chrome
  );
  shaftMesh.position.y = 0.06;
  steeringColumnGroup.add(shaftMesh);

  const steeringWheelPivot = new THREE.Group();
  steeringWheelPivot.position.y = 0.27;
  steeringColumnGroup.add(steeringWheelPivot);

  const rimGeo = new THREE.TorusGeometry(0.175, 0.028, 10, 22);
  rimGeo.rotateX(Math.PI * 0.5);
  const wheelRim = new THREE.Mesh(rimGeo, mats.rubber);
  steeringWheelPivot.add(wheelRim);

  // Top marker on steering wheel so rotation is crisp
  const topMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.058, 0.062),
    mats.accent
  );
  topMarker.position.set(0, 0, 0.175);
  steeringWheelPivot.add(topMarker);

  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.045, 12),
    mats.accent
  );
  steeringWheelPivot.add(hubCap);

  // 3 spokes inside steering wheel
  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.03), mats.chrome);
  steeringWheelPivot.add(spokeH);
  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.16), mats.chrome);
  spokeV.position.z = -0.08;
  steeringWheelPivot.add(spokeV);

  // --- 6. Stylized Driver ---
  const driverGroup = new THREE.Group();
  driverGroup.position.set(0, 0.34, -0.2);
  suspensionGroup.add(driverGroup);

  const torsoPivot = new THREE.Group();
  driverGroup.add(torsoPivot);

  const torsoMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.24, 6, 14),
    mats.body
  );
  torsoMesh.position.set(0, 0.27, -0.02);
  torsoMesh.rotation.x = 0.14;
  torsoMesh.castShadow = true;
  torsoPivot.add(torsoMesh);

  const suitStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.34, 0.39),
    mats.accent
  );
  suitStripe.position.set(0, 0.26, -0.01);
  suitStripe.rotation.x = 0.14;
  torsoPivot.add(suitStripe);

  // Arms reaching forward to grip the steering wheel
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.24, 4, 10);
  const gloveGeo = new THREE.SphereGeometry(0.068, 10, 8);
  const armPivots = [];

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.22, 0.38, 0.03);
    torsoPivot.add(shoulder);

    const arm = new THREE.Mesh(armGeo, mats.body);
    arm.position.set(side * -0.02, -0.03, 0.19);
    arm.rotation.x = Math.PI * 0.48;
    arm.rotation.z = side * 0.18;
    arm.castShadow = true;
    shoulder.add(arm);

    const glove = new THREE.Mesh(gloveGeo, mats.seat);
    glove.position.set(side * -0.055, -0.04, 0.36);
    shoulder.add(glove);

    armPivots.push({ shoulder, side });
  }

  // Helmet & Dark Mirrored Visor
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.57, -0.02);
  torsoPivot.add(headPivot);

  const helmetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 22, 18),
    mats.body
  );
  helmetMesh.scale.set(0.96, 1.0, 1.06);
  helmetMesh.position.y = 0.16;
  helmetMesh.castShadow = true;
  headPivot.add(helmetMesh);

  // Accent stripe over helmet crest
  const helmetStripeGeo = new THREE.TorusGeometry(0.242, 0.028, 8, 22, Math.PI * 1.15);
  helmetStripeGeo.rotateY(Math.PI * 0.5);
  const helmetStripe = new THREE.Mesh(helmetStripeGeo, mats.accent);
  helmetStripe.position.set(0, 0.16, 0);
  helmetStripe.rotation.x = -Math.PI * 0.08;
  headPivot.add(helmetStripe);

  // Curved dark mirrored glass visor facing +Z
  const visorGeo = new THREE.CylinderGeometry(
    0.245,
    0.239,
    0.15,
    20,
    1,
    true,
    -Math.PI * 0.38,
    Math.PI * 0.76
  );
  const visorMesh = new THREE.Mesh(visorGeo, mats.visor);
  visorMesh.position.set(0, 0.165, 0.022);
  headPivot.add(visorMesh);

  // Helmet chin guard
  const chinMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.18, 0.1, 14, 1, false, -Math.PI * 0.35, Math.PI * 0.7),
    mats.accent
  );
  chinMesh.position.set(0, 0.055, 0.02);
  headPivot.add(chinMesh);

  // --- 7. Engine Block, Carbon Rear Wing with Rear Number Plate & Dual Chrome Exhaust ---
  const engineBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.28, 0.38),
    mats.chrome
  );
  engineBlock.position.set(0, 0.34, -0.78);
  engineBlock.castShadow = true;
  suspensionGroup.add(engineBlock);

  const engineHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.1, 0.26),
    mats.body
  );
  engineHead.position.set(0, 0.5, -0.78);
  suspensionGroup.add(engineHead);

  // Carbon fiber wing pillars & glossy wing blade + side endplates
  const wingPillarGeo = new THREE.BoxGeometry(0.055, 0.28, 0.12);
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(wingPillarGeo, mats.carbon);
    pillar.position.set(side * 0.28, 0.58, -0.85);
    pillar.rotation.x = -0.16;
    suspensionGroup.add(pillar);
  }

  const wingBlade = new THREE.Mesh(
    new THREE.BoxGeometry(1.06, 0.06, 0.26),
    mats.body
  );
  wingBlade.position.set(0, 0.71, -0.90);
  wingBlade.rotation.x = 0.16;
  wingBlade.castShadow = true;
  suspensionGroup.add(wingBlade);

  const wingTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.04, 0.025, 0.06),
    mats.accent
  );
  wingTrim.position.set(0, 0.745, -0.98);
  wingTrim.rotation.x = 0.16;
  suspensionGroup.add(wingTrim);

  for (const side of [-1, 1]) {
    const endplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.18, 0.32),
      mats.carbon
    );
    endplate.position.set(side * 0.54, 0.72, -0.90);
    suspensionGroup.add(endplate);
  }

  // Prominent rear number plate below/behind wing facing -Z so player identifies cars ahead
  const rearPlateMount = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.34, 0.04),
    mats.carbon
  );
  rearPlateMount.position.set(0, 0.59, -0.98);
  suspensionGroup.add(rearPlateMount);

  const rearPlateFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.60, 0.31),
    mats.rearPlate
  );
  rearPlateFace.position.set(0, 0.59, -1.003);
  rearPlateFace.rotation.y = Math.PI;
  suspensionGroup.add(rearPlateFace);

  // Dual upward-angled mirrored chrome exhaust pipes
  const exhaustTipsWorldRef = [];
  const exhaustFlames = [];
  const pipeGeo = new THREE.CylinderGeometry(0.062, 0.05, 0.56, 14);
  pipeGeo.rotateX(Math.PI * 0.5);
  const tipRingGeo = new THREE.CylinderGeometry(0.072, 0.064, 0.12, 14);
  tipRingGeo.rotateX(Math.PI * 0.5);
  const boreGeo = new THREE.CircleGeometry(0.052, 12);
  const flameOuterGeo = new THREE.ConeGeometry(0.085, 0.48, 10);
  flameOuterGeo.rotateX(-Math.PI * 0.5);
  const flameCoreGeo = new THREE.ConeGeometry(0.048, 0.3, 8);
  flameCoreGeo.rotateX(-Math.PI * 0.5);

  for (const side of [-1, 1]) {
    const pipePivot = new THREE.Group();
    pipePivot.position.set(side * 0.24, 0.40, -0.92);
    pipePivot.rotation.x = 0.34;
    pipePivot.rotation.y = side * -0.09;
    suspensionGroup.add(pipePivot);

    const pipeMesh = new THREE.Mesh(pipeGeo, mats.chrome);
    pipeMesh.position.z = -0.18;
    pipeMesh.castShadow = true;
    pipePivot.add(pipeMesh);

    const tipMesh = new THREE.Mesh(tipRingGeo, mats.chrome);
    tipMesh.position.z = -0.45;
    pipePivot.add(tipMesh);

    const boreMesh = new THREE.Mesh(boreGeo, mats.darkHole);
    boreMesh.position.z = -0.512;
    boreMesh.rotation.y = Math.PI;
    pipePivot.add(boreMesh);

    const tipMarker = new THREE.Object3D();
    tipMarker.position.set(0, 0, -0.54);
    pipePivot.add(tipMarker);
    exhaustTipsWorldRef.push(tipMarker);

    const flameGroup = new THREE.Group();
    flameGroup.position.set(0, 0, -0.52);
    flameGroup.visible = false;
    pipePivot.add(flameGroup);

    const fOuter = new THREE.Mesh(flameOuterGeo, mats.flameOuter);
    fOuter.position.z = -0.22;
    flameGroup.add(fOuter);

    const fCore = new THREE.Mesh(flameCoreGeo, mats.flameCore);
    fCore.position.z = -0.14;
    flameGroup.add(fCore);

    exhaustFlames.push(flameGroup);
  }

  // --- 8. Wheels, Fixed Brake Calipers, Steering Pivots & Helical Coilover Suspension ---
  const frontRadius = 0.30;
  const frontWidth = 0.26;
  const rearRadius = 0.38;
  const rearWidth = 0.36;

  // Front wheels + non-rotating brake calipers
  const wheelFLSteerPivot = new THREE.Group();
  wheelFLSteerPivot.position.set(0.76, frontRadius, 0.86);
  spinoutGroup.add(wheelFLSteerPivot);

  const wheelFLSpin = buildWheelMesh(frontRadius, frontWidth, true, mats);
  wheelFLSteerPivot.add(wheelFLSpin);
  wheelFLSteerPivot.add(buildBrakeCaliperMesh(frontRadius, frontWidth, true, mats));

  const wheelFRSteerPivot = new THREE.Group();
  wheelFRSteerPivot.position.set(-0.76, frontRadius, 0.86);
  spinoutGroup.add(wheelFRSteerPivot);

  const wheelFRSpin = buildWheelMesh(frontRadius, frontWidth, false, mats);
  wheelFRSteerPivot.add(wheelFRSpin);
  wheelFRSteerPivot.add(buildBrakeCaliperMesh(frontRadius, frontWidth, false, mats));

  // Rear wheels + non-rotating brake calipers
  const wheelRLGroup = new THREE.Group();
  wheelRLGroup.position.set(0.82, rearRadius, -0.82);
  spinoutGroup.add(wheelRLGroup);
  const wheelRLSpin = buildWheelMesh(rearRadius, rearWidth, true, mats);
  wheelRLGroup.add(wheelRLSpin);
  wheelRLGroup.add(buildBrakeCaliperMesh(rearRadius, rearWidth, true, mats));

  const wheelRRGroup = new THREE.Group();
  wheelRRGroup.position.set(-0.82, rearRadius, -0.82);
  spinoutGroup.add(wheelRRGroup);
  const wheelRRSpin = buildWheelMesh(rearRadius, rearWidth, false, mats);
  wheelRRGroup.add(wheelRRSpin);
  wheelRRGroup.add(buildBrakeCaliperMesh(rearRadius, rearWidth, false, mats));

  // Rear solid drive axle
  const rearAxle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 1.48, 10),
    mats.chrome
  );
  rearAxle.rotation.z = Math.PI * 0.5;
  rearAxle.position.set(0, rearRadius, -0.82);
  spinoutGroup.add(rearAxle);

  // Visible articulated suspension arms + helical coilover springs on all 4 corners
  const suspensionArmPivots = [];
  const armTubeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8);
  armTubeGeo.rotateZ(Math.PI * 0.5);
  const damperRodGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.25, 8);
  const coilSpringGeo = createCoilSpringGeometry(0.044, 0.19, 5, 0.011);

  const corners = [
    { side: 1, z: 0.86, hubY: frontRadius, xStart: 0.34, xEnd: 0.72 },
    { side: -1, z: 0.86, hubY: frontRadius, xStart: -0.34, xEnd: -0.72 },
    { side: 1, z: -0.82, hubY: rearRadius, xStart: 0.34, xEnd: 0.76 },
    { side: -1, z: -0.82, hubY: rearRadius, xStart: -0.34, xEnd: -0.76 }
  ];

  for (const c of corners) {
    const armPivot = new THREE.Group();
    armPivot.position.set(c.xStart, 0.24, c.z);
    suspensionGroup.add(armPivot);

    const span = Math.abs(c.xEnd - c.xStart);
    const upperArm = new THREE.Mesh(armTubeGeo, mats.chrome);
    upperArm.scale.x = span / 0.44;
    upperArm.position.set(c.side * span * 0.5, 0.02, 0.05);
    upperArm.rotation.y = c.side * -0.14;
    armPivot.add(upperArm);

    const lowerArm = new THREE.Mesh(armTubeGeo, mats.chassis);
    lowerArm.scale.x = span / 0.44;
    lowerArm.position.set(c.side * span * 0.5, -0.04, -0.05);
    lowerArm.rotation.y = c.side * 0.14;
    armPivot.add(lowerArm);

    // Damper rod + helical spring coil painted in accentColor
    const damperGroup = new THREE.Group();
    damperGroup.position.set(c.side * span * 0.48, 0.12, 0);
    damperGroup.rotation.z = c.side * 0.55;
    armPivot.add(damperGroup);

    const damperRod = new THREE.Mesh(damperRodGeo, mats.chassis);
    damperGroup.add(damperRod);

    const coilSpring = new THREE.Mesh(coilSpringGeo, mats.accent);
    damperGroup.add(coilSpring);

    suspensionArmPivots.push({ pivot: armPivot, side: c.side, span });
  }

  // Drift spark emitter markers + glowing wheel arcs at rear wheels
  const driftMarkers = [];
  const driftGlowMeshes = [];
  const glowGeo = new THREE.RingGeometry(0.14, 0.28, 12);
  for (const side of [-1, 1]) {
    const marker = new THREE.Object3D();
    marker.position.set(side * 0.86, 0.09, -0.96);
    spinoutGroup.add(marker);
    driftMarkers.push(marker);

    const glow = new THREE.Mesh(glowGeo, mats.driftGlow);
    glow.position.set(side * 0.88, 0.14, -0.98);
    glow.rotation.y = side * 0.35;
    spinoutGroup.add(glow);
    driftGlowMeshes.push(glow);
  }

  return {
    rootGroup,
    spinoutGroup,
    suspensionGroup,
    steeringWheelPivot,
    torsoPivot,
    headPivot,
    armPivots,
    wheelFLSteerPivot,
    wheelFRSteerPivot,
    wheelFLSpin,
    wheelFRSpin,
    wheelRLSpin,
    wheelRRSpin,
    frontRadius,
    rearRadius,
    suspensionArmPivots,
    exhaustTipsWorldRef,
    exhaustFlames,
    driftMarkers,
    driftGlowMeshes,
    botBadgeSprite,
    mats,
    textures: [
      emblemTexture,
      rearPlateTexture,
      carbonTexture,
      tireTreadTexture,
      botBadgeTexture
    ]
  };
}

function buildParticlePool(scene, maxCount, geometry, additive = false, softOpacity = 0.72) {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: additive ? 0.92 : softOpacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
  });

  const mesh = new THREE.InstancedMesh(geometry, material, maxCount);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();
  const white = new THREE.Color(1, 1, 1);

  const particles = [];
  for (let i = 0; i < maxCount; i++) {
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, white);
    particles.push({
      active: false,
      age: 0,
      life: 0.4,
      baseScale: 0.15,
      endScale: 0.3,
      gravity: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      color: new THREE.Color(1, 1, 1)
    });
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  if (scene && typeof scene.add === 'function') {
    scene.add(mesh);
  }

  let cursor = 0;

  function spawn(pos, vel, colorHex, life, baseScale, endScale, gravity = 0) {
    const p = particles[cursor];
    cursor = (cursor + 1) % maxCount;
    p.active = true;
    p.age = 0;
    p.life = life;
    p.baseScale = baseScale;
    p.endScale = endScale;
    p.gravity = gravity;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.color.setHex(colorHex);
  }

  function update(dt) {
    let dirty = false;
    for (let i = 0; i < maxCount; i++) {
      const p = particles[i];
      if (!p.active) continue;
      dirty = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        dummy.position.set(0, -9999, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.vel.y += p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);

      const t = p.age / p.life;
      const scale = THREE.MathUtils.lerp(p.baseScale, p.endScale, t) * (1 - t * t * 0.45);
      dummy.position.copy(p.pos);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, p.color);
    }

    if (dirty) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  function dispose() {
    if (mesh.parent) mesh.parent.remove(mesh);
    geometry.dispose();
    material.dispose();
  }

  return { spawn, update, dispose };
}

function getDriftSparkColor(driftCharge) {
  if (driftCharge >= 2.0) return 0xe879f9; // Purple / magenta
  if (driftCharge >= 1.0) return 0xff8800; // Orange
  return 0x38bdf8; // Electric blue
}


// =========================================================================
// Marcas de pneu no asfalto (compartilhadas entre todos os karts, 1 draw call)
// =========================================================================
export function createSkidMarks(scene, maxCount = 700) {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0b0c0f,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const mesh = new THREE.InstancedMesh(geo, mat, maxCount);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < maxCount; i++) mesh.setMatrixAt(i, hidden);
  mesh.instanceMatrix.needsUpdate = true;
  if (scene) scene.add(mesh);
  let cursor = 0;
  const mid = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const quatUp = new THREE.Quaternion();
  const quatYaw = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);

  return {
    add(a, b, up, width = 0.34) {
      dir.subVectors(b, a);
      const len = Math.hypot(dir.x, dir.z);
      if (len < 0.05 || len > 4) return;
      mid.addVectors(a, b).multiplyScalar(0.5);
      quatYaw.setFromAxisAngle(yAxis, Math.atan2(dir.x, dir.z));
      quatUp.setFromUnitVectors(yAxis, up);
      dummy.quaternion.copy(quatUp).multiply(quatYaw);
      dummy.position.copy(mid).addScaledVector(up, 0.035);
      dummy.scale.set(width, 1, len + 0.06);
      dummy.updateMatrix();
      mesh.setMatrixAt(cursor, dummy.matrix);
      cursor = (cursor + 1) % maxCount;
      mesh.instanceMatrix.needsUpdate = true;
    },
    clear() {
      for (let i = 0; i < maxCount; i++) mesh.setMatrixAt(i, hidden);
      mesh.instanceMatrix.needsUpdate = true;
      cursor = 0;
    }
  };
}

export function createKart(scene, track, options = {}) {
  const model = buildKartModel(options);
  if (scene && typeof scene.add === 'function') {
    scene.add(model.rootGroup);
  }

  // Fixed-size pools for 60fps zero-GC exhaust & drift spark particles
  const exhaustPool = buildParticlePool(
    scene,
    56,
    new THREE.IcosahedronGeometry(1, 1),
    false,
    0.34
  );
  // Poeira/grama levantada quando o kart sai do asfalto
  const dustPool = buildParticlePool(
    scene,
    40,
    new THREE.IcosahedronGeometry(1, 1),
    false,
    0.38
  );
  const skidMarks = options?.skidMarks || null;
  const skidPrev = [new THREE.Vector3(), new THREE.Vector3()];
  let skidHasPrev = false;
  let dustEmitAcc = 0;
  const sparkPool = buildParticlePool(
    scene,
    48,
    new THREE.OctahedronGeometry(1, 0),
    true
  );

  // Resolve starting transform
  const startTransform = options?.startTransform;
  const startPos = new THREE.Vector3(0, 0, 0);
  if (startTransform?.position) {
    startPos.set(
      startTransform.position.x ?? 0,
      startTransform.position.y ?? 0,
      startTransform.position.z ?? 0
    );
  } else if (track && typeof track.getPointAt === 'function') {
    const p = track.getPointAt(0);
    if (p) startPos.copy(p);
  }

  let initialHeading = 0;
  if (typeof startTransform?.heading === 'number') {
    initialHeading = startTransform.heading;
  } else if (startTransform?.forward) {
    initialHeading = Math.atan2(startTransform.forward.x, startTransform.forward.z);
  }

  // Sample initial track surface
  const initInfo = track?.getClosestPointInfo
    ? track.getClosestPointInfo(startPos.x, startPos.z, startTransform?.trackT)
    : null;

  if (initInfo) {
    startPos.y = initInfo.surfaceHeight ?? startPos.y;
  }

  const smoothedUp = initInfo?.up
    ? initInfo.up.clone().normalize()
    : WORLD_UP.clone();

  const initialTrackT = initInfo?.t ?? (startTransform?.trackT ?? 0);

  // Lap & progress internal state (prevents false laps / reverse-line exploit)
  let behindStartLine = initialTrackT > 0.85;
  let sector1Passed = false;
  let sector2Passed = false;
  let raceElapsed = 0;

  // Physics internal state
  let prevGroundHeight = startPos.y;
  let wasOnRamp = Boolean(initInfo?.isRamp && (initInfo?.rampSlope ?? 0) > 0.02);
  let prevRampSlope = initInfo?.rampSlope ?? 0;
  let jumpBaseHeight = startPos.y;
  let boostBonusSpeed = 0;

  // Suspension, steering & animation state
  let suspOffset = 0;
  let suspVel = 0;
  let smoothSteer = 0;
  let visualSteer = 0;
  let visualPitch = 0;
  let visualRoll = 0;
  let visualDriftYaw = 0;
  let spinoutDuration = 0;
  let spinoutVisualYaw = 0;
  let wheelSpinAngle = 0;
  let exhaustEmitAcc = 0;
  let sparkEmitAcc = 0;

  // Reusable scratch vectors to avoid per-frame allocations
  const forwardXZ = new THREE.Vector3();
  const rightXZ = new THREE.Vector3();
  const basisX = new THREE.Vector3();
  const basisZ = new THREE.Vector3();
  const basisMat = new THREE.Matrix4();
  const targetUp = new THREE.Vector3();
  const moveDir = new THREE.Vector3();
  const outwardDir = new THREE.Vector3();
  const tempPos = new THREE.Vector3();
  const tempVel = new THREE.Vector3();
  const worldForward = new THREE.Vector3();
  const worldRight = new THREE.Vector3();

  // Animação visual (suspensão, rodas, piloto, chamas, faíscas, marcas, poeira).
  // Usada pela física local (update) e pelos karts de outros jogadores (updateRemote).
  function animateVisual(safeDt, effectiveThrottle, effectiveSteer, isBoosting, onOffroad, absSpeed, info) {
  // 12. Damped Spring Suspension + Dynamic Pitch / Roll
  const suspAccel = -SUSP_K * suspOffset - SUSP_C * suspVel;
  suspVel += suspAccel * safeDt;
  suspOffset += suspVel * safeDt;
  if (suspOffset < SUSP_MIN) {
    suspOffset = SUSP_MIN;
    if (suspVel < 0) suspVel = 0;
  } else if (suspOffset > SUSP_MAX) {
    suspOffset = SUSP_MAX;
    if (suspVel > 0) suspVel = 0;
  }

  const offroadJitter =
    onOffroad && kart.isGrounded && absSpeed > 3
      ? Math.sin(raceElapsed * 44) * 0.014 * Math.min(1, absSpeed / 15)
      : 0;

  let targetPitch = 0;
  if (!kart.isGrounded) {
    targetPitch = clamp(-kart.vy * 0.022, -0.26, 0.24);
  } else if (effectiveThrottle > 0.1) {
    targetPitch = isBoosting ? -0.055 : -0.032 * effectiveThrottle;
  } else if (effectiveThrottle < -0.1 && kart.speed > 1) {
    targetPitch = 0.06;
  }

  const speedNorm = clamp(absSpeed / BASE_MAX_SPEED, 0, 1.2);
  const targetRoll = kart.isGrounded
    ? -effectiveSteer * speedNorm * (kart.isDrifting ? 0.115 : 0.085)
    : 0;

  visualPitch = damp(visualPitch, targetPitch, 11, safeDt);
  visualRoll = damp(visualRoll, targetRoll, 12, safeDt);
  visualSteer = damp(visualSteer, smoothSteer, 18, safeDt);
  const targetDriftYaw = kart.isDrifting ? -0.22 * kart.driftDir : 0;
  visualDriftYaw = damp(visualDriftYaw, targetDriftYaw, 10, safeDt);

  // Update LED taillight glow (intensifies when braking, reversing or drifting)
  const isBrakingOrReversing =
    (effectiveThrottle < -0.1 && kart.speed > 0.5) || kart.speed < -0.5;
  const targetTaillightGlow = isBrakingOrReversing || kart.isDrifting ? 3.2 : 0.85;
  model.mats.taillight.emissiveIntensity = damp(
    model.mats.taillight.emissiveIntensity,
    targetTaillightGlow,
    14,
    safeDt
  );

  // 13. Track Banking / Slope Alignment for rootGroup
  if (kart.isGrounded && info?.up) {
    targetUp.copy(info.up).normalize();
    smoothedUp.lerp(targetUp, 1 - Math.exp(-14 * safeDt)).normalize();
  } else {
    smoothedUp.lerp(WORLD_UP, 1 - Math.exp(-3.5 * safeDt)).normalize();
  }

  basisX.crossVectors(smoothedUp, forwardXZ);
  if (basisX.lengthSq() < 1e-6) {
    basisX.set(1, 0, 0);
  } else {
    basisX.normalize();
  }
  basisZ.crossVectors(basisX, smoothedUp).normalize();

  basisMat.makeBasis(basisX, smoothedUp, basisZ);
  model.rootGroup.quaternion.setFromRotationMatrix(basisMat);
  model.rootGroup.position.copy(kart.position);

  // 14. Visual Articulations (Wheels, Suspension Arms, Steering Wheel, Driver, Spinout)
  model.spinoutGroup.rotation.y = visualDriftYaw + spinoutVisualYaw;

  model.suspensionGroup.position.y = suspOffset + offroadJitter;
  model.suspensionGroup.rotation.x = visualPitch;
  model.suspensionGroup.rotation.z = visualRoll;

  const totalSuspY = model.suspensionGroup.position.y;
  for (let i = 0; i < model.suspensionArmPivots.length; i++) {
    const item = model.suspensionArmPivots[i];
    item.pivot.rotation.z = -item.side * (totalSuspY / item.span) * 0.85;
  }

  const frontSteerAngle = -visualSteer * 0.48;
  model.wheelFLSteerPivot.rotation.y = frontSteerAngle;
  model.wheelFRSteerPivot.rotation.y = frontSteerAngle;

  const frontDeltaRot = (kart.speed * safeDt) / model.frontRadius;
  const rearDeltaRot = (kart.speed * safeDt) / model.rearRadius;
  wheelSpinAngle += frontDeltaRot;
  model.wheelFLSpin.rotation.x = wheelSpinAngle;
  model.wheelFRSpin.rotation.x = wheelSpinAngle;
  model.wheelRLSpin.rotation.x += rearDeltaRot;
  model.wheelRRSpin.rotation.x += rearDeltaRot;

  model.steeringWheelPivot.rotation.y = -visualSteer * 0.65;
  const leanAngle = (kart.isDrifting ? kart.driftDir * 0.16 : visualSteer * 0.11) * speedNorm;
  model.torsoPivot.rotation.z = leanAngle;
  model.headPivot.rotation.z = leanAngle * 0.7;
  model.headPivot.rotation.y = -visualSteer * 0.22;
  for (let i = 0; i < model.armPivots.length; i++) {
    const ap = model.armPivots[i];
    ap.shoulder.rotation.x = -visualSteer * ap.side * 0.18;
  }

  // 15. Exhaust Flames & Particles + Drift Sparks (60fps pooled InstancedMesh)
  model.rootGroup.updateMatrixWorld(true);
  worldForward.copy(basisZ);
  worldRight.copy(basisX).negate();

  for (let i = 0; i < model.exhaustFlames.length; i++) {
    const fg = model.exhaustFlames[i];
    fg.visible = isBoosting;
    if (isBoosting) {
      const flicker = 0.85 + Math.sin(raceElapsed * 62 + i * 2.1) * 0.28;
      fg.scale.set(0.95, 0.95, flicker * 1.25);
    }
  }

  const accelPuff = effectiveThrottle > 0.1 && absSpeed > 1.5 && absSpeed < BASE_MAX_SPEED * 0.8;
  if (isBoosting || accelPuff) {
    const emitInterval = isBoosting ? 0.025 : 0.09;
    exhaustEmitAcc += safeDt;
    while (exhaustEmitAcc >= emitInterval) {
      exhaustEmitAcc -= emitInterval;
      for (let i = 0; i < model.exhaustTipsWorldRef.length; i++) {
        model.exhaustTipsWorldRef[i].getWorldPosition(tempPos);
        const jetSpeed = isBoosting ? 9.5 : 2.8;
        tempVel
          .copy(worldForward)
          .multiplyScalar(-jetSpeed)
          .addScaledVector(smoothedUp, isBoosting ? 1.8 : 1.4)
          .addScaledVector(worldRight, (Math.random() - 0.5) * 1.2);

        if (isBoosting) {
          const r = Math.random();
          const pColor = r > 0.55 ? 0xff7a00 : r > 0.2 ? 0xffd166 : 0x38bdf8;
          sparkPool.spawn(tempPos, tempVel, pColor, 0.18, 0.17, 0.04, 0);
        } else {
          const shade = Math.random() > 0.5 ? 0xe2e6ec : 0xc4cad4;
          exhaustPool.spawn(tempPos, tempVel, shade, 0.5, 0.05, 0.2, 1.6);
        }
      }
    }
  }

  const showDriftSparks = kart.isDrifting && kart.isGrounded;
  const sparkHex = getDriftSparkColor(kart.driftCharge);
  model.mats.driftGlow.color.setHex(sparkHex);
  model.mats.driftGlow.opacity = showDriftSparks
    ? 0.55 + 0.35 * Math.sin(raceElapsed * 35)
    : 0;

  for (let i = 0; i < model.driftGlowMeshes.length; i++) {
    const glow = model.driftGlowMeshes[i];
    glow.visible = showDriftSparks;
    if (showDriftSparks) {
      const s = 0.85 + Math.min(0.6, kart.driftCharge * 0.22);
      glow.scale.set(s, s, s);
    }
  }

  if (showDriftSparks) {
    sparkEmitAcc += safeDt;
    const sparkInterval = 0.022;
    while (sparkEmitAcc >= sparkInterval) {
      sparkEmitAcc -= sparkInterval;
      for (let i = 0; i < model.driftMarkers.length; i++) {
        model.driftMarkers[i].getWorldPosition(tempPos);
        const sideSign = i === 0 ? -1 : 1;
        tempVel
          .copy(worldForward)
          .multiplyScalar(-5.5 - Math.random() * 3.5)
          .addScaledVector(smoothedUp, 2.6 + Math.random() * 2.8)
          .addScaledVector(worldRight, sideSign * (1.8 + Math.random() * 2.5));

        const scale = 0.075 + Math.min(0.055, kart.driftCharge * 0.018);
        sparkPool.spawn(tempPos, tempVel, sparkHex, 0.26, scale, 0.02, -14.0);
      }
    }
  }

  // Marcas de pneu no drift / freada forte / impacto
  const leaveSkid = kart.isGrounded && !onOffroad && absSpeed > 8 &&
    (kart.isDrifting || kart.spinoutTimer > 0 || (effectiveThrottle < -0.5 && kart.speed > 12));
  if (skidMarks && leaveSkid) {
    for (let i = 0; i < model.driftMarkers.length; i++) {
      model.driftMarkers[i].getWorldPosition(tempPos);
      tempPos.addScaledVector(smoothedUp, -(tempPos.clone().sub(kart.position).dot(smoothedUp)));
      if (skidHasPrev) skidMarks.add(skidPrev[i], tempPos, smoothedUp);
      skidPrev[i].copy(tempPos);
    }
    skidHasPrev = true;
  } else {
    skidHasPrev = false;
  }

  // Poeira de grama/terra fora da pista
  if (onOffroad && kart.isGrounded && absSpeed > 6) {
    dustEmitAcc += safeDt;
    while (dustEmitAcc >= 0.05) {
      dustEmitAcc -= 0.05;
      for (let i = 0; i < model.driftMarkers.length; i++) {
        model.driftMarkers[i].getWorldPosition(tempPos);
        tempVel
          .copy(worldForward)
          .multiplyScalar(-2 - Math.random() * 2)
          .addScaledVector(smoothedUp, 1.6 + Math.random() * 1.8)
          .addScaledVector(worldRight, (Math.random() - 0.5) * 2.4);
        const c = Math.random() > 0.45 ? 0x8a6a3c : 0x5f8a2e;
        dustPool.spawn(tempPos, tempVel, c, 0.5, 0.08, 0.2, -5);
      }
    }
  }

  exhaustPool.update(safeDt);
  sparkPool.update(safeDt);
  dustPool.update(safeDt);
  }
  const kart = {
    id: options?.id ?? 'kart',
    name: options?.name ?? 'Kart',
    isPlayer: Boolean(options?.isPlayer),
    // Kart de outro aparelho (multiplayer): posição vem da rede, sem física local
    isRemote: Boolean(options?.isRemote),
    mesh: model.rootGroup,
    position: startPos,
    prevPosition: startPos.clone(),
    velocity: new THREE.Vector3(),
    heading: initialHeading,
    speed: 0,
    vy: 0,
    isGrounded: true,
    airTime: 0,
    maxJumpHeight: 0,
    isDrifting: false,
    driftDir: 0,
    driftCharge: 0,
    boostTimer: 0,
    spinoutTimer: 0,
    trackT: initialTrackT,
    lap: 1,
    totalProgress: behindStartLine ? initialTrackT - 1 : initialTrackT,
    finished: false,
    finishTime: 0,
    currentItem: null,
    // Multiplicador de velocidade máxima (dificuldade dos bots / modo fácil)
    topSpeedScale: 1.0,
    spinoutScale: 1.0,
    luckyItems: false,
    // Último impacto forte em guard-rail (para som e tremida de câmera)
    wallImpact: 0,
    onOffroad: false,
    events: {
      justStartedDrift: false,
      justReleasedBoost: false,
      justLanded: false,
      justSpunOut: false,
      justHitWall: false
    },

    // Recoloca o kart no centro da pista (botão "voltar à pista" / anti-travamento)
    respawnAt(t, lat = 0) {
      const frame = track.getTrackFrame(t);
      const tanX = frame.tangent.x;
      const tanZ = frame.tangent.z;
      const len = Math.hypot(tanX, tanZ) || 1;
      const rx = tanZ / len;
      const rz = -tanX / len;
      kart.position.set(frame.point.x - rx * lat, frame.point.y, frame.point.z - rz * lat);
      const info = track.getClosestPointInfo(kart.position.x, kart.position.z, t);
      if (info) kart.position.y = info.surfaceHeight;
      kart.prevPosition.copy(kart.position);
      kart.heading = Math.atan2(tanX, tanZ);
      kart.speed = 0;
      kart.vy = 0;
      kart.isGrounded = true;
      kart.airTime = 0;
      kart.isDrifting = false;
      kart.driftDir = 0;
      kart.driftCharge = 0;
      kart.spinoutTimer = 0;
      wasOnRamp = false;
      prevRampSlope = 0;
      prevGroundHeight = kart.position.y;
      suspOffset = 0;
      suspVel = 0;
      skidHasPrev = false;
      if (info?.up) smoothedUp.copy(info.up).normalize();
    },

    applyBoost(duration = 1.0, bonusSpeed = 16) {
      const dur = Math.max(0.1, duration);
      const bonus = Math.max(0, bonusSpeed);
      kart.boostTimer = Math.max(kart.boostTimer, dur);
      boostBonusSpeed = Math.max(boostBonusSpeed, bonus);
      const targetPunch = Math.min(BOOST_CAP_SPEED, BASE_MAX_SPEED + bonus * 0.75);
      if (kart.speed < targetPunch && kart.spinoutTimer <= 0) {
        kart.speed = Math.min(targetPunch, kart.speed + 12);
      }
      if (kart.isGrounded) {
        suspVel += 1.4;
      }
    },

    triggerSpinout(duration = 1.2) {
      const dur = Math.max(0.3, duration * (kart.spinoutScale || 1));
      kart.spinoutTimer = Math.max(kart.spinoutTimer, dur);
      spinoutDuration = kart.spinoutTimer;
      kart.isDrifting = false;
      kart.driftDir = 0;
      kart.driftCharge = 0;
      kart.speed *= 0.45;
      kart.events.justSpunOut = true;
    },

    getCameraAnchor() {
      forwardXZ.set(Math.sin(kart.heading), 0, Math.cos(kart.heading)).normalize();
      basisX.crossVectors(smoothedUp, forwardXZ);
      if (basisX.lengthSq() < 1e-6) {
        basisX.set(1, 0, 0);
      } else {
        basisX.normalize();
      }
      basisZ.crossVectors(basisX, smoothedUp).normalize();

      return {
        position: kart.position.clone(),
        forward: basisZ.clone(),
        up: smoothedUp.clone(),
        speed: kart.speed,
        isBoosting: kart.boostTimer > 0,
        isDrifting: kart.isDrifting
      };
    },

    update(dt, controls = {}, otherKarts = []) {
      const safeDt = clamp(dt || 0, 0, 0.05);
      if (safeDt <= 0) return;

      // Snapshot previous position BEFORE any displacement for continuous swept item-box checks
      kart.prevPosition.copy(kart.position);

      // Reset frame-scoped audio/feedback event flags
      kart.events.justStartedDrift = false;
      kart.events.justReleasedBoost = false;
      kart.events.justLanded = false;
      kart.events.justSpunOut = false;
      kart.events.justHitWall = false;

      raceElapsed += safeDt;

      // 1. Resolve inputs (zeroed out during spinout)
      let throttleInput = clamp(controls?.throttle ?? 0, -1, 1);
      let steerInput = clamp(controls?.steer ?? 0, -1, 1);
      let wantDrift = Boolean(controls?.drift);

      if (kart.spinoutTimer > 0) {
        kart.spinoutTimer = Math.max(0, kart.spinoutTimer - safeDt);
        throttleInput = 0;
        steerInput = 0;
        wantDrift = false;
        kart.speed *= Math.exp(-4.5 * safeDt);
        if (kart.spinoutTimer === 0) {
          spinoutVisualYaw = 0;
          spinoutDuration = 0;
        } else {
          const prog = 1 - kart.spinoutTimer / Math.max(0.01, spinoutDuration);
          spinoutVisualYaw = prog * Math.PI * 4;
        }
      } else {
        spinoutVisualYaw = 0;
      }

      // Smooth steering input for fluid, accurate alignment without keyboard jerks
      smoothSteer = damp(smoothSteer, steerInput, 16, safeDt);

      // 2. Boost timer
      const isBoosting = kart.boostTimer > 0;
      if (isBoosting) {
        kart.boostTimer = Math.max(0, kart.boostTimer - safeDt);
        if (kart.boostTimer === 0) {
          boostBonusSpeed = 0;
        }
      }

      // Query current track surface before speed/offroad evaluation
      const prevInfo = track?.getClosestPointInfo
        ? track.getClosestPointInfo(kart.position.x, kart.position.z, kart.trackT)
        : null;

      const halfWidth = (track?.trackWidth ?? 16) * 0.5;
      const onOffroad = prevInfo
        ? Boolean(
            prevInfo.onOffroad ??
              prevInfo.isOffroad ??
              Math.abs(prevInfo.lateralOffset ?? 0) > halfWidth
          )
        : false;

      // 3. Drift state machine & mini-turbo release
      if (!kart.isDrifting) {
        if (
          wantDrift &&
          kart.isGrounded &&
          kart.speed > 14 &&
          Math.abs(steerInput) > 0.15 &&
          kart.spinoutTimer <= 0
        ) {
          kart.isDrifting = true;
          kart.driftDir = Math.sign(steerInput);
          kart.driftCharge = 0;
          kart.events.justStartedDrift = true;
          // Tactile hop feel on suspension when initiating drift
          suspVel += 2.6;
        }
      } else {
        const keepDrifting = wantDrift && kart.speed > 12 && kart.spinoutTimer <= 0;
        if (keepDrifting) {
          if (kart.isGrounded) {
            const steerAlign = Math.max(0.55, 0.88 + 0.42 * (smoothSteer * kart.driftDir));
            kart.driftCharge = Math.min(3.0, kart.driftCharge + safeDt * 1.35 * steerAlign);
          }
        } else {
          if (kart.driftCharge >= 0.8 && kart.spinoutTimer <= 0) {
            const norm = clamp((kart.driftCharge - 0.8) / (3.0 - 0.8), 0, 1);
            const boostDur = 0.6 + norm * (1.4 - 0.6);
            const bonus = 11.5 + norm * 5.5;
            kart.applyBoost(boostDur, bonus);
            kart.events.justReleasedBoost = true;
          }
          kart.isDrifting = false;
          kart.driftDir = 0;
          kart.driftCharge = 0;
        }
      }

      // 4. Acceleration, braking, reverse & offroad penalty
      const speedScale = clamp(kart.topSpeedScale || 1, 0.5, 1.3);
      kart.onOffroad = onOffroad;
      let maxAllowedSpeed = BASE_MAX_SPEED * speedScale;
      if (isBoosting) {
        maxAllowedSpeed = Math.min(BOOST_CAP_SPEED * speedScale, BASE_MAX_SPEED * speedScale + boostBonusSpeed);
      } else if (onOffroad && kart.isGrounded) {
        maxAllowedSpeed = OFFROAD_MAX_SPEED * Math.min(1, speedScale);
      }

      const effectiveThrottle = isBoosting && kart.spinoutTimer <= 0
        ? Math.max(throttleInput, 0.9)
        : throttleInput;

      if (effectiveThrottle > 0.05) {
        if (kart.speed < 0) {
          kart.speed = Math.min(maxAllowedSpeed, kart.speed + 46.0 * effectiveThrottle * safeDt);
        } else if (kart.speed < maxAllowedSpeed) {
          const boostAccelMult = isBoosting ? 1.55 : 1.0;
          const speedRatio = clamp(kart.speed / Math.max(1, maxAllowedSpeed), 0, 1);
          const accel = 30.0 * boostAccelMult * (1.0 - 0.2 * speedRatio);
          kart.speed = Math.min(maxAllowedSpeed, kart.speed + accel * effectiveThrottle * safeDt);
        }
      } else if (effectiveThrottle < -0.05) {
        if (kart.speed > 0.5) {
          kart.speed = Math.max(0, kart.speed + 48.0 * effectiveThrottle * safeDt);
        } else {
          kart.speed = Math.max(
            REVERSE_MAX_SPEED,
            kart.speed + 20.0 * effectiveThrottle * safeDt
          );
        }
      } else {
        const coastDrag = kart.isGrounded ? 10.5 : 2.5;
        if (kart.speed > 0) {
          kart.speed = Math.max(0, kart.speed - coastDrag * safeDt);
        } else if (kart.speed < 0) {
          kart.speed = Math.min(0, kart.speed + coastDrag * safeDt);
        }
      }

      if (kart.speed > maxAllowedSpeed) {
        const excessDrag = onOffroad && !isBoosting ? 28.0 : 18.0;
        kart.speed = Math.max(maxAllowedSpeed, kart.speed - excessDrag * safeDt);
      }

      // 5. Steering & heading update (uses smoothSteer for precise control)
      let effectiveSteer = smoothSteer;
      let turnRate = 2.05;
      if (kart.isDrifting) {
        effectiveSteer = kart.driftDir * 0.48 + smoothSteer * 0.62;
        turnRate = 2.20;
      }

      const absSpeed = Math.abs(kart.speed);
      if (absSpeed > 0.25) {
        const dirSign = kart.speed >= 0 ? 1 : -1;
        const turnScale = kart.speed >= 0 ? Math.min(1, absSpeed / 7.5) : Math.min(1, absSpeed / 5.5);
        const airTurnScale = kart.isGrounded ? 1.0 : 0.45;
        kart.heading = normalizeAngle(
          kart.heading - effectiveSteer * turnRate * turnScale * airTurnScale * dirSign * safeDt
        );
      }

      // 6. Horizontal displacement
      forwardXZ.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));
      rightXZ.set(-Math.cos(kart.heading), 0, Math.sin(kart.heading));

      // Subtle lateral drift slip in world motion without losing forward momentum
      moveDir.copy(forwardXZ);
      if (kart.isDrifting && kart.speed > 10) {
        moveDir.addScaledVector(rightXZ, -kart.driftDir * 0.14).normalize();
      }

      const prevY = kart.position.y;
      kart.position.x += moveDir.x * kart.speed * safeDt;
      kart.position.z += moveDir.z * kart.speed * safeDt;

      // 7. Query track after horizontal move
      let info = track?.getClosestPointInfo
        ? track.getClosestPointInfo(kart.position.x, kart.position.z, kart.trackT)
        : null;

      // 8. Track lateral boundary containment (guard-rails + offroad limits via track.getLateralBounds)
      if (info && track) {
        const bounds = typeof track.getLateralBounds === 'function'
          ? track.getLateralBounds(info.t)
          : null;
        const minLat = bounds?.minLat ?? -(halfWidth + 3.0);
        const maxLat = bounds?.maxLat ?? (halfWidth + 3.0);
        const lat = info.lateralOffset ?? 0;
        if (lat < minLat || lat > maxLat) {
          const excess = lat < minLat ? (minLat - lat) : (lat - maxLat);
          const latSign = lat < minLat ? -1 : 1;

          // Determine outward direction in XZ reliably
          let resolved = false;
          const centerRef = info.center ?? info.point ?? info.centerPoint;
          if (centerRef) {
            outwardDir.set(kart.position.x - centerRef.x, 0, kart.position.z - centerRef.z);
            if (outwardDir.lengthSq() > 1e-6) {
              outwardDir.normalize();
              resolved = true;
            }
          }
          if (!resolved && info.right) {
            outwardDir.set(info.right.x, 0, info.right.z).multiplyScalar(latSign);
            if (outwardDir.lengthSq() > 1e-6) {
              outwardDir.normalize();
              resolved = true;
            }
          }
          if (!resolved && typeof track.getPointAt === 'function') {
            const c = track.getPointAt(info.t);
            if (c) {
              outwardDir.set(kart.position.x - c.x, 0, kart.position.z - c.z);
              if (outwardDir.lengthSq() > 1e-6) {
                outwardDir.normalize();
                resolved = true;
              }
            }
          }
          if (!resolved && typeof track.getClosestPointInfo === 'function') {
            const eps = 0.25;
            const ix = track.getClosestPointInfo(kart.position.x + eps, kart.position.z, info.t);
            const iz = track.getClosestPointInfo(kart.position.x, kart.position.z + eps, info.t);
            const gx = ((ix?.lateralOffset ?? lat) - lat) * latSign;
            const gz = ((iz?.lateralOffset ?? lat) - lat) * latSign;
            outwardDir.set(gx, 0, gz);
            if (outwardDir.lengthSq() > 1e-8) {
              outwardDir.normalize();
              resolved = true;
            }
          }

          if (resolved) {
            kart.position.x -= outwardDir.x * excess;
            kart.position.z -= outwardDir.z * excess;

            // Slide smoothly along barrier without sticking or harsh per-frame braking
            const vx = moveDir.x * kart.speed;
            const vz = moveDir.z * kart.speed;
            const vDotOut = vx * outwardDir.x + vz * outwardDir.z;
            if (vDotOut > 0) {
              const tangVx = vx - outwardDir.x * vDotOut;
              const tangVz = vz - outwardDir.z * vDotOut;
              const tangSpeed = Math.hypot(tangVx, tangVz);

              const impactRatio = clamp(vDotOut / Math.max(0.01, Math.abs(kart.speed)), 0, 1);
              if (impactRatio > 0.3 && Math.abs(kart.speed) > 14) {
                kart.events.justHitWall = true;
                kart.wallImpact = impactRatio * Math.abs(kart.speed);
              }
              const wallSlowdown = Math.max(0.7, 1 - (impactRatio * 2.4 + 0.4) * safeDt);
              kart.speed *= wallSlowdown;

              if (tangSpeed > 0.2) {
                const tangHeading = kart.speed >= 0
                  ? Math.atan2(tangVx, tangVz)
                  : Math.atan2(-tangVx, -tangVz);
                const diff = normalizeAngle(tangHeading - kart.heading);
                kart.heading = normalizeAngle(kart.heading + diff * Math.min(1, 14.0 * safeDt));
                forwardXZ.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));
                rightXZ.set(-Math.cos(kart.heading), 0, Math.sin(kart.heading));
                moveDir.copy(forwardXZ);
              }
            }
            info = track.getClosestPointInfo(kart.position.x, kart.position.z, info.t);
          }
        }
      }

      // 9. Kart-to-kart elastic soft collisions
      if (Array.isArray(otherKarts) && otherKarts.length > 0) {
        const minDist = KART_COLLISION_RADIUS * 2.0;
        const minDistSq = minDist * minDist;

        for (let i = 0; i < otherKarts.length; i++) {
          const other = otherKarts[i];
          if (!other || other === kart || !other.position) continue;
          if (Math.abs(kart.position.y - other.position.y) > 1.8) continue;

          const dx = kart.position.x - other.position.x;
          const dz = kart.position.z - other.position.z;
          const distSq = dx * dx + dz * dz;

          if (distSq < minDistSq) {
            let nx = 1;
            let nz = 0;
            let dist = 0.001;
            if (distSq > 1e-6) {
              dist = Math.sqrt(distSq);
              nx = dx / dist;
              nz = dz / dist;
            }
            const overlap = minDist - dist;
            kart.position.x += nx * overlap * 0.52;
            kart.position.z += nz * overlap * 0.52;
            if (!other.isRemote) {
              other.position.x -= nx * overlap * 0.48;
              other.position.z -= nz * overlap * 0.48;
            }

            const kvx = moveDir.x * kart.speed;
            const kvz = moveDir.z * kart.speed;
            const ovx = other.velocity ? other.velocity.x : 0;
            const ovz = other.velocity ? other.velocity.z : 0;
            const relVn = (kvx - ovx) * nx + (kvz - ovz) * nz;

            if (relVn < 0) {
              const bounce = -relVn * 0.35;
              const projForward = nx * forwardXZ.x + nz * forwardXZ.z;
              kart.speed += projForward * bounce * 0.5;
              kart.speed *= 0.96;
              suspVel -= Math.min(2.2, Math.abs(relVn) * 0.12);
            }
          }
        }

        if (track?.getClosestPointInfo) {
          info = track.getClosestPointInfo(kart.position.x, kart.position.z, info?.t ?? kart.trackT);
        }
      }

      // 10. Ground, Ramp Launch, Gravity & Landing Physics
      const surfaceHeight = info?.surfaceHeight ?? 0;
      const isRamp = Boolean(info?.isRamp);
      const rampSlope = info?.rampSlope ?? 0;

      if (kart.isGrounded) {
        const rampCrestTriggered =
          (wasOnRamp && (!isRamp || rampSlope <= 0.02)) ||
          surfaceHeight < kart.position.y - 0.18;

        const hasLaunchMomentum =
          kart.speed > 10 || (wasOnRamp && prevRampSlope > 0.05 && kart.speed > 4);

        if (rampCrestTriggered && hasLaunchMomentum) {
          kart.isGrounded = false;
          const effectiveSlope = Math.max(prevRampSlope || rampSlope, 0.30);
          kart.vy = Math.max(kart.vy, kart.speed * effectiveSlope * 1.2);
          kart.airTime = 0;
          jumpBaseHeight = surfaceHeight;
          kart.maxJumpHeight = Math.max(0, kart.position.y - surfaceHeight);
          kart.position.y += kart.vy * safeDt;
          wasOnRamp = false;
        } else {
          kart.position.y = surfaceHeight;
          if (isRamp && rampSlope > 0.05 && kart.speed > 10) {
            kart.vy = kart.speed * rampSlope;
          } else {
            kart.vy = 0;
          }
          wasOnRamp = Boolean(isRamp && rampSlope > 0.02);
          prevRampSlope = rampSlope;
          prevGroundHeight = surfaceHeight;
        }
      } else {
        kart.airTime += safeDt;
        kart.vy -= GRAVITY * safeDt;
        kart.position.y += kart.vy * safeDt;
        kart.maxJumpHeight = Math.max(
          kart.maxJumpHeight,
          kart.position.y - surfaceHeight
        );

        const landed =
          (kart.position.y <= surfaceHeight && kart.vy <= 0) ||
          (kart.airTime > 0.06 && kart.position.y < surfaceHeight - 0.01);

        if (landed) {
          const impactVy = Math.abs(kart.vy);
          kart.position.y = surfaceHeight;
          kart.isGrounded = true;
          kart.events.justLanded = true;
          suspVel -= Math.min(8.0, impactVy * 0.45);
          kart.vy = 0;
          wasOnRamp = Boolean(isRamp && rampSlope > 0.02);
          prevRampSlope = rampSlope;
          prevGroundHeight = surfaceHeight;
        }
      }

      // Keep 3D velocity accurate for external consumers
      kart.velocity.set(
        moveDir.x * kart.speed,
        kart.isGrounded ? (kart.position.y - prevY) / safeDt : kart.vy,
        moveDir.z * kart.speed
      );

      // 11. Lap Counting & Total Progress (checkpoint-gated against exploits)
      if (info && typeof info.t === 'number') {
        const prevT = kart.trackT;
        const newT = info.t;

        if (!behindStartLine) {
          if (newT >= 0.25 && newT <= 0.55) {
            sector1Passed = true;
          }
          if (sector1Passed && newT >= 0.55 && newT <= 0.88) {
            sector2Passed = true;
          }
        }

        if (prevT > 0.85 && newT < 0.15) {
          if (behindStartLine) {
            behindStartLine = false;
          } else if (sector1Passed && sector2Passed) {
            kart.lap += 1;
            sector1Passed = false;
            sector2Passed = false;
            if (kart.lap > TOTAL_LAPS && !kart.finished) {
              kart.finished = true;
              kart.finishTime = raceElapsed;
            }
          }
        } else if (prevT < 0.15 && newT > 0.85) {
          if (!behindStartLine && !sector1Passed && !sector2Passed) {
            behindStartLine = true;
          } else if (!behindStartLine && sector2Passed && kart.lap > 1) {
            kart.lap = Math.max(1, kart.lap - 1);
          }
        }

        kart.trackT = newT;
        kart.totalProgress = behindStartLine
          ? (kart.lap - 1) + (newT - 1)
          : (kart.lap - 1) + newT;
      }

      animateVisual(safeDt, effectiveThrottle, effectiveSteer, isBoosting, onOffroad, absSpeed, info);
    },

    /**
     * Kart de outro jogador / robô da TV: segue o estado recebido pela rede (já previsto
     * para "agora" por quem chama) e só anima o visual. st = {x,y,z,h,v,th,st,d,c,b,sp,sd,g,t,l,p,f,ft}
     */
    updateRemote(dt, st, snap = false) {
      const safeDt = clamp(dt || 0, 0, 0.1);
      if (safeDt <= 0 || !st) return;
      kart.prevPosition.copy(kart.position);
      kart.events.justStartedDrift = false;
      kart.events.justReleasedBoost = false;
      kart.events.justLanded = false;
      kart.events.justSpunOut = false;
      kart.events.justHitWall = false;
      raceElapsed += safeDt;

      const dx = st.x - kart.position.x;
      const dz = st.z - kart.position.z;
      const err = Math.hypot(dx, dz);
      if (snap || err > 14) {
        kart.position.set(st.x, st.y, st.z);
        kart.prevPosition.copy(kart.position);
        kart.heading = st.h;
      } else {
        const a = 1 - Math.exp(-9 * safeDt);
        kart.position.x += dx * a;
        kart.position.z += dz * a;
        kart.position.y += (st.y - kart.position.y) * (1 - Math.exp(-14 * safeDt));
        kart.heading = normalizeAngle(kart.heading + normalizeAngle(st.h - kart.heading) * (1 - Math.exp(-11 * safeDt)));
      }
      const wasGrounded = kart.isGrounded;
      kart.speed = st.v || 0;
      kart.isGrounded = st.g !== 0;
      if (!wasGrounded && kart.isGrounded) kart.events.justLanded = true;
      kart.driftDir = st.d || 0;
      kart.isDrifting = kart.driftDir !== 0;
      kart.driftCharge = st.c || 0;
      kart.boostTimer = Math.max(0, st.b || 0);
      const sp = Math.max(0, st.sp || 0);
      if (sp > 0) {
        if (kart.spinoutTimer <= 0) kart.events.justSpunOut = true;
        spinoutDuration = Math.max(sp, st.sd || 1.2);
        spinoutVisualYaw = (1 - sp / Math.max(0.01, spinoutDuration)) * Math.PI * 4;
      } else {
        spinoutVisualYaw = 0;
        spinoutDuration = 0;
      }
      kart.spinoutTimer = sp;
      smoothSteer = damp(smoothSteer, clamp(st.st || 0, -1, 1), 16, safeDt);

      forwardXZ.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));
      rightXZ.set(-Math.cos(kart.heading), 0, Math.sin(kart.heading));
      kart.velocity.set(forwardXZ.x * kart.speed, 0, forwardXZ.z * kart.speed);

      const info = track?.getClosestPointInfo
        ? track.getClosestPointInfo(kart.position.x, kart.position.z, kart.trackT)
        : null;
      const halfWidth = (track?.trackWidth ?? 16) * 0.5;
      const onOffroad = info ? Boolean(info.onOffroad ?? info.isOffroad ?? Math.abs(info.lateralOffset ?? 0) > halfWidth) : false;
      kart.onOffroad = onOffroad;
      if (typeof st.t === 'number') kart.trackT = st.t;
      else if (info) kart.trackT = info.t;
      if (typeof st.l === 'number') kart.lap = st.l;
      if (typeof st.p === 'number') kart.totalProgress = st.p;
      kart.finished = Boolean(st.f);
      if (typeof st.ft === 'number') kart.finishTime = st.ft;

      let effectiveSteer = smoothSteer;
      if (kart.isDrifting) effectiveSteer = kart.driftDir * 0.48 + smoothSteer * 0.62;
      animateVisual(safeDt, sp > 0 ? 0 : (st.th ?? 1), effectiveSteer, kart.boostTimer > 0, onOffroad, Math.abs(kart.speed), info);
    },

    /** Estado curto para mandar pela rede (números arredondados). */
    getNetState(throttle = 0, steer = 0) {
      const r1 = (v) => Math.round(v * 100) / 100;
      return {
        x: r1(kart.position.x), y: r1(kart.position.y), z: r1(kart.position.z),
        h: Math.round(kart.heading * 1000) / 1000,
        v: r1(kart.speed), vy: r1(kart.vy || 0),
        th: Math.round(throttle * 10) / 10, st: Math.round(steer * 10) / 10,
        d: kart.isDrifting ? kart.driftDir : 0, c: r1(kart.driftCharge),
        b: r1(kart.boostTimer), sp: r1(kart.spinoutTimer), sd: r1(spinoutDuration),
        g: kart.isGrounded ? 1 : 0,
        t: Math.round(kart.trackT * 10000) / 10000, l: kart.lap,
        p: Math.round(kart.totalProgress * 10000) / 10000,
        f: kart.finished ? 1 : 0, ft: r1(kart.finishTime || 0)
      };
    },

    dispose() {
      if (model.rootGroup.parent) model.rootGroup.parent.remove(model.rootGroup);
      exhaustPool.dispose();
      sparkPool.dispose();
      dustPool.dispose();
      if (model.botBadgeSprite) {
        model.botBadgeSprite.material.dispose();
      }
      for (let i = 0; i < model.textures.length; i++) {
        const tex = model.textures[i];
        if (tex) tex.dispose();
      }
    }
  };

  // Apply initial orientation & position cleanly at frame 0
  basisX.crossVectors(
    smoothedUp,
    forwardXZ.set(Math.sin(initialHeading), 0, Math.cos(initialHeading))
  );
  if (basisX.lengthSq() < 1e-6) basisX.set(1, 0, 0);
  else basisX.normalize();
  basisZ.crossVectors(basisX, smoothedUp).normalize();
  basisMat.makeBasis(basisX, smoothedUp, basisZ);
  model.rootGroup.quaternion.setFromRotationMatrix(basisMat);
  model.rootGroup.position.copy(startPos);

  return kart;
}
