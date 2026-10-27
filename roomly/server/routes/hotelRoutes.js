const router = require('express').Router();
const c = require('../controllers/hotelController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', protect, authorize('admin'), c.create);
router.put('/:id', protect, authorize('admin', 'manager'), c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;
