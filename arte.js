// Ícones de itens em pixel art 32×32 com contorno, luz e sombra (desenhos originais).
import { blockIcon, clamp } from './blocos.js';
import { IT, ITEMS } from './itens.js';

const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const R = (...h) => h.map(hx);
export const RAMP = {
  cabo: R('#2e1b0c', '#4a2f17', '#6b4626', '#8a5f36', '#a97a4a', '#c59866'),
  M: R('#3e2410', '#5e3b1e', '#82562e', '#a6743f', '#c69456', '#ddb072'),
  P: R('#2a2a2f', '#46464d', '#666670', '#878791', '#a9a9b2', '#cacad2'),
  F: R('#41414a', '#6f6f7a', '#9fa0aa', '#c9cad2', '#e8e8ee', '#ffffff'),
  O: R('#5e3e04', '#9a6a0a', '#d49a12', '#f2c22a', '#ffe068', '#fff6c0'),
  D: R('#08403f', '#0f6f6c', '#1ea8a0', '#3fd8cc', '#8ef4e8', '#e4fffb'),
  C: R('#3a200e', '#5a3418', '#7c4a24', '#9c6232', '#bb7d46', '#d49a62'),
  couro: R('#3a200e', '#5a3418', '#7c4a24', '#9c6232', '#bb7d46'),
  escuro: R('#121216', '#1e1e24', '#2c2c34', '#3c3c46', '#52525e', '#6c6c7a'),
  vermelho: R('#4a0a10', '#7a121c', '#b01e2a', '#dc3440', '#f45a60', '#ff9a96'),
  verde: R('#0f3a12', '#1d5a20', '#2e7e30', '#46a444', '#6cc860', '#a4e894'),
  roxo: R('#24103e', '#3a1a62', '#562a8a', '#7840b4', '#a066dc', '#d0a8ff'),
  azul: R('#0c2a5a', '#14408a', '#2060c0', '#3a86e6', '#6aaef6', '#b4dcff'),
  ciano: R('#05404a', '#0a6a78', '#14a0b0', '#34cce0', '#7aeef8', '#d0fcff'),
  laranja: R('#5a2006', '#8a360c', '#c45614', '#ec7a20', '#ffa448', '#ffd08a'),
  amarelo: R('#6a4a04', '#a07408', '#d8a410', '#f4c828', '#ffe060', '#fff4b0'),
  rosa: R('#5a1430', '#8a2048', '#c03a6a', '#e45a8c', '#ff86ae', '#ffc4da'),
  branco: R('#8a8a92', '#a8a8b0', '#c6c6cc', '#e0e0e6', '#f2f2f6', '#ffffff'),
  latao: R('#5a3a08', '#8a5e10', '#b8861c', '#dcae34', '#f4d062', '#fff0a8'),
  pele: R('#5a2a20', '#8a4436', '#b8604e', '#d8806c', '#f0a490', '#ffc8b8'),
  pao: R('#5a2e0c', '#8a4a16', '#b86c22', '#d89038', '#f0b45a', '#ffd690'),
  carne: R('#5a1018', '#8a1c26', '#bc3440', '#dc5a60', '#f08888', '#ffc0bc'),
  assado: R('#3a1a08', '#5e2e10', '#86461c', '#a8602c', '#c88044', '#e4a466'),
  vidro: R('#5a8aa0', '#7aa8bc', '#a0c8d8', '#c4e0ea', '#e4f4fa', '#ffffff'),
};
// ---------- motor ----------
export function sprite(draw) {
  const N = 32, g = new Array(N * N).fill(null);
  const put = (x, y, r, v = 2.5, ns = false) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; g[y * N + x] = { r, v, ns }; };
  const P = {
    px: put,
    rect(x, y, w, h, r, v = 2.5, ns) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(i, j, r, v, ns); },
    disc(cx, cy, rx, r, v = 2.5, ry = rx, ns, grad) { for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++) for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++) { const d = Math.hypot((i - cx) / rx, (j - cy) / ry); if (d <= 1) put(i, j, r, grad ? v + (1 - d) * grad - ((i - cx) / rx + (j - cy) / ry) * grad * .5 : v, ns); } },
    line(x0, y0, x1, y1, r, v = 2.5, th = 1, ns) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) || 1; for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; if (th <= 1) put(x, y, r, v, ns); else P.disc(x, y, th / 2, r, v, th / 2, ns); } },
    poly(pts, r, v = 2.5, ns) { let y0 = 99, y1 = -1; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y + .5 && b[1] > y + .5) || (b[1] <= y + .5 && a[1] > y + .5)) xs.push(a[0] + (y + .5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } xs.sort((p, q) => p - q); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) put(x, y, r, v, ns); } },
    // eixo local: origem (ox,oy), direção ang; f(u,v) -> pixel
    eixo(ox, oy, ang) { const ax = Math.cos(ang), ay = Math.sin(ang), bx = -ay, by = ax; return { pt: (u, v) => [ox + ax * u + bx * v, oy + ay * u + by * v], fill(u0, u1, wfn, r, vfn, ns) { for (let u = u0; u <= u1; u += .35) { const w = wfn(u); for (let v = -w; v <= w; v += .35) { const [x, y] = this.pt(u, v); put(x, y, r, typeof vfn === 'function' ? vfn(u, v, w) : vfn, ns); } } }, fillV(u0, u1, vfn0, vfn1, r, val, ns) { for (let u = u0; u <= u1; u += .35) for (let v = vfn0(u); v <= vfn1(u); v += .35) { const [x, y] = this.pt(u, v); put(x, y, r, typeof val === 'function' ? val(u, v) : val, ns); } } }; },
  };
  draw(P);
  const filled = (x, y) => x >= 0 && y >= 0 && x < N && y < N && g[y * N + x];
  const out = new Array(N * N).fill(null);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = g[y * N + x];
    if (c) { let v = c.v; if (!c.ns) { if (!filled(x, y - 1) || !filled(x - 1, y)) v += 1; if (!filled(x, y + 1) || !filled(x + 1, y)) v -= 1; } out[y * N + x] = c.r[clamp(Math.floor(v), 0, c.r.length - 1)]; continue; }
    let nb = null; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = filled(x + a, y + b); if (n) { nb = n; break; } }
    if (nb) { const d = nb.r[0]; out[y * N + x] = [d[0] * .45, d[1] * .45, d[2] * .45]; }
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const ctx = cv.getContext('2d'); const img = ctx.createImageData(N, N);
  for (let k = 0; k < N * N; k++) { const c = out[k]; if (!c) continue; img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2]; img.data[k * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0); return cv;
}
const A45 = -Math.PI / 4;   // diagonal de baixo-esquerda para cima-direita
const cabo = (P, len = 21, r = RAMP.cabo) => { const e = P.eixo(5, 27, A45); e.fill(0, len, () => 1.05, r, (u, v) => 2.6 + (v < 0 ? .8 : -.3) + (Math.floor(u) % 6 === 0 ? -.6 : 0)); return e; };
function ferramenta(tipo, m) {
  const r = RAMP[m];
  return sprite((P) => {
    if (tipo === 'esp') {
      const e = P.eixo(4, 28, A45);
      e.fill(9.5, 29, (u) => u > 26 ? (29 - u) * .8 : 1.8, r, (u, v) => 2.6 + (v < -.3 ? 1.2 : v > .6 ? -.6 : .4));
      e.fillV(7.4, 9.2, () => -5.5, () => 5.5, m === 'D' ? RAMP.O : RAMP.escuro, 3);
      e.fill(2.5, 7.4, () => .95, RAMP.couro, (u) => 2.5 + (Math.floor(u * 1.4) % 2 ? .7 : -.3));
      e.fill(.6, 2.6, () => 1.6, m === 'D' ? RAMP.O : RAMP.escuro, 3);
      return;
    }
    const e = cabo(P, tipo === 'pa' ? 17 : 19);
    if (tipo === 'pic') { for (let t = -1; t <= 1; t += .02) { const [x, y] = e.pt(19 - t * t * 5.5, t * 12); P.disc(x, y, 2.2 * (1 - Math.abs(t) * .55), r, 2.6 + (t < 0 ? .5 : 0) - Math.abs(t) * .4); } e.fill(17.5, 21, () => 1.6, RAMP.escuro, 2.5); }
    if (tipo === 'mac') { e.fillV(12.5, 23, () => 0, (u) => 2 + Math.sin(Math.PI * (u - 12.5) / 10.5) * 7.5, r, (u, v) => 2.3 + (v > 6 ? 1.6 : 0) + (u > 21 ? .6 : 0)); e.fillV(15.5, 20, () => -3, () => 0, r, 1.8); }
    if (tipo === 'pa') { e.fill(16, 27, (u) => Math.sqrt(Math.max(0, 1 - ((u - 21.5) / 5.6) ** 2)) * 5, r, (u, v) => 2.5 + (v < -2 ? .9 : 0) + (u > 25 ? .5 : 0)); }
  });
}
function armadura(slot, m) {
  const r = RAMP[m];
  return sprite((P) => {
    if (slot === 0) { P.poly([[5, 16], [6, 9], [10, 5], [16, 4], [22, 5], [26, 9], [27, 16], [27, 24], [22, 24], [22, 18], [10, 18], [10, 24], [5, 24]], r, 2.6); P.rect(7, 12, 18, 2, r, 3.6); P.rect(11, 18, 10, 1, r, 1); }
    if (slot === 1) { P.poly([[3, 6], [10, 4], [13, 7], [19, 7], [22, 4], [29, 6], [29, 14], [25, 14], [25, 28], [7, 28], [7, 14], [3, 14]], r, 2.6); P.line(16, 9, 16, 27, r, 1.6); P.rect(9, 18, 14, 1, r, 3.5); }
    if (slot === 2) { P.poly([[6, 4], [26, 4], [27, 28], [19, 28], [17, 12], [15, 12], [13, 28], [5, 28]], r, 2.6); P.rect(6, 4, 20, 3, r, 3.5); P.rect(15, 7, 2, 4, r, 1.4); }
    if (slot === 3) { for (const ox of [3, 17]) P.poly([[ox, 8], [ox + 7, 8], [ox + 7, 20], [ox + 12, 21], [ox + 12, 27], [ox, 27]], r, 2.6); P.rect(3, 8, 7, 2, r, 3.5); P.rect(17, 8, 7, 2, r, 3.5); }
  });
}
function orbe(rp, simb) {
  return sprite((P) => {
    P.disc(16, 16, 12.5, rp, 1.2, 12.5, false, 3);
    P.disc(11.5, 11, 3.6, rp, 4.6, 3.2, true); P.px(10, 9, RAMP.branco, 5, true); P.px(11, 9, RAMP.branco, 5, true); P.px(10, 10, RAMP.branco, 5, true);
    simb && simb(P);
  });
}
const BR = RAMP.branco;
const ICONES = {
  [IT.GRAVETO]: () => sprite((P) => { const e = P.eixo(6, 27, A45); e.fill(0, 26, () => 1.1, RAMP.cabo, (u, v) => 2.6 + (v < 0 ? .7 : 0)); const [x, y] = e.pt(13, 1.2); P.disc(x + 1, y + 1, 1.3, RAMP.cabo, 2); }),
  [IT.CARVAO]: () => sprite((P) => { P.poly([[7, 14], [12, 7], [21, 6], [26, 12], [25, 22], [18, 26], [9, 24]], RAMP.escuro, 2.4); P.poly([[12, 8], [20, 7], [17, 13]], RAMP.escuro, 4.2); P.poly([[9, 15], [16, 14], [13, 22]], RAMP.escuro, 1.2); P.px(20, 17, BR, 1, true); P.px(14, 10, BR, 1.5, true); }),
  [IT.TRIGO]: () => sprite((P) => { for (const [x0, a] of [[11, -.25], [16, 0], [21, .25]]) { const e = P.eixo(x0 - a * 20, 30, -Math.PI / 2 + a); e.fill(0, 16, () => .5, RAMP.verde, 3); for (let k = 0; k < 6; k++) { const [x, y] = e.pt(17 + k * 2, (k % 2 ? 1.2 : -1.2)); P.disc(x, y, 1.4, RAMP.amarelo, 2.8, 1.8); } } P.rect(9, 19, 15, 2, RAMP.laranja, 2.4); }),
  [IT.FERRO]: () => barra(RAMP.F), [IT.OURO]: () => barra(RAMP.O),
  [IT.DIAMANTE]: () => sprite((P) => { P.poly([[9, 11], [13, 6], [19, 6], [23, 11], [16, 27]], RAMP.D, 2.5); P.poly([[9, 11], [23, 11], [16, 27]], RAMP.D, 1.9); P.poly([[13, 6], [16, 11], [19, 6]], RAMP.D, 4.2); P.poly([[9, 11], [13, 6], [16, 11]], RAMP.D, 3.4); P.line(12, 13, 15, 22, BR, 4.6, 1, true); }),
  [IT.FIO]: () => sprite((P) => { P.disc(16, 16, 10, RAMP.branco, 2.4); for (let k = -8; k <= 8; k += 3) P.line(16 + k - 4, 8, 16 + k + 4, 24, RAMP.branco, 1.2); P.line(24, 20, 29, 28, RAMP.branco, 2.4, 1.5); }),
  [IT.PENA]: () => sprite((P) => { const e = P.eixo(6, 27, A45); e.fill(4, 27, (u) => Math.sin(Math.PI * (u - 4) / 23) * 5, BR, (u, v) => 3 + (v < 0 ? .6 : -.6) + (Math.floor(u) % 4 === 0 ? -.8 : 0)); e.fill(0, 26, () => .4, RAMP.P, 3.5); }),
  [IT.COURO]: () => sprite((P) => { P.poly([[6, 7], [12, 9], [20, 6], [26, 9], [25, 17], [27, 25], [19, 24], [12, 27], [6, 24], [8, 16]], RAMP.couro, 2.6); for (let k = 0; k < 6; k++) P.px(10 + k * 3, 14 + (k % 2) * 4, RAMP.couro, 1.2); }),
  [IT.POLVORA]: () => sprite((P) => { P.poly([[4, 26], [10, 16], [16, 12], [22, 16], [28, 26]], RAMP.escuro, 3); for (let k = 0; k < 18; k++) P.px(8 + (k * 7) % 18, 18 + (k * 5) % 8, k % 3 ? RAMP.P : RAMP.escuro, 4, true); }),
  [IT.ESSENCIA]: () => sprite((P) => { P.poly([[16, 3], [21, 12], [24, 20], [21, 27], [11, 27], [8, 20], [11, 12]], RAMP.roxo, 2.4); P.disc(16, 20, 4.5, RAMP.roxo, 4.6, 5, true); P.disc(16, 21, 2, BR, 5, 2.2, true); P.px(13, 10, RAMP.roxo, 5, true); }),
  [IT.GOSMA]: () => sprite((P) => { P.disc(16, 18, 11, RAMP.verde, 2.2, 9, false, 2); P.disc(12, 14, 3, RAMP.verde, 5, 2.4, true); P.disc(20, 20, 2.4, RAMP.verde, .8, 2.4, true); }),
  [IT.KATANA]: () => sprite((P) => { const e = P.eixo(3, 29, A45); e.fillV(9, 34, (u) => -1.2 + Math.sin((u - 9) / 25 * Math.PI) * 1.6, (u) => (u > 31 ? -1.2 + (34 - u) * .4 : .5) + Math.sin((u - 9) / 25 * Math.PI) * 1.6, RAMP.F, (u, v) => v < -.4 + Math.sin((u - 9) / 25 * Math.PI) * 1.6 ? 4.2 : 2.6); const [x, y] = e.pt(8, 0); P.disc(x, y, 3, RAMP.O, 2.8); e.fill(1, 7, () => 1.1, RAMP.escuro, (u) => 2 + (Math.floor(u * 1.5) % 2 ? 2 : 0)); }),
  [IT.LANCA]: () => sprite((P) => { const e = P.eixo(2, 30, A45); e.fill(0, 31, () => .8, RAMP.cabo, (u, v) => 2.5 + (v < 0 ? .8 : 0)); e.fill(30, 40, (u) => Math.sin(Math.PI * (u - 30) / 10) * 3, RAMP.F, (u, v) => 2.8 + (v < 0 ? 1 : -.4)); e.fillV(28.5, 30, () => -2.2, () => 2.2, RAMP.escuro, 3); }),
  [IT.MACHADAO]: () => sprite((P) => { const e = cabo(P, 22); for (const s of [-1, 1]) e.fillV(14, 25, (u) => s > 0 ? 1 : -1.5 - Math.sin(Math.PI * (u - 14) / 11) * 8.5, (u) => s > 0 ? 1.5 + Math.sin(Math.PI * (u - 14) / 11) * 8.5 : -1, RAMP.F, (u, v) => 2.4 + (Math.abs(v) > 6 ? 1.8 : 0)); e.fill(17, 22, () => 1.8, RAMP.escuro, 2.6); }),
  [IT.ARCO]: () => sprite((P) => { for (let t = 0; t <= 1; t += .01) { const a = -Math.PI * .42 + t * Math.PI * .84; const x = 6 + Math.cos(a) * 15, y = 16 + Math.sin(a) * 13.5; P.disc(x, y, t > .4 && t < .6 ? 1.7 : 1.1, RAMP.M, 2.8 + (t > .4 && t < .6 ? -.8 : 0)); } P.line(12, 4, 12, 28, BR, 3.8, 1, true); }),
  [IT.BESTA]: () => sprite((P) => { const e = P.eixo(4, 28, A45); e.fill(0, 26, () => 1.6, RAMP.M, (u, v) => 2.4 + (v < 0 ? .8 : 0)); for (let t = -1; t <= 1; t += .02) { const [x, y] = e.pt(20 - t * t * 4, t * 12); P.disc(x, y, 1.1, RAMP.F, 2.6); } const [a0, a1] = e.pt(16, -12), [b0, b1] = e.pt(16, 12); P.line(a0, a1, b0, b1, BR, 3.6, 1, true); e.fill(22, 30, () => .5, RAMP.F, 4); }),
  [IT.FLECHA]: () => sprite((P) => { const e = P.eixo(4, 28, A45); e.fill(4, 25, () => .55, RAMP.cabo, 3); e.fill(24, 30, (u) => (30 - u) * .45, RAMP.F, (u, v) => 3 + (v < 0 ? .8 : 0)); for (const s of [-1, 1]) e.fillV(1, 8, (u) => s > 0 ? .5 : -3 + (u - 1) * .25, (u) => s > 0 ? 3 - (u - 1) * .25 : -.5, s > 0 ? RAMP.vermelho : BR, 3); }),
  [IT.PISTOLA]: () => sprite((P) => { P.rect(5, 9, 22, 6, RAMP.escuro, 3); P.rect(5, 9, 22, 1, RAMP.escuro, 4.6); for (let x = 9; x < 17; x += 2) P.rect(x, 10, 1, 3, RAMP.escuro, 1.2); P.rect(26, 11, 3, 2, RAMP.escuro, 1.5); P.poly([[8, 15], [15, 15], [13, 27], [6, 27]], RAMP.M, 2.6); P.rect(15, 15, 5, 1, RAMP.escuro, 2); P.line(19, 15, 18, 19, RAMP.escuro, 2.2); P.line(15, 19, 18, 19, RAMP.escuro, 2.2); }),
  [IT.RIFLE]: () => sprite((P) => { P.rect(9, 11, 21, 4, RAMP.escuro, 2.8); P.rect(26, 12, 5, 2, RAMP.escuro, 1.8); P.poly([[1, 12], [10, 11], [10, 16], [3, 20], [1, 19]], RAMP.M, 2.6); P.rect(13, 7, 9, 3, RAMP.escuro, 3.6); P.disc(21.5, 8.5, 1.2, RAMP.ciano, 4.5, 1.2, true); P.poly([[16, 15], [20, 15], [21, 23], [17, 23]], RAMP.escuro, 2); P.poly([[12, 15], [14, 15], [13, 20], [11, 20]], RAMP.M, 2.2); }),
  [IT.ESCOPETA]: () => sprite((P) => { P.rect(8, 10, 23, 2, RAMP.escuro, 3.4); P.rect(8, 12, 23, 2, RAMP.escuro, 2.4); P.rect(16, 14, 9, 3, RAMP.M, 2.8); for (let x = 17; x < 25; x += 2) P.px(x, 15, RAMP.M, 1.4); P.poly([[1, 12], [9, 10], [11, 15], [4, 20], [1, 19]], RAMP.M, 2.6); P.rect(10, 14, 3, 3, RAMP.escuro, 2); }),
  [IT.MUNICAO]: () => sprite((P) => { for (const x of [7, 14, 21]) { P.rect(x, 13, 5, 14, RAMP.latao, 2.8); P.rect(x, 26, 5, 2, RAMP.latao, 1.4); P.poly([[x, 13], [x + 5, 13], [x + 4, 8], [x + 2.5, 6], [x + 1, 8]], RAMP.laranja, 2.4); } }),
  [IT.GRANADA]: () => sprite((P) => { P.disc(15, 19, 8.5, RAMP.verde, 2, 9.5, false, 1.6); for (let k = 12; k < 28; k += 4) P.line(7, k, 23, k, RAMP.verde, .9); for (let k = 9; k < 23; k += 4) P.line(k, 10, k, 28, RAMP.verde, .9); P.rect(12, 7, 6, 4, RAMP.F, 2.6); P.line(18, 8, 26, 14, RAMP.F, 3, 1.5); P.disc(23, 6, 2.5, RAMP.F, 3, 2.5); P.disc(23, 6, 1.2, RAMP.F, 0, 1.2, true); }),
  [IT.ISQUEIRO]: () => sprite((P) => { P.rect(9, 13, 14, 15, RAMP.F, 2.8); P.rect(9, 9, 14, 4, RAMP.F, 3.6); P.rect(9, 13, 14, 1, RAMP.F, 1); P.poly([[16, 2], [20, 8], [16, 9], [12, 8]], RAMP.laranja, 3.4, true); P.disc(16, 6.5, 1.3, RAMP.amarelo, 5, 1.6, true); }),
  [IT.CARNE]: () => carne(RAMP.carne), [IT.CARNE_A]: () => carne(RAMP.assado, true),
  [IT.FRANGO]: () => coxa(RAMP.pele), [IT.FRANGO_A]: () => coxa(RAMP.assado),
  [IT.PAO]: () => sprite((P) => { P.disc(16, 18, 13, RAMP.pao, 2.4, 7.5, false, 1.4); for (const x of [9, 15, 21]) P.line(x, 13, x + 4, 17, RAMP.pao, 4.2, 1.4); }),
  [IT.MACA]: () => sprite((P) => { P.disc(12, 18, 7.5, RAMP.vermelho, 2.2, 8.5, false, 1.6); P.disc(20, 18, 7.5, RAMP.vermelho, 2.2, 8.5, false, 1.6); P.disc(11, 14, 2, RAMP.vermelho, 5, 2.6, true); P.line(16, 10, 18, 4, RAMP.cabo, 2.2, 1.5); P.poly([[18, 6], [24, 3], [27, 6], [21, 8]], RAMP.verde, 3); }),
  // cultura pop (originais)
  [IT.SABRE]: () => sprite((P) => { const e = P.eixo(4, 28, A45); e.fill(10, 33, () => 2.2, RAMP.ciano, (u, v) => Math.abs(v) < .8 ? 5.5 : 3.6, true); e.fill(10, 33, () => .7, BR, 5.5, true); e.fill(0, 10, () => 1.8, RAMP.F, (u, v) => 2.4 + (v < 0 ? 1 : 0) + (Math.floor(u) % 3 === 0 ? -1 : 0)); const [x, y] = e.pt(6, -1.9); P.px(x, y, RAMP.vermelho, 4, true); }),
  [IT.MARTELO]: () => sprite((P) => { const e = P.eixo(5, 28, A45); e.fill(0, 17, () => 1.1, RAMP.couro, (u) => 2.4 + (Math.floor(u * 1.3) % 2 ? .8 : -.2)); e.fillV(15, 25, () => -7.5, () => 7.5, RAMP.F, (u, v) => 2.5 + (u > 23.5 ? 1.2 : 0) + (v < -6 ? 1 : 0)); const pts = [[19, -1], [21, 2], [18.5, 1], [21, 5]]; for (let k = 0; k < 3; k++) { const [a, b] = e.pt(pts[k][0], pts[k][1] * 1.4), [c, d] = e.pt(pts[k + 1][0], pts[k + 1][1] * 1.4); P.line(a, b, c, d, RAMP.amarelo, 4.5, 1.2, true); } }),
  [IT.ESCUDO_B]: () => sprite((P) => { P.disc(16, 16, 13.5, RAMP.O, 2.4, 13.5, false, 1); P.disc(16, 16, 10.5, RAMP.ciano, 2.6, 10.5); P.disc(16, 16, 7.5, RAMP.O, 2.8, 7.5); P.disc(16, 18, 3, RAMP.ciano, 3.5); for (const [x, y] of [[12, 13], [14.5, 11], [17.5, 11], [20, 13]]) P.disc(x, y, 1.3, RAMP.ciano, 3.5); }),
  [IT.TEIAS]: () => sprite((P) => { P.rect(6, 12, 14, 11, RAMP.vermelho, 2.6); P.rect(8, 14, 10, 7, RAMP.escuro, 3); P.disc(13, 17.5, 2.3, RAMP.ciano, 4.5, 2.3, true); for (let k = 0; k < 5; k++) P.line(20, 17.5, 30, 6 + k * 5, BR, 4.5, 1, true); for (const r of [4, 7]) for (let a = -.9; a < .9; a += .05) P.px(20 + Math.cos(a) * r, 17.5 + Math.sin(a) * r, BR, 4.5, true); }),
  [IT.GANCHO]: () => sprite((P) => { for (let t = 0; t < 1; t += .02) P.disc(4 + t * 14 + Math.sin(t * 12) * 1.2, 28 - t * 14, .8, RAMP.cabo, 3); P.line(18, 14, 23, 9, RAMP.F, 2.6, 2.2); for (const a of [-1.6, 0, 1.6]) for (let t = 0; t < 1; t += .05) { const ang = -Math.PI / 4 + a * .55 + t * a * .5; P.disc(23 + Math.cos(ang) * t * 7, 9 + Math.sin(ang) * t * 7, 1.2 * (1 - t * .5), RAMP.F, 3); } }),
  [IT.JETPACK]: () => sprite((P) => { for (const x of [6, 17]) { P.rect(x, 5, 9, 18, RAMP.F, 2.4); P.disc(x + 4.5, 5, 4.5, RAMP.F, 3, 2.5); P.rect(x + 2, 23, 5, 3, RAMP.escuro, 2.5); P.poly([[x + 2, 26], [x + 7, 26], [x + 4.5, 31]], RAMP.laranja, 3.5, true); } P.rect(14, 9, 4, 10, RAMP.vermelho, 2.6); P.rect(8, 10, 5, 2, RAMP.vermelho, 3); P.rect(19, 10, 5, 2, RAMP.vermelho, 3); }),
  [IT.GARRAS]: () => sprite((P) => { P.poly([[5, 18], [18, 16], [22, 22], [20, 29], [7, 29]], RAMP.couro, 2.5); for (const k of [0, 1, 2]) P.poly([[10 + k * 4, 18], [13 + k * 4, 18], [21 + k * 3.2, 2], [19.5 + k * 3.2, 2]], RAMP.F, 3.2); }),
  [IT.VARINHA]: () => sprite((P) => { const e = P.eixo(5, 27, A45); e.fill(0, 19, (u) => .9 - u * .015, RAMP.escuro, (u, v) => 2.6 + (v < 0 ? 1 : 0)); e.fill(0, 5, () => 1.3, RAMP.O, 3); const [x, y] = e.pt(22, 0); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; P.poly([[x, y], [x + Math.cos(a + .4) * 2, y + Math.sin(a + .4) * 2], [x + Math.cos(a) * 6, y + Math.sin(a) * 6], [x + Math.cos(a - .4) * 2, y + Math.sin(a - .4) * 2]], RAMP.amarelo, 4, true); } P.px(x, y, BR, 5, true); }),
  [IT.P_ENCOLHER]: () => pocao(RAMP.azul), [IT.P_CRESCER]: () => pocao(RAMP.vermelho),
  [IT.O_TEMPO]: () => sprite((P) => { P.disc(16, 18, 11, RAMP.O, 2.4, 11, false, 1); P.disc(16, 18, 8.5, BR, 3.5); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; P.px(16 + Math.cos(a) * 7, 18 + Math.sin(a) * 7, RAMP.escuro, 1, true); } P.line(16, 18, 16, 12, RAMP.escuro, 1, 1, true); P.line(16, 18, 20, 20, RAMP.escuro, 1, 1, true); P.rect(14, 4, 4, 3, RAMP.O, 3); P.disc(16, 3, 2, RAMP.O, 2.6); }),
  [IT.O_CLONE]: () => sprite((P) => { P.disc(16, 19, 10, RAMP.ciano, 3, 9, true); P.poly([[7, 14], [9, 4], [14, 11]], RAMP.ciano, 3.4, true); P.poly([[25, 14], [23, 4], [18, 11]], RAMP.ciano, 3.4, true); P.disc(12, 18, 1.6, BR, 5, 2.2, true); P.disc(20, 18, 1.6, BR, 5, 2.2, true); for (let y = 10; y < 29; y += 3) P.line(6, y, 26, y, RAMP.ciano, 5, 1, true); }),
  [IT.O_FORCA]: () => sprite((P) => { P.poly([[6, 14], [9, 8], [24, 8], [27, 13], [27, 22], [22, 28], [10, 28], [6, 22]], RAMP.vermelho, 2.6); for (const x of [11, 15.5, 20]) P.line(x, 9, x, 15, RAMP.vermelho, 1.2); P.rect(8, 24, 17, 4, RAMP.amarelo, 2.8); }),
  [IT.O_NOITE]: () => sprite((P) => { P.rect(3, 12, 26, 3, RAMP.escuro, 3); for (const x of [9, 23]) { P.disc(x, 17, 6, RAMP.escuro, 2.4); P.disc(x, 17, 4.2, RAMP.verde, 4, 4.2, true); P.disc(x - 1.5, 15.5, 1.2, BR, 5, 1.2, true); } P.rect(14, 16, 4, 2, RAMP.escuro, 2.6); }),
  [IT.BOTAS_P]: () => sprite((P) => { for (const ox of [3, 17]) { P.poly([[ox, 4], [ox + 7, 4], [ox + 7, 13], [ox + 12, 14], [ox + 12, 19], [ox, 19]], RAMP.azul, 2.6); for (let k = 0; k < 4; k++) P.line(ox + 2, 21 + k * 2.4, ox + 10, 20 + k * 2.4, RAMP.F, 3.4, 1.2); } }),
  [IT.O_SING]: () => sprite((P) => { for (let a = 0; a < 6.3; a += .03) for (let r = 10; r < 14; r += .5) P.px(16 + Math.cos(a) * r, 16 + Math.sin(a) * r * .45, a % 1.2 < .6 ? RAMP.laranja : RAMP.amarelo, 3.5 + (r < 12 ? 1 : 0), true); P.disc(16, 16, 8.5, RAMP.escuro, 0, 8.5, true); P.disc(16, 16, 9.5, RAMP.branco, 4.5, 9.5, true); P.disc(16, 16, 8.3, RAMP.escuro, 0, 8.3, true); }),
  [IT.O_ANIQ]: () => sprite((P) => { P.disc(16, 16, 13.5, RAMP.amarelo, 3, 13.5, false, 2); P.disc(16, 16, 9, RAMP.branco, 4.5, 9, true); for (let a = 0; a < 6.3; a += .05) { P.px(16 + Math.cos(a) * 11, 16 + Math.sin(a) * 4, RAMP.ciano, 4, true); P.px(16 + Math.cos(a) * 4, 16 + Math.sin(a) * 11, RAMP.ciano, 4, true); } P.disc(16, 16, 4, BR, 5, 4, true); }),
  [IT.O_CUPULA]: () => sprite((P) => { P.disc(16, 20, 13, RAMP.escuro, 1.6, 11, false, 1); P.rect(2, 21, 28, 9, RAMP.escuro, 0, true); P.rect(3, 26, 26, 3, RAMP.verde, 2.4); for (const [x, y] of [[9, 14], [16, 11], [22, 15], [12, 19], [19, 19], [25, 21], [7, 21]]) P.px(x, y, BR, 5, true); P.px(16, 10, BR, 5, true); P.px(15, 11, BR, 5, true); P.px(17, 11, BR, 5, true); }),
  [IT.MOEDA]: () => sprite((P) => { P.disc(16, 16, 12, RAMP.O, 2.4, 12, false, 1.2); P.disc(16, 16, 9, RAMP.O, 3.3, 9); P.poly([[9, 16], [14, 12], [20, 14], [24, 11], [24, 21], [20, 18], [14, 20]], RAMP.O, 1.6); P.px(12, 15, RAMP.escuro, 1, true); }),
  [IT.O_RAJADA]: () => orbe(RAMP.azul, (P) => { for (let t = 0; t < 1; t += .01) { const a = t * Math.PI * 4, r = t * 9; P.px(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, BR, 5, true); } }),
};
const SIMB = {
  fogo: (P) => { P.poly([[16, 7], [21, 15], [20, 23], [16, 25], [12, 23], [11, 15]], RAMP.amarelo, 4, true); P.disc(16, 20, 2.5, BR, 5, 3, true); },
  raio: (P) => P.poly([[18, 5], [10, 17], [16, 17], [13, 27], [22, 13], [16, 13]], BR, 5, true),
  gelo: (P) => { for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; P.line(16 - Math.cos(a) * 8, 16 - Math.sin(a) * 8, 16 + Math.cos(a) * 8, 16 + Math.sin(a) * 8, BR, 5, 1.4, true); } },
  salto: (P) => { P.poly([[16, 6], [24, 15], [19, 15], [19, 25], [13, 25], [13, 15], [8, 15]], BR, 5, true); },
  veloc: (P) => { for (let k = 0; k < 3; k++) P.poly([[8 + k * 6, 9], [14 + k * 6, 16], [8 + k * 6, 23], [11 + k * 6, 16]], BR, 5, true); },
  onda: (P) => { for (const r of [4, 7, 10]) for (let a = 0; a < 6.3; a += .08) P.px(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, BR, 5, true); },
  telep: (P) => { for (let t = 0; t < 1; t += .01) { const a = t * Math.PI * 5, r = 2 + t * 8; P.px(16 + Math.cos(a) * r, 16 + Math.sin(a) * r, BR, 5, true); } },
  cura: (P) => { P.rect(14, 8, 4, 16, BR, 5, true); P.rect(8, 14, 16, 4, BR, 5, true); },
  escav: (P) => { P.poly([[7, 12], [16, 6], [25, 12], [16, 9]], BR, 5, true); P.line(16, 9, 16, 26, BR, 5, 2.2, true); },
  laser: (P) => { P.line(6, 26, 26, 6, BR, 5, 2.4, true); P.disc(26, 6, 2.2, BR, 5, 2.2, true); },
  escudo: (P) => P.poly([[16, 6], [25, 9], [24, 18], [16, 26], [8, 18], [7, 9]], BR, 5, true),
  invis: (P) => { P.disc(16, 16, 8, BR, 5, 4.5, true); P.disc(16, 16, 3, RAMP.escuro, 2, 3, true); P.line(6, 25, 26, 7, RAMP.escuro, 1, 1.4, true); },
  agua: (P) => { for (const [x, y, r] of [[12, 20, 3.5], [20, 14, 2.6], [15, 10, 1.8]]) { for (let a = 0; a < 6.3; a += .1) P.px(x + Math.cos(a) * r, y + Math.sin(a) * r, BR, 5, true); } },
};
const ORBES_EXTRA = {
  repul: [RAMP.amarelo, (P) => { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; P.line(16 + Math.cos(a) * 3, 16 + Math.sin(a) * 3, 16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, BR, 5, 1.6, true); } P.disc(16, 16, 2.5, BR, 5, 2.5, true); }],
  barr: [RAMP.ciano, (P) => { const pts = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; pts.push([16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9]); } for (let k = 0; k < 6; k++) P.line(pts[k][0], pts[k][1], pts[(k + 1) % 6][0], pts[(k + 1) % 6][1], BR, 5, 1.4, true); P.line(16, 7, 16, 25, BR, 5, 1, true); }],
  meteoro: [RAMP.laranja, (P) => { P.line(9, 9, 18, 18, RAMP.amarelo, 5, 3, true); P.disc(20, 20, 4.5, RAMP.escuro, 2.6); P.px(19, 18, BR, 5, true); }],
  tornado: [RAMP.branco, (P) => { for (let k = 0; k < 6; k++) P.line(9 + k * .8, 8 + k * 3, 23 - k * 1.6, 8 + k * 3, RAMP.escuro, 2.4, 1.5, true); }],
  terremoto: [RAMP.couro, (P) => { P.poly([[6, 14], [26, 14], [26, 24], [6, 24]], RAMP.M, 3); P.line(12, 14, 15, 19, RAMP.escuro, 1, 1.4, true); P.line(15, 19, 13, 24, RAMP.escuro, 1, 1.4, true); P.line(20, 14, 18, 20, RAMP.escuro, 1, 1.4, true); P.line(18, 20, 21, 24, RAMP.escuro, 1, 1.4, true); }],
  dragao: [RAMP.vermelho, (P) => { P.poly([[7, 12], [17, 9], [19, 14], [13, 18], [7, 17]], RAMP.verde, 3); P.px(13, 12, RAMP.amarelo, 5, true); P.poly([[18, 13], [27, 9], [26, 22], [18, 17]], RAMP.amarelo, 4.5, true); }],
  corrente: [RAMP.azul, (P) => { P.poly([[10, 6], [6, 15], [11, 15], [8, 25], [16, 13], [11, 13], [14, 6]], BR, 5, true); P.poly([[21, 9], [18, 16], [22, 16], [20, 24], [26, 15], [22, 15], [24, 9]], BR, 5, true); }],
  grav: [RAMP.roxo, (P) => { P.rect(12, 12, 8, 8, BR, 4.5, true); for (const [x, y] of [[16, 6], [16, 26], [6, 16], [26, 16]]) P.disc(x, y, 1.6, BR, 5, 1.6, true); }],
};
const ORBES = { fogo: RAMP.laranja, raio: RAMP.amarelo, gelo: RAMP.ciano, salto: RAMP.verde, veloc: RAMP.amarelo, onda: RAMP.roxo, telep: RAMP.roxo, cura: RAMP.rosa, escav: RAMP.laranja, laser: RAMP.vermelho, escudo: RAMP.azul, invis: RAMP.branco, agua: RAMP.ciano };
function barra(r) { return sprite((P) => { P.poly([[4, 18], [12, 12], [28, 12], [20, 18]], r, 4.2); P.poly([[4, 18], [20, 18], [20, 25], [4, 25]], r, 2.6); P.poly([[20, 18], [28, 12], [28, 19], [20, 25]], r, 1.4); P.line(7, 17, 18, 13, BR, 5, 1, true); }); }
function carne(r, assada) { return sprite((P) => { P.poly([[5, 12], [12, 6], [24, 6], [28, 13], [26, 22], [17, 27], [8, 24]], r, 2.5); P.line(9, 23, 24, 8, assada ? RAMP.pao : BR, assada ? 4 : 3.4, 2.2); P.disc(21, 18, 2.6, BR, 4.5, 2.6, true); P.disc(21, 18, 1.2, RAMP.F, 2, 1.2, true); if (assada) for (const k of [0, 6, 12]) P.line(8 + k, 10, 13 + k, 21, r, .4, 1); }); }
function coxa(r) { return sprite((P) => { P.disc(19, 13, 9, r, 2.4, 8, false, 1.4); P.line(13, 19, 6, 26, BR, 3.4, 3); P.disc(5, 27, 2.2, BR, 3.6); P.disc(7.5, 28.5, 2, BR, 3); }); }
function pocao(rp) { return sprite((P) => { P.disc(16, 21, 9.5, RAMP.vidro, 3.6, 8.5); P.disc(16, 22.5, 8, rp, 2.6, 6.5, false, 1.4); P.rect(13, 6, 6, 8, RAMP.vidro, 3.4); P.rect(12, 3, 8, 4, RAMP.cabo, 2.8); P.disc(12, 19, 1.6, BR, 5, 2.4, true); }); }
const cache = {};
function src(id) {
  if (cache[id]) return cache[id];
  const it = ITEMS[id]; let c = null;
  if (id < 100) c = blockIcon(id);
  else if (ICONES[id]) c = ICONES[id]();
  else if (it && it.armor != null) c = armadura(it.armor, it.mat || 'F');
  else if (it && it.mat && it.tool && !it.arma) c = ferramenta(it.tool, it.mat);
  else if (it && it.mat && it.arma === 'melee') c = ferramenta('esp', it.mat);
  else if (it && it.poder && ORBES[it.poder]) c = orbe(ORBES[it.poder], SIMB[it.poder]);
  else if (it && it.poder && ORBES_EXTRA[it.poder]) c = orbe(ORBES_EXTRA[it.poder][0], ORBES_EXTRA[it.poder][1]);
  else if (it && it.poder === 'asas') c = sprite((P) => { for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const L = 13 - k * 1.3; P.line(16 + s * 2, 8 + k * 2.4, 16 + s * (2 + L), 4 + k * 3.3, k % 2 ? RAMP.branco : BR, 4 - (k % 2), 2.4); } P.disc(16, 16, 2.6, RAMP.amarelo, 3.5); });
  if (!c) c = sprite((P) => P.disc(16, 16, 10, RAMP.rosa, 3));
  return (cache[id] = c);
}
export function iconClone(id) { const s = src(id); const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0); return c; }
export const iconCanvas = src;
