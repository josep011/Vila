// Mundo: chunks, geração do terreno, vila, malha e física de entidades.
import * as THREE from 'three';
import { B, BD, OPAQUE, SOLID, PLANT, AOCC, TUV, hash2, hash3, fbm2, vnoise3, smoothstep } from './blocos.js';

export const CS = 16, H = 96, SEA = 24, VH = 27, VILLAGE_R = 46;
const idx = (x, y, z) => (y * CS + z) * CS + x;
export const ckey = (cx, cz) => cx + ',' + cz;
export const chunks = new Map();
let villageDone = false, G = null, store = null, vilaOn = true;
export function setVila(v) { vilaOn = v; }
export function initMundo(group, matO, matW, st) { G = { group, matO, matW }; store = st; loadEdits(); }
class Chunk { constructor(cx, cz) { this.cx = cx; this.cz = cz; this.data = new Uint8Array(CS * CS * H); this.mesh = null; this.wmesh = null; this.dirty = true; } }
export const getChunk = (cx, cz) => chunks.get(ckey(cx, cz));
export function getBlock(x, y, z) { x = Math.floor(x); y = Math.floor(y); z = Math.floor(z); if (y < 0) return B.BEDROCK; if (y >= H) return 0; const cx = Math.floor(x / CS), cz = Math.floor(z / CS); const c = chunks.get(ckey(cx, cz)); if (!c) return 0; return c.data[idx(x - cx * CS, y, z - cz * CS)]; }
export function surfaceY(x, z) { for (let y = H - 2; y > 0; y--) { const b = getBlock(x, y, z); if (SOLID[b] || b === B.WATER) return y; } return 0; }

export function terrainInfo(x, z) {
  const cont = fbm2(x * .0045, z * .0045, 1, 4);
  const det = fbm2(x * .03, z * .03, 2, 3);
  const mm = Math.max(0, fbm2(x * .003, z * .003, 3, 3) * 1.8 - .05);
  const ridge = 1 - Math.abs(fbm2(x * .012, z * .012, 4, 4));
  let h = 27 + cont * 14 + det * 5 + mm * ridge * ridge * 42;
  const d = vilaOn ? Math.hypot(x, z) : 1e9;
  const k = smoothstep(VILLAGE_R, VILLAGE_R + 34, d);
  h = VH + (h - VH) * k;
  h = Math.max(3, Math.min(H - 12, Math.round(h)));
  const temp = fbm2(x * .0025, z * .0025, 5, 3);
  let biome = 'plains';
  if (d < VILLAGE_R + 14) biome = 'plains';
  else if (temp > .26) biome = 'desert';
  else if (temp < -.28) biome = 'snow';
  else if (fbm2(x * .01, z * .01, 6, 2) > .1) biome = 'forest';
  return { h, biome };
}
export function placeTree(put, x, y, z, ht, kind) {
  const leaf = kind === 'pine' ? B.PINE : B.LEAVES;
  if (kind === 'pine') {
    for (let dy = ht + 1; dy >= 2; dy--) { const rr = dy >= ht ? 0 : ((ht - dy) % 2 === 0 ? 1 : 2); for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (rr === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue; put(x + dx, y + dy, z + dz, leaf, false); } }
  } else {
    for (let dy = ht - 2; dy <= ht + 1; dy++) { const rr = dy >= ht ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && (rr === 1 && dy === ht + 1 || hash3(x + dx, y + dy, z + dz, 61) < .5)) continue; put(x + dx, y + dy, z + dz, leaf, false); } }
  }
  for (let k = 0; k < ht; k++) put(x, y + k, z, B.LOG, true);
}
function oreAt(x, y, z, h) {
  // veios: decide por célula 3×3×3 e preenche parte dos blocos
  const cx = Math.floor(x / 3), cy = Math.floor(y / 3), cz = Math.floor(z / 3), r = hash3(cx, cy, cz, 41), f = hash3(x, y, z, 42) < .55;
  if (!f) return B.STONE;
  if (y < 14 && r < .012) return B.DIAMOND_ORE;
  if (y < 26 && r < .03) return B.GOLD_ORE;
  if (y < h - 5 && r < .085) return B.IRON_ORE;
  if (r < .15) return B.COAL;
  return B.STONE;
}
function generate(c) {
  const d = c.data, ox = c.cx * CS, oz = c.cz * CS;
  for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    const wx = ox + x, wz = oz + z, t = terrainInfo(wx, wz), h = t.h;
    let top, under;
    if (h <= SEA + 1 && t.biome !== 'snow') { top = B.SAND; under = B.SAND; }
    else if (t.biome === 'desert') { top = B.SAND; under = B.SAND; }
    else if (h > 68) { top = B.SNOW; under = B.STONE; }
    else if (h > 57) { top = B.STONE; under = B.STONE; }
    else if (t.biome === 'snow') { top = B.SNOWGRASS; under = B.DIRT; }
    else { top = B.GRASS; under = B.DIRT; }
    if (h <= SEA && top === B.SNOWGRASS) top = B.DIRT;
    const caveOK = !vilaOn || Math.hypot(wx, wz) > VILLAGE_R + 14;
    for (let y = 0; y < H; y++) {
      let b = 0;
      if (y === 0 || (y < 3 && hash3(wx, y, wz, 8) < .5)) b = B.BEDROCK;
      else if (y < h - 3) b = oreAt(wx, y, wz, h);
      else if (y < h) b = under;
      else if (y === h) b = top;
      else if (y <= SEA) b = (t.biome === 'snow' && y === SEA) ? B.ICE : B.WATER;
      if (b && b !== B.BEDROCK && caveOK && y > 3 && y < h - 4) { const n1 = vnoise3(wx * .06, y * .09, wz * .06, 11); if (Math.abs(n1) < .13) { const n2 = vnoise3(wx * .06, y * .09, wz * .06, 23); if (Math.abs(n2) < .13) b = 0; } }
      if (b) d[idx(x, y, z)] = b;
    }
    if (top === B.GRASS && h + 1 < H) { const r = hash2(wx, wz, 77); const tg = t.biome === 'forest' ? .04 : .1; if (r < .012) d[idx(x, h + 1, z)] = B.FLOWER_R; else if (r < .024) d[idx(x, h + 1, z)] = B.FLOWER_Y; else if (r < tg) d[idx(x, h + 1, z)] = B.TALLGRASS; }
  }
  const put = (wx, wy, wz, b, force) => { const lx = wx - ox, lz = wz - oz; if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || wy < 0 || wy >= H) return; const i = idx(lx, wy, lz); const cur = d[i]; if (force || cur === 0 || PLANT[cur]) d[i] = b; };
  for (let wz = oz - 3; wz < oz + CS + 3; wz++) for (let wx = ox - 3; wx < ox + CS + 3; wx++) {
    const r = hash2(wx, wz, 50); if (r > .05) continue;
    if (vilaOn && Math.hypot(wx, wz) < VILLAGE_R + 6) continue;
    const t = terrainInfo(wx, wz); if (t.h <= SEA + 1 || t.h > 60) continue;
    if (t.biome === 'desert') { if (r < .006) { const ch = 1 + (hash2(wx, wz, 52) * 3 | 0); for (let k = 1; k <= ch; k++) put(wx, t.h + k, wz, B.CACTUS, true); } continue; }
    const dens = t.biome === 'forest' ? .05 : t.biome === 'snow' ? .014 : .006;
    if (r < dens) placeTree(put, wx, t.h + 1, wz, 4 + (hash2(wx, wz, 51) * 3 | 0), t.biome === 'snow' ? 'pine' : 'oak');
  }
}

// ---------- edições ----------
const edits = new Map();
function loadEdits() { const o = store.get('edits', {}); for (const k in o) { const m = new Map(); for (const [i, b] of o[k]) m.set(i, b); edits.set(k, m); } }
export function editsJSON() { const o = {}; for (const [k, m] of edits) o[k] = [...m]; return o; }
function applyEdits(c) { const m = edits.get(ckey(c.cx, c.cz)); if (m) for (const [i, b] of m) c.data[i] = b; }
export function ensureChunk(cx, cz) { let c = getChunk(cx, cz); if (!c) { c = new Chunk(cx, cz); generate(c); chunks.set(ckey(cx, cz), c); if (villageDone) applyEdits(c); } return c; }
export const rebuildNow = new Set();
export let onEdit = () => {};
export function setOnEdit(f) { onEdit = f; }
export function setBlock(x, y, z, b) {
  if (y < 0 || y >= H) return; const cx = Math.floor(x / CS), cz = Math.floor(z / CS); const c = getChunk(cx, cz); if (!c) return;
  const lx = x - cx * CS, lz = z - cz * CS, i = idx(lx, y, lz); c.data[i] = b;
  const k = ckey(cx, cz); if (!edits.has(k)) edits.set(k, new Map()); edits.get(k).set(i, b); onEdit();
  rebuildNow.add(c);
  const nb = (dx, dz) => { const n = getChunk(cx + dx, cz + dz); if (n) rebuildNow.add(n); };
  if (lx === 0) nb(-1, 0); if (lx === CS - 1) nb(1, 0); if (lz === 0) nb(0, -1); if (lz === CS - 1) nb(0, 1);
  if (lx === 0 && lz === 0) nb(-1, -1); if (lx === CS - 1 && lz === 0) nb(1, -1); if (lx === 0 && lz === CS - 1) nb(-1, 1); if (lx === CS - 1 && lz === CS - 1) nb(1, 1);
}

// ---------- vila ----------
function vset(x, y, z, b) { const c = getChunk(Math.floor(x / CS), Math.floor(z / CS)); if (!c || y < 0 || y >= H) return; c.data[idx(x - c.cx * CS, y, z - c.cz * CS)] = b; }
function fillB(x0, y0, z0, x1, y1, z1, b) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) vset(x, y, z, b); }
function vput(x, y, z, b, force) { const cur = getBlock(x, y, z); if (force || cur === 0 || PLANT[cur]) vset(x, y, z, b); }
function house(x0, z0, x1, z1, dx, dz, style, hgt) {
  const wall = [B.PLANKS, B.PLASTER, B.BRICK][style];
  fillB(x0 - 1, VH + 1, z0 - 1, x1 + 1, VH + 16, z1 + 1, 0);
  fillB(x0, VH, z0, x1, VH, z1, B.COBBLE);
  fillB(x0 + 1, VH, z0 + 1, x1 - 1, VH, z1 - 1, B.PLANKS);
  for (let y = VH + 1; y <= VH + hgt; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const ex = x === x0 || x === x1, ez = z === z0 || z === z1; if (!ex && !ez) continue; vset(x, y, z, ex && ez ? B.LOG : wall); }
  const along = (a, b) => (b - a + 1) >= 7 ? [a + 2, b - 2] : [Math.floor((a + b) / 2)];
  const rows = hgt >= 5 ? [VH + 2, VH + 4] : [VH + 2];
  for (const y of rows) {
    for (const x of along(x0, x1)) for (const z of [z0, z1]) if (!(x === dx && z === dz)) vset(x, y, z, B.GLASS);
    for (const z of along(z0, z1)) for (const x of [x0, x1]) if (!(x === dx && z === dz)) vset(x, y, z, B.GLASS);
  }
  vset(dx, VH + 1, dz, 0); vset(dx, VH + 2, dz, 0);
  vset(Math.floor((x0 + x1) / 2), VH + hgt, Math.floor((z0 + z1) / 2), B.LAMP);
  const bx = (dx - x0 < x1 - dx) ? x1 - 1 : x0 + 1, bz = (dz - z0 < z1 - dz) ? z1 - 1 : z0 + 1; vset(bx, VH + 1, bz, B.BED);
  for (let i = 0; ; i++) { const a0 = x0 - 1 + i, a1 = x1 + 1 - i, b0 = z0 - 1 + i, b1 = z1 + 1 - i; if (a0 > a1 || b0 > b1) break; fillB(a0, VH + hgt + 1 + i, b0, a1, VH + hgt + 1 + i, b1, B.ROOF); }
  return { bx, bz };
}
function lamp(x, z) { vset(x, VH + 1, z, B.COBBLE); vset(x, VH + 2, z, B.LOG); vset(x, VH + 3, z, B.LOG); vset(x, VH + 4, z, B.LAMP); }
function farm(x0, z0, x1, z1) {
  fillB(x0 - 1, VH + 1, z0 - 1, x1 + 1, VH + 5, z1 + 1, 0);
  const mz = Math.floor((z0 + z1) / 2);
  for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (x === x0 - 1 || x === x1 + 1 || z === z0 - 1 || z === z1 + 1) { vset(x, VH, z, B.LOG); continue; }
    if (z === mz) vset(x, VH, z, B.WATER); else { vset(x, VH, z, B.FARM); vset(x, VH + 1, z, B.CROP); }
  }
}
export const VILLAGE_CHESTS = [];
export function semVila() { villageDone = true; for (const c of chunks.values()) applyEdits(c); }
export function resetMundo(st) { for (const c of chunks.values()) disposeMesh(c); chunks.clear(); edits.clear(); villageDone = false; VILLAGE_CHESTS.length = 0; rebuildNow.clear(); store = st; loadEdits(); }
export function buildVillage() {
  fillB(-44, VH + 1, -1, 44, VH + 5, 1, 0); fillB(-1, VH + 1, -44, 1, VH + 5, 44, 0);
  fillB(-44, VH, -1, 44, VH, 1, B.PATH); fillB(-1, VH, -44, 1, VH, 44, B.PATH);
  fillB(-6, VH + 1, -6, 6, VH + 6, 6, 0); fillB(-6, VH, -6, 6, VH, 6, B.COBBLE);
  fillB(-1, VH - 3, -1, 1, VH + 1, 1, B.COBBLE); for (let y = VH - 2; y <= VH + 1; y++) vset(0, y, 0, B.WATER);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) fillB(sx, VH + 2, sz, sx, VH + 3, sz, B.LOG);
  fillB(-1, VH + 4, -1, 1, VH + 4, 1, B.PLANKS); vset(0, VH + 5, 0, B.ROOF);
  for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) lamp(x, z);
  for (const t of [-42, -29, -15, 15, 29, 42]) { lamp(t, t > 0 ? 2 : -2); lamp(t > 0 ? -2 : 2, t); }
  let hi = 0;
  for (const t of [-36, -22, 22, 36]) for (const side of [1, -1]) for (const axis of ['x', 'z']) {
    const s = hi++; const w = 5 + (hash2(s, 1, 301) * 3 | 0), dp = 5 + (hash2(s, 2, 302) * 3 | 0), style = hash2(s, 3, 303) * 3 | 0;
    const a0 = t - Math.floor(w / 2), a1 = a0 + w - 1; let b0, b1, door;
    if (side > 0) { b0 = 4; b1 = 4 + dp - 1; door = b0; } else { b1 = -4; b0 = -4 - dp + 1; door = b1; }
    let bed;
    if (axis === 'x') { bed = house(a0, b0, a1, b1, t, door, style, 3); fillB(t, VH, side > 0 ? 2 : door + 1, t, VH, side > 0 ? door - 1 : -2, B.PATH); }
    else { bed = house(b0, a0, b1, a1, door, t, style, 3); fillB(side > 0 ? 2 : door + 1, VH, t, side > 0 ? door - 1 : -2, VH, t, B.PATH); }
    if (s % 3 === 0) { const cx = axis === 'x' ? (bed.bx > t ? bed.bx - 1 : bed.bx + 1) : bed.bx, cz = axis === 'x' ? bed.bz : (bed.bz > t ? bed.bz - 1 : bed.bz + 1); vset(cx, VH + 1, cz, B.CHEST); VILLAGE_CHESTS.push([cx, VH + 1, cz, s]); }
  }
  house(-28, 24, -16, 34, -16, 29, 2, 5); fillB(-15, VH + 1, 29, -2, VH + 3, 29, 0); fillB(-15, VH, 29, -2, VH, 29, B.PATH);
  vset(-26, VH + 1, 25, B.TABLE); vset(-25, VH + 1, 25, B.FURNACE); vset(-24, VH + 1, 25, B.CHEST); VILLAGE_CHESTS.push([-24, VH + 1, 25, 99]);
  vset(-26, VH + 1, 33, B.CHEST); VILLAGE_CHESTS.push([-26, VH + 1, 33, 98]);
  farm(15, 14, 26, 23); farm(15, -23, 26, -14);
  fillB(28, VH + 1, 14, 29, VH + 1, 15, B.HAY); vset(28, VH + 2, 14, B.HAY); fillB(28, VH + 1, -15, 28, VH + 2, -14, B.HAY);
  for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) {
    const x = -22 + dx, z = -22 + dz, d = Math.hypot(dx, dz);
    if (d <= 5.6) { fillB(x, VH + 1, z, x, VH + 5, z, 0); vset(x, VH, z, B.WATER); vset(x, VH - 1, z, B.WATER); if (d < 3.5) vset(x, VH - 2, z, B.WATER); vset(x, d < 3.5 ? VH - 3 : VH - 2, z, B.SAND); }
    else if (d <= 6.9) { fillB(x, VH + 1, z, x, VH + 3, z, 0); vset(x, VH, z, B.SAND); }
  }
  const vt = (x, z, h) => placeTree((a, b, c, blk, f) => vput(a, b, c, blk, f), x, VH + 1, z, h, 'oak');
  vt(-31, -13, 5); vt(-13, -31, 4); vt(-32, -30, 5); vt(-12, -14, 4); vt(12, -11, 5); vt(-11, 12, 4); vt(11, 11, 5); vt(33, -30, 4); vt(34, 28, 5); vt(-38, 40, 4); vt(40, -40, 5);
  for (const [x, z] of [[-4, -3], [-3, -4], [4, 3], [3, 4], [-4, 3], [4, -3]]) { vset(x, VH, z, B.GRASS); vset(x, VH + 1, z, (x + z) % 2 ? B.FLOWER_R : B.FLOWER_Y); }
  villageDone = true; for (const c of chunks.values()) applyEdits(c);
}

// ---------- malha ----------
const FACES = [
  { n: [-1, 0, 0], c: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]], uv: [[0, 1], [0, 0], [1, 1], [1, 0]], s: .8, t: 1 },
  { n: [1, 0, 0], c: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]], uv: [[0, 1], [0, 0], [1, 1], [1, 0]], s: .8, t: 1 },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]], uv: [[1, 0], [0, 0], [1, 1], [0, 1]], s: .55, t: 2 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]], uv: [[1, 1], [0, 1], [1, 0], [0, 0]], s: 1, t: 0 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]], uv: [[0, 0], [1, 0], [0, 1], [1, 1]], s: .68, t: 1 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], uv: [[0, 0], [1, 0], [0, 1], [1, 1]], s: .68, t: 1 },
];
for (const F of FACES) { const a = F.n.findIndex((v) => v !== 0), o = [0, 1, 2].filter((i) => i !== a); F.ao = F.c.map((c) => { const s0 = c[o[0]] ? 1 : -1, s1 = c[o[1]] ? 1 : -1; const A = [...F.n], Bv = [...F.n], C = [...F.n]; A[o[0]] += s0; Bv[o[1]] += s1; C[o[0]] += s0; C[o[1]] += s1; return [A, Bv, C]; }); }
const AOL = [.42, .6, .8, 1];
const LIN = (v) => Math.pow(v, 1.9);
const PW = CS + 2; const PAD = new Uint8Array(PW * PW * H);
function addPlant(T, x, y, z, tile) {
  const [u0, v0, u1, v1] = TUV[tile];
  for (const [a, b] of [[[.15, .15], [.85, .85]], [[.15, .85], [.85, .15]]]) for (const flip of [0, 1]) {
    const base = T.p.length / 3;
    T.p.push(x + a[0], y, z + a[1], x + b[0], y, z + b[1], x + a[0], y + 1, z + a[1], x + b[0], y + 1, z + b[1]);
    T.n.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); T.u.push(u0, v0, u1, v0, u0, v1, u1, v1); T.c.push(.8, .8, .8, .8, .8, .8, 1, 1, 1, 1, 1, 1);
    if (flip) T.i.push(base, base + 2, base + 1, base + 2, base + 3, base + 1); else T.i.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
}
export function disposeMesh(c) { for (const k of ['mesh', 'wmesh']) if (c[k]) { G.group.remove(c[k]); c[k].geometry.dispose(); c[k] = null; } }
export function buildChunkMesh(c) {
  c.dirty = false; PAD.fill(0);
  for (let dz = -1; dz <= CS; dz++) for (let dx = -1; dx <= CS; dx++) {
    const wx = c.cx * CS + dx, wz = c.cz * CS + dz; const inside = dx >= 0 && dx < CS && dz >= 0 && dz < CS;
    const cc = inside ? c : getChunk(Math.floor(wx / CS), Math.floor(wz / CS)); if (!cc) continue;
    const lx = wx - cc.cx * CS, lz = wz - cc.cz * CS; const src = cc.data;
    for (let y = 0; y < H; y++) PAD[(y * PW + dz + 1) * PW + dx + 1] = src[idx(lx, y, lz)];
  }
  const Gb = (x, y, z) => y < 0 ? B.BEDROCK : y >= H ? 0 : PAD[(y * PW + z + 1) * PW + x + 1];
  const O = { p: [], n: [], u: [], c: [], i: [] }, W = { p: [], n: [], u: [], c: [], i: [] };
  const aoL = [3, 3, 3, 3];
  for (let y = 0; y < H; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    const b = PAD[(y * PW + z + 1) * PW + x + 1]; if (!b) continue; const d = BD[b];
    if (d.plant) { addPlant(O, x, y, z, d.tiles[1]); continue; }
    const isW = b === B.WATER; const wTop = isW && Gb(x, y + 1, z) !== B.WATER;
    for (let f = 0; f < 6; f++) {
      const F = FACES[f]; const n = Gb(x + F.n[0], y + F.n[1], z + F.n[2]);
      if (isW) { if (n === B.WATER || OPAQUE[n]) continue; if (f === 2 && n !== 0) continue; }
      else { if (OPAQUE[n]) continue; if (n === b && d.transp) continue; }
      const T = isW ? W : O; const uv = TUV[d.tiles[F.t]]; const base = T.p.length / 3;
      aoL[0] = aoL[1] = aoL[2] = aoL[3] = 3;
      if (!isW && !d.light) for (let k = 0; k < 4; k++) { const o = F.ao[k]; const s1 = AOCC[Gb(x + o[0][0], y + o[0][1], z + o[0][2])], s2 = AOCC[Gb(x + o[1][0], y + o[1][1], z + o[1][2])], cc = AOCC[Gb(x + o[2][0], y + o[2][1], z + o[2][2])]; aoL[k] = (s1 && s2) ? 0 : 3 - (s1 + s2 + cc); }
      for (let k = 0; k < 4; k++) {
        const cr = F.c[k]; let vy = y + cr[1]; if (wTop && cr[1] === 1) vy -= .12;
        T.p.push(x + cr[0], vy, z + cr[2]); T.n.push(F.n[0], F.n[1], F.n[2]); T.u.push(F.uv[k][0] ? uv[2] : uv[0], F.uv[k][1] ? uv[3] : uv[1]);
        const br = d.light ? 2.6 : LIN(F.s * AOL[aoL[k]]); T.c.push(br, br, br);
      }
      if (aoL[0] + aoL[3] > aoL[1] + aoL[2]) T.i.push(base, base + 1, base + 3, base, base + 3, base + 2); else T.i.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  disposeMesh(c);
  const mk = (T, mat) => { if (!T.i.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(T.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(T.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(T.c, 3)); g.setIndex(T.i); const m = new THREE.Mesh(g, mat); m.position.set(c.cx * CS, 0, c.cz * CS); m.matrixAutoUpdate = false; m.updateMatrix(); G.group.add(m); return m; };
  c.mesh = mk(O, G.matO); c.wmesh = mk(W, G.matW); if (c.wmesh) c.wmesh.renderOrder = 1;
}
let OFFS = [], RD = 4;
export function setRD(r) { RD = r; OFFS = []; const R = RD + 1; for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const d2 = dx * dx + dz * dz; if (d2 <= R * R + 1) OFFS.push([dx, dz, d2]); } OFFS.sort((a, b) => a[2] - b[2]); }
export const offsCount = () => OFFS.length;
function neighborsReady(cx, cz) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!getChunk(cx + dx, cz + dz)) return false; return true; }
let gcTick = 0;
export function updateChunks(px, pz, genBudget, buildBudget) {
  const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS); let gen = 0, built = 0;
  for (const [dx, dz, d2] of OFFS) {
    const cx = pcx + dx, cz = pcz + dz; const c = getChunk(cx, cz);
    if (!c) { if (gen < genBudget) { ensureChunk(cx, cz); gen++; } continue; }
    if (d2 <= RD * RD + 1 && c.dirty && built < buildBudget && neighborsReady(cx, cz)) { buildChunkMesh(c); built++; }
  }
  if (++gcTick % 40 === 0) { const lim = (RD + 2) * (RD + 2); for (const c of chunks.values()) if (c.mesh || c.wmesh) { const dd = (c.cx - pcx) ** 2 + (c.cz - pcz) ** 2; if (dd > lim) { disposeMesh(c); c.dirty = true; } } }
  return gen + built;
}

// ---------- física de entidades (jogador e criaturas) ----------
// e = { pos, vel, hw, h, onGround }
export function colide(x, y, z, hw, h) { const x0 = Math.floor(x - hw), x1 = Math.floor(x + hw), y0 = Math.floor(y), y1 = Math.floor(y + h), z0 = Math.floor(z - hw), z1 = Math.floor(z + hw); for (let j = y0; j <= y1; j++) for (let k = z0; k <= z1; k++) for (let i = x0; i <= x1; i++) if (SOLID[getBlock(i, j, k)]) return true; return false; }
function moveAxis(e, a, d) {
  if (!d) return false; const p = e.pos, old = p[a]; p[a] += d; if (!colide(p.x, p.y, p.z, e.hw, e.h)) return false;
  if (a === 'y') p.y = d < 0 ? Math.floor(p.y) + 1 : Math.floor(p.y + e.h) - e.h - .001;
  else if (a === 'x') p.x = d > 0 ? Math.floor(p.x + e.hw) - e.hw - .001 : Math.floor(p.x - e.hw) + 1 + e.hw + .001;
  else p.z = d > 0 ? Math.floor(p.z + e.hw) - e.hw - .001 : Math.floor(p.z - e.hw) + 1 + e.hw + .001;
  if (colide(p.x, p.y, p.z, e.hw, e.h)) p[a] = old; return true;
}
export function mover(e, dt) {
  const dx = e.vel.x * dt, dy = e.vel.y * dt, dz = e.vel.z * dt; const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / .25));
  e.onGround = false; e.hitWall = false;
  for (let i = 0; i < n; i++) { if (moveAxis(e, 'y', dy / n)) { if (dy < 0) e.onGround = true; e.vel.y = 0; } if (moveAxis(e, 'x', dx / n)) e.hitWall = true; if (moveAxis(e, 'z', dz / n)) e.hitWall = true; }
  e.inWater = getBlock(e.pos.x, e.pos.y + e.h * .4, e.pos.z) === B.WATER;
}
export function groundAt(x, z, fromY) { const bx = Math.floor(x), bz = Math.floor(z); for (let y = Math.floor(fromY) + 1; y >= Math.floor(fromY) - 5; y--) { if (SOLID[getBlock(bx, y, bz)] && !SOLID[getBlock(bx, y + 1, bz)] && !SOLID[getBlock(bx, y + 2, bz)]) return y + 1; } return null; }
export function raycast(o, d, maxD) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = d.x ? Math.abs(1 / d.x) : 1e9, tdy = d.y ? Math.abs(1 / d.y) : 1e9, tdz = d.z ? Math.abs(1 / d.z) : 1e9;
  let tmx = d.x > 0 ? (x + 1 - o.x) * tdx : d.x < 0 ? (o.x - x) * tdx : 1e9, tmy = d.y > 0 ? (y + 1 - o.y) * tdy : d.y < 0 ? (o.y - y) * tdy : 1e9, tmz = d.z > 0 ? (z + 1 - o.z) * tdz : d.z < 0 ? (o.z - z) * tdz : 1e9;
  let t = 0, nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < 300 && t <= maxD; i++) {
    const b = getBlock(x, y, z); if (b && b !== B.WATER) return { x, y, z, nx, ny, nz, b, t };
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; } else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; } else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}
