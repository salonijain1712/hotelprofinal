import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import useApi from '../hooks/useApi';
import Loader from '../components/Loader';
import { money, errMsg, todayISO, addDaysISO } from '../utils';

export default function BookingForm() {
  const { roomId } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { data, loading } = useApi(`/rooms/${roomId}`);
  const [f, setF] = useState({ checkIn: sp.get('checkIn') || '', checkOut: sp.get('checkOut') || '', guests: sp.get('guests') || 1, specialRequests: '' });
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQuote(null);
    if (!f.checkIn || !f.checkOut || f.checkOut <= f.checkIn) return;
    api.post('/bookings/quote', { room: roomId, checkIn: f.checkIn, checkOut: f.checkOut })
      .then((r) => setQuote(r.data))
      .catch((e) => toast.error(errMsg(e)));
  }, [roomId, f.checkIn, f.checkOut]);

  if (loading) return <Loader />;
  const room = data?.room;
  if (!room) return <div className="container py-5"><div className="alert alert-warning">Room not found.</div></div>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: r } = await api.post('/bookings', { room: roomId, ...f, guests: Number(f.guests) });
      toast.success('Room reserved. Complete payment within 30 minutes.');
      navigate(`/pay/${r.booking._id}`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <h2 className="mb-1">Book {room.category?.name} · Room {room.roomNumber}</h2>
      <p className="text-muted">{room.hotel?.name}</p>
      <form onSubmit={submit} className="card card-body">
        <div className="row g-3">
          <div className="col-md-6"><label className="form-label">Check-in</label><input type="date" required min={todayISO()} className="form-control" value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value, checkOut: f.checkOut && f.checkOut <= e.target.value ? addDaysISO(e.target.value, 1) : f.checkOut })} /></div>
          <div className="col-md-6"><label className="form-label">Check-out</label><input type="date" required min={f.checkIn ? addDaysISO(f.checkIn, 1) : todayISO()} className="form-control" value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></div>
          <div className="col-md-4"><label className="form-label">Guests (max {room.capacity})</label><input type="number" required min="1" max={room.capacity} className="form-control" value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })} /></div>
          <div className="col-12"><label className="form-label">Special requests (optional)</label><textarea className="form-control" rows="3" maxLength="500" value={f.specialRequests} onChange={(e) => setF({ ...f, specialRequests: e.target.value })} /></div>
        </div>
        {quote && (
          <div className="mt-3">
            {quote.available ? (
              <table className="table table-sm w-auto ms-auto mb-0"><tbody>
                <tr><td>{quote.nights} night(s)</td><td className="text-end">{money(quote.subtotal)}</td></tr>
                <tr><td>Taxes</td><td className="text-end">{money(quote.tax)}</td></tr>
                <tr className="fw-bold"><td>Total</td><td className="text-end ps-4">{money(quote.total)}</td></tr>
              </tbody></table>
            ) : <div className="alert alert-warning mb-0">This room is not available for those dates.</div>}
          </div>
        )}
        <button className="btn btn-primary mt-3" disabled={busy || !quote?.available || Number(f.guests) > room.capacity}>{busy ? 'Reserving...' : 'Continue to payment'}</button>
      </form>
    </div>
  );
}
