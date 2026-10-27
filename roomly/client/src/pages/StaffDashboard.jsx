import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import useApi from '../hooks/useApi';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { fmtDate, errMsg, money } from '../utils';

const act = async (fn, okMsg, reload) => {
  try { await fn(); if (okMsg) toast.success(okMsg); reload && reload(); } catch (e) { toast.error(errMsg(e)); }
};

function BookingRow({ b, children }) {
  return (
    <tr>
      <td><strong>{b.bookingRef}</strong></td>
      <td>{b.guest?.name}<div className="small text-muted">{b.guest?.phone}</div></td>
      <td>Room {b.room?.roomNumber}</td>
      <td>{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</td>
      <td><StatusBadge status={b.status} /> <StatusBadge status={b.paymentStatus} /></td>
      <td className="text-end">{children}</td>
    </tr>
  );
}

function FrontDesk() {
  const { data, loading, reload } = useApi('/staff/overview', {}, { interval: 30000 });
  if (loading) return <Loader />;
  const checkIn = (b) => act(() => api.post(`/staff/checkin/${b._id}`), `${b.guest?.name} checked in`, reload);
  const checkOut = (b) => {
    const extra = window.prompt('Extra charges (minibar, damages...). Leave 0 if none:', '0');
    if (extra === null) return;
    act(() => api.post(`/staff/checkout/${b._id}`, { extraCharges: Number(extra) || 0 }), `${b.guest?.name} checked out. Room set to cleaning.`, reload);
  };
  const Table = ({ title, rows, btn }) => (
    <div className="mb-4">
      <h5>{title} <span className="badge text-bg-secondary">{rows?.length || 0}</span></h5>
      {rows?.length ? (
        <div className="table-responsive"><table className="table align-middle"><tbody>
          {rows.map((b) => <BookingRow key={b._id} b={b}>{btn(b)}</BookingRow>)}
        </tbody></table></div>
      ) : <p className="text-muted">Nothing here.</p>}
    </div>
  );
  return (
    <>
      <Table title="Arrivals" rows={data?.arrivals} btn={(b) => <button className="btn btn-sm btn-success" onClick={() => checkIn(b)}>Check in</button>} />
      <Table title="Departures due" rows={data?.departures} btn={(b) => <button className="btn btn-sm btn-warning" onClick={() => checkOut(b)}>Check out</button>} />
      <Table title="In-house guests" rows={data?.inHouse} btn={(b) => <button className="btn btn-sm btn-outline-warning" onClick={() => checkOut(b)}>Check out</button>} />
    </>
  );
}

function Rooms() {
  const { data, loading, reload } = useApi('/rooms/manage/list', {}, { interval: 30000 });
  if (loading) return <Loader />;
  const setStatus = (r, status) => act(() => api.patch(`/staff/rooms/${r._id}/status`, { status }), null, reload);
  return (
    <div className="row g-3">
      {data?.rooms?.map((r) => (
        <div className="col-6 col-md-4 col-lg-3" key={r._id}>
          <div className="card h-100"><div className="card-body">
            <div className="d-flex justify-content-between"><strong>Room {r.roomNumber}</strong><StatusBadge status={r.status} /></div>
            <div className="small text-muted mb-2">{r.category?.name} · Floor {r.floor}</div>
            <select className="form-select form-select-sm" value={r.status} onChange={(e) => setStatus(r, e.target.value)} aria-label={`Status for room ${r.roomNumber}`}>
              {['available', 'occupied', 'cleaning', 'maintenance'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div></div>
        </div>
      ))}
      {!data?.rooms?.length && <p className="text-muted">No rooms in your hotel yet.</p>}
    </div>
  );
}

function Housekeeping() {
  const [mine, setMine] = useState(false);
  const { data, loading, reload } = useApi('/staff/housekeeping', { mine }, { interval: 30000 });
  const setStatus = (r, status) => act(() => api.patch(`/staff/rooms/${r._id}/status`, { status }), `Room ${r.roomNumber} is now ${status}`, reload);
  return (
    <>
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" id="mine" checked={mine} onChange={(e) => setMine(e.target.checked)} />
        <label className="form-check-label" htmlFor="mine">Only rooms assigned to me</label>
      </div>
      {loading ? <Loader /> : data?.rooms?.length ? (
        <ul className="list-group">
          {data.rooms.map((r) => (
            <li key={r._id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>Room {r.roomNumber} · {r.category?.name} <StatusBadge status={r.status} /> {r.assignedStaff && <span className="small text-muted ms-2">assigned: {r.assignedStaff.name}</span>}</span>
              <button className="btn btn-sm btn-success" onClick={() => setStatus(r, 'available')}>Mark ready</button>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No rooms waiting for housekeeping. 🎉</p>}
    </>
  );
}

function Services() {
  const [status, setStatus] = useState('');
  const { data, loading, reload } = useApi('/services', status ? { status } : {}, { interval: 20000 });
  const update = (s, st) => act(() => api.patch(`/services/${s._id}`, { status: st }), null, reload);
  return (
    <>
      <select className="form-select w-auto mb-3" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
        <option value="">All requests</option>{['open', 'in-progress', 'done', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
      </select>
      {loading ? <Loader /> : data?.services?.length ? (
        <div className="table-responsive"><table className="table align-middle">
          <thead><tr><th>Room</th><th>Guest</th><th>Type</th><th>Request</th><th>Status</th></tr></thead>
          <tbody>{data.services.map((s) => (
            <tr key={s._id}>
              <td>{s.room?.roomNumber}</td><td>{s.guest?.name}</td><td>{s.type}</td><td>{s.description}</td>
              <td><select className="form-select form-select-sm" value={s.status} onChange={(e) => update(s, e.target.value)}>{['open', 'in-progress', 'done', 'cancelled'].map((x) => <option key={x}>{x}</option>)}</select></td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="text-muted">No service requests.</p>}
    </>
  );
}

function Reservations() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { data, loading, reload } = useApi('/bookings', { page, q: q || undefined, status: status || undefined });
  return (
    <>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <input className="form-control w-auto" placeholder="Search booking ref" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>{['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Loader /> : (
        <div className="table-responsive"><table className="table align-middle"><tbody>
          {data?.bookings?.map((b) => (
            <BookingRow key={b._id} b={b}>
              <span className="me-2">{money(b.totalPrice)}</span>
              {b.status === 'pending' && <button className="btn btn-sm btn-primary me-1" onClick={() => act(() => api.patch(`/bookings/${b._id}/approve`), 'Booking approved', reload)}>Approve</button>}
              {['pending', 'confirmed'].includes(b.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => act(() => api.patch(`/bookings/${b._id}/cancel`, { reason: 'Cancelled by hotel' }), 'Booking cancelled', reload)}>Cancel</button>}
            </BookingRow>
          ))}
        </tbody></table></div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </>
  );
}

export default function StaffDashboard() {
  const [tab, setTab] = useState('desk');
  const tabs = { desk: 'Front desk', rooms: 'Room status', hk: 'Housekeeping', services: 'Service requests', res: 'Reservations' };
  return (
    <div className="container py-4">
      <h2 className="mb-3">Staff dashboard</h2>
      <ul className="nav nav-tabs mb-3 flex-nowrap overflow-auto">
        {Object.entries(tabs).map(([k, v]) => <li className="nav-item" key={k}><button className={`nav-link text-nowrap ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v}</button></li>)}
      </ul>
      {tab === 'desk' && <FrontDesk />}
      {tab === 'rooms' && <Rooms />}
      {tab === 'hk' && <Housekeeping />}
      {tab === 'services' && <Services />}
      {tab === 'res' && <Reservations />}
    </div>
  );
}
