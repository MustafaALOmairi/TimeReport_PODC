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
  const qs = new URLSearchParams({ action, type, ...params });
  const res = await fetch(API + '?' + qs, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  let j; try { j = await res.json(); } catch { throw new Error('Invalid server response'); }
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

/* logo: put your own file at assets/logo.png (falls back to text if missing) */
const LOGO = '<img src="assets/logo.png" alt="Port of Duqm" onerror="this.style.display=\'none\'">';

/* ---------------- router ---------------- */
function route() {
  const [page, a, b] = (location.hash.replace('#/', '') || 'home').split('/');
  if (page === 'new') return formTime(null, false);
  if (page === 'time' && a) return formTime(+a, b === 'view');
  if (page === 'discharge-new') return formDischarge(null, false);
  if (page === 'discharge' && a) return formDischarge(+a, b === 'view');
  if (page === 'search') return searchView(a === 'discharge' ? 'discharge' : 'time');
  return home();
}
window.addEventListener('hashchange', route);
const go = h => { location.hash = '#/' + h; };

/* ---------------- HOME ---------------- */
function home() {
  $app.innerHTML = `<div class="wrap">
    <div class="hero">${LOGO}<h1>TIME REPORT</h1></div>
    <div class="cards">
      <button class="card c-green" onclick="go('new')">
        <div class="top"><div class="ic">${ICON.plus}</div><div><h3>New Report</h3><p>Create shift report</p></div></div>
        <div class="cta"><b>Create</b><span>New Entry</span></div></button>
      <button class="card c-purple" onclick="go('discharge-new')">
        <div class="top"><div class="ic">${ICON.list}</div><div><h3>Discharge List</h3><p>Create discharge list</p></div></div>
        <div class="cta"><b>Create</b><span>New Entry</span></div></button>
      <button class="card c-blue" onclick="go('search')">
        <div class="top"><div class="ic">${ICON.search}</div><div><h3>Search Reports</h3><p>Find historical data</p></div></div>
        <div class="cta"><b>Search</b><span>Advanced Filters</span></div></button>
    </div></div>`;
}

/* ---------------- shared form bits ---------------- */
const backBtn = (to = 'home') => `<button class="back noprint" onclick="go('${to}')">${ICON.back} Back to Dashboard</button>`;

function shiftSelect(v) {
  return `<select class="inp" id="shift"><option value="">Select Shift</option>
    ${['Day', 'Night'].map(s => `<option ${v === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
}

async function exportImage(name) {
  const el = document.getElementById('sheet');
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff' });
  const a = document.createElement('a');
  a.download = name + '.png'; a.href = canvas.toDataURL('image/png'); a.click();
}
async function exportPDF(name) {
  const el = document.getElementById('sheet');
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff' });
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
    id: 0, mv: '', voy: '', report_date: today(), shift: '', berth: '', bollard: '', yard_no: '', what_we_do: '',
    activities: [{}, {}], equipment: [{}, {}],
    manpower: { FOREMAN: ['', '', ''], TALLYMAN: ['', '', ''], DOCKER: ['', '', ''] },
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
  T.mv = g('mv'); T.voy = g('voy'); T.report_date = g('date') || today(); T.shift = g('shift');
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
      <td style="text-align:center"><button class="del big" data-del-act="${i}" title="Remove">${ICON.trash.replace('<svg', '<svg width="12" height="12"')}</button></td></tr>`).join('');
  const eqRows = t.equipment.map((e, i) => `<tr data-i="${i}">
      <td><input class="inp eq" value="${esc(e.equipment)}"></td>
      <td><input class="inp op" value="${esc(e.operator)}"></td>
      <td><input type="time" class="inp s" value="${hhmm(e.start_time)}"></td>
      <td><input type="time" class="inp e" value="${hhmm(e.end_time)}"></td>
      <td style="text-align:center"><button class="del big" data-del-eq="${i}" title="Remove">${ICON.trash.replace('<svg', '<svg width="12" height="12"')}</button></td></tr>`).join('');
  const people = k => `<td style="vertical-align:top"><div class="people"><div class="row" id="mp-${k}">
      ${t.manpower[k].map((b, i) => `<span class="person"><input class="inp" value="${esc(b)}"><button class="del" data-del-p="${k}:${i}">${ICON.trash.replace('<svg', '<svg width="10" height="10"')}</button></span>`).join('')}
      </div><button class="padd" data-add-p="${k}">+</button></div></td>`;

  $app.innerHTML = `<div class="wrap ${ro ? 'readonly' : ''}">
    ${backBtn()}
    <div class="sheet" id="sheet">
      <div class="title">TIME REPORT</div>
      <div class="gap" style="height:0"></div>
      <table class="t" style="margin-top:0">
        <tr><th>MV</th><th>VOY</th><th>Date</th><th>Shift</th></tr>
        <tr><td><input class="inp" id="mv" value="${esc(t.mv)}"></td><td><input class="inp" id="voy" value="${esc(t.voy)}"></td>
            <td><input type="date" class="inp" id="date" value="${t.report_date}"></td><td>${shiftSelect(t.shift)}</td></tr>
      </table>
      <table class="t" style="margin-top:-1px">
        <colgroup><col style="width:25%"><col style="width:25%"><col style="width:50%"></colgroup>
        <tr><th>Berth</th><th>Bollard</th><th>Yard No</th></tr>
        <tr><td><input class="inp" id="berth" value="${esc(t.berth)}"></td><td><input class="inp" id="bollard" value="${esc(t.bollard)}"></td>
            <td><input class="inp" id="yard" value="${esc(t.yard_no)}"></td></tr>
      </table>
      <div class="gap"></div>
      <div class="box">
        <table class="t" id="acts"><colgroup><col style="width:26%"><col style="width:26%"><col style="width:16%"><col><col style="width:48px"></colgroup>
          <tr><th>Start Time</th><th>End Time</th><th>No</th><th>What We Use</th><th>Actions</th></tr>${actRows}</table>
        <div style="padding:5px"><button class="add" id="addAct">+ Add Work Activity</button></div>
        <div class="hours">Total working time: <b id="hrs">${calcHours()}</b></div>
      </div>
      <div class="gap"></div>
      <div class="box"><table class="t"><tr><th>What We Do</th></tr></table>
        <div style="padding:10px"><textarea class="inp" id="what" placeholder="Describe the work activities performed...">${esc(t.what_we_do)}</textarea></div></div>
      <div class="gap"></div>
      <div class="box"><table class="t"><tr><th>FOREMAN</th><th>TALLYMAN</th><th>DOCKER</th></tr>
        <tr>${people('FOREMAN')}${people('TALLYMAN')}${people('DOCKER')}</tr></table></div>
      <div class="gap"></div>
      <div class="box">
        <table class="t" id="eqs"><colgroup><col style="width:24%"><col style="width:24%"><col style="width:22%"><col style="width:22%"><col style="width:48px"></colgroup>
          <tr><th>Equipment</th><th>Operator 1</th><th>Start</th><th>End</th><th>Actions</th></tr>${eqRows}</table>
        <div style="padding:5px"><button class="add" id="addEq">+ Add Equipment</button></div>
      </div>
    </div>
    <div class="actions noprint">
      ${ro ? `<button class="btn orange" onclick="go('time/${t.id}')">${ICON.edit} Edit</button>` : `<button class="btn green" id="save">${ICON.save} Save Report</button>`}
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
  document.querySelectorAll('[data-add-p]').forEach(b => b.onclick = () => { pullTime(); T.manpower[b.dataset.addP].push(''); renderTime(ro); });
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
    <td style="text-align:center"><button class="del big" data-del="${i}">${ICON.trash.replace('<svg', '<svg width="12" height="12"')}</button></td></tr>`).join('');
  $app.innerHTML = `<div class="wrap ${ro ? 'readonly' : ''}">${backBtn()}
    <div class="sheet wide" id="sheet">
      <div class="title">DISCHARGE LIST</div>
      <table class="t"><tr><th>MV</th><th>VOY</th><th>Date</th><th>Shift</th></tr>
        <tr><td><input class="inp" id="mv" value="${esc(d.mv)}"></td><td><input class="inp" id="voy" value="${esc(d.voy)}"></td>
        <td><input type="date" class="inp" id="date" value="${d.list_date}"></td><td>${shiftSelect(d.shift)}</td></tr></table>
      <table class="t" style="margin-top:-1px"><colgroup><col style="width:25%"><col style="width:75%"></colgroup>
        <tr><th>Berth</th><th>Yard No</th></tr>
        <tr><td><input class="inp" id="berth" value="${esc(d.berth)}"></td><td><input class="inp" id="yard" value="${esc(d.yard_no)}"></td></tr></table>
      <div class="gap"></div>
      <div class="box"><table class="t" id="items">
        <colgroup><col style="width:15%"><col style="width:26%"><col style="width:9%"><col style="width:9%"><col style="width:14%"><col><col style="width:48px"></colgroup>
        <tr><th>Item / Cont. No</th><th>Description</th><th>Qty</th><th>Unit</th><th>Location</th><th>Remarks</th><th>Actions</th></tr>${rows}</table>
        <div style="padding:5px"><button class="add" id="addItem">+ Add Item</button></div></div>
      <div class="gap"></div>
      <div class="box"><table class="t"><tr><th>Remarks</th></tr></table>
        <div style="padding:10px"><textarea class="inp" id="rem">${esc(d.remarks)}</textarea></div></div>
    </div>
    <div class="actions noprint">
      ${ro ? `<button class="btn orange" onclick="go('discharge/${d.id}')">${ICON.edit} Edit</button>` : `<button class="btn green" id="save">${ICON.save} Save List</button>`}
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

/* ---------------- ADVANCED SEARCH ---------------- */
const S = { tab: 'time', showFilters: true, q: '', from: '', to: '', shift: '', yard: '', berth: '' };

async function searchView(tab) {
  S.tab = tab;
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
          <div><label>Yard No</label><select id="yard">${opt(meta.yards, S.yard, 'All Locations')}</select></div>
          <div><label>Berth</label><select id="berth">${opt(meta.berths, S.berth, 'All Berths')}</select></div>
        </div>
      </div>
    </div>
    <div class="results"><div class="rhead">${tab === 'time' ? 'Time Reports' : 'Discharge Lists'} <small id="cnt"></small></div>
      <div class="scroll"><table class="r"><thead><tr><th>Date</th><th>Vessel</th><th>Voyage</th><th>Shift</th><th>Berth</th><th>Yard</th><th>Actions</th></tr></thead>
      <tbody id="rows"></tbody></table></div></div></div>`;

  const ids = ['q', 'from', 'to', 'shift', 'yard', 'berth'];
  let timer;
  const refresh = () => { ids.forEach(i => S[i] = document.getElementById(i).value); clearTimeout(timer); timer = setTimeout(load, 200); };
  ids.forEach(i => document.getElementById(i).addEventListener(i === 'q' ? 'input' : 'change', refresh));
  document.getElementById('tg').onclick = () => { S.showFilters = !S.showFilters; document.getElementById('flt').style.display = S.showFilters ? 'block' : 'none'; document.getElementById('tg').textContent = S.showFilters ? 'Hide Filters' : 'Show Filters'; };
  load();

  async function load() {
    const params = {}; ids.forEach(i => { if (S[i]) params[i] = S[i]; });
    const tb = document.getElementById('rows');
    try {
      const rows = (await api('list', { type: tab, params })).rows;
      document.getElementById('cnt').textContent = `(${rows.length} results)`;
      tb.innerHTML = rows.length ? rows.map(r => `<tr>
        <td>${fmtDate(r.the_date)}</td><td><b>${esc(r.mv)}</b></td><td>${esc(r.voy)}</td>
        <td>${r.shift ? `<span class="pill ${r.shift === 'Day' ? 'day' : ''}">${esc(r.shift)}</span>` : '-'}</td>
        <td class="berth">${esc(r.berth) || '-'}</td><td>${esc(r.yard_no) || '-'}</td>
        <td><div class="acts">
          <button class="btn sm view" onclick="go('${tab}/${r.id}/view')">${ICON.eye} View</button>
          <button class="btn sm" onclick="go('${tab}/${r.id}')">${ICON.edit} Edit</button>
          ${tab === 'time' ? `<button class="btn sm pams ${+r.pams_done ? '' : 'off'}" data-pams="${r.id}">${ICON.check} PAMS Done</button>` : ''}
          <button class="btn sm red" data-del="${r.id}">${ICON.trash}</button>
        </div></td></tr>`).join('') : '<tr><td colspan="7" class="empty">No results</td></tr>';
      tb.querySelectorAll('[data-pams]').forEach(b => b.onclick = async () => {
        try { const r = await api('pams', { body: { id: +b.dataset.pams } }); b.classList.toggle('off', !r.pams_done); toast(r.pams_done ? 'Marked as PAMS done' : 'PAMS mark removed'); } catch (e) { toast(e.message, true); }
      });
      tb.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('Delete this record permanently?')) return;
        try { await api('delete', { type: tab, body: { id: +b.dataset.del } }); toast('Deleted'); searchView(tab); } catch (e) { toast(e.message, true); }
      });
    } catch (e) { tb.innerHTML = `<tr><td colspan="7" class="empty">${esc(e.message)}</td></tr>`; }
  }
}

route();
