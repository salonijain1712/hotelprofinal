const router = require('express').Router();
const c = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('manager', 'admin'));

router.get('/summary', c.summary);
router.get('/revenue', c.revenue);
router.get('/occupancy', c.occupancy);
router.get('/', c.list);
router.post('/', c.generate);

module.exports = router;
