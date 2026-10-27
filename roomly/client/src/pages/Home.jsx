import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import Loader from '../components/Loader';
import useApi from '../hooks/useApi';
import { todayISO, addDaysISO } from '../utils';

export default function Home() {
  const navigate = useNavigate();
  const [f, setF] = useState({ city: '', checkIn: '', checkOut: '', capacity: 1 });
  const { data, loading } = useApi('/rooms', { limit: 6, sort: 'newest' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    navigate('/rooms?' + q.toString());
  };

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1 className="display-5 fw-bold">Find your perfect stay</h1>
          <p className="lead mb-4">Search, book and pay in minutes. Real-time availability, instant confirmation.</p>
          <form className="card card-body text-body" onSubmit={submit}>
            <div className="row g-2 align-items-end">
              <div className="col-md-3"><label className="form-label small">City</label><input className="form-control" placeholder="e.g. Indore" value={f.city} onChange={set('city')} /></div>
              <div className="col-md-3"><label className="form-label small">Check-in</label><input type="date" min={todayISO()} className="form-control" value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value, checkOut: f.checkOut && f.checkOut <= e.target.value ? addDaysISO(e.target.value, 1) : f.checkOut })} /></div>
              <div className="col-md-3"><label className="form-label small">Check-out</label><input type="date" min={f.checkIn ? addDaysISO(f.checkIn, 1) : todayISO()} className="form-control" value={f.checkOut} onChange={set('checkOut')} /></div>
              <div className="col-6 col-md-1"><label className="form-label small">Guests</label><input type="number" min="1" max="10" className="form-control" value={f.capacity} onChange={set('capacity')} /></div>
              <div className="col-6 col-md-2"><button className="btn btn-primary w-100">Search</button></div>
            </div>
          </form>
        </div>
      </section>
      <section className="container py-5">
        <h3 className="mb-3">Featured rooms</h3>
        {loading ? <Loader /> : (
          <div className="row g-3">
            {data?.rooms?.map((r) => <div className="col-md-6 col-lg-4" key={r._id}><RoomCard room={r} /></div>)}
            {!data?.rooms?.length && <p className="text-muted">No rooms yet. Run <code>npm run seed</code> in the server folder to add demo data.</p>}
          </div>
        )}
      </section>
    </>
  );
}
