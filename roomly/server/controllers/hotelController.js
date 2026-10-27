const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const asyncHandler = require('../utils/asyncHandler');
const logAction = require('../utils/logAction');
const { canAccessHotel } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  const filter = { active: true };
  if (req.query.city) filter['address.city'] = new RegExp('^' + req.query.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  res.json({ hotels: await Hotel.find(filter).sort({ name: 1 }) });
});

exports.get = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
  res.json({ hotel });
});

exports.create = asyncHandler(async (req, res) => {
  const hotel = await Hotel.create(req.body);
  logAction(req, 'HOTEL_CREATED', 'Hotel', { id: hotel._id, name: hotel.name });
  res.status(201).json({ hotel });
});

exports.update = asyncHandler(async (req, res) => {
  if (!canAccessHotel(req.user, req.params.id)) return res.status(403).json({ message: 'Not your hotel' });
  const { ratingAvg, ratingCount, ...data } = req.body;
  const hotel = await Hotel.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
  logAction(req, 'HOTEL_UPDATED', 'Hotel', { id: hotel._id });
  res.json({ hotel });
});

exports.remove = asyncHandler(async (req, res) => {
  if (await Room.exists({ hotel: req.params.id })) return res.status(400).json({ message: 'Remove or move this hotel\'s rooms first' });
  const hotel = await Hotel.findByIdAndDelete(req.params.id);
  if (!hotel) return res.status(404).json({ message: 'Hotel not found' });
  logAction(req, 'HOTEL_DELETED', 'Hotel', { id: hotel._id, name: hotel.name });
  res.json({ message: 'Hotel deleted' });
});
