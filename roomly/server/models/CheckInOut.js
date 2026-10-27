const mongoose = require('mongoose');

const checkSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedInAt: Date,
    checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedOutAt: Date,
    extraCharges: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('CheckInOut', checkSchema);
