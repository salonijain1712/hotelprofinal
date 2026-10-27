const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['summary', 'revenue', 'occupancy'], required: true },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
    params: mongoose.Schema.Types.Mixed,
    data: mongoose.Schema.Types.Mixed,
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
