const Config = require('../models/Config');

const DEFAULTS = {
  taxRate: () => parseFloat(process.env.TAX_RATE || '0.12'),
  cancellationHours: () => 24,
};

// Reads a platform setting (set by admins) and falls back to env/defaults.
module.exports = async (key) => {
  const c = await Config.findOne({ key }).lean();
  if (c && c.value !== null && c.value !== undefined && c.value !== '') return c.value;
  return DEFAULTS[key] ? DEFAULTS[key]() : null;
};
