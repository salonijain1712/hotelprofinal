const router = require('express').Router();
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { paginate } = require('../utils/helpers');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req, 20);
  const filter = { user: req.user._id };
  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  res.json({ notifications, total, unread, page, pages: Math.ceil(total / limit) });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json({ notification: n });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ message: 'Deleted' });
}));

module.exports = router;
