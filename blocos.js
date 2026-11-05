// Ruído, blocos e atlas de texturas 32×32 (pixel art original, gerada no código).
import * as THREE from 'three';

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- ruído ----------
let SEED = 20261105;
export function setSeed(s) { SEED = s | 0; }
export function hash3(x, y, z, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul((SEED + s) | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
export const hash2 = (x, z, s) => hash3(x, 0, z, s);
const sm = (t) => t * t * (3 - 2 * t);
export function vnoise2(x, z, s) { const xi = Math.floor(x), zi = Math.floor(z), u = sm(x - xi), v = sm(z - zi); const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; }
export function fbm2(x, z, s, o) { let sum = 0, amp = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { sum += vnoise2(x * f, z * f, s + i * 31) * amp; n += amp; amp *= .5; f *= 2.03; } return sum / n; }
export function vnoise3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = sm(x - xi), v = sm(y - yi), w = sm(z - zi);
  const c000 = hash3(xi, yi, zi, s), c100 = hash3(xi + 1, yi, zi, s), c010 = hash3(xi, yi + 1, zi, s), c110 = hash3(xi + 1, yi + 1, zi, s), c001 = hash3(xi, yi, zi + 1, s), c101 = hash3(xi + 1, yi, zi + 1, s), c011 = hash3(xi, yi + 1, zi + 1, s), c111 = hash3(xi + 1, yi + 1, zi + 1, s);
  return lerp(lerp(lerp(c000, c100, u), lerp(c010, c110, u), v), lerp(lerp(c001, c101, u), lerp(c011, c111, u), v), w) * 2 - 1;
}
export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- blocos ----------
export const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, LOG: 6, LEAVES: 7, PLANKS: 8, COBBLE: 9, GLASS: 10, SNOWGRASS: 11, BRICK: 12, ROOF: 13, PATH: 14, LAMP: 15, CACTUS: 16, BEDROCK: 17, HAY: 18, FARM: 19, COAL: 20, PLASTER: 21, SNOW: 22, CROP: 23, FLOWER_R: 24, FLOWER_Y: 25, TALLGRASS: 26, PINE: 27, TABLE: 28, FURNACE: 29, CHEST: 30,
  IRON_ORE: 31, GOLD_ORE: 32, DIAMOND_ORE: 33, WOOL: 34, TNT: 35, ICE: 36, BED: 37, TEIA: 38 };
export const BD = [];
function def(id, name, top, side, bot, o = {}) { BD[id] = { id, name, tiles: [top, side == null ? top : side, bot == null ? top : bot], plant: !!o.plant, liquid: !!o.liquid, transp: !!o.transp, light: !!o.light, hard: o.hard ?? 1, tool: o.tool || null, tier: o.tier || 0, drop: o.drop }; }
def(0, 'Ar', 31);
def(1, 'Grama', 0, 1, 2, { hard: .6, tool: 'pa', drop: 2 }); def(2, 'Terra', 2, 2, 2, { hard: .5, tool: 'pa' }); def(3, 'Pedra', 3, 3, 3, { hard: 1.5, tool: 'pic', tier: 1, drop: 9 });
def(4, 'Areia', 4, 4, 4, { hard: .5, tool: 'pa' }); def(5, 'Água', 5, 5, 5, { liquid: 1, hard: Infinity });
def(6, 'Tronco', 7, 6, 7, { hard: 2, tool: 'mac' }); def(7, 'Folhas', 8, 8, 8, { transp: 1, hard: .2, drop: 'folha' }); def(8, 'Tábuas', 9, 9, 9, { hard: 2, tool: 'mac' });
def(9, 'Pedregulho', 10, 10, 10, { hard: 2, tool: 'pic', tier: 1 }); def(10, 'Vidro', 11, 11, 11, { transp: 1, hard: .3, drop: 0 });
def(11, 'Grama nevada', 12, 13, 2, { hard: .6, tool: 'pa', drop: 2 }); def(12, 'Tijolos', 14, 14, 14, { hard: 2, tool: 'pic', tier: 1 }); def(13, 'Telhado', 15, 15, 15, { hard: 1.5, tool: 'pic', tier: 1 });
def(14, 'Caminho', 16, 16, 16, { hard: .6, tool: 'pa', drop: 2 }); def(15, 'Lanterna', 17, 17, 17, { light: 1, hard: .3 }); def(16, 'Cacto', 19, 18, 19, { hard: .4 });
def(17, 'Rocha-base', 20, 20, 20, { hard: Infinity }); def(18, 'Feno', 22, 21, 22, { hard: .5 }); def(19, 'Terra arada', 23, 2, 2, { hard: .6, tool: 'pa', drop: 2 });
def(20, 'Minério de carvão', 24, 24, 24, { hard: 3, tool: 'pic', tier: 1, drop: 101 }); def(21, 'Reboco', 25, 25, 25, { hard: 1.5, tool: 'pic', tier: 1 }); def(22, 'Neve', 12, 12, 12, { hard: .2, tool: 'pa' });
def(23, 'Trigo', 31, 26, 31, { plant: 1, hard: 0, drop: 102 }); def(24, 'Flor vermelha', 31, 27, 31, { plant: 1, hard: 0 }); def(25, 'Flor amarela', 31, 28, 31, { plant: 1, hard: 0 });
def(26, 'Capim', 31, 29, 31, { plant: 1, hard: 0, drop: 'capim' }); def(27, 'Folhas de pinheiro', 30, 30, 30, { transp: 1, hard: .2, drop: 'folha' });
def(28, 'Bancada', 32, 33, 9, { hard: 2.5, tool: 'mac' }); def(29, 'Fornalha', 35, 34, 35, { hard: 3.5, tool: 'pic', tier: 1 }); def(30, 'Baú', 37, 36, 37, { hard: 2.5, tool: 'mac' });
def(31, 'Minério de ferro', 38, 38, 38, { hard: 3, tool: 'pic', tier: 2 }); def(32, 'Minério de ouro', 39, 39, 39, { hard: 3, tool: 'pic', tier: 3 });
def(33, 'Minério de diamante', 40, 40, 40, { hard: 3, tool: 'pic', tier: 3, drop: 105 }); def(34, 'Lã', 41, 41, 41, { hard: .8 });
def(35, 'Dinamite', 43, 42, 43, { hard: 0 }); def(36, 'Gelo', 44, 44, 44, { hard: .5, tool: 'pic', drop: 0 }); def(37, 'Cama', 45, 46, 9, { hard: .3 });
def(38, 'Teia', 31, 47, 31, { plant: 1, hard: .4, drop: 106 });
export const NB = BD.length;
export const OPAQUE = new Uint8Array(NB), SOLID = new Uint8Array(NB), PLANT = new Uint8Array(NB), AOCC = new Uint8Array(NB);
for (let i = 1; i < NB; i++) { const d = BD[i]; PLANT[i] = d.plant ? 1 : 0; SOLID[i] = (!d.plant && !d.liquid) ? 1 : 0; OPAQUE[i] = (SOLID[i] && !d.transp) ? 1 : 0; AOCC[i] = (OPAQUE[i] || i === B.LEAVES || i === B.PINE) ? 1 : 0; }

// ================== ATLAS 32×32 ==================
export const TS = 32;
export const atlas = document.createElement('canvas'); atlas.width = atlas.height = TS * 8;
const actx = atlas.getContext('2d');
export const TILEAVG = [];
const cl = (v) => v < 0 ? 0 : v > 255 ? 255 : v | 0;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const R = (...hs) => hs.map(hex);   // rampa de cores, do escuro ao claro
const pick = (ramp, v) => ramp[clamp(Math.floor(v * ramp.length), 0, ramp.length - 1)];
// ruído periódico (a textura emenda sem costura)
function pn(x, y, cell, s) { const n = TS / cell; const fx = x / cell, fy = y / cell; const xi = Math.floor(fx), yi = Math.floor(fy), u = sm(fx - xi), v = sm(fy - yi); const h = (a, b) => hash2(((a % n) + n) % n, ((b % n) + n) % n, s + 900); const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const pfbm = (x, y, s) => pn(x, y, 16, s) * .5 + pn(x, y, 8, s + 1) * .3 + pn(x, y, 4, s + 2) * .2;
function tile(i, painter, seed) {
  const img = actx.createImageData(TS, TS), d = img.data, r = mulberry(seed ?? (i * 7919 + 13));
  const set = (x, y, c, a = 255) => { x = ((Math.round(x) % TS) + TS) % TS; y = Math.round(y); if (y < 0 || y >= TS) return; const k = (y * TS + x) * 4; d[k] = cl(c[0]); d[k + 1] = cl(c[1]); d[k + 2] = cl(c[2]); d[k + 3] = a; };
  const get = (x, y) => { x = ((x % TS) + TS) % TS; y = ((y % TS) + TS) % TS; const k = (y * TS + x) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
  const shade = (x, y, f) => { const c = get(x, y); set(x, y, [c[0] * f, c[1] * f, c[2] * f], c[3]); };
  const each = (fn) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) fn(x, y); };
  const clear = () => each((x, y) => set(x, y, [0, 0, 0], 0));
  painter({ set, get, shade, each, clear, r, s: i * 17 });
  actx.putImageData(img, (i % 8) * TS, ((i / 8) | 0) * TS);
  let s = [0, 0, 0], n = 0; for (let k = 0; k < d.length; k += 4) if (d[k + 3] > 128) { s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; n++; }
  TILEAVG[i] = n ? new THREE.Color().setRGB(s[0] / n / 255, s[1] / n / 255, s[2] / n / 255, THREE.SRGBColorSpace) : new THREE.Color(.5, .5, .5);
}
// rampas
const GRASS = R('#2f6b2a', '#3f8a33', '#4fa23c', '#62b84a', '#7dcc5c', '#9ee07a');
const DIRT = R('#4a3020', '#5e3d27', '#714b31', '#86593a', '#9a6a46', '#b07e56');
const STONE = R('#4e4e55', '#5f5f67', '#707079', '#80808a', '#91919b', '#a6a6af');
const SAND = R('#b9a46e', '#cdb77f', '#dcc68d', '#e7d39b', '#f1e0ad');
const WOOD = R('#5e3f22', '#73502d', '#8a6238', '#a07445', '#b68853', '#c99c64');
const BARK = R('#2d1d10', '#3e2915', '#4f361d', '#614428', '#735233');
const SNOW = R('#c9d6e6', '#dbe5f0', '#e9f0f8', '#f4f8fc', '#ffffff');
const LEAF = R('#1f4d1f', '#2b6527', '#367a2f', '#438f39', '#55a646', '#6fbd57');
const PINE = R('#163a26', '#1e4a31', '#275b3c', '#316c47', '#3f7f55');
const pedra = (t) => t.each((x, y) => t.set(x, y, pick(STONE, pfbm(x, y, t.s) * .75 + t.r() * .3)));
const terra = (t) => { t.each((x, y) => t.set(x, y, pick(DIRT, pfbm(x, y, t.s) * .7 + t.r() * .35))); for (let k = 0; k < 7; k++) { const x = t.r() * 32 | 0, y = t.r() * 32 | 0; const c = t.r() < .5 ? hex('#8a8078') : hex('#a08a70'); t.set(x, y, c); t.set(x + 1, y, c); t.set(x, y + 1, [c[0] * .7, c[1] * .7, c[2] * .7]); t.set(x + 1, y + 1, [c[0] * .6, c[1] * .6, c[2] * .6]); t.set(x, y - 1, [c[0] * 1.15, c[1] * 1.15, c[2] * 1.15]); } };
const tabuas = (t, tone = 0) => {
  for (let b = 0; b < 4; b++) { const bs = t.s + b * 7, off = (t.r() * 32) | 0, tint = (t.r() - .5) * .12 + tone;
    for (let y = b * 8; y < b * 8 + 8; y++) for (let x = 0; x < 32; x++) {
      const g = pn(x * .25, y * 3, 4, bs) * .6 + pn(x, y, 8, bs) * .25 + t.r() * .15 + tint;
      let c = pick(WOOD, .25 + g * .7);
      if (y % 8 === 7) c = WOOD[0]; else if (y % 8 === 0) c = WOOD[5];
      if (((x - off + 32) % 32) === 0 && y % 8 !== 7) c = WOOD[0];
      if (((x - off + 32) % 32) === 1 && y % 8 !== 7) c = WOOD[1];
      t.set(x, y, c);
    }
    for (const dy of [2, 5]) { t.set(off + 3, b * 8 + dy, hex('#3a2a1c')); t.set(off + 2, b * 8 + dy - 1, hex('#d0b080')); }
  }
};
const pedregulho = (t) => {
  const pts = []; for (let k = 0; k < 13; k++) pts.push([t.r() * 32, t.r() * 32, .25 + t.r() * .55]);
  t.each((x, y) => {
    let a = 1e9, b = 1e9, ci = 0; pts.forEach((p, i) => { let dx = Math.abs(x - p[0]); dx = Math.min(dx, 32 - dx); let dy = Math.abs(y - p[1]); dy = Math.min(dy, 32 - dy); const dd = Math.hypot(dx, dy); if (dd < a) { b = a; a = dd; ci = i; } else if (dd < b) b = dd; });
    const p = pts[ci]; const e = b - a; let dxp = x - p[0]; if (dxp > 16) dxp -= 32; if (dxp < -16) dxp += 32; let dyp = y - p[1]; if (dyp > 16) dyp -= 32; if (dyp < -16) dyp += 32;
    if (e < 1.3) { t.set(x, y, pick(STONE, .02 + t.r() * .1)); return; }
    let v = p[2] + pn(x, y, 4, t.s) * .2 - .1;
    if (e < 2.6) v += (dxp + dyp < 0 ? .22 : -.25);
    t.set(x, y, pick(STONE, v + (t.r() - .5) * .08));
  });
};
const minerio = (ramp) => (t) => {
  pedra(t);
  for (let k = 0; k < 6; k++) {
    const cx = 3 + t.r() * 26, cy = 3 + t.r() * 26, n = 4 + (t.r() * 4 | 0);
    for (let j = 0; j < n; j++) { const x = (cx + (t.r() - .5) * 5) | 0, y = (cy + (t.r() - .5) * 5) | 0;
      t.set(x - 1, y + 1, STONE[0]); t.set(x, y, ramp[2]); t.set(x + 1, y, ramp[1]); t.set(x, y + 1, ramp[1]); t.set(x + 1, y + 1, ramp[0]); t.set(x, y - 1 < 0 ? 0 : y - 1, ramp[3]); if (t.r() < .5) t.set(x - 1, y, ramp[3]); }
  }
};
const borda = (t, c, w = 1) => { for (let k = 0; k < w; k++) for (let i = 0; i < 32; i++) { t.set(i, k, c); t.set(i, 31 - k, c); t.set(k, i, c); t.set(31 - k, i, c); } };
// 0 grama topo
tile(0, (t) => { t.each((x, y) => t.set(x, y, pick(GRASS, pfbm(x, y, t.s) * .7 + t.r() * .35))); for (let k = 0; k < 60; k++) { const x = t.r() * 32, y = t.r() * 32; t.set(x, y, GRASS[5]); t.set(x, y + 1, GRASS[3]); t.set(x, y + 2, GRASS[1]); } });
// 1 grama lateral
tile(1, (t) => { terra(t); for (let x = 0; x < 32; x++) { const L = 4 + Math.floor(pn(x, 0, 4, t.s) * 5 + t.r() * 2) + (t.r() < .12 ? 3 : 0); for (let y = 0; y < L; y++) t.set(x, y, pick(GRASS, .35 + pn(x, y, 4, t.s + 3) * .5 + (y === 0 ? .2 : 0) - (y === L - 1 ? .25 : 0))); t.shade(x, L, .62); t.shade(x, L + 1, .82); } });
tile(2, terra);
tile(3, (t) => { pedra(t); for (let k = 0; k < 5; k++) { let x = t.r() * 32, y = t.r() * 32; const n = 6 + t.r() * 8; for (let j = 0; j < n; j++) { t.set(x, y, STONE[0]); t.set(x, y - 1, STONE[5]); x += t.r() < .7 ? 1 : 0; y += (t.r() * 3 | 0) - 1; } } });
tile(4, (t) => { t.each((x, y) => t.set(x, y, pick(SAND, pfbm(x, y, t.s) * .5 + t.r() * .35 + Math.sin((x + y * .6) / 3.2) * .08 + .1))); });
export function paintWater(phase) {
  tile(5, (t) => { const W = R('#1f4fa8', '#2660bd', '#2e6fcf', '#3a80dc', '#5196e6', '#78b4f2', '#a8d4fa');
    t.each((x, y) => { const w = Math.sin((x + phase * 32) / 32 * Math.PI * 4 + Math.sin(y / 5) * 1.5) * .5 + Math.sin((y - phase * 32) / 32 * Math.PI * 2 + x / 9) * .5; const v = .35 + w * .18 + pn(x, (y + phase * 32) % 32, 8, 3) * .25; t.set(x, y, pick(W, v)); });
    for (let k = 0; k < 14; k++) { const x = (k * 7 + phase * 64) % 32, y = (k * 11) % 32; t.set(x, y, hex('#d6ecff')); t.set(x + 1, y, hex('#a8d4fa')); } }, 555);
}
paintWater(0);
// 6 tronco lateral
tile(6, (t) => { t.each((x, y) => { const g = pn(x * 2, y * .35, 4, t.s) * .65 + pn(x * 3, y * .2, 8, t.s + 4) * .35; let v = g; if (g < .32) v = .02; t.set(x, y, pick(BARK, v + t.r() * .12)); }); });
// 7 tronco topo
tile(7, (t) => { const RG = R('#7a5232', '#94673f', '#a87a4c', '#bb8e5b', '#cca06c'); t.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5); if (d > 13.2) { t.set(x, y, pick(BARK, pn(x, y, 4, t.s) * .8 + .1)); return; } const ring = Math.sin(d * 1.45 + pn(x, y, 8, t.s) * 3) * .5 + .5; t.set(x, y, pick(RG, .25 + ring * .55 + t.r() * .12)); }); t.set(15, 15, RG[0]); t.set(16, 16, RG[0]); for (let k = 0; k < 9; k++) t.set(16 + k, 16 + (k / 3 | 0), RG[0]); });
// 8 folhas
tile(8, (t) => { t.each((x, y) => { const v = pfbm(x, y, t.s); if (v < .36 && t.r() < .6) t.set(x, y, [0, 0, 0], 0); else t.set(x, y, pick(LEAF, v * .9 + t.r() * .25)); }); for (let k = 0; k < 40; k++) { const x = t.r() * 32, y = t.r() * 32; t.set(x, y, LEAF[5]); t.set(x + 1, y + 1, LEAF[1]); } });
tile(9, (t) => tabuas(t));
tile(10, pedregulho);
// 11 vidro
tile(11, (t) => { t.clear(); const F = hex('#e4f4fb'), F2 = hex('#a9cfe0'); for (let i = 0; i < 32; i++) { t.set(i, 0, F); t.set(0, i, F); t.set(i, 31, F2); t.set(31, i, F2); t.set(i, 1, F2, 160); t.set(1, i, F2, 160); } for (let k = 0; k < 6; k++) { t.set(6 + k, 12 - k, [255, 255, 255], 230); t.set(7 + k, 12 - k, [220, 240, 250], 180); } for (let k = 0; k < 4; k++) t.set(20 + k, 26 - k, [255, 255, 255], 220); });
tile(12, (t) => { t.each((x, y) => t.set(x, y, pick(SNOW, pfbm(x, y, t.s) * .6 + t.r() * .3 + .1))); for (let k = 0; k < 12; k++) t.set(t.r() * 32, t.r() * 32, [255, 255, 255]); });
tile(13, (t) => { terra(t); for (let x = 0; x < 32; x++) { const L = 6 + Math.floor(pn(x, 0, 4, t.s) * 4 + t.r() * 2) + (t.r() < .1 ? 3 : 0); for (let y = 0; y < L; y++) t.set(x, y, pick(SNOW, .4 + pn(x, y, 4, t.s) * .5 - (y === L - 1 ? .3 : 0))); t.shade(x, L, .7); } });
// 14 tijolos
tile(14, (t) => { const BR = R('#6e2a1f', '#88372a', '#9e4333', '#b0503e', '#c0624c', '#cf7860'); const MO = R('#9a9188', '#b3aaa0', '#c8c0b6', '#d8d0c6');
  for (let y = 0; y < 32; y++) { const row = y >> 3, yy = y % 8; for (let x = 0; x < 32; x++) { const xs = (x + (row % 2) * 8) % 16; if (yy === 7 || xs === 15) { t.set(x, y, pick(MO, .3 + t.r() * .5)); continue; } const id = ((x + (row % 2) * 8) / 16 | 0) + row * 3; const base = .3 + hash2(id, row, 14) * .35; let v = base + pn(x, y, 4, t.s) * .2 + t.r() * .1; if (yy === 0) v += .25; if (yy === 6 || xs === 14) v -= .22; t.set(x, y, pick(BR, v)); } } });
// 15 telhado
tile(15, (t) => { const TR = R('#5e2414', '#7a3019', '#933c20', '#a94a28', '#bd5a33', '#cf6e44'); for (let y = 0; y < 32; y++) { const row = y >> 3, yy = y % 8; for (let x = 0; x < 32; x++) { const xs = (x + (row % 2) * 4) % 8; const curve = Math.abs(xs - 3.5) > 2.6 ? 1 : 0; let v = .45 + hash2(((x + (row % 2) * 4) / 8) | 0, row, 77) * .25 + t.r() * .08 - yy * .03; if (yy >= 6 - curve) v = .05; else if (yy === 0) v += .25; if (xs === 0) v -= .2; t.set(x, y, pick(TR, v)); } } });
// 16 caminho
tile(16, (t) => { const PT = R('#6f5a3c', '#85704c', '#98825a', '#aa9468', '#bba679'); t.each((x, y) => t.set(x, y, pick(PT, pfbm(x, y, t.s) * .6 + t.r() * .35))); for (let k = 0; k < 14; k++) { const x = t.r() * 32, y = t.r() * 32; t.set(x, y, hex('#c8b896')); t.set(x + 1, y + 1, hex('#5e4c32')); } });
// 17 lanterna
tile(17, (t) => { const IR = R('#1e1a18', '#2e2824', '#433a33', '#5a4f45'); t.each((x, y) => { const fr = x < 3 || y < 3 || x > 28 || y > 28 || x === 15 || x === 16 || y === 15 || y === 16; if (fr) { t.set(x, y, pick(IR, (x < 2 || y < 2) ? .9 : .3 + t.r() * .3)); return; } const cx = x < 16 ? 9 : 22.5, cy = y < 16 ? 9 : 22.5; const dd = Math.hypot(x - cx, y - cy); t.set(x, y, dd < 3 ? hex('#fffbe6') : dd < 5.5 ? hex('#ffe89a') : hex('#f7c060')); }); });
// 18/19 cacto
const CA = R('#1f5a26', '#2b7031', '#38863b', '#469c47', '#5bb35a');
tile(18, (t) => { t.each((x, y) => { const rib = (x % 8); let v = .55 + pn(x, y, 8, t.s) * .2 - (rib === 0 ? .45 : rib === 1 ? .15 : rib === 4 ? -.15 : 0); t.set(x, y, pick(CA, v)); }); for (let k = 0; k < 18; k++) { const x = (k % 4) * 8 + 4, y = (k * 7) % 32; t.set(x, y, hex('#f4f0c8')); t.set(x + 1, y + 1, hex('#1a3a1a')); } });
tile(19, (t) => { t.each((x, y) => { const d = Math.max(Math.abs(x - 15.5), Math.abs(y - 15.5)); t.set(x, y, pick(CA, d > 14 ? .05 : .4 + ((d | 0) % 4 === 0 ? -.2 : .1) + t.r() * .1)); }); });
tile(20, (t) => { const BRk = R('#141416', '#26262a', '#3a3a40', '#55555c', '#76767e'); t.each((x, y) => t.set(x, y, pick(BRk, pn(x, y, 4, t.s) * .7 + t.r() * .4))); });
// 21/22 feno
const HY = R('#8a6a1e', '#a8842a', '#c49e38', '#d8b448', '#e8c95e', '#f4dc80');
tile(21, (t) => { t.each((x, y) => { let v = pn(x * .6, y * 3, 4, t.s) * .7 + t.r() * .3; let c = pick(HY, v); if ((y >= 6 && y <= 8) || (y >= 23 && y <= 25)) c = pick(R('#5e2a14', '#7a3a1c', '#934624'), (y === 6 || y === 23) ? .9 : .3 + t.r() * .4); t.set(x, y, c); }); });
tile(22, (t) => { t.each((x, y) => { const d = Math.hypot(x - 15.5, y - 15.5), a = Math.atan2(y - 15.5, x - 15.5); const sp = Math.sin(d * 1.2 + a * 2) * .5 + .5; t.set(x, y, pick(HY, .2 + sp * .6 + t.r() * .15)); }); });
tile(23, (t) => { const FA = R('#2e1c10', '#3d2716', '#4f331d', '#5f3e24', '#704a2c'); t.each((x, y) => { const f = y % 8; t.set(x, y, pick(FA, (f < 2 ? .1 : f === 2 ? .85 : .45) + pn(x, y, 4, t.s) * .25 + t.r() * .1)); }); });
tile(24, minerio(R('#0d0d0f', '#1c1c20', '#2c2c32', '#4a4a52')));
tile(25, (t) => { const PL = R('#c7bfae', '#d6cfbf', '#e2dccd', '#ece7da', '#f5f1e7'); t.each((x, y) => t.set(x, y, pick(PL, pfbm(x, y, t.s) * .6 + t.r() * .3 + .1))); let x = 6, y = 20; for (let k = 0; k < 7; k++) { t.set(x, y, PL[0]); x++; y += (t.r() * 3 | 0) - 1; } });
// 26 trigo, 27/28 flores, 29 capim
tile(26, (t) => { t.clear(); for (let k = 0; k < 7; k++) { const bx = 2 + k * 4.3 + t.r() * 2 | 0, top = 3 + (t.r() * 6 | 0); for (let y = top + 7; y < 32; y++) t.set(bx, y, pick(R('#5e7a26', '#7a9a32', '#94b03e'), t.r())); for (let y = top; y < top + 8; y++) { t.set(bx, y, pick(HY, .4 + t.r() * .5)); if (y % 2) { t.set(bx - 1, y, HY[2]); t.set(bx + 1, y + 1, HY[3]); } } } });
function flor(PET, CEN) { return (t) => { t.clear(); const ST = R('#2f6b2a', '#3f8a33', '#55a646'); for (let y = 13; y < 32; y++) { t.set(15, y, ST[1]); t.set(16, y, ST[2]); } for (const [lx, ly, s] of [[10, 22, -1], [21, 24, 1]]) for (let k = 0; k < 5; k++) { t.set(lx + k * s * -1 + (s > 0 ? -4 : 4), ly - (k > 2 ? 1 : 0), ST[2]); t.set(lx + k * s * -1 + (s > 0 ? -4 : 4), ly + 1, ST[0]); }
  for (let p = 0; p < 6; p++) { const a = p / 6 * Math.PI * 2; const px = 15.5 + Math.cos(a) * 4.2, py = 8.5 + Math.sin(a) * 4.2; for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 4) t.set(px + xx, py + yy, pick(PET, .3 + (-(xx + yy) * .12) + .2)); }
  for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 4) t.set(15.5 + xx, 8.5 + yy, pick(CEN, .5 - (xx + yy) * .12)); }; }
tile(27, flor(R('#7a1020', '#a81a2c', '#d12a3a', '#ea4a52', '#f67a78'), R('#a87a10', '#e0b020', '#ffe060')));
tile(28, flor(R('#a87410', '#d49a18', '#f0bf28', '#ffd84a', '#ffe98a'), R('#7a3a10', '#b85a18', '#e07a28')));
tile(29, (t) => { t.clear(); for (let b = 0; b < 14; b++) { let x = 2 + t.r() * 28; const h = 10 + (t.r() * 18 | 0), lean = (t.r() - .5) * .6; for (let k = 0; k < h; k++) { t.set(x, 31 - k, pick(GRASS, .2 + k / h * .7)); if (k < h * .4) t.set(x + 1, 31 - k, GRASS[1]); x += lean; } } });
tile(30, (t) => { t.each((x, y) => { const v = pfbm(x, y, t.s); if (v < .3 && t.r() < .5) t.set(x, y, [0, 0, 0], 0); else t.set(x, y, pick(PINE, v * .9 + t.r() * .25)); }); });
tile(31, (t) => t.clear());
// 32/33 bancada
tile(32, (t) => { tabuas(t, .05); borda(t, WOOD[0], 2); for (let i = 3; i < 29; i++) for (const k of [10, 21]) { t.set(i, k, WOOD[0]); t.set(k, i, WOOD[0]); t.set(i, k + 1, WOOD[4]); t.set(k + 1, i, WOOD[4]); } });
tile(33, (t) => { tabuas(t); for (let x = 0; x < 32; x++) for (let y = 0; y < 5; y++) t.set(x, y, pick(WOOD, y === 0 ? .95 : y === 4 ? .05 : .6 + t.r() * .1));
  const ME = R('#4a4a52', '#7a7a84', '#a8a8b2', '#d2d2da'); for (let y = 8; y < 24; y++) { t.set(8, y, WOOD[0]); t.set(9, y, WOOD[2]); } for (let x = 4; x < 14; x++) { t.set(x, 8, ME[2]); t.set(x, 9, ME[1]); t.set(x, 10, ME[0]); }
  for (let k = 0; k < 13; k++) { t.set(19 + k * .5, 8 + k, ME[2]); t.set(20 + k * .5, 8 + k, ME[1]); } for (let y = 21; y < 27; y++) { t.set(25, y, WOOD[0]); t.set(26, y, WOOD[3]); } });
// 34/35 fornalha
tile(34, (t) => { pedregulho(t); for (let y = 15; y < 28; y++) for (let x = 8; x < 24; x++) { const fire = y > 21; t.set(x, y, fire ? pick(R('#b02a10', '#e05a18', '#f8902a', '#ffc04a', '#ffe88a'), (y - 21) / 7 * .4 + .45 + Math.sin(x * 1.3) * .2 + t.r() * .2) : hex(y === 15 ? '#141214' : '#221e1e')); } for (let x = 7; x < 25; x++) { t.set(x, 14, STONE[5]); t.set(x, 28, STONE[0]); } for (let y = 14; y < 29; y++) { t.set(7, y, STONE[5]); t.set(24, y, STONE[0]); } for (let x = 9; x < 23; x += 3) for (let y = 4; y < 9; y++) t.set(x, y, STONE[0]); });
tile(35, (t) => { pedra(t); borda(t, STONE[0], 1); for (let i = 1; i < 31; i++) { t.set(i, 1, STONE[5]); t.set(1, i, STONE[5]); } });
// 36/37 baú
const CH = R('#4a2c12', '#62401c', '#7a5228', '#916434', '#a87842', '#bd8c52');
tile(36, (t) => { t.each((x, y) => { const v = pn(x * .3, y * 2.5, 4, t.s) * .5 + .35 + t.r() * .1; t.set(x, y, pick(CH, v)); }); borda(t, CH[0], 2); for (let x = 0; x < 32; x++) { t.set(x, 11, CH[0]); t.set(x, 12, CH[5]); } const ME = R('#5e5e66', '#9a9aa4', '#d0d0d8', '#f4f4f8'); for (let y = 8; y < 17; y++) for (let x = 13; x < 19; x++) t.set(x, y, pick(ME, (x === 13 || y === 8) ? .9 : (x === 18 || y === 16) ? .1 : .55)); t.set(15, 12, hex('#1a1a1a')); t.set(16, 12, hex('#1a1a1a')); t.set(15, 13, hex('#1a1a1a')); });
tile(37, (t) => { t.each((x, y) => t.set(x, y, pick(CH, pn(x * .3, y * 2.5, 4, t.s) * .5 + .4 + t.r() * .1))); borda(t, CH[0], 2); for (let i = 2; i < 30; i++) { t.set(i, 2, CH[5]); t.set(2, i, CH[5]); } });
tile(38, minerio(R('#7a5a44', '#b08868', '#d6ac88', '#f0cfaa')));
tile(39, minerio(R('#8a6410', '#d8a818', '#f8d23a', '#fff09a')));
tile(40, minerio(R('#0e6a6a', '#1fa8a4', '#4fe0d8', '#c8fff8')));
// 41 lã
tile(41, (t) => { const WO = R('#bdb8ae', '#d2cdc4', '#e3dfd7', '#efece6', '#faf8f4'); t.each((x, y) => { const k = Math.sin((x + Math.sin(y * .9) * 2) * .9) * .5 + .5; t.set(x, y, pick(WO, k * .5 + pn(x, y, 8, t.s) * .3 + t.r() * .2)); }); });
// 42/43 dinamite
tile(42, (t) => { const RD = R('#6e1410', '#981e18', '#bb2a20', '#d43c2c', '#e85a44'); t.each((x, y) => { const st = x % 8; t.set(x, y, pick(RD, (st === 0 ? .05 : st === 1 ? .9 : .5) + pn(x, y, 8, t.s) * .2)); }); const PA = R('#b8ae92', '#d8cfb2', '#f0e8cc'); for (let y = 11; y < 21; y++) for (let x = 0; x < 32; x++) t.set(x, y, pick(PA, y === 11 ? .95 : y === 20 ? .05 : .55 + t.r() * .1)); const D = hex('#2a1e1a'); for (const [x0] of [[5], [12], [19]]) { for (let y = 13; y < 19; y++) t.set(x0, y, D); for (let y = 13; y < 19; y += 5) for (let x = x0; x < x0 + 5; x++) t.set(x, y, D); t.set(x0 + 4, 14, D); t.set(x0 + 4, 17, D); } });
tile(43, (t) => { const RD = R('#6e1410', '#981e18', '#bb2a20', '#d43c2c'); t.each((x, y) => t.set(x, y, pick(RD, pn(x, y, 8, t.s) * .5 + .3))); for (let y = 11; y < 21; y++) for (let x = 11; x < 21; x++) t.set(x, y, hex(Math.hypot(x - 15.5, y - 15.5) < 4 ? '#3a2e28' : '#5a4a40')); for (let y = 6; y < 13; y++) t.set(16, y, hex(y < 8 ? '#f8f0d8' : '#c8bca0')); });
tile(44, (t) => { const IC = R('#6aa8e0', '#80bcee', '#98ccf4', '#b4dcf8', '#d4ecfc'); t.each((x, y) => t.set(x, y, pick(IC, pfbm(x, y, t.s) * .5 + .3 + t.r() * .08))); for (let k = 0; k < 5; k++) { let x = t.r() * 32, y = t.r() * 32; for (let j = 0; j < 10; j++) { t.set(x, y, hex('#f0faff')); t.set(x + 1, y + 1, IC[0]); x += 1; y += t.r() < .5 ? 1 : 0; } } });
tile(45, (t) => { const RE = R('#7a1420', '#a01c2c', '#c42a3a', '#d84050'); const WH = R('#cfcac0', '#e6e2da', '#f6f4f0'); t.each((x, y) => { if (y < 11) t.set(x, y, pick(WH, .5 + pn(x, y, 8, t.s) * .5)); else t.set(x, y, pick(RE, .4 + pn(x * .5, y, 8, t.s) * .4 + (y === 11 ? .5 : 0))); }); for (let x = 0; x < 32; x++) t.set(x, 10, WH[0]); });
tile(46, (t) => { tabuas(t); const RE = R('#7a1420', '#a01c2c', '#c42a3a', '#d84050'); const WH = R('#cfcac0', '#e6e2da', '#f6f4f0'); for (let y = 0; y < 14; y++) for (let x = 0; x < 32; x++) t.set(x, y, x < 10 ? pick(WH, .5 + t.r() * .3) : pick(RE, .4 + t.r() * .3 + (y === 0 ? .4 : y === 13 ? -.4 : 0))); });
// 47 teia
tile(47, (t) => { t.clear(); const W = [235, 235, 240]; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; for (let r = 0; r < 18; r++) t.set(15.5 + Math.cos(a) * r, 15.5 + Math.sin(a) * r, W, 220); } for (const rr of [4, 8, 12, 15]) for (let k = 0; k < 80; k++) { const a = k / 80 * Math.PI * 2; const w = rr - Math.abs(Math.sin(a * 4)) * 1.2; const y = 15.5 + Math.sin(a) * w; if (y < 0 || y > 31) continue; t.set(15.5 + Math.cos(a) * w, y, W, 200); } });
export const TUV = []; for (let t = 0; t < 64; t++) { const c = t % 8, rw = (t / 8) | 0, e = .0004; TUV[t] = [c / 8 + e, 1 - (rw + 1) / 8 + e, (c + 1) / 8 - e, 1 - rw / 8 - e]; }

export function blockIcon(id, size = 64) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const d = BD[id], s = size / 32, k = TS / 16;
  const tsrc = (t) => [(t % 8) * TS, ((t / 8) | 0) * TS];
  if (d.plant) { const [sx, sy] = tsrc(d.tiles[1]); x.drawImage(atlas, sx, sy, TS, TS, 2 * s, 2 * s, 28 * s, 28 * s); return cv; }
  const draw = (t, a, b, c, dd, e, f, shade) => { const [sx, sy] = tsrc(t); x.setTransform(a * s / k, b * s / k, c * s / k, dd * s / k, e * s, f * s); x.drawImage(atlas, sx, sy, TS, TS, 0, 0, TS, TS); if (shade) { x.fillStyle = 'rgba(0,0,0,' + shade + ')'; x.fillRect(0, 0, TS, TS); } };
  draw(d.tiles[0], .875, .4375, -.875, .4375, 16, 1, 0);
  draw(d.tiles[1], .875, .4375, 0, .9375, 2, 8, .2);
  draw(d.tiles[1], .875, -.4375, 0, .9375, 16, 15, .38);
  x.setTransform(1, 0, 0, 1, 0, 0); return cv;
}
