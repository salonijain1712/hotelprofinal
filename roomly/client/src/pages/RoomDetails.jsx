import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Chip, Rating } from '@mui/material';
import api from '../api/axios';
import useApi from '../hooks/useApi';
import Loader from '../components/Loader';
import { money, img, fmtDate, todayISO, addDaysISO } from '../utils';

export default function RoomDetails() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { data, loading } = useApi(`/rooms/${id}`);
  const { data: rv } = useApi('/reviews', { room: id });
  const { data: av } = useApi(`/rooms/${id}/availability`, {}, { interval: 30000 });
  const [d, setD] = useState({ checkIn: sp.get('checkIn') || '', checkOut: sp.get('checkOut') || '', guests: 1 });
  const [quote, setQuote] = useState(null);
  const [quoteErr, setQuoteErr] = useState('');

  useEffect(() => {
    setQuote(null);
    setQuoteErr('');
    if (!d.checkIn || !d.checkOut || d.checkOut <= d.checkIn) return;
    api.post('/bookings/quote', { room: id, checkIn: d.checkIn, checkOut: d.checkOut })
      .then((r) => setQuote(r.data))
      .catch((e) => setQuoteErr(e.response?.data?.message || 'Could not get a price'));
  }, [id, d.checkIn, d.checkOut]);

  if (loading) return <Loader />;
  const room = data?.room;
  if (!room) return <div className="container py-5"><div className="alert alert-warning">Room not found.</div></div>;

  const book = () => {
    const q = `?checkIn=${d.checkIn}&checkOut=${d.checkOut}&guests=${d.guests}`;
    if (!user) return navigate('/login', { state: { from: `/book/${id}${q}` } });
    navigate(`/book/${id}${q}`);
  };

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="room-gallery">
            <img src={img(room.images?.[0])} alt={`Room ${room.roomNumber}`} />
            {room.images?.length > 1 && (
              <div className="d-flex gap-2 mt-2 overflow-auto">
                {room.images.slice(1).map((p) => <img key={p} src={img(p)} alt="" loading="lazy" style={{ width: 110, height: 80, objectFit: 'cover' }} />)}
              </div>
            )}
          </div>
          <h2 className="mt-3">{room.category?.name} · Room {room.roomNumber}</h2>
          <p className="text-muted">{room.hotel?.name}, {room.hotel?.address?.city}</p>
          {room.hotel?.ratingCount > 0 && <div className="d-flex align-items-center gap-1 mb-2"><Rating value={room.hotel.ratingAvg} precision={0.5} readOnly /><span className="text-muted small">{room.hotel.ratingAvg} ({room.hotel.ratingCount} reviews)</span></div>}
          <p>{room.description}</p>
          <div className="mb-3">{room.amenities?.map((a) => <Chip key={a} label={a} className="me-1 mb-1" size="small" />)}</div>
          {room.seasonalPricing?.length > 0 && (
            <div className="alert alert-info py-2">
              Seasonal pricing: {room.seasonalPricing.map((s) => `${s.name} (${fmtDate(s.startDate)} – ${fmtDate(s.endDate)}) ×${s.multiplier}`).join('; ')}
            </div>
          )}
          {av?.booked?.length > 0 && (
            <div className="small text-muted mb-3">Already booked: {av.booked.slice(0, 6).map((b) => `${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)}`).join(' · ')}</div>
          )}
          <h5 className="mt-4">Guest reviews</h5>
          {rv?.reviews?.length ? rv.reviews.map((r) => (
            <div key={r._id} className="border-bottom py-2">
              <Rating value={r.rating} size="small" readOnly /> <strong className="ms-1">{r.user?.name}</strong>
              <div>{r.comment}</div>
            </div>
          )) : <p className="text-muted">No reviews yet.</p>}
        </div>

        <div className="col-lg-5">
          <div className="card sticky-top" style={{ top: 80 }}>
            <div className="card-body">
              <div className="mb-3"><span className="fs-3 fw-bold">{money(room.price)}</span> <span className="text-muted">/ night</span></div>
              <div className="row g-2">
                <div className="col-6"><label className="form-label small">Check-in</label><input type="date" min={todayISO()} className="form-control" value={d.checkIn} onChange={(e) => setD({ ...d, checkIn: e.target.value, checkOut: d.checkOut && d.checkOut <= e.target.value ? addDaysISO(e.target.value, 1) : d.checkOut })} /></div>
                <div className="col-6"><label className="form-label small">Check-out</label><input type="date" min={d.checkIn ? addDaysISO(d.checkIn, 1) : todayISO()} className="form-control" value={d.checkOut} onChange={(e) => setD({ ...d, checkOut: e.target.value })} /></div>
                <div className="col-12"><label className="form-label small">Guests (max {room.capacity})</label><input type="number" min="1" max={room.capacity} className="form-control" value={d.guests} onChange={(e) => setD({ ...d, guests: e.target.value })} /></div>
              </div>
              {quoteErr && <div className="alert alert-danger mt-3 py-2">{quoteErr}</div>}
              {quote && (
                <div className="mt-3">
                  {quote.available ? (
                    <table className="table table-sm mb-2"><tbody>
                      <tr><td>{quote.nights} night(s)</td><td className="text-end">{money(quote.subtotal)}</td></tr>
                      <tr><td>Taxes</td><td className="text-end">{money(quote.tax)}</td></tr>
                      <tr className="fw-bold"><td>Total</td><td className="text-end">{money(quote.total)}</td></tr>
                    </tbody></table>
                  ) : <div className="alert alert-warning py-2">Not available for these dates. <Link to="/rooms">Browse other rooms</Link></div>}
                </div>
              )}
              <button className="btn btn-primary w-100 mt-2" disabled={!quote?.available || Number(d.guests) > room.capacity || Number(d.guests) < 1} onClick={book}>
                {user ? 'Book now' : 'Login to book'}
              </button>
              {user && user.role !== 'guest' && <div className="small text-muted mt-2">Only guest accounts can make bookings.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
