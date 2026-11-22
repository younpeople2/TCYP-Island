// 台中的孩子群島：給已畢業、在外地讀書的台中孩子（建立島民時選「已畢業」或「服事者」，或是服事者帳號，才看得到）
// 中央是資訊站（隊輔招募、寒假特會、看望行程、畢業護照）；北中南東四座島上走著住在那一區的台中孩子。
// 身分、縣市、學校、科系存在代禱網的試算表「島民身分」，只有本人和後台看得到；本機也留一份給自己看。
// 分區（北中南東）會跟著島民外觀公開（avatar-data.js 的 region），別人只看得到你在哪一區。
import { post } from './prayer.js';
import { EVENTS } from './data.js';

// 縣市分區。縣市必須和代禱網 apps-script/Code.gs 的 PROFILE_CITIES 一致；id 必須和 avatar-data.js 的 REGION_IDS 一致
const HUB = { id: 'kd-hub', name: '台中的孩子資訊站', short: '資訊站', emoji: '📣', tint: '#ffe7b8', center: true };
export const REGIONS = [
  { id: 'kd-north', name: '北部之島', short: '北部', emoji: '🏙️', tint: '#dbeafc', angle: 90, cities: ['基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '金門縣', '連江縣'] },
  { id: 'kd-mid', name: '中部之島', short: '中部・台中', emoji: '🏡', tint: '#fff0c9', angle: 180, cities: ['苗栗縣', '台中市', '彰化縣', '南投縣'] },
  { id: 'kd-south', name: '南部之島', short: '南部', emoji: '🌴', tint: '#ffe1cf', angle: 270, cities: ['雲林縣', '嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣', '澎湖縣'] },
  { id: 'kd-east', name: '東部之島', short: '東部', emoji: '⛰️', tint: '#dff3e4', angle: 0, cities: ['宜蘭縣', '花蓮縣', '台東縣', '海外'] },
];
export const CITIES = REGIONS.flatMap((r) => r.cities);
export const ROLES = [['teen', '青少年'], ['grad', '已畢業'], ['staff', '服事者']];

// 服事者到各地看望台中的孩子（地點確認後另行通知）
const VISITS = [
  { area: '雙北', region: 'kd-north', date: '2026-11-21', time: '15:00' },
  { area: '新竹', region: 'kd-north', date: '2026-11-28', time: '12:00' },
  { area: '台中', region: 'kd-mid', note: '不定期前往看望' },
  { area: '雲嘉', region: 'kd-south', date: '2026-11-21', time: '14:00' },
  { area: '台南', region: 'kd-south', date: '2026-11-21', time: '17:00' },
  { area: '高屏', region: 'kd-south', date: '2026-11-21', time: '17:00' },
];
const CAMP = {
  url: 'https://forms.gle/FnbWCF1iEdWrQWEa7',
  plan: [['2026-12-12', '第一次隊輔豫備聚會'], ['2027-01-22', '第二次隊輔豫備聚會'], ['2027-01-23', '親子健康生活園', '2027-01-24']],
};

// 寒假特會返鄉服事：日期、地點跟著 data.js 的行事曆
const WINTER = {
  ev: EVENTS.find((e) => e.title === '青少年寒假特會'),
  url: 'https://forms.gle/4mVGvbZ1q2UANyFj8',
  prep: ['2027-01-09', '9:00–12:00'],
};

// ---------- 身分 ----------
const EMPTY = { role: '', city: '', school: '', dept: '' };
let profile = { ...EMPTY };
const listeners = new Set();
export const onProfile = (f) => listeners.add(f);
export const getProfile = () => profile;
export const canSeeKids = () => profile.role === 'grad' || profile.role === 'staff';
const regionOfCity = (city) => REGIONS.find((r) => r.cities.includes(city))?.id || '';
// 我的分區（公開在島民外觀上）：只有已畢業、選了縣市的人才有
export const myRegion = (p = profile) => (p.role === 'grad' ? regionOfCity(p.city) : '');
const key = (uid) => (uid ? `tcyp-profile:u:${uid}` : 'tcyp-profile:guest');
const clean = (p) => {
  const role = ROLES.some(([r]) => r === p?.role) ? p.role : '';
  const grad = role === 'grad';
  return { role, city: grad && CITIES.includes(p.city) ? p.city : '', school: grad ? String(p.school || '').trim().slice(0, 30) : '', dept: grad ? String(p.dept || '').trim().slice(0, 30) : '' };
};
function set(p, uid) {
  profile = clean(p);
  try { profile.role ? localStorage.setItem(key(uid), JSON.stringify(profile)) : localStorage.removeItem(key(uid)); } catch { /* 無痕模式 */ }
  listeners.forEach((f) => f(profile));
}

// 帳號切換時：先用本機的，再用後台的蓋過去
let profGen = 0;
export async function loadProfile(uid) {
  const gen = ++profGen;   // 帳號切換後，前一個帳號晚到的回應要丟掉，不能套到新帳號上
  let local = null;
  try { local = JSON.parse(localStorage.getItem(key(uid))); } catch { /* ignore */ }
  profile = clean(local); listeners.forEach((f) => f(profile));
  if (!uid) return;
  try {
    const r = await post('getProfile');
    if (gen === profGen && r.data) set(r.data, uid);
  } catch (err) { console.error('讀取身分失敗', err); }
}
// 有登入就先存後台，成功後才改本機；p = null 代表刪除
export async function saveProfile(p, uid) {
  const next = clean(p);
  if (uid) {
    const r = await post('setProfile', next);
    return set(r.data || EMPTY, uid);
  }
  set(next, null);
}

// ---------- 小島 ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sec = (title, inner, id = '') => `<section class="p-sec"${id ? ` id="${id}"` : ''}>${title ? `<h3>${title}</h3>` : ''}${inner}</section>`;
const hero = (d, sub) => `<div class="p-hero" style="--c:${d.tint}"><div class="em">${d.emoji}</div><h2>${d.name}</h2><p>${sub}</p></div>`;
const WEEK = '日一二三四五六';
const md = (s) => { const d = new Date(`${s}T12:00:00Z`); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEK[d.getUTCDay()]}）`; };

function visitsHtml(list, today) {
  return `<ul class="list">${list.map((v) => {
    const past = v.date && v.date < today;
    return `<li${past ? ' class="past"' : ''}><span class="num">📍</span><b>${v.area}</b><small>${v.date ? `${md(v.date)} ${v.time}${past ? '・已結束' : ''}` : v.note}</small></li>`;
  }).join('')}</ul><p class="hint">地點確認後會再通知大家。</p>`;
}
function campHtml(today) {
  return `<ul class="list">${CAMP.plan.map(([d, what, end]) => `<li${(end || d) < today ? ' class="past"' : ''}><span class="num">🗓️</span><b>${what}</b><small>${md(d)}${end ? `–${md(end)}` : ''}</small></li>`).join('')}</ul>
    <div class="goto"><a class="link-btn" href="${CAMP.url}" target="_blank" rel="noopener">📝 報名當隊輔</a></div>`;
}
function winterHtml(today) {
  const ev = WINTER.ev, [pd, pt] = WINTER.prep;
  return `<p>想回來服事青少年寒假特會嗎？填問卷讓服事者知道。</p>
    <ul class="list">
      <li${pd < today ? ' class="past"' : ''}><span class="num">🤝</span><b>特會預備聚會</b><small>${md(pd)} ${pt}</small></li>
      ${ev ? `<li${(ev.end || ev.start) < today ? ' class="past"' : ''}><span class="num">❄️</span><b>${ev.title}</b><small>${md(ev.start)}${ev.end ? `–${md(ev.end)}` : ''}・${ev.place}${ev.status === 'tentative' ? '（日期以正式通啟為準）' : ''}</small></li>` : ''}
    </ul>
    <div class="goto"><a class="link-btn" href="${WINTER.url}" target="_blank" rel="noopener">📝 填返鄉服事問卷</a></div>`;
}
function hereHtml(r, onHub = false) {
  if (!r.cities.includes(profile.city)) return '';
  const where = [profile.school, profile.dept].filter(Boolean).map(esc).join('・');
  return `<p class="kd-here">📍 ${onHub ? `你住在${r.name}` : '你在這座島'}：${esc(profile.city)}${where ? `・${where}` : ''}<small>（縣市、學校、科系只有你和服事者看得到；別人只看得到你在${r.name}）</small></p>`;
}

// 分區島上的人：main.js 用 setFolks 傳進來 [{ name, region, mine }]
let folks = [];
export const setFolks = (list) => { folks = list; };
const folksIn = (id) => folks.filter((f) => f.region === id);

function hubHtml(today) {
  const mine = REGIONS.find((r) => r.id === myRegion());
  const you = mine
    ? `${hereHtml(mine, true)}<div class="goto"><button data-goto="${mine.id}">${mine.emoji} 去${mine.name}看看</button></div>`
    : `<p class="hint">在「我的島民」把身分選成<b>已畢業</b>、選好縣市，你的島民就會住進北／中／南／東其中一座島。</p>`;
  return sec('', `<p>給在各地讀書的台中孩子——服事者們想念你！要報名、要回來配搭，都在這裏。</p>${you}`)
    + `<section class="p-sec kd-cta" id="camp" style="--c:#fff0c9"><span class="kd-tag">🙋 招募中</span><h3>2027 親子健康生活園・招募隊輔</h3>${campHtml(today)}</section>`
    + `<section class="p-sec kd-cta" id="winter" style="--c:#dbeafc"><span class="kd-tag">❄️ 問卷</span><h3>寒假特會返鄉服事</h3>${winterHtml(today)}</section>`
    + `<section class="p-sec kd-cta" id="passport" style="--c:#e9f5e1"><span class="kd-tag">🛂 畢業護照</span><h3>畢業護照尋寶圖</h3>
        <p>照著紙本畢業護照走，每完成一關就拍照上傳，服事者看過會幫你蓋章。</p>
        <div class="goto"><button class="link-btn" data-open="passport">🗺️ 打開畢業護照</button></div></section>`
    + sec('🚗 看望行程', visitsHtml(VISITS, today))
    + sec('分區小島', `<p class="hint">大家的島民會住在自己所在的那一區。</p><div class="goto">${REGIONS.map((x) => `<button data-goto="${x.id}">${x.emoji} ${x.short}・${folksIn(x.id).length} 人</button>`).join('')}</div>`);
}
function regionHtml(r, today) {
  const here = folksIn(r.id), mine = VISITS.filter((v) => v.region === r.id);
  const names = here.length
    ? `<div class="kd-folks">${here.map((f) => `<span${f.mine ? ' class="me"' : ''}>${esc(f.name || '島民')}${f.mine ? '（你）' : ''}</span>`).join('')}</div>`
    : '<p>這座島上還沒有人。已畢業的台中孩子選好縣市後，就會出現在這裏。</p>';
  return sec('', hereHtml(r) || `<p>住在${r.cities.join('、')}的台中孩子，都住在這座島。</p>`)
    + sec(`👋 島上的台中孩子（${here.length}）`, names)
    + sec('🚗 看望行程', mine.length ? visitsHtml(mine, today) : '<p>這一區還沒有排看望的場次，確定後會放在資訊站。</p>')
    + sec('', '<div class="goto"><button class="link-btn" data-goto="kd-hub" data-anchor="camp">📣 回資訊站：隊輔招募、寒假特會、畢業護照</button></div>');
}

export const KIDS_ISLANDS = [HUB, ...REGIONS].map((r) => ({
  ...r,
  render: (now) => hero(r, r.center ? '消息、報名、畢業護照都在這裏' : r.cities.join('・')) + (r.center ? hubHtml(now.date) : regionHtml(r, now.date)),
}));
