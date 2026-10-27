import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Rating } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { setUser } from '../store/authSlice';
import useApi from '../hooks/useApi';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';
import { money, fmtDate, errMsg } from '../utils';

function ReviewForm({ booking, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/reviews', { booking: booking._id, rating, comment }); toast.success('Thanks for your review!'); onDone(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <form onSubmit={submit} className="border rounded p-3 mt-2">
      <div className="mb-2"><Rating value={rating} onChange={(e, v) => setRating(v || 1)} /></div>
      <textarea className="form-control mb-2" rows="2" maxLength="1000" placeholder="How was your stay?" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn btn-sm btn-primary me-2">Submit review</button>
      <button type="button" className="btn btn-sm btn-link" onClick={onDone}>Cancel</button>
    </form>
  );
}

function ServiceForm({ booking, onDone }) {
  const [f, setF] = useState({ type: 'housekeeping', description: '' });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/services', { booking: booking._id, ...f }); toast.success('Request sent to the front desk'); onDone(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <form onSubmit={submit} className="border rounded p-3 mt-2">
      <select className="form-select mb-2" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
        {['housekeeping', 'room-service', 'maintenance', 'laundry', 'transport', 'other'].map((t) => <option key={t}>{t}</option>)}
      </select>
      <textarea className="form-control mb-2" rows="2" required maxLength="500" placeholder="What do you need?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <button className="btn btn-sm btn-primary me-2">Send request</button>
      <button type="button" className="btn btn-sm btn-link" onClick={onDone}>Cancel</button>
    </form>
  );
}

function Bookings() {
  const { data, loading, reload } = useApi('/bookings/my');
  const [open, setOpen] = useState(null); // { id, kind }
  if (loading) return <Loader />;

  const cancel = async (b) => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    try { const r = await api.patch(`/bookings/${b._id}/cancel`, { reason }); toast.info(r.data.message); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const invoice = async (b) => {
    try {
      const r = await api.get(`/bookings/${b._id}/invoice`, { responseType: 'text', transformResponse: (x) => x });
      window.open(URL.createObjectURL(new Blob([r.data], { type: 'text/html' })), '_blank');
    } catch (e) { toast.error(errMsg(e)); }
  };

  if (!data?.bookings?.length) return <p className="text-muted">No bookings yet. <Link to="/rooms">Find a room</Link>.</p>;
  return (
    <div className="d-flex flex-column gap-3">
      {data.bookings.map((b) => (
        <div className="card" key={b._id}><div className="card-body">
          <div className="d-flex flex-wrap justify-content-between gap-2">
            <div>
              <strong>{b.bookingRef}</strong> · {b.hotel?.name} · Room {b.room?.roomNumber}
              <div className="text-muted small">{fmtDate(b.checkIn)} → {fmtDate(b.checkOut)} · {b.nights} night(s) · {b.guests} guest(s)</div>
            </div>
            <div className="text-end">
              <div className="fw-bold">{money(b.totalPrice)}</div>
              <StatusBadge status={b.status} /> <StatusBadge status={b.paymentStatus} />
              {b.refund?.status && b.refund.status !== 'none' && <div className="small mt-1">Refund: <StatusBadge status={b.refund.status} /></div>}
            </div>
          </div>
          <div className="mt-2 d-flex flex-wrap gap-2">
            {b.status === 'pending' && b.paymentStatus === 'unpaid' && <Link className="btn btn-sm btn-success" to={`/pay/${b._id}`}>Pay now</Link>}
            {['pending', 'confirmed'].includes(b.status) && <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(b)}>Cancel</button>}
            {b.paymentStatus !== 'unpaid' && <button className="btn btn-sm btn-outline-secondary" onClick={() => invoice(b)}>Invoice</button>}
            {b.status === 'checked-in' && <button className="btn btn-sm btn-outline-primary" onClick={() => setOpen({ id: b._id, kind: 'service' })}>Request service</button>}
            {b.status === 'checked-out' && <button className="btn btn-sm btn-outline-primary" onClick={() => setOpen({ id: b._id, kind: 'review' })}>Write review</button>}
          </div>
          {open?.id === b._id && open.kind === 'service' && <ServiceForm booking={b} onDone={() => setOpen(null)} />}
          {open?.id === b._id && open.kind === 'review' && <ReviewForm booking={b} onDone={() => setOpen(null)} />}
        </div></div>
      ))}
    </div>
  );
}

function Services() {
  const { data, loading } = useApi('/services/my', {}, { interval: 20000 });
  if (loading) return <Loader />;
  if (!data?.services?.length) return <p className="text-muted">No service requests yet. You can request services from a checked-in booking.</p>;
  return (
    <ul className="list-group">
      {data.services.map((s) => (
        <li key={s._id} className="list-group-item d-flex justify-content-between">
          <span><strong>{s.type}</strong> · Room {s.room?.roomNumber} — {s.description}</span><StatusBadge status={s.status} />
        </li>
      ))}
    </ul>
  );
}

function Profile() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const save = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put('/auth/me', f); dispatch(setUser(data.user)); toast.success('Profile updated'); } catch (err) { toast.error(errMsg(err)); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    try { await api.put('/auth/password', pw); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password changed'); } catch (err) { toast.error(errMsg(err)); }
  };
  const resend = async () => { try { const r = await api.post('/auth/resend-verification'); toast.info(r.data.message); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="row g-4">
      <form className="col-md-6" onSubmit={save}>
        <h5>Profile</h5>
        <label className="form-label">Name</label><input className="form-control mb-2" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label className="form-label">Phone</label><input className="form-control mb-2" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <div className="small text-muted mb-2">{user.email} · {user.isVerified ? 'Email verified' : <>Not verified. <button type="button" className="btn btn-link btn-sm p-0" onClick={resend}>Resend link</button></>}</div>
        <button className="btn btn-primary">Save</button>
      </form>
      <form className="col-md-6" onSubmit={changePw}>
        <h5>Change password</h5>
        <label className="form-label">Current password</label><input type="password" className="form-control mb-2" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
        <label className="form-label">New password</label><input type="password" minLength={8} className="form-control mb-2" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
        <button className="btn btn-outline-primary">Update password</button>
      </form>
    </div>
  );
}

export default function GuestDashboard() {
  const [tab, setTab] = useState('bookings');
  const tabs = { bookings: 'My bookings', services: 'Service requests', profile: 'Profile' };
  return (
    <div className="container py-4">
      <h2 className="mb-3">Guest dashboard</h2>
      <ul className="nav nav-tabs mb-3">
        {Object.entries(tabs).map(([k, v]) => <li className="nav-item" key={k}><button className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{v}</button></li>)}
      </ul>
      {tab === 'bookings' && <Bookings />}
      {tab === 'services' && <Services />}
      {tab === 'profile' && <Profile />}
    </div>
  );
}
