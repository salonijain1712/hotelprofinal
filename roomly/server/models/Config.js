const mongoose = require('mongoose');

// Platform configuration key/value store (taxRate, cancellationHours, ...)
const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Config', configSchema);
