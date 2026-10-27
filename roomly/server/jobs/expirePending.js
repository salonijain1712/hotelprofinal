const Booking = require('../models/Booking');

// Background job: cancel unpaid pending bookings whose payment window expired.
module.exports = () => {
  setInterval(async () => {
    try {
      const r = await Booking.updateMany(
        { status: 'pending', paymentStatus: 'unpaid', expiresAt: { $lt: new Date() } },
        { $set: { status: 'cancelled', 'cancellation.reason': 'Payment window expired', 'cancellation.cancelledAt': new Date() } }
      );
      if (r.modifiedCount) console.log(`Expired ${r.modifiedCount} unpaid booking(s)`);
    } catch (e) {
      console.error('expirePending job failed:', e.message);
    }
  }, 60 * 1000);
};
