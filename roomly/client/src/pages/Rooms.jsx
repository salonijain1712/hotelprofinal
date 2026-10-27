import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import Pagination from '../components/Pagination';
import Loader from '../components/Loader';
import useApi from '../hooks/useApi';
import { todayISO, addDaysISO } from '../utils';

const KEYS = ['city', 'category', 'minPrice', 'maxPrice', 'capacity', 'checkIn', 'checkOut', 'sort'];

export default function Rooms() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])));
  const page = parseInt(params.get('page')) || 1;
  const query = Object.fromEntries([...params.entries()].filter(([k, v]) => v && (KEYS.includes(k) || k === 'page')));
  const { data: cats } = useApi('/categories');
  // Real-time availability: silently refresh every 30 seconds
  const { data, loading, error } = useApi('/rooms', { ...query, page, limit: 9 }, { interval: 30000 });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const apply = (e) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
  };
  const clear = () => {
    setForm(Object.fromEntries(KEYS.map((k) => [k, ''])));
    setParams({});
  };
  const carry = ['checkIn', 'checkOut'].filter((k) => params.get(k)).map((k) => `${k}=${params.get(k)}`).join('&');

  return (
    <div className="container py-4">
      <h2 className="mb-3">Browse rooms</h2>
      <form className="card card-body mb-4" onSubmit={apply}>
        <div className="row g-2">
          <div className="col-md-3"><input className="form-control" placeholder="City" value={form.city} onChange={set('city')} /></div>
          <div className="col-md-3">
            <select className="form-select" value={form.category} onChange={set('category')}>
              <option value="">All categories</option>
              {cats?.categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3"><input type="date" min={todayISO()} className="form-control" value={form.checkIn} onChange={set('checkIn')} aria-label="Check-in" /></div>
          <div className="col-6 col-md-3"><input type="date" min={form.checkIn ? addDaysISO(form.checkIn, 1) : todayISO()} className="form-control" value={form.checkOut} onChange={set('checkOut')} aria-label="Check-out" /></div>
          <div className="col-4 col-md-2"><input type="number" min="0" className="form-control" placeholder="Min price" value={form.minPrice} onChange={set('minPrice')} /></div>
          <div className="col-4 col-md-2"><input type="number" min="0" className="form-control" placeholder="Max price" value={form.maxPrice} onChange={set('maxPrice')} /></div>
          <div className="col-4 col-md-2"><input type="number" min="1" className="form-control" placeholder="Guests" value={form.capacity} onChange={set('capacity')} /></div>
          <div className="col-md-3">
            <select className="form-select" value={form.sort} onChange={set('sort')}>
              <option value="">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="newest">Newest</option>
            </select>
          </div>
          <div className="col-md-3 d-flex gap-2">
            <button className="btn btn-primary flex-fill">Apply</button>
            <button type="button" className="btn btn-outline-secondary" onClick={clear}>Clear</button>
          </div>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? <Loader /> : (
        <>
          <p className="text-muted">{data?.total || 0} room(s) found{params.get('checkIn') ? ' and available for your dates' : ''}</p>
          <div className="row g-3">
            {data?.rooms?.map((r) => <div className="col-md-6 col-lg-4" key={r._id}><RoomCard room={r} query={carry ? `?${carry}` : ''} /></div>)}
          </div>
          <Pagination page={page} pages={data?.pages} onChange={(p) => setParams({ ...query, page: p })} />
        </>
      )}
    </div>
  );
}
