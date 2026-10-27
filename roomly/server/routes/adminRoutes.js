const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/users', authorize('admin', 'manager'), c.listUsers);
router.post('/users', authorize('admin'), c.createUser);
router.put('/users/:id', authorize('admin'), c.updateUser);
router.delete('/users/:id', authorize('admin'), c.deactivateUser);
router.get('/logs', authorize('admin'), c.logs);
router.get('/config', authorize('admin'), c.getConfig);
router.put('/config', authorize('admin'), c.setConfig);

module.exports = router;
