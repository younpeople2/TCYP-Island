// 各島建築（從 main.js 搬出來，內容沒改）
import * as THREE from 'three';
import { C, ball, box, cone, cyl, flag, gableRoof, house, lamp, mat, mesh, onTick, person, put, tree, windowsOn } from './materials.js';
import { waterMat } from './scene.js';
import { taipeiNow } from './content.js';

export const STAFF_CENTER = new THREE.Vector3(0, 0, -72); // 服事者群島在遠方，平常看不到

// ================= 各島建築 =================
export const builders = {
  plaza(isl) {
    // 復興大樓
    const b = new THREE.Group();
    b.add(box(1.5, 2.2, 1.1, C.cream));
    b.add(box(1.6, 0.12, 1.2, C.sun, 0, 2.2));
    b.add(box(0.7, 0.4, 0.6, C.cream, 0.2, 2.32));
    windowsOn(b, 1.5, 1.9, 1.1, 5, 4, 0.2);
    b.add(box(0.4, 0.4, 0.04, C.woodDark, 0, 0, 0.56));
    const f = flag(C.coral); f.position.set(-0.5, 2.32, 0); b.add(f);
    put(isl, 0, b, 0, -0.1, 0.2);
    // 噴水池
    const fountain = new THREE.Group();
    fountain.add(cyl(0.45, 0.5, 0.14, C.stone, 16));
    fountain.add(cyl(0.38, 0.38, 0.02, '#7cc6d6', 16, 0, 0.13));
    fountain.add(cyl(0.06, 0.08, 0.35, C.stone, 8));
    const water = ball(0.1, '#bfe9f2', 0, 0.42, 0, 1); fountain.add(water);
    onTick((t) => { water.position.y = 0.42 + Math.sin(t * 5) * 0.03; water.scale.setScalar(1 + Math.sin(t * 5) * 0.12); });
    put(isl, 6, fountain);
    put(isl, 1, tree('round', 1.1), 0.2, 0.3);
    put(isl, 1, tree('round', 0.8), -0.3, -0.2);
    put(isl, 3, house({ w: 0.9, wall: '#ffe2c4', roof: C.sky }), 0, 0, 0.5);
    put(isl, 4, tree('pine', 1.1), 0.1, 0);
    put(isl, 4, lamp(), -0.5, 0.3);
    put(isl, 5, house({ w: 0.7, h: 0.5, wall: C.white, roof: C.sun }), 0, 0, -0.4);
    put(isl, 2, tree('round', 1), 0, 0);
    put(isl, 2, lamp(), 0.4, 0.4);
    // 人
    ['#e97a5b', '#6ba8d8', '#f2b544', '#8fd3c1'].forEach((c, k) => put(isl, 6, person(c), Math.cos(k * 1.6) * 0.65, Math.sin(k * 1.6) * 0.65));
    // 繞圈的小車
    const car = new THREE.Group();
    car.add(box(0.36, 0.14, 0.2, C.coral, 0, 0.04)); car.add(box(0.2, 0.12, 0.18, C.white, -0.03, 0.18));
    isl.add(car);
    onTick((t) => {
      const a = t * 0.4, R = 2.05;
      car.position.set(Math.cos(a) * R, 0.1, Math.sin(a) * R);
      car.rotation.y = -a - Math.PI / 2;
    });
  },
  calendar(isl) {
    const tower = new THREE.Group();
    tower.add(box(0.8, 2.4, 0.8, '#f6c9b5'));
    tower.add(box(0.95, 0.12, 0.95, C.roof2, 0, 2.4));
    tower.add(cone(0.7, 0.9, C.roof2, 4, 0, 2.5));
    tower.children.at(-1).rotation.y = Math.PI / 4;
    // 四面時鐘
    const hands = [];
    for (let k = 0; k < 4; k++) {
      const face = new THREE.Group();
      const disc = mesh(new THREE.CircleGeometry(0.28, 24), mat(C.white), { cast: false });
      face.add(disc);
      const hh = mesh(new THREE.PlaneGeometry(0.035, 0.15), mat('#3b2f25'), { cast: false }); hh.geometry.translate(0, 0.07, 0.002);
      const mh = mesh(new THREE.PlaneGeometry(0.025, 0.22), mat('#3b2f25'), { cast: false }); mh.geometry.translate(0, 0.1, 0.004);
      face.add(hh, mh); hands.push([hh, mh]);
      face.position.set(Math.sin(k * Math.PI / 2) * 0.41, 1.95, Math.cos(k * Math.PI / 2) * 0.41);
      face.rotation.y = k * Math.PI / 2;
      tower.add(face);
    }
    onTick(() => {
      const n = taipeiNow();
      hands.forEach(([h, m]) => { h.rotation.z = -((n.hour % 12) + n.minute / 60) / 12 * Math.PI * 2; m.rotation.z = -n.minute / 60 * Math.PI * 2; });
    });
    windowsOn(tower, 0.8, 1.2, 0.8, 2, 1, 0.3);
    put(isl, 0, tower);
    // 月曆看板
    const board = new THREE.Group();
    board.add(box(0.06, 0.6, 0.06, C.woodDark, -0.35)); board.add(box(0.06, 0.6, 0.06, C.woodDark, 0.35));
    board.add(box(0.85, 0.55, 0.06, C.white, 0, 0.45));
    board.add(box(0.85, 0.14, 0.07, C.coral, 0, 0.86));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) board.add(box(0.1, 0.08, 0.02, r === 1 && c === 3 ? C.coral : '#e8dccb', -0.3 + c * 0.15, 0.53 + r * 0.12, 0.04));
    put(isl, 1, board, 0, 0, -0.6);
    put(isl, 2, tree('round', 0.9)); put(isl, 3, tree('pine'), 0.2); put(isl, 3, tree('pine', 0.7), -0.3, 0.3);
    put(isl, 4, house({ wall: '#fff0e0', roof: C.purple }), 0, 0, 0.3);
    put(isl, 5, tree('round', 1.1)); put(isl, 6, lamp(), 0.3); put(isl, 6, person(C.sky), -0.2, 0.1);
    // 長椅
    const bench = new THREE.Group(); bench.add(box(0.6, 0.06, 0.2, C.wood, 0, 0.18)); bench.add(box(0.6, 0.2, 0.04, C.wood, 0, 0.24, -0.09));
    bench.add(box(0.05, 0.18, 0.18, C.woodDark, -0.25)); bench.add(box(0.05, 0.18, 0.18, C.woodDark, 0.25));
    put(isl, 6, bench, 0.1, -0.4);
  },
  campus(isl) {
    const school = new THREE.Group();
    school.add(box(2.2, 1.1, 0.8, '#fdf0d6'));
    school.add(box(2.3, 0.1, 0.9, C.sky, 0, 1.1));
    windowsOn(school, 2.2, 0.95, 0.8, 2, 6, 0.08);
    school.add(box(0.6, 1.5, 0.9, '#f6e2c0', 0, 0));
    school.add(box(0.7, 0.1, 1.0, C.sky, 0, 1.5));
    const clock = mesh(new THREE.CircleGeometry(0.16, 20), mat(C.white), { cast: false }); clock.position.set(0, 1.25, 0.46); school.add(clock);
    const f = flag(C.sun); f.position.set(0.9, 1.2, 0); school.add(f);
    put(isl, 0, school, 0, -0.5, 0);
    // 操場跑道
    const track = new THREE.Group();
    const ring = mesh(new THREE.RingGeometry(0.42, 0.68, 28), mat('#d9775a'), { cast: false }); ring.rotation.x = -Math.PI / 2; ring.scale.set(1.3, 1, 1);
    const field = mesh(new THREE.CircleGeometry(0.42, 28), mat('#86c062'), { cast: false }); field.rotation.x = -Math.PI / 2; field.scale.set(1.3, 1, 1);
    ring.position.y = 0.015; field.position.y = 0.01; track.add(ring, field);
    put(isl, 6, track, 0, 0.1);
    const runner = person(C.coral); isl.add(runner);
    const t6 = isl.userData.tiles[6];
    onTick((t) => { const a = t * 1.2; runner.position.set(t6.x + Math.cos(a) * 0.72, t6.y, t6.z + 0.1 + Math.sin(a) * 0.55); });
    put(isl, 1, tree('round')); put(isl, 2, tree('round', 1.2), 0.2, -0.2);
    put(isl, 3, house({ w: 0.9, h: 0.7, wall: '#fff5e6', roof: C.coral }), 0.1, 0, 0.6);
    put(isl, 4, tree('pine')); put(isl, 4, tree('pine', 0.8), 0.4, 0.3);
    put(isl, 5, house({ w: 0.7, h: 0.5, wall: '#e8f2ff', roof: C.sky }), 0, 0, -0.3);
    // 籃球架
    const hoop = new THREE.Group(); hoop.add(cyl(0.03, 0.03, 0.8, '#777', 6)); hoop.add(box(0.3, 0.22, 0.03, C.white, 0, 0.72, 0.03));
    const rim = mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12), mat(C.coral)); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.74, 0.12); hoop.add(rim);
    put(isl, 1, hoop, -0.4, 0.3, 0.4);
    ['#f2b544', '#6ba8d8', '#f49aa0'].forEach((c, k) => put(isl, 0, person(c), -0.6 + k * 0.35, 0.35));
  },
  community(isl) {
    const palette = [[C.cream, C.coral], ['#ffe7d1', C.sky], ['#f0f7e8', C.sun], [C.white, C.roof2], ['#fff0f0', C.purple], ['#fdf3dc', C.mint], ['#eef4ff', C.coral]];
    isl.userData.tiles.forEach((_, i) => {
      const [w, r] = palette[i];
      const n = i === 0 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const hs = house({ w: 0.6 + Math.random() * 0.2, h: 0.45 + Math.random() * 0.25, wall: w, roof: r, chimney: Math.random() > 0.5 });
        put(isl, i, hs, n === 1 ? 0 : (k ? 0.3 : -0.3), n === 1 ? 0 : (k ? -0.25 : 0.25), Math.random() * 0.6 - 0.3 + i);
      }
      if (i) put(isl, i, tree(Math.random() > 0.5 ? 'round' : 'pine', 0.7), 0.45, 0.4);
    });
    // 中央會所
    const hall = put(isl, 0, house({ w: 1.1, h: 0.75, d: 0.9, wall: '#fff8ea', roof: C.sun, roofH: 0.55 }), 0, 0);
    hall.add(box(0.14, 0.35, 0.14, C.sun, 0, 1.25));
    put(isl, 0, lamp(), 0.65, 0.45);
  },
  camp(isl) {
    isl.userData.tiles.forEach((t, i) => { if (i) put(isl, i, tree('pine', 0.9 + Math.random() * 0.4), 0.45 * Math.cos(i), 0.45 * Math.sin(i)); });
    const tentCols = [C.coral, C.sun, C.sky, C.mint, C.pink];
    [1, 2, 3, 5, 6].forEach((i, k) => {
      const tent = cone(0.42, 0.55, tentCols[k], 4); tent.rotation.y = Math.PI / 4 + k;
      put(isl, i, tent, -0.15, -0.1);
    });
    // 營火
    const fire = new THREE.Group();
    for (let k = 0; k < 5; k++) { const log = box(0.42, 0.06, 0.06, C.woodDark); log.rotation.y = (k * Math.PI) / 5; fire.add(log); }
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', emissiveIntensity: 1.4, flatShading: true });
    const flame = mesh(new THREE.ConeGeometry(0.16, 0.42, 6), flameMat, { cast: false }); flame.position.y = 0.26; fire.add(flame);
    const fireLight = new THREE.PointLight('#ff9a3c', 0, 4, 1.6); fireLight.position.y = 0.5; fire.add(fireLight);
    isl.userData.fireLight = fireLight;
    onTick((t) => { flame.scale.set(1 + Math.sin(t * 13) * 0.1, 1 + Math.sin(t * 9) * 0.2, 1); flame.rotation.y = t * 2; });
    put(isl, 0, fire);
    for (let k = 0; k < 6; k++) put(isl, 0, person([C.coral, C.sky, C.sun, C.pink, C.mint, C.purple][k]), Math.cos(k) * 0.6, Math.sin(k) * 0.6);
    // 木牌
    const sign = new THREE.Group(); sign.add(box(0.05, 0.5, 0.05, C.woodDark)); sign.add(box(0.5, 0.22, 0.05, C.wood, 0, 0.4));
    put(isl, 4, sign, 0, 0, 0.6);
  },
  pillar(isl) {
    // 殿（啟三12）：石階、列柱、山牆，殿中有光
    const t = new THREE.Group();
    [[1.9, 1.5], [1.75, 1.35], [1.6, 1.2]].forEach(([w, d], k) => t.add(box(w, 0.08, d, k % 2 ? '#efe6d6' : C.stone, 0, k * 0.08)));
    const cols = [];
    [-0.6, -0.2, 0.2, 0.6].forEach((x) => [-0.45, 0.45].forEach((z) => cols.push([x, z])));
    [-0.6, 0.6].forEach((x) => cols.push([x, 0]));
    cols.forEach(([x, z]) => {
      t.add(box(0.2, 0.06, 0.2, C.stone, x, 0.24, z));
      t.add(cyl(0.065, 0.075, 0.82, C.white, 10, x, 0.3, z));
      t.add(box(0.2, 0.06, 0.2, C.stone, x, 1.12, z));
    });
    t.add(box(1.6, 0.14, 1.2, '#f6efe2', 0, 1.18));
    const ped = gableRoof(1.6, 0.42, 1.2, C.sun); ped.position.y = 1.32; t.add(ped);
    // 殿中的光（發光之體）
    const glowMat = new THREE.MeshStandardMaterial({ color: '#fff7c9', emissive: '#ffd34d', emissiveIntensity: 0.9 });
    const orb = mesh(new THREE.IcosahedronGeometry(0.16, 2), glowMat, { cast: false }); orb.position.y = 0.62; t.add(orb);
    const glow = new THREE.PointLight('#ffd27a', 0.4, 5, 1.5); glow.position.y = 0.7; t.add(glow);
    isl.userData.glowLight = glow;
    onTick((tt) => { orb.position.y = 0.62 + Math.sin(tt * 1.6) * 0.05; orb.rotation.y = tt * 0.6; });
    const out = isl.userData.outward;
    put(isl, 0, t, 0, 0, Math.atan2(-out.x, -out.z));
    // 獨立的柱子
    [[2, 0, 0], [3, 0.2, 0.1], [5, -0.1, 0.2]].forEach(([i, dx, dz]) => {
      const p = new THREE.Group();
      p.add(box(0.36, 0.08, 0.36, C.stone)); p.add(cyl(0.12, 0.13, 0.9, C.white, 10, 0, 0.08)); p.add(box(0.32, 0.08, 0.32, C.stone, 0, 0.98));
      put(isl, i, p, dx, dz);
    });
    put(isl, 1, tree('round')); put(isl, 4, tree('pine', 0.9)); put(isl, 6, tree('round', 0.8), 0.2);
    put(isl, 4, lamp(), 0.4, 0.3); put(isl, 1, lamp(), -0.4, 0.3);
  },
  glory(isl) {
    // 社區裏的關懷：住家、關懷據點、向日葵
    const center = house({ w: 1.1, h: 0.75, d: 0.85, wall: '#fff6dc', roof: C.sun, roofH: 0.5 });
    const sign = new THREE.Group();
    sign.add(mesh(new THREE.CircleGeometry(0.16, 16), mat(C.sun), { cast: false }));
    const mid = mesh(new THREE.CircleGeometry(0.07, 12), mat('#8a5a35'), { cast: false }); mid.position.z = 0.002; sign.add(mid);
    sign.position.set(0, 0.95, 0.44); center.add(sign);
    put(isl, 0, center, 0, -0.1, 0.2);
    put(isl, 1, house({ w: 0.75, wall: '#ffeede', roof: C.coral, chimney: true }), 0, 0, 0.6);
    put(isl, 3, house({ w: 0.7, wall: '#eef6ff', roof: C.sky }), 0, 0, -0.4);
    put(isl, 5, house({ w: 0.75, wall: '#f4fbe9', roof: C.leaf2 }), 0, 0, 2.2);
    // 向日葵花圃
    [2, 4, 6].forEach((i) => {
      for (let k = 0; k < 6; k++) {
        const sf = new THREE.Group();
        const h = 0.4 + Math.random() * 0.25;
        sf.add(cyl(0.015, 0.018, h, C.leaf, 5));
        const head = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 10), mat(C.sun)); head.rotation.x = Math.PI / 2.4; head.position.y = h + 0.04; sf.add(head);
        const core = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 8), mat('#7a4a2a')); core.rotation.x = Math.PI / 2.4; core.position.set(0, h + 0.045, 0.01); sf.add(core);
        put(isl, i, sf, Math.cos(k * 1.05) * 0.4, Math.sin(k * 1.05) * 0.4, k);
      }
    });
    put(isl, 6, tree('round', 1)); put(isl, 2, lamp(), 0, 0);
    // 關懷者陪伴少年回家
    const pair = new THREE.Group();
    const adult = person(C.sky); adult.scale.setScalar(1.15); adult.position.x = -0.1; pair.add(adult);
    const teen = person(C.coral); teen.position.x = 0.1; pair.add(teen);
    put(isl, 0, pair, 0.1, 0.65);
  },
  // ---------- 服事者群島 ----------
  'st-hub'(isl) {
    const hall = house({ w: 1.3, h: 0.9, d: 1.0, wall: '#f3eefc', roof: C.purple, roofH: 0.6 });
    hall.add(box(0.22, 0.5, 0.22, C.purple, 0, 1.45));
    const bell = cone(0.12, 0.18, C.sun, 8, 0, 1.95); hall.add(bell);
    put(isl, 0, hall, 0, -0.1, Math.atan2(-isl.position.x + STAFF_CENTER.x, -isl.position.z + STAFF_CENTER.z));
    // 公告欄
    const board = new THREE.Group();
    board.add(box(0.06, 0.6, 0.06, C.woodDark, -0.32)); board.add(box(0.06, 0.6, 0.06, C.woodDark, 0.32));
    board.add(box(0.8, 0.5, 0.05, '#fffaf0', 0, 0.42));
    [[-0.2, 0.62, C.coral], [0.12, 0.66, C.sun], [-0.05, 0.5, C.sky], [0.2, 0.5, C.mint]].forEach(([x, y, c]) => board.add(box(0.18, 0.14, 0.02, c, x, y - 0.07, 0.035)));
    put(isl, 6, board, 0, 0, 0.3);
    [1, 3, 5].forEach((i) => put(isl, i, lamp(), 0.3, 0.2));
    [2, 4].forEach((i) => put(isl, i, tree('round', 0.9)));
  },
  'st-files'(isl) {
    const wh = new THREE.Group();
    wh.add(box(1.6, 0.7, 0.9, '#e3eef8'));
    const r = gableRoof(1.6, 0.4, 0.9, C.sky); r.position.y = 0.7; wh.add(r);
    wh.add(box(0.5, 0.45, 0.02, C.woodDark, 0, 0, 0.46));
    put(isl, 0, wh, 0, -0.1, 0.4);
    const cols = [C.coral, C.sun, C.sky, C.mint, C.purple, C.pink];
    [1, 2, 4, 6].forEach((i, k) => {
      for (let j = 0; j < 3; j++) put(isl, i, box(0.26, 0.22, 0.26, cols[(k + j) % cols.length]), -0.2 + (j % 2) * 0.3, -0.15 + j * 0.15);
      put(isl, i, box(0.26, 0.22, 0.26, cols[(k + 3) % cols.length], 0, 0, 0)).position.y += 0.22;
    });
    put(isl, 3, lamp(), 0, 0); put(isl, 5, tree('pine'), 0, 0);
  },
  'st-folders'(isl) {
    const cols = ['#f2b544', '#6ba8d8', '#e97a5b', '#8fd3c1', '#a993d6', '#7fb85a', '#f49aa0'];
    isl.userData.tiles.forEach((t, i) => {
      for (let k = 0; k < (i ? 3 : 5); k++) {
        const f = new THREE.Group();
        f.add(box(0.5, 0.36, 0.05, cols[(i + k) % cols.length]));
        f.add(box(0.2, 0.07, 0.05, cols[(i + k) % cols.length], -0.12, 0.36));
        f.add(box(0.44, 0.3, 0.06, '#fffaf0', 0, 0.03, 0.01));
        put(isl, i, f, -0.35 + k * 0.18, (k % 2 ? 0.12 : -0.12), (k - 1) * 0.15);
      }
    });
  },
  'st-stats'(isl) {
    const tower = new THREE.Group();
    tower.add(cyl(0.3, 0.38, 1.4, '#dff3e4', 10)); tower.add(cyl(0.48, 0.48, 0.1, C.leaf, 10, 0, 1.4));
    tower.add(cyl(0.05, 0.05, 0.5, '#888', 6, 0, 1.5)); tower.add(ball(0.08, C.coral, 0, 2.05, 0, 1));
    put(isl, 0, tower);
    const cols = [C.coral, C.sun, C.sky, C.mint, C.purple];
    [1, 3, 5].forEach((i, k) => {
      for (let j = 0; j < 4; j++) {
        const h = 0.2 + ((j * 37 + k * 17) % 7) * 0.08;
        put(isl, i, box(0.14, h, 0.14, cols[(j + k) % cols.length]), -0.3 + j * 0.2, 0);
      }
    });
    [2, 4, 6].forEach((i) => put(isl, i, tree('round', 0.8)));
  },
  'st-chlife'(isl) {
    // 立體長條圖：五項聚會
    const chart = new THREE.Group();
    chart.add(box(1.5, 0.08, 0.6, '#f5f1e8'));
    [[0.95, C.sky], [0.75, C.mint], [0.6, C.sun], [0.35, C.coral], [0.3, C.purple]].forEach(([h, c], k) => chart.add(box(0.2, h, 0.3, c, -0.56 + k * 0.28, 0.08)));
    put(isl, 0, chart, 0, -0.05, 0.25);
    // 折線看板
    const board = new THREE.Group();
    board.add(box(0.06, 0.7, 0.06, C.woodDark, -0.38)); board.add(box(0.06, 0.7, 0.06, C.woodDark, 0.38));
    board.add(box(0.9, 0.55, 0.05, '#ffffff', 0, 0.5));
    const pts = [[-0.34, 0.6], [-0.17, 0.68], [0, 0.64], [0.17, 0.8], [0.34, 0.9]];
    pts.slice(1).forEach(([x2, y2], k) => {
      const [x1, y1] = pts[k];
      const seg = box(Math.hypot(x2 - x1, y2 - y1), 0.035, 0.02, '#2a78d6', (x1 + x2) / 2, (y1 + y2) / 2 - 0.0175, 0.035);
      seg.rotation.z = Math.atan2(y2 - y1, x2 - x1);
      board.add(seg);
    });
    put(isl, 3, board, 0, 0, 0.5);
    // 小金字塔（年齡結構）
    const pyr = new THREE.Group();
    [0.62, 0.48, 0.34, 0.2].forEach((w, k) => pyr.add(box(w, 0.12, w * 0.6, [C.sky, C.mint, C.sun, C.coral][k], 0, k * 0.12)));
    put(isl, 5, pyr);
    [1, 4].forEach((i) => put(isl, i, tree('round', 0.85)));
    put(isl, 2, lamp(), 0.2, 0.1); put(isl, 6, lamp(), -0.2, 0.1);
  },
  // ---------- 小羊群島 ----------
  'lb-altar'(isl) {
    // 金香壇：金色的壇，香煙裊裊上升
    const altar = new THREE.Group();
    altar.add(box(0.9, 0.12, 0.9, C.stone));
    altar.add(box(0.6, 0.7, 0.6, '#e8b93a', 0, 0.12));
    altar.add(box(0.72, 0.08, 0.72, '#f2cb57', 0, 0.82));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => altar.add(cone(0.06, 0.12, '#f2cb57', 4, x * 0.32, 0.9, z * 0.32)));
    altar.add(cyl(0.16, 0.2, 0.1, '#c9952b', 10, 0, 0.9));
    const smoke = [];
    const smokeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 1 });
    for (let k = 0; k < 7; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), smokeMat.clone()); altar.add(p); smoke.push(p); }
    onTick((t) => smoke.forEach((p, k) => {
      const ph = (t * 0.35 + k / smoke.length) % 1;
      p.position.set(Math.sin(t * 1.3 + k) * 0.08 * ph, 1.0 + ph * 1.3, Math.cos(t + k) * 0.06 * ph);
      p.scale.setScalar(0.6 + ph * 1.6);
      p.material.opacity = 0.55 * (1 - ph);
    }));
    put(isl, 0, altar);
    // 代禱牆：貼滿便條的木板
    const wall = new THREE.Group();
    wall.add(box(0.07, 0.8, 0.07, C.woodDark, -0.5)); wall.add(box(0.07, 0.8, 0.07, C.woodDark, 0.5));
    wall.add(box(1.1, 0.6, 0.06, '#fffaf0', 0, 0.42));
    const notes = [C.pink, C.sun, C.sky, C.mint, C.purple, '#fff3a6'];
    for (let k = 0; k < 10; k++) wall.add(box(0.16, 0.12, 0.02, notes[k % notes.length], -0.4 + (k % 5) * 0.2, 0.5 + Math.floor(k / 5) * -0.17 + 0.08, 0.04));
    put(isl, 3, wall, 0, 0, 0.6);
    // 燭台與長椅
    [1, 5].forEach((i) => {
      const c = new THREE.Group();
      c.add(cyl(0.04, 0.06, 0.4, '#e8b93a', 8));
      c.add(cyl(0.035, 0.035, 0.14, '#fffaf0', 8, 0, 0.27));
      const fl = cone(0.03, 0.07, '#ffb43a', 6, 0, 0.38); c.add(fl);
      onTick((t) => { fl.scale.y = 1 + Math.sin(t * 11 + i) * 0.2; });
      put(isl, i, c, 0.2, 0.1);
    });
    [2, 4].forEach((i) => { const b = new THREE.Group(); b.add(box(0.6, 0.06, 0.18, C.wood, 0, 0.18)); b.add(box(0.06, 0.18, 0.16, C.woodDark, -0.24)); b.add(box(0.06, 0.18, 0.16, C.woodDark, 0.24)); put(isl, i, b, 0, 0, i * 0.6); });
    put(isl, 6, tree('round', 0.9));
  },
  'lb-grass'(isl) {
    [2, 5].forEach((i) => put(isl, i, tree('round', 0.9), 0.3, 0.3));
    const hay = new THREE.Group(); hay.add(cyl(0.22, 0.25, 0.3, '#e9c46a', 10)); hay.add(cone(0.24, 0.18, '#e2b84f', 10, 0, 0.3)); put(isl, 4, hay, -0.3, 0.2);
    [0, 1, 3, 6].forEach((i) => put(isl, i, box(0.05, 0.25, 0.05, C.woodDark), 0.6, 0.1));
  },
  'lb-water'(isl) {
    const pond = new THREE.Group();
    pond.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 18), waterMat, { cast: false }));
    [[0.55, 0.2], [-0.5, -0.3], [0.1, 0.62]].forEach(([x, z]) => pond.add(ball(0.09, C.stone, x, 0.04, z)));
    put(isl, 0, pond);
    [3, 6].forEach((i) => { for (let k = 0; k < 4; k++) put(isl, i, cyl(0.015, 0.015, 0.3, '#5fa65a', 5), -0.2 + k * 0.12, 0.3); });
    put(isl, 2, tree('pine', 0.9), 0.3, 0.2);
  },
  'lb-fold'(isl) {
    const fold = house({ w: 1.0, h: 0.55, d: 0.8, wall: '#f6e7d2', roof: C.roof2, roofH: 0.4 });
    put(isl, 0, fold, 0, -0.1, 0.5);
    // 牧羊人的杖
    const crook = new THREE.Group();
    crook.add(cyl(0.025, 0.025, 0.7, C.woodDark, 6, 0, 0.35));
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 12, Math.PI), mat(C.woodDark)); hook.position.set(0.08, 0.7, 0); crook.add(hook);
    put(isl, 3, crook, 0.3, 0.3);
    [1, 2, 4, 5, 6].forEach((i) => put(isl, i, box(0.05, 0.25, 0.05, C.woodDark), 0.62, 0));
    put(isl, 5, tree('round', 0.8), -0.2, -0.2);
  },
  // ---------- 台中的孩子群島（已畢業、服事者看得到） ----------
  'kd-hub'(isl) {
    // 資訊站：大公告欄（隊輔招募、寒假特會、畢業護照）＋旗子
    const board = new THREE.Group();
    [-0.55, 0.55].forEach((x) => board.add(cyl(0.04, 0.04, 1.0, C.woodDark, 6, x)));
    board.add(box(1.3, 0.7, 0.06, C.wood, 0, 0.55));
    [[C.coral, -0.38, 0.62], [C.sky, 0.02, 0.66], [C.mint, 0.4, 0.58], [C.sun, -0.12, 0.4]].forEach(([c, x, y]) => board.add(box(0.3, 0.22, 0.02, c, x, y, 0.04)));
    put(isl, 0, board, 0, -0.2);
    put(isl, 2, flag(C.coral)); put(isl, 5, flag(C.sky));
    put(isl, 3, house({ w: 0.8, h: 0.55, wall: '#fff6e0', roof: C.sun }), 0, 0, 0.4);
    [1, 4].forEach((i) => put(isl, i, tree('round', 0.85))); put(isl, 6, lamp(), 0.2, 0.1);
    put(isl, 0, person(C.sky), -0.45, 0.45); put(isl, 0, person(C.pink), 0.45, 0.45);
  },
  'kd-mid'(isl) {
    // 家：亮著燈的房子和等門的人
    const h = put(isl, 0, house({ w: 1.1, h: 0.75, d: 0.85, wall: '#fff6e0', roof: C.coral, roofH: 0.5, chimney: true }), 0, -0.1, 0.4);
    windowsOn(h, 1.1, 0.35, 0.85, 1, 2, 0.4);
    put(isl, 0, person(C.sky), 0.55, 0.45); put(isl, 0, person(C.sun), 0.75, 0.3);
    // 指標：往北、南、東
    const sign = new THREE.Group();
    sign.add(cyl(0.03, 0.03, 0.8, C.woodDark, 6));
    [[C.sky, 0.72, 0.4], [C.coral, 0.58, -0.6], [C.mint, 0.44, 1.6]].forEach(([c, y, r]) => { const b = box(0.4, 0.09, 0.03, c, 0.12, y); b.rotation.y = r; sign.add(b); });
    put(isl, 3, sign);
    [2, 5].forEach((i) => put(isl, i, tree('round', 0.9))); put(isl, 6, lamp(), 0.2, 0.1);
  },
  'kd-north'(isl) {
    // 城市：高樓與校舍
    const city = new THREE.Group();
    [[0.9, -0.35, C.sky], [1.4, 0, '#c9d6e8'], [0.7, 0.35, C.purple]].forEach(([hgt, x, c]) => city.add(box(0.28, hgt, 0.28, c, x)));
    city.add(cone(0.12, 0.3, '#c9d6e8', 4, 0, 1.4));
    put(isl, 0, city);
    put(isl, 3, house({ w: 0.9, h: 0.5, wall: '#fff', roof: C.sky }), 0, 0, 0.6);
    [1, 5].forEach((i) => put(isl, i, tree('pine', 0.85))); put(isl, 2, lamp(), 0.2);
  },
  'kd-south'(isl) {
    // 陽光、椰子樹和校舍
    const palm = () => {
      const g = new THREE.Group();
      g.add(cyl(0.04, 0.06, 0.8, C.wood, 6));
      for (let k = 0; k < 5; k++) { const p = new THREE.Group(); p.position.y = 0.82; p.rotation.y = k * 1.26; const l = box(0.4, 0.03, 0.1, C.leaf, 0.18); l.rotation.z = -0.3; p.add(l); g.add(p); }
      return g;
    };
    put(isl, 0, house({ w: 1.0, h: 0.55, wall: '#fff3e6', roof: C.coral }), 0, -0.1, 0.3);
    [1, 3, 6].forEach((i) => put(isl, i, palm(), 0.2, 0.1));
    put(isl, 4, ball(0.18, C.sun, 0, 1.4, 0, 1)); put(isl, 2, lamp(), 0.2);
  },
  'kd-east'(isl) {
    // 山和海
    const mt = new THREE.Group();
    mt.add(cone(0.6, 1.1, '#7fb85a', 7)); mt.add(cone(0.4, 0.7, '#8fc96a', 7, 0.5)); mt.add(cone(0.22, 0.25, '#fffaf0', 7, 0, 0.88));
    put(isl, 0, mt);
    put(isl, 3, house({ w: 0.7, h: 0.45, wall: '#eef8f0', roof: C.mint }), 0, 0, 0.8);
    [2, 5].forEach((i) => put(isl, i, tree('pine', 0.9))); put(isl, 6, lamp(), 0.2);
  },
  harbor(isl) {
    // 碼頭（往外海方向）
    const dock = new THREE.Group();
    for (let k = 0; k < 7; k++) dock.add(box(0.7, 0.05, 0.16, C.wood, 0, 0, k * 0.2));
    for (let k = 0; k < 4; k++) { dock.add(cyl(0.035, 0.035, 0.6, C.woodDark, 6, -0.33, -0.45, k * 0.42)); dock.add(cyl(0.035, 0.035, 0.6, C.woodDark, 6, 0.33, -0.45, k * 0.42)); }
    const out = isl.userData.outward;
    dock.rotation.y = Math.atan2(out.x, out.z);
    const tEdge = isl.userData.tiles[isl.userData.edgeTile];
    dock.position.set(tEdge.x + out.x * 0.6, tEdge.y - 0.02, tEdge.z + out.z * 0.6);
    isl.add(dock);
    // 燈塔小屋 → 福音帳篷舞台
    const stage = new THREE.Group();
    stage.add(box(1.4, 0.18, 1.0, C.wood));
    [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].forEach(([x, z]) => stage.add(cyl(0.03, 0.03, 0.9, C.white, 6, x, 0.18, z)));
    const canopy = cone(0.95, 0.5, C.coral, 4, 0, 1.05); canopy.rotation.y = Math.PI / 4; canopy.scale.set(1, 1, 0.75); stage.add(canopy);
    put(isl, 0, stage);
    // 氣球
    const balloons = [];
    [C.coral, C.sun, C.sky, C.pink, C.mint].forEach((c, k) => {
      const b = ball(0.12, c, 0, 0, 0, 1); b.scale.y = 1.2; balloons.push(b);
      put(isl, 0, b, -0.6 + k * 0.3, 0.5);
    });
    onTick((t) => balloons.forEach((b, k) => { b.position.y = isl.userData.tiles[0].y + 1.4 + Math.sin(t * 1.5 + k) * 0.08; }));
    put(isl, 1, house({ w: 0.7, wall: '#e6f6f4', roof: C.sky })); put(isl, 3, tree('round'));
    put(isl, 4, house({ w: 0.75, wall: C.cream, roof: C.mint }), 0, 0, 2); put(isl, 5, tree('pine'));
    put(isl, 2, lamp(), 0.2); put(isl, 6, tree('round', 0.8));
    for (let k = 0; k < 4; k++) put(isl, 0, person([C.sun, C.sky, C.pink, C.purple][k]), -0.5 + k * 0.33, 0.85);
  },
  home(isl) {
    const bro = put(isl, 1, house({ w: 1.0, h: 0.9, d: 0.8, wall: '#e7f0ff', roof: C.sky, roofH: 0.5, chimney: true }), 0, 0, 0.3);
    windowsOn(bro, 1.0, 0.4, 0.8, 1, 3, 0.45);
    const sis = put(isl, 5, house({ w: 1.0, h: 0.9, d: 0.8, wall: '#ffeef0', roof: C.pink, roofH: 0.5, chimney: true }), 0, 0, -0.3);
    windowsOn(sis, 1.0, 0.4, 0.8, 1, 3, 0.45);
    // 中央花園＋長桌
    const table = new THREE.Group(); table.add(box(0.8, 0.05, 0.35, C.wood, 0, 0.25));
    [[-0.35, -0.12], [0.35, -0.12], [-0.35, 0.12], [0.35, 0.12]].forEach(([x, z]) => table.add(box(0.04, 0.25, 0.04, C.woodDark, x, 0, z)));
    table.add(box(0.15, 0.03, 0.1, C.white, -0.15, 0.3)); table.add(box(0.12, 0.08, 0.1, C.sun, 0.2, 0.3));
    put(isl, 0, table);
    for (let k = 0; k < 4; k++) put(isl, 0, person([C.sky, C.pink, C.sky, C.pink][k]), (k % 2 ? 0.25 : -0.25), k < 2 ? -0.4 : 0.4);
    // 柵欄
    const fence = new THREE.Group();
    for (let k = 0; k < 6; k++) fence.add(box(0.05, 0.22, 0.04, C.white, -0.5 + k * 0.2));
    fence.add(box(1.1, 0.04, 0.03, C.white, 0, 0.14));
    put(isl, 6, fence, 0, 0.5);
    [2, 3, 4].forEach((i) => put(isl, i, tree('round', 0.8 + Math.random() * 0.3), 0.1, 0));
    put(isl, 6, tree('round', 0.7), -0.3, -0.1);
    put(isl, 3, lamp(), -0.4, 0.4);
    // 花
    for (let k = 0; k < 10; k++) put(isl, 6, ball(0.05, [C.pink, C.sun, C.coral][k % 3], 0, 0.06, 0), -0.6 + Math.random() * 1.2, -0.5 + Math.random() * 0.8);
  },
  garden(isl) {
    // 溫室
    const gh = new THREE.Group();
    gh.add(box(1.1, 0.5, 0.8, new THREE.MeshStandardMaterial({ color: '#d9f2ea', transparent: true, opacity: 0.6, roughness: 0.2 })));
    const r = gableRoof(1.1, 0.4, 0.8, '#c8eadf'); r.position.y = 0.5; r.material = new THREE.MeshStandardMaterial({ color: '#c8eadf', transparent: true, opacity: 0.7 }); gh.add(r);
    for (let k = 0; k < 5; k++) gh.add(ball(0.08, C.leaf2, -0.4 + k * 0.2, 0.15, 0));
    put(isl, 0, gh, 0, 0, 0.3);
    // 菜圃與向日葵
    [1, 2, 6].forEach((i) => {
      const bed = box(0.9, 0.08, 0.5, '#8a5a35'); put(isl, i, bed, 0, 0, i);
      for (let k = 0; k < 5; k++) {
        const sf = new THREE.Group();
        sf.add(cyl(0.015, 0.015, 0.4, C.leaf, 5));
        const head = ball(0.07, C.sun, 0, 0.42, 0); sf.add(head);
        put(isl, i, sf, -0.35 + k * 0.18, (k % 2 ? 0.1 : -0.1));
      }
    });
    // 橋（兒童 → 青少年）
    const bridge = new THREE.Group();
    for (let k = 0; k < 9; k++) { const p = box(0.18, 0.05, 0.5, C.wood, -0.8 + k * 0.2, Math.sin((k / 8) * Math.PI) * 0.25); bridge.add(p); }
    put(isl, 4, bridge, 0, 0, 0.8);
    put(isl, 3, tree('round', 1.1)); put(isl, 5, house({ w: 0.7, h: 0.5, wall: '#fff6e0', roof: C.leaf2 }), 0, 0, -0.5);
    put(isl, 3, lamp(), 0.4, 0.3);
    put(isl, 4, person(C.sun), -0.5, 0); put(isl, 4, person(C.sky), 0.5, 0);
    const small = person(C.pink); small.scale.setScalar(0.75); put(isl, 4, small, -0.3, 0.1);
  },
};
