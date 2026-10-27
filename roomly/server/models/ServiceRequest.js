const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    type: { type: String, enum: ['housekeeping', 'room-service', 'maintenance', 'laundry', 'transport', 'other'], default: 'other' },
    description: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ['open', 'in-progress', 'done', 'cancelled'], default: 'open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

serviceSchema.index({ hotel: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', serviceSchema);
