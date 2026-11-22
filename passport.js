// 畢業護照尋寶圖：已畢業的台中孩子照著紙本「台中孩子畢業護照」走，每完成一關（護照裏有拍立得框的頁）就拍一張照片上傳，
// 地圖上那一站就亮起來；服事者看過照片蓋章後變成金色。照片存在代禱網的後端，只有本人和服事者看得到。
import { post } from './prayer.js';
import { toJpeg } from './practice.js';

const CAT = {
  ministry: ['職事', '#8fcbe8'], serve: ['事奉', '#8fd3c1'], body: ['基督的身體', '#c3b3e0'],
  heart: ['心志', '#a8d89a'], covenant: ['有約', '#f2b57a'], life: ['生活剪影', '#e8c27a'],
};
// 關卡代號必須和代禱網 apps-script/Code.gs 的 PASSPORT_ITEMS 一致；x, y 是在地圖上的位置
export const STOPS = [
  { id: 'call', name: '呼召聚會', emoji: '📯', cat: 'ministry', page: '職事・全時間訓練', x: 70, y: 70 },
  { id: 'graduate', name: '畢業聚會', emoji: '🎓', cat: 'ministry', page: '職事・全時間訓練', x: 185, y: 52 },
  { id: 'field', name: '現場訓練', emoji: '🏟️', cat: 'ministry', page: '職事・今時代說話', x: 300, y: 72 },
  { id: 'prayread', name: '禱研背講', emoji: '📖', cat: 'ministry', page: '職事・今時代說話', x: 415, y: 52 },
  { id: 'asia', name: '亞洲大專', emoji: '🌏', cat: 'ministry', page: '職事・今時代說話', x: 530, y: 72 },
  { id: 'semi', name: '半年度訓練', emoji: '🗓️', cat: 'ministry', page: '職事・今時代說話', x: 520, y: 172 },
  { id: 'vital', name: '活力伴事區', emoji: '🔥', cat: 'serve', page: '事奉・活力伴事區', x: 410, y: 158 },
  { id: 'baptize', name: '配搭帶人受浸', emoji: '💧', cat: 'serve', page: '事奉・配搭帶人受浸', x: 300, y: 178 },
  { id: 'home', name: '入住弟兄姊妹之家', emoji: '🏠', cat: 'body', page: '基督的身體・入住弟兄姊妹之家', x: 190, y: 158 },
  { id: 'cherish', name: '珍賞照顧家', emoji: '💐', cat: 'body', page: '基督的身體・珍賞照顧家', x: 80, y: 178 },
  { id: 'overseas', name: '海外開展', emoji: '✈️', cat: 'heart', page: '心志・海外開展', x: 95, y: 272 },
  { id: 'coworker', name: '與外地同工交通', emoji: '🤝', cat: 'covenant', page: '與同工有約', x: 215, y: 288 },
  { id: 'elders', name: '回來與父老交通', emoji: '☕', cat: 'covenant', page: '與父老有約', x: 335, y: 272 },
  { id: 'life', name: '和同伴一起做的事', emoji: '📸', cat: 'life', page: '生活剪影', x: 455, y: 288 },
];
const FINISH = { x: 560, y: 278 };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 只接受後端產生的 JPEG data URL，其他一律不放進 <img>（防止被塞進別的內容）
const okImg = (u) => (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(u) ? u : '');
const stopOf = (id) => STOPS.find((s) => s.id === id);

// 尋寶小路：依序連起每一站，終點是畢業旗
function trail() {
  const pts = [...STOPS, FINISH];
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    d += ` Q${((a.x + b.x) / 2 + (b.y - a.y) * 0.25).toFixed(0)} ${((a.y + b.y) / 2 - (b.x - a.x) * 0.12).toFixed(0)} ${b.x} ${b.y}`;
  }
  return d;
}
const TRAIL = trail();

export function passportSvg(stamps, selected = '') {
  const got = Object.fromEntries(stamps.map((s) => [s.item, s]));
  const all = STOPS.every((s) => got[s.id]?.gold);
  return `<svg class="pm-map pp-map${all ? ' done' : ''}" viewBox="0 0 600 340" role="img" aria-label="畢業護照尋寶圖：已完成 ${stamps.length} / ${STOPS.length} 關">
    <rect x="4" y="4" width="592" height="332" rx="14" class="pm-paper"/>
    <path d="${TRAIL}" class="pp-trail"/>
    <g class="pp-finish${all ? ' on' : ''}"><text x="${FINISH.x}" y="${FINISH.y + 8}">🏁</text><text x="${FINISH.x}" y="${FINISH.y + 36}" class="pp-lab">畢業</text></g>
    ${STOPS.map((s) => {
      const g = got[s.id], c = CAT[s.cat][1];
      const cls = g ? (g.gold ? 'gold' : 'open') : 'todo';
      return `<g class="pp-stop ${cls}${s.id === selected ? ' sel' : ''}" data-stop="${s.id}" tabindex="0" role="button" aria-label="${s.name}：${g ? (g.gold ? '已蓋章' : '已上傳，等服事者蓋章') : '還沒完成'}" style="--c:${c}">
        <circle cx="${s.x}" cy="${s.y}" r="24"/>
        <text x="${s.x}" y="${s.y + 7}" class="pp-em">${s.emoji}</text>
        ${g?.gold ? `<text x="${s.x + 20}" y="${s.y - 16}" class="pm-star">✦</text>` : ''}
        <text x="${s.x}" y="${s.y + 42}" class="pp-lab">${s.name}</text></g>`;
    }).join('')}</svg>`;
}

export function createPassport({ signIn, signedIn }) {
  const el = document.createElement('div');
  el.className = 'practice passport';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', '畢業護照尋寶圖');
  el.innerHTML = `
    <div class="pm-card">
      <button class="pm-close" aria-label="關閉">✕</button>
      <div class="pm-head"><h2>🛂 畢業護照尋寶圖</h2><div class="pm-tabs" role="tablist"></div></div>
      <div class="pm-body"></div>
    </div>`;
  document.body.appendChild(el);
  const body = el.querySelector('.pm-body');
  const tabsEl = el.querySelector('.pm-tabs');

  let tab = 'map', sel = '';
  let st = { status: 'idle', data: null, error: '' };
  let shot = null, sending = false, msg = '';
  let queue = { status: 'idle', rows: [], error: '' };
  const photos = {};   // sid → data URL 或 'loading'

  async function load() {
    if (!signedIn()) { st = { status: 'signin', data: null, error: '' }; render(); return; }
    st = { ...st, status: st.data ? 'ready' : 'loading' }; render();
    try { st = { status: 'ready', data: (await post('passport')).data, error: '' }; }
    catch (err) { st = { status: err.code === 'signin' ? 'signin' : 'error', data: st.data, error: err.message }; }
    render();
  }
  async function loadQueue() {
    queue = { ...queue, status: 'loading' }; render();
    try { queue = { status: 'ready', rows: (await post('passportQueue')).data, error: '' }; }
    catch (err) { queue = { status: 'error', rows: [], error: err.message }; }
    render();
  }

  function renderTabs() {
    const d = st.data;
    tabsEl.innerHTML = d?.staff ? `<button data-tab="map" aria-selected="${tab === 'map'}">我的護照</button><button data-tab="stamp" aria-selected="${tab === 'stamp'}">🛂 蓋章${d.toStamp ? `（${d.toStamp}）` : ''}</button>` : '';
  }

  const INTRO = '<p>照著紙本的<b>台中孩子畢業護照</b>走：每完成一關（護照裏有拍立得框的那幾頁），就拍一張照片傳上來，地圖上那一站會亮起來。服事者看過照片蓋章後，那一站會變成<b class="pm-gold-t">金色</b>。</p>';

  function stopDetail(d) {
    const s = stopOf(sel);
    if (!s) return '<p class="pm-note pp-pick">👆 點地圖上的任一站，就可以上傳那一關的照片。</p>';
    const g = d.stamps.find((x) => x.item === s.id);
    const ph = g && photos[g.sid];
    const mine = g ? `<div class="pp-mine">${ph && ph !== 'loading' ? `<img src="${ph}" alt="${s.name}的照片">` : `<button data-act="myphoto" data-sid="${esc(g.sid)}" ${ph ? 'disabled' : ''}>${ph ? '照片讀取中……' : '📷 看我傳的照片'}</button>`}</div>` : '';
    let state;
    if (g?.gold) state = '<p class="pm-state gold">✦ 服事者已經蓋章，這一站是金色的！</p>';
    else if (g) state = '<p class="pm-state wait">⏳ 已上傳，等服事者蓋章。還沒蓋章前可以換一張。</p>';
    else state = '<p class="pm-state todo">📝 還沒完成：做完這一關後，拍下那一刻（或拍護照那一頁）傳上來。</p>';
    const upload = g?.gold ? '' : `<div class="pm-slots pp-slots"><label class="pm-slot${shot ? ' has' : ''}">
        <input type="file" accept="image/*" data-slot="0" ${sending ? 'disabled' : ''}>
        <span class="pm-prev">${shot ? `<img src="${shot}" alt="要上傳的照片">` : '<span class="pm-cam">📷</span>'}</span>
        <b>${g ? '換一張照片' : '拍照或選照片'}</b><small>${shot ? '點一下可以重選' : '點一下開始'}</small></label></div>
      <button class="pm-go" data-act="send" ${shot && !sending ? '' : 'disabled'}>${sending ? '上傳中……' : `${s.emoji} 交出「${s.name}」`}</button>`;
    return `<div class="pm-wk pp-detail" style="--c:${CAT[s.cat][1]}"><b>${s.emoji} ${s.name}</b><small class="pp-page">護照：${s.page}</small>${state}${mine}${upload}
      <p class="pm-note">照片只有你和服事者看得到。</p></div>`;
  }

  function renderMap() {
    if (st.status === 'signin') return `<div class="pm-intro">${INTRO}<button class="pm-go" data-act="signin">用 Google 帳號登入</button></div>${passportSvg([])}`;
    if (!st.data) return st.status === 'error' ? `<p class="pm-err">讀不到護照：${esc(st.error)}</p><button class="pm-go" data-act="reload">再試一次</button>` : '<p class="pm-wait">打開護照中……</p>';
    const d = st.data;
    if (!d.allowed) return `<div class="pm-intro">${INTRO}<p class="pm-state wait">👤 先到「我的島民」把身分選成<b>已畢業</b>並儲存，就可以開始蓋章。</p></div>${passportSvg([])}`;
    const n = d.stamps.length, gold = d.stamps.filter((x) => x.gold).length;
    const done = gold >= STOPS.length;
    return `<p class="pm-msg" role="status"${msg ? '' : ' hidden'}>${msg}</p>
      ${done ? '<div class="pm-done"><b>🎉 畢業護照全部蓋滿了！</b><p>每一站都走過了。謝謝你一路的操練與配搭！</p></div>' : ''}
      ${passportSvg(d.stamps, sel)}
      <div class="pm-stat"><span>已完成 <b>${n}</b> / ${STOPS.length} 關</span><span>✦ 已蓋章 <b>${gold}</b> 關</span></div>
      <p class="pm-legend">⚪ 虛線＝還沒完成　🟢 有顏色＝已上傳、等蓋章　✦ 金色＝服事者已蓋章</p>
      ${stopDetail(d)}`;
  }

  function renderStamp() {
    if (queue.status === 'loading' && !queue.rows.length) return '<p class="pm-wait">讀取中……</p>';
    if (queue.status === 'error') return `<p class="pm-err">${esc(queue.error)}</p><button class="pm-go" data-act="queue">再試一次</button>`;
    if (!queue.rows.length) return '<p class="pm-wait">目前沒有要蓋章的護照 🙌</p>';
    return `<p class="pm-note">看過照片就按「蓋章」，那一站會變成金色。不相關的照片可以「收回」，對方可以重傳。</p>
      <ul class="pm-queue">${queue.rows.map((r) => {
        const s = stopOf(r.item), ph = photos[r.sid];
        return `<li class="${r.gold ? 'gold' : ''}"><div class="pm-q-head"><b>${esc(r.name || r.email)}</b><small>${esc(r.email)}・${s ? `${s.emoji} ${s.name}` : esc(r.item)}</small></div>
          ${ph === 'loading' ? '<p class="pm-wait">照片讀取中……</p>' : ph ? `<div class="pm-q-photos pp-one"><img src="${ph}" alt="${s?.name || ''}" title="點一下放大／縮小"></div>` : ''}
          <div class="pm-q-acts">${ph ? '' : `<button data-act="photo" data-sid="${esc(r.sid)}">📷 看照片</button>`}
            ${r.gold ? '<span class="pm-signed">✅ 已蓋章</span>' : `<button class="pm-sign" data-act="stamp" data-sid="${esc(r.sid)}">🛂 蓋章</button>`}
            <button class="pm-revoke" data-act="revoke" data-sid="${esc(r.sid)}">收回</button></div></li>`;
      }).join('')}</ul>`;
  }

  function render() {
    if (el.hidden) return;
    renderTabs();
    const st0 = body.scrollTop;
    body.innerHTML = tab === 'stamp' ? renderStamp() : renderMap();
    body.scrollTop = st0;
  }

  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    if (tab === 'stamp' && queue.status !== 'loading') loadQueue();
    render();
  });

  function pick(id) {
    if (sending || !stopOf(id)) return;
    sel = id; shot = null; msg = '';
    render();
    body.querySelector('.pp-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  body.addEventListener('keydown', (e) => { const s = e.target.closest('[data-stop]'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(s.dataset.stop); } });

  body.addEventListener('change', async (e) => {
    const inp = e.target.closest('input[data-slot]');
    if (!inp || !inp.files?.[0]) return;
    try { shot = await toJpeg(inp.files[0]); msg = ''; }
    catch (err) { msg = `⚠️ ${esc(err.message || '這張照片讀不到，請換一張')}`; }
    render();
  });

  body.addEventListener('click', async (e) => {
    const stop = e.target.closest('[data-stop]');
    if (stop && tab === 'map' && st.data?.allowed) return pick(stop.dataset.stop);
    const zoom = e.target.closest('.pm-q-photos img');
    if (zoom) { zoom.parentElement.classList.toggle('big'); return; }
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act, sid = b.dataset.sid;
    if (act === 'signin') return signIn().then(load).catch(() => {});
    if (act === 'reload') return load();
    if (act === 'queue') return loadQueue();
    if (act === 'send') {
      const s = stopOf(sel);
      sending = true; msg = ''; render();
      try {
        st.data = (await post('passportUpload', { item: s.id, photo: shot })).data;
        shot = null;
        msg = `${s.emoji} 「${s.name}」完成了！等服事者蓋章就會變金色。`;
        celebrate();
      } catch (err) { msg = `⚠️ ${esc(err.message)}`; }
      sending = false; render();
      return;
    }
    if (act === 'myphoto' || act === 'photo') {
      photos[sid] = 'loading'; render();
      try { photos[sid] = okImg((await post('passportPhoto', { sid })).data); }
      catch (err) { delete photos[sid]; alert(`照片讀不到：${err.message}`); }
      render();
      return;
    }
    if (act === 'stamp' || act === 'revoke') {
      const row = queue.rows.find((r) => r.sid === sid);
      if (act === 'revoke' && !confirm(`確定要收回「${row?.name || row?.email || ''}」的「${stopOf(row?.item)?.name || ''}」嗎？那一站會變回還沒完成，對方可以重傳。`)) return;
      b.disabled = true;
      try {
        await post(act === 'stamp' ? 'passportStamp' : 'passportRevoke', { sid });
        if (st.data?.toStamp && row && !row.gold) st.data.toStamp--;
        if (act === 'stamp' && row) row.gold = true;
        else queue.rows = queue.rows.filter((r) => r.sid !== sid);
      } catch (err) { alert(err.message); }
      render();
    }
  });

  function celebrate() {
    const fx = document.createElement('div');
    fx.className = 'pm-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="--x:${(Math.random() * 100).toFixed(0)}%;--d:${(Math.random() * 0.6).toFixed(2)}s">${['🛂', '✨', '🎓', '⭐'][i % 4]}</i>`).join('');
    el.querySelector('.pm-card').appendChild(fx);
    setTimeout(() => fx.remove(), 2600);
  }

  function open() {
    el.hidden = false;
    tab = 'map'; msg = '';
    render();
    load();
    el.querySelector('.pm-close').focus();
  }
  function close() { el.hidden = true; shot = null; sending = false; }
  el.querySelector('.pm-close').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) { e.stopImmediatePropagation(); close(); } }, true);

  function userChanged() {
    st = { status: 'idle', data: null, error: '' };
    queue = { status: 'idle', rows: [], error: '' };
    for (const k in photos) delete photos[k];
    shot = null; sel = ''; tab = 'map';
    if (!el.hidden) load();
  }
  return { open, close, userChanged };
}
