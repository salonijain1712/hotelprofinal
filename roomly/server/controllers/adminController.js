const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const Config = require('../models/Config');
const asyncHandler = require('../utils/asyncHandler');
const logAction = require('../utils/logAction');
const { paginate, escapeRegex } = require('../utils/helpers');

const bad = (res, msg, code = 400) => res.status(code).json({ message: msg });
const ROLES = ['guest', 'staff', 'manager', 'admin'];

// Admin: all users. Manager: staff of their own hotel only.
exports.listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req, 15);
  const filter = {};
  if (req.user.role === 'manager') {
    filter.role = 'staff';
    filter.hotel = req.user.hotel || null;
  } else if (req.query.role) {
    filter.role = req.query.role;
  }
  if (req.query.hotel && req.user.role === 'admin') filter.hotel = req.query.hotel;
  if (req.query.q) {
    const re = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).populate('hotel', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'staff', hotel, phone, position } = req.body;
  if (!name || !email || !password || password.length < 8) return bad(res, 'Name, email and a password of 8+ characters are required');
  if (!ROLES.includes(role)) return bad(res, 'Invalid role');
  if (['staff', 'manager'].includes(role) && !hotel) return bad(res, 'Staff and managers must be assigned to a hotel');
  if (await User.exists({ email: email.toLowerCase() })) return bad(res, 'Email already registered', 409);
  const user = await User.create({ name, email, password, role, hotel, phone, position, isVerified: true });
  logAction(req, 'USER_CREATED', 'User', { id: user._id, role });
  res.status(201).json({ user });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return bad(res, 'User not found', 404);
  const { name, phone, role, hotel, active, position } = req.body;
  if (String(user._id) === String(req.user._id) && (active === false || (role && role !== 'admin')))
    return bad(res, 'You cannot disable or demote your own account');
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (position !== undefined) user.position = position;
  if (role !== undefined) {
    if (!ROLES.includes(role)) return bad(res, 'Invalid role');
    user.role = role;
  }
  if (hotel !== undefined) user.hotel = hotel || undefined;
  if (active !== undefined) user.active = !!active;
  await user.save();
  logAction(req, 'USER_UPDATED', 'User', { id: user._id, role: user.role, active: user.active });
  res.json({ user });
});

// Soft delete: the account is disabled so history is preserved
exports.deactivateUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return bad(res, 'You cannot disable your own account');
  const user = await User.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!user) return bad(res, 'User not found', 404);
  logAction(req, 'USER_DEACTIVATED', 'User', { id: user._id });
  res.json({ user });
});

// Security monitoring / audit trail
exports.logs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req, 25);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  const [logs, total] = await Promise.all([
    AdminLog.find(filter).populate('user', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdminLog.countDocuments(filter),
  ]);
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const failedLogins24h = await AdminLog.countDocuments({ action: 'LOGIN_FAILED', createdAt: { $gte: since } });
  res.json({ logs, total, page, pages: Math.ceil(total / limit), failedLogins24h });
});

const ALLOWED_CONFIG = ['taxRate', 'cancellationHours'];

exports.getConfig = asyncHandler(async (req, res) => {
  const items = await Config.find();
  const config = {};
  items.forEach((i) => (config[i.key] = i.value));
  res.json({ config });
});

exports.setConfig = asyncHandler(async (req, res) => {
  const updates = {};
  for (const key of ALLOWED_CONFIG) if (req.body[key] !== undefined && req.body[key] !== '') updates[key] = Number(req.body[key]);
  if (updates.taxRate !== undefined && (isNaN(updates.taxRate) || updates.taxRate < 0 || updates.taxRate > 1)) return bad(res, 'taxRate must be between 0 and 1 (e.g. 0.12)');
  if (updates.cancellationHours !== undefined && (isNaN(updates.cancellationHours) || updates.cancellationHours < 0)) return bad(res, 'cancellationHours must be 0 or more');
  await Promise.all(Object.entries(updates).map(([key, value]) => Config.findOneAndUpdate({ key }, { value }, { upsert: true })));
  logAction(req, 'CONFIG_UPDATED', 'Config', updates);
  res.json({ message: 'Configuration saved', config: updates });
});
