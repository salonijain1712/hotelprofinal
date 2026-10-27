const router = require('express').Router();
const c = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.post('/intent', authorize('guest'), c.createIntent);
router.post('/confirm', authorize('guest'), c.confirm);
router.get('/', authorize('manager', 'admin'), c.list);
router.patch('/:bookingId/refund', authorize('manager', 'admin'), c.refund);

module.exports = router;
