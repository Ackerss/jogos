import * as THREE from 'three';

const TRACK_WIDTH = 18;
const HALF_WIDTH = TRACK_WIDTH * 0.5;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LUT_SIZE = 1024;
const ROAD_SEGMENTS = 640;
const GROUND_Y = -0.65;

// Closed Grand Prix circuit control points (roughly uniform spacing, straight around t=0 and ramp)
const RAW_CONTROL_POINTS = [
  [0, 0.4, 0],        // 0: Start/Finish line (t = 0)
  [0, 0.4, 22],       // 1: Main straight exit
  [0, 0.4, 44],       // 2: Main straight end
  [-4, 1.2, 64],      // 3: Gentle Turn 1 transition
  [-16, 3.6, 80],     // 4: Turn 1 entry (banked right turn)
  [-38, 4.8, 84],     // 5: Turn 1 apex
  [-62, 4.8, 72],     // 6: Turn 1 exit
  [-73, 2.8, 48],     // 7: Transition to ramp straight
  [-74, 1.0, 23],     // 8: Ramp straight approach
  [-74, 1.0, 0],      // 9: Ramp zone (-Z)
  [-74, 1.0, -23],    // 10: Ramp landing straight
  [-72, 1.6, -47],    // 11: Turn 2 entry
  [-60, 2.8, -73],    // 12: Turn 2 curve
  [-40, 3.4, -95],    // 13: South-west chicane
  [-14, 3.2, -108],   // 14: Chicane dip
  [16, 3.6, -118],    // 15: South sweep
  [48, 4.8, -114],    // 16: Giant Carousel entry (banked right turn)
  [76, 5.2, -94],     // 17: Giant Carousel
  [90, 5.4, -64],     // 18: Giant Carousel apex
  [90, 5.2, -32],     // 19: Carousel upper arc (0 deg)
  [83, 5.0, -16],     // 20: Carousel upper arc (45 deg)
  [67, 4.8, -9],      // 21: Carousel upper arc (90 deg)
  [51, 4.4, -16],     // 22: Carousel upper arc (135 deg)
  [44, 3.6, -32],     // 23: Carousel exit (180 deg)
  [44, 3.2, -56],     // 24: Back straight leg
  [38, 3.4, -73],     // 25: Final Parabolica entry (left turn)
  [22, 3.5, -80],     // 26: Final Parabolica apex
  [6, 2.8, -73],      // 27: Final Parabolica exit
  [0, 0.8, -56],      // 28: Main straight approach
  [0, 0.4, -38],      // 29: Main straight
  [0, 0.4, -19],      // 30: Starting grid area
];

const RAIL_RANGES = [
  { tStart: 0.085, tEnd: 0.225, side: -1, segs: 36 }, // Turn 1 outer (-right)
  { tStart: 0.355, tEnd: 0.455, side: -1, segs: 24 }, // Turn 2 outer
  { tStart: 0.555, tEnd: 0.790, side: -1, segs: 52 }, // Giant Carousel outer (-right)
  { tStart: 0.820, tEnd: 0.922, side: 1, segs: 26 },  // Final Parabolica outer (+right)
];

const RAMP_DEF = {
  tStart: 0.257,
  tPeak: 0.276,
  tEnd: 0.286,
  height: 3.2,
  easeSplit: 0.56,
};

// Banked curve zones: positive bankAngle lifts +right and lowers -right.
// Right turns have inside on +right (so negative bankAngle tilts inward);
// Left turns have inside on -right (so positive bankAngle tilts inward).
const BANK_ZONES = [
  { tStart: 0.105, tEnd: 0.215, rampFrac: 0.25, maxAngle: -0.340 }, // Turn 1: ~19.5 deg inward
  { tStart: 0.555, tEnd: 0.785, rampFrac: 0.20, maxAngle: -0.375 }, // Giant Carousel: ~21.5 deg inward
  { tStart: 0.822, tEnd: 0.900, rampFrac: 0.28, maxAngle: 0.236 },  // Final Parabolica: ~13.5 deg inward
];

function normalizeT(t) {
  const r = t % 1;
  return r < 0 ? r + 1 : r;
}

function smoothStep01(u) {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function evalBankAngle(t) {
  for (let i = 0; i < BANK_ZONES.length; i++) {
    const z = BANK_ZONES[i];
    if (t >= z.tStart && t <= z.tEnd) {
      const span = z.tEnd - z.tStart;
      const u = (t - z.tStart) / span;
      if (u < z.rampFrac) {
        return z.maxAngle * smoothStep01(u / z.rampFrac);
      }
      if (u > 1 - z.rampFrac) {
        return z.maxAngle * smoothStep01((1 - u) / z.rampFrac);
      }
      return z.maxAngle;
    }
  }
  return 0;
}

function evalRampProfile(t, totalLength) {
  const { tStart, tPeak, tEnd, height, easeSplit } = RAMP_DEF;
  if (t < tStart || t > tEnd) {
    return { isRamp: false, offsetY: 0, slope: 0, rawDerivDs: 0 };
  }

  if (t <= tPeak) {
    const u = (t - tStart) / (tPeak - tStart);
    const k = 1 / (1 - 0.5 * easeSplit);
    let f;
    let dfdu;
    if (u <= easeSplit) {
      f = 0.5 * k * (u * u) / easeSplit;
      dfdu = k * (u / easeSplit);
    } else {
      f = k * (u - 0.5 * easeSplit);
      dfdu = k;
    }
    const sUp = (tPeak - tStart) * totalLength;
    const slope = (height / sUp) * dfdu;
    return { isRamp: true, offsetY: height * f, slope, rawDerivDs: slope };
  }

  const v = (t - tPeak) / (tEnd - tPeak);
  const offsetY = height * 0.5 * (1 + Math.cos(Math.PI * v));
  const sDown = (tEnd - tPeak) * totalLength;
  const rawDerivDs = -height * 0.5 * (Math.PI / sDown) * Math.sin(Math.PI * v);
  return { isRamp: true, offsetY, slope: 0, rawDerivDs };
}

function createProceduralCanvas(width, height, drawFn, repeatX = 1, repeatY = 1, isLinear = false) {
  if (typeof document === 'undefined') {
    const data = new Uint8Array([128, 128, 128, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = isLinear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeatX !== 1 || repeatY !== 1) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
  }
  texture.needsUpdate = true;
  return texture;
}

function createAsphaltMaps() {
  const map = createProceduralCanvas(512, 512, (ctx, w, h) => {
    const rand = createSeededRandom(4217);
    ctx.fillStyle = '#31363f';
    ctx.fillRect(0, 0, w, h);

    // Multi-tone asphalt patches & subtle longitudinal wear
    for (let i = 0; i < 42; i++) {
      const px = rand() * w;
      const py = rand() * h;
      const pw = 24 + rand() * 54;
      const ph = 48 + rand() * 140;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(22, 25, 30, 0.14)' : 'rgba(72, 78, 88, 0.11)';
      ctx.fillRect(px, py, pw, ph);
    }

    // Worn rubber tire tracks along both racing lanes
    for (const laneCenter of [0.29, 0.71]) {
      const lx = w * laneCenter;
      const lg = ctx.createLinearGradient(lx - w * 0.13, 0, lx + w * 0.13, 0);
      lg.addColorStop(0, 'rgba(14, 16, 20, 0)');
      lg.addColorStop(0.3, 'rgba(14, 16, 20, 0.24)');
      lg.addColorStop(0.5, 'rgba(10, 12, 16, 0.34)');
      lg.addColorStop(0.7, 'rgba(14, 16, 20, 0.24)');
      lg.addColorStop(1, 'rgba(14, 16, 20, 0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - w * 0.13, 0, w * 0.26, h);
    }

    // Fine mineral aggregate speckles (dark & light granite chips)
    for (let i = 0; i < 5200; i++) {
      const gx = rand() * w;
      const gy = rand() * h;
      const chip = rand();
      if (chip < 0.45) {
        const v = Math.floor(28 + rand() * 20);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      } else if (chip < 0.88) {
        const v = Math.floor(54 + rand() * 30);
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
      } else {
        const v = Math.floor(66 + rand() * 18);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 3})`;
      }
      ctx.fillRect(gx, gy, 1.4, 1.4);
    }

    // Textured concrete red & white curbs ("zebras") with mortar joints
    const curbW = Math.round(w * 0.058);
    const segs = 4;
    const segH = h / segs;
    for (let s = 0; s < segs; s++) {
      const isRed = s % 2 === 0;
      const y0 = s * segH;
      ctx.fillStyle = isRed ? '#d92320' : '#eceef1';
      ctx.fillRect(0, y0, curbW, segH);
      ctx.fillRect(w - curbW, y0, curbW, segH);

      // Subtle concrete mottling & tire scuff along inner edge of curb
      for (let k = 0; k < 45; k++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(rand() * curbW, y0 + rand() * segH, 3, 3);
        ctx.fillRect(w - curbW + rand() * curbW, y0 + rand() * segH, 3, 3);
      }
      ctx.fillStyle = 'rgba(20, 22, 26, 0.25)';
      ctx.fillRect(curbW - 5, y0, 5, segH);
      ctx.fillRect(w - curbW, y0, 5, segH);

      // Mortar joint groove between curb blocks
      ctx.fillStyle = '#25282e';
      ctx.fillRect(0, y0, curbW, 3);
      ctx.fillRect(w - curbW, y0, curbW, 3);
    }

    // Curb inner shadow seam
    ctx.fillStyle = '#181a1f';
    ctx.fillRect(curbW, 0, 3, h);
    ctx.fillRect(w - curbW - 3, 0, 3, h);

    // Continuous white sidelines with subtle wear specks
    const lineW = Math.round(w * 0.02);
    ctx.fillStyle = '#edf0f3';
    ctx.fillRect(curbW + 10, 0, lineW, h);
    ctx.fillRect(w - curbW - 10 - lineW, 0, lineW, h);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = 'rgba(42, 46, 54, 0.35)';
      ctx.fillRect(curbW + 10 + rand() * lineW, rand() * h, 2, 4);
      ctx.fillRect(w - curbW - 10 - lineW + rand() * lineW, rand() * h, 2, 4);
    }

    // Dashed yellow/amber centerline with realistic paint grain
    const centerW = Math.round(w * 0.022);
    const cx = Math.round((w - centerW) * 0.5);
    ctx.fillStyle = '#f8c828';
    ctx.fillRect(cx, 22, centerW, h * 0.38);
    ctx.fillRect(cx, h * 0.5 + 22, centerW, h * 0.38);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = 'rgba(40, 44, 52, 0.28)';
      ctx.fillRect(cx + rand() * centerW, rand() * h, 2, 3);
    }
  }, 1, 1, false);

  const roughnessMap = createProceduralCanvas(512, 512, (ctx, w, h) => {
    const rand = createSeededRandom(4218);
    // High roughness on raw mineral asphalt (~226 = 0.89)
    ctx.fillStyle = 'rgb(226, 226, 226)';
    ctx.fillRect(0, 0, w, h);

    // Smoother polished rubber tire grooves (~128 = 0.50) to catch sun & sky reflections
    for (const laneCenter of [0.29, 0.71]) {
      const lx = w * laneCenter;
      const lg = ctx.createLinearGradient(lx - w * 0.13, 0, lx + w * 0.13, 0);
      lg.addColorStop(0, 'rgba(128, 128, 128, 0)');
      lg.addColorStop(0.35, 'rgba(128, 128, 128, 0.75)');
      lg.addColorStop(0.5, 'rgba(116, 116, 116, 0.92)');
      lg.addColorStop(0.65, 'rgba(128, 128, 128, 0.75)');
      lg.addColorStop(1, 'rgba(128, 128, 128, 0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - w * 0.13, 0, w * 0.26, h);
    }

    // Aggregate micro-roughness variation
    for (let i = 0; i < 6500; i++) {
      const v = Math.floor(175 + rand() * 75);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }

    // Painted lines slightly glossier (~145)
    const curbW = Math.round(w * 0.058);
    const lineW = Math.round(w * 0.02);
    ctx.fillStyle = 'rgb(148, 148, 148)';
    ctx.fillRect(curbW + 10, 0, lineW, h);
    ctx.fillRect(w - curbW - 10 - lineW, 0, lineW, h);
    const centerW = Math.round(w * 0.022);
    const cx = Math.round((w - centerW) * 0.5);
    ctx.fillRect(cx, 22, centerW, h * 0.38);
    ctx.fillRect(cx, h * 0.5 + 22, centerW, h * 0.38);

    // Concrete curbs with rough mortar joints
    const segH = h / 4;
    ctx.fillStyle = 'rgb(176, 176, 176)';
    ctx.fillRect(0, 0, curbW, h);
    ctx.fillRect(w - curbW, 0, curbW, h);
    ctx.fillStyle = 'rgb(245, 245, 245)';
    for (let s = 0; s < 4; s++) {
      ctx.fillRect(0, s * segH, curbW, 3);
      ctx.fillRect(w - curbW, s * segH, curbW, 3);
    }
  }, 1, 1, true);

  const bumpMap = createProceduralCanvas(512, 512, (ctx, w, h) => {
    const rand = createSeededRandom(4219);
    ctx.fillStyle = 'rgb(128, 128, 128)';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 11000; i++) {
      const v = Math.floor(80 + rand() * 110);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rand() * w, rand() * h, 1.8, 1.8);
    }

    // Raised curb blocks + recessed mortar joints
    const curbW = Math.round(w * 0.058);
    const segH = h / 4;
    ctx.fillStyle = 'rgb(190, 190, 190)';
    ctx.fillRect(0, 0, curbW - 2, h);
    ctx.fillRect(w - curbW + 2, 0, curbW - 2, h);
    ctx.fillStyle = 'rgb(40, 40, 40)';
    for (let s = 0; s < 4; s++) {
      ctx.fillRect(0, s * segH, curbW, 4);
      ctx.fillRect(w - curbW, s * segH, curbW, 4);
    }
    ctx.fillRect(curbW - 2, 0, 4, h);
    ctx.fillRect(w - curbW - 2, 0, 4, h);
  }, 1, 1, true);

  return { map, roughnessMap, bumpMap };
}

function createCheckeredTexture() {
  return createProceduralCanvas(512, 128, (ctx, w, h) => {
    const rand = createSeededRandom(1204);
    const cols = 16;
    const rows = 4;
    const cw = w / cols;
    const ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f4f6f8' : '#14171c';
        ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
      }
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(rand() * w, rand() * h, 2, 2);
    }
    ctx.fillStyle = '#ffd028';
    ctx.fillRect(0, 0, w, 6);
    ctx.fillRect(0, h - 6, w, 6);
  });
}

function createRampMaps() {
  const map = createProceduralCanvas(512, 1024, (ctx, w, h) => {
    const rand = createSeededRandom(6101);
    // Metallic carbon-slate ramp deck
    const deckGrad = ctx.createLinearGradient(0, 0, w, 0);
    deckGrad.addColorStop(0, '#1e242d');
    deckGrad.addColorStop(0.5, '#2b3240');
    deckGrad.addColorStop(1, '#1e242d');
    ctx.fillStyle = deckGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle diamond-plate / steel panel seams
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(rand() * w, rand() * h, 3, 2);
    }

    // Glowing yellow-orange edge rails
    const sideGradL = ctx.createLinearGradient(0, 0, 74, 0);
    sideGradL.addColorStop(0, '#ff7700');
    sideGradL.addColorStop(0.55, '#ffd426');
    sideGradL.addColorStop(1, 'rgba(255, 212, 38, 0)');
    ctx.fillStyle = sideGradL;
    ctx.fillRect(0, 0, 74, h);

    const sideGradR = ctx.createLinearGradient(w, 0, w - 74, 0);
    sideGradR.addColorStop(0, '#ff7700');
    sideGradR.addColorStop(0.55, '#ffd426');
    sideGradR.addColorStop(1, 'rgba(255, 212, 38, 0)');
    ctx.fillStyle = sideGradR;
    ctx.fillRect(w - 74, 0, 74, h);

    // Hazard stripes on extreme borders
    for (let y = 0; y < h; y += 64) {
      ctx.fillStyle = (y / 64) % 2 === 0 ? '#ffb703' : '#16181d';
      ctx.fillRect(0, y, 22, 64);
      ctx.fillRect(w - 22, y, 22, 64);
    }

    // Speed lines
    ctx.fillStyle = 'rgba(255, 190, 40, 0.42)';
    for (const x of [98, 134, w - 134 - 8, w - 98 - 8]) {
      ctx.fillRect(x, 0, 8, h);
    }

    // Bold bright glowing chevrons pointing forward (+V on the mesh)
    const chevronCount = 6;
    const spacing = (h * 0.72) / chevronCount;
    for (let i = 0; i < chevronCount; i++) {
      const cy = h * 0.88 - i * spacing;
      const grad = ctx.createLinearGradient(0, cy - 60, 0, cy + 50);
      grad.addColorStop(0, '#fff799');
      grad.addColorStop(0.5, '#ffaa00');
      grad.addColorStop(1, '#ff5400');

      ctx.beginPath();
      ctx.moveTo(w * 0.5, cy - 58);
      ctx.lineTo(w * 0.77, cy + 20);
      ctx.lineTo(w * 0.77, cy + 56);
      ctx.lineTo(w * 0.5, cy - 18);
      ctx.lineTo(w * 0.23, cy + 56);
      ctx.lineTo(w * 0.23, cy + 20);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // Launch crest highlight bar near top (V ~ 0.67 where tPeak lies)
    ctx.fillStyle = '#ffe64d';
    ctx.fillRect(24, h * 0.31, w - 48, 22);
  }, 1, 1, false);

  const bumpMap = createProceduralCanvas(256, 512, (ctx, w, h) => {
    ctx.fillStyle = 'rgb(120, 120, 120)';
    ctx.fillRect(0, 0, w, h);
    // Anti-slip diamond-plate ribs
    ctx.fillStyle = 'rgb(200, 200, 200)';
    for (let y = 8; y < h; y += 20) {
      for (let x = 8; x < w; x += 20) {
        ctx.fillRect(x, y, 7, 3);
        ctx.fillRect(x + 9, y + 8, 3, 7);
      }
    }
  }, 1, 1, true);

  return { map, bumpMap };
}

function createGrassMaps() {
  const map = createProceduralCanvas(512, 512, (ctx, w, h) => {
    const rand = createSeededRandom(9012);
    ctx.fillStyle = '#487939';
    ctx.fillRect(0, 0, w, h);

    // Subtle autodrome mowing bands
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = (x / 64) % 2 === 0 ? 'rgba(92, 146, 62, 0.20)' : 'rgba(42, 78, 34, 0.16)';
      ctx.fillRect(x, 0, 64, h);
    }

    // Organic olive, moss, and clover patches
    for (let i = 0; i < 120; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const r = 14 + rand() * 34;
      const patch = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      const tone = rand();
      const col = tone < 0.35 ? 'rgba(65, 108, 46, 0.25)' : tone < 0.7 ? 'rgba(104, 142, 62, 0.22)' : 'rgba(84, 96, 52, 0.18)';
      patch.addColorStop(0, col);
      patch.addColorStop(1, 'rgba(72, 121, 57, 0)');
      ctx.fillStyle = patch;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Folhas de grama finas e inclinadas (traços curtos em vários tons)
    ctx.lineCap = 'round';
    for (let i = 0; i < 16000; i++) {
      const gx = rand() * w;
      const gy = rand() * h;
      const tone = rand();
      ctx.strokeStyle =
        tone < 0.25
          ? 'rgba(46, 86, 34, 0.85)'
          : tone < 0.55
            ? 'rgba(82, 135, 62, 0.8)'
            : tone < 0.85
              ? 'rgba(108, 160, 72, 0.75)'
              : 'rgba(140, 150, 80, 0.7)';
      ctx.lineWidth = 0.8 + rand() * 0.9;
      const len = 2.5 + rand() * 4.5;
      const lean = (rand() - 0.5) * 2.2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + lean, gy - len);
      ctx.stroke();
    }
    // Pequenas flores/trevos espalhados
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(250, 240, 180, 0.7)' : 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
    }
  }, 36, 36, false);

  const bumpMap = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const rand = createSeededRandom(9013);
    ctx.fillStyle = 'rgb(128, 128, 128)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8000; i++) {
      const v = Math.floor(75 + rand() * 115);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rand() * w, rand() * h, 2, 3);
    }
  }, 36, 36, true);

  return { map, bumpMap };
}

// Quebra a repetição da textura da grama: mistura a mesma textura em escala grande
// e manchas de cor por posição no mundo (1 leitura de textura extra, bem leve).
function applyGrassVariation(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrassWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGrassWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGrassWorld;
        float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float gNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_MAP
          vec4 macroTex = texture2D(map, vMapUv * 0.137 + vec2(0.31, 0.77));
          diffuseColor.rgb = mix(diffuseColor.rgb, macroTex.rgb, 0.4);
        #endif
        float gN = gNoise(vGrassWorld.xz * 0.018) * 0.65 + gNoise(vGrassWorld.xz * 0.06) * 0.35;
        vec3 dryTint = vec3(1.10, 1.05, 0.74);
        vec3 lushTint = vec3(0.84, 0.98, 0.82);
        diffuseColor.rgb *= mix(lushTint, dryTint, smoothstep(0.35, 0.75, gN));`);
  };
}

function createEmbankmentMaps() {
  const map = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const rand = createSeededRandom(7331);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.0, '#78808a');   // concrete curb apron right outside track edge
    grad.addColorStop(0.11, '#5d6b52');  // soil/gravel transition
    grad.addColorStop(0.24, '#4e7e3c');  // shoulder grass
    grad.addColorStop(0.65, '#487939');  // matches ground grass tone
    grad.addColorStop(1.0, '#3e6a32');   // slope shade
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 2600; i++) {
      const gx = rand() * w;
      const gy = rand() * h;
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(18,28,16,0.10)';
      ctx.fillRect(gx, gy, 2.5, 3.5);
    }
  }, 1, 1, false);

  const bumpMap = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const rand = createSeededRandom(7332);
    ctx.fillStyle = 'rgb(128, 128, 128)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      const v = Math.floor(85 + rand() * 90);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rand() * w, rand() * h, 2, 3);
    }
  }, 1, 1, true);

  return { map, bumpMap };
}

function createGantryBannerTexture() {
  return createProceduralCanvas(1024, 256, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a1638');
    bg.addColorStop(0.5, '#132a63');
    bg.addColorStop(1, '#08112b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Top and bottom racing accent bars
    ctx.fillStyle = '#ffd028';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 12, w, 12);
    ctx.fillStyle = '#e52521';
    ctx.fillRect(0, 14, w, 6);
    ctx.fillRect(0, h - 20, w, 6);

    // Checkered blocks on left and right ends
    const checkCols = 4;
    const checkRows = 6;
    const blockW = 112;
    const cellW = blockW / checkCols;
    const cellH = (h - 48) / checkRows;
    for (let r = 0; r < checkRows; r++) {
      for (let c = 0; c < checkCols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111318';
        ctx.fillRect(14 + c * cellW, 24 + r * cellH, cellW + 0.5, cellH + 0.5);
        ctx.fillRect(w - 14 - blockW + c * cellW, 24 + r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Crisp non-mirrored centered text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 66px "Arial Black", Impact, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillText('LARGADA / CHEGADA', w * 0.5 + 4, h * 0.5 + 5);

    const textGrad = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.78);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(0.6, '#fff3b0');
    textGrad.addColorStop(1, '#ffd028');
    ctx.fillStyle = textGrad;
    ctx.fillText('LARGADA / CHEGADA', w * 0.5, h * 0.5);
  });
}

function createSponsorBannerTexture(label, bgPrimary, bgSecondary, accentColor) {
  return createProceduralCanvas(512, 128, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, bgPrimary);
    bg.addColorStop(1, bgSecondary);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Diagonal racing stripes at ends
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);
    for (let sx of [16, 44, w - 62, w - 34]) {
      ctx.beginPath();
      ctx.moveTo(sx, 16);
      ctx.lineTo(sx + 18, 16);
      ctx.lineTo(sx + 4, h - 16);
      ctx.lineTo(sx - 14, h - 16);
      ctx.closePath();
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 54px "Arial Black", Impact, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(label, w * 0.5 + 3, h * 0.5 + 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, w * 0.5, h * 0.5);
  });
}

function createSkyTexture() {
  return createProceduralCanvas(64, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, '#1854b4');
    grad.addColorStop(0.28, '#3b8ee0');
    grad.addColorStop(0.46, '#89cfff');
    grad.addColorStop(0.54, '#b8e2ff');
    grad.addColorStop(0.62, '#a5d8ff');
    grad.addColorStop(1.0, '#629c54');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

function createGuardRailMaps() {
  const map = createProceduralCanvas(256, 64, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, '#edf2f7');
    grad.addColorStop(0.22, '#cbd5e1');
    grad.addColorStop(0.38, '#94a3b8');
    grad.addColorStop(0.52, '#e2e8f0');
    grad.addColorStop(0.70, '#94a3b8');
    grad.addColorStop(0.88, '#cbd5e1');
    grad.addColorStop(1.0, '#64748b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // High-visibility red & white reflective safety stripe along upper rail
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 3, w * 0.25, 10);
    ctx.fillRect(w * 0.5, 3, w * 0.25, 10);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(w * 0.25, 3, w * 0.25, 10);
    ctx.fillRect(w * 0.75, 3, w * 0.25, 10);
  }, 14, 1, false);

  const roughnessMap = createProceduralCanvas(256, 64, (ctx, w, h) => {
    ctx.fillStyle = 'rgb(155, 155, 155)';
    ctx.fillRect(0, 0, w, h);
    // Brushed steel peaks glossier than recessed troughs
    ctx.fillStyle = 'rgb(105, 105, 105)';
    ctx.fillRect(0, 14, w, 12);
    ctx.fillRect(0, 38, w, 12);
    // Reflective tape band very smooth
    ctx.fillStyle = 'rgb(64, 64, 64)';
    ctx.fillRect(0, 3, w, 10);
  }, 14, 1, true);

  const bumpMap = createProceduralCanvas(256, 64, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, 'rgb(130,130,130)');
    grad.addColorStop(0.25, 'rgb(220,220,220)');
    grad.addColorStop(0.45, 'rgb(60,60,60)');
    grad.addColorStop(0.65, 'rgb(220,220,220)');
    grad.addColorStop(0.85, 'rgb(70,70,70)');
    grad.addColorStop(1.0, 'rgb(128,128,128)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 14, 1, true);

  return { map, roughnessMap, bumpMap };
}

function createBarkMaps() {
  const map = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const rand = createSeededRandom(3301);
    ctx.fillStyle = '#4e3624';
    ctx.fillRect(0, 0, w, h);

    // Vertical furrowed bark ridges
    for (let x = 0; x < w; x += 6) {
      const dark = rand() > 0.45;
      ctx.fillStyle = dark ? 'rgba(38, 24, 14, 0.55)' : 'rgba(112, 82, 56, 0.36)';
      ctx.fillRect(x + (rand() - 0.5) * 3, 0, 2 + rand() * 3, h);
    }
    for (let i = 0; i < 2400; i++) {
      const tone = rand();
      ctx.fillStyle = tone < 0.45 ? 'rgba(28, 17, 10, 0.45)' : 'rgba(130, 96, 66, 0.28)';
      ctx.fillRect(rand() * w, rand() * h, 2, 6 + rand() * 14);
    }
  }, 1, 2, false);

  const bumpMap = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const rand = createSeededRandom(3302);
    ctx.fillStyle = 'rgb(128, 128, 128)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const v = Math.floor(40 + rand() * 180);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rand() * w, rand() * h, 2.5, 8 + rand() * 18);
    }
  }, 1, 2, true);

  return { map, bumpMap };
}

function createFoliageMaps() {
  const map = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const rand = createSeededRandom(3399);
    // Neutral light-mid base so instanceColor + vertex AO control true green hues cleanly
    ctx.fillStyle = '#a8b89a';
    ctx.fillRect(0, 0, w, h);

    // Deep internal shadow clusters + sunlit leaf/needle tufts
    for (let i = 0; i < 1100; i++) {
      const lx = rand() * w;
      const ly = rand() * h;
      const rx = 3 + rand() * 6;
      const ry = 2 + rand() * 4;
      const ang = rand() * Math.PI;
      const shade = rand();
      if (shade < 0.30) {
        ctx.fillStyle = 'rgba(42, 54, 34, 0.55)';
      } else if (shade < 0.72) {
        ctx.fillStyle = 'rgba(145, 166, 126, 0.52)';
      } else {
        ctx.fillStyle = 'rgba(222, 236, 198, 0.56)';
      }
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, 2, 2, false);

  const bumpMap = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const rand = createSeededRandom(3400);
    ctx.fillStyle = 'rgb(118, 118, 118)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const v = Math.floor(55 + rand() * 185);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 2 + rand() * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 2, 2, true);

  return { map, bumpMap };
}

/**
 * Merges an array of indexed or non-indexed BufferGeometries with per-part vertex color AO
 * into a single indexed BufferGeometry (position, normal, uv, color).
 */
function mergeColoredGeometries(parts) {
  const nonIndexed = [];
  let totalVerts = 0;
  for (const part of parts) {
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    const count = g.attributes.position.count;
    totalVerts += count;
    nonIndexed.push({ g, count, aoLow: part.aoLow ?? 0.65, aoHigh: part.aoHigh ?? 1.0, minY: part.minY, maxY: part.maxY });
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const colors = new Float32Array(totalVerts * 3);

  let offset = 0;
  for (const item of nonIndexed) {
    const { g, count, aoLow, aoHigh } = item;
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const uv = g.attributes.uv;

    let minY = item.minY;
    let maxY = item.maxY;
    if (minY === undefined || maxY === undefined) {
      minY = Infinity;
      maxY = -Infinity;
      for (let i = 0; i < count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const ySpan = Math.max(1e-4, maxY - minY);

    for (let i = 0; i < count; i++) {
      const dst = offset + i;
      const dst3 = dst * 3;
      const dst2 = dst * 2;
      positions[dst3] = pos.getX(i);
      positions[dst3 + 1] = pos.getY(i);
      positions[dst3 + 2] = pos.getZ(i);
      normals[dst3] = norm.getX(i);
      normals[dst3 + 1] = norm.getY(i);
      normals[dst3 + 2] = norm.getZ(i);
      uvs[dst2] = uv ? uv.getX(i) : 0;
      uvs[dst2 + 1] = uv ? uv.getY(i) : 0;

      const u = Math.max(0, Math.min(1, (pos.getY(i) - minY) / ySpan));
      const ao = aoLow + (aoHigh - aoLow) * u;
      colors[dst3] = ao;
      colors[dst3 + 1] = ao;
      colors[dst3 + 2] = ao;
    }
    offset += count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

function deformOrganicGeometry(geo, ampRadial, ampVert, seedPhase) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const theta = Math.atan2(z, x);
    const rXZ = Math.hypot(x, z);
    const wave =
      Math.sin(theta * 5 + seedPhase + y * 1.9) * 0.55 +
      Math.cos(theta * 8 - seedPhase * 1.4 + y * 3.1) * 0.45;
    const scaleXZ = rXZ > 1e-4 ? 1 + ampRadial * wave : 1;
    pos.setXYZ(i, x * scaleXZ, y + ampVert * wave, z * scaleXZ);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildSkyAndClouds() {
  // O céu e as nuvens agora são desenhados por um shader em main.js (mais realista e mais leve
  // que as antigas bolas 3D). Mantido para compatibilidade: não há mais nuvens 3D para animar.
  return [];
}

// Ruído 2D simples (value noise + fbm) para relevo natural das montanhas
function makeNoise2D(seed) {
  const perm = new Uint8Array(512);
  const rand = createSeededRandom(seed);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const val = (x, y) => perm[(perm[x & 255] + (y & 255)) & 511] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const a = val(xi, yi);
    const b = val(xi + 1, yi);
    const c = val(xi, yi + 1);
    const d = val(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 5) {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let i = 0; i < oct; i++) {
      sum += amp * noise(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return sum;
  }
  // Ruído "de crista": picos afiados, como serras de verdade
  function ridged(x, y, oct = 5) {
    let sum = 0;
    let amp = 0.55;
    let f = 1;
    for (let i = 0; i < oct; i++) {
      const n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1);
      sum += amp * n * n;
      f *= 2.1;
      amp *= 0.5;
    }
    return sum;
  }
  return { noise, fbm, ridged };
}

// Anel de relevo (colinas ou serra) com cores por altura, inclinação e névoa de distância
function buildTerrainRing(opts) {
  const { rInner, rOuter, radialSegs, ringSegs, heightFn, colorFn, fog = true } = opts;
  const vertCount = (radialSegs + 1) * (ringSegs + 1);
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const indices = [];

  for (let ir = 0; ir <= ringSegs; ir++) {
    const u = ir / ringSegs;
    const radius = rInner + u * (rOuter - rInner);
    for (let ia = 0; ia <= radialSegs; ia++) {
      // a última coluna repete a primeira para fechar o anel sem costura
      const theta = ((ia % radialSegs) / radialSegs) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const idx = ir * (radialSegs + 1) + ia;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = heightFn(x, z, u, theta);
      positions[idx * 3 + 2] = z;
    }
  }
  for (let ir = 0; ir < ringSegs; ir++) {
    for (let ia = 0; ia < radialSegs; ia++) {
      const a = ir * (radialSegs + 1) + ia;
      const b = a + 1;
      const c = a + (radialSegs + 1);
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const normals = geo.getAttribute('normal');
  const tmp = new THREE.Color();
  for (let i = 0; i < vertCount; i++) {
    colorFn(tmp, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], Math.abs(normals.getY(i)));
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, fog, side: THREE.DoubleSide });
  return new THREE.Mesh(geo, mat);
}

function buildGroundAndMountains(scene) {
  const grassMaps = createGrassMaps();
  const groundGeo = new THREE.PlaneGeometry(860, 860);
  groundGeo.rotateX(-Math.PI * 0.5);
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassMaps.map,
    bumpMap: grassMaps.bumpMap,
    bumpScale: 0.05,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.35,
  });
  applyGrassVariation(groundMat);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = GROUND_Y;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const terrainNoise = makeNoise2D(7781);

  // 1) Colinas próximas: verdes com manchas de mata, campos secos e pedra nas encostas
  const cMeadow = new THREE.Color('#5a8838');
  const cForest = new THREE.Color('#2f5a26');
  const cForestDark = new THREE.Color('#22461d');
  const cDry = new THREE.Color('#8f9a55');
  const cRock = new THREE.Color('#7d776a');
  const tmpForest = new THREE.Color();
  const hills = buildTerrainRing({
    rInner: 150,
    rOuter: 420,
    radialSegs: 220,
    ringSegs: 26,
    heightFn(x, z, u) {
      if (u === 0 || u === 1) return GROUND_Y - 0.2;
      const env = Math.sin(Math.pow(u, 0.7) * Math.PI);
      const big = terrainNoise.fbm(x * 0.006 + 3.1, z * 0.006 - 1.7, 4);
      const ridge = terrainNoise.ridged(x * 0.011, z * 0.011, 4);
      const h = 4 + big * 44 + ridge * 24 * smoothStep01(Math.min(1, u * 1.6));
      return GROUND_Y + h * env;
    },
    colorFn(out, x, y, z, ny) {
      const elev = y - GROUND_Y;
      const forestMask = terrainNoise.fbm(x * 0.03 + 11, z * 0.03 - 4, 3);
      const fine = terrainNoise.noise(x * 0.12, z * 0.12);
      const forestAmt = smoothStep01(Math.min(1, Math.max(0, (forestMask - 0.4) / 0.22)));
      out.copy(cMeadow).lerp(cDry, terrainNoise.fbm(x * 0.02, z * 0.02, 2) * 0.7);
      tmpForest.copy(cForest).lerp(cForestDark, fine);
      out.lerp(tmpForest, forestAmt * 0.85);
      // Encostas íngremes e topos altos mostram pedra
      const steep = 1 - ny;
      const rockAmt = Math.min(1, Math.max(0, (steep - 0.3) * 2.2) + Math.max(0, (elev - 40) / 18));
      out.lerp(cRock, rockAmt * 0.85);
      out.multiplyScalar(0.92 + fine * 0.14);
    }
  });
  hills.receiveShadow = true;
  scene.add(hills);

  // 2) Serra distante: picos altos azulados pela distância, com neve nos topos.
  //    Fica fora da névoa da cena para manter a silhueta nítida contra o céu.
  const cHazeBase = new THREE.Color('#8fa9bd');
  const cHazeRock = new THREE.Color('#6a7f95');
  const cSnow = new THREE.Color('#eef4fa');
  const cHorizon = new THREE.Color('#c2dcef');
  const range = buildTerrainRing({
    rInner: 470,
    rOuter: 700,
    radialSegs: 260,
    ringSegs: 16,
    fog: false,
    heightFn(x, z, u) {
      if (u === 0) return GROUND_Y - 2;
      const env = Math.min(1, u * 2.2) * (u > 0.85 ? Math.max(0, (1 - u) / 0.15) : 1);
      const mass = terrainNoise.fbm(x * 0.0035 + 40, z * 0.0035 + 9, 3);
      const peaks = terrainNoise.ridged(x * 0.008 + 7, z * 0.008 - 3, 5);
      return GROUND_Y + (15 + mass * 70 + peaks * 100) * env;
    },
    colorFn(out, x, y, z, ny) {
      const elev = y - GROUND_Y;
      out.copy(cHazeBase).lerp(cHazeRock, Math.min(1, elev / 90) * (0.5 + 0.5 * (1 - ny)));
      const snowLine = 100 + terrainNoise.noise(x * 0.03, z * 0.03) * 25;
      if (elev > snowLine && ny > 0.4) {
        out.lerp(cSnow, Math.min(1, (elev - snowLine) / 12));
      }
      // Pé da serra se mistura com a névoa do horizonte
      out.lerp(cHorizon, Math.max(0, 1 - elev / 50) * 0.8);
    }
  });
  scene.add(range);
}


function buildTrackMeshes(scene, getTrackFrame, totalLength) {
  // 1. Road Surface Mesh (exact surface formula across 5 lateral samples per ring)
  const lateralSamples = [-HALF_WIDTH, -HALF_WIDTH * 0.5, 0, HALF_WIDTH * 0.5, HALF_WIDTH];
  const cols = lateralSamples.length;
  const ringCount = ROAD_SEGMENTS + 1;

  const roadPositions = new Float32Array(ringCount * cols * 3);
  const roadNormals = new Float32Array(ringCount * cols * 3);
  const roadUVs = new Float32Array(ringCount * cols * 2);
  const roadIndices = [];

  // 2. Embankment / Skirt Mesh (left & right slopes descending into GROUND_Y - 0.45)
  const skirtCols = 6; // [outerL, shoulderL, edgeL, edgeR, shoulderR, outerR]
  const skirtPositions = new Float32Array(ringCount * skirtCols * 3);
  const skirtUVs = new Float32Array(ringCount * skirtCols * 2);
  const skirtIndices = [];

  const vRepeat = totalLength / 18;
  const tanXZ = new THREE.Vector3();
  const rightXZ = new THREE.Vector3();

  for (let i = 0; i <= ROAD_SEGMENTS; i++) {
    const tRaw = i / ROAD_SEGMENTS;
    const t = i === ROAD_SEGMENTS ? 0 : tRaw;
    const frame = getTrackFrame(t);

    tanXZ.set(frame.tangent.x, 0, frame.tangent.z);
    if (tanXZ.lengthSq() < 1e-8) tanXZ.set(0, 0, 1);
    tanXZ.normalize();
    rightXZ.crossVectors(tanXZ, WORLD_UP).normalize();

    const sinBank = Math.sin(frame.bankAngle);
    const vCoord = tRaw * vRepeat;

    for (let c = 0; c < cols; c++) {
      const w = lateralSamples[c];
      const vx = frame.point.x + rightXZ.x * w;
      const vy = frame.point.y + sinBank * w;
      const vz = frame.point.z + rightXZ.z * w;
      const idx3 = (i * cols + c) * 3;
      const idx2 = (i * cols + c) * 2;
      roadPositions[idx3] = vx;
      roadPositions[idx3 + 1] = vy;
      roadPositions[idx3 + 2] = vz;
      roadNormals[idx3] = frame.up.x;
      roadNormals[idx3 + 1] = frame.up.y;
      roadNormals[idx3 + 2] = frame.up.z;
      roadUVs[idx2] = (w + HALF_WIDTH) / TRACK_WIDTH;
      roadUVs[idx2 + 1] = vCoord;
    }

    // Embankment vertices: keep coplanar grass shoulder out to ±(HALF_WIDTH + 3.2) so offroad wheels never clip,
    // then slope smoothly down to skirtFloorY beyond the drivable zone.
    const shoulderW = HALF_WIDTH + 3.2;
    const outerW = HALF_WIDTH + 7.2;
    const edgeLY = frame.point.y - sinBank * HALF_WIDTH;
    const edgeRY = frame.point.y + sinBank * HALF_WIDTH;
    const shoulderLY = frame.point.y - sinBank * shoulderW;
    const shoulderRY = frame.point.y + sinBank * shoulderW;
    const skirtFloorY = GROUND_Y - 0.45;
    const skirtProfile = [
      { w: -outerW, y: skirtFloorY, u: 1.0 },
      { w: -shoulderW, y: shoulderLY, u: 0.35 },
      { w: -HALF_WIDTH, y: edgeLY - 0.015, u: 0.0 },
      { w: HALF_WIDTH, y: edgeRY - 0.015, u: 0.0 },
      { w: shoulderW, y: shoulderRY, u: 0.35 },
      { w: outerW, y: skirtFloorY, u: 1.0 },
    ];

    for (let s = 0; s < skirtCols; s++) {
      const sp = skirtProfile[s];
      const idx3 = (i * skirtCols + s) * 3;
      const idx2 = (i * skirtCols + s) * 2;
      skirtPositions[idx3] = frame.point.x + rightXZ.x * sp.w;
      skirtPositions[idx3 + 1] = sp.y;
      skirtPositions[idx3 + 2] = frame.point.z + rightXZ.z * sp.w;
      skirtUVs[idx2] = sp.u;
      skirtUVs[idx2 + 1] = vCoord;
    }
  }

  for (let i = 0; i < ROAD_SEGMENTS; i++) {
    const r0 = i * cols;
    const r1 = (i + 1) * cols;
    for (let c = 0; c < cols - 1; c++) {
      roadIndices.push(r0 + c, r0 + c + 1, r1 + c);
      roadIndices.push(r0 + c + 1, r1 + c + 1, r1 + c);
    }

    const s0 = i * skirtCols;
    const s1 = (i + 1) * skirtCols;
    for (let s = 0; s < 2; s++) {
      skirtIndices.push(s0 + s, s0 + s + 1, s1 + s);
      skirtIndices.push(s0 + s + 1, s1 + s + 1, s1 + s);
    }
    for (let s = 3; s < 5; s++) {
      skirtIndices.push(s0 + s, s0 + s + 1, s1 + s);
      skirtIndices.push(s0 + s + 1, s1 + s + 1, s1 + s);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.BufferAttribute(roadUVs, 2));
  roadGeo.setIndex(roadIndices);

  const asphaltMaps = createAsphaltMaps();
  asphaltMaps.map.wrapS = THREE.RepeatWrapping;
  asphaltMaps.map.wrapT = THREE.RepeatWrapping;
  asphaltMaps.roughnessMap.wrapS = THREE.RepeatWrapping;
  asphaltMaps.roughnessMap.wrapT = THREE.RepeatWrapping;
  asphaltMaps.bumpMap.wrapS = THREE.RepeatWrapping;
  asphaltMaps.bumpMap.wrapT = THREE.RepeatWrapping;

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltMaps.map,
    roughnessMap: asphaltMaps.roughnessMap,
    bumpMap: asphaltMaps.bumpMap,
    bumpScale: 0.022,
    roughness: 0.72,
    metalness: 0.08,
    envMapIntensity: 0.9,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  const skirtGeo = new THREE.BufferGeometry();
  skirtGeo.setAttribute('position', new THREE.BufferAttribute(skirtPositions, 3));
  skirtGeo.setAttribute('uv', new THREE.BufferAttribute(skirtUVs, 2));
  skirtGeo.setIndex(skirtIndices);
  skirtGeo.computeVertexNormals();

  const embMaps = createEmbankmentMaps();
  embMaps.map.wrapT = THREE.RepeatWrapping;
  embMaps.bumpMap.wrapT = THREE.RepeatWrapping;
  const skirtMat = new THREE.MeshStandardMaterial({
    map: embMaps.map,
    bumpMap: embMaps.bumpMap,
    bumpScale: 0.04,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.35,
  });
  const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
  skirtMesh.receiveShadow = true;
  scene.add(skirtMesh);

  // 3. Conformal Ramp Overlay Mesh with Glowing Chevrons & Metallic Finish
  const rampSegs = 48;
  const rampPositions = new Float32Array((rampSegs + 1) * cols * 3);
  const rampNormals = new Float32Array((rampSegs + 1) * cols * 3);
  const rampUVs = new Float32Array((rampSegs + 1) * cols * 2);
  const rampIndices = [];

  for (let i = 0; i <= rampSegs; i++) {
    const frac = i / rampSegs;
    const t = RAMP_DEF.tStart + frac * (RAMP_DEF.tEnd - RAMP_DEF.tStart);
    const frame = getTrackFrame(t);

    tanXZ.set(frame.tangent.x, 0, frame.tangent.z).normalize();
    rightXZ.crossVectors(tanXZ, WORLD_UP).normalize();
    const sinBank = Math.sin(frame.bankAngle);

    for (let c = 0; c < cols; c++) {
      const w = lateralSamples[c] * 0.94;
      const idx3 = (i * cols + c) * 3;
      const idx2 = (i * cols + c) * 2;
      rampPositions[idx3] = frame.point.x + rightXZ.x * w + frame.up.x * 0.03;
      rampPositions[idx3 + 1] = frame.point.y + sinBank * w + frame.up.y * 0.03;
      rampPositions[idx3 + 2] = frame.point.z + rightXZ.z * w + frame.up.z * 0.03;
      rampNormals[idx3] = frame.up.x;
      rampNormals[idx3 + 1] = frame.up.y;
      rampNormals[idx3 + 2] = frame.up.z;
      rampUVs[idx2] = c / (cols - 1);
      rampUVs[idx2 + 1] = frac;
    }
  }

  for (let i = 0; i < rampSegs; i++) {
    const r0 = i * cols;
    const r1 = (i + 1) * cols;
    for (let c = 0; c < cols - 1; c++) {
      rampIndices.push(r0 + c, r0 + c + 1, r1 + c);
      rampIndices.push(r0 + c + 1, r1 + c + 1, r1 + c);
    }
  }

  const rampGeo = new THREE.BufferGeometry();
  rampGeo.setAttribute('position', new THREE.BufferAttribute(rampPositions, 3));
  rampGeo.setAttribute('normal', new THREE.BufferAttribute(rampNormals, 3));
  rampGeo.setAttribute('uv', new THREE.BufferAttribute(rampUVs, 2));
  rampGeo.setIndex(rampIndices);

  const rampMaps = createRampMaps();
  const rampMat = new THREE.MeshStandardMaterial({
    map: rampMaps.map,
    bumpMap: rampMaps.bumpMap,
    bumpScale: 0.035,
    emissive: 0xff8800,
    emissiveMap: rampMaps.map,
    emissiveIntensity: 0.78,
    roughness: 0.34,
    metalness: 0.35,
    envMapIntensity: 1.15,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const rampMesh = new THREE.Mesh(rampGeo, rampMat);
  rampMesh.receiveShadow = true;
  scene.add(rampMesh);

  // Glowing Ramp Crest Beacon Pylons on both edges of tPeak
  const peakFrame = getTrackFrame(RAMP_DEF.tPeak);
  const peakTanXZ = new THREE.Vector3(peakFrame.tangent.x, 0, peakFrame.tangent.z).normalize();
  const peakRightXZ = new THREE.Vector3().crossVectors(peakTanXZ, WORLD_UP).normalize();
  const beaconLights = [];
  const pylonGeo = new THREE.CylinderGeometry(0.32, 0.44, 4.6, 12);
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0xff7b00,
    roughness: 0.32,
    metalness: 0.55,
    envMapIntensity: 1.2,
  });
  const collarGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.35, 12);
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
  const orbGeo = new THREE.SphereGeometry(0.55, 14, 12);

  for (const side of [-1, 1]) {
    const offset = side * (HALF_WIDTH + 0.85);
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.set(
      peakFrame.point.x + peakRightXZ.x * offset,
      peakFrame.point.y + 2.1,
      peakFrame.point.z + peakRightXZ.z * offset
    );
    pylon.castShadow = true;
    scene.add(pylon);

    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(pylon.position.x, pylon.position.y + 2.1, pylon.position.z);
    scene.add(collar);

    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffdd33,
      emissive: 0xff9900,
      emissiveIntensity: 1.4,
      roughness: 0.18,
      metalness: 0.1,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(pylon.position.x, pylon.position.y + 2.65, pylon.position.z);
    scene.add(orb);
    beaconLights.push(orbMat);
  }

  return { roadMesh, rampMesh, beaconLights };
}

// Materiais das 5 luzes do semáforo de largada (controladas pela contagem regressiva)
const startLightBulbs = [];

function setStartLightsState(redCount, green) {
  for (let i = 0; i < startLightBulbs.length; i++) {
    const m = startLightBulbs[i];
    if (green) {
      m.color.setHex(0x4ade80);
      m.emissive.setHex(0x22c55e);
      m.emissiveIntensity = 2.4;
    } else if (i < redCount) {
      m.color.setHex(0xff3b30);
      m.emissive.setHex(0xff1a1a);
      m.emissiveIntensity = 2.6;
    } else {
      m.color.setHex(0x1f2937);
      m.emissive.setHex(0x000000);
      m.emissiveIntensity = 0;
    }
  }
}

function buildFinishLineAndGantry(scene, startLine, getTrackFrame) {
  // Ground checkered finish strip at t = 0
  const checkGeo = new THREE.PlaneGeometry(TRACK_WIDTH - 1.2, 3.6);
  const checkMat = new THREE.MeshStandardMaterial({
    map: createCheckeredTexture(),
    roughness: 0.58,
    metalness: 0.06,
    envMapIntensity: 0.7,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const checkMesh = new THREE.Mesh(checkGeo, checkMat);
  const gX = startLine.right.clone();
  const gY = startLine.tangent.clone().normalize();
  const gZ = new THREE.Vector3(0, 1, 0);
  const stripBasis = new THREE.Matrix4().makeBasis(gX, gY, gZ);
  checkMesh.quaternion.setFromRotationMatrix(stripBasis);
  checkMesh.position.copy(startLine.position).add(new THREE.Vector3(0, 0.025, 0));
  checkMesh.receiveShadow = true;
  scene.add(checkMesh);

  // Crisp white starting grid boxes behind t = 0
  const boxMat = new THREE.MeshBasicMaterial({
    color: 0xf4f6f8,
    transparent: true,
    opacity: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const gridSlots = [
    { t: 0.984, lat: -3.4 },
    { t: 0.982, lat: 3.4 },
    { t: 0.974, lat: -3.4 },
    { t: 0.971, lat: 3.4 },
  ];
  const barWGeo = new THREE.PlaneGeometry(3.2, 0.24);
  const barSGeo = new THREE.PlaneGeometry(0.24, 1.8);

  for (const slot of gridSlots) {
    const f = getTrackFrame(slot.t);
    const fTanXZ = new THREE.Vector3(f.tangent.x, 0, f.tangent.z).normalize();
    const fRightXZ = new THREE.Vector3().crossVectors(fTanXZ, WORLD_UP).normalize();
    const slotBasis = new THREE.Matrix4().makeBasis(fRightXZ, fTanXZ, WORLD_UP);
    const slotQuat = new THREE.Quaternion().setFromRotationMatrix(slotBasis);
    const basePos = f.point.clone().addScaledVector(fRightXZ, slot.lat);
    basePos.y += 0.02;

    const frontBar = new THREE.Mesh(barWGeo, boxMat);
    frontBar.quaternion.copy(slotQuat);
    frontBar.position.copy(basePos).addScaledVector(fTanXZ, 1.5);
    scene.add(frontBar);

    for (const side of [-1.48, 1.48]) {
      const sideBar = new THREE.Mesh(barSGeo, boxMat);
      sideBar.quaternion.copy(slotQuat);
      sideBar.position.copy(basePos).addScaledVector(fRightXZ, side).addScaledVector(fTanXZ, 0.65);
      scene.add(sideBar);
    }
  }

  // Monumental Finish Gantry over t = 0 (metallic PBR structure + non-mirrored front/back signs)
  const gantryGroup = new THREE.Group();
  const pillarOffset = HALF_WIDTH + 1.5; // 10.5 units
  const pillarHeight = 8.9;
  const bannerCenterY = startLine.position.y + 7.5;
  const bannerWidth = TRACK_WIDTH + 3.4;
  const bannerHeight = 2.6;
  const bannerDepth = 0.7;

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ec,
    roughness: 0.26,
    metalness: 0.78,
    envMapIntensity: 1.35,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.34,
    metalness: 0.72,
    envMapIntensity: 1.2,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xe52521,
    roughness: 0.35,
    metalness: 0.25,
    envMapIntensity: 0.9,
  });

  // Non-mirrored exact orthonormal basis for front and back banner faces
  const tangent = startLine.tangent.clone().normalize();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const zAxisFront = tangent.clone().negate().normalize();
  const xAxisFront = new THREE.Vector3().crossVectors(tangent, yAxis).normalize();
  const frontBasis = new THREE.Matrix4().makeBasis(xAxisFront, yAxis, zAxisFront);

  const zAxisBack = tangent.clone().normalize();
  const xAxisBack = xAxisFront.clone().negate();
  const backBasis = new THREE.Matrix4().makeBasis(xAxisBack, yAxis, zAxisBack);

  for (const side of [-1, 1]) {
    const px = startLine.position.x + startLine.right.x * (side * pillarOffset);
    const pz = startLine.position.z + startLine.right.z * (side * pillarOffset);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 2.1), darkSteelMat);
    plinth.position.set(px, GROUND_Y + 0.9, pz);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    gantryGroup.add(plinth);

    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.15, pillarHeight, 1.15), steelMat);
    tower.position.set(px, startLine.position.y + pillarHeight * 0.5, pz);
    tower.castShadow = true;
    gantryGroup.add(tower);

    // Side structural truss/brace columns
    const outerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, pillarHeight, 8), darkSteelMat);
    outerCol.position.set(
      px + startLine.right.x * (side * 0.85),
      startLine.position.y + pillarHeight * 0.5,
      pz + startLine.right.z * (side * 0.85)
    );
    outerCol.castShadow = true;
    gantryGroup.add(outerCol);

    for (let ring = 1; ring <= 3; ring++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.55, 1.28), accentMat);
      band.position.set(px, startLine.position.y + ring * 2.0, pz);
      gantryGroup.add(band);
    }

    // Diagonal gusset bracket supporting the overhead beam
    const brace = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.45), darkSteelMat);
    brace.quaternion.setFromRotationMatrix(frontBasis);
    brace.rotateZ(side * 0.65);
    brace.position.set(
      px - startLine.right.x * (side * 0.9),
      bannerCenterY - bannerHeight * 0.5 - 0.55,
      pz - startLine.right.z * (side * 0.9)
    );
    gantryGroup.add(brace);
  }

  // Structural overhead beam & upper truss bar
  const beamGeo = new THREE.BoxGeometry(bannerWidth + 1.4, bannerHeight + 0.2, bannerDepth);
  const beam = new THREE.Mesh(beamGeo, darkSteelMat);
  beam.quaternion.setFromRotationMatrix(frontBasis);
  beam.position.set(startLine.position.x, bannerCenterY, startLine.position.z);
  beam.castShadow = true;
  gantryGroup.add(beam);

  const topRail = new THREE.Mesh(new THREE.BoxGeometry(bannerWidth + 2.2, 0.28, 1.15), steelMat);
  topRail.quaternion.setFromRotationMatrix(frontBasis);
  topRail.position.set(startLine.position.x, bannerCenterY + bannerHeight * 0.5 + 0.3, startLine.position.z);
  gantryGroup.add(topRail);

  const bannerTex = createGantryBannerTexture();
  const bannerMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    roughness: 0.35,
    metalness: 0.14,
    envMapIntensity: 0.85,
    emissive: 0x102050,
    emissiveIntensity: 0.28,
    side: THREE.FrontSide,
  });

  const signGeo = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
  const faceOffset = bannerDepth * 0.5 + 0.03;

  const meshFront = new THREE.Mesh(signGeo, bannerMat);
  meshFront.quaternion.setFromRotationMatrix(frontBasis);
  meshFront.position.set(
    startLine.position.x + zAxisFront.x * faceOffset,
    bannerCenterY,
    startLine.position.z + zAxisFront.z * faceOffset
  );
  gantryGroup.add(meshFront);

  const meshBack = new THREE.Mesh(signGeo, bannerMat);
  meshBack.quaternion.setFromRotationMatrix(backBasis);
  meshBack.position.set(
    startLine.position.x + zAxisBack.x * faceOffset,
    bannerCenterY,
    startLine.position.z + zAxisBack.z * faceOffset
  );
  gantryGroup.add(meshBack);

  // Detailed starting light pods suspended below the gantry beam
  const podHousing = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.92, 0.95), darkSteelMat);
  podHousing.quaternion.setFromRotationMatrix(frontBasis);
  podHousing.position.set(startLine.position.x, bannerCenterY - bannerHeight * 0.5 - 0.55, startLine.position.z);
  gantryGroup.add(podHousing);

  const bezelGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.24, 14);
  bezelGeo.rotateX(Math.PI * 0.5);
  const lightGeo = new THREE.SphereGeometry(0.23, 12, 10);
  const greenLightMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.7,
    roughness: 0.15,
  });
  for (let l = -2; l <= 2; l++) {
    const bezel = new THREE.Mesh(bezelGeo, steelMat);
    bezel.quaternion.setFromRotationMatrix(frontBasis);
    bezel.position.set(
      startLine.position.x + xAxisFront.x * (l * 1.15) + zAxisFront.x * 0.44,
      bannerCenterY - bannerHeight * 0.5 - 0.55,
      startLine.position.z + xAxisFront.z * (l * 1.15) + zAxisFront.z * 0.44
    );
    gantryGroup.add(bezel);

    const bulbMat = greenLightMat.clone();
    const bulb = new THREE.Mesh(lightGeo, bulbMat);
    startLightBulbs.push(bulbMat);
    bulb.position.set(
      startLine.position.x + xAxisFront.x * (l * 1.15) + zAxisFront.x * 0.52,
      bannerCenterY - bannerHeight * 0.5 - 0.55,
      startLine.position.z + xAxisFront.z * (l * 1.15) + zAxisFront.z * 0.52
    );
    gantryGroup.add(bulb);
  }

  scene.add(gantryGroup);
}

function getGuardRailFlare(frac) {
  // Flare outward smoothly on the first/last 6% of a guard-rail segment
  const taper = 0.06;
  if (frac < taper) {
    return 1.0 - smoothStep01(frac / taper);
  }
  if (frac > 1 - taper) {
    return 1.0 - smoothStep01((1 - frac) / taper);
  }
  return 0;
}

function getLateralBounds(t) {
  const normT = normalizeT(t);
  let minLat = -(HALF_WIDTH + 3.0);
  let maxLat = HALF_WIDTH + 3.0;
  for (let i = 0; i < RAIL_RANGES.length; i++) {
    const r = RAIL_RANGES[i];
    if (normT >= r.tStart && normT <= r.tEnd) {
      const frac = (normT - r.tStart) / Math.max(1e-6, r.tEnd - r.tStart);
      const flare = getGuardRailFlare(frac);
      // Barrier sits at HALF_WIDTH + 1.05 (+ 1.15 flare); kart half-width ~0.9 keeps chassis inside barrier
      const limit = HALF_WIDTH + 0.2 + flare * 1.15;
      if (r.side < 0) {
        minLat = Math.max(minLat, -limit);
      } else {
        maxLat = Math.min(maxLat, limit);
      }
    }
  }
  return { minLat, maxLat };
}

function buildGuardRails(scene, getTrackFrame) {
  const railMaps = createGuardRailMaps();
  const railMat = new THREE.MeshStandardMaterial({
    map: railMaps.map,
    roughnessMap: railMaps.roughnessMap,
    bumpMap: railMaps.bumpMap,
    bumpScale: 0.04,
    metalness: 0.78,
    roughness: 0.26,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
  });
  const postGeo = new THREE.BoxGeometry(0.22, 1.18, 0.22);
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.34,
    metalness: 0.72,
    envMapIntensity: 1.15,
  });

  let totalPosts = 0;
  for (const r of RAIL_RANGES) totalPosts += r.segs + 1;
  const postInst = new THREE.InstancedMesh(postGeo, postMat, totalPosts);
  const dummy = new THREE.Object3D();
  let postIdx = 0;

  const tanXZ = new THREE.Vector3();
  const rightXZ = new THREE.Vector3();

  for (const r of RAIL_RANGES) {
    const positions = new Float32Array((r.segs + 1) * 2 * 3);
    const uvs = new Float32Array((r.segs + 1) * 2 * 2);
    const indices = [];

    for (let i = 0; i <= r.segs; i++) {
      const frac = i / r.segs;
      const t = r.tStart + frac * (r.tEnd - r.tStart);
      const frame = getTrackFrame(t);

      tanXZ.set(frame.tangent.x, 0, frame.tangent.z).normalize();
      rightXZ.crossVectors(tanXZ, WORLD_UP).normalize();

      const flare = getGuardRailFlare(frac);
      const w = r.side * (HALF_WIDTH + 1.05 + flare * 1.15);
      const baseX = frame.point.x + rightXZ.x * w;
      const baseY = frame.point.y + Math.sin(frame.bankAngle) * w;
      const baseZ = frame.point.z + rightXZ.z * w;

      const idx0 = i * 2 * 3;
      const idx1 = (i * 2 + 1) * 3;
      positions[idx0] = baseX;
      positions[idx0 + 1] = baseY + 0.35;
      positions[idx0 + 2] = baseZ;

      positions[idx1] = baseX;
      positions[idx1 + 1] = baseY + 1.08;
      positions[idx1 + 2] = baseZ;

      const uv0 = i * 2 * 2;
      uvs[uv0] = frac;
      uvs[uv0 + 1] = 0;
      uvs[uv0 + 2] = frac;
      uvs[uv0 + 3] = 1;

      dummy.position.set(baseX, baseY + 0.54, baseZ);
      dummy.rotation.set(0, Math.atan2(tanXZ.x, tanXZ.z), 0);
      dummy.updateMatrix();
      postInst.setMatrixAt(postIdx++, dummy.matrix);
    }

    for (let i = 0; i < r.segs; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    railGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    railGeo.setIndex(indices);
    railGeo.computeVertexNormals();

    const railMesh = new THREE.Mesh(railGeo, railMat);
    railMesh.castShadow = true;
    scene.add(railMesh);
  }

  postInst.instanceMatrix.needsUpdate = true;
  scene.add(postInst);
}

function buildGrandstandsAndCrowd(scene, getTrackFrame) {
  const stands = [
    { pos: new THREE.Vector3(21, GROUND_Y, -2), rotY: -Math.PI * 0.5, length: 42, tiers: 5, canopyColor: 0xdc2626 },
    { pos: new THREE.Vector3(-21, GROUND_Y, -4), rotY: Math.PI * 0.5, length: 38, tiers: 5, canopyColor: 0x2563eb },
    { pos: new THREE.Vector3(-96, GROUND_Y, -2), rotY: Math.PI * 0.5, length: 34, tiers: 4, canopyColor: 0xf59e0b },
  ];

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8d99ae, roughness: 0.85, metalness: 0.05 });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.32,
    metalness: 0.68,
    envMapIntensity: 1.2,
  });
  const railMetalMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ec,
    roughness: 0.25,
    metalness: 0.78,
    envMapIntensity: 1.3,
  });
  const tierColors = [0xef4444, 0xf59e0b, 0x3b82f6, 0x10b981, 0x8b5cf6];

  const spectators = [];
  const rand = createSeededRandom(8842);

  for (const st of stands) {
    const group = new THREE.Group();
    group.position.copy(st.pos);
    group.rotation.y = st.rotY;

    const depthPerTier = 1.65;
    const heightPerTier = 1.05;
    const totalDepth = st.tiers * depthPerTier;

    const base = new THREE.Mesh(new THREE.BoxGeometry(st.length + 1.6, 0.8, totalDepth + 2.0), concreteMat);
    base.position.set(0, 0.4, 0);
    base.receiveShadow = true;
    group.add(base);

    // Front safety guardrail bar along grandstand front
    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(st.length + 0.4, 0.12, 0.12), railMetalMat);
    frontRail.position.set(0, 1.45, totalDepth * 0.5 + 0.55);
    group.add(frontRail);

    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, st.tiers * heightPerTier + 0.8, totalDepth + 1.2),
        concreteMat
      );
      sideWall.position.set(side * (st.length * 0.5 + 0.3), (st.tiers * heightPerTier) * 0.5 + 0.2, 0);
      sideWall.castShadow = true;
      group.add(sideWall);
    }

    for (let t = 0; t < st.tiers; t++) {
      const benchY = 0.9 + t * heightPerTier;
      const benchZ = (t - (st.tiers - 1) * 0.5) * depthPerTier;
      const benchMat = new THREE.MeshStandardMaterial({
        color: tierColors[t % tierColors.length],
        roughness: 0.65,
        metalness: 0.08,
      });
      const bench = new THREE.Mesh(new THREE.BoxGeometry(st.length, heightPerTier * 0.9, depthPerTier * 0.92), benchMat);
      bench.position.set(0, benchY, -benchZ);
      bench.castShadow = true;
      bench.receiveShadow = true;
      group.add(bench);

      const seats = Math.floor(st.length / 1.55);
      for (let s = 0; s < seats; s++) {
        if (rand() < 0.14) continue;
        const localX = (s - (seats - 1) * 0.5) * 1.48 + (rand() - 0.5) * 0.3;
        const localPos = new THREE.Vector3(localX, benchY + heightPerTier * 0.88, -benchZ + 0.15);
        localPos.applyAxisAngle(WORLD_UP, st.rotY).add(st.pos);
        spectators.push({
          basePos: localPos,
          phase: rand() * Math.PI * 2,
          speed: 3.5 + rand() * 3.5,
          amp: 0.12 + rand() * 0.16,
          rotY: st.rotY,
        });
      }
    }

    const roofH = st.tiers * heightPerTier + 3.4;
    for (const px of [-st.length * 0.45, 0, st.length * 0.45]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, roofH, 8), darkMetalMat);
      col.position.set(px, roofH * 0.5, -totalDepth * 0.46);
      col.castShadow = true;
      group.add(col);
    }

    const roofMat = new THREE.MeshStandardMaterial({
      color: st.canopyColor,
      roughness: 0.36,
      metalness: 0.48,
      envMapIntensity: 1.1,
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(st.length + 2.2, 0.35, totalDepth + 2.4), roofMat);
    roof.position.set(0, roofH, 0.2);
    roof.rotation.x = 0.14;
    roof.castShadow = true;
    group.add(roof);

    scene.add(group);
  }

  // Crowd InstancedMeshes (2 draw calls)
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.72, 0.38);
  const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const instMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });

  const bodyInst = new THREE.InstancedMesh(bodyGeo, instMat, spectators.length);
  const headInst = new THREE.InstancedMesh(headGeo, instMat, spectators.length);
  bodyInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  headInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const shirtPalette = [0xef4444, 0x3b82f6, 0xfacc15, 0x22c55e, 0xf97316, 0xec4899, 0x38bdf8, 0xffffff];
  const skinPalette = [0xf5cba7, 0xe0ac69, 0xc68642, 0x8d5524, 0xfad7b8];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < spectators.length; i++) {
    const sp = spectators[i];
    dummy.position.copy(sp.basePos);
    dummy.rotation.set(0, sp.rotY, 0);
    dummy.updateMatrix();
    bodyInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sp.basePos.x, sp.basePos.y + 0.52, sp.basePos.z);
    dummy.updateMatrix();
    headInst.setMatrixAt(i, dummy.matrix);

    color.setHex(shirtPalette[Math.floor(rand() * shirtPalette.length)]);
    bodyInst.setColorAt(i, color);
    color.setHex(skinPalette[Math.floor(rand() * skinPalette.length)]);
    headInst.setColorAt(i, color);
  }

  bodyInst.instanceMatrix.needsUpdate = true;
  headInst.instanceMatrix.needsUpdate = true;
  if (bodyInst.instanceColor) bodyInst.instanceColor.needsUpdate = true;
  if (headInst.instanceColor) headInst.instanceColor.needsUpdate = true;

  scene.add(bodyInst);
  scene.add(headInst);

  // Animated racing flags
  const flagSpecs = [
    { t: 0.015, side: 1, color: 0xef4444 },
    { t: 0.015, side: -1, color: 0x2563eb },
    { t: 0.985, side: 1, color: 0xfacc15 },
    { t: 0.985, side: -1, color: 0x22c55e },
    { t: 0.254, side: 1, color: 0xff8800 },
    { t: 0.254, side: -1, color: 0xff8800 },
    { t: 0.145, side: -1, color: 0xe52521 },
    { t: 0.665, side: -1, color: 0x3b82f6 },
  ];
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.8, 8);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.75,
    roughness: 0.25,
    envMapIntensity: 1.25,
  });
  const flagGeo = new THREE.PlaneGeometry(1.9, 1.1, 6, 2);
  flagGeo.translate(0.95, 0, 0);

  const flags = [];
  const tanXZ = new THREE.Vector3();
  const rightXZ = new THREE.Vector3();

  for (const fs of flagSpecs) {
    const f = getTrackFrame(fs.t);
    tanXZ.set(f.tangent.x, 0, f.tangent.z).normalize();
    rightXZ.crossVectors(tanXZ, WORLD_UP).normalize();
    const w = fs.side * (HALF_WIDTH + 2.4);
    const fx = f.point.x + rightXZ.x * w;
    const fy = f.point.y + Math.sin(f.bankAngle) * w;
    const fz = f.point.z + rightXZ.z * w;

    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(fx, fy + 2.2, fz);
    pole.castShadow = true;
    scene.add(pole);

    const flagMat = new THREE.MeshStandardMaterial({
      color: fs.color,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(fx, fy + 4.0, fz);
    flagMesh.rotation.y = Math.atan2(tanXZ.x, tanXZ.z) + Math.PI * 0.5;
    scene.add(flagMesh);
    flags.push({ mesh: flagMesh, baseRotY: flagMesh.rotation.y, phase: flags.length * 0.9 });
  }

  return { spectators, bodyInst, headInst, flags };
}

function buildStadiumFloodlights(scene) {
  const towerPositions = [
    { pos: new THREE.Vector3(28, GROUND_Y, -18), target: new THREE.Vector3(0, 1, -14) },
    { pos: new THREE.Vector3(28, GROUND_Y, 16), target: new THREE.Vector3(0, 1, 12) },
    { pos: new THREE.Vector3(-28, GROUND_Y, -18), target: new THREE.Vector3(0, 1, -14) },
    { pos: new THREE.Vector3(-28, GROUND_Y, 16), target: new THREE.Vector3(0, 1, 12) },
    { pos: new THREE.Vector3(-103, GROUND_Y, 14), target: new THREE.Vector3(-74, 2, 10) },
    { pos: new THREE.Vector3(-103, GROUND_Y, -18), target: new THREE.Vector3(-74, 2, -14) },
  ];

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.78,
    roughness: 0.28,
    envMapIntensity: 1.3,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.35,
    envMapIntensity: 1.1,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf2,
    emissive: 0xfff3c4,
    emissiveIntensity: 1.65,
    roughness: 0.15,
  });

  const baseGeo = new THREE.CylinderGeometry(0.65, 0.85, 1.4, 8);
  const mastGeo = new THREE.CylinderGeometry(0.24, 0.44, 17.5, 10);
  const armGeo = new THREE.BoxGeometry(0.28, 0.28, 2.2);
  const rackGeo = new THREE.BoxGeometry(4.4, 1.5, 0.45);
  const lampGeo = new THREE.BoxGeometry(0.95, 0.46, 0.14);

  for (const cfg of towerPositions) {
    const tower = new THREE.Group();
    tower.position.copy(cfg.pos);

    const dir = new THREE.Vector3().subVectors(cfg.target, cfg.pos);
    dir.y = 0;
    dir.normalize();
    tower.rotation.y = Math.atan2(dir.x, dir.z);

    const base = new THREE.Mesh(baseGeo, headMat);
    base.position.y = 0.7;
    tower.add(base);

    const mast = new THREE.Mesh(mastGeo, poleMat);
    mast.position.y = 8.9;
    mast.castShadow = true;
    tower.add(mast);

    const arm = new THREE.Mesh(armGeo, headMat);
    arm.position.set(0, 17.4, 0.9);
    arm.rotation.x = 0.25;
    tower.add(arm);

    const rack = new THREE.Mesh(rackGeo, headMat);
    rack.position.set(0, 17.3, 1.9);
    rack.rotation.x = 0.42;
    tower.add(rack);

    // 2x3 stadium floodlight array
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        const lamp = new THREE.Mesh(lampGeo, lensMat);
        lamp.position.set(col * 1.32, 17.3 + (row - 0.5) * 0.62, 2.15);
        lamp.rotation.x = 0.42;
        tower.add(lamp);
      }
    }

    scene.add(tower);
  }
}

function buildTracksideBanners(scene, getTrackFrame) {
  const bannerSpecs = [
    { t: 0.032, side: 1, label: 'KART ACKER', c1: '#b91c1c', c2: '#7f1d1d', accent: '#facc15' },
    { t: 0.958, side: -1, label: 'TURBO GP', c1: '#1d4ed8', c2: '#1e3a8a', accent: '#38bdf8' },
    { t: 0.155, side: -1, label: 'NITRO PRO', c1: '#0f172a', c2: '#1e293b', accent: '#f97316' },
    { t: 0.295, side: 1, label: 'TURBO GP', c1: '#15803d', c2: '#14532d', accent: '#bef264' },
    { t: 0.665, side: -1, label: 'KART ACKER', c1: '#b91c1c', c2: '#7f1d1d', accent: '#facc15' },
    { t: 0.858, side: 1, label: 'NITRO PRO', c1: '#1e1b4b', c2: '#312e81', accent: '#f43f5e' },
  ];

  const textures = new Map();
  const boardW = 8.4;
  const boardH = 2.0;
  const boardDepth = 0.24;

  const backGeo = new THREE.BoxGeometry(boardW, boardH, boardDepth);
  const faceGeo = new THREE.PlaneGeometry(boardW - 0.16, boardH - 0.16);
  const legGeo = new THREE.CylinderGeometry(0.11, 0.12, 2.4, 6);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.35,
    envMapIntensity: 1.1,
  });

  const tanXZ = new THREE.Vector3();
  const rightXZ = new THREE.Vector3();

  for (const bs of bannerSpecs) {
    const key = `${bs.label}-${bs.c1}`;
    if (!textures.has(key)) {
      textures.set(key, createSponsorBannerTexture(bs.label, bs.c1, bs.c2, bs.accent));
    }

    const f = getTrackFrame(bs.t);
    tanXZ.set(f.tangent.x, 0, f.tangent.z).normalize();
    rightXZ.crossVectors(tanXZ, WORLD_UP).normalize();

    const w = bs.side * (HALF_WIDTH + 3.6);
    const bx = f.point.x + rightXZ.x * w;
    const by = f.point.y + Math.sin(f.bankAngle) * w + 1.45;
    const bz = f.point.z + rightXZ.z * w;

    // Front face points strictly INWARD toward track centerline (non-mirrored FrontSide basis)
    const zAxis = rightXZ.clone().multiplyScalar(-bs.side).normalize();
    const yAxis = WORLD_UP;
    const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);

    const backing = new THREE.Mesh(backGeo, frameMat);
    backing.quaternion.setFromRotationMatrix(basis);
    backing.position.set(bx, by, bz);
    backing.castShadow = true;
    scene.add(backing);

    const faceMat = new THREE.MeshStandardMaterial({
      map: textures.get(key),
      roughness: 0.38,
      metalness: 0.12,
      envMapIntensity: 0.85,
      side: THREE.FrontSide,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.quaternion.setFromRotationMatrix(basis);
    face.position.set(
      bx + zAxis.x * (boardDepth * 0.5 + 0.02),
      by,
      bz + zAxis.z * (boardDepth * 0.5 + 0.02)
    );
    scene.add(face);

    for (const lx of [-3.2, 3.2]) {
      const leg = new THREE.Mesh(legGeo, frameMat);
      leg.position.set(
        bx + xAxis.x * lx - zAxis.x * 0.05,
        by - 0.9,
        bz + xAxis.z * lx - zAxis.z * 0.05
      );
      scene.add(leg);
    }
  }
}

function buildTreesAndShrubs(scene, lutX, lutZ) {
  const rand = createSeededRandom(2026);
  const pinePositions = [];
  const roundPositions = [];
  const shrubPositions = [];

  const isClearOfTrack = (x, z, minDist) => {
    const minDistSq = minDist * minDist;
    for (let i = 0; i < LUT_SIZE; i++) {
      const dx = x - lutX[i];
      const dz = z - lutZ[i];
      if (dx * dx + dz * dz < minDistSq) return false;
    }
    return true;
  };

  const isClearOfStands = (x, z) => {
    if (Math.abs(x) < 34 && Math.abs(z) < 32) return false;
    if (x < -82 && x > -114 && Math.abs(z) < 28) return false;
    return true;
  };

  const isClearOfTrackAndStands = (x, z) => {
    if (!isClearOfTrack(x, z, 19.5)) return false;
    if (!isClearOfStands(x, z)) return false;
    const checkList = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        const dx = x - arr[i].x;
        const dz = z - arr[i].z;
        if (dx * dx + dz * dz < 8.0 * 8.0) return false;
      }
      return true;
    };
    return checkList(pinePositions) && checkList(roundPositions);
  };

  let attempts = 0;
  const targetPines = 65;
  const targetRounds = 60;

  while ((pinePositions.length < targetPines || roundPositions.length < targetRounds) && attempts < 6500) {
    attempts++;
    const x = -146 + rand() * 292;
    const z = -164 + rand() * 292;
    if (!isClearOfTrackAndStands(x, z)) continue;

    const entry = {
      x,
      z,
      scale: 0.85 + rand() * 0.62,
      rotY: rand() * Math.PI * 2,
      hueShift: (rand() - 0.5) * 0.055,
    };

    if (pinePositions.length < targetPines && (roundPositions.length >= targetRounds || rand() < 0.52)) {
      pinePositions.push(entry);
    } else if (roundPositions.length < targetRounds) {
      roundPositions.push(entry);
    }
  }

  // Place ~72 low shrubs near tree bases and grandstand flanks (keeping >= 17.5 from track center)
  const targetShrubs = 72;
  const allTrees = [...pinePositions, ...roundPositions];
  const standFlanks = [
    { x: 23, z: -24 }, { x: 23, z: 20 }, { x: -23, z: -24 }, { x: -23, z: 18 },
    { x: -97, z: -21 }, { x: -97, z: 17 },
  ];
  for (const sf of standFlanks) {
    for (let k = 0; k < 3 && shrubPositions.length < targetShrubs; k++) {
      const sx = sf.x + (rand() - 0.5) * 5.0;
      const sz = sf.z + (rand() - 0.5) * 4.0;
      if (isClearOfTrack(sx, sz, 17.5)) {
        shrubPositions.push({
          x: sx,
          z: sz,
          scale: 0.65 + rand() * 0.45,
          rotY: rand() * Math.PI * 2,
          hueShift: (rand() - 0.5) * 0.06,
        });
      }
    }
  }
  for (let i = 0; i < allTrees.length && shrubPositions.length < targetShrubs; i++) {
    const tr = allTrees[i];
    const ang = rand() * Math.PI * 2;
    const dist = 2.0 + rand() * 1.8;
    const sx = tr.x + Math.cos(ang) * dist;
    const sz = tr.z + Math.sin(ang) * dist;
    if (isClearOfTrack(sx, sz, 17.5) && isClearOfStands(sx, sz)) {
      shrubPositions.push({
        x: sx,
        z: sz,
        scale: 0.65 + rand() * 0.55,
        rotY: rand() * Math.PI * 2,
        hueShift: (rand() - 0.5) * 0.06,
      });
    }
  }

  const barkMaps = createBarkMaps();
  const foliageMaps = createFoliageMaps();

  const barkMat = new THREE.MeshStandardMaterial({
    map: barkMaps.map,
    bumpMap: barkMaps.bumpMap,
    bumpScale: 0.07,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.3,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: foliageMaps.map,
    bumpMap: foliageMaps.bumpMap,
    bumpScale: 0.06,
    vertexColors: true,
    roughness: 0.84,
    metalness: 0.0,
    envMapIntensity: 0.45,
  });

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // --- Species 1: Realistic 4-tier Organic Pines (2 draw calls: trunk + merged 4-tier canopy) ---
  const pineTrunkGeo = new THREE.CylinderGeometry(0.20, 0.44, 3.2, 8);
  pineTrunkGeo.translate(0, 1.6, 0);

  const pineTiers = [
    { r: 2.35, h: 2.8, y: 2.75, phase: 0.3, aoLow: 0.48, aoHigh: 0.88 },
    { r: 1.92, h: 2.5, y: 4.15, phase: 1.7, aoLow: 0.56, aoHigh: 0.94 },
    { r: 1.44, h: 2.2, y: 5.45, phase: 3.1, aoLow: 0.65, aoHigh: 0.98 },
    { r: 0.92, h: 1.9, y: 6.65, phase: 4.5, aoLow: 0.74, aoHigh: 1.05 },
  ];
  const pineParts = pineTiers.map((tier) => {
    const g = new THREE.ConeGeometry(tier.r, tier.h, 11, 3);
    deformOrganicGeometry(g, 0.24, 0.22, tier.phase);
    g.translate(0, tier.y, 0);
    return { geo: g, aoLow: tier.aoLow, aoHigh: tier.aoHigh };
  });
  const pineCanopyGeo = mergeColoredGeometries(pineParts);
  pineParts.forEach((p) => p.geo.dispose());

  const pTrunks = new THREE.InstancedMesh(pineTrunkGeo, barkMat, pinePositions.length);
  const pCanopies = new THREE.InstancedMesh(pineCanopyGeo, foliageMat, pinePositions.length);
  pTrunks.castShadow = true;
  pCanopies.castShadow = true;

  for (let i = 0; i < pinePositions.length; i++) {
    const t = pinePositions[i];
    const s = t.scale;
    dummy.position.set(t.x, GROUND_Y, t.z);
    dummy.rotation.set(0, t.rotY, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    pTrunks.setMatrixAt(i, dummy.matrix);
    pCanopies.setMatrixAt(i, dummy.matrix);

    color.setHSL(0.35 + t.hueShift, 0.48, 0.30 + (rand() - 0.5) * 0.05);
    pCanopies.setColorAt(i, color);
  }
  pTrunks.instanceMatrix.needsUpdate = true;
  pCanopies.instanceMatrix.needsUpdate = true;
  if (pCanopies.instanceColor) pCanopies.instanceColor.needsUpdate = true;
  scene.add(pTrunks);
  scene.add(pCanopies);

  // --- Species 2: Broadleaf Trees with Multi-Tuft Canopy (2 draw calls: trunk+branches + canopy) ---
  const mainTrunk = new THREE.CylinderGeometry(0.28, 0.52, 3.4, 8);
  mainTrunk.translate(0, 1.7, 0);
  const branchL = new THREE.CylinderGeometry(0.11, 0.22, 1.9, 6);
  branchL.rotateZ(0.48);
  branchL.translate(-0.55, 3.1, 0.15);
  const branchR = new THREE.CylinderGeometry(0.11, 0.20, 1.8, 6);
  branchR.rotateZ(-0.44);
  branchR.rotateY(1.1);
  branchR.translate(0.45, 3.05, -0.35);

  const broadTrunkGeo = mergeColoredGeometries([
    { geo: mainTrunk, aoLow: 0.72, aoHigh: 1.0 },
    { geo: branchL, aoLow: 0.75, aoHigh: 0.95 },
    { geo: branchR, aoLow: 0.75, aoHigh: 0.95 },
  ]);
  mainTrunk.dispose();
  branchL.dispose();
  branchR.dispose();

  const canopyTufts = [
    { r: 1.75, x: 0.0, y: 4.1, z: 0.0, sx: 1.12, sy: 0.92, sz: 1.08, phase: 0.5, aoLow: 0.50, aoHigh: 0.92 },
    { r: 1.38, x: -1.1, y: 3.85, z: 0.55, sx: 1.05, sy: 0.88, sz: 1.0, phase: 1.8, aoLow: 0.56, aoHigh: 0.96 },
    { r: 1.32, x: 1.05, y: 3.95, z: -0.5, sx: 1.0, sy: 0.90, sz: 1.08, phase: 2.9, aoLow: 0.58, aoHigh: 0.98 },
    { r: 1.24, x: 0.2, y: 4.45, z: 1.05, sx: 1.02, sy: 0.86, sz: 0.96, phase: 4.1, aoLow: 0.62, aoHigh: 1.00 },
    { r: 1.35, x: -0.1, y: 5.25, z: -0.15, sx: 1.08, sy: 0.88, sz: 1.02, phase: 5.3, aoLow: 0.72, aoHigh: 1.06 },
  ];
  const broadParts = canopyTufts.map((tuft) => {
    const g = new THREE.IcosahedronGeometry(tuft.r, 2);
    deformOrganicGeometry(g, 0.14, 0.16, tuft.phase);
    g.scale(tuft.sx, tuft.sy, tuft.sz);
    g.translate(tuft.x, tuft.y, tuft.z);
    return { geo: g, aoLow: tuft.aoLow, aoHigh: tuft.aoHigh };
  });
  const broadCanopyGeo = mergeColoredGeometries(broadParts);
  broadParts.forEach((p) => p.geo.dispose());

  const rTrunks = new THREE.InstancedMesh(broadTrunkGeo, barkMat, roundPositions.length);
  const rCanopies = new THREE.InstancedMesh(broadCanopyGeo, foliageMat, roundPositions.length);
  rTrunks.castShadow = true;
  rCanopies.castShadow = true;

  for (let i = 0; i < roundPositions.length; i++) {
    const t = roundPositions[i];
    const s = t.scale;
    dummy.position.set(t.x, GROUND_Y, t.z);
    dummy.rotation.set(0, t.rotY, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    rTrunks.setMatrixAt(i, dummy.matrix);
    rCanopies.setMatrixAt(i, dummy.matrix);

    const tone = rand();
    if (tone < 0.35) {
      color.setHSL(0.29 + t.hueShift, 0.52, 0.38); // Emerald green
    } else if (tone < 0.7) {
      color.setHSL(0.24 + t.hueShift, 0.46, 0.36); // Warm olive green
    } else {
      color.setHSL(0.26 + t.hueShift, 0.58, 0.44); // Sunlit leaf green
    }
    rCanopies.setColorAt(i, color);
  }
  rTrunks.instanceMatrix.needsUpdate = true;
  rCanopies.instanceMatrix.needsUpdate = true;
  if (rCanopies.instanceColor) rCanopies.instanceColor.needsUpdate = true;
  scene.add(rTrunks);
  scene.add(rCanopies);

  // --- Species 3: Low Multi-Tuft Shrubs (1 draw call) ---
  const shrubTufts = [
    { r: 0.72, x: 0.0, y: 0.45, z: 0.0, phase: 0.4, aoLow: 0.52, aoHigh: 0.96 },
    { r: 0.56, x: 0.55, y: 0.35, z: 0.25, phase: 1.9, aoLow: 0.55, aoHigh: 0.98 },
    { r: 0.52, x: -0.48, y: 0.34, z: -0.28, phase: 3.4, aoLow: 0.55, aoHigh: 0.98 },
  ];
  const shrubParts = shrubTufts.map((tuft) => {
    const g = new THREE.IcosahedronGeometry(tuft.r, 1);
    deformOrganicGeometry(g, 0.16, 0.12, tuft.phase);
    g.scale(1.15, 0.78, 1.1);
    g.translate(tuft.x, tuft.y, tuft.z);
    return { geo: g, aoLow: tuft.aoLow, aoHigh: tuft.aoHigh };
  });
  const shrubGeo = mergeColoredGeometries(shrubParts);
  shrubParts.forEach((p) => p.geo.dispose());

  const shrubInst = new THREE.InstancedMesh(shrubGeo, foliageMat, shrubPositions.length);
  shrubInst.receiveShadow = true;
  for (let i = 0; i < shrubPositions.length; i++) {
    const sh = shrubPositions[i];
    dummy.position.set(sh.x, GROUND_Y, sh.z);
    dummy.rotation.set(0, sh.rotY, 0);
    dummy.scale.set(sh.scale, sh.scale, sh.scale);
    dummy.updateMatrix();
    shrubInst.setMatrixAt(i, dummy.matrix);

    color.setHSL(0.28 + sh.hueShift, 0.48, 0.36 + rand() * 0.08);
    shrubInst.setColorAt(i, color);
  }
  shrubInst.instanceMatrix.needsUpdate = true;
  if (shrubInst.instanceColor) shrubInst.instanceColor.needsUpdate = true;
  scene.add(shrubInst);
}

/**
 * Builds the 3D closed kart circuit, PBR textures, ramp, banked turns, finish gantry,
 * scenery, and fast track spatial queries.
 * @param {THREE.Scene} scene
 */
export function createTrackSystem(scene) {
  const controlPoints = RAW_CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const spline = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
  spline.arcLengthDivisions = 1024;
  const totalLength = spline.getLength();

  // Precompute LUT for fast closest-point queries & tree clearance checks
  const lutX = new Float64Array(LUT_SIZE);
  const lutZ = new Float64Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    const pt = spline.getPointAt(i / LUT_SIZE);
    lutX[i] = pt.x;
    lutZ[i] = pt.z;
  }

  function getTrackFrame(t) {
    const tNorm = normalizeT(t);
    const basePoint = spline.getPointAt(tNorm);
    const baseTangent = spline.getTangentAt(tNorm);
    const ramp = evalRampProfile(tNorm, totalLength);
    const bankAngle = evalBankAngle(tNorm);

    const point = new THREE.Vector3(basePoint.x, basePoint.y + ramp.offsetY, basePoint.z);

    const tanXZ = new THREE.Vector3(baseTangent.x, 0, baseTangent.z);
    if (tanXZ.lengthSq() < 1e-8) tanXZ.set(0, 0, 1);
    tanXZ.normalize();

    const rightXZ = new THREE.Vector3().crossVectors(tanXZ, WORLD_UP).normalize();
    const tangent = new THREE.Vector3(
      baseTangent.x,
      baseTangent.y + ramp.rawDerivDs,
      baseTangent.z
    ).normalize();

    const up0 = new THREE.Vector3().crossVectors(rightXZ, tangent).normalize();
    const right = new THREE.Vector3()
      .copy(rightXZ)
      .addScaledVector(up0, Math.sin(bankAngle))
      .normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();

    return {
      point,
      tangent,
      right,
      up,
      bankAngle,
      height: point.y,
      isRamp: ramp.isRamp,
      rampSlope: ramp.slope,
    };
  }

  const _tmpP = new THREE.Vector3();
  const _tmpTanXZ = new THREE.Vector3();
  const _tmpRightXZ = new THREE.Vector3();

  function getClosestPointInfo(x, z, hintT) {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (typeof hintT === 'number' && Number.isFinite(hintT)) {
      const centerIdx = Math.round(normalizeT(hintT) * LUT_SIZE) % LUT_SIZE;
      const windowRadius = 42;
      for (let offset = -windowRadius; offset <= windowRadius; offset++) {
        const idx = (centerIdx + offset + LUT_SIZE) % LUT_SIZE;
        const dx = x - lutX[idx];
        const dz = z - lutZ[idx];
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }

    // Fallback to global search if no hintT or point is far from local window
    if (bestDistSq > 16 * 16) {
      bestDistSq = Infinity;
      for (let idx = 0; idx < LUT_SIZE; idx++) {
        const dx = x - lutX[idx];
        const dz = z - lutZ[idx];
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }

    // Continuous golden-section refinement around best LUT sample in XZ
    const phi = 0.6180339887498949;
    const span = 1.25 / LUT_SIZE;
    let a = bestIdx / LUT_SIZE - span;
    let b = bestIdx / LUT_SIZE + span;
    let c = b - phi * (b - a);
    let d = a + phi * (b - a);

    const distSqAt = (rawT) => {
      spline.getPointAt(normalizeT(rawT), _tmpP);
      const dx = x - _tmpP.x;
      const dz = z - _tmpP.z;
      return dx * dx + dz * dz;
    };

    let fc = distSqAt(c);
    let fd = distSqAt(d);
    for (let iter = 0; iter < 10; iter++) {
      if (fc < fd) {
        b = d;
        d = c;
        fd = fc;
        c = b - phi * (b - a);
        fc = distSqAt(c);
      } else {
        a = c;
        c = d;
        fc = fd;
        d = a + phi * (b - a);
        fd = distSqAt(d);
      }
    }
    const t = normalizeT((a + b) * 0.5);

    const frame = getTrackFrame(t);
    _tmpTanXZ.set(frame.tangent.x, 0, frame.tangent.z);
    if (_tmpTanXZ.lengthSq() < 1e-8) _tmpTanXZ.set(0, 0, 1);
    _tmpTanXZ.normalize();
    _tmpRightXZ.crossVectors(_tmpTanXZ, WORLD_UP).normalize();

    const lateralOffset = (x - frame.point.x) * _tmpRightXZ.x + (z - frame.point.z) * _tmpRightXZ.z;
    const surfaceHeight = frame.point.y + Math.sin(frame.bankAngle) * lateralOffset;
    const distanceFromCenter = Math.abs(lateralOffset);
    const onRoad = distanceFromCenter <= HALF_WIDTH;

    return {
      t,
      point: frame.point,
      tangent: frame.tangent,
      right: frame.right,
      up: frame.up,
      lateralOffset,
      bankAngle: frame.bankAngle,
      surfaceHeight,
      onRoad,
      onOffroad: !onRoad,
      isRamp: frame.isRamp,
      rampSlope: frame.rampSlope,
      distanceFromCenter,
    };
  }

  const startFrame = getTrackFrame(0);
  const startTanXZ = new THREE.Vector3(startFrame.tangent.x, 0, startFrame.tangent.z).normalize();
  const startRight = new THREE.Vector3().crossVectors(startTanXZ, WORLD_UP).normalize();
  const startLine = {
    position: startFrame.point.clone(),
    tangent: startFrame.tangent.clone(),
    right: startRight,
    t: 0,
  };

  const rampMidT = (RAMP_DEF.tStart + RAMP_DEF.tPeak) * 0.5;
  const rampMidFrame = getTrackFrame(rampMidT);
  const ramps = [
    {
      tStart: RAMP_DEF.tStart,
      tPeak: RAMP_DEF.tPeak,
      tEnd: RAMP_DEF.tEnd,
      height: RAMP_DEF.height,
      position: rampMidFrame.point.clone(),
      tangent: rampMidFrame.tangent.clone().normalize(),
    },
  ];

  function getSpawnTransforms(count = 4) {
    const transforms = [];
    const baseSlots = [
      { t: 0.984, lat: -3.4 },
      { t: 0.982, lat: 3.4 },
      { t: 0.974, lat: -3.4 },
      { t: 0.971, lat: 3.4 },
    ];
    const tanXZ = new THREE.Vector3();
    const rightXZ = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      let t;
      let lat;
      if (i < baseSlots.length) {
        t = baseSlots[i].t;
        lat = baseSlots[i].lat;
      } else {
        const row = Math.floor(i / 2);
        const col = i % 2;
        t = normalizeT(0.984 - row * 0.01 - col * 0.002);
        lat = col === 0 ? -3.4 : 3.4;
      }

      const frame = getTrackFrame(t);
      tanXZ.set(frame.tangent.x, 0, frame.tangent.z).normalize();
      rightXZ.crossVectors(tanXZ, WORLD_UP).normalize();

      const surfaceHeight = frame.point.y + Math.sin(frame.bankAngle) * lat;
      const position = new THREE.Vector3(
        frame.point.x + rightXZ.x * lat,
        surfaceHeight,
        frame.point.z + rightXZ.z * lat
      );
      const heading = Math.atan2(frame.tangent.x, frame.tangent.z);
      transforms.push({ position, heading, t });
    }
    return transforms;
  }

  // Build 3D world & scenery into scene
  const clouds = buildSkyAndClouds(scene);
  buildGroundAndMountains(scene);
  const { beaconLights } = buildTrackMeshes(scene, getTrackFrame, totalLength);
  buildFinishLineAndGantry(scene, startLine, getTrackFrame);
  buildGuardRails(scene, getTrackFrame);
  const { spectators, bodyInst, headInst, flags } = buildGrandstandsAndCrowd(scene, getTrackFrame);
  buildStadiumFloodlights(scene);
  buildTracksideBanners(scene, getTrackFrame);
  buildTreesAndShrubs(scene, lutX, lutZ);

  const animDummy = new THREE.Object3D();

  function update(dt, elapsed = 0) {
    // Animate drifting clouds
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const a = c.angle + elapsed * c.angularSpeed;
      c.group.position.set(
        Math.cos(a) * c.radius,
        c.baseY + Math.sin(elapsed * 0.35 + c.bobPhase) * 1.1,
        Math.sin(a) * c.radius
      );
      c.group.rotation.y = -a;
    }

    // Animate cheering crowd
    if (spectators.length > 0) {
      for (let i = 0; i < spectators.length; i++) {
        const sp = spectators[i];
        const hop = Math.abs(Math.sin(elapsed * sp.speed + sp.phase)) * sp.amp;
        animDummy.rotation.set(0, sp.rotY, 0);
        animDummy.position.set(sp.basePos.x, sp.basePos.y + hop, sp.basePos.z);
        animDummy.updateMatrix();
        bodyInst.setMatrixAt(i, animDummy.matrix);

        animDummy.position.set(sp.basePos.x, sp.basePos.y + 0.52 + hop * 1.15, sp.basePos.z);
        animDummy.updateMatrix();
        headInst.setMatrixAt(i, animDummy.matrix);
      }
      bodyInst.instanceMatrix.needsUpdate = true;
      headInst.instanceMatrix.needsUpdate = true;
    }

    // Animate waving racing flags
    for (let i = 0; i < flags.length; i++) {
      const f = flags[i];
      f.mesh.rotation.y = f.baseRotY + Math.sin(elapsed * 4.5 + f.phase) * 0.22;
      f.mesh.rotation.z = Math.sin(elapsed * 6.0 + f.phase) * 0.05;
    }

    // Pulse ramp beacon lights
    const pulse = 1.0 + 0.75 * Math.sin(elapsed * 5.0);
    for (let i = 0; i < beaconLights.length; i++) {
      beaconLights[i].emissiveIntensity = pulse;
    }
  }

  return {
    trackWidth: TRACK_WIDTH,
    totalLength,
    spline,
    ramps,
    startLine,
    getTrackFrame,
    getClosestPointInfo,
    getLateralBounds,
    getSpawnTransforms,
    setStartLights: setStartLightsState,
    update,
  };
}
