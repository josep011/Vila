// Sons sintetizados na hora (nenhum arquivo de áudio).
let ctx = null, master = null, ligado = true;
export function iniciarSom() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination); } catch (e) { ctx = null; }
}
let vol = .5;
export function setSom(v) { ligado = v; if (master) master.gain.value = v ? vol : 0; }
export function setVolume(v) { vol = v; if (master) master.gain.value = ligado ? v : 0; }
const now = () => ctx.currentTime;
function ruido(dur) { const n = Math.max(1, Math.floor(ctx.sampleRate * dur)); const b = ctx.createBuffer(1, n, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; return s; }
function env(node, t0, a, peak, dec) { const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(.0008, t0 + a + dec); node.connect(g); return g; }
function noiseHit(dur, freq, q, vol, type = 'bandpass', vol2) { const t = now(); const s = ruido(dur); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f); const g = env(f, t, .004, vol, dur); g.connect(master); s.start(t); s.stop(t + dur + .05); }
function tom(freq, dur, vol, type = 'sine', slide = 0, delay = 0) { const t = now() + delay; const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur); const g = env(o, t, .006, vol, dur); g.connect(master); o.start(t); o.stop(t + dur + .05); }
const SONS = {
  quebrar: (m) => noiseHit(.12, m === 'pedra' ? 1800 : m === 'madeira' ? 700 : 400, 1.2, .5),
  bater: (m) => noiseHit(.05, m === 'pedra' ? 2200 : m === 'madeira' ? 900 : 500, 2, .22),
  colocar: () => { noiseHit(.08, 500, 1, .4); tom(140, .08, .2, 'sine', .6); },
  passo: () => noiseHit(.05, 300 + Math.random() * 200, 1, .08),
  pegar: () => { tom(880, .07, .12, 'triangle', 1.4); tom(1320, .07, .08, 'triangle', 1.2, .05); },
  dano: () => { tom(320, .18, .3, 'square', .5); noiseHit(.1, 800, 1, .2); },
  acertar: () => { noiseHit(.07, 1200, 1.5, .35); tom(180, .08, .2, 'triangle', .6); },
  morrerMob: () => { tom(400, .35, .25, 'triangle', .3); },
  arco: () => { tom(260, .15, .25, 'triangle', 1.8); noiseHit(.08, 3000, 3, .1); },
  tiro: () => { noiseHit(.18, 900, .7, .9, 'lowpass'); tom(90, .12, .5, 'sine', .4); },
  escopeta: () => { noiseHit(.35, 600, .6, 1, 'lowpass'); tom(70, .2, .6, 'sine', .4); },
  explosao: () => { noiseHit(1.1, 220, .5, 1.2, 'lowpass'); tom(55, .8, .8, 'sine', .3); },
  fogo: () => { noiseHit(.4, 900, .8, .5, 'bandpass'); tom(200, .3, .2, 'sawtooth', 2); },
  raio: () => { noiseHit(.9, 3000, .3, .9, 'highpass'); tom(60, .9, .6, 'sawtooth', .5); },
  gelo: () => { tom(1600, .25, .15, 'sine', .5); tom(2400, .2, .1, 'sine', .6, .04); },
  magia: () => { tom(500, .3, .2, 'sine', 2.2); tom(750, .3, .12, 'triangle', 2, .06); },
  cura: () => { [523, 659, 784, 1046].forEach((f, i) => tom(f, .25, .12, 'sine', 1, i * .07)); },
  laser: () => tom(1400 + Math.random() * 200, .07, .06, 'sawtooth', .8),
  comer: () => { for (let i = 0; i < 3; i++) setTimeout(() => ctx && noiseHit(.07, 1400, 2, .25), i * 110); },
  miau: () => { const t = now(); const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(880, t + .12); o.frequency.linearRampToValueAtTime(420, t + .45); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2; o.connect(f); const g = env(f, t, .03, .35, .45); g.connect(master); o.start(t); o.stop(t + .55); },
  mob: (tipo) => { const f = { vaca: 120, porco: 260, galinha: 900, ovelha: 330, sombra: 90, espantalho: 160, aranha: 600, gosma: 200 }[tipo] || 200; tom(f, .35, .18, tipo === 'galinha' ? 'square' : 'sawtooth', tipo === 'sombra' ? .6 : 1.3); },
  clique: () => tom(1000, .03, .08, 'square'),
  dormir: () => { [392, 330, 262].forEach((f, i) => tom(f, .5, .12, 'sine', 1, i * .25)); },
  fusivel: () => noiseHit(2.5, 4000, .5, .15, 'highpass'),
};
export function som(nome, arg) { if (!ctx || !ligado) return; try { SONS[nome] && SONS[nome](arg); } catch (e) {} }
