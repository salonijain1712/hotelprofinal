const Booking = require('../models/Booking');
const Room = require('../models/Room');
const CheckInOut = require('../models/CheckInOut');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');
const sendEmail = require('../utils/email');
const logAction = require('../utils/logAction');
const { hotelScope, today, addDays } = require('../utils/helpers');

const bad = (res, msg, code = 400) => res.status(code).json({ message: msg });
const populateB = (q) => q.populate('guest', 'name phone email').populate('room', 'roomNumber status');

// Front desk overview: today's arrivals, departures and in-house guests
exports.overview = asyncHandler(async (req, res) => {
  const scope = hotelScope(req.user, req.query.hotel);
  const t = today();
  const tomorrow = addDays(t, 1);
  const [arrivals, departures, inHouse] = await Promise.all([
    populateB(Booking.find({ ...scope, status: 'confirmed', checkIn: { $lt: tomorrow }, checkOut: { $gt: t } }).sort({ checkIn: 1 })),
    populateB(Booking.find({ ...scope, status: 'checked-in', checkOut: { $lt: tomorrow } }).sort({ checkOut: 1 })),
    populateB(Booking.find({ ...scope, status: 'checked-in' }).sort({ checkOut: 1 })),
  ]);
  res.json({ arrivals, departures, inHouse });
});

exports.checkIn = asyncHandler(async (req, res) => {
  const b = await Booking.findOne({ _id: req.params.bookingId, ...hotelScope(req.user) });
  if (!b) return bad(res, 'Booking not found', 404);
  if (b.status !== 'confirmed') return bad(res, 'Only confirmed bookings can be checked in');
  if (b.checkIn >= addDays(today(), 1)) return bad(res, 'Check-in date has not arrived yet');
  const room = await Room.findById(b.room);
  if (room.status !== 'available') return bad(res, `Room ${room.roomNumber} is ${room.status} and not ready for check-in`, 409);
  b.status = 'checked-in';
  room.status = 'occupied';
  await Promise.all([b.save(), room.save()]);
  await CheckInOut.findOneAndUpdate(
    { booking: b._id },
    { booking: b._id, guest: b.guest, room: b.room, hotel: b.hotel, checkedInBy: req.user._id, checkedInAt: new Date(), notes: req.body.notes },
    { upsert: true, new: true }
  );
  notify(b.guest, 'Welcome!', `You are checked in to room ${room.roomNumber}. Enjoy your stay.`, 'booking');
  logAction(req, 'CHECK_IN', 'Booking', { ref: b.bookingRef });
  res.json({ booking: b });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const b = await Booking.findOne({ _id: req.params.bookingId, ...hotelScope(req.user) }).populate('guest', 'name email');
  if (!b) return bad(res, 'Booking not found', 404);
  if (b.status !== 'checked-in') return bad(res, 'Only checked-in bookings can be checked out');
  const extra = Math.max(Number(req.body.extraCharges) || 0, 0);
  b.status = 'checked-out';
  b.extraCharges += extra;
  b.totalPrice += extra;
  await b.save();
  await Room.findByIdAndUpdate(b.room, { status: 'cleaning' });
  await CheckInOut.findOneAndUpdate({ booking: b._id }, { checkedOutBy: req.user._id, checkedOutAt: new Date(), extraCharges: extra, notes: req.body.notes });
  notify(b.guest._id, 'Thanks for staying with us', 'Your check-out is complete. We would love your review!', 'review');
  sendEmail({ to: b.guest.email, subject: `Thank you for staying - ${b.bookingRef}`, html: `<p>Hi ${b.guest.name}, thanks for staying with us. You can download your invoice and leave a review from your dashboard.</p>` });
  logAction(req, 'CHECK_OUT', 'Booking', { ref: b.bookingRef, extra });
  res.json({ booking: b });
});

exports.setRoomStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['available', 'occupied', 'cleaning', 'maintenance'].includes(status)) return bad(res, 'Invalid status');
  const room = await Room.findOne({ _id: req.params.id, ...hotelScope(req.user) });
  if (!room) return bad(res, 'Room not found', 404);
  room.status = status;
  await room.save();
  logAction(req, 'ROOM_STATUS', 'Room', { room: room.roomNumber, status });
  res.json({ room });
});

// Housekeeping: rooms needing cleaning (optionally only the ones assigned to me)
exports.housekeeping = asyncHandler(async (req, res) => {
  const filter = { ...hotelScope(req.user, req.query.hotel), status: { $in: ['cleaning', 'maintenance'] } };
  if (req.query.mine === 'true') filter.assignedStaff = req.user._id;
  const rooms = await Room.find(filter).populate('assignedStaff', 'name').populate('category', 'name').sort({ roomNumber: 1 });
  res.json({ rooms });
});
