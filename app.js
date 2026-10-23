/* Time Report - Port of Duqm | single-page frontend */
const $app = document.getElementById('app');
const API = 'api.php';

/* ---------------- helpers ---------------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
const fmtDate = d => d ? d.split('-').reverse().join('/') : '';
const hhmm = t => t ? String(t).slice(0,5) : '';

function toast(msg, err) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.className = '', 2600);
}

async function api(action, { type = 'time', params = {}, body = null } = {}) {
  const cfg = window.TR_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_KEY) return sbApi(action, { type, params, body }); // static hosting (GitHub Pages)
  const qs = new URLSearchParams({ action, type, ...params });
  let res;
  try { res = await fetch(API + '?' + qs, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}); }
  catch { throw new Error('Cannot reach the server. Is PHP running, or set up Supabase in config.js?'); }
  let j; try { j = await res.json(); } catch { throw new Error('No backend found: this host cannot run PHP. Fill in SUPABASE_URL and SUPABASE_KEY in config.js'); }
  if (!j.ok) throw new Error(j.error || 'Request failed');
  return j;
}

const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h.01M9 16h.01M12 12h4M12 16h4"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  back: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3M8 21v-7h8v7"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-9 9"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5 9-10"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg>',
};

/* logo embedded so it always shows (no separate file needed) */
const LOGO_SRC = 'data:image/png;base64,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';
const LOGO = `<img src="${LOGO_SRC}" alt="Port of Duqm">`;

/* ---------------- router ---------------- */
/* standard drop-down suggestions (users can still type any value) */
const REPORT_TYPES = ['1-ESR', '2-Cargo Discharge', '3-Cargo Load', '4-Housekeeping', '5-Mooring Gang', '6-Unmooring Gang', '8-DE Mob Equipment', '9-Mob Equipment'];
const BERTHS = ['110','120','130','140','150','160','170','180','190','FB-200','FB-210','FB-220','ODC'];
const YARDS = ['Admin Gate','Gate IN','Gate OUT','Port Security','Yard-DB','Yard-BB','Yard-RORO','Yard-CT','Yard-CFS','Yard-Navy','Washing Area','Wood yard','Warehouse'];
const DL_BERTH = `<datalist id="berthList">${BERTHS.map(v => `<option value="${v}">`).join('')}</datalist>`;
const DL_YARD = `<datalist id="yardList">${YARDS.map(v => `<option value="${v}">`).join('')}</datalist>`;

/* ---------------- LOGIN (front-end gate only) ---------------- */
// SHA-256 of "user:password". NOTE: this only hides the screens; it is not real security on a static site.
const AUTH_HASH = 'b7ca74a3887c7e80097015b34cad38cdc0ef856428c033c8c46f890b8646468b';
/* permissions (set at sign-in from the database; PHP/MySQL mode allows everything) */
const PERM_DEFAULT = { new_report: true, new_discharge: true, search: true, edit: true, pams: true, delete: false, export: true };
const getPerms = () => { try { return JSON.parse(sessionStorage.getItem('tr_perms') || 'null') || {}; } catch { return {}; } };
const setPerms = p => { try { p ? sessionStorage.setItem('tr_perms', JSON.stringify(p)) : sessionStorage.removeItem('tr_perms'); } catch {} };
const can = k => !usingSb() || ({ ...PERM_DEFAULT, ...getPerms() })[k] !== false;
const isAuthed = () => { try { return sessionStorage.getItem('tr_auth') === '1'; } catch { return false; } };
const setAuthed = v => { try { v ? sessionStorage.setItem('tr_auth', '1') : sessionStorage.removeItem('tr_auth'); } catch {} };
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const usingSb = () => !!(window.TR_CONFIG && window.TR_CONFIG.SUPABASE_URL && window.TR_CONFIG.SUPABASE_KEY);
async function logout() {
  try { if (usingSb()) await sbRpc('logout'); } catch {}
  try { sessionStorage.removeItem('tr_token'); sessionStorage.removeItem('tr_name'); } catch {}
  setPerms(null);
  setAuthed(false); location.hash = '#/'; route();
}

function loginView() {
  $app.innerHTML = `<div class="login-wrap">
    <form class="login-card" id="lf" autocomplete="on">
      <img src="${LOGO_SRC}" alt="Port of Duqm" class="login-logo">
      <h1>TIME REPORT</h1>
      <h2 class="login-sys">SYSTEM</h2>
      <label for="lu">User</label>
      <input id="lu" class="login-inp" name="username" autocomplete="username" inputmode="numeric" autofocus>
      <label for="lp">Password</label>
      <input id="lp" class="login-inp" type="password" name="password" autocomplete="current-password">
      <div class="login-err" id="le" role="alert"></div>
      <button class="login-btn" type="submit">Enter System</button>
    </form></div>`;
  document.getElementById('lf').addEventListener('submit', async e => {
    e.preventDefault();
    const u = document.getElementById('lu').value.trim(), p = document.getElementById('lp').value;
    const err = document.getElementById('le');
    const btn = e.target.querySelector('button'); btn.disabled = true; err.textContent = '';
    try {
      let ok = false;
      if (usingSb()) { // users are managed in the database (users.sql)
        const r = await sbRpc('login', { p_user: u, p_pass: p });
        if (r && r.ok) { try { sessionStorage.setItem('tr_token', r.token); sessionStorage.setItem('tr_name', r.name || u); } catch {} setPerms(r.perms); ok = true; }
      } else ok = await sha256(u + ':' + p) === AUTH_HASH;
      if (ok) { setAuthed(true); route(); return; }
      err.textContent = 'Incorrect user or password';
      document.getElementById('lp').value = ''; document.getElementById('lp').focus();
    } catch (x) { err.textContent = usingSb() ? x.message : 'Sign-in needs a secure (https) page'; }
    finally { btn.disabled = false; }
  });
}

function route() {
  if (!isAuthed()) return loginView();
  const [page, a, b] = (location.hash.replace('#/', '') || 'home').split('/');
  const deny = () => { toast('You do not have permission for this page', true); location.hash = '#/'; };
  if (page === 'new') return can('new_report') ? formTime(null, false) : deny();
  if (page === 'time' && a) return b !== 'view' && !can('edit') ? (location.hash = `#/time/${a}/view`) : formTime(+a, b === 'view');
  if (page === 'discharge-new') return can('new_discharge') ? formDischarge(null, false) : deny();
  if (page === 'discharge' && a) return b !== 'view' && !can('edit') ? (location.hash = `#/discharge/${a}/view`) : formDischarge(+a, b === 'view');
  if (page === 'search') return can('search') ? searchView(a === 'discharge' ? 'discharge' : 'time') : deny();
  return home();
}
window.addEventListener('hashchange', route);
const go = h => { location.hash = '#/' + h; };

/* ---------------- HOME ---------------- */
function home() {
  $app.innerHTML = `<div class="wrap">
    <div class="hero">${LOGO}<h1>TIME REPORT</h1><span class="hero-btns"><button class="btn sm" onclick="logout()">Sign out</button></span></div>
    <div class="cards">
      <button class="card c-green" ${can('new_report') ? `onclick="go('new')"` : 'disabled'}>
        <div class="top"><div class="ic">${ICON.plus}</div><div><h3>New Report</h3><p>Create shift report</p></div></div>
        <div class="cta"><b>Create</b><span>${can('new_report') ? 'New Entry' : 'Not allowed'}</span></div></button>
      <button class="card c-purple" ${can('new_discharge') ? `onclick="go('discharge-new')"` : 'disabled'}>
        <div class="top"><div class="ic">${ICON.list}</div><div><h3>Discharge List</h3><p>Create discharge list</p></div></div>
        <div class="cta"><b>Create</b><span>${can('new_discharge') ? 'New Entry' : 'Not allowed'}</span></div></button>
      <button class="card c-blue" ${can('search') ? `onclick="go('search')"` : 'disabled'}>
        <div class="top"><div class="ic">${ICON.search}</div><div><h3>Search Reports</h3><p>Find historical data</p></div></div>
        <div class="cta"><b>Search</b><span>${can('search') ? 'Advanced Filters' : 'Not allowed'}</span></div></button>
    </div></div>`;
}

/* ---------------- shared form bits ---------------- */
const backBtn = (to = 'home') => `<button class="back noprint" onclick="go('${to}')">${ICON.back} Back to Dashboard</button>`;

function shiftSelect(v) {
  return `<select class="inp" id="shift"><option value="">Select Shift</option>
    ${['Day', 'Night'].map(s => `<option ${v === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
}

/* hide editing controls (.xh) in exported image / PDF */
const hideForExport = d => d.querySelectorAll(".xh").forEach(e => e.style.setProperty("display", "none", "important"));

async function exportImage(name) {
  const el = document.getElementById('sheet');
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#fff", onclone: hideForExport });
  const a = document.createElement('a');
  a.download = name + '.png'; a.href = canvas.toDataURL('image/png'); a.click();
}
async function exportPDF(name) {
  const el = document.getElementById('sheet');
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#fff", onclone: hideForExport });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const w = 190, h = canvas.height * w / canvas.width, maxH = 277;
  const k = h > maxH ? maxH / h : 1;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, w * k, h * k);
  pdf.save(name + '.pdf');
}
const fname = (p, mv, d) => `${p}_${(mv || 'vessel').replace(/\W+/g, '_')}_${d || today()}`;

/* ---------------- TIME REPORT FORM ---------------- */
let T = null; // current time-report state

function blankTime() {
  return {
    id: 0, mv: '', voy: '', report_type: '', report_date: today(), shift: '', berth: '', bollard: '', yard_no: '', what_we_do: '',
    activities: [{}, {}], equipment: [{}, {}],
    manpower: { FOREMAN: ['', ''], TALLYMAN: ['', ''], DOCKER: ['', ''] },
  };
}

async function formTime(id, ro) {
  $app.innerHTML = '<div class="wrap"><p class="empty">Loading…</p></div>';
  try {
    T = blankTime();
    if (id) {
      const r = (await api('get', { params: { id } })).row;
      T = { ...T, ...r, activities: r.activities, equipment: r.equipment, manpower: r.manpower };
      for (const k of ['FOREMAN', 'TALLYMAN', 'DOCKER']) if (!T.manpower[k].length) T.manpower[k] = [''];
      if (!T.activities.length) T.activities = [{}];
      if (!T.equipment.length) T.equipment = [{}];
    }
  } catch (e) { toast(e.message, true); return home(); }
  renderTime(ro);
}

function pullTime() { // read DOM -> state
  const g = id => document.getElementById(id)?.value ?? '';
  T.mv = g('mv'); T.voy = g('voy'); T.report_type = g('rtype'); T.report_date = g('date') || today(); T.shift = g('shift');
  T.berth = g('berth'); T.bollard = g('bollard'); T.yard_no = g('yard'); T.what_we_do = g('what');
  T.activities = [...document.querySelectorAll('#acts tr[data-i]')].map(tr => ({
    start_time: tr.querySelector('.s').value, end_time: tr.querySelector('.e').value,
    qty: tr.querySelector('.q').value, what_we_use: tr.querySelector('.u').value }));
  T.equipment = [...document.querySelectorAll('#eqs tr[data-i]')].map(tr => ({
    equipment: tr.querySelector('.eq').value, operator: tr.querySelector('.op').value,
    start_time: tr.querySelector('.s').value, end_time: tr.querySelector('.e').value }));
  for (const k of ['FOREMAN', 'TALLYMAN', 'DOCKER'])
    T.manpower[k] = [...document.querySelectorAll(`#mp-${k} input`)].map(i => i.value);
}

function calcHours() {
  let mins = 0;
  for (const a of T.activities) {
    if (!a.start_time || !a.end_time) continue;
    const [h1, m1] = a.start_time.split(':').map(Number), [h2, m2] = a.end_time.split(':').map(Number);
    let d = (h2 * 60 + m2) - (h1 * 60 + m1); if (d < 0) d += 1440; mins += d;
  }
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

function renderTime(ro) {
  const t = T;
  const actRows = t.activities.map((a, i) => `<tr data-i="${i}">
      <td><input type="time" class="inp s" value="${hhmm(a.start_time)}"></td>
      <td><input type="time" class="inp e" value="${hhmm(a.end_time)}"></td>
      <td><input class="inp q" value="${esc(a.qty)}"></td>
      <td><input class="inp u" value="${esc(a.what_we_use)}"></td>
      <td class="xh" style="text-align:center"><button class="del big" data-del-act="${i}" title="Remove">${ICON.trash.replace('<svg', '<svg width="12" height="12"')}</button></td></tr>`).join('');
  const eqRows = t.equipment.map((e, i) => `<tr data-i="${i}">
      <td><input class="inp eq" value="${esc(e.equipment)}"></td>
      <td><input class="inp op" value="${esc(e.operator)}"></td>
      <td><input type="time" class="inp s" value="${hhmm(e.start_time)}"></td>
      <td><input type="time" class="inp e" value="${hhmm(e.end_time)}"></td>
      <td class="xh" style="text-align:center"><button class="del big" data-del-eq="${i}" title="Remove">${ICON.trash.replace('<svg', '<svg width="12" height="12"')}</button></td></tr>`).join('');
  const people = k => `<td style="vertical-align:top"><div class="people"><div class="row" id="mp-${k}">
      ${t.manpower[k].map((b, i) => `<span class="person"><input class="inp" value="${esc(b)}"><button class="del xh" data-del-p="${k}:${i}">${ICON.trash.replace('<svg', '<svg width="10" height="10"')}</button></span>`).join('')}
      </div><button class="padd xh" data-add-p="${k}">+</button></div></td>`;

  $app.innerHTML = `<div class="wrap ${ro ? 'readonly' : ''}">
    ${backBtn()}
    <div class="sheet" id="sheet">
      <div class="title"><img class="title-logo" src="${LOGO_SRC}" alt="">TIME REPORT<select class="inp title-type" id="rtype" aria-label="Report type"><option value="">Select Type</option>${REPORT_TYPES.map(v => `<option ${t.report_type === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="gap" style="height:0"></div>
      <table class="t" style="margin-top:0">
        <tr><th>MV</th><th>VOY</th><th>Date</th><th>Shift</th></tr>
        <tr><td><input class="inp" id="mv" value="${esc(t.mv)}"></td><td><input class="inp" id="voy" value="${esc(t.voy)}"></td>
            <td><input type="date" class="inp" id="date" value="${t.report_date}"></td><td>${shiftSelect(t.shift)}</td></tr>
      </table>
      <table class="t" style="margin-top:-1px">
        <colgroup><col style="width:25%"><col style="width:25%"><col style="width:50%"></colgroup>
        <tr><th>Berth</th><th>Bollard</th><th>Yard No</th></tr>
        <tr><td><input class="inp" id="berth" list="berthList" value="${esc(t.berth)}">${DL_BERTH}</td><td><input class="inp" id="bollard" value="${esc(t.bollard)}"></td>
            <td><input class="inp" id="yard" list="yardList" value="${esc(t.yard_no)}">${DL_YARD}</td></tr>
      </table>
      <div class="gap"></div>
      <div class="box">
        <table class="t" id="acts"><colgroup><col style="width:26%"><col style="width:26%"><col style="width:16%"><col><col class="xh" style="width:48px"></colgroup>
          <tr><th>Start Time</th><th>End Time</th><th>No</th><th>What We Use</th><th class="xh">Actions</th></tr>${actRows}</table>
        <div class="xh" style="padding:5px"><button class="add" id="addAct">+ Add Work Activity</button></div>
        <div class="hours xh">Total working time: <b id="hrs">${calcHours()}</b></div>
      </div>
      <div class="gap"></div>
      <div class="box"><table class="t"><tr><th>What We Do</th></tr></table>
        <div style="padding:10px"><textarea class="inp" id="what" placeholder="Describe the work activities performed...">${esc(t.what_we_do)}</textarea></div></div>
      <div class="gap"></div>
      <div class="box"><table class="t"><tr><th>FOREMAN</th><th>TALLYMAN</th><th>DOCKER</th></tr>
        <tr>${people('FOREMAN')}${people('TALLYMAN')}${people('DOCKER')}</tr></table></div>
      <div class="gap"></div>
      <div class="box">
        <table class="t" id="eqs"><colgroup><col style="width:24%"><col style="width:24%"><col style="width:22%"><col style="width:22%"><col class="xh" style="width:48px"></colgroup>
          <tr><th>Equipment</th><th>Operator 1</th><th>Start</th><th>End</th><th class="xh">Actions</th></tr>${eqRows}</table>
        <div class="xh" style="padding:5px"><button class="add" id="addEq">+ Add Equipment</button></div>
      </div>
    </div>
    <div class="actions noprint">
      ${ro ? (can('edit') ? `<button class="btn orange" onclick="go('time/${t.id}')">${ICON.edit} Edit</button>` : '') : `<button class="btn green" id="save">${ICON.save} Save Report</button>`}
      <button class="btn blue" id="img">${ICON.img} Export Image</button>
      <button class="btn blue" id="pdf">${ICON.pdf} Export PDF</button>
      <button class="btn gray" onclick="window.print()">${ICON.print} Print</button>
    </div></div>`;

  if (ro) { $app.querySelectorAll('input,select,textarea').forEach(e => e.disabled = true); }
  const rerender = () => { pullTime(); renderTime(ro); };
  const $ = s => document.querySelector(s);
  $('#addAct')?.addEventListener('click', () => { pullTime(); T.activities.push({}); renderTime(ro); });
  $('#addEq')?.addEventListener('click', () => { pullTime(); T.equipment.push({}); renderTime(ro); });
  document.querySelectorAll('[data-del-act]').forEach(b => b.onclick = () => { pullTime(); T.activities.splice(+b.dataset.delAct, 1); if (!T.activities.length) T.activities.push({}); renderTime(ro); });
  document.querySelectorAll('[data-del-eq]').forEach(b => b.onclick = () => { pullTime(); T.equipment.splice(+b.dataset.delEq, 1); if (!T.equipment.length) T.equipment.push({}); renderTime(ro); });
  document.querySelectorAll('[data-add-p]').forEach(b => b.onclick = () => { pullTime(); T.manpower[b.dataset.addP].push('', ''); renderTime(ro); });
  document.querySelectorAll('[data-del-p]').forEach(b => b.onclick = () => { pullTime(); const [k, i] = b.dataset.delP.split(':'); T.manpower[k].splice(+i, 1); if (!T.manpower[k].length) T.manpower[k].push(''); renderTime(ro); });
  document.querySelectorAll('#acts input[type=time]').forEach(i => i.addEventListener('change', () => { pullTime(); $('#hrs').textContent = calcHours(); }));

  $('#save')?.addEventListener('click', async () => {
    pullTime();
    if (!T.mv.trim()) return toast('Please enter the vessel name (MV)', true);
    try {
      const r = await api('save', { body: { ...T, date: T.report_date } });
      T.id = r.id; toast('Report saved');
      history.replaceState(null, '', '#/time/' + r.id);
    } catch (e) { toast(e.message, true); }
  });
  $('#img').onclick = () => { pullTime(); exportImage(fname('TimeReport', T.mv, T.report_date)); };
  $('#pdf').onclick = () => { pullTime(); exportPDF(fname('TimeReport', T.mv, T.report_date)); };
}

/* ---------------- DISCHARGE LIST FORM ---------------- */
let D = null;
async function formDischarge(id, ro) {
  $app.innerHTML = '<div class="wrap"><p class="empty">Loading…</p></div>';
  D = { id: 0, mv: '', voy: '', list_date: today(), shift: '', berth: '', yard_no: '', remarks: '', items: [{}, {}, {}] };
  try {
    if (id) { const r = (await api('get', { type: 'discharge', params: { id } })).row; D = { ...D, ...r }; if (!D.items.length) D.items = [{}]; }
  } catch (e) { toast(e.message, true); return home(); }
  renderDischarge(ro);
}
function pullD() {
  const g = id => document.getElementById(id)?.value ?? '';
  D.mv = g('mv'); D.voy = g('voy'); D.list_date = g('date') || today(); D.shift = g('shift'); D.berth = g('berth'); D.yard_no = g('yard'); D.remarks = g('rem');
  D.items = [...document.querySelectorAll('#items tr[data-i]')].map(tr => ({
    item_no: tr.querySelector('.n').value, description: tr.querySelector('.d').value, qty: tr.querySelector('.q').value,
    unit: tr.querySelector('.u').value, location: tr.querySelector('.l').value, remarks: tr.querySelector('.r').value }));
}
function renderDischarge(ro) {
  const d = D;
  const rows = d.items.map((it, i) => `<tr data-i="${i}">
    <td><input class="inp n" value="${esc(it.item_no)}"></td><td><input class="inp d" value="${esc(it.description)}"></td>
    <td><input class="inp q" value="${esc(it.qty)}"></td><td><input class="inp u" value="${esc(it.unit)}"></td>
    <td><input class="inp l" value="${esc(it.location)}"></td><td><input class="inp r" value="${esc(it.remarks)}"></td>
    <td class="xh" style="text-align:center"><button class="del big" data-del="${i}">${ICON.trash.replace('<svg', '<svg width="12" height="12"')}</button></td></tr>`).join('');
  $app.innerHTML = `<div class="wrap ${ro ? 'readonly' : ''}">${backBtn()}
    <div class="sheet wide" id="sheet">
      <div class="title"><img class="title-logo" src="${LOGO_SRC}" alt="">DISCHARGE LIST</div>
      <table class="t"><tr><th>MV</th><th>VOY</th><th>Date</th><th>Shift</th></tr>
        <tr><td><input class="inp" id="mv" value="${esc(d.mv)}"></td><td><input class="inp" id="voy" value="${esc(d.voy)}"></td>
        <td><input type="date" class="inp" id="date" value="${d.list_date}"></td><td>${shiftSelect(d.shift)}</td></tr></table>
      <table class="t" style="margin-top:-1px"><colgroup><col style="width:25%"><col style="width:75%"></colgroup>
        <tr><th>Berth</th><th>Yard No</th></tr>
        <tr><td><input class="inp" id="berth" list="berthList" value="${esc(d.berth)}">${DL_BERTH}</td><td><input class="inp" id="yard" list="yardList" value="${esc(d.yard_no)}">${DL_YARD}</td></tr></table>
      <div class="gap"></div>
      <div class="box"><table class="t" id="items">
        <colgroup><col style="width:15%"><col style="width:26%"><col style="width:9%"><col style="width:9%"><col style="width:14%"><col><col class="xh" style="width:48px"></colgroup>
        <tr><th>Item / Cont. No</th><th>Description</th><th>Qty</th><th>Unit</th><th>Location</th><th>Remarks</th><th class="xh">Actions</th></tr>${rows}</table>
        <div class="xh" style="padding:5px"><button class="add" id="addItem">+ Add Item</button></div></div>
      <div class="gap"></div>
      <div class="box"><table class="t"><tr><th>Remarks</th></tr></table>
        <div style="padding:10px"><textarea class="inp" id="rem">${esc(d.remarks)}</textarea></div></div>
    </div>
    <div class="actions noprint">
      ${ro ? (can('edit') ? `<button class="btn orange" onclick="go('discharge/${d.id}')">${ICON.edit} Edit</button>` : '') : `<button class="btn green" id="save">${ICON.save} Save List</button>`}
      <button class="btn blue" id="img">${ICON.img} Export Image</button>
      <button class="btn blue" id="pdf">${ICON.pdf} Export PDF</button>
      <button class="btn gray" onclick="window.print()">${ICON.print} Print</button>
    </div></div>`;
  if (ro) $app.querySelectorAll('input,select,textarea').forEach(e => e.disabled = true);
  const $ = s => document.querySelector(s);
  $('#addItem')?.addEventListener('click', () => { pullD(); D.items.push({}); renderDischarge(ro); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { pullD(); D.items.splice(+b.dataset.del, 1); if (!D.items.length) D.items.push({}); renderDischarge(ro); });
  $('#save')?.addEventListener('click', async () => {
    pullD();
    if (!D.mv.trim()) return toast('Please enter the vessel name (MV)', true);
    try {
      const r = await api('save', { type: 'discharge', body: { ...D, date: D.list_date } });
      D.id = r.id; toast('Discharge list saved'); history.replaceState(null, '', '#/discharge/' + r.id);
    } catch (e) { toast(e.message, true); }
  });
  $('#img').onclick = () => { pullD(); exportImage(fname('Discharge', D.mv, D.list_date)); };
  $('#pdf').onclick = () => { pullD(); exportPDF(fname('Discharge', D.mv, D.list_date)); };
}

/* ---------------- MULTI-REPORT PDF ---------------- */
const vcell = (v, left) => `<div class="val${left ? ' left' : ''}">${esc(v) || '&nbsp;'}</div>`;

function staticTimeSheet(r) {
  const acts = (r.activities || []).filter(a => a.start_time || a.end_time || a.qty || a.what_we_use);
  const eqs = (r.equipment || []).filter(e => e.equipment || e.operator || e.start_time || e.end_time);
  if (!acts.length) acts.push({});
  if (!eqs.length) eqs.push({});
  const mp = r.manpower || {};
  const people = k => `<td class="vtop"><div class="chips">${(mp[k] || []).filter(Boolean).map(b => `<span>${esc(b)}</span>`).join('') || '&nbsp;'}</div></td>`;
  return `<div class="title"><img class="title-logo" src="${LOGO_SRC}" alt="">TIME REPORT${r.report_type ? `<span class="title-type tt-static">${esc(r.report_type)}</span>` : ''}</div>
    <table class="t"><tr><th>MV</th><th>VOY</th><th>Date</th><th>Shift</th></tr>
      <tr><td>${vcell(r.mv)}</td><td>${vcell(r.voy)}</td><td>${vcell(fmtDate(r.report_date))}</td><td>${vcell(r.shift)}</td></tr></table>
    <table class="t" style="margin-top:-1px"><colgroup><col style="width:25%"><col style="width:25%"><col style="width:50%"></colgroup>
      <tr><th>Berth</th><th>Bollard</th><th>Yard No</th></tr>
      <tr><td>${vcell(r.berth)}</td><td>${vcell(r.bollard)}</td><td>${vcell(r.yard_no)}</td></tr></table>
    <div class="gap"></div>
    <table class="t"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:16%"><col></colgroup>
      <tr><th>Start Time</th><th>End Time</th><th>No</th><th>What We Use</th></tr>
      ${acts.map(a => `<tr><td>${vcell(hhmm(a.start_time))}</td><td>${vcell(hhmm(a.end_time))}</td><td>${vcell(a.qty)}</td><td>${vcell(a.what_we_use)}</td></tr>`).join('')}</table>
    <div class="gap"></div>
    <table class="t"><tr><th>What We Do</th></tr><tr><td><div class="what">${esc(r.what_we_do)}</div></td></tr></table>
    <div class="gap"></div>
    <table class="t"><tr><th>FOREMAN</th><th>TALLYMAN</th><th>DOCKER</th></tr>
      <tr>${people('FOREMAN')}${people('TALLYMAN')}${people('DOCKER')}</tr></table>
    <div class="gap"></div>
    <table class="t"><colgroup><col style="width:30%"><col style="width:30%"><col style="width:20%"><col style="width:20%"></colgroup>
      <tr><th>Equipment</th><th>Operator 1</th><th>Start</th><th>End</th></tr>
      ${eqs.map(e => `<tr><td>${vcell(e.equipment)}</td><td>${vcell(e.operator)}</td><td>${vcell(hhmm(e.start_time))}</td><td>${vcell(hhmm(e.end_time))}</td></tr>`).join('')}</table>`;
}

function staticDischargeSheet(r) {
  const items = (r.items || []).filter(nonEmptyObj);
  if (!items.length) items.push({});
  return `<div class="title"><img class="title-logo" src="${LOGO_SRC}" alt="">DISCHARGE LIST</div>
    <table class="t"><tr><th>MV</th><th>VOY</th><th>Date</th><th>Shift</th></tr>
      <tr><td>${vcell(r.mv)}</td><td>${vcell(r.voy)}</td><td>${vcell(fmtDate(r.list_date))}</td><td>${vcell(r.shift)}</td></tr></table>
    <table class="t" style="margin-top:-1px"><colgroup><col style="width:25%"><col style="width:75%"></colgroup>
      <tr><th>Berth</th><th>Yard No</th></tr><tr><td>${vcell(r.berth)}</td><td>${vcell(r.yard_no)}</td></tr></table>
    <div class="gap"></div>
    <table class="t"><colgroup><col style="width:16%"><col style="width:28%"><col style="width:10%"><col style="width:10%"><col style="width:14%"><col></colgroup>
      <tr><th>Item / Cont. No</th><th>Description</th><th>Qty</th><th>Unit</th><th>Location</th><th>Remarks</th></tr>
      ${items.map(i => `<tr><td>${vcell(i.item_no)}</td><td>${vcell(i.description)}</td><td>${vcell(i.qty)}</td><td>${vcell(i.unit)}</td><td>${vcell(i.location)}</td><td>${vcell(i.remarks)}</td></tr>`).join('')}</table>
    <div class="gap"></div>
    <table class="t"><tr><th>Remarks</th></tr><tr><td><div class="what">${esc(r.remarks)}</div></td></tr></table>`;
}
const nonEmptyObj = o => Object.values(o).some(v => String(v ?? '').trim() !== '');

/* one PDF, one report per A4 page */
async function exportMany(tab, items) {
  items.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || (+a.id) - (+b.id));
  const btn = document.getElementById('dlPdf'), lbl = btn.querySelector('span');
  const old = lbl.textContent; btn.disabled = true;
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${tab === 'time' ? 700 : 900}px;background:#fff`;
  document.body.appendChild(host);
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    for (let i = 0; i < items.length; i++) {
      lbl.textContent = `Preparing ${i + 1}/${items.length}…`;
      const row = (await api('get', { type: tab, params: { id: items[i].id } })).row;
      host.innerHTML = `<div class="sheet" style="max-width:none;margin:0;padding:6px;background:#fff">${tab === 'time' ? staticTimeSheet(row) : staticDischargeSheet(row)}</div>`;
      const canvas = await html2canvas(host.firstElementChild, { scale: 2, backgroundColor: '#fff' });
      if (i) pdf.addPage();
      const w = 190, h = canvas.height * w / canvas.width, k = h > 277 ? 277 / h : 1;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 10 + (190 - w * k) / 2, 10, w * k, h * k);
    }
    const names = new Set(items.map(x => x.mv));
    pdf.save(fname(tab === 'time' ? 'TimeReports' : 'DischargeLists', names.size === 1 ? items[0].mv : 'Multiple', today()) + '.pdf');
    toast(`PDF ready (${items.length} reports)`);
  } catch (e) { toast(e.message, true); }
  finally { host.remove(); lbl.textContent = old; btn.disabled = false; }
}

/* ---------------- ADVANCED SEARCH ---------------- */
const S = { tab: 'time', showFilters: true, q: '', from: '', to: '', shift: '', yard: '', berth: '', rtype: '' };

async function searchView(tab) {
  S.tab = tab; S.sel = new Map(); // selected reports: id -> {mv, date}
  let meta = { time: 0, discharge: 0, berths: [], yards: [] };
  try { meta = await api('meta'); } catch (e) { toast(e.message, true); }
  const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');

  $app.innerHTML = `<div class="wrap">
    <div class="shead"><button class="btn sm" onclick="go('home')">${ICON.back} Back to Reports</button>
      <h2>${ICON.search} Advanced Search</h2><p>Find specific reports with detailed filters</p></div>
    <div class="tabs">
      <button class="tab ${tab === 'time' ? 'on' : ''}" onclick="go('search')">Time Reports <i>${meta.time}</i></button>
      <button class="tab ${tab === 'discharge' ? 'on' : ''}" onclick="go('search/discharge')">Discharge List <i>${meta.discharge}</i></button>
    </div>
    <div class="panel">
      <label>${ICON.search.replace('<svg', '<svg width="12" height="12"')} Search All Fields</label>
      <input class="search" id="q" placeholder="Search vessel name, voyage, berth, yard..." value="${esc(S.q)}">
      <button class="btn" id="tg">${S.showFilters ? 'Hide Filters' : 'Show Filters'}</button>
      <div class="filters" id="flt" style="display:${S.showFilters ? 'block' : 'none'}">
        <h4>Time &amp; Date Filters</h4>
        <div class="fgrid">
          <div><label>Date From</label><input type="date" id="from" value="${S.from}"></div>
          <div><label>Date To</label><input type="date" id="to" value="${S.to}"></div>
          <div><label>Shift Type</label><select id="shift">${opt(['Day', 'Night'], S.shift, 'All Shifts')}</select></div>
          <div><label>Yard No</label><select id="yard">${opt([...new Set([...YARDS, ...meta.yards])], S.yard, 'All Locations')}</select></div>
          <div><label>Berth</label><select id="berth">${opt([...new Set([...BERTHS, ...meta.berths])], S.berth, 'All Berths')}</select></div>
          ${tab === 'time' ? `<div><label>Report Type</label><select id="rtype">${opt(REPORT_TYPES, S.rtype, 'All Types')}</select></div>` : ''}
        </div>
      </div>
    </div>
    <div class="results"><div class="rhead">${tab === 'time' ? 'Time Reports' : 'Discharge Lists'} <small id="cnt"></small>
      <button class="btn blue ${can('export') ? '' : 'perm-hide'}" id="dlPdf" disabled style="margin-left:auto">${ICON.pdf}<span>Download PDF (0)</span></button></div>
      <div class="scroll"><table class="r"><thead><tr><th class="${can('export') ? '' : 'perm-hide'}" style="width:38px"><input type="checkbox" id="selAll" class="chk" title="Select all"></th><th>Date</th><th>Vessel</th><th>Voyage</th>${tab === 'time' ? '<th>Type</th>' : ''}<th>Shift</th><th>Berth</th><th>Yard</th><th class="xh">Actions</th></tr></thead>
      <tbody id="rows"></tbody></table></div></div></div>`;

  const ids = ['q', 'from', 'to', 'shift', 'yard', 'berth', ...(tab === 'time' ? ['rtype'] : [])];
  let timer;
  const refresh = () => { ids.forEach(i => S[i] = document.getElementById(i).value); clearTimeout(timer); timer = setTimeout(load, 200); };
  ids.forEach(i => document.getElementById(i).addEventListener(i === 'q' ? 'input' : 'change', refresh));
  document.getElementById('tg').onclick = () => { S.showFilters = !S.showFilters; document.getElementById('flt').style.display = S.showFilters ? 'block' : 'none'; document.getElementById('tg').textContent = S.showFilters ? 'Hide Filters' : 'Show Filters'; };
  document.getElementById('dlPdf').onclick = () => exportMany(tab, [...S.sel].map(([id, v]) => ({ id, ...v })));
  load();

  async function load() {
    const params = {}; ids.forEach(i => { if (S[i]) params[i] = S[i]; });
    const tb = document.getElementById('rows');
    try {
      const rows = (await api('list', { type: tab, params })).rows;
      document.getElementById('cnt').textContent = `(${rows.length} results)`;
      tb.innerHTML = rows.length ? rows.map(r => `<tr>
        <td class="${can('export') ? '' : 'perm-hide'}"><input type="checkbox" class="chk" data-sel="${r.id}" ${S.sel.has(String(r.id)) ? 'checked' : ''}></td>
        <td>${fmtDate(r.the_date)}</td><td><b>${esc(r.mv)}</b></td><td>${esc(r.voy)}</td>${tab === 'time' ? `<td>${esc(r.report_type) || '-'}</td>` : ''}
        <td>${r.shift ? `<span class="pill ${r.shift === 'Day' ? 'day' : ''}">${esc(r.shift)}</span>` : '-'}</td>
        <td class="berth">${esc(r.berth) || '-'}</td><td>${esc(r.yard_no) || '-'}</td>
        <td><div class="acts">
          <button class="btn sm view" onclick="go('${tab}/${r.id}/view')">${ICON.eye} View</button>
          ${can('edit') ? `<button class="btn sm" onclick="go('${tab}/${r.id}')">${ICON.edit} Edit</button>` : ''}
          ${tab === 'time' && can('pams') ? `<button class="btn sm pams ${+r.pams_done ? '' : 'off'}" data-pams="${r.id}">${ICON.check} PAMS Done</button>` : ''}
          ${can('delete') ? `<button class="btn sm red" data-del="${r.id}">${ICON.trash}</button>` : ''}
        </div></td></tr>`).join('') : '<tr><td colspan="9" class="empty">No results</td></tr>';
      const upd = () => {
        const n = S.sel.size, b = document.getElementById('dlPdf');
        if (b.dataset.busy) return;
        b.disabled = !n; b.querySelector('span').textContent = `Download PDF (${n})`;
        document.getElementById('selAll').checked = rows.length > 0 && rows.every(r => S.sel.has(String(r.id)));
      };
      const pick = (r, on) => on ? S.sel.set(String(r.id), { mv: r.mv, date: r.the_date }) : S.sel.delete(String(r.id));
      tb.querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { pick(rows.find(x => String(x.id) === c.dataset.sel), c.checked); upd(); });
      document.getElementById('selAll').onchange = e => { rows.forEach(r => pick(r, e.target.checked)); tb.querySelectorAll('[data-sel]').forEach(c => c.checked = e.target.checked); upd(); };
      upd();
      tb.querySelectorAll('[data-pams]').forEach(b => b.onclick = async () => {
        try { const r = await api('pams', { body: { id: +b.dataset.pams } }); b.classList.toggle('off', !r.pams_done); toast(r.pams_done ? 'Marked as PAMS done' : 'PAMS mark removed'); } catch (e) { toast(e.message, true); }
      });
      tb.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('Delete this record permanently?')) return;
        try { await api('delete', { type: tab, body: { id: +b.dataset.del } }); toast('Deleted'); searchView(tab); } catch (e) { toast(e.message, true); }
      });
    } catch (e) { tb.innerHTML = `<tr><td colspan="9" class="empty">${esc(e.message)}</td></tr>`; }
  }
}

// on load: if a saved session is no longer valid in the database, ask for sign-in again
(async () => {
  if (isAuthed() && usingSb()) {
    try {
      const me = await sbRpc('whoami');
      if (me && me.ok === false) return logout();
      if (me && me.ok) setPerms(me.perms || null);   // pick up changes made by the admin
    } catch {}
  }
  route();
})();
