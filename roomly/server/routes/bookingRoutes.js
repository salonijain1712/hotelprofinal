const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const staffUp = authorize('staff', 'manager', 'admin');

router.use(protect);

router.post('/quote', [body('room').isMongoId().withMessage('Invalid room')], validate, c.quote);
router.post(
  '/',
  authorize('guest'),
  [body('room').isMongoId().withMessage('Invalid room'), body('guests').optional().isInt({ min: 1, max: 20 }).withMessage('Invalid number of guests'), body('specialRequests').optional().isLength({ max: 500 })],
  validate,
  c.create
);
router.get('/my', c.my);
router.get('/', staffUp, c.listAll);
router.get('/:id', c.getOne);
router.get('/:id/invoice', c.invoice);
router.put('/:id/modify', c.modify);
router.patch('/:id/cancel', c.cancel);
router.patch('/:id/approve', staffUp, c.approve);

module.exports = router;
