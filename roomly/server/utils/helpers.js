const mongoose = require('mongoose');

exports.paginate = (req, def = 10) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || def, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

exports.escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Query filter limiting data to the user's hotel. Admins see everything (or one hotel via ?hotel=).
// A staff/manager without a hotel gets a filter that matches nothing.
exports.hotelScope = (user, queryHotel) => {
  if (user.role === 'admin') {
    return queryHotel && mongoose.isValidObjectId(queryHotel) ? { hotel: new mongoose.Types.ObjectId(queryHotel) } : {};
  }
  return { hotel: user.hotel || new mongoose.Types.ObjectId() };
};

exports.canAccessHotel = (user, hotelId) =>
  user.role === 'admin' || (!!user.hotel && String(user.hotel) === String(hotelId));

exports.toDate = (s) => {
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

exports.startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

// "Today" as a UTC-midnight date in the hotel's local calendar (TZ_OFFSET_MINUTES)
exports.today = () => exports.startOfDay(new Date(Date.now() + (parseInt(process.env.TZ_OFFSET_MINUTES) || 0) * 60000));

exports.addDays = (d, n) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
