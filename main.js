import * as THREE from 'three';
import { ISLANDS, taipeiNow, nextEvent, daysUntil, todaysGroups, isTentative } from './content.js';
import { createIslanders } from './islanders.js';
import { createCreator } from './creator.js';
import * as store from './store.js';
import { createFishing, remainingToday } from './fishing.js';
import * as staff from './staff.js';
import { createPeople } from './people.js';
import { createTsunami } from './tsunami.js';
import { createChlife } from './chlife.js';
import { createPrayer, load as loadPrayer, state as prayerState, onChange as onPrayerChange } from './prayer.js';
import { createTour } from './tour.js';
import { createPractice } from './practice.js';
import { createPassport } from './passport.js';
import { KIDS_ISLANDS, loadProfile, saveProfile, onProfile, canSeeKids, myRegion, setFolks } from './kids.js';
import { lambIslands, lambState, loadLambs, resetLambs, onLambs, createLambWorld, createLambCard, prayFor, fishNaming } from './lambs.js';
import { C, animators, ball, box, buildIsland, cone, cyl, flag, gableRoof, house, lamp, lampMat, mat, mesh, onTick, person, put, tree, windowMat, windowsOn } from './materials.js';
import { boat, camera, canvas, cloudMat, controls, DAY_FOG, hemi, HOME_POS, HOME_TARGET, LOW_END, NIGHT_FOG, renderer, scene, sun, water, waterMat } from './scene.js';
import { builders, STAFF_CENTER } from './buildings.js';

// ================= 擺放小島 =================
const RING = 9.6;
const LAMB_CENTER = new THREE.Vector3(-72, 0, 0);  // 小羊群島
const KIDS_CENTER = new THREE.Vector3(72, 0, 0);   // 台中的孩子群島（已畢業才看得到）
const islandObjs = [];
function placeIsland(def, center, ring, group) {
  let cx = center.x, cz = center.z;
  if (!def.center) { const a = THREE.MathUtils.degToRad(def.angle); cx += Math.cos(a) * ring; cz += -Math.sin(a) * ring; }
  const isl = buildIsland(def, cx, cz);
  isl.userData.group = group;
  const out = new THREE.Vector3(cx - center.x, 0, cz - center.z).normalize();
  isl.userData.outward = out;
  // 最外側的磚（給碼頭用）
  let best = 0, bestD = -Infinity;
  isl.userData.tiles.forEach((t, i) => { const d = t.x * out.x + t.z * out.z; if (d > bestD) { bestD = d; best = i; } });
  isl.userData.edgeTile = best;
  builders[def.id](isl);
  isl.userData.id = def.id;
  isl.userData.def = def;
  isl.userData.lift = 0;
  isl.userData.phase = Math.random() * Math.PI * 2;
  scene.add(isl);
  islandObjs.push(isl);
  return isl;
}
// 木棧橋：中央 → 各島
function bridge(isl, center, ring) {
  const dir = isl.position.clone().sub(center).normalize();
  const len = ring - 5.0;
  const start = center.clone().addScaledVector(dir, 2.5);
  const planks = [];
  const n = Math.round(len / 0.24);
  const ang = Math.atan2(dir.x, dir.z);
  for (let k = 0; k <= n; k++) {
    const p = start.clone().addScaledVector(dir, k * 0.24);
    const plank = box(0.55, 0.05, 0.16, k % 2 ? C.wood : '#c48f5c');
    plank.position.set(p.x, -0.12 + Math.sin((k / n) * Math.PI) * 0.12, p.z);
    plank.rotation.y = ang;
    scene.add(plank);
    planks.push(plank);
  }
  return planks;
}
ISLANDS.forEach((def) => placeIsland(def, HOME_TARGET, RING, 'main'));
islandObjs.slice(1).forEach((isl) => bridge(isl, HOME_TARGET, RING));

// ================= 島民 =================
const islanders = createIslanders({ islands: islandObjs, onTick, lowEnd: LOW_END });

// ================= 標籤（Pins）=================
const pinsEl = document.getElementById('pins');
addEventListener('resize', () => pinEls.forEach((el) => { el._w = 0; }));
const pinEls = [];
function makePin(isl) {
  const def = isl.userData.def;
  const el = document.createElement('button');
  el.className = 'pin';
  el.tabIndex = -1;
  el.innerHTML = `<span class="em" style="--c:${def.tint}">${def.emoji}</span><span class="pn">${def.short || def.name}</span><span class="badge" hidden></span>`;
  el.title = def.name;
  el.addEventListener('click', () => openIsland(def.id));
  el.addEventListener('pointerenter', () => { hovered = isl; });
  el.addEventListener('pointerleave', () => { if (hovered === isl) hovered = null; });
  pinsEl.appendChild(el);
  pinEls.push(el);
  return el;
}
islandObjs.forEach(makePin);

// ================= 渡輪碼頭：搭船去其他群島（沒有權限的群島不顯示） =================
// 碼頭都放在鏡頭正前方（308°）附近的海邊，手機直式畫面也看得到
const RETURN_DOCK = { lamb: 308, kids: 308, staff: 308 };
const ferries = [];
function ferryDock(from, center, angle, to) {
  const a = THREE.MathUtils.degToRad(angle);
  const dir = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
  const g = new THREE.Group();
  for (let k = 0; k < 6; k++) g.add(box(0.55, 0.05, 0.22, k % 2 ? C.wood : '#c48f5c', 0, 0, -0.6 + k * 0.24));
  [-0.3, 0.3].forEach((x) => [-0.6, 0.6].forEach((z) => g.add(cyl(0.035, 0.035, 0.5, C.woodDark, 6, x, -0.4, z))));
  const b = boat({ lamb: C.mint, kids: C.sun, staff: C.purple, main: C.coral }[to]);
  b.position.set(0.62, -0.42, 0.1); b.rotation.y = Math.PI / 2; g.add(b);
  g.position.copy(center).addScaledVector(dir, from === 'main' ? 15.6 : 11.2);
  g.position.y = -0.12;
  g.rotation.y = Math.atan2(dir.x, dir.z);
  scene.add(g);
  onTick((t) => { b.position.y = -0.42 + Math.sin(t * 2 + angle) * 0.04; b.rotation.x = Math.sin(t * 1.6 + angle) * 0.05; });
  const el = document.createElement('button');
  el.className = 'pin ferry hidden';
  el.tabIndex = -1;
  const label = to === 'main' ? '回青少年群島' : ARCHES[to].label.replace(/^\S+\s/, '搭船去');
  el.innerHTML = `<span class="em" style="--c:#dbeefc">⛵</span><span class="pn">${label}</span>`;
  el.title = label;
  el.addEventListener('click', () => switchArch(to));
  pinsEl.appendChild(el);
  ferries.push({ from, to, g, el, isl: from === 'main' ? null : islandObjs.find((i) => i.userData.group === from) });
  return g;
}
const canGo = (to) => !!ARCHES[to] && (!ARCHES[to].staffOnly || staffAccess) && (!ARCHES[to].gradOnly || canSeeKids() || staffAccess);
function updateFerries(w, h) {
  for (const f of ferries) {
    const ok = canGo(f.to);
    f.g.visible = ok && (!f.isl || f.isl.visible);
    tmpV.copy(f.g.position); tmpV.y += 1.6; tmpV.project(camera);
    const vis = ok && arch === f.from && tmpV.z < 1 && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05;
    f.el.classList.toggle('hidden', !vis);
    if (!vis) continue;
    const half = (f.el.offsetWidth || 160) / 2 + 8;   // 標籤不超出畫面左右邊緣
    f.el.style.transform = `translate(${Math.min(w - half, Math.max(half, (tmpV.x * 0.5 + 0.5) * w))}px, ${(-tmpV.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
  }
}

// 自己島民頭上的名字
const mePin = document.createElement('div');
mePin.className = 'pin me hidden';
pinsEl.appendChild(mePin);
// 名字標籤：滑鼠經過時只顯示名字；點一下變成小卡片，可以檢舉（管理員可隱藏）
const whoPin = document.createElement('div');
whoPin.className = 'pin who hidden';
pinsEl.appendChild(whoPin);
let whoCard = false, whoShown = null;
function renderWho(p, card) {
  whoPin.classList.toggle('card', card);
  whoPin.innerHTML = '<b class="who-name"></b>';
  whoPin.querySelector('.who-name').textContent = p.name; // 暱稱一律當純文字
  if (card && store.cloudEnabled && p.pid) {
    whoPin.insertAdjacentHTML('beforeend', `<div class="who-acts"><button data-who="report">🚩 檢舉</button>${isAdminNow ? '<button data-who="hide">隱藏</button>' : ''}</div><div class="who-msg" role="status"></div>`);
  }
  whoShown = p;
}
function openWhoCard(p) { whoCard = true; namePerson = p; nameUntil = Infinity; renderWho(p, true); }
function closeWhoCard() { whoCard = false; namePerson = null; whoShown = null; }
whoPin.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b || !whoShown) return;
  const p = whoShown;
  const msg = whoPin.querySelector('.who-msg');
  if (b.dataset.who === 'report') {
    if (!store.myUid()) { msg.textContent = '請先登入（👤 我的島民），或私訊 IG @tc_yp 檢舉。'; return; }
    whoPin.querySelector('.who-acts').innerHTML = store.REPORT_REASONS.map(([k, l]) => `<button data-reason="${k}">${l}</button>`).join('');
    return;
  }
  if (b.dataset.reason) {
    try { await store.report(p.pid, b.dataset.reason); msg.textContent = '已收到，謝謝你。管理員會處理。'; whoPin.querySelector('.who-acts').innerHTML = ''; } catch { msg.textContent = '送出失敗，請稍後再試。'; }
    return;
  }
  if (b.dataset.who === 'hide') {
    try { await store.adminSetHidden(p.pid, true); islanders.removeOther(p.pid); closeWhoCard(); } catch { msg.textContent = '隱藏失敗。'; }
  }
});
function updateWhoPin(w, h) {
  const p = namePerson;
  if (!p || performance.now() > nameUntil || p.mine || !p.mesh.parent) {
    whoPin.classList.add('hidden');
    if (whoCard && (!p || !p.mesh.parent)) closeWhoCard();
    return;
  }
  if (whoShown !== p || whoPin.classList.contains('card') !== whoCard) renderWho(p, whoCard);
  p.mesh.getWorldPosition(tmpV);
  tmpV.y += 0.5;
  tmpV.project(camera);
  whoPin.classList.toggle('hidden', tmpV.z >= 1);
  whoPin.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
}
function updateMePin(w, h) {
  const me = islanders.mine();
  if (!me) { mePin.classList.add('hidden'); return; }
  me.mesh.getWorldPosition(tmpV);
  tmpV.y += 0.55;
  tmpV.project(camera);
  const vis = tmpV.z < 1 && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05;
  mePin.classList.toggle('hidden', !vis);
  mePin.textContent = `👤 ${me.name || '我'}`;
  mePin.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * w}px, ${(-tmpV.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
}

// 其他島民頭上的暱稱：只顯示離鏡頭最近的幾位，避免畫面太亂
const MAX_TAGS = 30;
const tagEls = [];
function tagEl(i) {
  if (!tagEls[i]) {
    const el = document.createElement('div');
    el.className = 'pin tag hidden';
    pinsEl.appendChild(el);
    tagEls[i] = el;
  }
  return tagEls[i];
}
const tagPos = new THREE.Vector3();
function updateTags(w, h) {
  let shown = [];
  if (arch === 'main' && (people.tagsOn() || people.isOpen())) {   // 預設不顯示，打開島民名單時才顯示
    for (const p of islanders.real()) {
      if (!p.name || p === namePerson || !p.mesh.parent) continue;
      p.mesh.getWorldPosition(tagPos);
      const d = tagPos.distanceToSquared(camera.position);
      tagPos.y += 0.5;
      tagPos.project(camera);
      if (tagPos.z >= 1 || Math.abs(tagPos.x) > 1.02 || Math.abs(tagPos.y) > 1.02) continue;
      shown.push({ p, d, x: (tagPos.x * 0.5 + 0.5) * w, y: (-tagPos.y * 0.5 + 0.5) * h });
    }
    shown.sort((a, b) => a.d - b.d);
    shown = shown.slice(0, MAX_TAGS);
  }
  shown.forEach((s, i) => {
    const el = tagEl(i);
    if (el._p !== s.p || el.textContent !== s.p.name) { el.textContent = s.p.name; el._p = s.p; } // 暱稱一律當純文字
    el.classList.remove('hidden');
    el.classList.toggle('far', s.d > 45 * 45);
    el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
    el.style.zIndex = String(Math.max(1, 60 - Math.round(Math.sqrt(s.d)))); // 壓在小島標籤下面
  });
  for (let i = shown.length; i < tagEls.length; i++) { tagEls[i].classList.add('hidden'); tagEls[i]._p = null; }
}

// 下方目錄
const dock = document.getElementById('dock');
let myPid = null;
let isAdminNow = false;
const creator = createCreator({
  initial: null,
  account: {
    enabled: store.cloudEnabled,
    inAppBrowser: store.inAppBrowser,
    signIn: store.signIn,
    signOut: store.signOutUser,
    reasons: store.REPORT_REASONS,
    deleteMine: async () => { await saveProfile(null, store.myUid()); await store.deleteMine(); islanders.clearMine(); creator.setAvatar(null); },
    adminReports: store.adminReports,
    adminSetHidden: async (pid, hidden) => { await store.adminSetHidden(pid, hidden); refreshOthers(true); },
    adminClear: store.adminClearReports,
  },
  // 先寫雲端，成功後才更新島上的樣子（失敗時兩邊保持一致）
  onSave: async (cfg, p) => {
    await saveProfile(p, store.myUid());   // 身分不公開，存在代禱網後台（沒登入只存本機）
    const a = { ...cfg, region: myRegion(p) };   // 只公開分區（北中南東）
    const res = await store.saveMine(a);
    if (res.publicId) { myPid = res.publicId; islanders.removeOther(myPid); }
    islanders.setMine(a);
    syncKids();
    focusMine();
  },
});

// 帳號切換：每次都先清掉上一位的島民與編輯狀態；非同步結果回來時，帳號已經換了就丟掉
let authGen = 0;
store.onUser(async (u) => {
  const gen = ++authGen;
  refreshStaffAccess(u);
  loadProfile(u?.uid || null);
  prayer.userChanged();
  practice.userChanged();
  passport.userChanged();
  lambReturn = null; lambCard.close();
  resetLambs();
  if (u && arch === 'lamb') loadLambs();
  myPid = null;
  isAdminNow = false;
  closeWhoCard();
  islanders.clearMine();
  creator.setUser(u);
  if (!u) {
    const guest = store.loadDraft();
    creator.setAvatar(guest);
    if (guest) islanders.setMine(guest);
    return;
  }
  const cached = store.loadDraft(u.uid);
  creator.setAvatar(cached);
  if (cached) islanders.setMine(cached);
  try {
    const [mine, admin] = await Promise.all([store.loadMyIslander(), store.isAdmin()]);
    if (gen !== authGen) return;
    isAdminNow = admin;
    creator.setAdmin(admin);
    if (mine) {
      islanders.setMine(mine.avatar);
      creator.setAvatar(mine.avatar);
      creator.setHidden(mine.hidden);
      if (mine.legacy) {
        const res = await store.saveMine(mine.avatar); // 舊版資料搬到新格式
        if (gen !== authGen) return;
        myPid = res.publicId;
      } else myPid = mine.publicId;
      islanders.removeOther(myPid);
      return;
    }
    // 雲端沒有這個帳號的島民：清掉過期的快取；訪客草稿要本人同意才發布
    store.saveDraft(null, u.uid);
    islanders.clearMine();
    creator.setAvatar(null);
    const guest = store.loadDraft();
    if (guest && confirm(`這台裝置上有一個登入前捏的島民「${guest.name || '未命名'}」。\n要把它放到你的帳號，公開在島上嗎？`)) {
      const res = await store.saveMine(guest);
      if (gen !== authGen) return;
      myPid = res.publicId;
      store.saveDraft(null);
      islanders.setMine(guest);
      creator.setAvatar(guest);
    }
  } catch (err) { console.error(err); }
});

// 右側的島民名單
const peopleBtn = document.getElementById('peopleBtn');
const people = createPeople({
  list: () => islanders.real(),
  mine: () => islanders.mine(),
  onOpen: () => { closePanel(); setMenu(false); peopleBtn.setAttribute('aria-expanded', 'true'); },
  onFind: (p) => {
    if (isMobile()) people.close();
    flyToPerson(p);
    if (!p.mine) openWhoCard(p);
  },
});
peopleBtn.addEventListener('click', () => { if (people.isOpen()) people.close(); else people.open(); });
new MutationObserver(() => { if (!people.isOpen()) peopleBtn.setAttribute('aria-expanded', 'false'); })
  .observe(document.getElementById('people'), { attributes: true, attributeFilter: ['hidden'] });

// 台中的孩子分區島：住著有分區的島民（自己也在自己那一區）
let lastOthers = [];
let kidsFolks = null;
function syncKids() {
  const list = lastOthers.filter((x) => x.avatar.region && x.pid !== myPid);
  const me = islanders.mine()?.cfg;
  setFolks([...list.map((x) => ({ name: x.avatar.name, region: x.avatar.region })), ...(me?.region ? [{ name: me.name, region: me.region, mine: true }] : [])]);
  if (kidsFolks) { kidsFolks.setOthers(list); if (me) kidsFolks.setMine(me); else kidsFolks.clearMine(); }
  if (selected?.userData.group === 'kids') renderPanel();
}
// 其他人的島民：打開時讀一次，之後每 10 分鐘（畫面在前景時）更新；本機有 10 分鐘快取
async function refreshOthers(force = false) {
  try {
    const list = await store.loadOthers({ force });
    lastOthers = list;
    islanders.setOthers(list, { exclude: myPid });
    people.refresh();
    syncKids();
  } catch (err) { console.error('讀取島民失敗', err); }
}
refreshOthers();
setInterval(() => { if (document.visibilityState === 'visible') refreshOthers(); }, 10 * 60 * 1000 + 5000);
// 切回這個分頁時也檢查一次（快取沒過期就不會讀雲端）
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshOthers(); });
// 選單：點「小島目錄」展開所有小島
const menu = document.getElementById('menu');
const menuBtn = document.getElementById('menuBtn');
function setMenu(open) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) { people.close(); renderArchMenu(); }
  if (open) (dock.querySelector('.on') || dock.firstElementChild)?.focus();
}
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
document.getElementById('menuClose').addEventListener('click', () => { setMenu(false); menuBtn.focus(); });
// 「我的」：我的島民
document.getElementById('meBtn').addEventListener('click', () => { setMenu(false); people.close(); creator.open(); });
// 聚會、活動：不管在哪個群島，都直接打開青少年群島的那座島
function goIsland(id) {
  setMenu(false);
  if (arch !== 'main') { switchArch('main'); setTimeout(() => openIsland(id), 1700); } else openIsland(id);
}
document.getElementById('meetBtn').addEventListener('click', () => goIsland('campus'));
document.getElementById('eventBtn').addEventListener('click', () => goIsland('calendar'));
// 釣魚
const fishing = createFishing({ naming: fishNaming({ signedIn: () => !!store.myUid(), signIn: () => store.signIn().catch(() => {}) },
  (what) => { if (what === 'add') { fishing.close(); prayer.open('add'); } }) });
onLambs(() => fishing.refresh());
onPrayerChange(() => fishing.refresh());
const fishCount = document.getElementById('fishCount');
const fishBtn = document.getElementById('fishBtn');
const updateFishCount = () => { const n = remainingToday(); fishCount.textContent = `${n}`; fishBtn.classList.toggle('has-left', n > 0); fishBtn.setAttribute('aria-label', `釣魚，今天還剩 ${n} 次`); };
updateFishCount();
function openFishing() { setMenu(false); fishing.open(); }
fishBtn.addEventListener('click', openFishing);
new MutationObserver(updateFishCount).observe(document.querySelector('.fishing'), { attributes: true, attributeFilter: ['hidden'] });
addEventListener('pointerdown', (e) => {
  if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
});
function renderMenu() {
  dock.innerHTML = '';
  ARCHES[arch].islands().filter((d) => !d.alias).forEach((d) => {
    const b = document.createElement('button');
    b.dataset.id = d.id;
    b.innerHTML = `<span class="mi-em" aria-hidden="true">${d.emoji}</span><span class="mi-text"><b>${d.short}</b>${d.name !== d.short ? `<small>${d.name}</small>` : ''}</span>`;
    b.addEventListener('click', () => { setMenu(false); openIsland(d.id); });
    dock.appendChild(b);
  });
  document.querySelector('.menu-head b').textContent = ARCHES[arch].menuTitle;
}

// ================= 群島 =================
// 青少年群島（大家）、小羊群島（大家；小羊要登入）、服事者群島（資料夾共用名單裏的人）
let arch = 'main';
let staffAccess = false;
const archExtras = { staff: [], lamb: [], kids: [] };
const built = { main: true, staff: false, lamb: false, kids: false };
const archMenu = document.getElementById('archMenu');   // 目錄最上方的群島分頁
const lambIslandDefs = lambIslands({ signedIn: () => !!store.myUid() });
let lambWorld = null;
const ARCHES = {
  main: { label: '🏝️ 青少年群島', sub: '活動、聚會與大家的島民', center: HOME_TARGET, menuTitle: '小島目錄', islands: () => ISLANDS },
  lamb: { label: '🐑 小羊群島', sub: '代禱牆與你的小羊牧場', center: LAMB_CENTER, menuTitle: '小羊群島', islands: () => lambIslandDefs, home: 'lb-altar' },
  kids: { label: '🎓 台中的孩子群島', sub: '給在外地讀書的台中孩子', center: KIDS_CENTER, menuTitle: '台中的孩子群島', islands: () => KIDS_ISLANDS, home: 'kd-hub', gradOnly: true },
  staff: { label: '🗝️ 服事者群島', sub: '內部消息與統計', center: STAFF_CENTER, menuTitle: '服事者群島', islands: () => staff.STAFF_ISLANDS, home: 'st-hub', staffOnly: true },
};
[['lamb', 283], ['staff', 308], ['kids', 333]].forEach(([to, ang]) => ferryDock('main', HOME_TARGET, ang, to));
function buildArch(key) {
  if (built[key]) return;
  built[key] = true;
  const center = ARCHES[key].center, ring = 7.5;
  ARCHES[key].islands().forEach((def) => makePin(placeIsland(def, center, ring, key)));
  islandObjs.filter((i) => i.userData.group === key && !i.userData.def.center).forEach((isl) => archExtras[key].push(...bridge(isl, center, ring)));
  archExtras[key].push(ferryDock(key, center, RETURN_DOCK[key], 'main'));
  if (key === 'kids') {
    const regionIsl = Object.fromEntries(islandObjs.filter((i) => i.userData.group === 'kids' && !i.userData.def.center).map((i) => [i.userData.id, i]));
    const at = (cfg) => regionIsl[cfg.region] || null;
    kidsFolks = createIslanders({ islands: Object.values(regionIsl), onTick, lowEnd: LOW_END, target: 0, placeOf: at, mineAt: at });
    syncKids();
  }
  if (key === 'lamb') {
    lambWorld = createLambWorld({ islands: islandObjs.filter((i) => i.userData.group === 'lamb' && !i.userData.def.center && i.userData.id !== 'lb-water'), onTick, pinsEl, camera, lowEnd: LOW_END });
    syncLambWorld();
  }
}
function setArchVisible(key, v) {
  if (key === 'main') return;   // 青少年群島一直都在（離得很遠，看不到）
  islandObjs.forEach((i) => { if (i.userData.group === key) i.visible = v; });
  archExtras[key].forEach((o) => { o.visible = v; });
}
const archCenter = () => ARCHES[arch].center;
function homeView() { const c = archCenter(); return [HOME_POS.clone().add(c), c.clone()]; }
function renderArchMenu() {
  archMenu.innerHTML = Object.entries(ARCHES).filter(([, a]) => (!a.staffOnly || staffAccess) && (!a.gradOnly || canSeeKids() || staffAccess)).map(([k, a]) =>
    `<button data-arch="${k}" title="${a.sub}"${k === arch ? ' aria-current="true" class="on"' : ''}>${a.label}</button>`).join('');
}
archMenu.addEventListener('click', (e) => {
  const b = e.target.closest('[data-arch]');
  if (b && b.dataset.arch !== arch) switchArch(b.dataset.arch);
});
function switchArch(to) {
  if (to === arch || !ARCHES[to]) return;
  if (ARCHES[to].staffOnly && !staffAccess) return;
  if (ARCHES[to].gradOnly && !canSeeKids() && !staffAccess) return;
  closePanel();
  people.close();
  setMenu(false);
  lambReturn = null; lambCard.close();
  const from = arch;
  arch = to;
  buildArch(to);
  if (to === 'kids') syncKids();
  setArchVisible(to, true);
  sun.position.copy(archCenter()).add(new THREE.Vector3(18, 30, 12));
  sun.target.position.copy(archCenter());
  renderMenu();
  document.body.classList.toggle('staff-mode', to === 'staff');
  document.body.classList.toggle('lamb-mode', to === 'lamb');
  stopAuto();
  flyTo(...homeView(), 1.6);
  if (ARCHES[to].home) setTimeout(() => { if (arch === to) openIsland(ARCHES[to].home); }, 1700);
  if (to === 'staff') {
    if (staff.state.status !== 'ready') staff.loadDashboard().then(() => { if (selected?.userData.group === 'staff') renderPanel(); });
    if (staff.chlifeState.status === 'idle') staff.loadChlife().then(() => { if (selected?.userData.id === 'st-hub') renderPanel(); });
  }
  if (to === 'lamb') {
    if (prayerState.status === 'idle') loadPrayer();
    if (store.myUid() && (lambState.status === 'idle' || Date.now() - lambState.loadedAt > 30000)) loadLambs();
  }
  if (from !== 'main') setTimeout(() => { if (arch !== from) setArchVisible(from, false); }, 1700);
}
async function refreshStaffAccess(u) {
  staffAccess = false;
  staff.reset();
  chlife.close();
  if (arch === 'staff') switchArch('main');
  if (!menu.hidden) renderArchMenu();
  if (!u || !staff.staffEnabled) return;
  if (await staff.checkStaff()) { staffAccess = true; if (!menu.hidden) renderArchMenu(); }
}
renderMenu();
// 身分變了：更新捏臉畫面與群島分頁；不再是已畢業／服事者就離開台中的孩子群島
onProfile((p) => {
  creator.setProfile(p);
  if (arch === 'kids' && !canSeeKids() && !staffAccess) switchArch('main');
  if (!menu.hidden) renderArchMenu();
  syncKids();
});

// 小羊：資料變了就更新牧場、面板、卡片
function syncLambWorld() {
  if (!lambWorld) return;
  const d = store.myUid() ? lambState.data : null;
  lambWorld.sync(d ? d.lambs.filter((l) => l.b) : null);   // 牧場上只有受浸的小羊；小魚在魚缸
  lambWorld.setFlowers(d ? d.totalPrayers : 0);
}
// 從牧場清單打開小羊卡片：關掉卡片後回到原來的清單和捲動位置（不是回全景）
let lambReturn = null;
const lambListSpot = () => (selected ? { id: selected.userData.id, scroll: panelBody.scrollTop } : null);
const lambCard = createLambCard({
  onClose: () => {
    const r = lambReturn;
    lambReturn = null;
    if (!r || arch !== 'lamb') return;
    if (selected && selected.userData.id !== r.id) return;   // 中途點了別的島，就留在那裡
    if (!selected) openIsland(r.id);
    panelBody.scrollTop = r.scroll;
  },
  onPray: async (key) => {
    const m = await prayFor(key);
    lambWorld?.celebrate(key);
    const d = lambState.data;
    if (d && d.lambs.length && d.lambs.every((l) => l.prayedToday)) allPrayedParty();
    return m;
  },
});
let partyDay = '';
function allPrayedParty() {
  if (partyDay === lambState.data.today) return;
  partyDay = lambState.data.today;
  const el = document.createElement('div');
  el.className = 'lamb-party';
  el.innerHTML = '<div class="lp-burst" aria-hidden="true">' + '🎉✨💖🐑🌸⭐'.repeat(4).split('').map((c, i) => `<i style="--a:${i * 15}deg;--d:${(i % 5) * 60}ms">${c}</i>`).join('') + '</div><p role="status">今天每一位朋友都被記念了！</p>';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
onLambs(() => {
  syncLambWorld();
  if (selected?.userData.group === 'lamb') { const st = panelBody.scrollTop; renderPanel(); panelBody.scrollTop = st; }
});
onPrayerChange(() => { if (selected?.userData.id === 'lb-altar') { const st = panelBody.scrollTop; renderPanel(); panelBody.scrollTop = st; } });

// ================= 互動 =================
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let hovered = null;
let selected = null;
let downAt = null;

function pickIsland(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(islandObjs.filter((i) => i.userData.group === arch), true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.id) o = o.parent;
  return o;
}
// 指到（或點到）有暱稱的島民，頭上顯示名字
let namePerson = null, nameUntil = 0;
function pickPerson(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(kidsFolks ? [...islanders.meshes(), ...kidsFolks.meshes()] : islanders.meshes(), false)[0];
  const p = hit?.object.userData.person;
  return p && (p.name || p.mine) ? p : null;
}
let lastPick = 0;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  hovered = pickIsland(e);
  const now = performance.now();
  if (now - lastPick > 80) {
    lastPick = now;
    const p = pickPerson(e);
    if (p && !whoCard) { namePerson = p; nameUntil = now + 400; }
  }
  canvas.style.cursor = hovered ? 'pointer' : 'grab';
});
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; stopAuto(); });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;
  if (arch === 'lamb' && lambWorld) {
    const key = lambWorld.pick(e, canvas);
    if (key) { lambCard.open(key); return; }
  }
  const who = pickPerson(e);
  if (who) { openWhoCard(who); return; }
  if (whoCard) { closeWhoCard(); return; }
  const isl = pickIsland(e);
  if (isl) openIsland(isl.userData.id); else closePanel();
});

// 鏡頭飛行
let fly = null;
function flyTo(pos, target, dur = 1.1) {
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), dur: dur * 1000 };
}
const ease = (x) => 1 - Math.pow(1 - x, 3);
function stopAuto() { controls.autoRotate = false; }

// ================= 面板 =================
const panel = document.getElementById('panel');
const panelBody = document.getElementById('panelBody');
const state = {};
const isMobile = () => innerWidth <= 720;

function renderPanel() {
  if (!selected) return;
  const def = selected.userData.def;
  panelBody.innerHTML = def.render(taipeiNow(), state);
}
function openIsland(id) {
  id = islandObjs.find((i) => i.userData.id === id)?.userData.def.alias || id;   // 風景島打開它所屬的入口
  const isl = islandObjs.find((i) => i.userData.id === id);
  if (!isl) return;
  people.close();
  if (id === 'lb-altar' && prayerState.status === 'idle') loadPrayer();
  stopAuto();
  selected = isl;
  renderPanel();
  panelBody.scrollTop = 0;
  panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('panel-open');
  [...dock.children].forEach((b) => {
    const on = b.dataset.id === id;
    b.classList.toggle('on', on);
    b.toggleAttribute('aria-current', on);
  });
  panel.setAttribute('aria-label', isl.userData.def.name);
  panel.removeAttribute('inert');
  panelBody.querySelector('h2')?.setAttribute('tabindex', '-1');
  panelBody.querySelector('h2')?.focus({ preventScroll: true });
  const c = isl.position.clone();
  // 讓小島避開面板：桌機往左偏、手機往上偏
  const target = c.clone();
  if (isMobile()) target.y -= 3.2; else {
    const right = new THREE.Vector3().subVectors(camera.position, controls.target).cross(new THREE.Vector3(0, 1, 0)).normalize();
    target.addScaledVector(right, -2.8);
  }
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0).normalize();
  const dist = isMobile() ? 1.25 : 1;
  const pos = target.clone().add(new THREE.Vector3(dir.x * 17 * dist, 15 * dist, dir.z * 17 * dist));
  flyTo(pos, target);
  history.replaceState(null, '', '#' + id);
}
function closePanel() {
  if (!selected) return;
  selected = null;
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('inert', '');
  panel.style.transform = '';
  document.body.classList.remove('panel-open');
  [...dock.children].forEach((b) => { b.classList.remove('on'); b.removeAttribute('aria-current'); });
  history.replaceState(null, '', location.pathname);
}
// 鏡頭飛到自己的島民
function focusMine() {
  const me = islanders.mine();
  if (me) flyToPerson(me);
}
// 鏡頭飛到某隻小羊
function flyToLamb(key) {
  const p = lambWorld?.worldPos(key, new THREE.Vector3());
  if (!p) return;
  closePanel();
  stopAuto();
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0).normalize();
  flyTo(p.clone().add(new THREE.Vector3(dir.x * 6, 5, dir.z * 6)), p, 1.2);
}
// 鏡頭飛到某位島民（桌機開著名單時，讓他避開右側的名單）
function flyToPerson(person) {
  closePanel();
  stopAuto();
  const p = new THREE.Vector3();
  person.mesh.getWorldPosition(p);
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target).setY(0).normalize();
  const target = p.clone();
  if (people.isOpen() && !isMobile()) target.addScaledVector(new THREE.Vector3(-dir.z, 0, dir.x), 1.6);
  flyTo(target.clone().add(new THREE.Vector3(dir.x * 7, 6, dir.z * 7)), target, 1.2);
}
function goHome() {
  closePanel();
  flyTo(...homeView(), 1.3);
}
document.getElementById('panelClose').addEventListener('click', goHome);
// 手機：從面板頂端往下拖可關閉
{
  let y0 = null, dy = 0;
  const startDrag = (e) => { if (!isMobile() || panelBody.scrollTop > 0) return; y0 = e.clientY; dy = 0; panel.style.transition = 'none'; };
  panel.addEventListener('pointerdown', (e) => { if (e.target.closest('.panel-grip, .p-hero')) { startDrag(e); panel.setPointerCapture(e.pointerId); } });
  panel.addEventListener('pointermove', (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const endDrag = () => {
    if (y0 == null) return;
    y0 = null;
    panel.style.transition = '';
    panel.style.transform = '';
    if (dy > 90) goHome();
  };
  panel.addEventListener('pointerup', endDrag);
  panel.addEventListener('pointercancel', endDrag);
}
document.getElementById('homeBtn').addEventListener('click', goHome);
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!menu.hidden) { setMenu(false); menuBtn.focus(); return; }
  goHome();
});
panelBody.addEventListener('input', (e) => { if (e.target.dataset.staff === 'q') staff.filterFiles(panelBody, e.target.value); });
panelBody.addEventListener('click', (e) => {
  if (e.target.closest('[data-open="fishing"]')) return openFishing();
  if (e.target.closest('[data-open="chlife"]')) return chlife.open();
  if (e.target.closest('[data-open="passport"]')) return passport.open();
  if (e.target.closest('[data-open="prayer"]')) return prayer.open('wall');
  if (e.target.closest('[data-open="prayer-add"]')) return prayer.open('add');
  if (e.target.closest('[data-open="signin"]')) return store.signIn().catch(() => {});
  const lp = e.target.closest('[data-lamb-pray]');
  if (lp) { const back = lambListSpot(); if (isMobile()) closePanel(); lambCard.open(lp.dataset.lambPray); lambReturn = back; return; }
  const lo = e.target.closest('[data-lamb-open]');
  if (lo) { const back = lambListSpot(); lambCard.open(lo.dataset.lambOpen); flyToLamb(lo.dataset.lambOpen); lambReturn = back; return; }
  const stTab = e.target.closest('[data-staff-tab]');
  if (stTab) { staff.setTab(stTab.dataset.staffTab); renderPanel(); return; }
  if (e.target.closest('[data-staff="refresh"]')) { staff.loadDashboard(true).then(renderPanel); renderPanel(); return; }
  const g = e.target.closest('[data-goto]');
  if (g) {
    const anchor = g.dataset.anchor;
    if (selected?.userData.id !== g.dataset.goto) openIsland(g.dataset.goto);
    if (anchor) panelBody.querySelector('#' + anchor)?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const tab = e.target.closest('[data-tabs] button');
  if (tab) {
    const key = tab.parentElement.dataset.tabs;
    const v = tab.dataset.v;
    state[key] = v === 'all' ? 'all' : +v;
    const st = panelBody.scrollTop;
    renderPanel();
    panelBody.scrollTop = st;
  }
});

// ================= 即時資訊列 =================
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const liveToday = document.getElementById('liveToday');
const liveNext = document.getElementById('liveNext');
const clockEl = document.getElementById('clock');
liveToday.addEventListener('click', () => { state.campusDay = undefined; openIsland('campus'); });
liveNext.addEventListener('click', () => openIsland('calendar'));
let lastMinute = -1;
let alertEv = null;   // 海嘯警報條已經在提醒的活動，上方資訊列就不再重複倒數
function updateLive() {
  const n = taipeiNow();
  clockEl.textContent = `${String(n.hour).padStart(2, '0')}:${String(n.minute).padStart(2, '0')}`;
  if (n.minute === lastMinute) return;
  lastMinute = n.minute;
  const g = todaysGroups(n.day);
  liveToday.innerHTML = `週${WD[n.day]}・今天有 <b>${g.campus.length}</b> 個校園排、<b>${g.community.length}</b> 個社區排`;
  const ev = nextEvent(n.date);
  liveNext.hidden = !ev || ev === alertEv;
  if (ev) {
    const d = daysUntil(ev.start, n.date);
    const date = `${+ev.start.slice(5, 7)}/${+ev.start.slice(8, 10)}`;
    liveNext.innerHTML = d <= 0 ? `<b>進行中</b>：${ev.title}`
      : isTentative(ev) ? `下一場：${ev.title} ${date} <b>（暫定）</b>` : `下一場：${ev.title} ${date} <b>倒數 ${d} 天</b>`;
  } else liveNext.textContent = '';
  pinEls.forEach((el, i) => {
    const def = islandObjs[i].userData.def;
    const badge = el.querySelector('.badge');
    const txt = def.badge ? def.badge(n) : '';
    badge.hidden = !txt; badge.textContent = txt;
    el._w = 0;
  });
  if (selected) { const st = panelBody.scrollTop; renderPanel(); panelBody.scrollTop = st; }
  if (autoNight) setNight(n.hour >= 18 || n.hour < 6);
  updateFishCount();
}

// ================= 日夜 =================
let night = false, autoNight = true, nightK = 0;
const nightBtn = document.getElementById('nightBtn');
function setNight(v) {
  night = v;
  document.documentElement.classList.toggle('night', v);
  nightBtn.textContent = v ? '☀️' : '🌙';
}
nightBtn.addEventListener('click', () => { autoNight = false; setNight(!night); });

// ================= 迴圈 =================
const clock = new THREE.Clock();
const tmpV = new THREE.Vector3();
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 42 : 30;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// 釣魚或捏島民的視窗打開時，暫停後面的 3D 畫面（省電，也讓 QTE 在低階手機上反應即時）
const overlays = () => document.querySelector('.fishing:not([hidden]), .creator:not([hidden]), .chlife:not([hidden]), .prayer:not([hidden]), .practice:not([hidden])');
function frame() {
  if (overlays()) { clock.getDelta(); requestAnimationFrame(frame); return; }
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (fly) {
    const k = Math.min(1, (performance.now() - fly.start) / fly.dur);
    const e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) fly = null;
  }
  controls.update();

  animators.forEach((fn) => fn(t, dt));

  // 島嶼浮動＋hover 抬升
  islandObjs.forEach((isl) => {
    const want = (isl === hovered || isl === selected) ? 0.35 : 0;
    isl.userData.lift += (want - isl.userData.lift) * Math.min(1, dt * 8);
    isl.position.y = Math.sin(t * 0.8 + isl.userData.phase) * 0.04 + isl.userData.lift;
  });

  // 日夜漸變
  nightK += ((night ? 1 : 0) - nightK) * Math.min(1, dt * 2);
  sun.intensity = 2.4 * (1 - nightK) + 0.7 * nightK;
  sun.color.set('#fff0d0').lerp(new THREE.Color('#9fb2ff'), nightK);
  hemi.intensity = 1.3 * (1 - nightK) + 0.85 * nightK;
  hemi.color.set('#fff3dc').lerp(new THREE.Color('#7f86c7'), nightK);
  scene.fog.color.copy(DAY_FOG).lerp(NIGHT_FOG, nightK);
  windowMat.emissiveIntensity = nightK * 1.6;
  lampMat.emissiveIntensity = 0.2 + nightK * 2.2;
  waterMat.color.set('#7ccfd0').lerp(new THREE.Color('#6f93b8'), nightK);
  cloudMat.emissiveIntensity = 0.35 - nightK * 0.2;
  islandObjs.forEach((isl) => {
    if (isl.userData.glowLight) isl.userData.glowLight.intensity = 0.4 + nightK * 2.5;
    if (isl.userData.fireLight) isl.userData.fireLight.intensity = 0.4 + nightK * 3 + Math.sin(t * 12) * 0.2;
  });

  // 標籤位置
  const w = innerWidth, h = innerHeight;
  const placed = [];
  const keep = (p) => (p.isl === selected || p.isl === hovered ? 2 : p.el.classList.contains('alarm') ? 1 : 0);
  islandObjs.map((isl, i) => {
    tmpV.set(isl.position.x, isl.position.y + 3.6, isl.position.z).project(camera);
    const el = pinEls[i];
    const vis = isl.userData.group === arch && !isl.userData.def.alias && tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
    el.classList.toggle('hidden', !vis);
    el.classList.toggle('hover', isl === hovered);
    el.classList.toggle('dim', !!selected && isl !== selected);
    // 量完整寬度（縮成圖示時先暫時展開再量）
    if (!el._w) {
      const mini = el.classList.contains('mini');
      if (mini) el.classList.remove('mini');
      el._w = el.offsetWidth; el._h = el.offsetHeight;
      if (mini) el.classList.add('mini');
    }
    const fw = el._w;
    // 標籤不超出畫面左右邊緣
    const half = fw / 2 + 8;
    const px = Math.min(w - half, Math.max(half, (tmpV.x * 0.5 + 0.5) * w));
    const py = (-tmpV.y * 0.5 + 0.5) * h;
    el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -100%)`;
    el.style.zIndex = String(Math.round((1 - tmpV.z) * 10000));
    return { isl, el, vis, px, py, fw, fh: el._h || 34, z: tmpV.z };
  })
    // 標籤互相重疊時，離鏡頭遠的縮成只剩圖示（選到的、滑鼠指著的、有警報的優先完整顯示）
    .filter((p) => p.vis)
    .sort((a, b) => keep(b) - keep(a) || a.z - b.z)
    .forEach((p) => {
      const pad = p.el.classList.contains('mini') ? 6 : 2;   // 已縮小的要空出多一點才展開，避免轉動時一直閃
      const r = [p.px - p.fw / 2 - pad, p.py - p.fh - 10 - pad, p.px + p.fw / 2 + pad, p.py + pad];
      const hit = p.isl !== selected && p.isl !== hovered && placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
      p.el.classList.toggle('mini', hit);
      if (!hit) placed.push(r);
    });

  updateMePin(w, h);
  updateFerries(w, h);
  updateWhoPin(w, h);
  updateTags(w, h);
  lambWorld?.updateLabels(w, h, arch === 'lamb');
  updateLive();
  renderer.render(scene, camera);
  window.__tcypReady = true;
  requestAnimationFrame(frame);
}

document.getElementById('loading').classList.add('gone');
const intro = document.getElementById('intro');
document.querySelectorAll('[data-enter]').forEach((btn) => btn.addEventListener('click', () => {
  intro.classList.add('gone');
  if (btn.dataset.enter === 'avatar') return creator.open();
  const [id, anchor] = btn.dataset.enter.split('#');
  openIsland(id);
  if (anchor) setTimeout(() => panelBody.querySelector('#' + anchor)?.scrollIntoView({ behavior: 'smooth' }), 500);
}));
document.getElementById('enterBtn').addEventListener('click', () => {
  intro.classList.add('gone');
  const id = location.hash.slice(1);
  if (ISLANDS.some((i) => i.id === id)) openIsland(id);
});
if (location.hash && ISLANDS.some((i) => i.id === location.hash.slice(1))) {
  intro.classList.add('gone');
  setTimeout(() => openIsland(location.hash.slice(1)), 300);
}
// 代禱牆（福音港灣）：登入的人看得到自己登記的朋友的完整姓名，服事者有管理權限
const prayer = createPrayer({ signIn: store.signIn, idToken: store.idToken, signedIn: () => !!store.myUid() });

// 操練本藏寶圖：每週交操練本拼一塊
const practice = createPractice({ signIn: store.signIn, signedIn: () => !!store.myUid() });
const passport = createPassport({ signIn: store.signIn, signedIn: () => !!store.myUid() });
document.getElementById('mapBtn').addEventListener('click', () => { setMenu(false); practice.open(); });

// 召會生活人數統計看板（服事者群島）
const chlife = createChlife({ load: (force) => staff.loadChlife(force), getState: () => staff.chlifeState });

// 重大行動的海嘯警報
const tsunami = createTsunami({
  today: taipeiNow().date,
  onDetails: () => { intro.classList.add('gone'); if (arch !== 'main') switchArch('main'); openIsland('calendar'); },
});
if (tsunami.active) { alertEv = tsunami.event; lastMinute = -1; }
if (tsunami.active) pinEls[islandObjs.findIndex((i) => i.userData.id === 'calendar')]?.classList.add('alarm');

// 操作教學：有新功能時自動跳出簡短版；目錄的「❓ 教學」可以看完整版
const tour = createTour({
  isStaff: () => staffAccess,
  prepare: () => { closePanel(); setMenu(false); lambReturn = null; lambCard.close(); },
});
document.getElementById('tourBtn').addEventListener('click', () => tour.start(false));
tour.autoStart();
frame();
