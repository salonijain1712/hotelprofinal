const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/email');
const notify = require('../utils/notify');
const logAction = require('../utils/logAction');

const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

const sendVerification = (user, raw) =>
  sendEmail({
    to: user.email,
    subject: 'Verify your Roomly account',
    html: `<p>Hi ${user.name},</p><p>Please verify your email: <a href="${process.env.CLIENT_URL}/verify/${raw}">Verify email</a></p>`,
  });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.exists({ email })) return res.status(409).json({ message: 'Email already registered' });
  const raw = crypto.randomBytes(24).toString('hex');
  const user = await User.create({ name, email, password, phone, verifyToken: sha(raw) });
  sendVerification(user, raw);
  notify(user._id, 'Welcome to Roomly', 'Your account has been created. Please verify your email.', 'general');
  req.user = user;
  logAction(req, 'REGISTER', 'User', { email });
  res.status(201).json({ token: sign(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    req.user = user || undefined;
    logAction(req, 'LOGIN_FAILED', 'User', { email });
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.active) return res.status(403).json({ message: 'This account has been disabled' });
  user.lastLogin = new Date();
  await user.save();
  req.user = user;
  logAction(req, 'LOGIN', 'User');
  res.json({ token: sign(user), user });
});

exports.me = asyncHandler(async (req, res) => res.json({ user: req.user }));

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ user: req.user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) return res.status(400).json({ message: 'Current password is incorrect' });
  user.password = newPassword;
  await user.save();
  logAction(req, 'PASSWORD_CHANGED', 'User');
  res.json({ message: 'Password updated' });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ verifyToken: sha(req.params.token) }).select('+verifyToken');
  if (!user) return res.status(400).json({ message: 'Invalid or expired verification link' });
  user.isVerified = true;
  user.verifyToken = undefined;
  await user.save();
  res.json({ message: 'Email verified successfully' });
});

exports.resendVerification = asyncHandler(async (req, res) => {
  if (req.user.isVerified) return res.json({ message: 'Already verified' });
  const raw = crypto.randomBytes(24).toString('hex');
  req.user.verifyToken = sha(raw);
  await req.user.save();
  sendVerification(req.user, raw);
  res.json({ message: 'Verification email sent' });
});
