const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Report = require('../models/Report');
const asyncHandler = require('../utils/asyncHandler');
const { hotelScope, today, addDays } = require('../utils/helpers');
const { ACTIVE } = require('../utils/availability');

const getSummary = async (scope) => {
  const [totalRooms, occupiedNow, byStatus, revenueAgg, pendingRefunds, users] = await Promise.all([
    Room.countDocuments(scope),
    Room.countDocuments({ ...scope, status: 'occupied' }),
    Booking.aggregate([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { ...scope, status: 'paid' } }, { $group: { _id: null, revenue: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    Booking.countDocuments({ ...scope, 'refund.status': 'requested' }),
    Object.keys(scope).length ? null : User.countDocuments(),
  ]);
  const bookingsByStatus = {};
  byStatus.forEach((s) => (bookingsByStatus[s._id] = s.n));
  return {
    totalRooms,
    occupiedNow,
    occupancyNow: totalRooms ? Math.round((occupiedNow / totalRooms) * 100) : 0,
    bookingsByStatus,
    totalBookings: byStatus.reduce((a, s) => a + s.n, 0),
    revenue: revenueAgg[0] ? revenueAgg[0].revenue : 0,
    paidPayments: revenueAgg[0] ? revenueAgg[0].n : 0,
    pendingRefunds,
    users,
  };
};

const getRevenue = async (scope, months) => {
  const from = new Date();
  from.setUTCDate(1);
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCMonth(from.getUTCMonth() - (months - 1));
  const rows = await Payment.aggregate([
    { $match: { ...scope, status: 'paid', createdAt: { $gte: from } } },
    { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);
  const map = {};
  rows.forEach((r) => (map[`${r._id.y}-${String(r._id.m).padStart(2, '0')}`] = r));
  const out = [];
  const d = new Date(from);
  for (let i = 0; i < months; i++) {
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push({ month: key, revenue: map[key] ? map[key].revenue : 0, count: map[key] ? map[key].count : 0 });
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
};

// Forecast occupancy % per day, based on active bookings
const getOccupancy = async (scope, days) => {
  const start = today();
  const end = addDays(start, days);
  const [totalRooms, bookings] = await Promise.all([
    Room.countDocuments({ ...scope, status: { $ne: 'maintenance' } }),
    Booking.find({ ...scope, status: { $in: ACTIVE }, checkIn: { $lt: end }, checkOut: { $gt: start } }).select('checkIn checkOut'),
  ]);
  const out = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const occupied = bookings.filter((b) => b.checkIn <= day && b.checkOut > day).length;
    out.push({ date: day.toISOString().slice(0, 10), occupied, occupancy: totalRooms ? Math.round((occupied / totalRooms) * 100) : 0 });
  }
  return { totalRooms, days: out };
};

exports.summary = asyncHandler(async (req, res) => res.json(await getSummary(hotelScope(req.user, req.query.hotel))));

exports.revenue = asyncHandler(async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 24);
  res.json({ months: await getRevenue(hotelScope(req.user, req.query.hotel), months) });
});

exports.occupancy = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 14, 1), 60);
  res.json(await getOccupancy(hotelScope(req.user, req.query.hotel), days));
});

// Generate and store a report snapshot
exports.generate = asyncHandler(async (req, res) => {
  const scope = hotelScope(req.user, req.body.hotel);
  const { type = 'summary' } = req.body;
  let data;
  if (type === 'summary') data = await getSummary(scope);
  else if (type === 'revenue') data = await getRevenue(scope, Math.min(parseInt(req.body.months) || 6, 24));
  else if (type === 'occupancy') data = await getOccupancy(scope, Math.min(parseInt(req.body.days) || 14, 60));
  else return res.status(400).json({ message: 'Unknown report type' });
  const report = await Report.create({ type, hotel: scope.hotel, params: req.body, data, generatedBy: req.user._id });
  res.status(201).json({ report });
});

exports.list = asyncHandler(async (req, res) => {
  const reports = await Report.find(hotelScope(req.user, req.query.hotel)).populate('generatedBy', 'name').sort({ createdAt: -1 }).limit(30);
  res.json({ reports });
});
