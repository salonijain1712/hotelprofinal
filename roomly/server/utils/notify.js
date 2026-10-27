const Notification = require('../models/Notification');

module.exports = (user, title, message, type = 'general', link) =>
  Notification.create({ user, title, message, type, link }).catch((e) => console.error('notify failed:', e.message));
