import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import api from '../api/axios';
import Loader from '../components/Loader';
import { money, errMsg, fmtDate } from '../utils';

const pk = import.meta.env.VITE_STRIPE_PK;
const stripePromise = pk ? loadStripe(pk) : null;

function StripeForm({ bookingId, paymentIntentId, onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const pay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') await onDone(paymentIntentId);
    else { toast.info('Payment is processing. Check your dashboard shortly.'); setBusy(false); }
  };

  return (
    <form onSubmit={pay}>
      <PaymentElement />
      <button className="btn btn-primary mt-3 w-100" disabled={busy || !stripe}>{busy ? 'Processing...' : 'Pay now'}</button>
    </form>
  );
}

export default function Pay() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/bookings/${bookingId}`);
        setBooking(data.booking);
        if (data.booking.status !== 'pending' || data.booking.paymentStatus !== 'unpaid') return;
        const r = await api.post('/payments/intent', { bookingId });
        setIntent(r.data);
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [bookingId]);

  const confirm = async (paymentIntentId) => {
    try {
      await api.post('/payments/confirm', { bookingId, paymentIntentId });
      toast.success('Payment successful. Your booking is confirmed!');
      navigate('/dashboard');
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  };

  if (error) return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>;
  if (!booking) return <Loader />;
  const payable = booking.status === 'pending' && booking.paymentStatus === 'unpaid';

  return (
    <div className="container py-4" style={{ maxWidth: 620 }}>
      <h2 className="mb-3">Payment</h2>
      <div className="card mb-3"><div className="card-body">
        <div className="d-flex justify-content-between"><span>Booking</span><strong>{booking.bookingRef}</strong></div>
        <div className="d-flex justify-content-between"><span>{booking.hotel?.name} · Room {booking.room?.roomNumber}</span><span>{fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</span></div>
        <hr />
        <div className="d-flex justify-content-between fs-5"><span>Total due</span><strong>{money(booking.totalPrice)}</strong></div>
      </div></div>

      {!payable && <div className="alert alert-info">This booking is {booking.status} ({booking.paymentStatus}); no payment is due.</div>}

      {payable && intent && (
        <div className="card card-body">
          {intent.mock ? (
            <>
              <div className="alert alert-warning">Demo payment mode: no real card is charged. Add Stripe keys to enable real payments.</div>
              <button className="btn btn-primary" disabled={busy} onClick={() => { setBusy(true); confirm(intent.paymentIntentId); }}>
                {busy ? 'Processing...' : `Pay ${money(booking.totalPrice)} (demo)`}
              </button>
            </>
          ) : stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret }}>
              <StripeForm bookingId={bookingId} paymentIntentId={intent.paymentIntentId} onDone={confirm} />
            </Elements>
          ) : (
            <div className="alert alert-danger mb-0">Stripe is enabled on the server but VITE_STRIPE_PK is missing in the client .env.</div>
          )}
          <div className="small text-muted mt-3">Your reservation is held for 30 minutes.</div>
        </div>
      )}
    </div>
  );
}
