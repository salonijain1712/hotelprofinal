import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import useApi from '../hooks/useApi';
import Analytics from '../components/Analytics';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import { fmtDate, errMsg } from '../utils';

const act = async (fn, okMsg, reload) => {
  try { await fn(); if (okMsg) toast.success(okMsg); reload && reload(); } catch (e) { toast.error(errMsg(e)); }
};

function Users() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const { data, loading, reload } = useApi('/admin/users', { page, q: q || undefined, role: role || undefined });
  const { data: hotels } = useApi('/hotels');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'staff', hotel: '', position: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const create = (e) => {
    e.preventDefault();
    act(() => api.post('/admin/users', { ...f, hotel: f.hotel || undefined }), 'User created', () => { setF({ ...f, name: '', email: '', password: '', position: '' }); reload(); });
  };
  const update = (u, body) => act(() => api.put(`/admin/users/${u._id}`, body), 'Saved', reload);

  return (
    <>
      <form className="card card-body mb-4" onSubmit={create}>
        <h5>Create staff / manager / admin account</h5>
        <div className="row g-2">
          <div className="col-md-3"><input className="form-control" required placeholder="Name" value={f.name} onChange={set('name')} /></div>
          <div className="col-md-3"><input type="email" className="form-control" required placeholder="Email" value={f.email} onChange={set('email')} /></div>
          <div className="col-md-2"><input type="password" minLength={8} className="form-control" required placeholder="Password" value={f.password} onChange={set('password')} autoComplete="new-password" /></div>
          <div className="col-6 col-md-2"><select className="form-select" value={f.role} onChange={set('role')}>{['staff', 'manager', 'admin', 'guest'].map((r) => <option key={r}>{r}</option>)}</select></div>
          <div className="col-6 col-md-2"><select className="form-select" value={f.hotel} onChange={set('hotel')} required={['staff', 'manager'].includes(f.role)}><option value="">Hotel</option>{hotels?.hotels?.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</select></div>
          <div className="col-md-3"><input className="form-control" placeholder="Position (e.g. Housekeeping)" value={f.position} onChange={set('position')} /></div>
          <div className="col-md-2"><button className="btn btn-primary w-100">Create</button></div>
        </div>
      </form>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        <input className="form-control w-auto" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="form-select w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>{['guest', 'staff', 'manager', 'admin'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      {loading ? <Loader /> : (
        <div className="table-responsive"><table className="table align-middle">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Hotel</th><th>Joined</th><th>Active</th></tr></thead>
          <tbody>{data?.users?.map((u) => (
            <tr key={u._id} className={u.active ? '' : 'text-muted'}>
              <td>{u.name}<div className="small text-muted">{u.position}</div></td>
              <td>{u.email} {u.isVerified && <span title="Verified">✓</span>}</td>
              <td><select className="form-select form-select-sm" value={u.role} onChange={(e) => update(u, { role: e.target.value })}>{['guest', 'staff', 'manager', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></td>
              <td>
                <select className="form-select form-select-sm" value={u.hotel?._id || ''} onChange={(e) => update(u, { hotel: e.target.value })}>
                  <option value="">—</option>{hotels?.hotels?.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              </td>
              <td>{fmtDate(u.createdAt)}</td>
              <td><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={u.active} onChange={(e) => update(u, { active: e.target.checked })} aria-label={`Active ${u.name}`} /></div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </>
  );
}

function Hotels() {
  const { data, reload } = useApi('/hotels');
  const [f, setF] = useState({ name: '', city: '', country: 'India', phone: '', description: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = (e) => {
    e.preventDefault();
    act(() => api.post('/hotels', { name: f.name, description: f.description, address: { city: f.city, country: f.country }, contact: { phone: f.phone } }), 'Hotel created', () => { setF({ ...f, name: '', city: '', phone: '', description: '' }); reload(); });
  };
  return (
    <>
      <form className="card card-body mb-4" onSubmit={create}>
        <h5>Add hotel</h5>
        <div className="row g-2">
          <div className="col-md-3"><input className="form-control" required placeholder="Hotel name" value={f.name} onChange={set('name')} /></div>
          <div className="col-md-2"><input className="form-control" required placeholder="City" value={f.city} onChange={set('city')} /></div>
          <div className="col-md-2"><input className="form-control" placeholder="Country" value={f.country} onChange={set('country')} /></div>
          <div className="col-md-2"><input className="form-control" placeholder="Phone" value={f.phone} onChange={set('phone')} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Description" value={f.description} onChange={set('description')} /></div>
          <div className="col-12"><button className="btn btn-primary">Create hotel</button></div>
        </div>
      </form>
      <ul className="list-group">
        {data?.hotels?.map((h) => (
          <li key={h._id} className="list-group-item d-flex justify-content-between align-items-center">
            <span><strong>{h.name}</strong> · {h.address?.city}, {h.address?.country} {h.ratingCount > 0 && <span className="badge text-bg-warning">★ {h.ratingAvg} ({h.ratingCount})</span>}</span>
            <button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm(`Delete ${h.name}?`) && act(() => api.delete(`/hotels/${h._id}`), 'Hotel deleted', reload)}>Delete</button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Security() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, loading } = useApi('/admin/logs', { page, action: action || undefined }, { interval: 30000 });
  return (
    <>
      <div className="d-flex gap-3 align-items-center mb-3 flex-wrap">
        <div className={`alert py-2 mb-0 ${data?.failedLogins24h > 10 ? 'alert-danger' : 'alert-secondary'}`}>Failed logins (24h): <strong>{data?.failedLogins24h ?? '–'}</strong></div>
        <select className="form-select w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All activity</option>
          {['LOGIN', 'LOGIN_FAILED', 'REGISTER', 'BOOKING_CREATED', 'BOOKING_CANCELLED', 'PAYMENT_RECEIVED', 'REFUND_PROCESSED', 'USER_UPDATED', 'USER_CREATED', 'CONFIG_UPDATED', 'ROOM_PRICING_UPDATED', 'CHECK_IN', 'CHECK_OUT'].map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      {loading ? <Loader /> : (
        <div className="table-responsive"><table className="table table-sm">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
          <tbody>{data?.logs?.map((l) => (
            <tr key={l._id}>
              <td className="text-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.user ? `${l.user.name} (${l.user.role})` : '—'}</td>
              <td><span className={`badge text-bg-${l.action === 'LOGIN_FAILED' ? 'danger' : 'secondary'}`}>{l.action}</span></td>
              <td>{l.entity}</td>
              <td className="small text-muted text-break">{l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : ''}</td>
              <td className="small">{l.ip}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </>
  );
}

function Config() {
  const { data } = useApi('/admin/config');
  const [f, setF] = useState({ taxRate: '', cancellationHours: '' });
  useEffect(() => { if (data?.config) setF({ taxRate: data.config.taxRate ?? '', cancellationHours: data.config.cancellationHours ?? '' }); }, [data]);
  const save = (e) => { e.preventDefault(); act(() => api.put('/admin/config', f), 'Configuration saved'); };
  return (
    <form className="card card-body" style={{ maxWidth: 480 }} onSubmit={save}>
      <h5>Platform configuration</h5>
      <label className="form-label">Tax rate (0 – 1, e.g. 0.12 for 12%)</label>
      <input type="number" step="0.01" min="0" max="1" className="form-control mb-3" value={f.taxRate} onChange={(e) => setF({ ...f, taxRate: e.target.value })} />
      <label className="form-label">Free cancellation / modification window (hours before check-in)</label>
      <input type="number" min="0" className="form-control mb-3" value={f.cancellationHours} onChange={(e) => setF({ ...f, cancellationHours: e.target.value })} />
      <button className="btn btn-primary">Save</button>
    </form>
  );
}

function Reports() {
  const { data, reload } = useApi('/reports');
  const generate = (type) => act(() => api.post('/reports', { type }), `${type} report saved`, reload);
  return (
    <>
      <div className="mb-3 d-flex gap-2">
        {['summary', 'revenue', 'occupancy'].map((t) => <button key={t} className="btn btn-outline-primary" onClick={() => generate(t)}>Generate {t} report</button>)}
      </div>
      <ul className="list-group">
        {data?.reports?.map((r) => (
          <li key={r._id} className="list-group-item">
            <div className="d-flex justify-content-between"><strong>{r.type}</strong><span className="text-muted small">{new Date(r.createdAt).toLocaleString()} · {r.generatedBy?.name}</span></div>
            <pre className="small mb-0 mt-2" style={{ maxHeight: 140, overflow: 'auto' }}>{JSON.stringify(r.data, null, 2)}</pre>
          </li>
        ))}
        {!data?.reports?.length && <li className="list-group-item text-muted">No saved reports yet.</li>}
      </ul>
    </>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const tabs = { overview: 'Overview', users: 'Users & staff', hotels: 'Hotels', reports: 'Reports', security: 'Security & audit', config: 'Configuration' };
  return (
    <div className="container py-4">
      <h2 className="mb-3">Admin dashboard</h2>
      <ul className="nav nav-tabs mb-3 flex-nowrap overflow-auto">
        {Object.entries(tabs).map(([k, v]) => <li className="nav-item" key={k}><button className={`nav-link text-nowrap ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v}</button></li>)}
      </ul>
      {tab === 'overview' && <Analytics />}
      {tab === 'users' && <Users />}
      {tab === 'hotels' && <Hotels />}
      {tab === 'reports' && <Reports />}
      {tab === 'security' && <Security />}
      {tab === 'config' && <Config />}
      {tab === 'overview' && <p className="small text-muted mt-3">Booking monitoring and payment tracking: open <a href="/manager">Hotel management</a> (admins see all hotels).</p>}
    </div>
  );
}
