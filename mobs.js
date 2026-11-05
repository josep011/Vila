// Criaturas: animais da fazenda e monstros noturnos (modelos toy low-poly originais).
import * as THREE from 'three';
import { getBlock, mover, surfaceY, VH, VILLAGE_R } from './mundo.js';
import { B, SOLID } from './blocos.js';
import { IT } from './itens.js';

const V3 = THREE.Vector3;
let C = null;            // contexto vindo do main
export const mobs = [];
export function initMobs(ctx) { C = ctx; }

const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const ball = (r, m, a = 7, b = 5) => new THREE.Mesh(new THREE.SphereGeometry(r, a, b), m);
function legGroup(g, x, y, z, len, r, mat) { const p = new THREE.Group(); p.position.set(x, y, z); const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .9, len, 6), mat); l.position.y = -len / 2; p.add(l); g.add(p); return p; }

const DEF = {
  vaca: { hp: 10, hw: .45, h: 1.3, sp: 1.1, pass: true, drops: () => [[IT.COURO, rnd(0, 2)], [IT.CARNE, rnd(1, 3)]] },
  porco: { hp: 10, hw: .4, h: .9, sp: 1.2, pass: true, drops: () => [[IT.CARNE, rnd(1, 3)]] },
  galinha: { hp: 4, hw: .25, h: .7, sp: 1.3, pass: true, drops: () => [[IT.PENA, rnd(0, 2)], [IT.FRANGO, 1]] },
  ovelha: { hp: 8, hw: .42, h: 1.2, sp: 1.1, pass: true, drops: () => [[B.WOOL, 1], [IT.CARNE, rnd(0, 2)]] },
  sombra: { hp: 20, hw: .3, h: 1.8, sp: 2.6, dmg: 3, cd: 1, sol: true, drops: () => [[IT.ESSENCIA, Math.random() < .55 ? 1 : 0], [IT.POLVORA, rnd(0, 1)]] },
  espantalho: { hp: 18, hw: .3, h: 1.8, sp: 2.2, dmg: 3, cd: 1.6, ranged: true, sol: true, drops: () => [[IT.FLECHA, rnd(0, 3)], [IT.GRAVETO, rnd(0, 2)], [B.HAY, Math.random() < .2 ? 1 : 0]] },
  aranha: { hp: 14, hw: .6, h: .8, sp: 3.2, dmg: 2, cd: .9, drops: () => [[IT.FIO, rnd(0, 2)]] },
  gosma: { hp: 12, hw: .5, h: 1, sp: 2.2, dmg: 2, cd: 1, hop: true, drops: () => [[IT.GOSMA, rnd(1, 2)]] },
  gosminha: { hp: 4, hw: .25, h: .5, sp: 2.4, dmg: 1, cd: 1, hop: true, drops: () => [[IT.GOSMA, rnd(0, 1)]] },
};
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

function modelo(tipo) {
  const g = new THREE.Group(); const p = { legs: [] };
  if (tipo === 'vaca') {
    const w = M('#f4f1ea'), s = M('#4a3a32'), pk = M('#f0a8b0'), hn = M('#e8dcc0');
    const b = box(.8, .62, 1.2, w); b.position.y = .85; g.add(b);
    for (const [x, y, z, sx, sz] of [[.41, .95, .1, .02, .5], [-.41, .8, -.25, .02, .4], [.2, 1.17, .3, .35, .02 + .3]]) { const sp = box(sx || .02, .3, sz, s); sp.position.set(x, y, z); if (x === .2) { sp.scale.set(1, .1, 1); } g.add(sp); }
    const h = new THREE.Group(); h.position.set(0, 1.05, -.7); g.add(h); p.head = h;
    h.add(box(.5, .46, .44, w)); const sn = box(.42, .22, .14, pk); sn.position.set(0, -.12, -.27); h.add(sn);
    for (const sx of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 5), hn); horn.position.set(sx * .2, .3, 0); h.add(horn); const e = box(.07, .07, .02, s); e.position.set(sx * .13, .06, -.23); h.add(e); }
    for (const [x, z] of [[-.28, -.42], [.28, -.42], [-.28, .42], [.28, .42]]) p.legs.push(legGroup(g, x, .55, z, .55, .1, w));
  } else if (tipo === 'porco') {
    const pk = M('#f4a6b6'), dk = M('#d97f92'), e = M('#2a2228');
    const b = ball(.45, pk); b.scale.set(1, .8, 1.3); b.position.y = .55; g.add(b);
    const h = new THREE.Group(); h.position.set(0, .66, -.55); g.add(h); p.head = h;
    const hd = ball(.3, pk); h.add(hd); const sn = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .1, 8), dk); sn.rotation.x = Math.PI / 2; sn.position.z = -.3; h.add(sn);
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.09, .16, 4), dk); ear.position.set(sx * .18, .26, .02); ear.rotation.z = -sx * .4; h.add(ear); const ey = ball(.04, e, 5, 4); ey.position.set(sx * .12, .08, -.26); h.add(ey); }
    for (const [x, z] of [[-.2, -.3], [.2, -.3], [-.2, .32], [.2, .32]]) p.legs.push(legGroup(g, x, .28, z, .28, .08, pk));
  } else if (tipo === 'galinha') {
    const w = M('#fbfaf4'), r = M('#e23b3b'), y = M('#f2b234'), e = M('#222');
    const b = ball(.26, w); b.scale.set(1, .95, 1.15); b.position.y = .38; g.add(b);
    const h = new THREE.Group(); h.position.set(0, .62, -.2); g.add(h); p.head = h;
    h.add(ball(.15, w)); const bk = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 4), y); bk.rotation.x = -Math.PI / 2; bk.position.set(0, -.01, -.17); h.add(bk);
    const cm = box(.04, .1, .14, r); cm.position.set(0, .15, -.02); h.add(cm); const wt = ball(.04, r, 5, 4); wt.position.set(0, -.08, -.13); h.add(wt);
    for (const sx of [-1, 1]) { const ey = ball(.025, e, 5, 4); ey.position.set(sx * .1, .04, -.1); h.add(ey); const wing = ball(.14, w); wing.scale.set(.35, .8, 1); wing.position.set(sx * .25, .4, 0); g.add(wing); }
    for (const x of [-.09, .09]) p.legs.push(legGroup(g, x, .18, 0, .18, .025, y));
  } else if (tipo === 'ovelha') {
    const wl = M('#f2f0ea'), f = M('#3a3236'), pk = M('#f6c0c8');
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.5, 1), wl); b.scale.set(.95, .85, 1.25); b.position.y = .82; g.add(b);
    const h = new THREE.Group(); h.position.set(0, .95, -.62); g.add(h); p.head = h;
    const hd = box(.32, .34, .34, f); h.add(hd); const top = new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 1), wl); top.position.y = .17; h.add(top);
    for (const sx of [-1, 1]) { const ear = box(.18, .06, .1, f); ear.position.set(sx * .22, .05, 0); h.add(ear); const ey = box(.06, .05, .02, M('#fff')); ey.position.set(sx * .09, .05, -.18); h.add(ey); }
    const ns = box(.1, .05, .02, pk); ns.position.set(0, -.08, -.18); h.add(ns);
    for (const [x, z] of [[-.22, -.38], [.22, -.38], [-.22, .38], [.22, .38]]) p.legs.push(legGroup(g, x, .45, z, .45, .07, f));
  } else if (tipo === 'sombra') {
    // vulto encapuzado com olhos brilhantes, flutua de leve
    const cl = M('#2a1f3d'), dk = M('#140e20'), eye = new THREE.MeshBasicMaterial({ color: '#7ff6ff' });
    const capa = new THREE.Mesh(new THREE.ConeGeometry(.42, 1.35, 7, 1, true), cl); capa.position.y = .8; g.add(capa); const fundo = new THREE.Mesh(new THREE.CircleGeometry(.42, 7), dk); fundo.rotation.x = Math.PI / 2; fundo.position.y = .13; g.add(fundo);
    const h = new THREE.Group(); h.position.set(0, 1.5, 0); g.add(h); p.head = h;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.3, 7, 5, 0, Math.PI * 2, 0, Math.PI * .75), cl); h.add(cap); const rosto = ball(.24, dk); rosto.position.z = -.07; h.add(rosto);
    for (const sx of [-1, 1]) { const e = ball(.05, eye, 6, 4); e.scale.set(1.3, .7, .5); e.position.set(sx * .09, .02, -.28); h.add(e); }
    for (const sx of [-1, 1]) { const m = ball(.09, dk, 5, 4); m.position.set(sx * .45, .95, -.15); g.add(m); p.legs.push(m); }
    p.flutua = true;
  } else if (tipo === 'espantalho') {
    const saco = M('#cdb07a'), pa = M('#e2c45c'), pau = M('#7a5634'), roupa = M('#4a6a8a'), lin = M('#3a2a1a'), chap = M('#8a6a3a');
    const corpo = box(.5, .7, .3, roupa); corpo.position.y = 1.05; g.add(corpo);
    const h = new THREE.Group(); h.position.set(0, 1.62, 0); g.add(h); p.head = h;
    const hd = ball(.26, saco); h.add(hd);
    const aba = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .04, 9), chap); aba.position.y = .2; h.add(aba); const copa = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, .22, 8), chap); copa.position.y = .32; h.add(copa);
    for (const sx of [-1, 1]) { const x1 = box(.08, .02, .02, lin); x1.position.set(sx * .1, .05, -.25); x1.rotation.z = .8; h.add(x1); const x2 = x1.clone(); x2.rotation.z = -.8; h.add(x2); }
    const boca = box(.2, .02, .02, lin); boca.position.set(0, -.09, -.25); h.add(boca);
    for (const sx of [-1, 1]) { const braco = box(.5, .1, .1, roupa); braco.position.set(sx * .48, 1.32, 0); g.add(braco); const palha = new THREE.Mesh(new THREE.ConeGeometry(.08, .18, 5), pa); palha.rotation.z = sx * Math.PI / 2; palha.position.set(sx * .78, 1.32, 0); g.add(palha); }
    p.legs.push(legGroup(g, -.12, .72, 0, .72, .05, pau), legGroup(g, .12, .72, 0, .72, .05, pau));
    const arco = new THREE.Mesh(new THREE.TorusGeometry(.32, .025, 4, 10, Math.PI), pau); arco.position.set(.62, 1.2, -.2); arco.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(arco);
  } else if (tipo === 'aranha') {
    const pr = M('#2d2630'), pe = M('#3c3240'), ol = new THREE.MeshBasicMaterial({ color: '#ff3b3b' });
    const ab = ball(.42, pr); ab.scale.set(1, .75, 1.15); ab.position.set(0, .5, .25); g.add(ab);
    const h = new THREE.Group(); h.position.set(0, .45, -.32); g.add(h); p.head = h; h.add(ball(.26, pr));
    for (const [x, y] of [[-.09, .08], [.09, .08], [-.15, .02], [.15, .02]]) { const e = ball(.035, ol, 5, 4); e.position.set(x, y, -.23); h.add(e); }
    for (let i = 0; i < 8; i++) { const sx = i < 4 ? -1 : 1, k = i % 4; const piv = new THREE.Group(); piv.position.set(sx * .25, .5, -.2 + k * .17); piv.rotation.z = sx * -.9; piv.rotation.y = sx * (k - 1.5) * .35; const l = new THREE.Mesh(new THREE.CylinderGeometry(.03, .025, .7, 5), pe); l.position.y = -.35; piv.add(l); g.add(piv); p.legs.push(piv); }
    p.aranha = true;
  } else if (tipo === 'gosma' || tipo === 'gosminha') {
    const k = tipo === 'gosma' ? 1 : .5;
    const gm = new THREE.MeshLambertMaterial({ color: '#7ad85a', transparent: true, opacity: .82, flatShading: true }), core = M('#4aa83a'), e = M('#1f2a1a');
    const corpo = new THREE.Mesh(new THREE.IcosahedronGeometry(.5 * k, 1), gm); corpo.scale.set(1, .85, 1); corpo.position.y = .45 * k; g.add(corpo); p.corpo = corpo;
    const nc = ball(.2 * k, core); nc.position.y = .4 * k; g.add(nc);
    for (const sx of [-1, 1]) { const ey = ball(.07 * k, e, 6, 4); ey.position.set(sx * .17 * k, .55 * k, -.42 * k); g.add(ey); const br = ball(.025 * k, M('#fff'), 4, 3); br.position.set(sx * .17 * k + .02 * k, .58 * k, -.48 * k); g.add(br); }
  }
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(DEF[tipo].hw * 1.3, 12), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .22, depthWrite: false })); sombra.rotation.x = -Math.PI / 2; sombra.position.y = .03; g.add(sombra);
  const mats = []; g.traverse((o) => { if (o.isMesh && o.material.emissive) mats.push(o.material); });
  return { g, p, mats };
}

class Mob {
  constructor(tipo, x, y, z) {
    this.tipo = tipo; this.d = DEF[tipo]; this.hp = this.d.hp;
    this.pos = new V3(x, y, z); this.vel = new V3(); this.hw = this.d.hw; this.h = this.d.h; this.onGround = false;
    const m = modelo(tipo); this.g = m.g; this.p = m.p; this.mats = m.mats; C.scene.add(this.g);
    this.yaw = Math.random() * 6; this.state = 'idle'; this.t = Math.random() * 3; this.cd = 0; this.flash = 0; this.fogeT = 0; this.phase = Math.random() * 6; this.congelado = 0; this.hopT = 0; this.somT = 3 + Math.random() * 10;
    this.target = null; this.vivo = true;
  }
  remover() { this.vivo = false; C.scene.remove(this.g); this.g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } }); }
  ferir(dmg, dir, fonte) {
    if (!this.vivo) return;
    this.hp -= dmg; this.flash = .25; C.som('acertar');
    if (dir) { this.vel.x += dir.x * 6; this.vel.z += dir.z * 6; this.vel.y = Math.max(this.vel.y, 4.5); }
    if (this.d.pass) { this.fogeT = 4; }
    else if (fonte === 'jogador') this.bravo = 8;
    C.particulas(this.pos.x, this.pos.y + this.h * .6, this.pos.z, '#c43a3a', 5);
    if (this.hp <= 0) this.morrer();
  }
  morrer() {
    C.som('morrerMob'); C.particulas(this.pos.x, this.pos.y + .5, this.pos.z, '#ffffff', 14, true);
    for (const [id, n] of this.d.drops()) if (n > 0) C.soltarItem(id, n, this.pos.x, this.pos.y + .5, this.pos.z);
    if (this.tipo === 'gosma') for (let i = 0; i < 2; i++) mobs.push(new Mob('gosminha', this.pos.x + (Math.random() - .5), this.pos.y + .3, this.pos.z + (Math.random() - .5)));
    this.remover();
  }
  update(dt, time) {
    const P = C.alvo(), d = this.d;
    const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dist = Math.hypot(dx, dz), dy = P.pos.y - this.pos.y;
    this.t -= dt; this.cd -= dt; this.fogeT -= dt; if (this.bravo) this.bravo -= dt;
    if (this.congelado > 0) { this.congelado -= dt; }
    let want = null, sp = d.sp;
    const hostil = !d.pass && (C.modo === 'sob') && !C.invisivel() && C.vivo();
    if (d.pass) {
      if (this.fogeT > 0) { want = Math.atan2(-dx, -dz) + Math.sin(time * 3) * .5; sp *= 2.2; }
      else if (this.state === 'walk') { if (this.t < 0) { this.state = 'idle'; this.t = 2 + Math.random() * 5; } else want = this.wy; }
      else if (this.t < 0) { this.state = 'walk'; this.t = 2 + Math.random() * 4; this.wy = Math.random() * Math.PI * 2; }
      const comida = C.segurando(); if (this.fogeT <= 0 && dist < 8 && comida === IT.TRIGO) { want = dist > 1.6 ? Math.atan2(dx, dz) : null; }
    } else if (hostil && dist < 20 && Math.abs(dy) < 8) {
      want = Math.atan2(dx, dz);
      if (d.ranged) {
        if (dist < 7) want += Math.PI; else if (dist < 13) want = null;
        if (dist < 16 && this.cd <= 0 && (P !== C.P || C.linhaDeVisao(this.pos.x, this.pos.y + 1.5, this.pos.z))) { this.cd = d.cd; const o = new V3(this.pos.x, this.pos.y + 1.4, this.pos.z); const alvo = new V3(P.pos.x, P.pos.y + 1, P.pos.z); const dir = alvo.sub(o); const L = dir.length(); dir.normalize(); dir.y += L * .012; dir.normalize(); C.flecha(o.addScaledVector(dir, .6), dir, 30, d.dmg, 'mob'); }
        this.yaw = lerpA(this.yaw, Math.atan2(dx, dz), dt * 8);
      } else {
        if (dist < this.hw + .9 && Math.abs(dy) < 1.8 && this.cd <= 0) { this.cd = d.cd; if (P === C.P) C.ferirJogador(d.dmg, new V3(dx, 0, dz).normalize(), this.tipo); else C.particulas(P.pos.x, P.pos.y + 1, P.pos.z, '#7aeef8', 4); }
        if (this.p.aranha && dist < 4.5 && dist > 1.4 && this.onGround && this.cd <= 0 && Math.random() < dt * 2) { this.vel.y = 7; this.vel.x += dx / dist * 5; this.vel.z += dz / dist * 5; }
      }
    } else {
      if (this.state === 'walk') { if (this.t < 0) { this.state = 'idle'; this.t = 2 + Math.random() * 4; } else want = this.wy; }
      else if (this.t < 0) { this.state = 'walk'; this.t = 2 + Math.random() * 4; this.wy = Math.random() * Math.PI * 2; }
      sp *= .6;
    }
    if (this.congelado > 0) { want = null; }
    // movimento
    let tvx = 0, tvz = 0;
    if (want !== null) { this.yaw = lerpA(this.yaw, want, dt * 7); tvx = Math.sin(this.yaw) * sp; tvz = Math.cos(this.yaw) * sp; }
    if (d.hop) { this.hopT -= dt; if (want !== null && this.onGround && this.hopT <= 0) { this.vel.y = 6.5; this.hopT = .8 + Math.random() * .4; } if (this.onGround) { tvx = 0; tvz = 0; } }
    if (this.levita > 0) { this.levita -= dt; this.vel.y = 2.2; tvx *= .2; tvz *= .2; if (this.levita <= 0) { this.vel.y = -14; this.cairDano = true; } }
    if (this.cairDano && this.onGround) { this.cairDano = false; this.ferir(10, null, 'jogador'); }
    if (getBlock(this.pos.x, this.pos.y + .3, this.pos.z) === B.TEIA) { tvx *= .12; tvz *= .12; this.vel.y = Math.max(this.vel.y, -1); }
    const k = Math.min(1, dt * (this.onGround ? 10 : 2));
    this.vel.x += (tvx - this.vel.x) * k; this.vel.z += (tvz - this.vel.z) * k;
    if (this.inWater) { this.vel.y += 14 * dt; this.vel.y = Math.min(this.vel.y, 2.5); }
    this.vel.y -= (this.tipo === 'galinha' && this.vel.y < 0 ? 8 : 26) * dt; this.vel.y = Math.max(this.vel.y, -30);
    mover(this, dt);
    if (this.hitWall && this.onGround && want !== null && !d.hop) this.vel.y = 7.6;
    // sol queima monstros da noite
    if (d.sol && C.dia() > .55 && surfaceY(this.pos.x, this.pos.z) <= this.pos.y + .5) { this.solT = (this.solT || 0) + dt; if (this.solT > .8) { this.solT = 0; this.ferir(3, null); C.particulas(this.pos.x, this.pos.y + 1, this.pos.z, '#ffb347', 6); } }
    if (this.pos.y < -10) this.remover();
    // sons
    this.somT -= dt; if (this.somT < 0) { this.somT = 6 + Math.random() * 12; if (dist < 16) C.som('mob', this.tipo); }
    // visual
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.phase += dt * hs * 5;
    const sw = Math.sin(this.phase) * Math.min(.7, hs * .35);
    if (this.p.aranha) this.p.legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase * 1.6 + i) * .4 * Math.min(1, hs); });
    else if (this.p.flutua) { this.g.children.forEach(() => {}); this.p.legs.forEach((m, i) => { m.position.y = .95 + Math.sin(time * 3 + i * 2) * .06; }); }
    else this.p.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? sw : -sw); });
    if (this.p.head) this.p.head.rotation.y = Math.sin(time * .7 + this.phase) * .15;
    if (this.p.corpo) { const s = this.onGround ? 1 + Math.sin(time * 6) * .03 : 1; this.p.corpo.scale.set(1.05 / s, .85 * s * (this.vel.y > 1 ? 1.15 : 1), 1.05 / s); }
    this.g.position.copy(this.pos); if (this.p.flutua) this.g.position.y += .15 + Math.sin(time * 2 + this.phase) * .06;
    this.g.rotation.y = this.yaw + Math.PI;   // os modelos olham para -z
    if (this.flash > 0 || this.congelado > 0) { this.flash -= dt; const c = this.congelado > 0 ? 0x2a6aa0 : 0x8a0000; for (const m of this.mats) m.emissive.setHex(this.flash > 0 ? 0x8a0000 : c); }
    else if (this.mats[0] && this.mats[0].emissive.getHex()) for (const m of this.mats) m.emissive.setHex(0);
  }
}
function lerpA(a, b, t) { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, t); }

// ---------- nascer e sumir ----------
let spT = 0;
export function atualizarMobs(dt, time) {
  for (let i = mobs.length - 1; i >= 0; i--) { const m = mobs[i]; if (m.vivo) m.update(dt, time); if (!m.vivo) mobs.splice(i, 1); }
  spT -= dt; if (spT > 0) return; spT = 1.5;
  const P = C.P;
  for (let i = mobs.length - 1; i >= 0; i--) { const m = mobs[i]; const d = Math.hypot(m.pos.x - P.pos.x, m.pos.z - P.pos.z); if (d > 72) { m.remover(); mobs.splice(i, 1); } }
  const nPass = mobs.filter((m) => m.d.pass).length, nHost = mobs.length - nPass;
  const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 22;
  const x = Math.floor(P.pos.x + Math.cos(a) * r) + .5, z = Math.floor(P.pos.z + Math.sin(a) * r) + .5;
  const sy = surfaceY(x, z); const top = getBlock(x, sy, z);
  const naVila = Math.hypot(x, z) < VILLAGE_R + 4;
  if (nPass < 10 && (top === B.GRASS || top === B.SNOWGRASS) && !SOLID[getBlock(x, sy + 1, z)] && Math.random() < .6) {
    const tipos = ['vaca', 'porco', 'galinha', 'ovelha']; const t = tipos[(Math.random() * 4) | 0];
    const n = 1 + (Math.random() * 3 | 0); for (let k = 0; k < n; k++) mobs.push(new Mob(t, x + Math.random() * 2 - 1, sy + 1, z + Math.random() * 2 - 1));
    return;
  }
  if (C.modo !== 'sob' || nHost >= 8 || naVila) return;
  const noite = C.dia() < .3;
  // à noite na superfície; em cavernas a qualquer hora
  if (noite && (SOLID[top]) && !SOLID[getBlock(x, sy + 1, z)] && !SOLID[getBlock(x, sy + 2, z)] && top !== B.LEAVES && top !== B.PINE) { const t = ['sombra', 'sombra', 'espantalho', 'aranha', 'gosma'][(Math.random() * 5) | 0]; mobs.push(new Mob(t, x, sy + 1, z)); return; }
  if (P.pos.y < surfaceY(P.pos.x, P.pos.z) - 6) {
    for (let k = 0; k < 10; k++) {
      const yy = Math.floor(P.pos.y) + (Math.random() * 12 | 0) - 6;
      if (yy > 2 && SOLID[getBlock(x, yy - 1, z)] && !SOLID[getBlock(x, yy, z)] && !SOLID[getBlock(x, yy + 1, z)] && getBlock(x, yy, z) !== B.WATER && yy < surfaceY(x, z) - 4) { const t = ['sombra', 'aranha', 'gosma', 'espantalho'][(Math.random() * 4) | 0]; mobs.push(new Mob(t, x, yy, z)); return; }
    }
  }
}
export function criarMob(tipo, x, y, z) { const m = new Mob(tipo, x, y, z); mobs.push(m); return m; }
export function limparMobs() { for (const m of mobs) m.remover(); mobs.length = 0; }
// raio contra caixas das criaturas
export function rayMob(o, d, maxD) {
  let best = null;
  for (const m of mobs) {
    if (!m.vivo) continue;
    const mn = [m.pos.x - m.hw - .1, m.pos.y, m.pos.z - m.hw - .1], mx = [m.pos.x + m.hw + .1, m.pos.y + m.h, m.pos.z + m.hw + .1];
    let t0 = 0, t1 = maxD; const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z]; let ok = true;
    for (let a = 0; a < 3; a++) { if (Math.abs(dd[a]) < 1e-9) { if (oo[a] < mn[a] || oo[a] > mx[a]) { ok = false; break; } continue; } let ta = (mn[a] - oo[a]) / dd[a], tb = (mx[a] - oo[a]) / dd[a]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } }
    if (ok && (!best || t0 < best.t)) best = { m, t: t0 };
  }
  return best;
}
export function mobsPerto(p, r) { return mobs.filter((m) => m.vivo && m.pos.distanceTo(p) < r); }
