const Room = require('../models/Room');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');
const RoomCategory = require('../models/RoomCategory');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logAction = require('../utils/logAction');
const { overlapQuery, ACTIVE } = require('../utils/availability');
const { paginate, hotelScope, canAccessHotel, escapeRegex, toDate } = require('../utils/helpers');

// Public listing with filters + availability for a date range
exports.list = asyncHandler(async (req, res) => {
  const { hotel, category, minPrice, maxPrice, capacity, checkIn, checkOut, city, sort } = req.query;
  const { page, limit, skip } = paginate(req, 9);
  const filter = { status: { $ne: 'maintenance' } };
  if (hotel) filter.hotel = hotel;
  if (category) filter.category = category;
  if (capacity) filter.capacity = { $gte: Number(capacity) };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (city && !hotel) {
    const ids = await Hotel.find({ 'address.city': new RegExp('^' + escapeRegex(city), 'i'), active: true }).distinct('_id');
    filter.hotel = { $in: ids };
  }
  const ci = toDate(checkIn), co = toDate(checkOut);
  if (ci && co && co > ci) {
    const booked = await Booking.find(overlapQuery(ci, co)).distinct('room');
    filter._id = { $nin: booked };
  }
  const sortMap = { 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, newest: { createdAt: -1 } };
  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .populate('category', 'name')
      .populate('hotel', 'name address.city ratingAvg ratingCount')
      .sort(sortMap[sort] || { price: 1 })
      .skip(skip)
      .limit(limit),
    Room.countDocuments(filter),
  ]);
  res.json({ rooms, total, page, pages: Math.ceil(total / limit) });
});

// Staff / manager / admin: every room in scope, any status
exports.manageList = asyncHandler(async (req, res) => {
  const filter = hotelScope(req.user, req.query.hotel);
  if (req.query.status) filter.status = req.query.status;
  const rooms = await Room.find(filter)
    .populate('category', 'name')
    .populate('hotel', 'name')
    .populate('assignedStaff', 'name')
    .sort({ roomNumber: 1 });
  res.json({ rooms });
});

exports.get = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('category').populate('hotel');
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json({ room });
});

// Booked date ranges for the next 180 days (availability calendar)
exports.availability = asyncHandler(async (req, res) => {
  const from = toDate(req.query.from) || new Date();
  const to = toDate(req.query.to) || new Date(from.getTime() + 180 * 864e5);
  const booked = await Booking.find({ room: req.params.id, status: { $in: ACTIVE }, checkIn: { $lt: to }, checkOut: { $gt: from } }).select('checkIn checkOut status');
  res.json({ booked });
});

exports.create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.user.role === 'manager') data.hotel = req.user.hotel;
  if (!data.hotel) return res.status(400).json({ message: 'Hotel is required' });
  const cat = await RoomCategory.findById(data.category);
  if (!cat) return res.status(400).json({ message: 'Invalid category' });
  if (data.price === undefined || data.price === '') data.price = cat.basePrice;
  if (!data.capacity) data.capacity = cat.capacity;
  if (!data.amenities || !data.amenities.length) data.amenities = cat.amenities;
  delete data.images;
  const room = await Room.create(data);
  logAction(req, 'ROOM_CREATED', 'Room', { id: room._id, roomNumber: room.roomNumber });
  res.status(201).json({ room });
});

const loadManaged = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) { res.status(404).json({ message: 'Room not found' }); return null; }
  if (!canAccessHotel(req.user, room.hotel)) { res.status(403).json({ message: 'Not your hotel' }); return null; }
  return room;
};

exports.update = asyncHandler(async (req, res) => {
  const room = await loadManaged(req, res);
  if (!room) return;
  const { hotel, images, seasonalPricing, ...data } = req.body;
  Object.assign(room, data);
  await room.save();
  logAction(req, 'ROOM_UPDATED', 'Room', { id: room._id });
  res.json({ room });
});

exports.remove = asyncHandler(async (req, res) => {
  const room = await loadManaged(req, res);
  if (!room) return;
  if (await Booking.exists({ room: room._id, status: { $in: ACTIVE } })) return res.status(400).json({ message: 'Room has active bookings' });
  await room.deleteOne();
  logAction(req, 'ROOM_DELETED', 'Room', { id: room._id, roomNumber: room.roomNumber });
  res.json({ message: 'Room deleted' });
});

// Room pricing + seasonal pricing
exports.setPricing = asyncHandler(async (req, res) => {
  const room = await loadManaged(req, res);
  if (!room) return;
  const { price, seasonalPricing } = req.body;
  if (price !== undefined) room.price = price;
  if (Array.isArray(seasonalPricing)) room.seasonalPricing = seasonalPricing;
  await room.save();
  logAction(req, 'ROOM_PRICING_UPDATED', 'Room', { id: room._id, price: room.price });
  res.json({ room });
});

exports.uploadImages = asyncHandler(async (req, res) => {
  const room = await loadManaged(req, res);
  if (!room) return;
  room.images.push(...(req.files || []).map((f) => '/uploads/' + f.filename));
  await room.save();
  res.json({ room });
});

// Staff assignment (housekeeping responsibility)
exports.assignStaff = asyncHandler(async (req, res) => {
  const room = await loadManaged(req, res);
  if (!room) return;
  if (req.body.staffId) {
    const staff = await User.findOne({ _id: req.body.staffId, role: 'staff' });
    if (!staff || String(staff.hotel) !== String(room.hotel)) return res.status(400).json({ message: 'Staff member not found in this hotel' });
    room.assignedStaff = staff._id;
  } else {
    room.assignedStaff = undefined;
  }
  await room.save();
  res.json({ room });
});
