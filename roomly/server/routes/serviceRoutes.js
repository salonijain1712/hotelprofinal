const router = require('express').Router();
const { body } = require('express-validator');
const ServiceRequest = require('../models/ServiceRequest');
const Booking = require('../models/Booking');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');
const { hotelScope } = require('../utils/helpers');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);

// Guest: request a service during a stay
router.post(
  '/',
  authorize('guest'),
  [body('booking').isMongoId(), body('description').trim().notEmpty().isLength({ max: 500 }).withMessage('Please describe your request (max 500 chars)')],
  validate,
  asyncHandler(async (req, res) => {
    const b = await Booking.findOne({ _id: req.body.booking, guest: req.user._id });
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    if (b.status !== 'checked-in') return res.status(400).json({ message: 'Service requests are available while you are checked in' });
    const s = await ServiceRequest.create({ guest: req.user._id, booking: b._id, room: b.room, hotel: b.hotel, type: req.body.type, description: req.body.description });
    const staff = await User.find({ hotel: b.hotel, role: { $in: ['staff', 'manager'] }, active: true }).select('_id');
    staff.forEach((u) => notify(u._id, 'New service request', `${s.type}: ${s.description.slice(0, 80)}`, 'service'));
    res.status(201).json({ service: s });
  })
);

router.get('/my', authorize('guest'), asyncHandler(async (req, res) => {
  const services = await ServiceRequest.find({ guest: req.user._id }).populate('room', 'roomNumber').sort({ createdAt: -1 });
  res.json({ services });
}));

// Staff: all requests for the hotel
router.get('/', authorize('staff', 'manager', 'admin'), asyncHandler(async (req, res) => {
  const filter = hotelScope(req.user, req.query.hotel);
  if (req.query.status) filter.status = req.query.status;
  const services = await ServiceRequest.find(filter)
    .populate('room', 'roomNumber')
    .populate('guest', 'name phone')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ services });
}));

router.patch('/:id', authorize('staff', 'manager', 'admin'), asyncHandler(async (req, res) => {
  const s = await ServiceRequest.findOne({ _id: req.params.id, ...hotelScope(req.user) });
  if (!s) return res.status(404).json({ message: 'Request not found' });
  if (req.body.status) s.status = req.body.status;
  if (req.body.assignedTo !== undefined) s.assignedTo = req.body.assignedTo || undefined;
  await s.save();
  notify(s.guest, 'Service request update', `Your ${s.type} request is now "${s.status}".`, 'service');
  res.json({ service: s });
}));

module.exports = router;
