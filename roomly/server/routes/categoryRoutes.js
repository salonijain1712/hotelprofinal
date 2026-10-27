const router = require('express').Router();
const RoomCategory = require('../models/RoomCategory');
const Room = require('../models/Room');
const asyncHandler = require('../utils/asyncHandler');
const logAction = require('../utils/logAction');
const { protect, authorize } = require('../middleware/auth');

router.get('/', asyncHandler(async (req, res) => res.json({ categories: await RoomCategory.find().sort({ basePrice: 1 }) })));

router.post('/', protect, authorize('manager', 'admin'), asyncHandler(async (req, res) => {
  const category = await RoomCategory.create(req.body);
  logAction(req, 'CATEGORY_CREATED', 'RoomCategory', { id: category._id });
  res.status(201).json({ category });
}));

router.put('/:id', protect, authorize('manager', 'admin'), asyncHandler(async (req, res) => {
  const category = await RoomCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ category });
}));

router.delete('/:id', protect, authorize('manager', 'admin'), asyncHandler(async (req, res) => {
  if (await Room.exists({ category: req.params.id })) return res.status(400).json({ message: 'Category is in use by rooms' });
  await RoomCategory.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted' });
}));

module.exports = router;
