// 台中的孩子群島：給已畢業、在外地讀書的台中孩子（建立島民時選「已畢業」或「服事者」，或是服事者帳號，才看得到）
// 身分、縣市、學校、科系存在代禱網的試算表「島民身分」，只有本人和後台看得到；本機也留一份給自己看。
import { post } from './prayer.js';

// 縣市分區。必須和代禱網 apps-script/Code.gs 的 PROFILE_CITIES 一致
export const REGIONS = [
  { id: 'kd-north', name: '北部之島', short: '北部', emoji: '🏙️', tint: '#dbeafc', angle: 90, cities: ['基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '金門縣', '連江縣'] },
  { id: 'kd-mid', name: '中部之島', short: '中部・台中', emoji: '🏡', tint: '#fff0c9', center: true, cities: ['苗栗縣', '台中市', '彰化縣', '南投縣'] },
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

// ---------- 身分 ----------
const EMPTY = { role: '', city: '', school: '', dept: '' };
let profile = { ...EMPTY };
const listeners = new Set();
export const onProfile = (f) => listeners.add(f);
export const getProfile = () => profile;
export const canSeeKids = () => profile.role === 'grad' || profile.role === 'staff';
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
export async function loadProfile(uid) {
  let local = null;
  try { local = JSON.parse(localStorage.getItem(key(uid))); } catch { /* ignore */ }
  profile = clean(local); listeners.forEach((f) => f(profile));
  if (!uid) return;
  try {
    const r = await post('getProfile');
    if (r.data) set(r.data, uid);
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
function hereHtml(r) {
  if (!r.cities.includes(profile.city)) return '';
  const where = [profile.school, profile.dept].filter(Boolean).map(esc).join('・');
  return `<p class="kd-here">📍 你在這座島：${esc(profile.city)}${where ? `・${where}` : ''}<small>（只有你和服事者看得到）</small></p>`;
}

export const KIDS_ISLANDS = REGIONS.map((r) => ({
  ...r,
  render: (now) => {
    const today = now.date;
    const mine = VISITS.filter((v) => v.region === r.id);
    const body = r.center
      ? sec('', `<p>給在各地讀書的台中孩子——這個秋末，服事者們要去看你！</p>${hereHtml(r)}`)
        + sec('🚗 看望行程', visitsHtml(VISITS, today))
        + sec('🙋 一起來配搭：2027 親子健康生活園隊輔', campHtml(today), 'camp')
        + sec('其他小島', `<div class="goto">${REGIONS.filter((x) => !x.center).map((x) => `<button data-goto="${x.id}">${x.emoji} ${x.short}</button>`).join('')}</div>`)
      : sec('', hereHtml(r) || `<p>${r.cities.join('、')}的台中孩子，都住在這座島。</p>`)
        + sec('🚗 看望行程', mine.length ? visitsHtml(mine, today) : '<p>這一區還沒有排看望的場次，確定後會放在這裏。</p>')
        + sec('🙋 一起來配搭', '<p>2027 親子健康生活園正在招募隊輔，歡迎報名。</p><div class="goto"><button data-goto="kd-mid" data-anchor="camp">看期程與報名</button></div>');
    return hero(r, r.cities.join('・')) + body;
  },
}));
