const router = require('express').Router();
const c = require('../controllers/roomController');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

const staffUp = authorize('staff', 'manager', 'admin');
const mgr = authorize('manager', 'admin');

router.get('/', c.list);
router.get('/manage/list', protect, staffUp, c.manageList);
router.get('/:id', c.get);
router.get('/:id/availability', c.availability);

router.post('/', protect, mgr, c.create);
router.put('/:id', protect, mgr, c.update);
router.delete('/:id', protect, mgr, c.remove);
router.put('/:id/pricing', protect, mgr, c.setPricing);
router.post('/:id/images', protect, mgr, upload.array('images', 6), c.uploadImages);
router.patch('/:id/assign', protect, mgr, c.assignStaff);

module.exports = router;
