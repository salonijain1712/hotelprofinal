const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    multiplier: { type: Number, required: true, min: 0.1, max: 10 },
  },
  { _id: true }
);

const roomSchema = new mongoose.Schema(
  {
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomCategory', required: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1 },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 2, min: 1 },
    description: String,
    amenities: [String],
    images: [String],
    status: { type: String, enum: ['available', 'occupied', 'cleaning', 'maintenance'], default: 'available' },
    seasonalPricing: [seasonSchema],
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotel: 1, status: 1 });
roomSchema.index({ category: 1, price: 1 });

module.exports = mongoose.model('Room', roomSchema);
