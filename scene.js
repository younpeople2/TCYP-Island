// 場景基本設定、光線、水面（從 main.js 搬出來，內容沒改）
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { C, box, cyl, mat, mesh, onTick } from './materials.js';

// ================= 基本設定 =================
export const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
// 低階裝置：降低解析度與陰影品質
export const LOW_END = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || matchMedia('(max-width: 720px)').matches;
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_END ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const scene = new THREE.Scene();
export const DAY_FOG = new THREE.Color('#fbe8c8');
export const NIGHT_FOG = new THREE.Color('#6b5a7a');
scene.fog = new THREE.Fog(DAY_FOG, 60, 130);

// 窄視角 → 微縮模型感
export const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300);
export const HOME_POS = new THREE.Vector3(33, 37, 42);
export const HOME_TARGET = new THREE.Vector3(0, 0, 0);
camera.position.copy(HOME_POS);

export const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 14;
controls.maxDistance = 85;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.2;
controls.screenSpacePanning = false;
controls.autoRotate = !REDUCED_MOTION;
controls.autoRotateSpeed = 0.35;

// ================= 光線 =================
export const hemi = new THREE.HemisphereLight('#fff3dc', '#8fb6a8', 1.3);
scene.add(hemi);
export const sun = new THREE.DirectionalLight('#fff0d0', 2.4);
sun.position.set(18, 30, 12);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(LOW_END ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);

// ================= 水面 =================
// 加密頂點做波浪
const wg = new THREE.PlaneGeometry(240, 240, LOW_END ? 60 : 100, LOW_END ? 60 : 100); wg.rotateX(-Math.PI / 2);
export const waterMat = new THREE.MeshStandardMaterial({ color: '#7ccfd0', roughness: 0.35, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.94 });
export const water = new THREE.Mesh(wg, waterMat);
water.position.y = -0.55; water.receiveShadow = true;
scene.add(water);
const wBase = wg.attributes.position.array.slice();
onTick((t) => {
  const a = wg.attributes.position.array;
  for (let i = 0; i < a.length; i += 3) {
    const x = wBase[i], z = wBase[i + 2];
    a[i + 1] = Math.sin(x * 0.45 + t * 1.1) * 0.06 + Math.cos(z * 0.5 + t * 0.9) * 0.06;
  }
  wg.attributes.position.needsUpdate = true;
  wg.computeVertexNormals();
});
// 海底沙
const seabed = new THREE.Mesh(new THREE.CircleGeometry(200, 48), mat('#e8cf9c'));
seabed.rotation.x = -Math.PI / 2; seabed.position.y = -1.6; scene.add(seabed);

// 小船
export function boat(color) {
  const g = new THREE.Group();
  const hull = box(0.7, 0.18, 0.3, color); g.add(hull);
  g.add(cyl(0.02, 0.02, 0.7, C.white, 5, 0, 0.18));
  const sail = mesh(new THREE.ConeGeometry(0.22, 0.55, 3), mat(C.white)); sail.position.set(0.08, 0.5, 0); sail.scale.z = 0.15; g.add(sail);
  return g;
}
[[C.coral, 12.8, 0.15, 0], [C.sky, 14.5, -0.11, 2.2], [C.sun, 11.6, 0.09, 4.1]].forEach(([c, R, sp, off]) => {
  const b = boat(c); scene.add(b);
  onTick((t) => {
    const a = t * sp + off;
    b.position.set(Math.cos(a) * R, -0.5 + Math.sin(t * 2 + off) * 0.05, Math.sin(a) * R);
    b.rotation.y = -a + (sp > 0 ? 0 : Math.PI);
    b.rotation.z = Math.sin(t * 1.7 + off) * 0.06;
  });
});

// 雲
export const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 1, flatShading: true, transparent: true, opacity: 0.9 });
const clouds = [];
for (let k = 0; k < 6; k++) {
  const cl = new THREE.Group();
  [[0, 0, 0, 0.7], [0.75, -0.1, 0.1, 0.5], [-0.7, -0.12, 0, 0.5], [0.25, 0.35, 0, 0.45]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cloudMat); s.scale.y = 0.75; s.position.set(x, y, z); cl.add(s); });
  clouds.push(cl);
  const R = 13 + Math.random() * 10, a0 = (k / 6) * Math.PI * 2, y = 11 + Math.random() * 3, sp = 0.01 + Math.random() * 0.015;
  scene.add(cl);
  onTick((t) => { const a = a0 + t * sp; cl.position.set(Math.cos(a) * R, y, Math.sin(a) * R); });
}

// 鳥
for (let k = 0; k < 5; k++) {
  const bird = new THREE.Group();
  const wingG = new THREE.PlaneGeometry(0.25, 0.08);
  const wl = new THREE.Mesh(wingG, new THREE.MeshBasicMaterial({ color: '#4a3b2f', side: THREE.DoubleSide })); wl.position.x = -0.12;
  const wr = wl.clone(); wr.position.x = 0.12;
  bird.add(wl, wr); scene.add(bird);
  const R = 5 + k * 1.3, y = 5 + k * 0.4, sp = 0.25 + k * 0.05;
  onTick((t) => {
    const a = t * sp + k;
    bird.position.set(Math.cos(a) * R, y + Math.sin(t * 2 + k) * 0.2, Math.sin(a) * R);
    bird.rotation.y = -a;
    const f = Math.sin(t * 10 + k) * 0.6; wl.rotation.z = f; wr.rotation.z = -f;
  });
}
