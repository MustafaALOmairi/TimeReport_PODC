/* Supabase adapter: implements the same actions as api.php (list, meta, get, save, pams, delete)
   using Supabase's REST API, so the frontend works on static hosting such as GitHub Pages. */
const sbToken = () => { try { return sessionStorage.getItem('tr_token') || ''; } catch { return ''; } };
async function sbRpc(name, args = {}) {
  const res = await sbFetch('rpc/' + name, { method: 'POST', body: args });
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function sbFetch(path, { method = 'GET', body, prefer } = {}) {
  const c = window.TR_CONFIG;
  const headers = { apikey: c.SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (c.SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + c.SUPABASE_KEY; // legacy JWT keys only
  if (prefer) headers.Prefer = prefer;
  const tok = sbToken(); if (tok) headers['x-client-info'] = tok; // session token (checked by is_valid_session() in the database)
  let res;
  try {
    res = await fetch(c.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('Cannot reach Supabase. Check your internet and SUPABASE_URL in config.js');
  }
  if (!res.ok) {
    let m = ''; try { m = (await res.json()).message; } catch {}
    if (/row-level security|permission denied/i.test(m)) m = 'You do not have permission for this action';
    throw new Error(m || 'Supabase error ' + res.status);
  }
  return res;
}

const sbTable = t => t === 'time' ? 'time_reports' : 'discharge_lists';
const sbDate = t => t === 'time' ? 'report_date' : 'list_date';
const nonEmpty = o => Object.values(o).some(v => String(v ?? '').trim() !== '');

async function sbApi(action, { type = 'time', params = {}, body = null } = {}) {
  const tbl = sbTable(type), dcol = sbDate(type);

  if (action === 'list') {
    const qs = new URLSearchParams({ select: '*', order: `${dcol}.desc,id.desc`, limit: '1000' });
    const q = String(params.q || '').replace(/[,()*\\%]/g, ' ').trim();
    if (q) qs.append('or', `(mv.ilike.*${q}*,voy.ilike.*${q}*,berth.ilike.*${q}*,yard_no.ilike.*${q}*${type === 'time' ? `,report_type.ilike.*${q}*` : ''})`);
    if (params.from) qs.append(dcol, 'gte.' + params.from);
    if (params.to) qs.append(dcol, 'lte.' + params.to);
    if (params.shift) qs.append('shift', 'eq.' + params.shift);
    if (params.yard) qs.append('yard_no', 'eq.' + params.yard);
    if (params.berth) qs.append('berth', 'eq.' + params.berth);
    if (params.rtype && type === 'time') qs.append('report_type', 'eq.' + params.rtype);
    const rows = await (await sbFetch(`${tbl}?${qs}`)).json();
    return { ok: true, rows: rows.map(r => ({ ...r, the_date: r[dcol] })) };
  }

  if (action === 'meta') {
    const out = { ok: true, time: 0, discharge: 0, berths: [], yards: [] };
    const bs = new Set(), ys = new Set();
    for (const [key, t] of [['time', 'time_reports'], ['discharge', 'discharge_lists']]) {
      const res = await sbFetch(`${t}?select=berth,yard_no&order=id.desc&limit=5000`, { prefer: 'count=exact' });
      const rows = await res.json();
      const total = (res.headers.get('content-range') || '').split('/')[1];
      out[key] = total && total !== '*' ? +total : rows.length;
      rows.forEach(r => { if (r.berth) bs.add(r.berth); if (r.yard_no) ys.add(r.yard_no); });
    }
    out.berths = [...bs].sort(); out.yards = [...ys].sort();
    return out;
  }

  if (action === 'get') {
    const rows = await (await sbFetch(`${tbl}?id=eq.${+params.id}&select=*`)).json();
    if (!rows.length) throw new Error('Not found');
    const r = rows[0];
    if (type === 'time') {
      r.activities = r.activities || [];
      r.equipment = r.equipment || [];
      r.manpower = { FOREMAN: [], TALLYMAN: [], DOCKER: [], ...(r.manpower || {}) };
    } else r.items = r.items || [];
    return { ok: true, row: r };
  }

  if (action === 'save') {
    const b = body || {};
    let row;
    if (type === 'time') {
      const mp = {};
      for (const k of ['FOREMAN', 'TALLYMAN', 'DOCKER']) mp[k] = (b.manpower?.[k] || []).map(x => String(x).trim()).filter(Boolean);
      row = {
        mv: b.mv || '', voy: b.voy || '', report_type: b.report_type || '', report_date: b.date || b.report_date,
        shift: b.shift || '', berth: b.berth || '', bollard: b.bollard || '', yard_no: b.yard_no || '',
        what_we_do: b.what_we_do || '',
        sign_name: b.sign_name || '', signature: b.signature || '', created_by: b.created_by || '', created_by_user: b.created_by_user || '',
        activities: (b.activities || []).filter(nonEmpty),
        manpower: mp,
        equipment: (b.equipment || []).filter(nonEmpty),
      };
    } else {
      row = {
        mv: b.mv || '', voy: b.voy || '', list_date: b.date || b.list_date,
        shift: b.shift || '', berth: b.berth || '', yard_no: b.yard_no || '', remarks: b.remarks || '',
        items: (b.items || []).filter(nonEmpty),
      };
    }
    const id = +b.id || 0;
    const res = await sbFetch(id ? `${tbl}?id=eq.${id}` : tbl,
      { method: id ? 'PATCH' : 'POST', body: row, prefer: 'return=representation' });
    const saved = await res.json();
    if (!saved.length) throw new Error('Save failed (record not found or not allowed)');
    return { ok: true, id: saved[0].id };
  }

  if (action === 'pams') {
    const id = +body.id;
    const cur = (await (await sbFetch(`time_reports?id=eq.${id}&select=pams_done`)).json())[0];
    if (!cur) throw new Error('Not found');
    const upd = await (await sbFetch(`time_reports?id=eq.${id}`, { method: 'PATCH', body: { pams_done: !cur.pams_done }, prefer: 'return=representation' })).json();
    if (!upd.length) throw new Error('You do not have permission to change PAMS status');
    return { ok: true, pams_done: cur.pams_done ? 0 : 1 };
  }

  if (action === 'delete') {
    const del = await (await sbFetch(`${tbl}?id=eq.${+body.id}`, { method: 'DELETE', prefer: 'return=representation' })).json();
    if (!del.length) throw new Error('You do not have permission to delete this record');
    return { ok: true };
  }

  throw new Error('Unknown action');
}
