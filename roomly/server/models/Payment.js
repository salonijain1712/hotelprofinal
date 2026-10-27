const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'inr' },
    provider: { type: String, enum: ['stripe', 'razorpay', 'mock'], default: 'mock' },
    providerRef: String,
    status: { type: String, enum: ['paid', 'refunded', 'failed'], default: 'paid' },
    refundRef: String,
    refundedAt: Date,
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
