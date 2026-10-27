const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    address: { street: String, city: { type: String, index: true }, state: String, country: String, zip: String },
    contact: { phone: String, email: String },
    amenities: [String],
    images: [String],
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hotel', hotelSchema);
