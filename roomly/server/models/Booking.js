const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: { type: String, unique: true, required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: Number,
    guests: { type: Number, default: 1, min: 1 },
    specialRequests: String,
    subtotal: Number,
    tax: Number,
    extraCharges: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    cancellation: { reason: String, cancelledAt: Date, cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
    refund: {
      status: { type: String, enum: ['none', 'requested', 'processed', 'rejected'], default: 'none' },
      amount: Number,
      requestedAt: Date,
      processedAt: Date,
    },
    expiresAt: Date, // unpaid pending bookings are auto-cancelled after this
  },
  { timestamps: true }
);

bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });
bookingSchema.index({ hotel: 1, status: 1, checkIn: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
