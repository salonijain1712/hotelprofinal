const router = require('express').Router();
const c = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('staff', 'manager', 'admin'));

router.get('/overview', c.overview);
router.post('/checkin/:bookingId', c.checkIn);
router.post('/checkout/:bookingId', c.checkOut);
router.patch('/rooms/:id/status', c.setRoomStatus);
router.get('/housekeeping', c.housekeeping);

module.exports = router;
