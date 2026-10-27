const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');
const sendEmail = require('../utils/email');
const logAction = require('../utils/logAction');
const { paginate, hotelScope } = require('../utils/helpers');

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const currency = () => (process.env.CURRENCY || 'inr').toLowerCase();
const mockAllowed = () => process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PAYMENTS === 'true';
const bad = (res, msg, code = 400) => res.status(code).json({ message: msg });

// Step 1: create a payment intent for an unpaid booking
exports.createIntent = asyncHandler(async (req, res) => {
  const b = await Booking.findOne({ _id: req.body.bookingId, guest: req.user._id });
  if (!b) return bad(res, 'Booking not found', 404);
  if (b.status !== 'pending' || b.paymentStatus !== 'unpaid') return bad(res, 'This booking is not awaiting payment');
  if (stripe) {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(b.totalPrice * 100),
      currency: currency(),
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId: String(b._id), bookingRef: b.bookingRef },
    });
    return res.json({ mock: false, clientSecret: pi.client_secret, paymentIntentId: pi.id, amount: b.totalPrice });
  }
  if (!mockAllowed()) return bad(res, 'Payments are not configured', 503);
  res.json({ mock: true, paymentIntentId: 'mock_' + crypto.randomBytes(8).toString('hex'), amount: b.totalPrice });
});

// Step 2: verify payment and confirm the booking
exports.confirm = asyncHandler(async (req, res) => {
  const { bookingId, paymentIntentId } = req.body;
  const b = await Booking.findOne({ _id: bookingId, guest: req.user._id }).populate('guest', 'name email');
  if (!b) return bad(res, 'Booking not found', 404);
  if (b.paymentStatus === 'paid') return res.json({ booking: b, message: 'Already paid' });
  if (b.status !== 'pending') return bad(res, 'This booking is no longer awaiting payment');

  let provider = 'mock';
  const ref = paymentIntentId || 'mock_' + crypto.randomBytes(6).toString('hex');
  if (stripe) {
    if (!paymentIntentId || String(paymentIntentId).startsWith('mock_')) return bad(res, 'A valid payment is required', 402);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded' || pi.metadata.bookingId !== String(b._id) || pi.amount !== Math.round(b.totalPrice * 100))
      return bad(res, 'Payment could not be verified', 402);
    if (await Payment.exists({ providerRef: paymentIntentId })) return bad(res, 'Payment already recorded', 409);
    provider = 'stripe';
  } else if (!mockAllowed()) {
    return bad(res, 'Payments are not configured', 503);
  }

  await Payment.create({ booking: b._id, user: req.user._id, hotel: b.hotel, amount: b.totalPrice, currency: currency(), provider, providerRef: ref });
  b.paymentStatus = 'paid';
  b.status = process.env.REQUIRE_BOOKING_APPROVAL === 'true' ? 'pending' : 'confirmed';
  if (b.status === 'confirmed') b.expiresAt = undefined;
  await b.save();

  notify(b.guest._id, 'Payment received', `Payment for booking ${b.bookingRef} was successful.`, 'payment');
  sendEmail({
    to: b.guest.email,
    subject: `Booking ${b.bookingRef} ${b.status === 'confirmed' ? 'confirmed' : 'received'}`,
    html: `<p>Hi ${b.guest.name},</p><p>We received your payment of ${b.totalPrice}. Your booking <strong>${b.bookingRef}</strong> is ${b.status === 'confirmed' ? 'confirmed' : 'awaiting hotel approval'}.</p>`,
  });
  logAction(req, 'PAYMENT_RECEIVED', 'Payment', { ref: b.bookingRef, provider });
  res.json({ booking: b, message: 'Payment successful' });
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req);
  const filter = hotelScope(req.user, req.query.hotel);
  if (req.query.status) filter.status = req.query.status;
  const [payments, total] = await Promise.all([
    Payment.find(filter).populate('user', 'name email').populate('booking', 'bookingRef').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);
  res.json({ payments, total, page, pages: Math.ceil(total / limit) });
});

// Manager/admin: approve (default) or reject a refund request
exports.refund = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.bookingId);
  if (!b) return bad(res, 'Booking not found', 404);
  if (req.user.role !== 'admin' && String(b.hotel) !== String(req.user.hotel)) return bad(res, 'Forbidden', 403);
  if (b.refund.status !== 'requested') return bad(res, 'No pending refund request for this booking');

  if (req.body.reject) {
    b.refund.status = 'rejected';
    b.refund.processedAt = new Date();
    await b.save();
    notify(b.guest, 'Refund declined', `The refund request for booking ${b.bookingRef} was declined.`, 'payment');
    logAction(req, 'REFUND_REJECTED', 'Booking', { ref: b.bookingRef });
    return res.json({ booking: b });
  }

  const payment = await Payment.findOne({ booking: b._id, status: 'paid' });
  if (!payment) return bad(res, 'No successful payment found for this booking');
  if (payment.provider === 'stripe' && stripe) {
    const r = await stripe.refunds.create({ payment_intent: payment.providerRef, amount: Math.round(b.refund.amount * 100) });
    payment.refundRef = r.id;
  } else {
    payment.refundRef = 'mock_refund_' + crypto.randomBytes(5).toString('hex');
  }
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();
  b.paymentStatus = 'refunded';
  b.refund.status = 'processed';
  b.refund.processedAt = new Date();
  await b.save();
  notify(b.guest, 'Refund processed', `Your refund for booking ${b.bookingRef} has been processed.`, 'payment');
  logAction(req, 'REFUND_PROCESSED', 'Booking', { ref: b.bookingRef, amount: b.refund.amount });
  res.json({ booking: b });
});
