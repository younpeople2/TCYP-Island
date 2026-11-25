// 材質工具與六角磁磚（從 main.js 搬出來，內容沒改）
import * as THREE from 'three';

// ================= 材質工具 =================
const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts }));
  return mats.get(key);
}
// 夜間會亮的窗戶
export const windowMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffcf6b', emissiveIntensity: 0, roughness: 0.4 });
export const lampMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.2 });

export const C = {
  grass: ['#a3d06f', '#93c463', '#b2d97c', '#9ccb6a'],
  sand: '#f3d9a2', soil: '#c4895a', soilDark: '#a26f48',
  cream: '#fff3dc', white: '#fffaf0', coral: '#e97a5b', sun: '#f2b544', sky: '#6ba8d8',
  pink: '#f49aa0', mint: '#8fd3c1', wood: '#b9824f', woodDark: '#8a5a35', stone: '#d9cfc0',
  leaf: '#5fa65a', leaf2: '#7cbf5e', pine: '#3f8a5b', roof2: '#c75b4a', purple: '#a993d6',
};

export const animators = [];
export const onTick = (fn) => animators.push(fn);

export function mesh(geo, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y + h / 2, z);
  return m;
}
export function cyl(rt, rb, h, color, seg = 12, x = 0, y = 0, z = 0) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y + h / 2, z);
  return m;
}
export function cone(r, h, color, seg = 8, x = 0, y = 0, z = 0) {
  const m = mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
export function ball(r, color, x = 0, y = 0, z = 0, detail = 0) {
  const m = mesh(new THREE.IcosahedronGeometry(r, detail), mat(color));
  m.position.set(x, y, z);
  return m;
}

// 三角屋頂
export function gableRoof(w, h, d, color) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.08, 0); shape.lineTo(w / 2 + 0.08, 0); shape.lineTo(0, h); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d + 0.16, bevelEnabled: false });
  g.translate(0, 0, -(d + 0.16) / 2);
  return mesh(g, mat(color));
}

export function windowsOn(group, w, h, d, rows, cols, y0, face = 'front') {
  const ww = Math.min(0.16, (w / cols) * 0.45), wh = Math.min(0.2, (h / rows) * 0.45);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (w / cols) * (c + 0.5);
      const y = y0 + (h / rows) * (r + 0.55);
      const p = mesh(new THREE.PlaneGeometry(ww, wh), windowMat, { cast: false });
      if (face === 'front') p.position.set(x, y, d / 2 + 0.005);
      group.add(p);
      if (face === 'front') { const b = p.clone(); b.position.z = -d / 2 - 0.005; b.rotation.y = Math.PI; group.add(b); }
    }
  }
}

export function house({ w = 0.8, h = 0.6, d = 0.7, wall = C.cream, roof = C.coral, roofH = 0.45, door = C.woodDark, chimney = false } = {}) {
  const g = new THREE.Group();
  g.add(box(w, h, d, wall));
  const r = gableRoof(w, roofH, d, roof); r.position.y = h; g.add(r);
  g.add(box(0.16, 0.26, 0.02, door, 0, 0, d / 2 + 0.01));
  windowsOn(g, w, h * 0.6, d, 1, 2, h * 0.3);
  if (chimney) g.add(box(0.12, 0.3, 0.12, C.roof2, w * 0.25, h + roofH * 0.3, -d * 0.15));
  return g;
}

export function tree(kind = 'round', s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.05 * s, 0.07 * s, 0.3 * s, C.wood, 6));
  if (kind === 'pine') {
    g.add(cone(0.32 * s, 0.5 * s, C.pine, 7, 0, 0.22 * s));
    g.add(cone(0.24 * s, 0.42 * s, C.pine, 7, 0, 0.48 * s));
  } else {
    const col = Math.random() > 0.5 ? C.leaf : C.leaf2;
    g.add(ball(0.3 * s, col, 0, 0.5 * s, 0, 0));
    g.add(ball(0.2 * s, col, 0.14 * s, 0.68 * s, 0.05 * s, 0));
  }
  g.rotation.y = Math.random() * Math.PI;
  return g;
}

export function person(color) {
  const g = new THREE.Group();
  g.add(cyl(0.06, 0.08, 0.2, color, 8));
  g.add(ball(0.065, '#f6d2b0', 0, 0.27, 0, 1));
  return g;
}

export function lamp() {
  const g = new THREE.Group();
  g.add(cyl(0.02, 0.025, 0.55, '#5b4a3a', 6));
  const l = mesh(new THREE.SphereGeometry(0.06, 10, 8), lampMat, { cast: false }); l.position.y = 0.58; g.add(l);
  return g;
}

export function flag(color) {
  const g = new THREE.Group();
  g.add(cyl(0.015, 0.015, 0.8, '#ddd', 6));
  const geo = new THREE.PlaneGeometry(0.4, 0.24, 8, 1);
  const f = mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }));
  f.position.set(0.2, 0.68, 0);
  g.add(f);
  const base = geo.attributes.position.array.slice();
  onTick((t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) a[i + 2] = Math.sin(t * 4 + base[i] * 10) * 0.04 * (base[i] + 0.2);
    geo.attributes.position.needsUpdate = true;
  });
  return g;
}

// ================= 六角磁磚 =================
const HEX = 1.0;
function hexShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}
const hexGeoCache = new Map();
function hexGeo(h) {
  const k = h.toFixed(2);
  if (!hexGeoCache.has(k)) {
    const g = new THREE.ExtrudeGeometry(hexShape(HEX * 0.9), { depth: h, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 2 });
    g.rotateX(-Math.PI / 2);
    hexGeoCache.set(k, g);
  }
  return hexGeoCache.get(k);
}
const AXIAL_DIRS = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const axialToXZ = (q, r) => [1.5 * q * HEX, Math.sqrt(3) * (r + q / 2) * HEX];

// 一座島 = 7 塊六角磚（花形）
export function buildIsland(def, cx, cz) {
  const group = new THREE.Group();
  group.position.set(cx, 0, cz);
  const tiles = [];
  const topCol = def.top || null;
  AXIAL_DIRS.forEach(([q, r], i) => {
    const [x, z] = axialToXZ(q, r);
    const h = (def.flat ? 0.55 : 0.5 + Math.random() * 0.2) + (i === 0 ? 0.08 : 0);
    const top = topCol ? (Array.isArray(topCol) ? topCol[i % topCol.length] : topCol) : C.grass[(((i + Math.floor(cx)) % C.grass.length) + C.grass.length) % C.grass.length];
    const m = mesh(hexGeo(h), [mat(top), mat(C.soil)]);
    m.position.set(x, -0.6, z);
    m.userData.ground = true;
    group.add(m);
    // 土層下緣
    const under = mesh(new THREE.CylinderGeometry(HEX * 0.82, HEX * 0.55, 0.6, 6), mat(C.soilDark), { cast: false });
    under.position.set(x, -0.9, z);
    under.userData.ground = true;
    group.add(under);
    tiles.push({ x, z, y: h - 0.6 + 0.07 });
  });
  group.userData.tiles = tiles;
  return group;
}

// 在磚 i 上放物件
export function put(island, i, obj, dx = 0, dz = 0, rot = 0) {
  const t = island.userData.tiles[i];
  obj.position.set(t.x + dx, t.y + (obj.position.y || 0), t.z + dz);
  obj.rotation.y += rot;
  island.add(obj);
  return obj;
}
