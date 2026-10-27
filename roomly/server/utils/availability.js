const Booking = require('../models/Booking');

const ACTIVE = ['pending', 'confirmed', 'checked-in'];

const overlapQuery = (checkIn, checkOut) => ({ status: { $in: ACTIVE }, checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } });

// NOTE: check-then-insert can race under heavy concurrency. For strict guarantees
// add a per-room-night lock collection or run booking creation in a transaction.
const isRoomAvailable = async (roomId, checkIn, checkOut, excludeBookingId) => {
  const q = { room: roomId, ...overlapQuery(checkIn, checkOut) };
  if (excludeBookingId) q._id = { $ne: excludeBookingId };
  return !(await Booking.exists(q));
};

module.exports = { ACTIVE, overlapQuery, isRoomAvailable };
