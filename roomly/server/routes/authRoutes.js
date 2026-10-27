const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().toLowerCase().isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid phone number'),
  ],
  validate,
  c.register
);
router.post(
  '/login',
  [body('email').trim().toLowerCase().isEmail().withMessage('A valid email is required'), body('password').notEmpty().withMessage('Password is required')],
  validate,
  c.login
);
router.get('/verify/:token', c.verifyEmail);
router.get('/me', protect, c.me);
router.put('/me', protect, [body('name').optional().trim().notEmpty(), body('phone').optional({ checkFalsy: true }).isMobilePhone('any')], validate, c.updateProfile);
router.put('/password', protect, [body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')], validate, c.changePassword);
router.post('/resend-verification', protect, c.resendVerification);

module.exports = router;
