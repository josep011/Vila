// Vila dos Gatinhos — jogo principal (v3).
import * as THREE from 'three';
import { GLTFLoader } from './GLTFLoader.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { criarGato } from './gato.js';
import { B, BD, SOLID, OPAQUE, PLANT, TILEAVG, TUV, atlas, paintWater, lerp, clamp, smoothstep, mulberry, fbm2, setSeed } from './blocos.js';
import { IT, ITEMS, FUEL, SMELT, SMELT_T, RECIPES, matchRecipe } from './itens.js';
import { iconClone, iconCanvas, sprite, RAMP } from './arte.js';
import { CS, H, VH, initMundo, resetMundo, setVila, semVila, setRD, offsCount, getChunk, getBlock, setBlock, ensureChunk, buildVillage, VILLAGE_CHESTS, rebuildNow, buildChunkMesh, updateChunks, setOnEdit, editsJSON, mover, colide, groundAt, raycast, surfaceY, terrainInfo, chunks } from './mundo.js';
import { initMobs, atualizarMobs, mobs, rayMob, mobsPerto, criarMob, limparMobs } from './mobs.js';
import { iniciarSom, som, setVolume } from './som.js';

const isTouch = matchMedia('(pointer:coarse)').matches;
const PI = Math.PI, V3 = THREE.Vector3, DAYLEN = 1200;
document.body.classList.add(isTouch ? 'touch' : 'desk');
const $ = (id) => document.getElementById(id);
const BASE = 'vilaGatinhos3.';
const mkStore = (pre) => ({ pre, get(k, d) { try { const v = localStorage.getItem(this.pre + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(this.pre + k, JSON.stringify(v)); } catch (e) {} } });
const GS = mkStore(BASE + 'g.');          // opções, teclas, conquistas, lista de mundos
const store = mkStore(BASE);              // dados do mundo atual (o prefixo muda por mundo)
const prefixoMundo = (m) => m.id === 'principal' ? BASE : BASE + 'm_' + m.id + '.';

// ================== OPÇÕES E TECLAS ==================
const OPC = Object.assign({ ctrl: 'setas', tam: 'medio', fov: 72, sens: 100, rd: isTouch ? 4 : 6, vol: 60, graf: isTouch ? 'rapido' : 'bonito', bob: true, coord: true, invY: false }, GS.get('opcoes', {}));
const TECLAS_PADRAO = { frente: 'KeyW', tras: 'KeyS', esquerda: 'KeyA', direita: 'KeyD', pular: 'Space', agachar: 'ShiftLeft', correr: 'ControlLeft', inventario: 'KeyE', soltar: 'KeyQ', voar: 'KeyF', camera: 'F5', hud: 'F1', debug: 'F3' };
const NOMES_ACAO = { frente: 'Andar para frente', tras: 'Andar para trás', esquerda: 'Andar para a esquerda', direita: 'Andar para a direita', pular: 'Pular / subir', agachar: 'Agachar / descer', correr: 'Correr', inventario: 'Inventário', soltar: 'Soltar item', voar: 'Voar (criativo)', camera: 'Trocar câmera', hud: 'Esconder interface', debug: 'Tela de informações' };
let TECLAS = Object.assign({}, TECLAS_PADRAO, GS.get('teclas', {}));
const nomeTecla = (c) => ({ Space: 'Espaço', ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.', AltLeft: 'Alt', Escape: 'Esc', Tab: 'Tab', Enter: 'Enter', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backspace: 'Apagar' }[c] || c.replace(/^Key/, '').replace(/^Digit/, ''));
function salvarOpc() { GS.set('opcoes', OPC); }

// ================== RENDER ==================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(OPC.fov, 1, .05, 700); scene.add(camera);
function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio, OPC.graf === 'bonito' ? 2 : 1.25)); const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
scene.fog = new THREE.Fog(0x87c3ef, 40, 80);
const amb = new THREE.AmbientLight(0xffffff, 2); scene.add(amb);
const sunL = new THREE.DirectionalLight(0xfff4e0, 1.4); scene.add(sunL); scene.add(sunL.target);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
const tex = new THREE.CanvasTexture(atlas); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
const matO = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, alphaTest: .5 });
const matW = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, transparent: true, opacity: .74, depthWrite: false });
const matCubo = new THREE.MeshLambertMaterial({ map: tex, alphaTest: .5 });
const worldGroup = new THREE.Group(); scene.add(worldGroup);
initMundo(worldGroup, matO, matW, store);
function aplicarRD() { setRD(OPC.rd); scene.fog.near = OPC.rd * CS * .55; scene.fog.far = OPC.rd * CS * .95; }
aplicarRD(); setVolume(OPC.vol / 100);
const sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false }));
const moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false }));
scene.add(sunMesh, moonMesh);
const estrelas = (() => { const n = 800, p = new Float32Array(n * 3); const r = mulberry(7); for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * PI * 2, s = Math.sqrt(1 - u * u); p[i * 3] = Math.cos(a) * s * 420; p[i * 3 + 1] = Math.abs(u) * 420; p[i * 3 + 2] = Math.sin(a) * s * 420; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })); scene.add(m); return m; })();
const cloudCv = document.createElement('canvas'); cloudCv.width = cloudCv.height = 64; { const x = cloudCv.getContext('2d'); for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const n = fbm2(i * .18, j * .18, 99, 3); if (n > .12) { x.fillStyle = 'rgba(255,255,255,.92)'; x.fillRect(i, j, 1, 1); } } }
const cloudTex = new THREE.CanvasTexture(cloudCv); cloudTex.magFilter = THREE.NearestFilter; cloudTex.minFilter = THREE.NearestFilter; cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat.set(3, 3); cloudTex.colorSpace = THREE.SRGBColorSpace;
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: .9 }));
clouds.rotation.x = -PI / 2; scene.add(clouds);
let lampLights = [];
function aplicarGraficos() { for (const l of lampLights) scene.remove(l); lampLights = []; const n = OPC.graf === 'bonito' ? (isTouch ? 3 : 5) : 0; for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffc477, 0, 11, 1.4); scene.add(l); lampLights.push(l); } resize(); }
aplicarGraficos();
const flashLight = new THREE.PointLight(0xffd9a0, 0, 18, 1.2); scene.add(flashLight);

// ================== ESTADO DO MUNDO ==================
let mundoAtual = null, jogando = false, pausado = false, carregado = false;
let modo = 'sob';
const P = { pos: new V3(3.5, VH + 1, 6.5), vel: new V3(), hw: .3, h: 1.6, yaw: .6, pitch: -.25, onGround: false, fly: false, avYaw: 0, camDist: 4, quedaDe: null, escala: 1, escalaT: 0, puloDuplo: false, gancho: null };
let EYE = 1.45, camModo = 1;
let st = null, inv = null, armor = null, furnaces = null, chests = null, dayT = .3;
const buff = { veloc: 0, escudo: 0, invis: 0, asas: false, semQueda: false, tempo: 0, forca: 0, noite: false, agua: 0, barreira: false };
let vivo = true, sel = 0;
const mkS = (id, n = 1) => { const it = ITEMS[id]; const s = { id, n }; if (it && it.dur) s.d = it.dur; return s; };
const posKey = (x, y, z) => x + ',' + y + ',' + z;
const maxStack = (id) => (ITEMS[id] ? ITEMS[id].stack : 64);
const HOT = [0, 1, 2, 3, 4, 5, 6, 7, 8], MAIN = Array.from({ length: 27 }, (_, i) => i + 9), ALL = [...HOT, ...MAIN];
function carregarEstado(meta) {
  store.pre = prefixoMundo(meta);
  modo = store.get('modo', meta.modo || 'sob');
  const sv = store.get('player', null);
  st = Object.assign({ vida: 20, fome: 20, sat: 5, exaust: 0, ar: 10, mana: 100, spawn: [3.5, VH + 1, 6.5] }, store.get('stats', {}));
  if (sv && isFinite(sv.x)) { P.pos.set(sv.x, sv.y, sv.z); P.yaw = sv.yaw || 0; } else P.pos.set(...st.spawn);
  P.vel.set(0, 0, 0); P.quedaDe = null; P.fly = false; setEscala(1);
  inv = store.get('inv', null) || Array(36).fill(null);
  armor = store.get('armor', null) || [null, null, null, null];
  furnaces = new Map(store.get('furnaces', []));
  chests = new Map(store.get('chests', []));
  dayT = store.get('time', .3);
  Object.assign(buff, { veloc: 0, escudo: 0, invis: 0, asas: false, semQueda: false, tempo: 0, forca: 0, noite: false, agua: 0, barreira: false });
  vivo = st.vida > 0 || (st.vida = 20, true);
}
let saveTimer = 0;
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveAll, 700); }
function saveAll() { if (!carregado) return; store.set('edits', editsJSON()); store.set('inv', inv); store.set('armor', armor); store.set('furnaces', [...furnaces]); store.set('chests', [...chests]); store.set('stats', st); store.set('modo', modo); store.set('player', { x: P.pos.x, y: P.pos.y, z: P.pos.z, yaw: P.yaw }); store.set('time', dayT); }
setOnEdit(saveSoon);
function addToSlots(arr, idxs, s) {
  if (!s) return null;
  if (maxStack(s.id) > 1) for (const i of idxs) { const t = arr[i]; if (t && t.id === s.id && t.n < maxStack(t.id)) { const k = Math.min(s.n, maxStack(t.id) - t.n); t.n += k; s.n -= k; if (!s.n) return null; } }
  for (const i of idxs) if (!arr[i]) { arr[i] = s; return null; }
  return s;
}
function giveStack(s) { if (!s) return null; const id = s.id; const left = addToSlots(inv, ALL, s); conquistaPorItem(id); renderHot(); saveSoon(); return left; }
const held = () => inv[sel];
const heldIt = () => { const h = held(); return h ? ITEMS[h.id] : null; };
function usarDur(k = 1) { const h = held(), it = h && ITEMS[h.id]; if (!it || !it.dur || modo === 'cri') return; h.d -= k; if (h.d <= 0) { inv[sel] = null; toast(it.name + ' quebrou'); som('quebrar', 'pedra'); } renderHot(); }
function consumir(id, n = 1) { if (modo === 'cri') return true; let need = n; for (const i of ALL) { const s = inv[i]; if (s && s.id === id) { const k = Math.min(need, s.n); s.n -= k; need -= k; if (!s.n) inv[i] = null; if (!need) break; } } renderHot(); return need === 0; }
const temItem = (id) => modo === 'cri' || inv.some((s) => s && s.id === id);

// ================== CONQUISTAS ==================
const CONQ = [
  ['madeira', 'Pegando madeira', 'Pegue um tronco', B.LOG], ['bancada', 'Mãos à obra', 'Faça uma bancada', B.TABLE], ['picareta', 'Hora de minerar', 'Faça uma picareta', IT.PIC_M],
  ['pedra', 'Idade da pedra', 'Pegue pedregulho', B.COBBLE], ['fornalha', 'Esquentando', 'Faça uma fornalha', B.FURNACE], ['ferro', 'Metalurgia', 'Consiga uma barra de ferro', IT.FERRO],
  ['diamante', 'Diamantes!', 'Encontre um diamante', IT.DIAMANTE], ['monstro', 'Caçador', 'Derrote um monstro', IT.ESP_P], ['comer', 'Hora do lanche', 'Coma alguma coisa', IT.PAO],
  ['dormir', 'Bons sonhos', 'Durma numa cama', B.BED], ['arma', 'Pontaria', 'Faça uma arma de fogo', IT.PISTOLA], ['poder', 'Superpoderes', 'Use um poder', IT.O_FOGO],
  ['sabre', 'Lâmina de luz', 'Faça o sabre de energia', IT.SABRE], ['carinho', 'Amor de gato', 'Faça carinho na gatinha', B.WOOL], ['kabum', 'Kabum!', 'Exploda uma dinamite', B.TNT],
  ['voar', 'Nas nuvens', 'Voe com asas ou jetpack', IT.O_ASAS], ['gigante', 'Gigantesco', 'Tome a poção de gigante', IT.P_CRESCER], ['desmaio', 'Sete vidas', 'Desmaie pela primeira vez', IT.MACA],
  ['armadura', 'Bem protegido', 'Vista uma armadura completa', IT.PEI_F], ['ouro', 'Tesouro', 'Consiga uma barra de ouro', IT.OURO],
];
let conqFeitas = new Set(GS.get('conquistas', []));
let conqT = 0;
function conquistar(id) {
  if (conqFeitas.has(id) || !jogando) return; const c = CONQ.find((q) => q[0] === id); if (!c) return;
  conqFeitas.add(id); GS.set('conquistas', [...conqFeitas]);
  const cv = $('conqIc'); cv.width = cv.height = 32; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 32, 32); x.drawImage(iconCanvas(c[3]), 0, 0, 32, 32);
  $('conqTx').textContent = c[1]; $('conq').classList.add('on'); clearTimeout(conqT); conqT = setTimeout(() => $('conq').classList.remove('on'), 3500); som('cura');
}
const POR_ITEM = { [B.LOG]: 'madeira', [B.TABLE]: 'bancada', [IT.PIC_M]: 'picareta', [IT.PIC_P]: 'picareta', [B.COBBLE]: 'pedra', [B.FURNACE]: 'fornalha', [IT.FERRO]: 'ferro', [IT.OURO]: 'ouro', [IT.DIAMANTE]: 'diamante', [IT.PISTOLA]: 'arma', [IT.RIFLE]: 'arma', [IT.ESCOPETA]: 'arma', [IT.SABRE]: 'sabre' };
function conquistaPorItem(id) { if (POR_ITEM[id]) conquistar(POR_ITEM[id]); }

// ================== GATINHOS ==================
const CAT_H = 1.55;
let gltfs = {}, eu = null, ela = null;
let jogoComGatinha = GS.get('gatinha', false), segue = GS.get('segue', false);
function montarGato(gltf) {
  const gato = criarGato(gltf);
  const caixa = new THREE.Box3().setFromObject(gato.modelo);
  const esc = CAT_H / (caixa.max.y - caixa.min.y);
  const interno = new THREE.Group(); interno.scale.setScalar(esc); interno.position.y = -caixa.min.y * esc; interno.add(gato.modelo);
  const grupo = new THREE.Group(); grupo.add(interno);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(.45, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .25, depthWrite: false }));
  sombra.rotation.x = -PI / 2; sombra.position.y = .03; grupo.add(sombra);
  const mats = []; gato.modelo.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); mats.push(o.material); } });
  return { gato, grupo, andando: false, sentado: false, esc, mats, mao: gato.modelo.getObjectByName('antebraco_dir'), braco: gato.modelo.getObjectByName('braco_dir'), humorT: 0 };
}
const setAndar = (c, sim) => { if (sim && !c.andando) { if (c.sentado) { c.gato.sentar(false); c.sentado = false; } c.gato.acao('andar'); c.andando = true; } else if (!sim && c.andando) { c.gato.parar(.25); c.andando = false; } };
function humorTemp(c, h, t) { if (!c) return; c.gato.humor(h); c.humorT = t; }
function lerpAngle(a, b, t) { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, t); }
const npc = { pos: new V3(2.5, VH + 1, -2.5), ty: VH + 1, yaw: 0, state: 'idle', t: 2, target: { x: 0, z: 0 }, curaT: 6 };
function trocarModelos() {
  if (eu) scene.remove(eu.grupo); if (ela) scene.remove(ela.grupo);
  eu = montarGato(jogoComGatinha ? gltfs.ela : gltfs.ele); ela = montarGato(jogoComGatinha ? gltfs.ele : gltfs.ela);
  scene.add(eu.grupo, ela.grupo); heldId = -1; eu.grupo.scale.setScalar(P.escala);
  $('pTroca').textContent = jogoComGatinha ? 'Jogar com o gatinho' : 'Jogar com a gatinha';
}
function npcPick() { const a = Math.random() * PI * 2, r = Math.random() < .4 ? Math.random() * 7 : 6 + Math.random() * 30; npc.target = { x: Math.cos(a) * r, z: Math.sin(a) * r }; }
function updateNPC(dt) {
  npc.t -= dt;
  const pdx = P.pos.x - npc.pos.x, pdz = P.pos.z - npc.pos.z, pd = Math.hypot(pdx, pdz);
  let speed = 0; const livre = !mundoAtual.vila;
  if (segue && vivo) {
    if (pd > 40 || Math.abs(P.pos.y - npc.pos.y) > 10) { npc.pos.set(P.pos.x - 1.2, P.pos.y, P.pos.z - 1.2); npc.ty = P.pos.y; }
    if (pd > 2.6) { npc.state = 'walk'; npc.target = { x: P.pos.x, z: P.pos.z }; } else if (npc.state === 'walk') { npc.state = 'idle'; npc.t = 3; }
  }
  if (npc.state === 'walk') {
    const dx = npc.target.x - npc.pos.x, dz = npc.target.z - npc.pos.z, dist = Math.hypot(dx, dz);
    if ((!segue && (dist < .5 || npc.t < 0)) || (segue && dist < 2.4)) { npc.state = Math.random() < .4 ? 'sit' : 'idle'; npc.t = 3 + Math.random() * 6; }
    else {
      npc.yaw = lerpAngle(npc.yaw, Math.atan2(dx, dz), dt * 6);
      const sp = segue && pd > 6 ? 5.5 : 2, fx = Math.sin(npc.yaw), fz = Math.cos(npc.yaw);
      const px = npc.pos.x + fx * (sp * dt + .35), pz = npc.pos.z + fz * (sp * dt + .35); const gy = groundAt(px, pz, npc.pos.y);
      const bad = gy === null || gy - npc.pos.y > 1.05 || (!segue && (npc.pos.y - gy > 2.1 || getBlock(px, gy - 1, pz) === B.WATER || getBlock(px, gy, pz) === B.WATER || (!livre && Math.hypot(px, pz) > 42)));
      if (bad) { if (segue) { if (gy !== null && gy - npc.pos.y > 1.05 && gy - npc.pos.y < 4) npc.ty = gy; npc.pos.x += fx * sp * dt; npc.pos.z += fz * sp * dt; speed = sp; } else { npcPick(); npc.yaw += PI * .5; } }
      else { npc.pos.x += fx * sp * dt; npc.pos.z += fz * sp * dt; const g2 = groundAt(npc.pos.x, npc.pos.z, npc.pos.y); if (g2 !== null) npc.ty = g2; speed = sp; }
    }
  } else if (npc.t < 0 && !segue) { npc.state = 'walk'; npc.t = 8 + Math.random() * 8; npcPick(); }
  if (npc.state !== 'walk' && pd < 4) npc.yaw = lerpAngle(npc.yaw, Math.atan2(pdx, pdz), dt * 3);
  if (npc.pos.y < npc.ty) npc.pos.y = Math.min(npc.ty, npc.pos.y + dt * 7); else npc.pos.y = Math.max(npc.ty, npc.pos.y - dt * 10);
  npc.curaT -= dt;
  if (vivo && pd < 6 && st.vida < 20 && npc.curaT <= 0 && modo === 'sob') { npc.curaT = 7; st.vida = Math.min(20, st.vida + 4); particulas(P.pos.x, P.pos.y + 1, P.pos.z, '#7dff9a', 12, true); hearts(npc.pos); humorTemp(ela, 'feliz', 2); ela.gato.acao('acenar'); toast((jogoComGatinha ? 'O gatinho' : 'A gatinha doutora') + ' cuidou de você ♥'); som('cura'); renderStats(); }
  setAndar(ela, speed > 0);
  if (npc.state === 'sit' && !ela.sentado && !ela.andando) { ela.gato.sentar(true, true); ela.sentado = true; }
  if (npc.state !== 'sit' && ela.sentado) { ela.gato.sentar(false); ela.sentado = false; }
  if (ela.humorT > 0) { ela.humorT -= dt; if (ela.humorT <= 0) ela.gato.humor('normal'); }
  ela.grupo.position.copy(npc.pos); ela.grupo.rotation.y = npc.yaw;
  ela.gato.atualizar(dt);
}
// holograma (distrai monstros)
let holo = null;
function criarHolo() {
  if (holo) { scene.remove(holo.c.grupo); holo = null; }
  const c = montarGato(jogoComGatinha ? gltfs.ela : gltfs.ele);
  for (const m of c.mats) { m.transparent = true; m.opacity = .55; m.emissive && m.emissive.setHex(0x1aa0c0); }
  const d = new V3(0, 0, -1).applyEuler(new THREE.Euler(0, P.yaw, 0));
  const pos = P.pos.clone().addScaledVector(d, 3); const g = groundAt(pos.x, pos.z, P.pos.y + 2); if (g !== null) pos.y = g;
  c.grupo.position.copy(pos); scene.add(c.grupo); c.gato.acao('dancar');
  holo = { c, pos, t: 15 };
}
function updateHolo(dt) { if (!holo) return; holo.t -= dt; holo.c.gato.atualizar(dt); holo.c.grupo.rotation.y += dt; if (Math.random() < dt * 8) particulas(holo.pos.x, holo.pos.y + .5, holo.pos.z, '#7aeef8', 1, true, 1); if (holo.t <= 0) { particulas(holo.pos.x, holo.pos.y + 1, holo.pos.z, '#7aeef8', 14, true); scene.remove(holo.c.grupo); holo = null; } }

// ================== ITENS NO CHÃO ==================
const texCache = {};
function texIcon(id) { if (!texCache[id]) { const t = new THREE.CanvasTexture(iconCanvas(id)); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; texCache[id] = t; } return texCache[id]; }
const cuboCache = {};
function cuboGeo(id) {
  if (cuboCache[id]) return cuboCache[id];
  const g = new THREE.BoxGeometry(1, 1, 1); const uv = g.attributes.uv; const t = BD[id].tiles; const ft = [t[1], t[1], t[0], t[2], t[1], t[1]];
  for (let f = 0; f < 6; f++) { const [u0, v0, u1, v1] = TUV[ft[f]]; for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, lerp(u0, u1, uv.getX(i)), lerp(v0, v1, uv.getY(i))); } }
  return (cuboCache[id] = g);
}
const planoGeo = new THREE.PlaneGeometry(1, 1);
const ehCubo = (id) => id < 100 && !PLANT[id];
function malhaItem(id, tam, overlay) {
  let m;
  if (ehCubo(id)) { m = new THREE.Mesh(cuboGeo(id), overlay ? new THREE.MeshLambertMaterial({ map: tex, alphaTest: .5, depthTest: false }) : matCubo); m.scale.setScalar(tam * .6); }
  else { const glow = id === IT.SABRE; m = new THREE.Mesh(planoGeo, (glow ? new THREE.MeshBasicMaterial({ map: texIcon(id), alphaTest: .5, side: THREE.DoubleSide, depthTest: !overlay }) : new THREE.MeshLambertMaterial({ map: texIcon(id), alphaTest: .5, side: THREE.DoubleSide, depthTest: !overlay }))); m.scale.setScalar(tam); }
  if (overlay) m.renderOrder = 999;
  return m;
}
const drops = [];
function soltarItem(id, n, x, y, z, vel, delay = .5) {
  if (typeof id !== 'object' && n <= 0) return;
  const s = typeof id === 'object' ? id : mkS(id, n);
  const m = malhaItem(s.id, .42); scene.add(m);
  drops.push({ s, pos: new V3(x, y, z), vel: vel ? vel.clone() : new V3((Math.random() - .5) * 2, 3, (Math.random() - .5) * 2), hw: .12, h: .25, m, age: 0, delay, spin: Math.random() * 6 });
  if (drops.length > 250) { const d = drops.shift(); scene.remove(d.m); }
}
function updateDrops(dt, time) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]; d.age += dt;
    const c = new V3(P.pos.x, P.pos.y + .8 * P.escala, P.pos.z); const dist = d.pos.distanceTo(c);
    if (vivo && d.age > d.delay && dist < 2.4) { const k = Math.min(1, dt * 10); d.pos.lerp(c, k * (2.4 - dist) / 2.4 + k * .2); if (dist < .8) { const left = giveStack(d.s); if (!left) { som('pegar'); scene.remove(d.m); drops.splice(i, 1); continue; } d.s = left; d.age = 0; } }
    else { d.vel.y -= 18 * dt; d.vel.x *= .96; d.vel.z *= .96; mover(d, dt); if (d.onGround) { d.vel.x *= .8; d.vel.z *= .8; } }
    d.m.position.set(d.pos.x, d.pos.y + .18 + Math.sin(time * 2.5 + d.spin) * .06, d.pos.z); d.m.rotation.y = time * 1.6 + d.spin;
    if (d.age > 300 || d.pos.y < -10) { scene.remove(d.m); drops.splice(i, 1); }
  }
}
function limparEntidades() { for (const d of drops) scene.remove(d.m); drops.length = 0; for (const p of projs) scene.remove(p.m); projs.length = 0; for (const t of tnts) scene.remove(t.m); tnts.length = 0; for (const p of parts) scene.remove(p.m); parts.length = 0; limparMobs(); if (holo) { scene.remove(holo.c.grupo); holo = null; } for (const e of especiais) scene.remove(e.g); especiais.length = 0; buff.barreira = false; }

// ================== PARTÍCULAS E EFEITOS ==================
const parts = []; const pGeo = new THREE.BoxGeometry(.1, .1, .1);
function particulas(x, y, z, cor, n = 8, sobe = false, vel = 3) { const col = new THREE.Color(cor); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true })); m.position.set(x + (Math.random() - .5) * .6, y + (Math.random() - .5) * .6, z + (Math.random() - .5) * .6); scene.add(m); parts.push({ m, v: new V3((Math.random() - .5) * vel, (sobe ? 1.5 : 2) + Math.random() * vel, (Math.random() - .5) * vel), life: .5 + Math.random() * .5, g: sobe ? -2 : 14 }); } }
function burst(x, y, z, b) { const col = TILEAVG[BD[b].tiles[1]] || TILEAVG[BD[b].tiles[0]]; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(pGeo, new THREE.MeshLambertMaterial({ color: col })); m.position.set(x + .2 + Math.random() * .6, y + .2 + Math.random() * .6, z + .2 + Math.random() * .6); scene.add(m); parts.push({ m, v: new V3((Math.random() - .5) * 3, 2 + Math.random() * 3, (Math.random() - .5) * 3), life: .6 + Math.random() * .4, g: 14 }); } }
const heartTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ff6f9a'; x.fillText('♥', 32, 36); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function hearts(p) { for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false })); s.scale.set(.35, .35, 1); s.position.set(p.x + (Math.random() - .5) * .6, p.y + 1.5 + Math.random() * .3, p.z + (Math.random() - .5) * .6); scene.add(s); parts.push({ m: s, v: new V3(0, .8 + Math.random() * .5, 0), life: 1.5, g: 0 }); } }
function updateParts(dt) { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.v.y -= p.g * dt; p.m.position.addScaledVector(p.v, dt); if (p.m.material.transparent) p.m.material.opacity = Math.min(1, p.life * 2); if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); parts.splice(i, 1); } } }
const fx = [];
function efeito(obj, vida, upd) { scene.add(obj); fx.push({ obj, vida, t: 0, upd }); }
function updateFx(dt) { for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; if (f.upd) f.upd(f.obj, f.t / f.vida); if (f.t >= f.vida) { scene.remove(f.obj); f.obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); fx.splice(i, 1); } } }
let shake = 0, flashT = 0;
function flash(x, y, z, k = 1) { flashLight.position.set(x, y, z); flashLight.intensity = 40 * k; flashT = .25; }
const brilhoTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const halo = (cor, s) => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilhoTex, color: cor, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); h.scale.setScalar(s); return h; };

// ================== DANO, VIDA, FOME ==================
function defesa() { let d = 0; for (const a of armor) if (a) d += ITEMS[a.id].def; return d; }
const temMola = () => armor && armor[3] && armor[3].id === IT.BOTAS_P;
function ferirJogador(dmg, dir, fonte) {
  if (!vivo || modo === 'cri' || !jogando) return;
  if (buff.escudo > 0 || buff.barreira) { particulas(P.pos.x, P.pos.y + 1, P.pos.z, '#7fd0ff', 6, true); som('gelo'); return; }
  const def = defesa(); const real = Math.max(.5, dmg * (1 - Math.min(20, def) * .04) / (P.escala > 1 ? 2 : 1));
  if (def) for (let i = 0; i < 4; i++) { const a = armor[i]; if (a) { a.d--; if (a.d <= 0) { armor[i] = null; toast(ITEMS[a.id].name + ' quebrou'); } } }
  st.vida -= real; som('dano'); $('dor').classList.remove('on'); void $('dor').offsetWidth; $('dor').classList.add('on'); shake = .25;
  if (dir) { P.vel.x += dir.x * 7; P.vel.z += dir.z * 7; P.vel.y = Math.max(P.vel.y, 4.5); }
  humorTemp(eu, 'surpresa', .8); st.exaust += .1;
  if (st.vida <= 0) morrer(fonte); renderStats();
}
const CAUSAS = { queda: 'caiu de muito alto', afogar: 'ficou sem ar', fome: 'passou fome', sombra: 'foi pego por uma sombrinha', espantalho: 'levou flechada do espantalho', aranha: 'foi mordido por uma aranha', gosma: 'foi esmagado por uma gosma', gosminha: 'foi esmagado por gosminhas', explosao: 'estava perto de uma explosão', flecha: 'levou uma flechada' };
function morrer(fonte) {
  vivo = false; st.vida = 0; mining.on = false; P.fly = false; P.gancho = null; setEscala(1);
  for (const i of ALL) if (inv[i]) { soltarItem(inv[i], 0, P.pos.x, P.pos.y + 1, P.pos.z, new V3((Math.random() - .5) * 4, 4, (Math.random() - .5) * 4), 2); inv[i] = null; }
  for (let i = 0; i < 4; i++) if (armor[i]) { soltarItem(armor[i], 0, P.pos.x, P.pos.y + 1, P.pos.z, null, 2); armor[i] = null; }
  humorTemp(eu, 'chorando', 99); conquistar('desmaio');
  $('morteCausa').textContent = 'Seu gatinho ' + (CAUSAS[fonte] || 'desmaiou') + '.';
  $('morte').hidden = false; if (document.pointerLockElement) document.exitPointerLock();
  renderHot(); saveSoon();
}
function renascer() {
  vivo = true; st.vida = 20; st.fome = 20; st.sat = 5; st.ar = 10; st.mana = 100;
  P.pos.set(...st.spawn); P.vel.set(0, 0, 0); P.quedaDe = null; $('morte').hidden = true; humorTemp(eu, 'normal', .1);
  if (collideAt()) { const g = groundAt(P.pos.x, P.pos.z, H - 3); if (g) P.pos.y = g; }
  renderStats(); saveSoon(); if (!isTouch) lockReq();
}
const collideAt = () => colide(P.pos.x, P.pos.y, P.pos.z, P.hw, P.h);
let regenT = 0, fomeT = 0, arT = 0;
function updateStats(dt, moved, sprint) {
  if (modo === 'cri' || !vivo) { st.ar = 10; return; }
  st.exaust += moved * (sprint ? .1 : .01);
  if (st.exaust >= 4) { st.exaust -= 4; if (st.sat > 0) st.sat = Math.max(0, st.sat - 1); else st.fome = Math.max(0, st.fome - 1); renderStats(); }
  fomeT += dt; if (fomeT > 45) { fomeT = 0; st.exaust += 2; }
  regenT += dt;
  if (st.fome >= 18 && st.vida < 20 && regenT > 3) { regenT = 0; st.vida = Math.min(20, st.vida + 1); st.exaust += 3; renderStats(); }
  if (st.fome <= 0 && regenT > 4) { regenT = 0; if (st.vida > 1) ferirJogador(1, null, 'fome'); }
  const cabeca = getBlock(P.pos.x, P.pos.y + EYE + .1, P.pos.z) === B.WATER;
  $('agua').classList.toggle('on', cabeca && buff.agua <= 0);
  arT += dt;
  if (cabeca && buff.agua <= 0) { if (arT > 1) { arT = 0; if (st.ar > 0) st.ar--; else ferirJogador(2, null, 'afogar'); renderStats(); } }
  else if (st.ar < 10 && arT > .3) { arT = 0; st.ar++; renderStats(); }
}

// ================== JOGADOR ==================
const keys = {}; const joy = { x: 0, y: 0 }; let jumpHeld = false, jumpPress = false, downHeld = false, agacharToque = false, sprintLatch = false, lastW = 0, passoT = 0;
const tecla = (a) => keys[TECLAS[a]];
function setEscala(k) {
  const old = P.escala; P.escala = k; P.h = 1.6 * k; P.hw = clamp(.3 * k, .14, .62); EYE = 1.45 * k;
  if (jogando && k > old && collideAt()) { P.escala = old; P.h = 1.6 * old; P.hw = clamp(.3 * old, .14, .62); EYE = 1.45 * old; toast('Sem espaço para crescer aqui!'); return false; }
  if (eu) eu.grupo.scale.setScalar(P.escala); return true;
}
function updatePlayer(dt) {
  if (!getChunk(Math.floor(P.pos.x / CS), Math.floor(P.pos.z / CS))) return;
  const travado = !!janela || !vivo;
  let f = travado ? 0 : (tecla('frente') || keys.ArrowUp ? 1 : 0) - (tecla('tras') || keys.ArrowDown ? 1 : 0) + joy.y;
  let r = travado ? 0 : (tecla('direita') || keys.ArrowRight ? 1 : 0) - (tecla('esquerda') || keys.ArrowLeft ? 1 : 0) + joy.x;
  let mag = Math.hypot(f, r); if (mag > 1) { f /= mag; r /= mag; mag = 1; }
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  const wx = -sy * f + cy * r, wz = -cy * f - sy * r;
  const inWater = P.inWater;
  const agachado = !travado && !P.fly && (tecla('agachar') || agacharToque);
  const sprint = !travado && !agachado && f > 0 && (tecla('correr') || sprintLatch || (isTouch && mag > .97)) && (st.fome > 6 || modo === 'cri');
  let sp = P.fly ? (modo === 'cri' ? 11 : 8) : (sprint ? 5.6 : 4.3); if (agachado) sp *= .32; if (buff.veloc > 0) sp *= 2; if (inWater && !P.fly) sp *= buff.agua > 0 ? 1.4 : .55;
  sp *= Math.sqrt(P.escala);
  if (getBlock(P.pos.x, P.pos.y + .3, P.pos.z) === B.TEIA) sp *= .2;
  const acc = Math.min(1, dt * (P.onGround || P.fly || inWater ? 14 : 5));
  P.vel.x = lerp(P.vel.x, wx * sp, acc); P.vel.z = lerp(P.vel.z, wz * sp, acc);
  const jh = jumpHeld && !travado;
  const jp = jumpPress && !travado; jumpPress = false;
  if (P.gancho) { const g = P.gancho; g.t += dt; const d = g.ponto.clone().sub(new V3(P.pos.x, P.pos.y + 1, P.pos.z)); const L = d.length(); if (L < 1.3 || g.t > 1.6 || jp) { P.gancho = null; buff.semQueda = true; if (cordaMesh) cordaMesh.visible = false; } else { P.vel.copy(d.normalize().multiplyScalar(22)); } }
  else if (P.fly) { const vt = ((jh ? 1 : 0) - ((downHeld || tecla('agachar')) ? 1 : 0)) * 9; P.vel.y = lerp(P.vel.y, vt, Math.min(1, dt * 10)); }
  else if (inWater) { P.vel.y -= 10 * dt; if (jh) P.vel.y += 24 * dt; P.vel.y = clamp(P.vel.y, -3, 4); }
  else {
    P.vel.y -= 28 * dt;
    if (jh && P.onGround) { P.vel.y = 8.4 * Math.sqrt(Math.max(1, P.escala)); st.exaust += .05; P.puloDuplo = false; }
    else if (jp && !P.onGround && temMola() && !P.puloDuplo) { P.puloDuplo = true; P.vel.y = 9.5; particulas(P.pos.x, P.pos.y, P.pos.z, '#ffffff', 8, true); som('magia'); }
    if (getBlock(P.pos.x, P.pos.y + .3, P.pos.z) === B.TEIA) P.vel.y = Math.max(P.vel.y, -1.2);
    P.vel.y = Math.max(P.vel.y, -45);
  }
  // agachado não cai da beirada
  if (agachado && P.onGround) {
    const chao = (x, z) => colide(x, P.pos.y - .08, z, P.hw * .8, .05);
    if (!chao(P.pos.x + P.vel.x * dt * 2, P.pos.z)) P.vel.x = 0;
    if (!chao(P.pos.x, P.pos.z + P.vel.z * dt * 2)) P.vel.z = 0;
  }
  const ox = P.pos.x, oz = P.pos.z;
  mover(P, dt);
  const moved = Math.hypot(P.pos.x - ox, P.pos.z - oz);
  if (!P.onGround && !P.fly && !inWater) { if (P.quedaDe === null || P.pos.y > P.quedaDe) P.quedaDe = P.pos.y; }
  if (P.onGround || inWater || P.fly) { if (P.quedaDe !== null && P.onGround && !buff.semQueda && !temMola()) { const q = P.quedaDe - P.pos.y; if (q > 3.5 * Math.max(1, P.escala)) ferirJogador(Math.floor(q - 3), null, 'queda'); } if (P.onGround) { buff.semQueda = false; P.puloDuplo = false; } P.quedaDe = null; }
  if (P.fly && P.onGround && !jh && modo === 'cri') setFly(false);
  if (P.hitWall && P.onGround && !P.fly && mag > .2 && !agachado) {
    const L = Math.max(.01, Math.hypot(wx, wz)); const ax = Math.floor(P.pos.x + wx / L * (P.hw + .3)), az = Math.floor(P.pos.z + wz / L * (P.hw + .3)), ay = Math.floor(P.pos.y);
    if (SOLID[getBlock(ax, ay, az)] && !SOLID[getBlock(ax, ay + 1, az)] && !SOLID[getBlock(ax, ay + 2, az)] && !SOLID[getBlock(P.pos.x, ay + 2, P.pos.z)]) P.vel.y = 8.4;
  }
  if (P.pos.y < -20) { if (modo === 'cri') { P.pos.set(...st.spawn); P.vel.set(0, 0, 0); } else ferirJogador(40, null, 'queda'); }
  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (mag > .1) P.avYaw = lerpAngle(P.avYaw, Math.atan2(wx, wz), dt * 12);
  if (mirando()) P.avYaw = lerpAngle(P.avYaw, P.yaw + PI, dt * 14);
  setAndar(eu, hs > .6 && (P.onGround || inWater || P.fly));
  if (P.onGround && hs > 1 && !agachado) { passoT -= dt * hs; if (passoT < 0) { passoT = 2.2; som('passo'); } }
  eu.grupo.position.copy(P.pos); eu.grupo.rotation.y = P.avYaw;
  if (eu.humorT > 0 && eu.humorT < 50) { eu.humorT -= dt; if (eu.humorT <= 0) eu.gato.humor('normal'); }
  eu.gato.atualizar(dt);
  poseBraco(dt);
  P.agachado = agachado;
  updateStats(dt, moved, sprint);
  if (buff.asas && modo === 'sob') { st.mana -= dt * 9; if (st.mana <= 0) { st.mana = 0; buff.asas = false; setFly(false); toast('Sem mana para voar'); } }
  if (buff.veloc > 0) { buff.veloc -= dt; if (Math.random() < dt * 20) particulas(P.pos.x, P.pos.y + .3, P.pos.z, '#ffe27a', 1, true, 1); }
  if (buff.escudo > 0) { buff.escudo -= dt; bolha.visible = true; bolha.scale.setScalar(P.escala); bolha.position.set(P.pos.x, P.pos.y + .85 * P.escala, P.pos.z); bolha.material.opacity = .18 + Math.sin(clockT * 6) * .05; } else bolha.visible = false;
  if (buff.invis > 0) { buff.invis -= dt; for (const m of eu.mats) { m.transparent = true; m.opacity = .3; } } else if (eu.mats[0] && eu.mats[0].opacity < 1) for (const m of eu.mats) { m.opacity = 1; m.transparent = false; }
  if (buff.barreira) { if (modo === 'sob') { st.mana -= dt * 6; if (st.mana <= 0) { st.mana = 0; buff.barreira = false; toast('A barreira caiu'); } }
    barr.visible = true; barr.scale.setScalar(P.escala); barr.position.set(P.pos.x, P.pos.y + .85 * P.escala, P.pos.z); barr.rotation.y += dt * .5; barr.material.opacity = .25 + Math.sin(clockT * 4) * .08;
    for (const m of mobs) { const d = m.pos.clone().sub(P.pos); d.y = 0; const L = d.length(); if (L < 2 && !m.d.pass) { d.normalize(); m.vel.x = d.x * 9; m.vel.z = d.z * 9; m.vel.y = 4; } } } else barr.visible = false;
  if (buff.tempo > 0) buff.tempo -= dt;
  if (buff.forca > 0) { buff.forca -= dt; if (buff.forca <= 0) toast('A super força acabou'); }
  if (buff.agua > 0) buff.agua -= dt;
  if (P.escalaT > 0) { P.escalaT -= dt; if (P.escalaT <= 0) { setEscala(1); toast('Voltou ao tamanho normal'); } }
  st.mana = Math.min(100, st.mana + dt * (temOrbe ? 7 : 0));
  const fovAlvo = OPC.fov + (sprint || buff.veloc > 0 ? 9 : 0);
  if (Math.abs(camera.fov - fovAlvo) > .05) { camera.fov = lerp(camera.fov, fovAlvo, Math.min(1, dt * 6)); camera.updateProjectionMatrix(); }
}
const barr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), new THREE.MeshBasicMaterial({ color: 0xbff4ff, wireframe: true, transparent: true, opacity: .3, depthWrite: false })); barr.visible = false; scene.add(barr);
const bolha = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 2), new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: .2, depthWrite: false })); bolha.visible = false; scene.add(bolha);
let cordaMesh = null;
function goHome() { P.pos.set(...st.spawn); P.vel.set(0, 0, 0); P.quedaDe = null; toast('De volta para casa 🏠'); }
function setFly(v) { P.fly = v && (modo === 'cri' || buff.asas); document.body.classList.toggle('voando', P.fly); $('bVoar').classList.toggle('on', P.fly); if (P.fly && buff.asas) conquistar('voar'); }

// item na mão
let heldId = -1, heldMesh = null, vm = null, swingT = 0;
const qx = new THREE.Quaternion(), eixoX = new V3(1, 0, 0);
const mirando = () => { const it = heldIt(); return !!(it && (it.arma === 'arco' || it.arma === 'arma' || it.poder === 'laser' || it.poder === 'rajada') && (mining.on)); };
function atualizarItemMao() {
  const h = held(); const id = h ? h.id : 0;
  if (id === heldId || !eu) return; heldId = id;
  if (heldMesh) { heldMesh.parent && heldMesh.parent.remove(heldMesh); heldMesh = null; }
  if (vm) { camera.remove(vm); vm = null; }
  iconeAcaoCanvas();
  if (!id) return;
  const alvo = eu.mao || eu.grupo;
  heldMesh = malhaItem(id, .55); alvo.add(heldMesh);
  eu.grupo.updateMatrixWorld(true); const ws = new V3(); alvo.getWorldScale(ws);
  heldMesh.scale.multiplyScalar(1 / ws.x); heldMesh.position.set(0, -.09 / ws.x, -.07 / ws.x);
  if (!ehCubo(id)) heldMesh.rotation.set(0, PI / 2, PI * .75);
  vm = malhaItem(id, .3, true); vm.position.set(.36, -.3, -.6); if (!ehCubo(id)) vm.rotation.set(0, -.5, .25); else vm.rotation.set(.3, .6, 0); camera.add(vm);
}
function iconeAcao() { const it = heldIt(); if (!it) return '⛏️'; if (it.arma === 'melee') return '⚔️'; if (it.arma === 'arco') return '🏹'; if (it.arma === 'arma') return '💥'; if (it.arma === 'escudo') return '🛡️'; if (it.poder) return '✨'; if (it.arremesso) return '💣'; return '⛏️'; }
function poseBraco(dt) {
  if (swingT > 0) swingT -= dt;
  const s = swingT > 0 ? Math.sin((1 - swingT / .3) * PI) : 0;
  if (eu.braco) { const ang = -(s * 1.4 + (mirando() ? 1.3 : 0)); if (ang) { qx.setFromAxisAngle(eixoX, ang); eu.braco.quaternion.multiply(qx); } }
  if (vm) { const bob = OPC.bob ? Math.sin(clockT * 9) * .012 * Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 4) : 0; vm.position.y = -.3 + bob - s * .08; vm.rotation.x = (ehCubo(heldId) ? .3 : 0) - s * .9; vm.visible = camModo === 0; }
}

// ================== CÂMERA E MIRA ==================
const camDir = new V3(), aimO = new V3(), aimD = new V3();
function updateCamera(dt) {
  if (!eu) return;
  if (!jogando) { // panorama da tela de título
    const t = clockT * .05; const c = mundoAtual && !mundoAtual.vila ? P.pos : new V3(0, VH, 0);
    camera.position.set(c.x + Math.cos(t) * 26, c.y + 14, c.z + Math.sin(t) * 26); camera.lookAt(c.x, c.y + 2, c.z); eu.grupo.visible = true; return;
  }
  const hx = P.pos.x, hy = P.pos.y + EYE - (P.agachado ? .25 : 0), hz = P.pos.z;
  const sh = shake > 0 ? (Math.random() - .5) * shake * .5 : 0; if (shake > 0) shake -= dt;
  camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  camDir.set(0, 0, -1).applyEuler(camera.rotation);
  if (camModo === 0) { const bob = OPC.bob && P.onGround ? Math.sin(clockT * 10) * .03 * Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 4) : 0; camera.position.set(hx + sh, hy + sh + bob, hz); eu.grupo.visible = false; P.camDist = 0; aimO.copy(camera.position); aimD.copy(camDir); return; }
  const back = camModo === 1 ? -1 : 1; const oy = hy + .6 * P.escala; const maxD = 4.2 * Math.max(1, P.escala);
  let dist = maxD;
  for (let s = .3; s <= maxD; s += .1) { const x = hx + back * camDir.x * s, y = oy + back * camDir.y * s, z = hz + back * camDir.z * s; if (OPAQUE[getBlock(x, y, z)]) { dist = Math.max(.2, s - .3); break; } }
  camera.position.set(hx + back * camDir.x * dist + sh, oy + back * camDir.y * dist + sh, hz + back * camDir.z * dist);
  if (camModo === 2) { camera.lookAt(hx, oy - .3, hz); aimO.set(hx, hy, hz); aimD.copy(camDir); P.camDist = 0; }
  else { aimO.copy(camera.position); aimD.copy(camDir); P.camDist = dist; }
  eu.grupo.visible = dist > 1;
}
const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: .6 })); scene.add(selBox);
const crackTex = []; { const N = 32, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'); const r = mulberry(5); const segs = []; const pts = [[16, 16]]; for (let i = 0; i < 70; i++) { const p = pts[(r() * pts.length) | 0]; const q = [clamp(p[0] + ((r() * 7) | 0) - 3, 0, 31), clamp(p[1] + ((r() * 7) | 0) - 3, 0, 31)]; segs.push([p, q]); pts.push(q); }
  for (let s = 0; s < 8; s++) { x.clearRect(0, 0, N, N); const n = Math.round((s + 1) / 8 * segs.length); for (let i = 0; i < n; i++) { const [a, b] = segs[i]; const stp = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1; for (let k = 0; k <= stp; k++) { const px = Math.round(lerp(a[0], b[0], k / stp)), py = Math.round(lerp(a[1], b[1], k / stp)); x.fillStyle = 'rgba(16,12,10,.9)'; x.fillRect(px, py, 1, 1); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px - 1, py - 1, 1, 1); } } const c2 = document.createElement('canvas'); c2.width = c2.height = N; c2.getContext('2d').drawImage(cv, 0, 0); const t = new THREE.CanvasTexture(c2); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; crackTex.push(t); } }
const crackMat = new THREE.MeshBasicMaterial({ map: crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const crack = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), crackMat); crack.visible = false; scene.add(crack);
let hit = null, mobHit = null;
const rc = new THREE.Raycaster();
const alcance = () => P.camDist + 5 * Math.max(1, P.escala * .8);
function updateSelection() {
  hit = raycast(aimO, aimD, alcance());
  const it = heldIt(); const alc = P.camDist + (it && it.alcance ? it.alcance : 3.6) * Math.max(1, P.escala * .8);
  mobHit = rayMob(aimO, aimD, alc); if (mobHit && hit && hit.t < mobHit.t) mobHit = null;
  if (hit && !janela && !mobHit) { selBox.visible = true; selBox.position.set(hit.x + .5, hit.y + .5, hit.z + .5); } else selBox.visible = false;
}
function catInSight() { if (!ela) return false; rc.set(aimO, aimD); rc.far = alcance(); const h = rc.intersectObject(ela.grupo, true); if (!h.length) return false; if (hit && hit.t < h[0].distance) return false; return true; }
function linhaDeVisao(x, y, z) { const o = new V3(x, y, z), alvo = new V3(P.pos.x, P.pos.y + 1.2, P.pos.z); const d = alvo.clone().sub(o); const L = d.length(); d.normalize(); const h = raycast(o, d, L); return !h || h.t > L - .5; }
function olho() { return new V3(P.pos.x, P.pos.y + EYE, P.pos.z); }
function mira(maxD = 60) { const h = raycast(aimO, aimD, maxD + P.camDist); const mh = rayMob(aimO, aimD, maxD + P.camDist); let t = maxD + P.camDist; if (h) t = Math.min(t, h.t); if (mh && mh.t < t) t = mh.t; return aimO.clone().addScaledVector(aimD, t); }

// ================== MINERAR / ATACAR / USAR ==================
const mining = { on: false, key: '', prog: 0, cd: 0, somT: 0, antes: false };
let atkCd = 0, laserOn = false, laserBeam = null, laserHeat = { k: '', t: 0 }, rajadaCarga = 0;
function breakTime(b) {
  const d = BD[b]; if (!isFinite(d.hard)) return Infinity; if (modo === 'cri') return 0; if (buff.forca > 0) return .06;
  const it = heldIt(); const right = it && it.tool && it.tool === d.tool;
  if (d.tier && !(right && it.tier >= d.tier)) return d.hard * 5;
  return d.hard * 1.5 / (right ? it.speed : 1) / (P.escala > 1 ? 2 : 1);
}
const material = (b) => ({ pic: 'pedra', mac: 'madeira' }[BD[b].tool] || 'terra');
function finishBreak(t, semDrop) {
  const d = BD[t.b];
  burst(t.x, t.y, t.z, t.b); som('quebrar', material(t.b)); setBlock(t.x, t.y, t.z, 0);
  const cx = t.x + .5, cy = t.y + .5, cz = t.z + .5;
  if (PLANT[getBlock(t.x, t.y + 1, t.z)]) { const up = getBlock(t.x, t.y + 1, t.z); setBlock(t.x, t.y + 1, t.z, 0); if (modo !== 'cri') dropFor(up, cx, cy + 1, cz); }
  const k = posKey(t.x, t.y, t.z);
  if (t.b === B.FURNACE && furnaces.has(k)) { const f = furnaces.get(k); for (const s of [f.in, f.fuel, f.out]) if (s) soltarItem(s, 0, cx, cy, cz); furnaces.delete(k); }
  if (t.b === B.CHEST && chests.has(k)) { for (const s of chests.get(k)) if (s) soltarItem(s, 0, cx, cy, cz); chests.delete(k); }
  if (modo === 'cri' || semDrop) return;
  const it = heldIt(); const right = it && it.tool && it.tool === d.tool;
  if (it && it.dur && d.hard > 0 && it.tool) usarDur();
  if (d.tier && !(right && it.tier >= d.tier) && buff.forca <= 0) return;
  dropFor(t.b, cx, cy, cz);
}
function dropFor(b, x, y, z) {
  const d = BD[b]; let drop = d.drop === undefined ? b : d.drop;
  if (drop === 'folha') { const r = Math.random(); drop = r < .1 ? IT.GRAVETO : r < .15 ? IT.MACA : 0; }
  if (drop === 'capim') drop = Math.random() < .12 ? IT.TRIGO : 0;
  if (drop) soltarItem(drop, 1, x, y, z);
}
function atacarMob() {
  const it = heldIt(); let dmg = it ? (it.dmg || 1) : 1; const cd = it && it.cd ? it.cd : .45;
  if (atkCd > 0) return; atkCd = cd;
  const m = mobHit.m; const dir = new V3(m.pos.x - P.pos.x, 0, m.pos.z - P.pos.z).normalize();
  const crit = !P.onGround && P.vel.y < 0; if (buff.forca > 0) dmg *= 3; if (P.escala > 1) dmg *= 2;
  m.ferir(dmg * (crit ? 1.5 : 1), dir.multiplyScalar(buff.forca > 0 ? 3 : 1), 'jogador'); if (crit) particulas(m.pos.x, m.pos.y + 1, m.pos.z, '#ffe14a', 8);
  if (it && it.id === IT.SABRE) particulas(m.pos.x, m.pos.y + 1, m.pos.z, '#7aeef8', 6);
  if (!m.vivo && !m.d.pass) conquistar('monstro');
  swingT = .3; st.exaust += .1; if (it && it.dur) usarDur();
}
function acaoPrincipal(dt) {
  atkCd -= dt; mining.cd -= dt;
  const it = heldIt();
  // soltar a rajada carregada
  if (!mining.on && rajadaCarga > 0) { if (it && it.poder === 'rajada') soltarRajada(); rajadaCarga = 0; $('carga2').style.display = 'none'; }
  if (!mining.on || janela || !vivo) { crack.visible = false; mining.prog = 0; laserOn = false; return; }
  if (catInSight() && (!it || (!it.arma && !it.poder))) { if (mining.cd <= 0) { carinho(); mining.cd = .9; } crack.visible = false; return; }
  if (it && it.poder) { crack.visible = false; usarPoder(it, dt); return; }
  if (it && (it.arma === 'arco' || it.arma === 'arma')) { crack.visible = false; atirar(it); return; }
  if (it && it.arma === 'escudo') { crack.visible = false; if (!escudoVoando && atkCd <= 0) { atkCd = it.cd; lancarEscudo(); } return; }
  if (it && it.arremesso) { if (atkCd <= 0) { atkCd = .6; arremessar(); } return; }
  if (mobHit) { crack.visible = false; mining.prog = 0; atacarMob(); return; }
  if (!hit) { crack.visible = false; mining.prog = 0; return; }
  const k = posKey(hit.x, hit.y, hit.z);
  if (k !== mining.key) { mining.key = k; mining.prog = 0; }
  const T = breakTime(hit.b); if (!isFinite(T)) { crack.visible = false; return; }
  if (modo === 'cri') { if (mining.cd <= 0) { finishBreak(hit); mining.cd = .22; mining.key = ''; swingT = .3; } return; }
  mining.prog += dt / Math.max(.05, T); st.exaust += dt * .005;
  mining.somT -= dt; if (mining.somT <= 0) { mining.somT = .24; som('bater', material(hit.b)); swingT = .3; }
  if (mining.prog >= 1) { finishBreak(hit); mining.prog = 0; mining.key = ''; crack.visible = false; return; }
  crack.visible = true; crack.position.set(hit.x + .5, hit.y + .5, hit.z + .5);
  crackMat.map = crackTex[Math.min(7, Math.floor(mining.prog * 8))];
}
function carinho() { hearts(npc.pos); humorTemp(ela, 'apaixonada', 3); eu.gato.acao('acenar'); som('miau'); conquistar('carinho'); if (npc.state === 'walk') { npc.state = 'idle'; npc.t = 4; } }
let martCd = 0;
function usar() {
  if (janela || !vivo || !jogando || pausado) return;
  iniciarSom();
  if (catInSight()) { carinho(); return; }
  const ald = aldeaoNaMira(); if (ald) { abrirTroca(ald); return; }
  const h = held(), it = heldIt();
  if (it && it.food) { if (st.fome < 20 || modo === 'cri') { st.fome = Math.min(20, st.fome + it.food); st.sat = Math.min(st.fome, st.sat + it.food * .6); if (modo !== 'cri') { h.n--; if (!h.n) inv[sel] = null; } som('comer'); humorTemp(eu, 'feliz', 1.2); particulas(P.pos.x, P.pos.y + 1.3, P.pos.z, '#e0a050', 5); conquistar('comer'); renderHot(); renderStats(); } else toast('Seu gatinho está cheio'); return; }
  if (it && it.pocao) { const k = it.pocao === 'crescer' ? 2.2 : .45; if (setEscala(k)) { P.escalaT = 30; som('magia'); particulas(P.pos.x, P.pos.y + 1, P.pos.z, it.pocao === 'crescer' ? '#ff6a6a' : '#6aa8ff', 20, true); if (modo !== 'cri') { h.n--; if (!h.n) inv[sel] = null; } if (it.pocao === 'crescer') conquistar('gigante'); renderHot(); } return; }
  if (it && it.armor != null) { const old = armor[it.armor]; armor[it.armor] = h; inv[sel] = old; som('colocar'); if (armor.every((a) => a)) conquistar('armadura'); renderHot(); renderStats(); return; }
  if (it && it.poder === 'asas') { buff.asas = !buff.asas; if (!buff.asas) setFly(false); else { setFly(true); P.vel.y = 6; } toast(buff.asas ? 'Asas abertas ✨ (pule para subir)' : 'Asas fechadas'); return; }
  if (it && it.poder === 'barr') { buff.barreira = !buff.barreira; toast(buff.barreira ? 'Barreira absoluta ligada' : 'Barreira desligada'); som('magia'); if (buff.barreira) conquistar('poder'); return; }
  if (it && it.poder === 'noite') { buff.noite = !buff.noite; toast(buff.noite ? 'Visão noturna ligada' : 'Visão noturna desligada'); som('magia'); return; }
  if (it && it.raioUsar) { if (martCd <= 0) { martCd = 2; raio(mira(60)); swingT = .3; } return; }
  if (!hit) return;
  if (hit.b === B.TABLE) { abrirJanela('bancada'); return; }
  if (hit.b === B.FURNACE) { abrirJanela('fornalha', posKey(hit.x, hit.y, hit.z)); return; }
  if (hit.b === B.CHEST) { abrirJanela('bau', posKey(hit.x, hit.y, hit.z)); return; }
  if (hit.b === B.BED) { dormir(hit); return; }
  if (hit.b === B.TNT && it && it.isqueiro) { acenderTNT(hit.x, hit.y, hit.z, 3); usarDur(); conquistar('kabum'); return; }
  if (!h || h.id >= 100) return;
  const id = h.id;
  let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (PLANT[hit.b]) { x = hit.x; y = hit.y; z = hit.z; }
  const cur = getBlock(x, y, z); if (cur && cur !== B.WATER && !PLANT[cur]) return;
  if (PLANT[id] && id !== B.TEIA && !SOLID[getBlock(x, y - 1, z)]) return;
  if (SOLID[id]) {
    if (x + 1 > P.pos.x - P.hw && x < P.pos.x + P.hw && y + 1 > P.pos.y && y < P.pos.y + P.h && z + 1 > P.pos.z - P.hw && z < P.pos.z + P.hw) return;
    if (Math.floor(npc.pos.x) === x && Math.floor(npc.pos.z) === z && (y === Math.floor(npc.pos.y) || y === Math.floor(npc.pos.y) + 1)) return;
    for (const m of mobs) if (x + 1 > m.pos.x - m.hw && x < m.pos.x + m.hw && z + 1 > m.pos.z - m.hw && z < m.pos.z + m.hw && y + 1 > m.pos.y && y < m.pos.y + m.h) return;
  }
  setBlock(x, y, z, id); som('colocar'); swingT = .3;
  if (modo !== 'cri') { h.n--; if (!h.n) inv[sel] = null; renderHot(); saveSoon(); }
}
let dormindo = 0;
function dormir(h) {
  st.spawn = [h.x + .5, h.y + 1, h.z + .5]; saveSoon();
  if (dia() > .35) { toast('Ponto de renascer salvo. Só dá para dormir à noite.'); return; }
  if (mobsPerto(P.pos, 10).some((m) => !m.d.pass)) { toast('Não dá para dormir com monstros por perto'); return; }
  dormindo = 2.2; $('sono').classList.add('on'); som('dormir'); humorTemp(eu, 'dormindo', 2.2); conquistar('dormir');
}

// ================== PROJÉTEIS / EXPLOSÕES ==================
const projs = [];
const geoFlecha = new THREE.CylinderGeometry(.025, .025, .7, 4); geoFlecha.rotateX(PI / 2);
function flecha(o, dir, vel, dmg, dono) { const m = new THREE.Mesh(geoFlecha, new THREE.MeshLambertMaterial({ color: dono === 'mob' ? 0x8a6a3a : 0xd8c8a0 })); scene.add(m); projs.push({ tipo: 'flecha', pos: o.clone(), vel: dir.clone().multiplyScalar(vel), m, dmg, dono, vida: 8, g: 14 }); }
function bola(tipo, o, dir) {
  const CFG = { fogo: [0xff7a2a, 26, 7, 5, 0, .28], gelo: [0x8fe4ff, 26, 4, 5, 0, .28], granada: [0x4f6b3a, 16, 0, 2.4, 20, 0], teia: [0xf4f4f8, 30, 2, 3, 6, .18], faisca: [0xffe86a, 24, 5, 3, 0, .16], rajada: [0x6ab0ff, 22, 0, 4, 0, .6], meteoro: [0xff8a3a, 30, 14, 5, 0, .7] }[tipo];
  let m;
  if (tipo === 'granada') m = malhaItem(IT.GRANADA, .35);
  else { m = new THREE.Mesh(new THREE.IcosahedronGeometry(CFG[5], 1), new THREE.MeshBasicMaterial({ color: CFG[0] })); m.add(halo(CFG[0], CFG[5] * 6)); }
  scene.add(m); projs.push({ tipo, pos: o.clone(), vel: dir.clone().multiplyScalar(CFG[1]), m, dmg: CFG[2], dono: 'jogador', vida: CFG[3], g: CFG[4] });
  return projs[projs.length - 1];
}
function updateProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.vida -= dt; let fim = p.vida <= 0;
    if (p.preso) { if (fim) { scene.remove(p.m); projs.splice(i, 1); } continue; }
    if (p.tipo === 'escudo') { if (atualizarEscudo(p, dt)) { scene.remove(p.m); projs.splice(i, 1); } continue; }
    if (p.tipo === 'faisca') { let alvo = null, best = 14; for (const m of mobs) { if (!m.vivo) continue; const d = m.pos.distanceTo(p.pos); if (d < best) { best = d; alvo = m; } } if (alvo) { const des = new V3(alvo.pos.x, alvo.pos.y + alvo.h * .5, alvo.pos.z).sub(p.pos).normalize().multiplyScalar(p.vel.length()); p.vel.lerp(des, Math.min(1, dt * 5)); } if (Math.random() < .7) particulas(p.pos.x, p.pos.y, p.pos.z, Math.random() < .5 ? '#fff6a0' : '#ffd040', 1, true, .5); }
    p.vel.y -= p.g * dt;
    const steps = Math.ceil(p.vel.length() * dt / .25) || 1;
    for (let s = 0; s < steps && !fim; s++) {
      const prev = p.pos.clone(); p.pos.addScaledVector(p.vel, dt / steps);
      const b = getBlock(p.pos.x, p.pos.y, p.pos.z);
      if (p.tipo === 'gelo' && b === B.WATER) { congelarAgua(p.pos); fim = true; break; }
      if (SOLID[b] && !PLANT[b]) {
        if (p.tipo === 'granada') { const nx = Math.floor(prev.x) !== Math.floor(p.pos.x), ny = Math.floor(prev.y) !== Math.floor(p.pos.y), nz = Math.floor(prev.z) !== Math.floor(p.pos.z); p.pos.copy(prev); if (nx) p.vel.x *= -.4; if (ny) p.vel.y *= -.4; if (nz) p.vel.z *= -.4; p.vel.multiplyScalar(.8); continue; }
        if (p.tipo === 'flecha') { p.pos.copy(prev); p.preso = true; p.vida = 8; if (p.dono === 'jogador') { scene.remove(p.m); projs.splice(i, 1); soltarItem(IT.FLECHA, 1, prev.x, prev.y, prev.z, new V3(), .2); fim = 'removido'; } break; }
        if (p.tipo === 'teia') { const x = Math.floor(prev.x), y = Math.floor(prev.y), z = Math.floor(prev.z); if (!getBlock(x, y, z)) setBlock(x, y, z, B.TEIA); }
        p.pos.copy(prev); fim = true; break;
      }
      if (p.dono === 'mob' && buff.barreira && p.pos.distanceTo(new V3(P.pos.x, P.pos.y + .9, P.pos.z)) < 1.6) { particulas(p.pos.x, p.pos.y, p.pos.z, '#bff4ff', 5); fim = true; break; }
      if (p.dono === 'mob') { if (vivo && Math.abs(p.pos.x - P.pos.x) < P.hw + .15 && Math.abs(p.pos.z - P.pos.z) < P.hw + .15 && p.pos.y > P.pos.y && p.pos.y < P.pos.y + P.h) { ferirJogador(p.dmg, p.vel.clone().setY(0).normalize(), 'flecha'); fim = true; } }
      else if (p.tipo !== 'granada') { for (const m of mobs) { if (!m.vivo) continue; if (Math.abs(p.pos.x - m.pos.x) < m.hw + .15 + (p.tipo === 'rajada' ? .5 : 0) && Math.abs(p.pos.z - m.pos.z) < m.hw + .15 + (p.tipo === 'rajada' ? .5 : 0) && p.pos.y > m.pos.y - .3 && p.pos.y < m.pos.y + m.h + .3) {
        const dmg = p.tipo === 'flecha' ? p.dmg * Math.min(1.5, p.vel.length() / 30) : p.dmg; m.ferir(dmg, p.vel.clone().setY(0).normalize(), 'jogador');
        if (!m.vivo && !m.d.pass) conquistar('monstro');
        if (p.tipo === 'gelo') { m.congelado = 5; particulas(m.pos.x, m.pos.y + 1, m.pos.z, '#bff4ff', 10, true); }
        if (p.tipo === 'teia') { m.congelado = 6; particulas(m.pos.x, m.pos.y + 1, m.pos.z, '#ffffff', 12, true); }
        fim = true; break; } } }
    }
    if (fim === 'removido') continue;
    if (p.tipo === 'flecha') p.m.lookAt(p.pos.clone().add(p.vel));
    p.m.position.copy(p.pos); if (p.tipo === 'granada') p.m.rotation.x += dt * 8;
    if (p.tipo === 'fogo' && Math.random() < .6) particulas(p.pos.x, p.pos.y, p.pos.z, Math.random() < .5 ? '#ffb347' : '#ff5a2a', 1, true, .6);
    if (p.tipo === 'meteoro') { particulas(p.pos.x, p.pos.y, p.pos.z, Math.random() < .5 ? '#ffb347' : '#555555', 2, true, 1); p.m.rotation.x += dt * 5; }
    if (p.tipo === 'rajada') { particulas(p.pos.x, p.pos.y, p.pos.z, Math.random() < .5 ? '#bfe0ff' : '#6ab0ff', 2, true, 1.5); p.m.rotation.y += dt * 9; }
    if (fim) {
      if (p.tipo === 'granada') explodir(p.pos.x, p.pos.y, p.pos.z, 3, true, 14);
      else if (p.tipo === 'fogo') explodir(p.pos.x, p.pos.y, p.pos.z, 2, false, 8);
      else if (p.tipo === 'rajada') explodir(p.pos.x, p.pos.y, p.pos.z, p.raio, true, p.dmg);
      else if (p.tipo === 'meteoro') explodir(p.pos.x, p.pos.y, p.pos.z, 2.6, true, 16);
      else if (p.tipo === 'gelo') { particulas(p.pos.x, p.pos.y, p.pos.z, '#bff4ff', 10, true); som('gelo'); }
      else if (p.tipo === 'teia' || p.tipo === 'faisca') particulas(p.pos.x, p.pos.y, p.pos.z, p.tipo === 'teia' ? '#ffffff' : '#ffe86a', 8, true);
      scene.remove(p.m); projs.splice(i, 1);
    }
  }
}
function congelarAgua(p) { som('gelo'); for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz; if (dx * dx + dz * dz > 5) continue; for (let y = Math.floor(p.y) + 1; y >= Math.floor(p.y) - 2; y--) { if (getBlock(x, y, z) === B.WATER && getBlock(x, y + 1, z) !== B.WATER) { setBlock(x, y, z, B.ICE); break; } } } particulas(p.x, p.y, p.z, '#e8fbff', 16, true); }
// escudo bumerangue
let escudoVoando = false;
function lancarEscudo() { const o = olho(); const d = mira(30).sub(o).normalize(); const m = malhaItem(IT.ESCUDO_B, .7); scene.add(m); projs.push({ tipo: 'escudo', pos: o.addScaledVector(d, .8), vel: d.multiplyScalar(24), m, t: 0, volta: false, atingidos: new Set(), vida: 6 }); escudoVoando = true; swingT = .3; som('arco'); }
function atualizarEscudo(p, dt) {
  p.t += dt; p.m.rotation.y += dt * 18; p.m.rotation.x = PI / 2;
  if (p.volta || p.t > .7) { p.volta = true; const alvo = new V3(P.pos.x, P.pos.y + 1.2, P.pos.z); const d = alvo.clone().sub(p.pos); if (d.length() < 1) { escudoVoando = false; som('pegar'); return true; } p.vel.copy(d.normalize().multiplyScalar(26)); }
  p.pos.addScaledVector(p.vel, dt);
  if (!p.volta && SOLID[getBlock(p.pos.x, p.pos.y, p.pos.z)]) { p.volta = true; particulas(p.pos.x, p.pos.y, p.pos.z, '#ffd040', 6); som('bater', 'pedra'); }
  for (const m of mobs) if (m.vivo && !p.atingidos.has(m) && m.pos.distanceTo(p.pos) < m.hw + .9 && p.pos.y > m.pos.y - .3 && p.pos.y < m.pos.y + m.h + .3) { p.atingidos.add(m); m.ferir(ITEMS[IT.ESCUDO_B].dmg, p.vel.clone().setY(0).normalize(), 'jogador'); if (!m.vivo && !m.d.pass) conquistar('monstro'); }
  p.m.position.copy(p.pos);
  if (p.t > 6) { escudoVoando = false; return true; }
  return false;
}
const tnts = [];
function acenderTNT(x, y, z, t) {
  setBlock(x, y, z, 0); const m = new THREE.Mesh(cuboGeo(B.TNT), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveIntensity: 0 }));
  scene.add(m); tnts.push({ pos: new V3(x + .5, y, z + .5), vel: new V3((Math.random() - .5), 3, (Math.random() - .5)), hw: .49, h: .98, m, t }); som('fusivel');
}
function updateTNT(dt) {
  for (let i = tnts.length - 1; i >= 0; i--) { const t = tnts[i]; t.t -= dt; t.vel.y -= 20 * dt; t.vel.x *= .95; t.vel.z *= .95; mover(t, dt); t.m.position.set(t.pos.x, t.pos.y + .49, t.pos.z); const k = 1 + (1 - Math.max(0, t.t) / 3) * .15; t.m.scale.setScalar(k); t.m.material.emissiveIntensity = (Math.floor(t.t * 6) % 2) ? .8 : 0;
    if (t.t <= 0) { scene.remove(t.m); tnts.splice(i, 1); explodir(t.pos.x, t.pos.y + .5, t.pos.z, 4, true, 20); } }
}
function explodir(x, y, z, r, blocos, dmg) {
  som('explosao'); flash(x, y, z, 1.4); shake = Math.max(shake, .5 * Math.max(0, 1 - P.pos.distanceTo(new V3(x, y, z)) / 25));
  particulas(x, y, z, '#ffb347', 18, true, 7); particulas(x, y, z, '#555555', 18, true, 5); particulas(x, y, z, '#ffffff', 10, false, 9);
  const esf = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: .8, depthWrite: false })); esf.position.set(x, y, z);
  efeito(esf, .35, (o, k) => { o.scale.setScalar(r * (.4 + k)); o.material.opacity = .8 * (1 - k); });
  if (blocos) {
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dy, dz); if (d > r - Math.random() * .8) continue;
      const bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz; const b = getBlock(bx, by, bz);
      if (!b || b === B.BEDROCK || b === B.WATER) continue;
      if (b === B.TNT) { acenderTNT(bx, by, bz, .4 + Math.random() * .5); continue; }
      const k = posKey(bx, by, bz);
      if (b === B.CHEST && chests.has(k)) { for (const s of chests.get(k)) if (s) soltarItem(s, 0, bx + .5, by + .5, bz + .5); chests.delete(k); }
      setBlock(bx, by, bz, 0);
      if (modo !== 'cri' && Math.random() < .3) { const dr = BD[b].drop === undefined ? b : BD[b].drop; if (typeof dr === 'number' && dr) soltarItem(dr, 1, bx + .5, by + .5, bz + .5); }
    }
  }
  const c = new V3(x, y, z);
  for (const m of mobs) { const d = m.pos.distanceTo(c); if (d < r * 2) { const k = 1 - d / (r * 2); m.ferir(dmg * k, m.pos.clone().sub(c).setY(0).normalize().multiplyScalar(1 + k * 2), 'jogador'); m.vel.y += 6 * k; if (!m.vivo && !m.d.pass) conquistar('monstro'); } }
  const dp = new V3(P.pos.x, P.pos.y + .8, P.pos.z).distanceTo(c);
  if (dp < r * 2) { const k = 1 - dp / (r * 2); ferirJogador(dmg * k * .8, P.pos.clone().sub(c).setY(0).normalize(), 'explosao'); P.vel.y += 8 * k; }
}

// ================== ARMAS ==================
let atirarSegurado = false, avisoMunicao = false;
function atirar(it) {
  if (atkCd > 0) return; if (!it.auto && atirarSegurado) return;
  if (!temItem(it.ammo)) { if (!avisoMunicao) { toast(it.arma === 'arco' ? 'Sem flechas' : 'Sem munição'); avisoMunicao = true; } return; }
  atkCd = it.cd; atirarSegurado = true; consumir(it.ammo, 1); usarDur(); swingT = .15;
  const alvo = mira(80); const o = olho(); const dir0 = alvo.clone().sub(o).normalize();
  const mao = o.clone().addScaledVector(dir0, .6);
  if (it.arma === 'arco') { flecha(mao, dir0, it.vel, it.dmg, 'jogador'); som('arco'); return; }
  som(it.pellets > 1 ? 'escopeta' : 'tiro'); flash(mao.x, mao.y, mao.z, .35); shake = Math.max(shake, it.pellets > 1 ? .2 : .08);
  P.pitch = clamp(P.pitch + (it.pellets > 1 ? .06 : .02), -1.5, 1.5);
  for (let k = 0; k < it.pellets; k++) {
    const d = dir0.clone().add(new V3((Math.random() - .5) * 2 * it.spread, (Math.random() - .5) * 2 * it.spread, (Math.random() - .5) * 2 * it.spread)).normalize();
    const bh = raycast(mao, d, 90), mh = rayMob(mao, d, 90);
    let t = 90; let alvoMob = null; if (bh) t = bh.t; if (mh && mh.t < t) { t = mh.t; alvoMob = mh.m; }
    const fim = mao.clone().addScaledVector(d, t);
    if (alvoMob) { alvoMob.ferir(it.dmg, d.clone().setY(0).normalize().multiplyScalar(.5), 'jogador'); if (!alvoMob.vivo && !alvoMob.d.pass) conquistar('monstro'); }
    else if (bh) { particulas(fim.x, fim.y, fim.z, '#d8d0c0', 3); if (bh.b === B.GLASS || bh.b === B.ICE) { setBlock(bh.x, bh.y, bh.z, 0); som('quebrar', 'pedra'); } }
    const g = new THREE.BufferGeometry().setFromPoints([mao, fim]);
    efeito(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xfff2a0, transparent: true })), .07, (o2, kk) => { o2.material.opacity = 1 - kk; });
  }
}
function arremessar() { const h = held(); if (!h) return; const o = olho(); const d = mira(40).sub(o).normalize(); d.y += .15; d.normalize(); bola('granada', o.addScaledVector(d, .7), d); if (modo !== 'cri') { h.n--; if (!h.n) inv[sel] = null; } renderHot(); swingT = .3; }

// ================== PODERES ==================
let temOrbe = false; const poderCd = {};
function gastarMana(n) { if (modo === 'cri') return true; if (st.mana < n) { toast('Mana insuficiente'); return false; } st.mana -= n; return true; }
function usarPoder(it, dt) {
  const p = it.poder; poderCd[p] = poderCd[p] || 0;
  if (p === 'laser') { laserOn = true; if (poderCd[p] > 0) return; if (!gastarMana(it.mana)) { laserOn = false; return; } poderCd[p] = it.cd; laserTick(); conquistar('poder'); return; }
  if (p === 'jet') { if (!gastarMana(it.mana * dt * 20)) return; P.vel.y = lerp(P.vel.y, 9, Math.min(1, dt * 6)); const d = new V3(0, 0, -1).applyEuler(new THREE.Euler(0, P.yaw, 0)); P.vel.x += d.x * dt * 12; P.vel.z += d.z * dt * 12; buff.semQueda = true; P.quedaDe = null; if (Math.random() < .8) particulas(P.pos.x, P.pos.y + .5 * P.escala, P.pos.z, Math.random() < .5 ? '#ffb347' : '#ff6a2a', 2, false, 1); if (Math.random() < dt * 6) som('fogo'); conquistar('voar'); return; }
  if (p === 'rajada') { if (rajadaCarga === 0 && st.mana < 15 && modo !== 'cri') { if (!atirarSegurado) toast('Mana insuficiente'); atirarSegurado = true; return; } rajadaCarga = Math.min(1.5, rajadaCarga + dt); $('carga2').style.display = 'block'; $('carga2').firstElementChild.style.width = (rajadaCarga / 1.5 * 100) + '%'; if (Math.random() < .5) { const o = olho().addScaledVector(aimD, .8); particulas(o.x, o.y, o.z, '#9fd0ff', 1, true, 1); } return; }
  if (poderCd[p] > 0 || atirarSegurado) return;
  if (p === 'dragao') { if (poderCd[p] > 0) return; if (!gastarMana(it.mana)) return; poderCd[p] = it.cd; sopro(); conquistar('poder'); return; }
  if (p === 'asas' || p === 'noite' || p === 'barr') { atirarSegurado = true; usar(); return; }
  if (!gastarMana(it.mana)) { atirarSegurado = true; return; }
  poderCd[p] = it.cd; if (p !== 'varinha' && p !== 'teia') atirarSegurado = true; swingT = .3; conquistar('poder');
  const o = olho(); const alvo = mira(60); const d = alvo.clone().sub(o).normalize();
  if (p === 'fogo') { bola('fogo', o.clone().addScaledVector(d, .8), d); som('fogo'); }
  else if (p === 'gelo') { bola('gelo', o.clone().addScaledVector(d, .8), d); som('gelo'); }
  else if (p === 'varinha') { bola('faisca', o.clone().addScaledVector(d, .8), d); som('magia'); }
  else if (p === 'teia') { bola('teia', o.clone().addScaledVector(d, .8), d); som('arco'); }
  else if (p === 'gancho') { const h = raycast(aimO, aimD, 32 + P.camDist); if (h) { P.gancho = { ponto: new V3(h.x + .5 + h.nx * .5, h.y + .5 + h.ny * .5, h.z + .5 + h.nz * .5), t: 0 }; som('arco'); } else toast('O gancho não alcançou'); }
  else if (p === 'raio') raio(alvo);
  else if (p === 'salto') { P.vel.y = 19; buff.semQueda = true; P.quedaDe = null; particulas(P.pos.x, P.pos.y, P.pos.z, '#c8ffb8', 14, true); som('magia'); }
  else if (p === 'veloc') { buff.veloc = 8; som('magia'); toast('Velocidade! ⚡'); }
  else if (p === 'onda') onda();
  else if (p === 'telep') teleporte();
  else if (p === 'cura') { st.vida = Math.min(20, st.vida + 8); particulas(P.pos.x, P.pos.y + 1, P.pos.z, '#7dff9a', 18, true); som('cura'); humorTemp(eu, 'feliz', 1.5); }
  else if (p === 'escav') escavar(d);
  else if (p === 'escudo') { buff.escudo = 10; som('magia'); toast('Escudo ativo por 10 s'); }
  else if (p === 'invis') { buff.invis = 15; som('magia'); toast('Invisível por 15 s'); }
  else if (p === 'tempo') { buff.tempo = 10; som('magia'); toast('O tempo desacelerou… ⏳'); }
  else if (p === 'clone') { criarHolo(); som('magia'); toast('Holograma criado por 15 s'); }
  else if (p === 'forca') { buff.forca = 20; som('magia'); toast('Super força por 20 s 💪'); }
  else if (p === 'agua') { buff.agua = 60; som('magia'); toast('Guelras por 60 s 🫧'); }
  else if (p === 'sing') criarSingularidade(o.clone().addScaledVector(d, 1.5), d);
  else if (p === 'repul') repulsao(o, d);
  else if (p === 'aniq') aniquilacao(o.clone().addScaledVector(d, 2.5), d);
  else if (p === 'cupula') criarCupula();
  else if (p === 'meteoro') meteoros(alvo);
  else if (p === 'tornado') criarTornado(d);
  else if (p === 'terremoto') terremoto();
  else if (p === 'corrente') raioCorrente(o, d);
  else if (p === 'grav') gravidadeZero();
  renderStats();
}
function soltarRajada() {
  const k = rajadaCarga / 1.5; const custo = Math.max(15, 50 * k);
  if (!gastarMana(custo)) return;
  const o = olho(); const d = mira(60).sub(o).normalize();
  const p = bola('rajada', o.clone().addScaledVector(d, 1), d); p.raio = 2 + k * 2.5; p.dmg = 10 + k * 16; p.m.scale.setScalar(.6 + k);
  som('raio'); shake = .2 + k * .3; swingT = .3; conquistar('poder');
}
function raio(alvo) {
  som('raio'); flash(alvo.x, alvo.y + 5, alvo.z, 2.5);
  const pts = []; let x = alvo.x + (Math.random() - .5) * 4, z = alvo.z + (Math.random() - .5) * 4;
  for (let y = alvo.y + 45; y > alvo.y; y -= 3) { pts.push(new V3(x, y, z)); x = lerp(x, alvo.x, .2) + (Math.random() - .5) * 1.6; z = lerp(z, alvo.z, .2) + (Math.random() - .5) * 1.6; }
  pts.push(alvo.clone());
  const g = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const len = a.distanceTo(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, len, 4), new THREE.MeshBasicMaterial({ color: 0xf4f6ff, transparent: true })); c.position.copy(a).add(b).multiplyScalar(.5); c.lookAt(b); c.rotateX(PI / 2); g.add(c); }
  efeito(g, .35, (o, k) => o.children.forEach((c) => { c.material.opacity = (Math.random() < .5 ? 1 : .3) * (1 - k); }));
  explodir(alvo.x, alvo.y, alvo.z, 2.5, false, 14);
}
function onda() {
  som('magia'); som('explosao');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 6, 32), new THREE.MeshBasicMaterial({ color: 0xc77dff, transparent: true })); ring.rotation.x = PI / 2; ring.position.set(P.pos.x, P.pos.y + .3, P.pos.z);
  efeito(ring, .5, (o, k) => { o.scale.setScalar(1 + k * 8); o.material.opacity = 1 - k; });
  for (const m of mobsPerto(P.pos, 8)) { const d = m.pos.clone().sub(P.pos).setY(0).normalize(); m.ferir(6, d.multiplyScalar(2), 'jogador'); m.vel.y = 9; }
  shake = .3;
}
function teleporte() {
  const h = raycast(aimO, aimD, 45 + P.camDist); let dest;
  if (h) { dest = new V3(h.x + .5 + h.nx, h.y + h.ny, h.z + .5 + h.nz); if (h.ny === 1) dest.y = h.y + 1; }
  else dest = aimO.clone().addScaledVector(aimD, 30 + P.camDist);
  for (let k = 0; k < 4 && colide(dest.x, dest.y, dest.z, P.hw, P.h); k++) dest.y += 1;
  particulas(P.pos.x, P.pos.y + 1, P.pos.z, '#d18cff', 16, true); P.pos.copy(dest); P.vel.set(0, 0, 0); P.quedaDe = null; buff.semQueda = true;
  particulas(P.pos.x, P.pos.y + 1, P.pos.z, '#d18cff', 16, true); som('magia');
}
function escavar(d) {
  som('explosao'); const o = olho(); const ax = Math.abs(d.x) > Math.abs(d.z) ? 'x' : 'z';
  const right = ax === 'x' ? new V3(0, 0, 1) : new V3(1, 0, 0); const fwd = new V3(ax === 'x' ? Math.sign(d.x) : 0, 0, ax === 'z' ? Math.sign(d.z) : 0);
  for (let f = 1; f <= 6; f++) for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) {
    const p = o.clone().addScaledVector(fwd, f).addScaledVector(right, u); p.y = Math.floor(P.pos.y) + 1 + v;
    const b = getBlock(p.x, p.y, p.z); if (!b || b === B.BEDROCK || b === B.WATER || b === B.CHEST || b === B.FURNACE) continue;
    setBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z), 0);
    if (modo !== 'cri') { const dr = BD[b].drop === undefined ? b : BD[b].drop; if (typeof dr === 'number' && dr) giveStack(mkS(dr, 1)); }
    if (Math.random() < .3) burst(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z), b);
  }
  shake = .25;
}
function laserTick() {
  const o = olho(); const alvo = mira(40); const d = alvo.clone().sub(o).normalize();
  const mh = rayMob(o, d, 40); const bh = raycast(o, d, 40);
  if (mh && (!bh || mh.t < bh.t)) { mh.m.ferir(2.5, null, 'jogador'); if (!mh.m.vivo && !mh.m.d.pass) conquistar('monstro'); }
  else if (bh && bh.b !== B.BEDROCK) { const k = posKey(bh.x, bh.y, bh.z); if (laserHeat.k !== k) { laserHeat.k = k; laserHeat.t = 0; } laserHeat.t += .07; if (laserHeat.t > Math.min(1.2, BD[bh.b].hard * .4 + .1)) { finishBreak(bh, true); laserHeat.t = 0; } }
  particulas(alvo.x, alvo.y, alvo.z, '#ff6a6a', 2, true, 2); som('laser');
}
function updateLaser() {
  if (!laserOn || !mining.on) { if (laserBeam) laserBeam.visible = false; return; }
  if (!laserBeam) { laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff3a4a, transparent: true, opacity: .85 })); laserBeam.add(new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }))); scene.add(laserBeam); }
  const o = olho().add(new V3(0, -.15, 0)); const alvo = mira(40); const len = o.distanceTo(alvo);
  laserBeam.visible = true; laserBeam.position.copy(o).add(alvo).multiplyScalar(.5); laserBeam.scale.set(1, len, 1); laserBeam.lookAt(alvo); laserBeam.rotateX(PI / 2);
}
function updateCorda() {
  if (!P.gancho) { if (cordaMesh) cordaMesh.visible = false; return; }
  if (!cordaMesh) { cordaMesh = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 4), new THREE.MeshLambertMaterial({ color: 0x8a6a3a })); scene.add(cordaMesh); }
  const o = olho().add(new V3(0, -.3, 0)); const a = P.gancho.ponto; const len = o.distanceTo(a);
  cordaMesh.visible = true; cordaMesh.position.copy(o).add(a).multiplyScalar(.5); cordaMesh.scale.set(1, len, 1); cordaMesh.lookAt(a); cordaMesh.rotateX(PI / 2);
}

// ---------- poderes devastadores ----------
const especiais = [];
function apagarEsfera(c, r, comDrop) { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) { if (dx * dx + dy * dy + dz * dz > r * r) continue; const x = Math.floor(c.x) + dx, y = Math.floor(c.y) + dy, z = Math.floor(c.z) + dz; const b = getBlock(x, y, z); if (!b || b === B.BEDROCK) continue; if (b === B.CHEST || b === B.FURNACE) continue; setBlock(x, y, z, 0); if (comDrop && Math.random() < .15) burst(x, y, z, b); } }
function criarSingularidade(pos, dir) {
  const g = new THREE.Group(); const nucleo = new THREE.Mesh(new THREE.SphereGeometry(.7, 20, 14), new THREE.MeshBasicMaterial({ color: 0x000000 })); g.add(nucleo);
  const borda = new THREE.Mesh(new THREE.SphereGeometry(.78, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, side: THREE.BackSide })); g.add(borda);
  const disco = new THREE.Mesh(new THREE.RingGeometry(1, 2.6, 48), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); disco.rotation.x = PI / 2.3; g.add(disco);
  g.add(halo(0xffd090, 7)); g.position.copy(pos); scene.add(g); som('magia');
  especiais.push({ tipo: 'sing', pos: pos.clone(), vel: dir.clone().multiplyScalar(14), t: 0, g, disco, fase: 'voo' });
}
function repulsao(o, d) {
  som('explosao'); som('raio'); shake = .6; flash(o.x + d.x * 4, o.y + d.y * 4, o.z + d.z * 4, 2);
  for (let k = 1; k <= 14; k++) { const r = Math.min(3, 1 + k * .25); const c = o.clone().addScaledVector(d, k + 1); if (k > 2) apagarEsfera(c, Math.round(r), true); particulas(c.x, c.y, c.z, k % 2 ? '#ffe68a' : '#ffffff', 4, true, 4); }
  for (const m of mobs) { const v = m.pos.clone().add(new V3(0, m.h / 2, 0)).sub(o); const L = v.length(); if (L > 18) continue; if (v.normalize().dot(d) < .75) continue; m.ferir(22, d.clone().setY(0).normalize().multiplyScalar(5), 'jogador'); m.vel.y = 12; if (!m.vivo && !m.d.pass) conquistar('monstro'); }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.5, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  cone.position.copy(o.clone().addScaledVector(d, 8)); cone.lookAt(o.clone().addScaledVector(d, 20)); cone.rotateX(-PI / 2);
  efeito(cone, .45, (c, k) => { c.material.opacity = .55 * (1 - k); c.scale.set(1 + k, 1, 1 + k); });
}
function aniquilacao(pos, d) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })));
  const a1 = new THREE.Mesh(new THREE.TorusGeometry(2.9, .18, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffd23a, blending: THREE.AdditiveBlending, transparent: true })); g.add(a1);
  const a2 = new THREE.Mesh(new THREE.TorusGeometry(3.2, .14, 8, 48), new THREE.MeshBasicMaterial({ color: 0x7aeef8, blending: THREE.AdditiveBlending, transparent: true })); a2.rotation.x = PI / 2; g.add(a2);
  g.add(halo(0xfff2c0, 16)); g.position.copy(pos); scene.add(g);
  som('raio'); som('explosao'); shake = .8; flash(pos.x, pos.y, pos.z, 3);
  $('dor').classList.remove('on');
  especiais.push({ tipo: 'aniq', pos: pos.clone(), dir: d.clone(), dist: 0, g, a1, a2, t: 0 });
}
function criarCupula() {
  const c = P.pos.clone(); const R = 14;
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24, 0, PI * 2, 0, PI / 2), new THREE.MeshBasicMaterial({ color: 0x0a0820, transparent: true, opacity: .0, side: THREE.DoubleSide, depthWrite: false })); g.add(dome);
  const n = 500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random(), a = Math.random() * PI * 2, s2 = Math.sqrt(1 - u * u); p[i * 3] = Math.cos(a) * s2 * (R - .3); p[i * 3 + 1] = u * (R - .3); p[i * 3 + 2] = Math.sin(a) * s2 * (R - .3); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })); g.add(pts);
  const anel = new THREE.Mesh(new THREE.RingGeometry(R - .4, R, 64), new THREE.MeshBasicMaterial({ color: 0xc8b8ff, transparent: true, opacity: .8, side: THREE.DoubleSide })); anel.rotation.x = -PI / 2; anel.position.y = .1; g.add(anel);
  g.position.copy(c); scene.add(g); som('magia'); som('raio'); shake = .4;
  especiais.push({ tipo: 'cupula', pos: c, R, g, dome, pts, t: 0, dur: 12 });
}
function meteoros(alvo) { som('raio'); for (let k = 0; k < 12; k++) setTimeout(() => { if (!jogando) return; const off = new V3((Math.random() - .5) * 14, 0, (Math.random() - .5) * 14); const from = alvo.clone().add(off).add(new V3(-18, 40, -10)); const to = alvo.clone().add(off); const d = to.sub(from).normalize(); bola('meteoro', from, d); }, k * 260); }
function criarTornado(d) {
  const g = new THREE.Group(); for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.5 + k * .45, 1.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xd8dce4, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false })); c.position.y = k * 1.2 + .6; c.rotation.x = PI; g.add(c); }
  const pos = P.pos.clone().addScaledVector(new V3(d.x, 0, d.z).normalize(), 3); g.position.copy(pos); scene.add(g); som('fogo');
  especiais.push({ tipo: 'tornado', pos, dir: new V3(d.x, 0, d.z).normalize(), g, t: 0 });
}
function terremoto() {
  som('explosao'); shake = 1.2;
  for (let k = 0; k < 3; k++) setTimeout(() => { const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1.4, 40), new THREE.MeshBasicMaterial({ color: 0x8a6a44, transparent: true, side: THREE.DoubleSide })); ring.rotation.x = -PI / 2; ring.position.set(P.pos.x, P.pos.y + .1, P.pos.z); efeito(ring, .8, (o, t) => { o.scale.setScalar(1 + t * 12); o.material.opacity = 1 - t; }); som('explosao'); }, k * 250);
  for (let k = 0; k < 40; k++) { const a = Math.random() * PI * 2, r = Math.random() * 12; const x = Math.floor(P.pos.x + Math.cos(a) * r), z = Math.floor(P.pos.z + Math.sin(a) * r); const y = surfaceY(x, z); const b = getBlock(x, y, z); if (b) burst(x, y, z, b); }
  for (const m of mobsPerto(P.pos, 13)) { if (!m.onGround) continue; m.ferir(14, m.pos.clone().sub(P.pos).setY(0).normalize(), 'jogador'); m.vel.y = 8; if (!m.vivo && !m.d.pass) conquistar('monstro'); }
}
function sopro() {
  const o = olho(); const d = aimD.clone();
  for (let k = 0; k < 4; k++) { const s2 = d.clone().add(new V3((Math.random() - .5) * .5, (Math.random() - .5) * .4, (Math.random() - .5) * .5)).normalize(); const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: Math.random() < .5 ? 0xffb347 : 0xff4a1a, transparent: true })); m.scale.setScalar(2 + Math.random() * 2); m.position.copy(o).addScaledVector(d, .8); scene.add(m); parts.push({ m, v: s2.multiplyScalar(14 + Math.random() * 6), life: .45, g: -3 }); }
  for (const m of mobs) { const v = m.pos.clone().add(new V3(0, m.h / 2, 0)).sub(o); const L = v.length(); if (L < 9 && v.normalize().dot(d) > .8) { m.ferir(1.6, null, 'jogador'); if (!m.vivo && !m.d.pass) conquistar('monstro'); } }
  if (Math.random() < .3) som('fogo');
}
function raioCorrente(o, d) {
  let atual = o.clone(); const atingidos = new Set(); let alvo = rayMob(o, d, 30); let m = alvo && alvo.m;
  if (!m) { let best = 22; for (const mm of mobs) { if (!mm.vivo) continue; const v = mm.pos.clone().sub(o); const L = v.length(); if (L < best && v.normalize().dot(d) > .85) { best = L; m = mm; } } }
  if (!m) { toast('Nenhum alvo à vista'); return; }
  som('raio'); let n = 0;
  while (m && n < 7) { atingidos.add(m); const p2 = new V3(m.pos.x, m.pos.y + m.h * .6, m.pos.z);
    const pts = []; for (let k = 0; k <= 8; k++) { const q = atual.clone().lerp(p2, k / 8); if (k > 0 && k < 8) q.add(new V3((Math.random() - .5) * .8, (Math.random() - .5) * .8, (Math.random() - .5) * .8)); pts.push(q); }
    efeito(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xbfe0ff, transparent: true })), .3, (l, k) => { l.material.opacity = 1 - k; });
    m.ferir(13, null, 'jogador'); particulas(p2.x, p2.y, p2.z, '#bfe0ff', 6); if (!m.vivo && !m.d.pass) conquistar('monstro');
    atual = p2; let prox = null, best = 10; for (const mm of mobs) { if (!mm.vivo || atingidos.has(mm)) continue; const L = mm.pos.distanceTo(p2); if (L < best) { best = L; prox = mm; } } m = prox; n++; }
}
function gravidadeZero() { som('magia'); let n = 0; for (const m of mobsPerto(P.pos, 13)) { if (m.d.pass) continue; m.levita = 4; n++; particulas(m.pos.x, m.pos.y + .5, m.pos.z, '#d0a8ff', 8, true); } const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .08, 6, 40), new THREE.MeshBasicMaterial({ color: 0xd0a8ff, transparent: true })); ring.rotation.x = PI / 2; ring.position.set(P.pos.x, P.pos.y + .5, P.pos.z); efeito(ring, .7, (o, k) => { o.scale.setScalar(1 + k * 12); o.material.opacity = 1 - k; o.position.y = P.pos.y + .5 + k * 3; }); if (!n) toast('Nenhum monstro por perto'); }
function updateEspeciais(dt) {
  for (let i = especiais.length - 1; i >= 0; i--) {
    const e = especiais[i]; e.t += dt; let fim = false;
    if (e.tipo === 'sing') {
      e.disco.rotation.z += dt * 4; e.g.rotation.y += dt * 1.5;
      if (e.fase === 'voo') { e.pos.addScaledVector(e.vel, dt); if (e.t > 1.4 || SOLID[getBlock(e.pos.x, e.pos.y, e.pos.z)]) { e.fase = 'puxa'; e.t = 0; som('raio'); } }
      else {
        const k = e.t / 3; e.g.scale.setScalar(1 + k * 1.5);
        for (const m of mobs) { const v = e.pos.clone().sub(m.pos); const L = v.length(); if (L < 16) { v.normalize(); m.vel.addScaledVector(v, dt * 40); m.vel.clampLength(0, 14); if (L < 2.5) m.ferir(dt * 8, null, 'jogador'); } }
        for (const dd of drops) { const v = e.pos.clone().sub(dd.pos); if (v.length() < 14) dd.vel.addScaledVector(v.normalize(), dt * 30); }
        if (Math.random() < dt * 25) { const r = 1.5 + Math.random() * 4; const a = Math.random() * PI * 2, b2 = (Math.random() - .5) * PI; const x = Math.floor(e.pos.x + Math.cos(a) * Math.cos(b2) * r), y = Math.floor(e.pos.y + Math.sin(b2) * r), z = Math.floor(e.pos.z + Math.sin(a) * Math.cos(b2) * r); const b = getBlock(x, y, z); if (b && b !== B.BEDROCK && b !== B.CHEST && b !== B.FURNACE) { setBlock(x, y, z, 0); const m = new THREE.Mesh(cuboGeo(b), matCubo); m.scale.setScalar(.5); m.position.set(x + .5, y + .5, z + .5); scene.add(m); parts.push({ m, v: e.pos.clone().sub(m.position).multiplyScalar(2), life: .5, g: 0 }); } }
        if (P.pos.distanceTo(e.pos) < 10) { const v = e.pos.clone().sub(P.pos).normalize(); P.vel.addScaledVector(v, dt * 6); }
        if (e.t > 3) { fim = true; apagarEsfera(e.pos, 4, true); explodir(e.pos.x, e.pos.y, e.pos.z, 4, true, 35); flash(e.pos.x, e.pos.y, e.pos.z, 3); }
      }
      e.g.position.copy(e.pos);
    } else if (e.tipo === 'aniq') {
      const step = 20 * dt; e.pos.addScaledVector(e.dir, step); e.dist += step; e.a1.rotation.z += dt * 6; e.a2.rotation.y += dt * 7; e.g.position.copy(e.pos);
      apagarEsfera(e.pos, 3, Math.random() < .3);
      for (const m of mobs) if (m.vivo && m.pos.distanceTo(e.pos) < 4.5) { m.ferir(80, null, 'jogador'); if (!m.vivo && !m.d.pass) conquistar('monstro'); }
      if (Math.random() < .8) particulas(e.pos.x, e.pos.y, e.pos.z, Math.random() < .5 ? '#ffffff' : '#ffe08a', 3, true, 5);
      if (e.dist > 64) { fim = true; flash(e.pos.x, e.pos.y, e.pos.z, 2); particulas(e.pos.x, e.pos.y, e.pos.z, '#ffffff', 30, true, 8); som('explosao'); }
    } else if (e.tipo === 'cupula') {
      const k = Math.min(1, e.t / .8), out = e.t > e.dur - 1 ? (e.dur - e.t) : 1; e.dome.material.opacity = .82 * k * out; e.pts.material.opacity = k * out; e.pts.rotation.y += dt * .1;
      for (const m of mobs) { if (!m.d.pass && m.pos.distanceTo(e.pos) < e.R) { m.congelado = .3; m.ferir(dt * 3, null, 'jogador'); if (!m.vivo) conquistar('monstro'); } }
      if (e.t > e.dur) fim = true;
    } else if (e.tipo === 'tornado') {
      e.pos.addScaledVector(e.dir, dt * 6); const g = groundAt(e.pos.x, e.pos.z, e.pos.y + 3); if (g !== null) e.pos.y = lerp(e.pos.y, g, dt * 5);
      e.g.position.copy(e.pos); e.g.rotation.y += dt * 12; e.g.children.forEach((c, k) => { c.position.x = Math.sin(e.t * 6 + k) * .2 * k; });
      if (Math.random() < .7) particulas(e.pos.x + (Math.random() - .5) * 2, e.pos.y + Math.random() * 6, e.pos.z + (Math.random() - .5) * 2, '#bfc4cc', 1, true, 2);
      for (const m of mobs) { const v = m.pos.clone().sub(e.pos); v.y = 0; if (v.length() < 3.5) { m.vel.y = 9; m.vel.x = -v.z * 3; m.vel.z = v.x * 3; m.ferir(dt * 4, null, 'jogador'); if (!m.vivo && !m.d.pass) conquistar('monstro'); } }
      if (e.t > 8) fim = true;
    }
    if (fim) { scene.remove(e.g); especiais.splice(i, 1); }
  }
}

// ================== ALDEÕES ==================
const PROF = {
  fazendeiro: { nome: 'Fazendeiro', roupa: '#3f7a35', camisa: '#efe2bf', chapeu: 'palha', trocas: [[[[IT.TRIGO, 20]], [IT.MOEDA, 1]], [[[IT.MOEDA, 1]], [IT.PAO, 6]], [[[IT.MOEDA, 1]], [IT.MACA, 4]], [[[IT.MOEDA, 2]], [B.HAY, 2]]] },
  ferreiro: { nome: 'Ferreira', roupa: '#5c3a22', camisa: '#c8a888', chapeu: 'bandana', trocas: [[[[IT.CARVAO, 12]], [IT.MOEDA, 1]], [[[IT.FERRO, 4]], [IT.MOEDA, 1]], [[[IT.MOEDA, 3]], [IT.PIC_F, 1]], [[[IT.MOEDA, 5]], [IT.ESP_F, 1]], [[[IT.MOEDA, 8]], [IT.PEI_F, 1]], [[[IT.MOEDA, 20]], [IT.ESP_D, 1]]] },
  mago: { nome: 'Mago', roupa: '#4a2a7a', camisa: '#d8c8f0', chapeu: 'cartola', trocas: [[[[IT.ESSENCIA, 2]], [IT.MOEDA, 3]], [[[IT.MOEDA, 4]], [IT.ESSENCIA, 1]], [[[IT.MOEDA, 10]], [IT.O_FOGO, 1]], [[[IT.MOEDA, 12]], [IT.O_TELEP, 1]], [[[IT.MOEDA, 25]], [IT.O_CORRENTE, 1]], [[[IT.MOEDA, 40]], [IT.O_SING, 1]]] },
  cozinheiro: { nome: 'Cozinheira', roupa: '#e8e4dc', camisa: '#ffffff', chapeu: 'chef', trocas: [[[[IT.CARNE, 8]], [IT.MOEDA, 1]], [[[IT.FRANGO, 8]], [IT.MOEDA, 1]], [[[IT.MOEDA, 1]], [IT.CARNE_A, 3]], [[[IT.MOEDA, 1]], [IT.FRANGO_A, 4]]] },
  pedreiro: { nome: 'Pedreiro', roupa: '#6a6a72', camisa: '#e8b040', chapeu: 'capacete', trocas: [[[[B.COBBLE, 24]], [IT.MOEDA, 1]], [[[IT.MOEDA, 1]], [B.BRICK, 16]], [[[IT.MOEDA, 1]], [B.GLASS, 12]], [[[IT.MOEDA, 2]], [B.LAMP, 8]], [[[IT.MOEDA, 3]], [B.TNT, 2]]] },
  guarda: { nome: 'Guarda', roupa: '#22355a', camisa: '#c8d4e8', chapeu: 'quepe', trocas: [[[[IT.POLVORA, 6]], [IT.MOEDA, 1]], [[[IT.MOEDA, 1]], [IT.FLECHA, 16]], [[[IT.MOEDA, 4]], [IT.ARCO, 1]], [[[IT.MOEDA, 6]], [IT.PISTOLA, 1]], [[[IT.MOEDA, 1]], [IT.MUNICAO, 16]], [[[IT.MOEDA, 9]], [IT.CAP_F, 1]]] },
};
const PELOS = ['#ffffff', '#f4b47a', '#9a9aa4', '#45434a', '#ecdcbc', '#b07850', '#d8d0c8', '#ffd2a0'];
const aldeoes = [];
const corM = (h) => new THREE.Color(h);
function chapeu(tipo) {
  const g = new THREE.Group(); const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  if (tipo === 'palha') { const ab = new THREE.Mesh(new THREE.CylinderGeometry(.42, .44, .04, 18), M('#e2c46a')); const copa = new THREE.Mesh(new THREE.CylinderGeometry(.19, .22, .17, 14), M('#dcb85a')); copa.position.y = .1; const fita = new THREE.Mesh(new THREE.CylinderGeometry(.225, .225, .05, 14), M('#9a3a24')); fita.position.y = .04; g.add(ab, copa, fita); }
  if (tipo === 'chef') { const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .2, 14), M('#ffffff')); b.position.y = .1; const t = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 8), M('#fafafa')); t.position.y = .3; t.scale.y = .7; g.add(b, t); }
  if (tipo === 'bandana') { const t = new THREE.Mesh(new THREE.CylinderGeometry(.27, .29, .1, 16), M('#c0302a')); t.position.y = -.02; const n = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 4), M('#a82820')); n.position.set(0, -.02, .3); g.add(t, n); }
  if (tipo === 'cartola') { const ab = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .03, 18), M('#2a1a44')); const c = new THREE.Mesh(new THREE.CylinderGeometry(.19, .2, .36, 16), M('#3a2460')); c.position.y = .19; const f = new THREE.Mesh(new THREE.CylinderGeometry(.205, .205, .05, 16), M('#e8c040')); f.position.y = .05; const est = new THREE.Mesh(new THREE.OctahedronGeometry(.05), M('#ffe080')); est.position.set(0, .2, -.2); g.add(ab, c, f, est); }
  if (tipo === 'capacete') { const c = new THREE.Mesh(new THREE.SphereGeometry(.27, 16, 8, 0, PI * 2, 0, PI / 2), M('#f2c020')); const ab = new THREE.Mesh(new THREE.CylinderGeometry(.33, .33, .03, 18), M('#e0b018')); g.add(c, ab); }
  if (tipo === 'quepe') { const c = new THREE.Mesh(new THREE.CylinderGeometry(.25, .22, .12, 16), M('#1c2c4a')); c.position.y = .05; const v = new THREE.Mesh(new THREE.BoxGeometry(.3, .02, .16), M('#101828')); v.position.set(0, -.01, -.24); const e = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .02, 8), M('#e8c040')); e.rotation.x = PI / 2; e.position.set(0, .07, -.25); g.add(c, v, e); }
  return g;
}
function rotulo(txt) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.font = '600 30px "Pixelify Sans", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; const w = Math.min(250, x.measureText(txt).width + 24); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(128 - w / 2, 10, w, 44); x.fillStyle = '#fff'; x.fillText(txt, 128, 33); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(1.4, .35, 1); return s; }
function criarAldeao(prof, x, z, i) {
  const pf = PROF[prof]; const c = montarGato(gltfs.ele);
  const pelo = corM(PELOS[i % PELOS.length]), roupa = corM(pf.roupa), escura = corM(pf.roupa).multiplyScalar(.6), camisa = corM(pf.camisa);
  for (const m of c.mats) { const n = (m.name || '').toLowerCase(); if (!m.color) continue;
    if (/cabeça|orelha esq$|orelha dir$|pescoço|tronco|pata|cauda/.test(n) && !/interior/.test(n)) m.color.multiply(pelo);
    else if (/lapela|punho|barra/.test(n)) m.color.copy(escura);
    else if (/paletó|calça|braço|manga|antebraço|coxa|canela/.test(n)) m.color.copy(roupa);
    else if (/camisa|colarinho/.test(n)) m.color.copy(camisa);
    else if (/gravata/.test(n)) m.color.copy(escura);
  }
  c.grupo.updateMatrixWorld(true);
  const cab = c.gato.modelo.getObjectByName('cabeca'), cm = c.gato.modelo.getObjectByName('cabeça');
  if (cab && cm) { const box = new THREE.Box3().setFromObject(cm); const w = box.max.x - box.min.x; const h = chapeu(pf.chapeu); const top = new V3((box.min.x + box.max.x) / 2, box.max.y - w * .1, (box.min.z + box.max.z) / 2); cab.add(h); const ws = new V3(); cab.getWorldScale(ws); h.position.copy(cab.worldToLocal(top)); h.scale.setScalar((w / .62) / ws.x); }
  const tag = rotulo(pf.nome); tag.position.y = 2.05; c.grupo.add(tag); c.tag = tag;
  const g = groundAt(x, z, VH + 4); const pos = new V3(x, g !== null ? g : VH + 1, z);
  c.grupo.position.copy(pos); scene.add(c.grupo);
  aldeoes.push({ c, prof, pos, ty: pos.y, yaw: Math.random() * 6, state: 'idle', t: Math.random() * 4, target: null });
}
function limparAldeoes() { for (const a of aldeoes) scene.remove(a.c.grupo); aldeoes.length = 0; }
function spawnAldeoes() {
  limparAldeoes(); if (!mundoAtual.vila) return;
  const lista = ['fazendeiro', 'ferreiro', 'mago', 'cozinheiro', 'pedreiro', 'guarda', 'fazendeiro', 'cozinheiro'];
  const pos = [[8, 3], [-8, 3], [3, -8], [-3, 8], [12, -2], [-12, 2], [2, 14], [-2, -14]];
  lista.forEach((p, i) => criarAldeao(p, pos[i][0] + .5, pos[i][1] + .5, i));
}
function updateAldeoes(dt) {
  for (const a of aldeoes) {
    a.t -= dt; let speed = 0;
    const pdx = P.pos.x - a.pos.x, pdz = P.pos.z - a.pos.z, pd = Math.hypot(pdx, pdz);
    if (a.state === 'walk') {
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, dist = Math.hypot(dx, dz);
      if (dist < .5 || a.t < 0 || (janela && janela.aldeao === a)) { a.state = 'idle'; a.t = 3 + Math.random() * 6; }
      else { a.yaw = lerpAngle(a.yaw, Math.atan2(dx, dz), dt * 6); const sp = 1.6, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
        const px = a.pos.x + fx * (sp * dt + .35), pz = a.pos.z + fz * (sp * dt + .35); const gy = groundAt(px, pz, a.pos.y);
        if (gy === null || gy - a.pos.y > 1.05 || a.pos.y - gy > 2.1 || getBlock(px, gy - 1, pz) === B.WATER || getBlock(px, gy, pz) === B.WATER || Math.hypot(px, pz) > 40) { a.state = 'idle'; a.t = 1; a.yaw += PI / 2; }
        else { a.pos.x += fx * sp * dt; a.pos.z += fz * sp * dt; const g2 = groundAt(a.pos.x, a.pos.z, a.pos.y); if (g2 !== null) a.ty = g2; speed = sp; } }
    } else if (a.t < 0) { a.state = 'walk'; a.t = 6 + Math.random() * 6; const ang = Math.random() * PI * 2, r = 4 + Math.random() * 30; a.target = { x: Math.cos(ang) * r, z: Math.sin(ang) * r }; }
    if (a.state !== 'walk' && pd < 5) a.yaw = lerpAngle(a.yaw, Math.atan2(pdx, pdz), dt * 4);
    if (a.pos.y < a.ty) a.pos.y = Math.min(a.ty, a.pos.y + dt * 7); else a.pos.y = Math.max(a.ty, a.pos.y - dt * 10);
    setAndar(a.c, speed > 0);
    a.c.grupo.position.copy(a.pos); a.c.grupo.rotation.y = a.yaw; a.c.tag.visible = pd < 10;
    if (pd < 48) a.c.gato.atualizar(dt);
  }
}
function aldeaoNaMira() { let best = null; rc.set(aimO, aimD); rc.far = alcance(); for (const a of aldeoes) { if (a.pos.distanceTo(P.pos) > 8) continue; const h = rc.intersectObject(a.c.grupo, true); if (h.length && (!best || h[0].distance < best.d)) best = { a, d: h[0].distance }; } if (best && hit && hit.t < best.d) return null; return best && best.a; }
function abrirTroca(a) { abrirJanela('troca'); janela.aldeao = a; humorTemp(a.c, 'feliz', 1.5); a.c.gato.acao('acenar'); som('miau'); renderJanela(); }

// ================== FORNALHAS ==================
function getFurnace(k) { if (!furnaces.has(k)) furnaces.set(k, { in: null, fuel: null, out: null, burn: 0, burnMax: 1, prog: 0 }); return furnaces.get(k); }
function tickFurnaces(dt) {
  for (const f of furnaces.values()) {
    const r = f.in && SMELT[f.in.id];
    const canOut = r && (!f.out || (f.out.id === r && f.out.n < maxStack(r)));
    if (f.burn > 0) f.burn -= dt;
    if (f.burn <= 0 && canOut && f.fuel && FUEL[f.fuel.id]) { f.burn = f.burnMax = FUEL[f.fuel.id]; f.fuel.n--; if (!f.fuel.n) f.fuel = null; }
    if (f.burn > 0 && canOut) { f.prog += dt; if (f.prog >= SMELT_T) { f.prog = 0; f.in.n--; if (!f.in.n) f.in = null; if (f.out) f.out.n++; else f.out = mkS(r, 1); if (janela && janela.tipo === 'fornalha') refreshSlots(); } }
    else f.prog = Math.max(0, f.prog - dt * 2);
    if (f.burn < 0) f.burn = 0;
  }
}

// ================== JANELA (inventário / bancada / fornalha / baú) ==================
let janela = null, cursor = null;
const jan = $('janela'), maoEl = $('mao'), tipEl = $('tip');
function slotHTML(area, i, cls = '', ph = '') { return `<div class="slot ${cls}" data-a="${area}" data-i="${i}">${ph ? `<span class="ph">${ph}</span>` : ''}</div>`; }
function fillSlot(el, s) {
  const ph = el.querySelector('.ph'); el.innerHTML = ''; if (ph && !s) el.appendChild(ph);
  if (!s) return;
  el.appendChild(iconClone(s.id));
  if (s.n > 1) { const n = document.createElement('span'); n.className = 'n'; n.textContent = s.n; el.appendChild(n); }
  const it = ITEMS[s.id]; if (it && it.dur && s.d < it.dur) { const d = document.createElement('div'); d.className = 'dur'; const k = s.d / it.dur; d.innerHTML = `<i style="width:${k * 100}%;background:hsl(${k * 120},80%,45%)"></i>`; el.appendChild(d); }
}
function infoItem(id) { const it = ITEMS[id]; if (!it) return ''; const ex = []; if (it.desc) ex.push(it.desc); if (it.dmg && it.arma) ex.push('Dano ' + it.dmg); if (it.def) ex.push('Defesa ' + it.def); if (it.food) ex.push('+' + it.food + ' fome'); if (it.mana) ex.push(it.mana + ' de mana'); if (it.tool) ex.push('Ferramenta nível ' + it.tier); return `${it.name}${ex.length ? '<small>' + ex.join(' · ') + '</small>' : ''}`; }
function abrirJanela(tipo, key) {
  if (document.pointerLockElement) document.exitPointerLock();
  mining.on = false; joy.x = joy.y = 0;
  janela = { tipo, key, size: tipo === 'bancada' ? 3 : 2, grid: Array(tipo === 'bancada' ? 9 : 4).fill(null), receitas: false, aba: 'tudo' };
  if (tipo === 'bau' && !chests.has(key)) chests.set(key, Array(27).fill(null));
  jan.hidden = false; document.body.classList.add('jan'); renderJanela();
}
function fecharJanela() {
  if (!janela) return;
  for (const s of janela.grid) if (s) { const l = giveStack(s); if (l) soltarItem(l, 0, P.pos.x, P.pos.y + 1, P.pos.z); }
  if (cursor) { const l = giveStack(cursor); if (l) soltarItem(l, 0, P.pos.x, P.pos.y + 1, P.pos.z); cursor = null; }
  janela = null; jan.hidden = true; jan.innerHTML = ''; maoEl.innerHTML = ''; tipEl.style.display = 'none'; document.body.classList.remove('jan'); renderHot(); renderStats(); saveSoon();
  if (!isTouch && jogando) lockReq();
}
const gridResult = () => (janela && janela.grid.length ? matchRecipe(janela.grid, janela.size) : null);
const POP = new Set([IT.SABRE, IT.MARTELO, IT.ESCUDO_B, IT.TEIAS, IT.GANCHO, IT.JETPACK, IT.GARRAS, IT.VARINHA, IT.P_ENCOLHER, IT.P_CRESCER, IT.O_TEMPO, IT.O_CLONE, IT.O_FORCA, IT.O_NOITE, IT.BOTAS_P, IT.O_AGUA, IT.O_RAJADA]);
const ABAS = { tudo: ['Tudo', () => true], blocos: ['Blocos', (it) => it.block], ferr: ['Ferramentas', (it) => it.tool && !it.arma], armas: ['Armas', (it) => (it.arma || it.arremesso || it.id === IT.FLECHA || it.id === IT.MUNICAO || it.isqueiro || it.id === B.TNT) && !POP.has(it.id)], arm: ['Armaduras', (it) => it.armor != null], comida: ['Comida', (it) => it.food], poder: ['Poderes', (it) => it.poder && !POP.has(it.id)], pop: ['Cultura pop', (it) => POP.has(it.id)], mat: ['Materiais', (it) => !it.block && !it.tool && !it.arma && it.armor == null && !it.food && !it.poder && !it.arremesso && !it.isqueiro && !it.pocao] };
function renderJanela() {
  if (!janela) return;
  const t = janela.tipo; let topo = '';
  const titulo = { inv: modo === 'cri' ? 'Criativo' : 'Inventário', bancada: 'Bancada', fornalha: 'Fornalha', bau: 'Baú', troca: janela.aldeao ? PROF[janela.aldeao.prof].nome + ' · trocas' : 'Trocas' }[t];
  if (t === 'inv' && modo === 'cri') {
    const ids = Object.keys(ITEMS).map(Number).filter((id) => ABAS[janela.aba][1](ITEMS[id]));
    topo = `<div class="abas">${Object.entries(ABAS).map(([k, [n]]) => `<button class="btnpx${janela.aba === k ? ' on' : ''}" data-aba="${k}">${n}</button>`).join('')}</div>
      <div id="catalogo"><div class="g g9">${ids.map((id) => `<div class="slot" data-a="cat" data-i="${id}"></div>`).join('')}</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:6px"><span style="font-size:13px;opacity:.75">Toque segurando para pegar só 1</span><span style="display:flex;align-items:center;gap:6px"><span style="font-size:14px">Lixeira</span>${slotHTML('lixo', 0, '', '🗑')}</span></div>`;
  } else if (t === 'inv' || t === 'bancada') {
    const n = janela.size;
    const arm = t === 'inv' ? `<div class="g" style="grid-template-columns:var(--s)">${['🪖', '👕', '👖', '👢'].map((p, i) => slotHTML('arm', i, '', p)).join('')}</div><div class="stats">❤ ${Math.ceil(st.vida)}/20<br>🛡 ${defesa()}<br>🐟 ${st.fome}/20${temOrbe ? '<br>✨ ' + Math.floor(st.mana) : ''}</div>` : '';
    topo = `<div class="topo">${arm}<div class="g" style="grid-template-columns:repeat(${n},var(--s))">${janela.grid.map((_, i) => slotHTML('grid', i)).join('')}</div>
      <div class="seta">➜</div>${slotHTML('res', 0, 'res')}</div>
      <div style="display:flex;justify-content:center"><button class="btnpx${janela.receitas ? ' on' : ''}" id="bRec">📖 Livro de receitas</button></div>
      <div id="receitas" ${janela.receitas ? '' : 'hidden'}></div>`;
  } else if (t === 'fornalha') {
    topo = `<div class="topo"><div class="fcol">${slotHTML('fin', 0)}<div class="fogo"><i id="fFogo"></i></div>${slotHTML('ffuel', 0)}</div>
      <div class="seta">➜<span class="p" id="fProg"></span></div>${slotHTML('fout', 0, 'res')}</div>
      <div id="dica">Em cima o que vai assar, embaixo o combustível. Assa: minérios de ferro e ouro → barras, carnes, areia → vidro, pedregulho → pedra, tronco → carvão, terra → tijolos, neve → gelo.</div>`;
  } else if (t === 'troca') {
    const a = janela.aldeao; const pf = a ? PROF[a.prof] : null;
    topo = !pf ? '' : `<div class="trocas">${pf.trocas.map((tr, k) => { const ok = modo === 'cri' || tr[0].every(([id, n]) => contar(id) >= n); return `<div class="tr${ok ? '' : ' falta'}">${tr[0].map(([id, n]) => `<span class="ti" data-ic="${id}" data-n="${n}"></span>`).join('')}<span class="seta">➜</span><span class="ti" data-ic="${tr[1][0]}" data-n="${tr[1][1]}"></span><button class="btnpx" data-troca="${k}">Trocar</button></div>`; }).join('')}</div>`;
  } else if (t === 'bau') topo = `<div class="g g9">${Array.from({ length: 27 }, (_, i) => slotHTML('bau', i)).join('')}</div>`;
  jan.innerHTML = `<div class="mc"><button class="x" id="jx">✕</button><h4>${titulo}</h4>${topo}
    <div class="lbl">Inventário</div><div class="g g9">${MAIN.map((i) => slotHTML('inv', i)).join('')}</div>
    <div class="g g9 hotsep">${HOT.map((i) => slotHTML('inv', i)).join('')}</div>
    <div id="dica">${isTouch ? 'Toque pega/solta · segure para pegar metade ou soltar só 1 · toque duas vezes para mover rápido · toque fora para fechar' : 'Clique pega/solta · direito: metade / 1 · Shift+clique: move rápido · E ou Esc fecha'}</div></div>`;
  $('jx').onclick = fecharJanela;
  const bRec = $('bRec'); if (bRec) bRec.onclick = () => { janela.receitas = !janela.receitas; renderJanela(); };
  jan.querySelectorAll('[data-aba]').forEach((b) => b.onclick = () => { janela.aba = b.dataset.aba; renderJanela(); });
  jan.querySelectorAll('.ti').forEach((el) => { el.appendChild(iconClone(+el.dataset.ic)); if (+el.dataset.n > 1) { const n = document.createElement('b'); n.textContent = el.dataset.n; el.appendChild(n); } el.title = ITEMS[+el.dataset.ic].name; });
  jan.querySelectorAll('[data-troca]').forEach((b) => b.onclick = () => fazerTroca(+b.dataset.troca));
  refreshSlots();
  if (janela.receitas) renderReceitas();
}
function fazerTroca(k) {
  const tr = PROF[janela.aldeao.prof].trocas[k];
  if (modo !== 'cri' && !tr[0].every(([id, n]) => contar(id) >= n)) { toast('Faltam itens para essa troca'); return; }
  for (const [id, n] of tr[0]) consumir(id, n);
  const left = giveStack(mkS(tr[1][0], tr[1][1])); if (left) soltarItem(left, 0, P.pos.x, P.pos.y + 1, P.pos.z);
  som('pegar'); hearts(janela.aldeao.pos); renderJanela(); renderHot();
}
function getSlot(a, i) {
  if (a === 'inv') return inv[i]; if (a === 'arm') return armor[i];
  if (a === 'grid') return janela.grid[i];
  if (a === 'bau') return chests.get(janela.key)[i];
  if (a === 'fin' || a === 'ffuel' || a === 'fout') return getFurnace(janela.key)[{ fin: 'in', ffuel: 'fuel', fout: 'out' }[a]];
  if (a === 'res') { const r = gridResult(); if (!r) return null; const s = mkS(r.out[0], r.out[1]); if (r.conserto) s.d = r.d; return s; }
  if (a === 'cat') return mkS(+i, 1);
  return null;
}
function setSlot(a, i, s) {
  if (s && s.n <= 0) s = null;
  if (a === 'inv') inv[i] = s; else if (a === 'arm') armor[i] = s; else if (a === 'grid') janela.grid[i] = s; else if (a === 'bau') chests.get(janela.key)[i] = s;
  else if (a === 'fin' || a === 'ffuel' || a === 'fout') getFurnace(janela.key)[{ fin: 'in', ffuel: 'fuel', fout: 'out' }[a]] = s;
}
function refreshSlots() {
  if (!janela) return;
  jan.querySelectorAll('.slot').forEach((el) => { const a = el.dataset.a, i = el.dataset.i; fillSlot(el, a === 'lixo' ? null : getSlot(a, +i)); });
  maoEl.innerHTML = ''; if (cursor) fillSlot(maoEl, cursor);
  furnaceBars();
}
function furnaceBars() { if (!janela || janela.tipo !== 'fornalha') return; const f = getFurnace(janela.key); const fo = $('fFogo'), pr = $('fProg'); if (fo) fo.style.height = (f.burn > 0 ? f.burn / f.burnMax * 100 : 0) + '%'; if (pr) pr.style.width = (f.prog / SMELT_T * 32) + 'px'; }
const same = (a, b) => a && b && a.id === b.id && maxStack(a.id) > 1;
function consumeGrid() { for (let i = 0; i < janela.grid.length; i++) { const s = janela.grid[i]; if (s) { s.n--; if (!s.n) janela.grid[i] = null; } } }
function aceita(a, i, s) { if (!s) return true; if (a === 'arm') return ITEMS[s.id].armor === i; if (a === 'ffuel') return !!FUEL[s.id]; if (a === 'fout' || a === 'res') return false; return true; }
function slotClick(a, i, right, shift) {
  som('clique');
  if (a === 'lixo') { cursor = null; refreshSlots(); return; }
  if (a === 'cat') { const it = ITEMS[i]; if (cursor) cursor = null; else if (shift) giveStack(mkS(+i, it.stack)); else cursor = mkS(+i, right ? 1 : it.stack); refreshSlots(); return; }
  if (a === 'res') {
    const r = gridResult(); if (!r) return;
    const make = () => { const s = mkS(r.out[0], r.out[1]); if (r.conserto) s.d = r.d; return s; };
    if (shift) { let guard = 0; while (gridResult() && gridResult().out[0] === r.out[0] && guard++ < 64) { const left = giveStack(make()); consumeGrid(); if (left) { cursor = left; break; } } }
    else { const out = make(); if (!cursor) cursor = out; else if (same(cursor, out) && cursor.n + out.n <= maxStack(out.id)) cursor.n += out.n; else return; consumeGrid(); }
    conquistaPorItem(r.out[0]); refreshSlots(); renderHot(); if (janela.receitas) renderReceitas(); return;
  }
  if (a === 'fout') { const s = getSlot(a, 0); if (!s) return; conquistaPorItem(s.id); if (shift) setSlot(a, 0, giveStack(s)); else if (!cursor) { cursor = s; setSlot(a, 0, null); } else if (same(cursor, s) && cursor.n + s.n <= maxStack(s.id)) { cursor.n += s.n; setSlot(a, 0, null); } refreshSlots(); return; }
  const s = getSlot(a, i);
  if (shift && s) {
    if (a === 'inv') {
      const it = ITEMS[s.id];
      if (it.armor != null && !armor[it.armor] && janela.tipo === 'inv' && modo !== 'cri') { armor[it.armor] = s; setSlot(a, i, null); if (armor.every((x) => x)) conquistar('armadura'); refreshSlots(); renderHot(); return; }
      if (janela.tipo === 'bau') { setSlot(a, i, addToSlots(chests.get(janela.key), [...Array(27).keys()], s)); refreshSlots(); renderHot(); return; }
      if (janela.tipo === 'fornalha') { const f = getFurnace(janela.key); const k = FUEL[s.id] && !SMELT[s.id] ? 'fuel' : 'in'; const cur = f[k]; if (!cur) { f[k] = s; setSlot(a, i, null); } else if (same(cur, s)) { const m = Math.min(s.n, 64 - cur.n); cur.n += m; s.n -= m; setSlot(a, i, s); } refreshSlots(); renderHot(); return; }
      setSlot(a, i, addToSlots(inv, i < 9 ? MAIN : HOT, s));
    } else setSlot(a, i, addToSlots(inv, ALL, s));
    refreshSlots(); renderHot(); if (janela.receitas) renderReceitas(); return;
  }
  if (cursor && !aceita(a, i, cursor)) return;
  if (!right) {
    if (!cursor && s) { cursor = s; setSlot(a, i, null); }
    else if (cursor && !s) { setSlot(a, i, cursor); cursor = null; }
    else if (cursor && s) { if (same(cursor, s)) { const m = Math.min(cursor.n, maxStack(s.id) - s.n); s.n += m; cursor.n -= m; if (!cursor.n) cursor = null; } else { setSlot(a, i, cursor); cursor = s; } }
  } else {
    if (!cursor && s) { const h = Math.ceil(s.n / 2); cursor = { ...s, n: h }; s.n -= h; setSlot(a, i, s.n ? s : null); }
    else if (cursor && (!s || same(cursor, s))) { if (!s) setSlot(a, i, { ...cursor, n: 1 }); else if (s.n < maxStack(s.id)) s.n++; else return; cursor.n--; if (!cursor.n) cursor = null; }
  }
  if (a === 'arm' && armor.every((x) => x)) conquistar('armadura');
  refreshSlots(); renderHot(); if (janela.receitas) renderReceitas();
}
function contar(id) { let n = 0; for (const s of inv) if (s && s.id === id) n += s.n; for (const s of janela.grid) if (s && s.id === id) n += s.n; return n; }
function receitaCabe(r) { return r.shapeless ? r.shapeless.length <= janela.size * janela.size : (r.w <= janela.size && r.h <= janela.size); }
function precisa(r) { const need = {}; if (r.shapeless) r.shapeless.forEach((id) => need[id] = (need[id] || 0) + 1); else r.p.forEach((row) => [...row].forEach((ch) => { if (ch !== '.') need[r.k[ch]] = (need[r.k[ch]] || 0) + 1; })); return need; }
function renderReceitas() {
  const box = $('receitas'); if (!box) return; box.innerHTML = '';
  const lista = RECIPES.filter(receitaCabe).map((r) => { const need = precisa(r); return { r, need, ok: modo === 'cri' || Object.entries(need).every(([id, n]) => contar(+id) >= n) }; }).sort((a, b) => b.ok - a.ok);
  if (janela.size === 2) { const f = document.createElement('div'); f.className = 'rcinfo'; f.textContent = 'Receitas maiores (armas, armaduras, poderes, cultura pop…) aparecem na bancada 3×3.'; box.appendChild(f); }
  for (const { r, need, ok } of lista) {
    const el = document.createElement('div'); el.className = 'rc' + (ok ? '' : ' falta');
    el.appendChild(iconClone(r.out[0]));
    const sp = document.createElement('span'); sp.innerHTML = `${ITEMS[r.out[0]].name}${r.out[1] > 1 ? ' ×' + r.out[1] : ''}<br><small style="opacity:.75">${Object.entries(need).map(([id, n]) => n + ' ' + ITEMS[id].name).join(', ')}</small>`;
    el.appendChild(sp);
    el.onclick = () => { if (!ok) { toast('Faltam ingredientes'); return; } preencher(r); };
    box.appendChild(el);
  }
}
function tirar(id) { if (modo === 'cri') return mkS(id, 1); for (const i of [...MAIN, ...HOT]) { const s = inv[i]; if (s && s.id === id) { s.n--; if (!s.n) inv[i] = null; return mkS(id, 1); } } return null; }
function preencher(r) {
  for (let i = 0; i < janela.grid.length; i++) if (janela.grid[i]) { giveStack(janela.grid[i]); janela.grid[i] = null; }
  const n = janela.size;
  if (r.shapeless) r.shapeless.forEach((id, k) => { janela.grid[k] = tirar(id); });
  else r.p.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') janela.grid[y * n + x] = tirar(r.k[ch]); }));
  refreshSlots(); renderHot(); renderReceitas();
}
let pressT = 0, pressInfo = null, ultimoToque = { a: '', i: -1, t: 0 };
jan.addEventListener('contextmenu', (e) => e.preventDefault());
jan.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.slot');
  if (!el) { if (e.target === jan) fecharJanela(); return; }
  e.preventDefault(); movMao(e);
  const a = el.dataset.a, i = +el.dataset.i;
  if (e.pointerType === 'touch') {
    const agora = performance.now();
    if (ultimoToque.a === a && ultimoToque.i === i && agora - ultimoToque.t < 300 && !cursor) { ultimoToque.t = 0; pressInfo = null; slotClick(a, i, false, true); return; }
    ultimoToque = { a, i, t: agora };
    pressInfo = { a, i, done: false };
    clearTimeout(pressT); pressT = setTimeout(() => { if (pressInfo) { pressInfo.done = true; slotClick(pressInfo.a, pressInfo.i, true, false); try { navigator.vibrate && navigator.vibrate(15); } catch (_) {} } }, 380);
    if (a !== 'lixo') { const s = getSlot(a, i); if (s) { tipEl.innerHTML = infoItem(s.id); tipEl.style.display = 'block'; tipEl.style.left = Math.min(innerWidth - 270, e.clientX + 10) + 'px'; tipEl.style.top = Math.max(4, e.clientY - 70) + 'px'; clearTimeout(tipT); tipT = setTimeout(() => tipEl.style.display = 'none', 1600); } }
  } else slotClick(a, i, e.button === 2, e.shiftKey);
});
let tipT = 0;
jan.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch' || !pressInfo) return; clearTimeout(pressT); if (!pressInfo.done) slotClick(pressInfo.a, pressInfo.i, false, false); pressInfo = null; });
jan.addEventListener('pointercancel', () => { clearTimeout(pressT); pressInfo = null; });
jan.addEventListener('pointerover', (e) => { if (e.pointerType === 'touch') return; const el = e.target.closest('.slot'); if (!el || el.dataset.a === 'lixo') { tipEl.style.display = 'none'; return; } const s = getSlot(el.dataset.a, +el.dataset.i); if (!s) { tipEl.style.display = 'none'; return; } tipEl.innerHTML = infoItem(s.id); tipEl.style.display = 'block'; });
function movMao(e) { maoEl.style.left = e.clientX + 'px'; maoEl.style.top = (e.clientY - (e.pointerType === 'touch' ? 40 : 0)) + 'px'; if (e.pointerType !== 'touch') { tipEl.style.left = (e.clientX + 16) + 'px'; tipEl.style.top = (e.clientY - 10) + 'px'; } }
addEventListener('pointermove', (e) => { if (janela) movMao(e); });

// ================== HUD ==================
function renderHot() {
  const hb = $('hot'); if (hb.children.length !== 9) { hb.innerHTML = ''; for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'slot'; d.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); selecionar(i); }); hb.appendChild(d); } }
  if (!inv) return;
  [...hb.children].forEach((d, i) => { fillSlot(d, inv[i]); d.classList.toggle('sel', i === sel); });
  temOrbe = inv.some((s) => s && ITEMS[s.id] && ITEMS[s.id].poder);
  atualizarItemMao();
}
function hudIcon(draw) { const c = document.createElement('canvas'); c.width = c.height = 9; const x = c.getContext('2d'); draw(x); return c.toDataURL(); }
const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
const FISH = ['...##...', '.#####.#', '########', '.#####.#', '...##...'];
function pixMap(x, map, col, ox = 1, oy = 2, metade, brilho) { map.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') { x.fillStyle = metade && i >= row.length / 2 ? '#3a2a2a' : col; x.fillRect(ox + i, oy + j, 1, 1); } })); if (brilho) { x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(ox + 1, oy + 1, 1, 1); } }
const ICS = {
  c: hudIcon((x) => pixMap(x, HEART, '#ff3b4f', 1, 2, false, true)), cm: hudIcon((x) => pixMap(x, HEART, '#ff3b4f', 1, 2, true, true)), c0: hudIcon((x) => pixMap(x, HEART, '#3a2a2a')),
  f: hudIcon((x) => pixMap(x, FISH, '#ff9a3a', 0, 2, false, true)), fm: hudIcon((x) => pixMap(x, FISH, '#ff9a3a', 0, 2, true, true)), f0: hudIcon((x) => pixMap(x, FISH, '#3a2a2a', 0, 2)),
  b: hudIcon((x) => { x.fillStyle = '#9fe0ff'; x.beginPath(); x.arc(4.5, 4.5, 3.5, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(3, 3, 1, 1); }),
  a: hudIcon((x) => { x.fillStyle = '#cfd6e2'; x.fillRect(1, 1, 7, 4); x.fillRect(2, 5, 5, 2); x.fillRect(3, 7, 3, 1); x.fillStyle = '#fff'; x.fillRect(2, 2, 1, 1); }),
};
function linhaIcones(n, cheio, meio, vazio, total = 10) { let h = ''; for (let i = 0; i < total; i++) { const v = n - i * 2; const ic = v >= 2 ? cheio : v >= 1 ? meio : vazio; h += `<img src="${ICS[ic]}">`; } return h; }
let statsKey = '';
function renderStats() {
  if (!st) return;
  const k = [Math.ceil(st.vida), st.fome, st.ar, defesa(), modo, Math.round(st.mana / 4), temOrbe].join(',');
  if (k === statsKey) return; statsKey = k;
  const s = modo === 'sob';
  $('vida').innerHTML = s ? linhaIcones(Math.ceil(st.vida), 'c', 'cm', 'c0') : '';
  $('fome').innerHTML = s ? linhaIcones(st.fome, 'f', 'fm', 'f0') : '';
  const def = defesa(); $('armor').innerHTML = s && def ? Array.from({ length: Math.ceil(def / 2) }, () => `<img src="${ICS.a}">`).join('') : '';
  $('bolhas').innerHTML = s && st.ar < 10 ? Array.from({ length: st.ar }, () => `<img src="${ICS.b}">`).join('') : '';
  $('mana').hidden = !temOrbe || modo === 'cri'; $('mana').firstElementChild.style.width = st.mana + '%';
}
let nomeT = 0;
function selecionar(i) { sel = i; atirarSegurado = false; rajadaCarga = 0; $('carga2').style.display = 'none'; renderHot(); const s = inv[i]; const el = $('itemNome'); el.textContent = s ? ITEMS[s.id].name : ''; el.classList.add('on'); clearTimeout(nomeT); nomeT = setTimeout(() => el.classList.remove('on'), 1500); }
let toastT = 0; function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2200); }
function setModo(m) {
  modo = m; store.set('modo', m); document.body.classList.toggle('criativo', m === 'cri');
  $('pSob').classList.toggle('on', m === 'sob'); $('pCri').classList.toggle('on', m === 'cri');
  if (m !== 'cri' && !buff.asas) setFly(false);
  if (m === 'cri') { for (const mb of mobs) if (!mb.d.pass) mb.remover(); }
  statsKey = ''; renderStats();
}

// ================== TELAS ==================
const pilha = [];
function abrirTela(id) { const atual = pilha[pilha.length - 1]; if (atual) $(atual).hidden = true; pilha.push(id); $(id).hidden = false; if (id === 'tOpcoes') renderOpcoes(); if (id === 'tControles') renderControles(); if (id === 'tConquistas') renderConquistas(); if (id === 'tMundos') renderMundos(); som('clique'); }
function voltarTela() { const t = pilha.pop(); if (t) $(t).hidden = true; const ant = pilha[pilha.length - 1]; if (ant) $(ant).hidden = false; else if (jogando) despausar(); som('clique'); }
document.querySelectorAll('[data-abre]').forEach((b) => b.onclick = () => abrirTela(b.dataset.abre));
document.querySelectorAll('[data-volta]').forEach((b) => b.onclick = voltarTela);
function pausar() { if (!jogando || pausado) return; if (janela) fecharJanela(); pausado = true; mining.on = false; for (const k in keys) keys[k] = false; joy.x = joy.y = 0; if (document.pointerLockElement) document.exitPointerLock(); pilha.length = 0; abrirTela('tPausa'); saveAll(); }
function despausar() { for (const id of pilha) $(id).hidden = true; pilha.length = 0; pausado = false; if (!isTouch) lockReq(); }
$('bMenu').onclick = pausar;
$('pVoltar').onclick = despausar;
$('pSob').onclick = () => { setModo('sob'); toast('Modo sobrevivência'); };
$('pCri').onclick = () => { setModo('cri'); toast('Modo criativo'); };
$('pTroca').onclick = () => { jogoComGatinha = !jogoComGatinha; GS.set('gatinha', jogoComGatinha); trocarModelos(); };
$('pSegue').onclick = () => { segue = !segue; GS.set('segue', segue); $('pSegue').classList.toggle('on', segue); toast(segue ? 'Ela vai com você (e cuida de você)' : 'Ela fica passeando'); };
$('pTempo').onclick = () => { const a = (dayT - .25 + 1) % 1; dayT = a < .5 ? .78 : .28; };
$('pCasa').onclick = () => { goHome(); despausar(); };
$('pSair').onclick = () => { saveAll(); despausar(); irParaTitulo(); };
$('renascer').onclick = renascer;
$('morteTitulo').onclick = () => { renascer(); irParaTitulo(); };
function irParaTitulo() { jogando = false; document.body.classList.remove('jogando'); $('hud').hidden = true; $('tTitulo').hidden = false; $('menuTitulo').hidden = false; $('cargaBox').hidden = true; if (document.pointerLockElement) document.exitPointerLock(); selBox.visible = false; crack.visible = false; }
// opções
function renderOpcoes() {
  const sets = [['oFov', 'fov', (v) => v + '°'], ['oSens', 'sens', (v) => v + '%'], ['oRD', 'rd', (v) => v + ' pedaços'], ['oVol', 'vol', (v) => v + '%']];
  for (const [id, k, f] of sets) { const el = $(id); el.value = OPC[k]; $(id + 'V').textContent = f(OPC[k]); el.oninput = () => { OPC[k] = +el.value; $(id + 'V').textContent = f(OPC[k]); if (k === 'fov') { camera.fov = OPC.fov; camera.updateProjectionMatrix(); } if (k === 'rd') aplicarRD(); if (k === 'vol') setVolume(OPC.vol / 100); salvarOpc(); }; }
  const tg = (id, txt, fn) => { $(id).textContent = txt(); $(id).onclick = () => { fn(); $(id).textContent = txt(); salvarOpc(); }; };
  tg('oGraf', () => 'Gráficos: ' + (OPC.graf === 'bonito' ? 'Bonito' : 'Rápido'), () => { OPC.graf = OPC.graf === 'bonito' ? 'rapido' : 'bonito'; aplicarGraficos(); });
  tg('oBob', () => 'Balanço: ' + (OPC.bob ? 'Sim' : 'Não'), () => OPC.bob = !OPC.bob);
  tg('oCoord', () => 'Coordenadas: ' + (OPC.coord ? 'Sim' : 'Não'), () => { OPC.coord = !OPC.coord; $('nome').hidden = !OPC.coord; });
  tg('oInvY', () => 'Inverter mouse: ' + (OPC.invY ? 'Sim' : 'Não'), () => OPC.invY = !OPC.invY);
  tg('oCtrl', () => 'Controle no celular: ' + (OPC.ctrl === 'setas' ? 'Setas' : 'Joystick'), () => { OPC.ctrl = OPC.ctrl === 'setas' ? 'joystick' : 'setas'; aplicarControles(); });
  tg('oTam', () => 'Botões: ' + ({ pequeno: 'Pequenos', medio: 'Médios', grande: 'Grandes' })[OPC.tam], () => { OPC.tam = ({ pequeno: 'medio', medio: 'grande', grande: 'pequeno' })[OPC.tam]; aplicarControles(); });
}
// controles
let esperandoTecla = null;
function renderControles() {
  const L = $('listaTeclas'); L.innerHTML = '';
  for (const a of Object.keys(TECLAS_PADRAO)) { const n = document.createElement('div'); n.textContent = NOMES_ACAO[a]; const b = document.createElement('button'); b.className = 'bt'; b.textContent = nomeTecla(TECLAS[a]); b.onclick = () => { esperandoTecla = a; L.querySelectorAll('.bt').forEach((x) => x.classList.remove('esperando')); b.classList.add('esperando'); b.textContent = '> aperte uma tecla <'; }; L.append(n, b); }
  const fixos = [['Escolher espaço da barra', '1 a 9 / rodinha'], ['Quebrar / atacar / atirar / poderes', 'Clique esquerdo (segure)'], ['Colocar / usar / comer / abrir', 'Clique direito'], ['Pausa', 'Esc']];
  for (const [a, k] of fixos) { const n = document.createElement('div'); n.textContent = a; const s = document.createElement('div'); s.style.cssText = 'opacity:.75;text-align:right'; s.textContent = k; L.append(n, s); }
  $('txtToque').innerHTML = '<b>No celular:</b> use as setas (ou o joystick, nas Opções) para andar — toque duas vezes na seta de cima para correr — e arraste à direita para olhar. Toque num aldeão para trocar. <b>⛏️/⚔️/✨</b> (segure): quebra, ataca, atira e usa poderes. <b>✋</b> ou um toque rápido na tela: coloca bloco, come, abre bancada/fornalha/baú, dorme. <b>⤒</b> pula (duas vezes com botas de mola), <b>🐾</b> agacha, <b>🎥</b> troca a câmera, <b>⋯</b> abre o inventário, <b>☰</b> pausa.';
}
$('kPadrao').onclick = () => { TECLAS = Object.assign({}, TECLAS_PADRAO); GS.set('teclas', TECLAS); renderControles(); };
// conquistas
function renderConquistas() { const L = $('listaConq'); L.innerHTML = ''; for (const [id, nome, desc, ic] of CONQ) { const d = document.createElement('div'); d.className = 'cq' + (conqFeitas.has(id) ? ' ok' : ''); d.appendChild(iconClone(ic)); const t = document.createElement('div'); t.innerHTML = `<b>${nome}</b><small>${desc}</small>`; d.appendChild(t); L.appendChild(d); } $('cqConta').textContent = `(${conqFeitas.size}/${CONQ.length})`; }
// mundos
let mundos = GS.get('mundos', null);
if (!mundos) { mundos = [{ id: 'principal', nome: 'Meu mundo', seed: 20261105, modo: localStorage.getItem(BASE + 'modo') ? JSON.parse(localStorage.getItem(BASE + 'modo')) : 'sob', vila: true, ultimo: Date.now() }]; GS.set('mundos', mundos); }
let mundoSel = null;
function renderMundos() {
  const L = $('listaMundos'); L.innerHTML = ''; mundos.sort((a, b) => b.ultimo - a.ultimo); if (!mundoSel) mundoSel = mundos[0] && mundos[0].id;
  for (const m of mundos) { const d = document.createElement('div'); d.className = 'mundo' + (m.id === mundoSel ? ' sel' : ''); d.appendChild(iconClone(m.vila ? B.GRASS : B.STONE)); const t = document.createElement('div'); t.innerHTML = `<b>${m.nome.replace(/</g, '')}</b><small>${m.modo === 'cri' ? 'Criativo' : 'Sobrevivência'} · ${m.vila ? 'com vila' : 'sem vila'} · semente ${m.seed} · ${new Date(m.ultimo).toLocaleDateString('pt-BR')}</small>`; d.appendChild(t); d.onclick = () => { mundoSel = m.id; renderMundos(); }; d.ondblclick = () => entrarMundo(m); L.appendChild(d); }
  $('confApagar').hidden = true;
}
$('tUm').onclick = () => abrirTela('tMundos');
$('mJogar').onclick = () => { const m = mundos.find((x) => x.id === mundoSel); if (m) entrarMundo(m); };
$('mApagar').onclick = () => { if (mundos.length <= 1) { toast('Precisa ter pelo menos um mundo'); return; } $('confApagar').hidden = false; };
$('mApagarNao').onclick = () => { $('confApagar').hidden = true; };
$('mApagarSim').onclick = () => { const m = mundos.find((x) => x.id === mundoSel); if (!m) return; const pre = prefixoMundo(m); try { Object.keys(localStorage).filter((k) => k.startsWith(pre) && (m.id !== 'principal' || !k.startsWith(BASE + 'g.') && !k.startsWith(BASE + 'm_'))).forEach((k) => localStorage.removeItem(k)); } catch (e) {} mundos = mundos.filter((x) => x.id !== m.id); GS.set('mundos', mundos); mundoSel = null; renderMundos(); };
let novoModo = 'sob', novaVila = true;
$('mNovo').onclick = () => { $('cNome').value = 'Novo mundo ' + (mundos.length + 1); $('cSemente').value = ''; abrirTela('tCriar'); };
$('cModo').onclick = () => { novoModo = novoModo === 'sob' ? 'cri' : 'sob'; $('cModo').textContent = 'Modo: ' + (novoModo === 'sob' ? 'Sobrevivência' : 'Criativo'); };
$('cVila').onclick = () => { novaVila = !novaVila; $('cVila').textContent = 'Vila inicial: ' + (novaVila ? 'Sim' : 'Não'); };
$('cCriar').onclick = () => {
  const txt = $('cSemente').value.trim(); let seed = txt ? (/^-?\d+$/.test(txt) ? +txt : [...txt].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) | 0) : (Math.random() * 2e9) | 0;
  const m = { id: Date.now().toString(36), nome: $('cNome').value.trim() || 'Novo mundo', seed, modo: novoModo, vila: novaVila, ultimo: Date.now() };
  mundos.push(m); GS.set('mundos', mundos); pilha.length = 0; $('tCriar').hidden = true; $('tMundos').hidden = true; entrarMundo(m);
};
$('tContinuar').onclick = () => entrarMundo(mundoAtual);
const SPLASH = ['Agora com poderes!', 'Miau!', '100% gatinhos!', 'Feito com carinho!', 'Blocos e bigodes!', 'Cuidado com as sombrinhas!', 'Agora em 32×32!', 'Com a gatinha doutora!', 'Ronronando desde 2026!', 'Super força!'];
$('splash').textContent = SPLASH[(Math.random() * SPLASH.length) | 0];

// ================== ÍCONES DOS BOTÕES ==================
const W = RAMP.branco;
const UI_IC = {
  cima: (P) => P.poly([[16, 5], [27, 21], [5, 21]], W, 4),
  baixo: (P) => P.poly([[5, 11], [27, 11], [16, 27]], W, 4),
  esq: (P) => P.poly([[5, 16], [21, 5], [21, 27]], W, 4),
  dir: (P) => P.poly([[27, 16], [11, 5], [11, 27]], W, 4),
  pula: (P) => { P.poly([[16, 3], [27, 13], [22, 13], [16, 8], [10, 13], [5, 13]], W, 4); P.poly([[16, 14], [27, 24], [22, 24], [16, 19], [10, 24], [5, 24]], W, 4); P.rect(6, 27, 20, 2, W, 3.5); },
  desce: (P) => { P.poly([[5, 8], [10, 8], [16, 14], [22, 8], [27, 8], [16, 19]], W, 4); P.poly([[5, 17], [10, 17], [16, 23], [22, 17], [27, 17], [16, 28]], W, 4); },
  agacha: (P) => { P.disc(16, 20, 6, RAMP.rosa, 3.2, 5); for (const [x, y] of [[8, 11], [13, 7], [19, 7], [24, 11]]) P.disc(x, y, 2.6, RAMP.rosa, 3.5, 2.8); },
  pata: (P) => { P.disc(16, 20, 7.5, W, 3.6, 6.5); for (const [x, y] of [[7, 10], [12.5, 5.5], [19.5, 5.5], [25, 10]]) P.disc(x, y, 3, W, 4, 3.4); P.disc(16, 21, 4, RAMP.rosa, 3.4, 3.4); },
  pausa: (P) => { P.rect(8, 6, 6, 20, W, 4); P.rect(18, 6, 6, 20, W, 4); },
  olho: (P) => { P.disc(16, 16, 12, W, 4, 7); P.disc(16, 16, 5, RAMP.azul, 3, 5); P.disc(16, 16, 2.4, RAMP.escuro, 0, 2.4, true); P.px(14, 14, W, 5, true); },
  asa: (P) => { for (let k = 0; k < 6; k++) P.line(6, 22 - k, 27 - k * 2.5, 6 + k * 3.2, k % 2 ? RAMP.branco : W, 4.4 - (k % 2), 2.2); },
  mais: (P) => { for (const x of [7, 16, 25]) P.disc(x, 16, 3, W, 4, 3); },
};
function pintarIcones() {
  document.querySelectorAll('canvas[data-ic]').forEach((c) => { const f = UI_IC[c.dataset.ic]; if (!f) return; const src = sprite(f); c.width = c.height = 32; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0); });
}
pintarIcones();
function iconeAcaoCanvas() { const it = heldIt(); const id = it ? (it.tool || it.arma || it.poder || it.arremesso ? it.id : IT.PIC_D) : IT.PIC_D; const c = $('icAcao'); c.width = c.height = 32; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 32, 32); x.drawImage(iconCanvas(it && !it.tool && !it.arma && !it.poder && !it.arremesso ? (it.food ? it.id : IT.PIC_D) : id), 0, 0); }
function aplicarControles() { document.body.classList.toggle('setas', OPC.ctrl === 'setas'); document.body.classList.toggle('btp', OPC.tam === 'pequeno'); document.body.classList.toggle('btg', OPC.tam === 'grande'); }
aplicarControles();
// cruz de setas
const dpad = $('dpad'); let dpadId = null, ultimoCima = 0, dpadCorre = false;
function dpadToque(t) {
  const r = dpad.getBoundingClientRect(); const dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
  const m = Math.hypot(dx, dy); let x = 0, y = 0;
  if (m > r.width * .14) { const a = Math.atan2(-dy, dx); const k = Math.round(a / (PI / 4)); x = Math.round(Math.cos(k * PI / 4) * 100) / 100; y = Math.round(Math.sin(k * PI / 4) * 100) / 100; }
  joy.x = x * .96; joy.y = y * (dpadCorre && y > 0 ? 1 : .96);
  dpad.querySelector('[data-d=cima]').classList.toggle('on', y > .3); dpad.querySelector('[data-d=baixo]').classList.toggle('on', y < -.3);
  dpad.querySelector('[data-d=esq]').classList.toggle('on', x < -.3); dpad.querySelector('[data-d=dir]').classList.toggle('on', x > .3);
}
dpad.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); iniciarSom(); const t = e.changedTouches[0]; dpadId = t.identifier; const agora = performance.now(); const r = dpad.getBoundingClientRect(); if (t.clientY < r.top + r.height / 3) { if (agora - ultimoCima < 320) dpadCorre = true; ultimoCima = agora; } dpadToque(t); }, { passive: false });
dpad.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === dpadId) dpadToque(t); }, { passive: false });
const dpadFim = (e) => { for (const t of e.changedTouches) if (t.identifier === dpadId) { dpadId = null; dpadCorre = false; joy.x = joy.y = 0; dpad.querySelectorAll('.pb').forEach((b) => b.classList.remove('on')); } };
dpad.addEventListener('touchend', dpadFim); dpad.addEventListener('touchcancel', dpadFim);

// ================== CONTROLES DE TOQUE ==================
function holdBtn(id, down, up) {
  const b = $(id);
  b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); iniciarSom(); down(); }, { passive: false });
  const end = (e) => { e.preventDefault(); up && up(); }; b.addEventListener('touchend', end); b.addEventListener('touchcancel', end);
  b.addEventListener('mousedown', (e) => { e.stopPropagation(); down(); }); b.addEventListener('mouseup', () => up && up());
}
holdBtn('bPular', () => { jumpHeld = true; jumpPress = true; }, () => jumpHeld = false);
holdBtn('bDescer', () => downHeld = true, () => downHeld = false);
holdBtn('bMinerar', () => { mining.on = true; mining.cd = 0; }, () => { mining.on = false; atirarSegurado = false; avisoMunicao = false; });
holdBtn('bUsar', usar, null);
holdBtn('bAgachar', () => { agacharToque = !agacharToque; $('bAgachar').classList.toggle('on', agacharToque); }, null);
$('bVoar').onclick = () => setFly(!P.fly);
function trocarCamera() { camModo = (camModo + 1) % 3; $('bCam').classList.toggle('on', camModo !== 1); toast(['Câmera: olhos do gatinho', 'Câmera: atrás do gatinho', 'Câmera: de frente para o gatinho'][camModo]); }
$('bCam').onclick = trocarCamera;
$('bInv').onclick = () => janela ? fecharJanela() : (vivo && abrirJanela('inv'));
let joyId = null, lookId = null, joyC = { x: 0, y: 0 }, lookLast = { x: 0, y: 0 }, lookStart = 0, lookMoved = 0;
const joyEl = $('joy'), knob = $('knob');
const sensT = () => .0058 * OPC.sens / 100, sensM = () => .0025 * OPC.sens / 100;
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarSom(); if (!jogando || pausado) return; for (const t of e.changedTouches) {
  if (OPC.ctrl === 'joystick' && joyId === null && t.clientX < innerWidth * .45 && t.clientY > innerHeight * .35) { joyId = t.identifier; joyC = { x: t.clientX, y: t.clientY }; joyEl.style.left = (t.clientX - 62) + 'px'; joyEl.style.top = (t.clientY - 62) + 'px'; joyEl.style.bottom = 'auto'; }
  else if (lookId === null) { lookId = t.identifier; lookLast = { x: t.clientX, y: t.clientY }; lookStart = performance.now(); lookMoved = 0; }
} }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) {
  if (t.identifier === joyId) { let dx = t.clientX - joyC.x, dy = t.clientY - joyC.y; const m = Math.hypot(dx, dy), R = 50; if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / R; joy.y = -dy / R; }
  else if (t.identifier === lookId) { const dx = t.clientX - lookLast.x, dy = t.clientY - lookLast.y; lookMoved += Math.abs(dx) + Math.abs(dy); P.yaw -= dx * sensT(); P.pitch = clamp(P.pitch - dy * sensT() * (OPC.invY ? -1 : 1), -1.5, 1.5); lookLast = { x: t.clientX, y: t.clientY }; }
} }, { passive: false });
const tEnd = (e) => { for (const t of e.changedTouches) {
  if (t.identifier === joyId) { joyId = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.style.left = ''; joyEl.style.top = ''; joyEl.style.bottom = ''; }
  else if (t.identifier === lookId) { lookId = null; if (lookMoved < 10 && performance.now() - lookStart < 250) usar(); }
} };
canvas.addEventListener('touchend', tEnd); canvas.addEventListener('touchcancel', tEnd);
// mouse
let mDown = null;
const lockReq = () => { if (isTouch) return; try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} };
canvas.addEventListener('mousedown', (e) => {
  if (isTouch || !jogando || pausado) return; iniciarSom();
  if (e.button === 1 && hit && modo === 'cri' && ITEMS[hit.b]) { const i = inv.findIndex((s, k) => k < 9 && s && s.id === hit.b); if (i >= 0) selecionar(i); else { inv[sel] = mkS(hit.b, 64); renderHot(); } e.preventDefault(); return; }
  if (document.pointerLockElement === canvas) { if (e.button === 0) { mining.on = true; mining.cd = 0; } else if (e.button === 2) usar(); return; }
  mDown = { b: e.button, moved: 0 }; if (e.button === 0) { mining.on = true; mining.cd = 0; } lockReq();
});
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) { P.yaw -= e.movementX * sensM(); P.pitch = clamp(P.pitch - e.movementY * sensM() * (OPC.invY ? -1 : 1), -1.5, 1.5); return; }
  if (mDown) { mDown.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); P.yaw -= (e.movementX || 0) * .004; P.pitch = clamp(P.pitch - (e.movementY || 0) * .004, -1.5, 1.5); }
});
addEventListener('mouseup', (e) => { if (e.button === 0) { mining.on = false; atirarSegurado = false; avisoMunicao = false; } if (mDown && !document.pointerLockElement && mDown.moved < 5 && mDown.b === 2) usar(); mDown = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => { const preso = document.pointerLockElement === canvas; document.body.classList.toggle('preso', preso); if (!preso) { mining.on = false; } });
canvas.addEventListener('wheel', (e) => { if (jogando && !pausado) selecionar((sel + (e.deltaY > 0 ? 1 : -1) + 9) % 9); }, { passive: true });
let debugOn = false;
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (esperandoTecla) { e.preventDefault(); if (e.code !== 'Escape') { TECLAS[esperandoTecla] = e.code; GS.set('teclas', TECLAS); } esperandoTecla = null; renderControles(); return; }
  if (['F1', 'F3', 'F5', 'Tab'].includes(e.code) || e.code === TECLAS.camera || e.code === TECLAS.hud || e.code === TECLAS.debug) e.preventDefault();
  if (!jogando) { if (e.code === 'Escape' && pilha.length) voltarTela(); return; }
  if (e.code === 'Escape') { e.preventDefault(); if (janela) fecharJanela(); else if (pausado) { if (pilha.length > 1) voltarTela(); else despausar(); } else pausar(); return; }
  if (pausado) return;
  if (e.code === TECLAS.inventario) { e.preventDefault(); if (janela) fecharJanela(); else if (vivo) abrirJanela('inv'); return; }
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (janela) return;
  if (e.code === TECLAS.pular) { jumpHeld = true; jumpPress = true; e.preventDefault(); }
  if (e.code === TECLAS.frente) { const agora = performance.now(); if (agora - lastW < 300) sprintLatch = true; lastW = agora; }
  if (/^Digit[1-9]$/.test(e.code)) selecionar(+e.code.slice(5) - 1);
  if (e.code === TECLAS.voar) setFly(!P.fly);
  if (e.code === TECLAS.camera || e.code === 'KeyV') trocarCamera();
  if (e.code === TECLAS.hud) document.body.classList.toggle('semhud');
  if (e.code === TECLAS.debug) { debugOn = !debugOn; $('debug').hidden = !debugOn; }
  if (e.code === TECLAS.soltar && held() && vivo) { const s = held(); const tudo = e.ctrlKey; const n = tudo ? s.n : 1; const o = olho(); const d = new V3(0, 0, -1).applyEuler(camera.rotation); soltarItem(tudo ? { ...s } : mkS(s.id, 1), 1, o.x + d.x, o.y - .3, o.z + d.z, d.multiplyScalar(5).setY(2), 1.5); if (!tudo && s.d) drops[drops.length - 1].s.d = s.d; s.n -= n; if (s.n <= 0) inv[sel] = null; renderHot(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === TECLAS.pular) jumpHeld = false; if (e.code === TECLAS.frente) sprintLatch = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; jumpHeld = false; mining.on = false; if (jogando && !pausado && !janela) pausar(); });

// ================== DIA / NOITE / LUZES ==================
let clockT = 0, diaK = 1;
const dia = () => diaK;
const skyDay = new THREE.Color(0x87c3ef), skyNight = new THREE.Color(0x0b1030), skySet = new THREE.Color(0xf4a07a), sky = new THREE.Color(), cave = new THREE.Color(0x0a0a10);
const sunDir = new V3();
function updateDay(dt) {
  dayT = (dayT + dt / DAYLEN) % 1;
  const a = (dayT - .25) * PI * 2, sh = Math.sin(a); sunDir.set(Math.cos(a), sh, .3).normalize();
  const day = smoothstep(-.2, .25, sh); diaK = day;
  sky.copy(skyNight).lerp(skyDay, day); const set = Math.max(0, 1 - Math.abs(sh) / .28); sky.lerp(skySet, .45 * set);
  if (jogando && P.pos.y < surfaceY(P.pos.x, P.pos.z) - 8) sky.lerp(cave, .7);
  scene.background = sky; scene.fog.color.copy(sky);
  amb.intensity = (.26 + .38 * day) * PI; amb.color.setRGB(lerp(.55, 1, day), lerp(.62, 1, day), 1);
  if (buff.noite) { amb.intensity = Math.max(amb.intensity, .85 * PI); amb.color.setRGB(.85, 1, .85); }
  sunL.intensity = (sh > 0 ? .45 * day : .07) * PI;
  scene.environmentIntensity = .2 + .8 * day;
  const L = sh > 0 ? sunDir : sunDir.clone().negate();
  sunL.position.copy(P.pos).addScaledVector(L, 50); sunL.target.position.copy(P.pos);
  sunMesh.position.copy(camera.position).addScaledVector(sunDir, 300); sunMesh.lookAt(camera.position);
  moonMesh.position.copy(camera.position).addScaledVector(sunDir, -300); moonMesh.lookAt(camera.position);
  estrelas.position.copy(camera.position); estrelas.material.opacity = clamp(1 - day * 1.6, 0, 1); estrelas.visible = day < .65; estrelas.rotation.y = dayT * PI * .4;
  clouds.position.set(camera.position.x, 112, camera.position.z); cloudTex.offset.set(camera.position.x / 533 + clockT * .002, -camera.position.z / 533);
  clouds.material.color.setRGB(lerp(.3, 1, day), lerp(.33, 1, day), lerp(.45, 1, day));
  $('pTempo').textContent = sh > 0 ? 'Virar a noite' : 'Virar o dia';
  if (flashT > 0) { flashT -= dt; flashLight.intensity *= .82; } else flashLight.intensity = 0;
}
let lampT = 0;
function updateLamps(dt) {
  if (!lampLights.length) return;
  lampT -= dt; if (lampT > 0) return; lampT = .6;
  const px = Math.floor(P.pos.x), py = Math.floor(P.pos.y), pz = Math.floor(P.pos.z), R = 13; const found = [];
  for (let y = py - 8; y <= py + 10; y++) for (let z = pz - R; z <= pz + R; z++) for (let x = px - R; x <= px + R; x++) if (getBlock(x, y, z) === B.LAMP) found.push([(x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2, x, y, z]);
  found.sort((a, b) => a[0] - b[0]);
  const k = 1 - diaK * .85;
  lampLights.forEach((l, i) => { const f = found[i]; if (f) { l.position.set(f[1] + .5, f[2] + .5, f[3] + .5); l.intensity = 9 * k; } else l.intensity = 0; });
}
let aguaT = 0, aguaF = 0;
function updateAgua(dt) { aguaT -= dt; if (aguaT > 0) return; aguaT = .12; aguaF = (aguaF + 1 / 24) % 1; paintWater(aguaF); tex.needsUpdate = true; }

// ================== LOOP ==================
let last = performance.now(), saveTick = 0, uiTick = 0, frames = 0, fps = 0, fpsT = 0;
const DIRS = ['Norte', 'Noroeste', 'Oeste', 'Sudoeste', 'Sul', 'Sudeste', 'Leste', 'Nordeste'];
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; clockT += dt; frames++; fpsT += dt; if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  const ts = buff.tempo > 0 ? .25 : 1;
  if (jogando && !pausado && carregado) {
    if (vivo) updatePlayer(dt); else if (eu) eu.gato.atualizar(dt);
    updateNPC(dt); updateHolo(dt); updateAldeoes(dt); updateEspeciais(dt * ts); atualizarMobs(dt * ts, clockT); updateDrops(dt, clockT); updateParts(dt * ts); updateFx(dt); updateProjs(dt * ts); updateTNT(dt); tickFurnaces(dt);
    for (const k in poderCd) poderCd[k] -= dt; martCd -= dt;
    updateChunks(P.pos.x, P.pos.z, 2, isTouch ? 1 : 2);
    for (const c of rebuildNow) buildChunkMesh(c); rebuildNow.clear();
    updateCamera(dt); updateSelection(); acaoPrincipal(dt); updateLaser(); updateCorda(); updateLamps(dt); updateAgua(dt);
    if (dormindo > 0) { dormindo -= dt; if (dormindo <= 0) { dayT = .27; $('sono').classList.remove('on'); toast('Bom dia! ☀️'); humorTemp(eu, 'normal', .1); } }
    saveTick += dt; if (saveTick > 5) { saveTick = 0; store.set('player', { x: P.pos.x, y: P.pos.y, z: P.pos.z, yaw: P.yaw }); store.set('time', dayT); store.set('furnaces', [...furnaces]); store.set('stats', st); }
    if ((uiTick += dt) > .25) { uiTick = 0; $('info').textContent = `x ${Math.floor(P.pos.x)} · y ${Math.floor(P.pos.y)} · z ${Math.floor(P.pos.z)} · ${modo === 'cri' ? 'criativo' : 'sobrevivência'}`; furnaceBars(); renderStats();
      if (debugOn) { const ti = terrainInfo(Math.floor(P.pos.x), Math.floor(P.pos.z)); const ang = ((P.yaw % (2 * PI)) + 2 * PI) % (2 * PI); const hora = Math.floor(((dayT * 24) + 0) % 24);
        $('debug').textContent = `Vila dos Gatinhos v3  ${fps.toFixed(0)} qps\nXYZ: ${P.pos.x.toFixed(2)} / ${P.pos.y.toFixed(2)} / ${P.pos.z.toFixed(2)}\nPedaço: ${Math.floor(P.pos.x / CS)}, ${Math.floor(P.pos.z / CS)}  (${chunks.size} carregados)\nOlhando para: ${DIRS[Math.round(ang / (PI / 4)) % 8]}\nBioma: ${ti.biome}\nBloco mirado: ${hit ? BD[hit.b].name + ` (${hit.x}, ${hit.y}, ${hit.z})` : '—'}\nCriaturas: ${mobs.length}  Itens no chão: ${drops.length}\nHora: ${String(hora).padStart(2, '0')}h  Luz do dia: ${(diaK * 100).toFixed(0)}%\nMundo: ${mundoAtual.nome}  Semente: ${mundoAtual.seed}`; } }
  } else if (!jogando && carregado) { updateCamera(dt); if (eu) { eu.gato.atualizar(dt); updateNPC(dt); updateAldeoes(dt); } atualizarMobs(dt, clockT); updateChunks(0, 0, 1, 1); for (const c of rebuildNow) buildChunkMesh(c); rebuildNow.clear(); }
  updateDay(jogando && !pausado ? dt : dt * .3);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

initMobs({ scene, P, som, particulas, soltarItem, ferirJogador, flecha, linhaDeVisao, dia: () => diaK, invisivel: () => buff.invis > 0, vivo: () => vivo, segurando: () => (held() ? held().id : 0), alvo: () => holo ? { pos: holo.pos } : P, get modo() { return jogando ? modo : 'cri'; } });

// ================== CARREGAR MUNDO ==================
async function carregarMundo(meta) {
  carregado = false; limparEntidades();
  setSeed(meta.seed); setVila(meta.vila); carregarEstado(meta); resetMundo(store);
  mundoAtual = meta;
  const tick = () => new Promise((r) => setTimeout(r, 0)); const bar = document.querySelector('#carga i');
  const V = []; for (let cz = -4; cz <= 3; cz++) for (let cx = -4; cx <= 3; cx++) V.push([cx, cz]);
  if (meta.vila) { for (let i = 0; i < V.length; i++) { ensureChunk(V[i][0], V[i][1]); if (i % 8 === 0) { bar.style.width = (20 + i / V.length * 30) + '%'; await tick(); } } buildVillage(); }
  else semVila();
  if (meta.vila) for (const [x, y, z, s] of VILLAGE_CHESTS) { const k = posKey(x, y, z); if (!chests.has(k) && !store.get('chestInit' + k, false)) { const arr = Array(27).fill(null);
    const loot = s === 99 ? [[B.LOG, 8], [IT.GRAVETO, 6], [B.LAMP, 6], [IT.PIC_M, 1], [IT.PAO, 4]] : s === 98 ? [[IT.ESP_P, 1], [IT.ARCO, 1], [IT.FLECHA, 24], [IT.CARNE_A, 4], [IT.CAP_C, 1], [IT.ESSENCIA, 2]] : [[IT.TRIGO, 3 + s % 4], [B.PLANKS, 4 + s % 5], [IT.CARVAO, 1 + s % 3], [IT.MACA, 2], [IT.FERRO, s % 3]];
    loot.forEach(([id, n], j) => { if (n > 0) arr[(j * 5 + s) % 27] = mkS(id, n); }); chests.set(k, arr); store.set('chestInit' + k, true); } }
  if (!store.get('player', null) && !meta.vila) { const g = surfaceY(3, 6) + 1; P.pos.set(3.5, g + 1, 6.5); st.spawn = [3.5, g + 1, 6.5]; }
  npc.pos.set(P.pos.x - 1, P.pos.y, P.pos.z - 3); npc.ty = P.pos.y; if (meta.vila) { npc.pos.set(2.5, VH + 1, -2.5); npc.ty = VH + 1; } npcPick();
  ensureChunk(Math.floor(P.pos.x / CS), Math.floor(P.pos.z / CS));
  let done = 0; const total = offsCount() * 2;
  while (true) { const w = updateChunks(P.pos.x, P.pos.z, 4, 3); done += w; bar.style.width = (50 + Math.min(50, done / total * 50)) + '%'; if (!w) break; if (done % 6 === 0) await tick(); }
  if (collideAt()) { const g = groundAt(P.pos.x, P.pos.z, H - 3); if (g) P.pos.y = g; }
  if (!meta.vila) { const g = surfaceY(npc.pos.x, npc.pos.z); npc.pos.y = npc.ty = g + 1; }
  spawnAldeoes();
  setModo(modo); renderHot(); statsKey = ''; renderStats();
  carregado = true;
}
async function entrarMundo(meta) {
  meta.ultimo = Date.now(); GS.set('mundos', mundos); GS.set('ultimoMundo', meta.id);
  pilha.forEach((id) => $(id).hidden = true); pilha.length = 0;
  if (meta !== mundoAtual || !carregado) { $('tTitulo').hidden = false; $('menuTitulo').hidden = true; $('cargaBox').hidden = false; $('cargaTx').textContent = 'Gerando o mundo…'; await carregarMundo(meta); }
  $('tTitulo').hidden = true; $('hud').hidden = false; jogando = true; pausado = false; document.body.classList.add('jogando');
  $('nome').hidden = !OPC.coord; $('pSegue').classList.toggle('on', segue);
  iniciarSom(); lockReq(); vivo = st.vida > 0; if (!vivo) renascer();
}
async function boot() {
  const bar = document.querySelector('#carga i');
  const loader = new GLTFLoader(); let feitos = 0;
  const carregar = async (mod) => { const m = await import(mod); const bin = Uint8Array.from(atob(m.default), (c) => c.charCodeAt(0)); const g = await loader.parseAsync(bin.buffer, './'); feitos++; bar.style.width = (feitos * 10) + '%'; return g; };
  const [g1, g2] = await Promise.all([carregar('./gato_ele.js'), carregar('./gato_ela.js')]); gltfs = { ele: g1, ela: g2 };
  trocarModelos(); renderHot();
  const ult = GS.get('ultimoMundo', null); mundoAtual = mundos.find((m) => m.id === ult) || mundos.sort((a, b) => b.ultimo - a.ultimo)[0];
  $('cargaTx').textContent = 'Gerando o mundo…';
  await carregarMundo(mundoAtual);
  $('cargaBox').hidden = true; $('menuTitulo').hidden = false;
  $('tContinuar').textContent = 'Continuar: ' + mundoAtual.nome;
}
requestAnimationFrame(frame);
boot().catch((e) => { $('cargaTx').textContent = 'Erro ao carregar: ' + e.message; console.error(e); });
window.vila = { P, get st() { return st; }, get inv() { return inv; }, get armor() { return armor; }, giveStack, mkS, getBlock, setBlock, abrirJanela, fecharJanela, slotClick, matchRecipe, RECIPES, npc, VH, B, IT, ITEMS, mobs, criarMob, buff, explodir, setModo, usar, mining, selecionar, renderHot, soltarItem, drops, entrarMundo, get mundos() { return mundos; }, get janela() { return janela; }, get hit() { return hit; }, set dayT(v) { dayT = v; }, get eu() { return eu; }, pausar, despausar, abrirTela, trocarCamera, setEscala, get camModo() { return camModo; } };
