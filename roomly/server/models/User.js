const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: String,
    avatar: String,
    // Guests and staff are both stored here; the role distinguishes them.
    role: { type: String, enum: ['guest', 'staff', 'manager', 'admin'], default: 'guest' },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }, // for staff / manager
    position: String, // e.g. Receptionist, Housekeeping
    isVerified: { type: Boolean, default: false },
    verifyToken: { type: String, select: false },
    active: { type: Boolean, default: true },
    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.verifyToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, hotel: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
