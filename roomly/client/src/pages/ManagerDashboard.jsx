import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../api/axios';
import useApi from '../hooks/useApi';
import Analytics from '../components/Analytics';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { money, fmtDate, errMsg } from '../utils';

const act = async (fn, okMsg, reload) => {
  try { await fn(); if (okMsg) toast.success(okMsg); reload && reload(); } catch (e) { toast.error(errMsg(e)); }
};

function RoomsManager() {
  const { user } = useSelector((s) => s.auth);
  const { data, loading, reload } = useApi('/rooms/manage/list');
  const { data: cats } = useApi('/categories');
  const { data: hotels } = useApi('/hotels', {}, { skip: user.role !== 'admin' });
  const { data: staff } = useApi('/admin/users', { role: 'staff', limit: 100 });
  const [f, setF] = useState({ hotel: '', category: '', roomNumber: '', floor: 1, price: '', capacity: '', description: '' });
  const [season, setSeason] = useState({ room: '', name: '', startDate: '', endDate: '', multiplier: 1.3 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const create = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
    act(() => api.post('/rooms', body), 'Room created', () => { setF({ ...f, roomNumber: '', price: '', description: '' }); reload(); });
  };
  const setPrice = (r) => {
    const v = window.prompt(`New nightly price for room ${r.roomNumber}:`, r.price);
    if (v === null || isNaN(Number(v)) || Number(v) < 0) return;
    act(() => api.put(`/rooms/${r._id}/pricing`, { price: Number(v) }), 'Price updated', reload);
  };
  const addSeason = (e) => {
    e.preventDefault();
    const room = data.rooms.find((r) => r._id === season.room);
    if (!room) return toast.error('Pick a room');
    const { room: _r, ...s } = season;
    act(() => api.put(`/rooms/${room._id}/pricing`, { seasonalPricing: [...(room.seasonalPricing || []), { ...s, multiplier: Number(s.multiplier) }] }), 'Seasonal price added', reload);
  };
  const removeSeason = (room, id) => act(() => api.put(`/rooms/${room._id}/pricing`, { seasonalPricing: room.seasonalPricing.filter((s) => s._id !== id) }), 'Removed', reload);
  const upload = (r, files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((x) => fd.append('images', x));
    act(() => api.post(`/rooms/${r._id}/images`, fd), 'Images uploaded', reload);
  };

  if (loading) return <Loader />;
  return (
    <>
      <form className="card card-body mb-4" onSubmit={create}>
        <h5>Add room</h5>
        <div className="row g-2">
          {user.role === 'admin' && (
            <div className="col-md-3"><select className="form-select" required value={f.hotel} onChange={set('hotel')}><option value="">Hotel</option>{hotels?.hotels?.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</select></div>
          )}
          <div className="col-md-3"><select className="form-select" required value={f.category} onChange={set('category')}><option value="">Category</option>{cats?.categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
          <div className="col-6 col-md-2"><input className="form-control" required placeholder="Room no." value={f.roomNumber} onChange={set('roomNumber')} /></div>
          <div className="col-6 col-md-1"><input type="number" className="form-control" placeholder="Floor" value={f.floor} onChange={set('floor')} /></div>
          <div className="col-6 col-md-2"><input type="number" min="0" className="form-control" placeholder="Price (default)" value={f.price} onChange={set('price')} /></div>
          <div className="col-6 col-md-1"><input type="number" min="1" className="form-control" placeholder="Beds" value={f.capacity} onChange={set('capacity')} /></div>
          <div className="col-12"><input className="form-control" placeholder="Description" value={f.description} onChange={set('description')} /></div>
          <div className="col-12"><button className="btn btn-primary">Create room</button></div>
        </div>
      </form>

      <div className="table-responsive"><table className="table align-middle">
        <thead><tr><th>Room</th><th>Category</th><th>Price</th><th>Status</th><th>Assigned staff</th><th>Images</th><th /></tr></thead>
        <tbody>{data?.rooms?.map((r) => (
          <React.Fragment key={r._id}>
            <tr>
              <td><strong>{r.roomNumber}</strong><div className="small text-muted">{r.hotel?.name}</div></td>
              <td>{r.category?.name}</td>
              <td>{money(r.price)} <button className="btn btn-sm btn-link p-0 ms-1" onClick={() => setPrice(r)}>edit</button></td>
              <td>
                <select className="form-select form-select-sm" value={r.status} onChange={(e) => act(() => api.patch(`/staff/rooms/${r._id}/status`, { status: e.target.value }), null, reload)}>
                  {['available', 'occupied', 'cleaning', 'maintenance'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
              <td>
                <select className="form-select form-select-sm" value={r.assignedStaff?._id || ''} onChange={(e) => act(() => api.patch(`/rooms/${r._id}/assign`, { staffId: e.target.value }), 'Assignment saved', reload)}>
                  <option value="">Unassigned</option>
                  {staff?.users?.filter((u) => String(u.hotel?._id) === String(r.hotel?._id)).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </td>
              <td><label className="btn btn-sm btn-outline-secondary mb-0">+ {r.images?.length || 0}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(r, e.target.files)} /></label></td>
              <td><button className="btn btn-sm btn-outline-danger" onClick={() => window.confirm(`Delete room ${r.roomNumber}?`) && act(() => api.delete(`/rooms/${r._id}`), 'Room deleted', reload)}>Delete</button></td>
            </tr>
            {r.seasonalPricing?.length > 0 && (
              <tr><td colSpan="7" className="small text-muted py-1">
                Seasonal: {r.seasonalPricing.map((s) => (
                  <span key={s._id} className="badge text-bg-info me-1">{s.name} ×{s.multiplier} ({fmtDate(s.startDate)}–{fmtDate(s.endDate)}) <a role="button" className="text-reset ms-1" onClick={() => removeSeason(r, s._id)}>✕</a></span>
                ))}
              </td></tr>
            )}
          </React.Fragment>
        ))}</tbody>
      </table></div>

      <form className="card card-body mt-4" onSubmit={addSeason}>
        <h5>Seasonal pricing</h5>
        <div className="row g-2">
          <div className="col-md-3"><select className="form-select" required value={season.room} onChange={(e) => setSeason({ ...season, room: e.target.value })}><option value="">Room</option>{data?.rooms?.map((r) => <option key={r._id} value={r._id}>{r.roomNumber} ({r.category?.name})</option>)}</select></div>
          <div className="col-md-3"><input className="form-control" required placeholder="Season (e.g. Diwali)" value={season.name} onChange={(e) => setSeason({ ...season, name: e.target.value })} /></div>
          <div className="col-6 col-md-2"><input type="date" required className="form-control" value={season.startDate} onChange={(e) => setSeason({ ...season, startDate: e.target.value })} /></div>
          <div className="col-6 col-md-2"><input type="date" required className="form-control" value={season.endDate} onChange={(e) => setSeason({ ...season, endDate: e.target.value })} /></div>
          <div className="col-6 col-md-1"><input type="number" step="0.05" min="0.1" className="form-control" value={season.multiplier} onChange={(e) => setSeason({ ...season, multiplier: e.target.value })} aria-label="Multiplier" /></div>
          <div className="col-6 col-md-1"><button className="btn btn-primary w-100">Add</button></div>
        </div>
        <div className="form-text">Multiplier applies to the base nightly price, e.g. 1.3 = +30%.</div>
      </form>
    </>
  );
}

function Categories() {
  const { data, reload } = useApi('/categories');
  const [f, setF] = useState({ name: '', basePrice: '', capacity: 2, description: '' });
  const create = (e) => {
    e.preventDefault();
    act(() => api.post('/categories', { ...f, basePrice: Number(f.basePrice), capacity: Number(f.capacity) }), 'Category added', () => { setF({ name: '', basePrice: '', capacity: 2, description: '' }); reload(); });
  };
  return (
    <>
      <form className="card card-body mb-3" onSubmit={create}>
        <div className="row g-2">
          <div className="col-md-3"><input className="form-control" required placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="col-6 col-md-2"><input type="number" min="0" required className="form-control" placeholder="Base price" value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: e.target.value })} /></div>
          <div className="col-6 col-md-2"><input type="number" min="1" className="form-control" placeholder="Capacity" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="col-md-2"><button className="btn btn-primary w-100">Add</button></div>
        </div>
      </form>
      <ul className="list-group">
        {data?.categories?.map((c) => (
          <li className="list-group-item d-flex justify-content-between align-items-center" key={c._id}>
            <span><strong>{c.name}</strong> · {money(c.basePrice)} · sleeps {c.capacity} <span className="text-muted small">{c.description}</span></span>
            <button className="btn btn-sm btn-outline-danger" onClick={() => act(() => api.delete(`/categories/${c._id}`), 'Category deleted', reload)}>Delete</button>
          </li>
        ))}
      </ul>
    </>
  );
}

function BookingsRefunds() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data: refunds, reload: reloadRefunds } = useApi('/bookings', { refund: 'requested', limit: 50 });
  const { data, loading, reload } = useApi('/bookings', { page, status: status || undefined });
  const both = () => { reload(); reloadRefunds(); };
  return (
    <>
      {refunds?.bookings?.length > 0 && (
        <div className="card border-warning mb-4"><div className="card-body">
          <h5>Refund requests ({refunds.bookings.length})</h5>
          {refunds.bookings.map((b) => (
            <div key={b._id} className="d-flex justify-content-between align-items-center border-top py-2">
              <span>{b.bookingRef} · {b.guest?.name} · <strong>{money(b.refund.amount)}</strong></span>
              <span>
                <button className="btn btn-sm btn-success me-1" onClick={() => act(() => api.patch(`/payments/${b._id}/refund`), 'Refund processed', both)}>Approve</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => act(() => api.patch(`/payments/${b._id}/refund`, { reject: true }), 'Refund declined', both)}>Decline</button>
              </span>
            </div>
          ))}
        </div></div>
      )}
      <div className="d-flex gap-2 mb-3">
        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All bookings</option>{['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Loader /> : (
        <div className="table-responsive"><table className="table align-middle">
          <thead><tr><th>Ref</th><th>Guest</th><th>Room</th><th>Stay</th><th>Status</th><th className="text-end">Total</th><th /></tr></thead>
          <tbody>{data?.bookings?.map((b) => (
            <tr key={b._id}>
              <td>{b.bookingRef}</td><td>{b.guest?.name}</td><td>{b.room?.roomNumber}</td>
              <td>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</td>
              <td><StatusBadge status={b.status} /> <StatusBadge status={b.paymentStatus} /></td>
              <td className="text-end">{money(b.totalPrice)}</td>
              <td className="text-end">
                {b.status === 'pending' && <button className="btn btn-sm btn-primary me-1" onClick={() => act(() => api.patch(`/bookings/${b._id}/approve`), 'Approved', both)}>Approve</button>}
                {['pending', 'confirmed'].includes(b.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => act(() => api.patch(`/bookings/${b._id}/cancel`, { reason: 'Cancelled by hotel' }), 'Cancelled', both)}>Cancel</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </>
  );
}

function Payments() {
  const [page, setPage] = useState(1);
  const { data, loading } = useApi('/payments', { page });
  if (loading) return <Loader />;
  return (
    <>
      <div className="table-responsive"><table className="table">
        <thead><tr><th>Date</th><th>Booking</th><th>Guest</th><th>Provider</th><th>Status</th><th className="text-end">Amount</th></tr></thead>
        <tbody>{data?.payments?.map((p) => (
          <tr key={p._id}><td>{fmtDate(p.createdAt)}</td><td>{p.booking?.bookingRef}</td><td>{p.user?.name}</td><td>{p.provider}</td><td><StatusBadge status={p.status} /></td><td className="text-end">{money(p.amount)}</td></tr>
        ))}</tbody>
      </table></div>
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </>
  );
}

export default function ManagerDashboard() {
  const { user } = useSelector((s) => s.auth);
  const [tab, setTab] = useState('overview');
  const tabs = { overview: 'Overview', rooms: 'Rooms & pricing', categories: 'Categories', bookings: 'Bookings & refunds', payments: 'Payments' };
  return (
    <div className="container py-4">
      <h2 className="mb-3">Hotel management {user.role === 'admin' && <span className="badge text-bg-secondary fs-6">all hotels</span>}</h2>
      <ul className="nav nav-tabs mb-3 flex-nowrap overflow-auto">
        {Object.entries(tabs).map(([k, v]) => <li className="nav-item" key={k}><button className={`nav-link text-nowrap ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v}</button></li>)}
      </ul>
      {tab === 'overview' && <Analytics />}
      {tab === 'rooms' && <RoomsManager />}
      {tab === 'categories' && <Categories />}
      {tab === 'bookings' && <BookingsRefunds />}
      {tab === 'payments' && <Payments />}
    </div>
  );
}
