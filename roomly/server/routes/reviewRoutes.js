const router = require('express').Router();
const { body } = require('express-validator');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const asyncHandler = require('../utils/asyncHandler');
const logAction = require('../utils/logAction');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const refreshHotelRating = async (hotelId) => {
  const [r] = await Review.aggregate([{ $match: { hotel: hotelId } }, { $group: { _id: '$hotel', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Hotel.findByIdAndUpdate(hotelId, { ratingAvg: r ? Math.round(r.avg * 10) / 10 : 0, ratingCount: r ? r.n : 0 });
};

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.hotel) filter.hotel = req.query.hotel;
  if (req.query.room) filter.room = req.query.room;
  const reviews = await Review.find(filter).populate('user', 'name').sort({ createdAt: -1 }).limit(50);
  res.json({ reviews });
}));

router.post(
  '/',
  protect,
  authorize('guest'),
  [body('booking').isMongoId(), body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'), body('comment').optional().isLength({ max: 1000 })],
  validate,
  asyncHandler(async (req, res) => {
    const b = await Booking.findOne({ _id: req.body.booking, guest: req.user._id });
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    if (b.status !== 'checked-out') return res.status(400).json({ message: 'You can review a stay after check-out' });
    if (await Review.exists({ booking: b._id })) return res.status(409).json({ message: 'You already reviewed this stay' });
    const review = await Review.create({ user: req.user._id, hotel: b.hotel, room: b.room, booking: b._id, rating: req.body.rating, comment: req.body.comment });
    await refreshHotelRating(b.hotel);
    res.status(201).json({ review });
  })
);

router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ message: 'Review not found' });
  await refreshHotelRating(r.hotel);
  logAction(req, 'REVIEW_DELETED', 'Review', { id: r._id });
  res.json({ message: 'Review deleted' });
}));

module.exports = router;
