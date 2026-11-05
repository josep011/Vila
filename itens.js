// Itens e receitas.
import { B, BD, NB } from './blocos.js';

export const IT = {
  GRAVETO: 100, CARVAO: 101, TRIGO: 102, FERRO: 103, OURO: 104, DIAMANTE: 105, FIO: 106, PENA: 107, COURO: 108, POLVORA: 109,
  PIC_M: 110, PIC_P: 111, MAC_M: 112, MAC_P: 113, PA_M: 114, PA_P: 115, PIC_F: 116, MAC_F: 117, PA_F: 118, PIC_D: 119, MAC_D: 120, PA_D: 121,
  ESP_M: 130, ESP_P: 131, ESP_F: 132, ESP_D: 133, KATANA: 134, LANCA: 135, MACHADAO: 136, ARCO: 137, BESTA: 138, FLECHA: 139,
  PISTOLA: 140, RIFLE: 141, ESCOPETA: 142, MUNICAO: 143, GRANADA: 144, ISQUEIRO: 145,
  CAP_C: 150, PEI_C: 151, CAL_C: 152, BOT_C: 153, CAP_F: 154, PEI_F: 155, CAL_F: 156, BOT_F: 157, CAP_D: 158, PEI_D: 159, CAL_D: 160, BOT_D: 161,
  CARNE: 170, CARNE_A: 171, FRANGO: 172, FRANGO_A: 173, PAO: 174, MACA: 175,
  ESSENCIA: 180, GOSMA: 181,
  O_FOGO: 190, O_RAIO: 191, O_GELO: 192, O_SALTO: 193, O_VELOC: 194, O_ASAS: 195, O_ONDA: 196, O_TELEP: 197, O_CURA: 198, O_ESCAV: 199, O_LASER: 200, O_ESCUDO: 201, O_INVIS: 202,
  SABRE: 210, MARTELO: 211, ESCUDO_B: 212, TEIAS: 213, GANCHO: 214, JETPACK: 215, GARRAS: 216, VARINHA: 217, P_ENCOLHER: 218, P_CRESCER: 219,
  O_TEMPO: 220, O_CLONE: 221, O_FORCA: 222, O_NOITE: 223, BOTAS_P: 224, O_AGUA: 225, O_RAJADA: 226,
  O_SING: 230, O_REPUL: 231, O_ANIQ: 232, O_BARR: 233, O_CUPULA: 234, O_METEORO: 235, O_TORNADO: 236, O_TERREMOTO: 237, O_DRAGAO: 238, O_CORRENTE: 239, O_GRAV: 240,
  MOEDA: 245,
};
export const ITEMS = {};
for (let i = 1; i < NB; i++) if (i !== B.BEDROCK && i !== B.AIR) ITEMS[i] = { id: i, name: BD[i].name, stack: 64, block: true };
const add = (id, name, o = {}) => { ITEMS[id] = { id, name, stack: (o.tool || o.arma || o.armor != null || o.poder || o.isqueiro) ? 1 : (o.stack || 64), ...o }; };
add(IT.GRAVETO, 'Graveto'); add(IT.CARVAO, 'Carvão'); add(IT.TRIGO, 'Trigo'); add(IT.FERRO, 'Barra de ferro'); add(IT.OURO, 'Barra de ouro');
add(IT.DIAMANTE, 'Diamante'); add(IT.FIO, 'Fio'); add(IT.PENA, 'Pena'); add(IT.COURO, 'Couro'); add(IT.POLVORA, 'Pólvora');
const T = [['M', 'madeira', 1, 2.2, 60], ['P', 'pedra', 2, 4, 132], ['F', 'ferro', 3, 6, 250], ['D', 'diamante', 4, 8, 1560]];
for (const [k, nm, tier, speed, dur] of T) {
  add(IT['PIC_' + k], 'Picareta de ' + nm, { tool: 'pic', tier, speed, dur, dmg: 1 + tier, mat: k });
  add(IT['MAC_' + k], 'Machado de ' + nm, { tool: 'mac', tier, speed, dur, dmg: 2 + tier, mat: k });
  add(IT['PA_' + k], 'Pá de ' + nm, { tool: 'pa', tier, speed, dur, dmg: tier, mat: k });
  add(IT['ESP_' + k], 'Espada de ' + nm, { arma: 'melee', dmg: 3 + tier, cd: .5, alcance: 3.6, dur, mat: k });
}
add(IT.KATANA, 'Katana', { arma: 'melee', dmg: 7, cd: .35, alcance: 3.8, dur: 400 });
add(IT.LANCA, 'Lança', { arma: 'melee', dmg: 6, cd: .7, alcance: 5.2, dur: 300 });
add(IT.MACHADAO, 'Machado de guerra', { arma: 'melee', dmg: 10, cd: 1.1, alcance: 3.6, dur: 350, tool: 'mac', tier: 3, speed: 6 });
add(IT.ARCO, 'Arco', { arma: 'arco', ammo: IT.FLECHA, dmg: 6, cd: .6, vel: 34, dur: 384 });
add(IT.BESTA, 'Besta', { arma: 'arco', ammo: IT.FLECHA, dmg: 9, cd: 1.1, vel: 50, dur: 465 });
add(IT.FLECHA, 'Flecha');
add(IT.PISTOLA, 'Pistola', { arma: 'arma', ammo: IT.MUNICAO, dmg: 6, cd: .28, spread: .01, pellets: 1, dur: 600 });
add(IT.RIFLE, 'Rifle', { arma: 'arma', ammo: IT.MUNICAO, dmg: 5, cd: .1, spread: .02, pellets: 1, auto: true, dur: 900 });
add(IT.ESCOPETA, 'Escopeta', { arma: 'arma', ammo: IT.MUNICAO, dmg: 3, cd: .9, spread: .09, pellets: 7, dur: 500 });
add(IT.MUNICAO, 'Munição');
add(IT.GRANADA, 'Granada', { arremesso: true, stack: 16 });
add(IT.ISQUEIRO, 'Isqueiro', { isqueiro: true, dur: 64 });
const AR = [['C', 'couro', [1, 3, 2, 1], 80], ['F', 'ferro', [2, 6, 5, 2], 240], ['D', 'diamante', [3, 8, 6, 3], 500]];
for (const [k, nm, df, dur] of AR) {
  add(IT['CAP_' + k], 'Capacete de ' + nm, { armor: 0, def: df[0], dur, mat: k }); add(IT['PEI_' + k], 'Peitoral de ' + nm, { armor: 1, def: df[1], dur, mat: k });
  add(IT['CAL_' + k], 'Calças de ' + nm, { armor: 2, def: df[2], dur, mat: k }); add(IT['BOT_' + k], 'Botas de ' + nm, { armor: 3, def: df[3], dur, mat: k });
}
add(IT.CARNE, 'Carne crua', { food: 3 }); add(IT.CARNE_A, 'Carne assada', { food: 8 }); add(IT.FRANGO, 'Frango cru', { food: 2 }); add(IT.FRANGO_A, 'Frango assado', { food: 6 });
add(IT.PAO, 'Pão', { food: 5 }); add(IT.MACA, 'Maçã', { food: 4 });
add(IT.ESSENCIA, 'Essência sombria'); add(IT.GOSMA, 'Gosma');
const PODERES = [
  [IT.O_FOGO, 'Orbe de fogo', 'fogo', 18, .45, 'Lança uma bola de fogo que explode'],
  [IT.O_RAIO, 'Orbe do trovão', 'raio', 30, 1.2, 'Chama um raio onde você mira'],
  [IT.O_GELO, 'Orbe de gelo', 'gelo', 15, .4, 'Congela criaturas e transforma água em gelo'],
  [IT.O_SALTO, 'Orbe do supersalto', 'salto', 12, .6, 'Pulo gigante sem dano de queda'],
  [IT.O_VELOC, 'Orbe da velocidade', 'veloc', 25, 1, 'Corre muito rápido por 8 segundos'],
  [IT.O_ASAS, 'Asas mágicas', 'asas', 0, .3, 'Voa gastando mana (liga e desliga)'],
  [IT.O_ONDA, 'Orbe da onda de choque', 'onda', 30, 1.2, 'Empurra e machuca tudo em volta'],
  [IT.O_TELEP, 'Orbe do teleporte', 'telep', 20, .6, 'Teleporta até onde você mira'],
  [IT.O_CURA, 'Orbe da cura', 'cura', 35, 2, 'Recupera vida'],
  [IT.O_ESCAV, 'Orbe da escavação', 'escav', 25, .8, 'Abre um túnel 3×3 na frente'],
  [IT.O_LASER, 'Orbe do raio laser', 'laser', 4, .07, 'Raio laser contínuo (segure)'],
  [IT.O_ESCUDO, 'Orbe do escudo', 'escudo', 40, 3, 'Bolha que bloqueia dano por 10 s'],
  [IT.O_INVIS, 'Orbe da invisibilidade', 'invis', 40, 3, 'Monstros não te veem por 15 s'],
  [IT.VARINHA, 'Varinha mágica', 'varinha', 6, .25, 'Dispara faíscas que perseguem o alvo'],
  [IT.JETPACK, 'Jetpack', 'jet', 1, .05, 'Segure para voar com propulsão'],
  [IT.O_TEMPO, 'Relógio do tempo', 'tempo', 45, 4, 'Deixa o mundo em câmera lenta por 10 s'],
  [IT.O_CLONE, 'Orbe do holograma', 'clone', 35, 4, 'Cria um gatinho holograma que distrai os monstros'],
  [IT.O_FORCA, 'Luvas de super força', 'forca', 40, 4, 'Por 20 s, seus socos quebram qualquer bloco na hora'],
  [IT.O_NOITE, 'Óculos de visão noturna', 'noite', 0, .3, 'Enxerga no escuro (liga e desliga)'],
  [IT.O_AGUA, 'Orbe das guelras', 'agua', 30, 3, 'Respira e nada rápido debaixo d\'água por 60 s'],
  [IT.O_RAJADA, 'Rajada de energia', 'rajada', 50, 1.5, 'Segure para carregar e solte uma rajada gigante'],
  [IT.TEIAS, 'Lança-teias', 'teia', 8, .35, 'Prende criaturas e gruda teias nas paredes'],
  [IT.GANCHO, 'Gancho', 'gancho', 4, .5, 'Puxa você até onde o gancho prender'],
  [IT.O_SING, 'Singularidade', 'sing', 60, 6, 'Cria um ponto de gravidade que suga tudo em volta e implode'],
  [IT.O_REPUL, 'Explosão repulsora', 'repul', 55, 4, 'Uma onda dourada que arremessa e destrói tudo à frente'],
  [IT.O_ANIQ, 'Esfera da aniquilação', 'aniq', 95, 10, 'Une atração e repulsão: uma esfera que apaga tudo no caminho'],
  [IT.O_BARR, 'Barreira absoluta', 'barr', 0, .3, 'Nada te toca enquanto estiver ligada (gasta mana)'],
  [IT.O_CUPULA, 'Cúpula estelar', 'cupula', 80, 15, 'Cria uma cúpula de estrelas: monstros dentro ficam paralisados e sofrem dano'],
  [IT.O_METEORO, 'Chuva de meteoros', 'meteoro', 70, 8, 'Faz meteoros caírem onde você mira'],
  [IT.O_TORNADO, 'Tornado', 'tornado', 45, 6, 'Solta um tornado que levanta e machuca monstros'],
  [IT.O_TERREMOTO, 'Terremoto', 'terremoto', 50, 5, 'Faz o chão tremer e derruba tudo em volta'],
  [IT.O_DRAGAO, 'Sopro de dragão', 'dragao', 2, .08, 'Segure para soltar fogo pela boca'],
  [IT.O_CORRENTE, 'Raio em cadeia', 'corrente', 35, 1.5, 'Um raio que pula de monstro em monstro'],
  [IT.O_GRAV, 'Gravidade zero', 'grav', 40, 4, 'Faz os monstros em volta flutuarem e caírem'],
];
for (const [id, nm, p, mana, cd, desc] of PODERES) add(id, nm, { poder: p, mana, cd, desc });
add(IT.SABRE, 'Sabre de energia', { arma: 'melee', dmg: 9, cd: .3, alcance: 4, dur: 2000, desc: 'Lâmina de luz que corta tudo' });
add(IT.MARTELO, 'Martelo do trovão', { arma: 'melee', dmg: 10, cd: .9, alcance: 3.8, dur: 2000, desc: 'Botão de usar: chama um raio onde você mira', raioUsar: true });
add(IT.ESCUDO_B, 'Escudo bumerangue', { arma: 'escudo', dmg: 7, cd: .8, dur: 1500, desc: 'Arremesse e ele volta para você' });
add(IT.GARRAS, 'Garras de metal', { arma: 'melee', dmg: 6, cd: .22, alcance: 3.2, dur: 1500, desc: 'Ataques muito rápidos' });
add(IT.P_ENCOLHER, 'Poção de encolher', { pocao: 'encolher', stack: 8, desc: 'Fica minúsculo por 30 s' });
add(IT.P_CRESCER, 'Poção de gigante', { pocao: 'crescer', stack: 8, desc: 'Fica gigante por 30 s' });
add(IT.MOEDA, 'Moeda de peixe', { desc: 'Dinheiro dos aldeões gatinhos' });
add(IT.BOTAS_P, 'Botas de mola', { armor: 3, def: 2, dur: 400, desc: 'Pulo duplo e sem dano de queda', mola: true });
export const FUEL = { [B.PLANKS]: 15, [B.LOG]: 15, [IT.GRAVETO]: 5, [IT.CARVAO]: 80, [B.TABLE]: 15, [B.CHEST]: 15, [IT.PIC_M]: 10, [IT.MAC_M]: 10, [IT.PA_M]: 10, [IT.ESP_M]: 10, [B.HAY]: 20 };
export const SMELT = { [B.SAND]: B.GLASS, [B.COBBLE]: B.STONE, [B.LOG]: IT.CARVAO, [B.DIRT]: B.BRICK, [B.IRON_ORE]: IT.FERRO, [B.GOLD_ORE]: IT.OURO, [IT.CARNE]: IT.CARNE_A, [IT.FRANGO]: IT.FRANGO_A, [B.SNOW]: B.ICE };
export const SMELT_T = 7;

// ---------- receitas ----------
const S = IT.GRAVETO;
export const RECIPES = [
  { shapeless: [B.LOG], out: [B.PLANKS, 4] },
  { p: ['X', 'X'], k: { X: B.PLANKS }, out: [S, 4] },
  { p: ['XX', 'XX'], k: { X: B.PLANKS }, out: [B.TABLE, 1] },
  { p: ['XXX', 'X.X', 'XXX'], k: { X: B.COBBLE }, out: [B.FURNACE, 1] },
  { p: ['XXX', 'X.X', 'XXX'], k: { X: B.PLANKS }, out: [B.CHEST, 1] },
  { p: ['C', 'S'], k: { C: IT.CARVAO, S }, out: [B.LAMP, 4] },
  { p: ['XXX'], k: { X: B.BRICK }, out: [B.ROOF, 6] },
  { p: ['TTT', 'TTT', 'TTT'], k: { T: IT.TRIGO }, out: [B.HAY, 1] },
  { shapeless: [B.HAY], out: [IT.TRIGO, 9] },
  { p: ['TTT'], k: { T: IT.TRIGO }, out: [IT.PAO, 1] },
  { shapeless: [B.SAND, B.COBBLE], out: [B.PLASTER, 2] },
  { shapeless: [B.DIRT, B.SAND], out: [B.PATH, 2] },
  { p: ['XX', 'XX'], k: { X: IT.FIO }, out: [B.WOOL, 1] },
  { p: ['LLL', 'PPP'], k: { L: B.WOOL, P: B.PLANKS }, out: [B.BED, 1] },
  { shapeless: [IT.CARVAO, B.SAND], out: [IT.POLVORA, 2] },
  { p: ['PSP', 'SPS', 'PSP'], k: { P: IT.POLVORA, S: B.SAND }, out: [B.TNT, 1] },
  { shapeless: [IT.FERRO, B.COBBLE], out: [IT.ISQUEIRO, 1] },
  { p: ['XX', 'XX'], k: { X: B.SNOW }, out: [B.ICE, 1] },
];
for (const [k, X] of [['M', B.PLANKS], ['P', B.COBBLE], ['F', IT.FERRO], ['D', IT.DIAMANTE]]) {
  RECIPES.push({ p: ['XXX', '.S.', '.S.'], k: { X, S }, out: [IT['PIC_' + k], 1] });
  RECIPES.push({ p: ['XX', 'XS', '.S'], k: { X, S }, out: [IT['MAC_' + k], 1] });
  RECIPES.push({ p: ['X', 'S', 'S'], k: { X, S }, out: [IT['PA_' + k], 1] });
  RECIPES.push({ p: ['X', 'X', 'S'], k: { X, S }, out: [IT['ESP_' + k], 1] });
}
for (const [k, X] of [['C', IT.COURO], ['F', IT.FERRO], ['D', IT.DIAMANTE]]) {
  RECIPES.push({ p: ['XXX', 'X.X'], k: { X }, out: [IT['CAP_' + k], 1] });
  RECIPES.push({ p: ['X.X', 'XXX', 'XXX'], k: { X }, out: [IT['PEI_' + k], 1] });
  RECIPES.push({ p: ['XXX', 'X.X', 'X.X'], k: { X }, out: [IT['CAL_' + k], 1] });
  RECIPES.push({ p: ['X.X', 'X.X'], k: { X }, out: [IT['BOT_' + k], 1] });
}
const F = IT.FERRO, P = IT.POLVORA, E = IT.ESSENCIA, D = IT.DIAMANTE, O = IT.OURO, G = IT.GOSMA, I = IT.FIO, V = B.GLASS, C = IT.COURO;
RECIPES.push(
  { p: ['..X', '.X.', 'S..'], k: { X: F, S }, out: [IT.KATANA, 1] },
  { p: ['..X', '.S.', 'S..'], k: { X: F, S }, out: [IT.LANCA, 1] },
  { p: ['XXX', 'XSX', '.S.'], k: { X: F, S }, out: [IT.MACHADAO, 1] },
  { p: ['.SF', 'S.F', '.SF'], k: { S, F: I }, out: [IT.ARCO, 1] },
  { p: ['SXS', 'F.F', '.S.'], k: { S, X: F, F: I }, out: [IT.BESTA, 1] },
  { p: ['X', 'S', 'P'], k: { X: B.COBBLE, S, P: IT.PENA }, out: [IT.FLECHA, 4] },
  { p: ['XX', '.S'], k: { X: F, S }, out: [IT.PISTOLA, 1] },
  { p: ['XXX', '.XS'], k: { X: F, S }, out: [IT.RIFLE, 1] },
  { p: ['XXX', '.SS'], k: { X: F, S }, out: [IT.ESCOPETA, 1] },
  { p: ['X', 'P'], k: { X: F, P }, out: [IT.MUNICAO, 16] },
  { p: ['.X.', 'XPX', '.X.'], k: { X: F, P }, out: [IT.GRANADA, 2] },
  // cultura pop (versões originais)
  { p: ['D', 'E', 'F'], k: { D, E, F }, out: [IT.SABRE, 1] },
  { p: ['FFF', 'FEF', '.S.'], k: { F, E, S }, out: [IT.MARTELO, 1] },
  { p: ['FOF', 'FDF', '.F.'], k: { F, O, D }, out: [IT.ESCUDO_B, 1] },
  { p: ['FIF', 'FEF'], k: { F, I, E }, out: [IT.TEIAS, 1] },
  { p: ['..F', '.I.', 'I..'], k: { F, I }, out: [IT.GANCHO, 1] },
  { p: ['F.F', 'FEF', 'PPP'], k: { F, E, P }, out: [IT.JETPACK, 1] },
  { p: ['FFF', 'CCC'], k: { F, C }, out: [IT.GARRAS, 1] },
  { p: ['..E', '.S.', 'S..'], k: { E, S }, out: [IT.VARINHA, 1] },
  { shapeless: [G, E, B.FLOWER_Y], out: [IT.P_ENCOLHER, 1] },
  { shapeless: [G, E, IT.MACA], out: [IT.P_CRESCER, 1] },
  { p: ['OOO', 'OEO', 'OOO'], k: { O, E }, out: [IT.O_TEMPO, 1] },
  { p: ['VVV', 'VEV', 'VVV'], k: { V, E }, out: [IT.O_CLONE, 1] },
  { p: ['C.C', 'FEF'], k: { C, F, E }, out: [IT.O_FORCA, 1] },
  { p: ['V.V', 'FEF'], k: { V, F, E }, out: [IT.O_NOITE, 1] },
  { p: ['F.F', 'G.G'], k: { F, G }, out: [IT.BOTAS_P, 1] },
  { p: ['DED', 'EDE', 'DED'], k: { D, E }, out: [IT.O_RAJADA, 1] },
);
const anel = (c, out) => RECIPES.push({ p: ['CCC', 'CEC', 'CCC'], k: { C: c, E }, out: [out, 1] });
RECIPES.push({ p: ['EEE', 'EDE', 'EEE'], k: { E, D }, out: [IT.O_SING, 1] });
RECIPES.push({ p: ['OEO', 'EDE', 'OEO'], k: { O, E, D }, out: [IT.O_REPUL, 1] });
RECIPES.push({ p: ['S', 'D', 'R'], k: { S: IT.O_SING, D, R: IT.O_REPUL }, out: [IT.O_ANIQ, 1] });
RECIPES.push({ p: ['DDD', 'DED', 'DDD'], k: { D, E }, out: [IT.O_BARR, 1] });
RECIPES.push({ p: ['EVE', 'VDV', 'EVE'], k: { E, V, D }, out: [IT.O_CUPULA, 1] });
anel(P, IT.O_METEORO); anel(IT.PENA, IT.O_TORNADO); anel(B.STONE, IT.O_TERREMOTO); anel(IT.CARVAO, IT.O_DRAGAO); anel(F, IT.O_CORRENTE); anel(G, IT.O_GRAV);
const orbe = (c, out) => RECIPES.push({ p: ['.C.', 'CEC', '.C.'], k: { C: c, E }, out: [out, 1] });
orbe(IT.CARVAO, IT.O_FOGO); orbe(O, IT.O_RAIO); orbe(B.SNOW, IT.O_GELO); orbe(IT.PENA, IT.O_SALTO); orbe(I, IT.O_VELOC);
orbe(F, IT.O_ONDA); orbe(G, IT.O_TELEP); orbe(IT.MACA, IT.O_CURA); orbe(P, IT.O_ESCAV); orbe(D, IT.O_LASER); orbe(V, IT.O_INVIS); orbe(B.ICE, IT.O_AGUA);
RECIPES.push({ p: ['PEP', 'PDP', 'P.P'], k: { P: IT.PENA, E, D }, out: [IT.O_ASAS, 1] });
RECIPES.push({ p: ['FOF', 'OEO', 'FOF'], k: { F, O, E }, out: [IT.O_ESCUDO, 1] });
for (const r of RECIPES) { if (r.p) { r.w = Math.max(...r.p.map((s) => s.length)); r.h = r.p.length; r.p = r.p.map((s) => s.padEnd(r.w, '.')); } }
export function matchRecipe(grid, size) {
  let x0 = size, y0 = size, x1 = -1, y1 = -1; const ids = [], stacks = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const s = grid[y * size + x]; if (s) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); ids.push(s.id); stacks.push(s); } }
  if (x1 < 0) return null;
  // conserto: duas ferramentas iguais gastas viram uma mais inteira
  if (stacks.length === 2 && ids[0] === ids[1] && ITEMS[ids[0]] && ITEMS[ids[0]].dur) { const it = ITEMS[ids[0]]; const d = Math.min(it.dur, stacks[0].d + stacks[1].d + Math.floor(it.dur * .05)); return { conserto: true, out: [ids[0], 1], d }; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  for (const r of RECIPES) {
    if (r.shapeless) { if (ids.length !== r.shapeless.length) continue; const a = [...ids].sort(), b = [...r.shapeless].sort(); if (a.every((v, i) => v === b[i])) return r; continue; }
    if (r.w !== w || r.h !== h) continue;
    for (const mir of [false, true]) {
      let ok = true;
      for (let y = 0; y < h && ok; y++) for (let x = 0; x < w && ok; x++) {
        const ch = r.p[y][mir ? w - 1 - x : x]; const s = grid[(y0 + y) * size + x0 + x];
        if (ch === '.') { if (s) ok = false; } else if (!s || s.id !== r.k[ch]) ok = false;
      }
      if (ok) return r;
    }
  }
  return null;
}
