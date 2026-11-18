// 島民角色：外觀設定 → 一個合併後的 3D 模型（單一 draw call，適合同時顯示兩百多位）
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

import { OPTIONS, DEFAULT_AVATAR, sanitize, randomAvatar, seeded } from './avatar-data.js';

export { OPTIONS, DEFAULT_AVATAR, sanitize, randomAvatar, seeded };

// ---------- 建模 ----------
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
function part(list, geo, color, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  tmpM.compose(new THREE.Vector3(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(tmpM);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  list.push(g);
}
const Box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const Cyl = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const Sph = (r, ws = 10, hs = 7, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) => new THREE.SphereGeometry(r, ws, hs, ps, pl, ts, tl);

// 身高約 1（之後在島上縮小）
const shade = (c, k) => new THREE.Color(c).lerp(new THREE.Color(k > 0 ? '#ffffff' : '#000000'), Math.abs(k));
const BAPTISM = { bapGreen: '#2f8f5b', bapNavy: '#27365e' };   // 浸衣的兩種顏色（照片裏的綠色、深藍色）
const TORSO_Y0 = 0.37, TORSO_Y1 = 0.67;

function buildParts(a) {
  const P = [];
  const skin = a.skin;
  const girl = a.gender === 'f';
  const bap = BAPTISM[a.top];
  const sleeveLong = !['tee', 'polo'].includes(a.top);
  const bc = a.bottomColor;

  // ---- 鞋子 ----
  const sc = a.shoes;
  [-0.07, 0.07].forEach((x) => {
    if (a.shoe === 'leather') {
      part(P, Box(0.09, 0.05, 0.17), sc, [x, 0.03, 0.02]); part(P, Sph(0.045, 8, 6), sc, [x, 0.035, 0.09], [0, 0, 0], [1, 0.6, 1]);
      part(P, Box(0.092, 0.015, 0.172), shade(sc, -0.35), [x, 0.006, 0.02]);
    } else if (a.shoe === 'boots') {
      part(P, Box(0.1, 0.06, 0.17), sc, [x, 0.03, 0.02]); part(P, Cyl(0.056, 0.056, 0.14, 10), sc, [x, 0.12, 0]);
      part(P, Box(0.104, 0.016, 0.174), shade(sc, -0.4), [x, 0.008, 0.02]);
    } else if (a.shoe === 'flats') {
      part(P, Box(0.085, 0.035, 0.15), sc, [x, 0.02, 0.02]); part(P, Sph(0.015, 6, 4), shade(sc, 0.5), [x, 0.04, 0.08]);
    } else {
      part(P, Box(0.1, 0.06, 0.16), sc, [x, 0.035, 0.02]);
      part(P, Box(0.106, 0.022, 0.166), '#fffaf0', [x, 0.011, 0.02]);              // 白色鞋底
      if (a.shoe === 'canvas') part(P, Box(0.104, 0.045, 0.04), '#fffaf0', [x, 0.03, 0.085]);  // 帆布鞋的白鞋頭
      else part(P, Box(0.06, 0.012, 0.06), shade(sc, 0.45), [x, 0.068, 0.045]);   // 球鞋鞋帶
    }
  });

  // ---- 腿／下身 ----
  const legs = (c) => [-0.07, 0.07].forEach((x) => part(P, Cyl(0.055, 0.05, 0.32), c, [x, 0.22, 0]));
  if (a.bottom === 'pants' || a.bottom === 'jeans' || a.bottom === 'slacks') {
    legs(bc);
    if (a.bottom === 'jeans') [-0.07, 0.07].forEach((x) => { part(P, Box(0.006, 0.3, 0.006), shade(bc, 0.35), [x + Math.sign(x) * 0.052, 0.22, 0]); part(P, Box(0.05, 0.04, 0.008), shade(bc, -0.15), [x, 0.33, -0.052]); });
    if (a.bottom === 'slacks') [-0.07, 0.07].forEach((x) => part(P, Box(0.006, 0.3, 0.006), shade(bc, 0.25), [x, 0.22, 0.053]));
    if (a.bottom !== 'pants') part(P, Cyl(0.153, 0.153, 0.03, 12), a.bottom === 'slacks' ? '#2b211c' : '#5a3a28', [0, 0.385, 0]);   // 皮帶
  } else if (a.bottom === 'shorts') {
    [-0.07, 0.07].forEach((x) => { part(P, Cyl(0.042, 0.042, 0.16), skin, [x, 0.13, 0]); part(P, Cyl(0.064, 0.06, 0.2), bc, [x, 0.29, 0]); });
  } else if (a.bottom === 'longskirt') {
    [-0.06, 0.06].forEach((x) => part(P, Cyl(0.035, 0.035, 0.06), skin, [x, 0.07, 0]));
    part(P, Cyl(0.13, 0.23, 0.36, 14), bc, [0, 0.24, 0]);
  } else if (a.bottom === 'pleated') {
    [-0.07, 0.07].forEach((x) => part(P, Cyl(0.042, 0.042, 0.16), skin, [x, 0.12, 0]));
    part(P, Cyl(0.13, 0.22, 0.24, 16), bc, [0, 0.28, 0]);
    // 褶線貼著裙面斜放（裙子是上窄下寬的圓錐）
    for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2; part(P, Box(0.01, 0.245, 0.01), shade(bc, -0.22), [Math.cos(t) * 0.177, 0.28, -Math.sin(t) * 0.177], [0, t, Math.atan(0.09 / 0.24)]); }
    part(P, Cyl(0.222, 0.222, 0.02, 16), shade(bc, 0.3), [0, 0.175, 0]);   // 裙襬一條淺色滾邊
  } else {
    [-0.07, 0.07].forEach((x) => part(P, Cyl(0.042, 0.042, 0.22), skin, [x, 0.17, 0]));
    part(P, Cyl(0.13, 0.21, 0.2, 14), bc, [0, 0.3, 0]);
  }

  // ---- 上身 ----
  const shoulder = girl ? 0.125 : 0.14;
  const topC = a.top === 'shirt' ? '#fffaf0' : bap || a.topColor;
  part(P, Cyl(shoulder, 0.15, TORSO_Y1 - TORSO_Y0, 12), topC, [0, (TORSO_Y0 + TORSO_Y1) / 2, 0]);
  const front = shoulder + 0.008;   // 胸前表面大約的 z
  const collar = (c) => [-1, 1].forEach((sd) => part(P, Box(0.075, 0.035, 0.02), c, [sd * 0.04, 0.655, front - 0.02], [0.35, 0, sd * 0.55]));
  if (a.top === 'shirt') { collar('#f1ece2'); part(P, Box(0.006, 0.26, 0.006), '#e3dccf', [0, 0.52, front]); [0.6, 0.52, 0.44].forEach((y) => part(P, Sph(0.008, 5, 4), '#d8cbb8', [0.012, y, front])); }
  if (a.top === 'polo') { collar(shade(topC, 0.25)); part(P, Box(0.03, 0.08, 0.006), shade(topC, 0.25), [0, 0.61, front]); [0.62, 0.59].forEach((y) => part(P, Sph(0.008, 5, 4), '#fffaf0', [0, y, front + 0.004])); }
  if (a.top === 'suit') {
    part(P, Box(0.075, 0.17, 0.02), '#fffaf0', [0, 0.585, front - 0.008], [-0.05, 0, 0]);              // 襯衫 V 領
    [-1, 1].forEach((sd) => part(P, Box(0.03, 0.17, 0.02), shade(topC, -0.15), [sd * 0.05, 0.585, front - 0.002], [0, 0, sd * 0.3]));  // 翻領
    [0.48, 0.42].forEach((y) => part(P, Sph(0.011, 6, 4), shade(topC, -0.35), [0, y, front + 0.004]));
    part(P, Box(0.035, 0.018, 0.008), '#fffaf0', [-0.075, 0.58, front - 0.006]);                       // 口袋巾
  }
  if (a.top === 'jacket') part(P, Box(0.07, 0.28, 0.02), '#fffaf0', [0, 0.52, front - 0.005]);
  if (a.top === 'cardigan') {
    part(P, Box(0.07, 0.29, 0.02), '#fffaf0', [0, 0.52, front - 0.006]);
    [0.6, 0.52, 0.44].forEach((y) => part(P, Sph(0.009, 5, 4), shade(topC, -0.3), [0.045, y, front + 0.002]));
  }
  if (a.top === 'sweater') {
    part(P, Cyl(0.155, 0.155, 0.035, 12), shade(topC, -0.15), [0, 0.385, 0]);                       // 下襬羅紋
    part(P, Cyl(0.148, 0.149, 0.035, 12), shade(topC, 0.35), [0, 0.55, 0]);                         // 胸前一條橫紋
    part(P, new THREE.TorusGeometry(0.05, 0.012, 5, 12), shade(topC, -0.15), [0, 0.67, 0], [Math.PI / 2, 0, 0]);
  }
  if (a.top === 'hoodie') { part(P, Sph(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), topC, [0, 0.66, -0.09], [-0.5, 0, 0], [1, 0.8, 0.7]); part(P, Box(0.14, 0.06, 0.02), topC, [0, 0.46, 0.15]); }
  if (bap) {
    // 圓領：藍色那件有白色滾邊，綠色那件同色
    part(P, new THREE.TorusGeometry(0.052, 0.01, 5, 14), a.top === 'bapNavy' ? '#fffaf0' : shade(bap, -0.2), [0, 0.67, 0.008], [Math.PI / 2 - 0.15, 0, 0]);
    if (a.top === 'bapNavy') [-1, 1].forEach((sd) => part(P, Box(0.006, 0.006, 0.1), '#fffaf0', [sd * 0.1, 0.66, 0.03], [0, sd * 0.9, sd * 0.35]));
  }
  // ---- 手臂 ----
  [-1, 1].forEach((sd) => {
    const x = sd * (shoulder + 0.045);
    if (sleeveLong) part(P, Cyl(0.042, 0.038, 0.28), topC, [x, 0.53, 0], [0, 0, sd * 0.12]);
    else { part(P, Cyl(0.048, 0.046, 0.1), topC, [x, 0.62, 0], [0, 0, sd * 0.12]); part(P, Cyl(0.036, 0.034, 0.2), skin, [x + sd * 0.012, 0.47, 0], [0, 0, sd * 0.12]); }
    if (a.top === 'suit') part(P, Cyl(0.04, 0.04, 0.02, 8), '#fffaf0', [x + sd * 0.016, 0.395, 0], [0, 0, sd * 0.12]);   // 襯衫袖口
    part(P, Sph(0.04, 8, 6), skin, [x + sd * 0.02, 0.37, 0]);
  });
  // ---- 脖子、頭 ----
  part(P, Cyl(0.04, 0.045, 0.06), skin, [0, 0.69, 0]);
  const hy = 0.86;
  part(P, Sph(0.17, 14, 10), skin, [0, hy, 0]);
  [-0.06, 0.06].forEach((x) => { part(P, Sph(0.022, 8, 6), '#2b211c', [x, hy + 0.01, 0.155]); part(P, Sph(0.007, 5, 4), '#ffffff', [x + 0.008, hy + 0.02, 0.174]); });
  part(P, Box(0.05, 0.012, 0.01), '#b4584a', [0, hy - 0.07, 0.163]);
  if (girl) [-0.1, 0.1].forEach((x) => part(P, Sph(0.025, 8, 6), '#f4a6a0', [x, hy - 0.04, 0.135], [0, 0, 0], [1, 0.6, 0.4]));
  // ---- 頭髮 ----
  const hc = a.hairColor;
  // 頭頂一片完整的髮、後側往下延伸（前面留臉）
  const dome = () => part(P, Sph(0.182, 14, 5, 0, Math.PI * 2, 0, Math.PI * 0.34), hc, [0, hy, -0.005]);
  const sides = (to) => part(P, Sph(0.186, 14, 6, Math.PI * 0.7, Math.PI * 1.6, Math.PI * 0.33, Math.PI * (to - 0.33)), hc, [0, hy, -0.005]);
  const h = a.hair;
  if (h !== 'none') {
    dome();
    sides({ bob: 0.75, long: 0.8, wavy: 0.8, braids: 0.7 }[h] || 0.6);
    if (h === 'side') { part(P, Box(0.2, 0.055, 0.06), hc, [0.035, hy + 0.13, 0.12], [0.4, 0, -0.25]); part(P, Box(0.006, 0.006, 0.12), shade(hc, 0.25), [-0.06, hy + 0.178, 0.03]); }
    else if (h !== 'curly') part(P, Box(0.24, 0.05, 0.05), hc, [0, hy + 0.12, 0.13], [0.35, 0, 0]); // 瀏海
  }
  if (h === 'spiky') for (let k = 0; k < 5; k++) part(P, new THREE.ConeGeometry(0.05, 0.12, 5), hc, [Math.cos(k * 1.25) * 0.08, hy + 0.17, Math.sin(k * 1.25) * 0.08 - 0.02], [Math.sin(k * 1.25) * 0.5, 0, -Math.cos(k * 1.25) * 0.5]);
  if (h === 'curly') for (let k = 0; k < 16; k++) { const t = k * 2.4, r = k < 8 ? 0.12 : 0.17, y = k < 8 ? 0.15 : 0.08; part(P, Sph(0.055, 7, 5), hc, [Math.cos(t) * r, hy + y, Math.sin(t) * r * 0.9 - 0.01]); }
  if (h === 'long') part(P, Box(0.3, 0.32, 0.08), hc, [0, hy - 0.16, -0.12]);
  if (h === 'wavy') for (let k = 0; k < 4; k++) part(P, Sph(0.1, 9, 6), hc, [k % 2 ? 0.05 : -0.05, hy - 0.05 - k * 0.09, -0.13], [0, 0, 0], [1.6, 0.75, 0.7]);
  if (h === 'ponytail') { part(P, Sph(0.06, 8, 6), hc, [0, hy + 0.06, -0.19]); part(P, Cyl(0.05, 0.025, 0.24, 8), hc, [0, hy - 0.09, -0.21], [0.2, 0, 0]); }
  if (h === 'braids') [-1, 1].forEach((sd) => { for (let k = 0; k < 4; k++) part(P, Sph(0.04 - k * 0.003, 7, 5), hc, [sd * 0.15, hy - 0.1 - k * 0.065, -0.02 + k * 0.012]); part(P, Sph(0.018, 6, 4), a.accColor, [sd * 0.15, hy - 0.36, 0.03]); });
  if (h === 'buns') [-0.12, 0.12].forEach((x) => part(P, Sph(0.065, 10, 8), hc, [x, hy + 0.15, -0.03]));
  if (h === 'topbun') part(P, Sph(0.075, 10, 8), hc, [0, hy + 0.21, -0.04]);
  // ---- 帽子 ----
  const ht = a.hatColor;
  if (a.hat === 'cap') { part(P, Sph(0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), ht, [0, hy + 0.04, 0]); part(P, Cyl(0.13, 0.13, 0.02, 14), ht, [0, hy + 0.08, 0.16], [0, 0, 0], [1, 1, 0.8]); }
  if (a.hat === 'beanie') { part(P, Sph(0.192, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), ht, [0, hy + 0.05, 0], [0, 0, 0], [1, 1.15, 1]); part(P, Cyl(0.196, 0.196, 0.06, 16), ht, [0, hy + 0.07, 0]); part(P, Sph(0.05, 8, 6), '#fffaf0', [0, hy + 0.28, 0]); }
  if (a.hat === 'bucket') { part(P, Cyl(0.15, 0.19, 0.14, 14), ht, [0, hy + 0.13, 0]); part(P, Cyl(0.2, 0.27, 0.04, 16), ht, [0, hy + 0.06, 0]); }
  if (a.hat === 'straw') { part(P, Cyl(0.14, 0.17, 0.12, 14), '#e8c27a', [0, hy + 0.14, 0]); part(P, Cyl(0.33, 0.33, 0.02, 18), '#e8c27a', [0, hy + 0.08, 0]); part(P, Cyl(0.172, 0.172, 0.035, 14), ht, [0, hy + 0.1, 0]); }
  if (a.hat === 'beret') { part(P, Sph(0.2, 14, 6), ht, [0.03, hy + 0.15, -0.01], [0, 0, -0.2], [1, 0.38, 1]); part(P, Cyl(0.012, 0.012, 0.04, 5), ht, [0.04, hy + 0.23, -0.01]); }
  if (a.hat === 'gradcap') {
    part(P, Cyl(0.17, 0.185, 0.1, 14), ht, [0, hy + 0.13, 0]);
    part(P, Box(0.36, 0.025, 0.36), ht, [0, hy + 0.19, 0], [0, Math.PI / 4, 0]);
    part(P, Cyl(0.02, 0.02, 0.015, 8), '#f2b544', [0, hy + 0.21, 0]);
    part(P, Box(0.008, 0.008, 0.2), '#f2b544', [0.07, hy + 0.205, 0.07], [0, Math.PI / 4, 0]);
    part(P, Box(0.02, 0.1, 0.02), '#f2b544', [0.14, hy + 0.15, 0.14]);   // 流蘇
  }
  // ---- 配件 ----
  const ac = a.accColor;
  const has = (k) => a.acc.includes(k);
  if (has('glasses') && !has('sunglasses')) { [-0.06, 0.06].forEach((x) => part(P, new THREE.TorusGeometry(0.04, 0.009, 5, 12), '#3b2f25', [x, hy + 0.01, 0.165])); part(P, Box(0.04, 0.01, 0.01), '#3b2f25', [0, hy + 0.02, 0.17]); }
  if (has('sunglasses')) {
    [-0.062, 0.062].forEach((x) => part(P, Cyl(0.045, 0.045, 0.012, 12), '#1f2328', [x, hy + 0.012, 0.167], [Math.PI / 2, 0, 0], [1.15, 1, 0.85]));
    part(P, Box(0.05, 0.01, 0.01), '#1f2328', [0, hy + 0.03, 0.17]);
    [-1, 1].forEach((sd) => part(P, Box(0.008, 0.01, 0.14), '#1f2328', [sd * 0.155, hy + 0.025, 0.09], [0, sd * 0.25, 0]));
  }
  if (has('bow')) { [-0.05, 0.05].forEach((x) => part(P, new THREE.ConeGeometry(0.045, 0.08, 6), ac, [0.1 + x, hy + 0.16, 0.02], [0, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2])); part(P, Sph(0.025, 6, 5), ac, [0.1, hy + 0.16, 0.02]); }
  if (has('hairclip')) { part(P, Box(0.07, 0.022, 0.02), ac, [-0.1, hy + 0.12, 0.12], [0.4, 0.5, 0.35]); part(P, Sph(0.016, 6, 4), shade(ac, 0.45), [-0.1, hy + 0.12, 0.133]); }
  if (has('headphones')) { part(P, new THREE.TorusGeometry(0.19, 0.018, 5, 16, Math.PI), ac, [0, hy + 0.02, 0]); [-0.19, 0.19].forEach((x) => part(P, Cyl(0.05, 0.05, 0.05, 10), ac, [x, hy, 0], [0, 0, Math.PI / 2])); }
  if (has('necklace')) { part(P, new THREE.TorusGeometry(0.06, 0.006, 4, 16), ac, [0, 0.665, 0.02], [Math.PI / 2 - 0.5, 0, 0]); part(P, Sph(0.016, 6, 4), ac, [0, 0.625, front - 0.005]); }
  if (has('tie')) { part(P, Box(0.045, 0.035, 0.025), ac, [0, 0.655, front - 0.002]); part(P, Box(0.04, 0.18, 0.015), ac, [0, 0.55, front + 0.006], [0.08, 0, 0]); }
  if (has('bowtie')) { [-1, 1].forEach((sd) => part(P, new THREE.ConeGeometry(0.03, 0.06, 4), ac, [sd * 0.03, 0.655, front], [0, 0, sd * Math.PI / 2])); part(P, Box(0.02, 0.022, 0.02), shade(ac, -0.2), [0, 0.655, front + 0.004]); }
  if (has('scarf')) { part(P, new THREE.TorusGeometry(0.075, 0.03, 6, 14), ac, [0, 0.69, 0], [Math.PI / 2, 0, 0]); part(P, Box(0.06, 0.16, 0.03), ac, [0.05, 0.6, 0.11]); }
  if (has('watch')) { const x = -(shoulder + 0.045) - 0.017; part(P, Cyl(0.04, 0.04, 0.022, 10), ac, [x, 0.405, 0], [0, 0, -0.12]); part(P, Box(0.03, 0.03, 0.012), '#fffaf0', [x, 0.405, 0.038]); }
  if (has('backpack')) { part(P, Box(0.22, 0.26, 0.1), ac, [0, 0.54, -0.18]); part(P, Box(0.16, 0.08, 0.03), ac, [0, 0.46, -0.24]); }
  if (has('crossbody')) {
    part(P, Box(0.022, 0.42, 0.012), shade(ac, -0.2), [0, 0.54, front + 0.004], [0, 0, 0.72]);
    part(P, Box(0.022, 0.42, 0.012), shade(ac, -0.2), [0, 0.54, -front - 0.004], [0, 0, -0.72]);
    part(P, Box(0.13, 0.1, 0.05), ac, [0.16, 0.4, 0.04]);
  }
  return P;
}

// 浸衣胸前的字：一張共用的透明貼圖，貼在胸前一片跟著身體弧度的曲面上
let printTex = null;
function printTexture() {
  if (printTex) return printTex;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
  g.font = '700 92px "Kaiti TC", "STKaiti", "BiauKai", "DFKai-SB", "Noto Serif TC", serif';
  g.textAlign = 'left'; g.fillText('信而受浸', 24, 74);
  g.textAlign = 'right'; g.fillText('必然得救', 488, 186);
  printTex = new THREE.CanvasTexture(cv);
  printTex.colorSpace = THREE.SRGBColorSpace;
  printTex.anisotropy = 4;
  return printTex;
}
function printGeometry(a) {
  const shoulder = a.gender === 'f' ? 0.125 : 0.14;
  const r = (y) => 0.15 + (shoulder - 0.15) * (y - TORSO_Y0) / (TORSO_Y1 - TORSO_Y0) + 0.004;
  const y0 = 0.49, y1 = 0.61;
  // 和身體一樣 12 等分：從 -60° 到 60°，邊對齊身體的稜線
  const g = new THREE.CylinderGeometry(r(y1), r(y0), y1 - y0, 4, 1, true, -Math.PI / 3, (Math.PI * 2) / 3).toNonIndexed();
  g.translate(0, (y0 + y1) / 2, 0);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  return g;
}

const baseMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
const printMaterial = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.35, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
// 兩個材質：0 = 身體（頂點顏色），1 = 浸衣胸前的字。幾何一律帶 group，換外觀只要換 geometry
export const avatarMaterial = [baseMaterial, printMaterial];

export function avatarGeometry(a) {
  a = sanitize(a);
  const parts = buildParts(a);
  const body = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!BAPTISM[a.top]) { body.addGroup(0, body.attributes.position.count, 0); return body; }
  if (!printMaterial.map) { printMaterial.map = printTexture(); printMaterial.needsUpdate = true; }
  body.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(body.attributes.position.count * 2), 2));
  const pr = printGeometry(a);
  const g = mergeGeometries([body, pr], true);
  body.dispose(); pr.dispose();
  return g;
}

export function avatarMesh(a, scale = 1) {
  const m = new THREE.Mesh(avatarGeometry(a), avatarMaterial);
  m.scale.setScalar(scale);
  return m;
}
