const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    entity: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
);

logSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminLog', logSchema);
