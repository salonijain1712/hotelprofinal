const AdminLog = require('../models/AdminLog');

// Activity logging & auditing. req.user may be undefined (e.g. failed logins).
module.exports = (req, action, entity, details = {}) =>
  AdminLog.create({ user: req.user && req.user._id, action, entity, details, ip: req.ip }).catch((e) =>
    console.error('log failed:', e.message)
  );
