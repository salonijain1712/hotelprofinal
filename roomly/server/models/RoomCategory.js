const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: String,
    basePrice: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 2, min: 1 },
    amenities: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoomCategory', categorySchema);
