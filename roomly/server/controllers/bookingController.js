const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { paginate, hotelScope, toDate, today, escapeRegex } = require('../utils/helpers');
const { isRoomAvailable } = require('../utils/availability');
const { calcPrice } = require('../utils/pricing');
const getConfig = require('../utils/config');
const notify = require('../utils/notify');
const sendEmail = require('../utils/email');
const logAction = require('../utils/logAction');

const isStaff = (u) => ['staff', 'manager', 'admin'].includes(u.role);
const bad = (res, msg, code = 400) => res.status(code).json({ message: msg });
const genRef = () => 'RM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
const idOf = (x) => String(x && x._id ? x._id : x);

const canView = (user, b) =>
  idOf(b.guest) === String(user._id) || (isStaff(user) && (user.role === 'admin' || idOf(b.hotel) === String(user.hotel)));

const validateStay = (b) => {
  const ci = toDate(b.checkIn), co = toDate(b.checkOut);
  if (!ci || !co) return { error: 'Valid check-in and check-out dates are required' };
  if (ci < today()) return { error: 'Check-in cannot be in the past' };
  if (co <= ci) return { error: 'Check-out must be after check-in' };
  if ((co - ci) / 864e5 > 60) return { error: 'Maximum stay is 60 nights' };
  return { ci, co };
};

exports.quote = asyncHandler(async (req, res) => {
  const v = validateStay(req.body);
  if (v.error) return bad(res, v.error);
  const room = await Room.findById(req.body.room);
  if (!room) return bad(res, 'Room not found', 404);
  const available = room.status !== 'maintenance' && (await isRoomAvailable(room._id, v.ci, v.co));
  res.json({ available, ...calcPrice(room, v.ci, v.co, await getConfig('taxRate')) });
});

exports.create = asyncHandler(async (req, res) => {
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !req.user.isVerified)
    return bad(res, 'Please verify your email before booking', 403);
  const v = validateStay(req.body);
  if (v.error) return bad(res, v.error);
  const room = await Room.findById(req.body.room);
  if (!room || room.status === 'maintenance') return bad(res, 'Room is not available for booking', 404);
  const guests = Number(req.body.guests) || 1;
  if (guests > room.capacity) return bad(res, `This room sleeps at most ${room.capacity} guests`);
  if (!(await isRoomAvailable(room._id, v.ci, v.co))) return bad(res, 'Room is not available for the selected dates', 409);
  const p = calcPrice(room, v.ci, v.co, await getConfig('taxRate'));
  const booking = await Booking.create({
    bookingRef: genRef(),
    guest: req.user._id,
    room: room._id,
    hotel: room.hotel,
    checkIn: v.ci,
    checkOut: v.co,
    nights: p.nights,
    guests,
    specialRequests: req.body.specialRequests,
    subtotal: p.subtotal,
    tax: p.tax,
    totalPrice: p.total,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });
  logAction(req, 'BOOKING_CREATED', 'Booking', { ref: booking.bookingRef });
  res.status(201).json({ booking });
});

exports.my = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ guest: req.user._id })
    .populate({ path: 'room', select: 'roomNumber images', populate: { path: 'category', select: 'name' } })
    .populate('hotel', 'name')
    .sort({ createdAt: -1 });
  res.json({ bookings });
});

exports.listAll = asyncHandler(async (req, res) => {
  const { status, refund, q, from, to } = req.query;
  const { page, limit, skip } = paginate(req);
  const filter = hotelScope(req.user, req.query.hotel);
  if (status) filter.status = status;
  if (refund) filter['refund.status'] = refund;
  if (q) filter.bookingRef = new RegExp(escapeRegex(q), 'i');
  if (from || to) {
    filter.checkIn = {};
    if (from) filter.checkIn.$gte = toDate(from);
    if (to) filter.checkIn.$lte = toDate(to);
  }
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('guest', 'name email phone')
      .populate('room', 'roomNumber')
      .populate('hotel', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);
  res.json({ bookings, total, page, pages: Math.ceil(total / limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id)
    .populate('guest', 'name email phone')
    .populate({ path: 'room', populate: { path: 'category', select: 'name' } })
    .populate('hotel', 'name address contact');
  if (!b) return bad(res, 'Booking not found', 404);
  if (!canView(req.user, b)) return bad(res, 'Forbidden', 403);
  res.json({ booking: b });
});

exports.modify = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id);
  if (!b) return bad(res, 'Booking not found', 404);
  if (!canView(req.user, b)) return bad(res, 'Forbidden', 403);
  if (!['pending', 'confirmed'].includes(b.status)) return bad(res, 'This booking can no longer be modified');
  if (!isStaff(req.user)) {
    const hours = await getConfig('cancellationHours');
    if ((b.checkIn - new Date()) / 36e5 < hours) return bad(res, `Bookings can only be modified at least ${hours} hours before check-in`);
  }
  const v = validateStay({ checkIn: req.body.checkIn || b.checkIn, checkOut: req.body.checkOut || b.checkOut });
  if (v.error) return bad(res, v.error);
  const room = await Room.findById(b.room);
  const guests = Number(req.body.guests) || b.guests;
  if (guests > room.capacity) return bad(res, `This room sleeps at most ${room.capacity} guests`);
  if (!(await isRoomAvailable(room._id, v.ci, v.co, b._id))) return bad(res, 'Room is not available for the new dates', 409);
  const p = calcPrice(room, v.ci, v.co, await getConfig('taxRate'));
  Object.assign(b, { checkIn: v.ci, checkOut: v.co, nights: p.nights, guests, subtotal: p.subtotal, tax: p.tax, totalPrice: p.total });
  if (req.body.specialRequests !== undefined) b.specialRequests = req.body.specialRequests;
  await b.save();
  notify(b.guest, 'Booking updated', `Booking ${b.bookingRef} was modified. New total: ${b.totalPrice}.`, 'booking');
  logAction(req, 'BOOKING_MODIFIED', 'Booking', { ref: b.bookingRef });
  res.json({ booking: b });
});

exports.cancel = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id).populate('guest', 'name email');
  if (!b) return bad(res, 'Booking not found', 404);
  if (!canView(req.user, b)) return bad(res, 'Forbidden', 403);
  if (!['pending', 'confirmed'].includes(b.status)) return bad(res, 'This booking can no longer be cancelled');
  const hours = await getConfig('cancellationHours');
  const withinPolicy = (b.checkIn - new Date()) / 36e5 >= hours;
  b.status = 'cancelled';
  b.cancellation = { reason: req.body.reason || '', cancelledAt: new Date(), cancelledBy: req.user._id };
  let message = 'Booking cancelled.';
  if (b.paymentStatus === 'paid') {
    if (isStaff(req.user) || withinPolicy) {
      b.refund = { status: 'requested', amount: b.totalPrice, requestedAt: new Date() };
      message = 'Booking cancelled. A refund request has been submitted for approval.';
    } else {
      message = `Booking cancelled. The free-cancellation window (${hours}h before check-in) has passed, so no refund was requested.`;
    }
  }
  await b.save();
  notify(b.guest._id, 'Booking cancelled', `Booking ${b.bookingRef} has been cancelled.`, 'booking');
  sendEmail({ to: b.guest.email, subject: `Booking ${b.bookingRef} cancelled`, html: `<p>Your booking ${b.bookingRef} was cancelled.</p><p>${message}</p>` });
  logAction(req, 'BOOKING_CANCELLED', 'Booking', { ref: b.bookingRef });
  res.json({ booking: b, message });
});

// Hotel staff: approve a pending booking
exports.approve = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id).populate('guest', 'name email');
  if (!b) return bad(res, 'Booking not found', 404);
  if (!canView(req.user, b)) return bad(res, 'Forbidden', 403);
  if (b.status !== 'pending') return bad(res, 'Only pending bookings can be approved');
  b.status = 'confirmed';
  b.expiresAt = undefined;
  await b.save();
  notify(b.guest._id, 'Booking confirmed', `Booking ${b.bookingRef} has been confirmed.`, 'booking');
  sendEmail({ to: b.guest.email, subject: `Booking ${b.bookingRef} confirmed`, html: `<p>Your booking ${b.bookingRef} is confirmed. We look forward to hosting you!</p>` });
  logAction(req, 'BOOKING_APPROVED', 'Booking', { ref: b.bookingRef });
  res.json({ booking: b });
});

const money = (n) => Number(n || 0).toFixed(2);

exports.invoice = asyncHandler(async (req, res) => {
  const b = await Booking.findById(req.params.id)
    .populate('guest', 'name email phone')
    .populate({ path: 'room', populate: { path: 'category', select: 'name' } })
    .populate('hotel', 'name address contact');
  if (!b) return bad(res, 'Booking not found', 404);
  if (!canView(req.user, b)) return bad(res, 'Forbidden', 403);
  const payment = await Payment.findOne({ booking: b._id }).sort({ createdAt: -1 });
  const data = {
    invoiceNo: 'INV-' + b.bookingRef,
    issuedAt: new Date(),
    booking: b,
    payment: payment ? { provider: payment.provider, ref: payment.providerRef, status: payment.status, paidAt: payment.createdAt } : null,
  };
  if (req.query.format === 'json') return res.json(data);
  const d = (x) => new Date(x).toISOString().slice(0, 10);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cur = (process.env.CURRENCY || 'inr').toUpperCase();
  res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>${data.invoiceNo}</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:32px auto;color:#222}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}h1{margin:0}.muted{color:#666}.tot td{font-weight:bold;border-top:2px solid #222}</style></head><body>
<h1>Invoice</h1><p class="muted">${data.invoiceNo} &middot; Issued ${d(data.issuedAt)}</p>
<p><strong>${esc(b.hotel.name)}</strong><br>${esc(b.hotel.address && [b.hotel.address.street, b.hotel.address.city, b.hotel.address.country].filter(Boolean).join(', '))}</p>
<p><strong>Billed to:</strong> ${esc(b.guest.name)} (${esc(b.guest.email)})</p>
<p>Room ${esc(b.room.roomNumber)} (${esc(b.room.category && b.room.category.name)}) &middot; ${d(b.checkIn)} to ${d(b.checkOut)} &middot; ${b.nights} night(s) &middot; ${b.guests} guest(s)</p>
<table><tr><th>Description</th><th class="r">Amount (${cur})</th></tr>
<tr><td>Room charges (${b.nights} nights)</td><td class="r">${money(b.subtotal)}</td></tr>
<tr><td>Taxes</td><td class="r">${money(b.tax)}</td></tr>
${b.extraCharges ? `<tr><td>Extra charges</td><td class="r">${money(b.extraCharges)}</td></tr>` : ''}
<tr class="tot"><td>Total</td><td class="r">${money(b.totalPrice)}</td></tr></table>
<p class="muted">Payment status: ${esc(b.paymentStatus)}${payment ? ` (${esc(payment.provider)} ${esc(payment.providerRef || '')})` : ''}</p>
</body></html>`);
});
