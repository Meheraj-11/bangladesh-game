import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Hand-painted authentic Bangladeshi Bengali signboard texture
 */
export function createBengaliSignTexture(opts: {
  bg: string;
  border: string;
  title: string;
  subtitle?: string;
  titleColor?: string;
  subtitleColor?: string;
  accentBar?: string;
  width?: number;
  height?: number;
}): THREE.CanvasTexture {
  const w = opts.width ?? 512;
  const h = opts.height ?? 192;
  const [canvas, ctx] = makeCanvas(w, h);

  // Base painted metal background with slight weathering
  ctx.fillStyle = opts.bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal weathered tint
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,255,255,0.12)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Decorative Bangladeshi signboard double border
  ctx.strokeStyle = opts.border;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  if (opts.accentBar) {
    ctx.fillStyle = opts.accentBar;
    ctx.fillRect(18, h - 54, w - 36, 36);
  }

  // Main Bengali title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${opts.subtitle ? 44 : 48}px "Hind Siliguri", "Nirmala UI", sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText(opts.title, w / 2 + 2, opts.subtitle ? h * 0.39 + 2 : h / 2 + 2);
  ctx.fillStyle = opts.titleColor ?? '#fef08a';
  ctx.fillText(opts.title, w / 2, opts.subtitle ? h * 0.39 : h / 2);

  if (opts.subtitle) {
    ctx.font = '600 24px "Hind Siliguri", "Nirmala UI", sans-serif';
    ctx.fillStyle = opts.subtitleColor ?? '#ffffff';
    ctx.fillText(opts.subtitle, w / 2, opts.accentBar ? h - 36 : h * 0.72);
  }

  // Corner screw dots
  ctx.fillStyle = '#334155';
  for (const [cx, cy] of [
    [28, 28],
    [w - 28, 28],
    [28, h - 28],
    [w - 28, h - 28]
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Weathered Bangladeshi asphalt road with subtle cracks and warm dust edges
 */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#363b40';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 42 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Dusty curb strips on top and bottom edges
  const topGrad = ctx.createLinearGradient(0, 0, 0, 28);
  topGrad.addColorStop(0, 'rgba(138, 120, 96, 0.55)');
  topGrad.addColorStop(1, 'rgba(138, 120, 96, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, 256, 28);

  const botGrad = ctx.createLinearGradient(0, 228, 0, 256);
  botGrad.addColorStop(0, 'rgba(138, 120, 96, 0)');
  botGrad.addColorStop(1, 'rgba(138, 120, 96, 0.55)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, 228, 256, 28);

  // Subtle center worn dashed line
  ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
  ctx.fillRect(36, 124, 68, 7);
  ctx.fillRect(156, 124, 68, 7);

  return finalizeTexture(canvas, 8, 1);
}

/**
 * Reddish Bangladeshi herringbone brick alley (ইটের গলি)
 */
export function createBrickLaneTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#7c6f64';
  ctx.fillRect(0, 0, 256, 256);

  const bw = 32;
  const bh = 16;
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 9; col++) {
      const offset = (row % 2) * (bw / 2);
      const x = col * bw - offset;
      const y = row * bh;
      const r = 148 + Math.floor(Math.random() * 28);
      const g = 78 + Math.floor(Math.random() * 20);
      const b = 60 + Math.floor(Math.random() * 18);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    }
  }
  return finalizeTexture(canvas, 2, 4);
}

/**
 * Weathered plastered Bangladeshi wall (optional turquoise dado for mess interior)
 */
export function createPlasterWallTexture(
  baseHex: string,
  dadoHex?: string
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle plaster grain & tropical humidity patina near bottom
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle =
      Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  if (dadoHex) {
    ctx.fillStyle = dadoHex;
    ctx.fillRect(0, 152, 256, 104);
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(0, 148, 256, 6);
  } else {
    const damp = ctx.createLinearGradient(0, 195, 0, 256);
    damp.addColorStop(0, 'rgba(55, 65, 55, 0)');
    damp.addColorStop(1, 'rgba(45, 58, 48, 0.38)');
    ctx.fillStyle = damp;
    ctx.fillRect(0, 195, 256, 61);
  }

  return finalizeTexture(canvas, 1, 1);
}

/**
 * Traditional Bangladeshi speckled mosaic / cement mess room floor
 */
export function createMosaicFloorTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#b9c0b8';
  ctx.fillRect(0, 0, 256, 256);

  // Tile grid
  ctx.strokeStyle = 'rgba(70, 78, 72, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  // Terrazzo / mosaic chips
  const chips = ['#64748b', '#e2e8f0', '#475569', '#0f766e', '#94a3b8'];
  for (let i = 0; i < 480; i++) {
    ctx.fillStyle = chips[i % chips.length];
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
  }

  return finalizeTexture(canvas, 3, 3);
}

/**
 * Corrugated tin sheet (ঢেউটিন) for Tong Dokan roof & accents
 */
export function createCorrugatedTinTexture(tint = '#3b6ea5'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, 256, 128);

  for (let x = 0; x < 256; x += 16) {
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.28)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 16, 128);
  }

  // Slight rust patches
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = 'rgba(120, 53, 15, 0.16)';
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 128, 6 + Math.random() * 14, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(canvas, 2, 1);
}

/**
 * Colorful Bangladeshi Nakshi Katha / patterned bedsheet
 */
export function createKathaBedsheetTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(0, 0, 256, 256);

  // Decorative stripes & diamond motifs
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 24, 256, 14);
  ctx.fillRect(0, 218, 256, 14);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 42, 256, 6);
  ctx.fillRect(0, 208, 256, 6);

  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  for (let y = 76; y <= 180; y += 34) {
    for (let x = 24; x <= 232; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 10, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  return finalizeTexture(canvas, 1, 1);
}

/**
 * Grass & tropical soil ground texture
 */
export function createTropicalGrassTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#3a6636';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const pick = Math.random();
    if (pick < 0.45) ctx.fillStyle = '#477a3f';
    else if (pick < 0.8) ctx.fillStyle = '#2f572c';
    else ctx.fillStyle = '#5c6b39';
    ctx.fillRect(x, y, 3, 3);
  }
  return finalizeTexture(canvas, 14, 14);
}
