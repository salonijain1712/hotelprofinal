require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Hotel = require('./models/Hotel');
const RoomCategory = require('./models/RoomCategory');
const Room = require('./models/Room');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Review = require('./models/Review');
const Notification = require('./models/Notification');
const ServiceRequest = require('./models/ServiceRequest');
const CheckInOut = require('./models/CheckInOut');
const AdminLog = require('./models/AdminLog');
const Report = require('./models/Report');
const Config = require('./models/Config');

(async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed (wipe) a production database.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/roomly');
  await Promise.all([User, Hotel, RoomCategory, Room, Booking, Payment, Review, Notification, ServiceRequest, CheckInOut, AdminLog, Report, Config].map((m) => m.deleteMany({})));

  const hotel = await Hotel.create({
    name: 'Roomly Grand Indore',
    description: 'A modern city hotel with warm hospitality, rooftop dining and a business centre.',
    address: { street: '12 Palasia Square', city: 'Indore', state: 'Madhya Pradesh', country: 'India', zip: '452001' },
    contact: { phone: '+91 731 000 0000', email: 'hello@roomly.test' },
    amenities: ['Free Wi-Fi', 'Breakfast', 'Pool', 'Gym', 'Parking'],
  });

  const cats = await RoomCategory.insertMany([
    { name: 'Standard', description: 'Comfortable room with essentials', basePrice: 2500, capacity: 2, amenities: ['Wi-Fi', 'AC', 'TV'] },
    { name: 'Deluxe', description: 'Spacious room with city view', basePrice: 4200, capacity: 3, amenities: ['Wi-Fi', 'AC', 'TV', 'Mini bar'] },
    { name: 'Suite', description: 'Premium suite with lounge area', basePrice: 8000, capacity: 4, amenities: ['Wi-Fi', 'AC', 'TV', 'Mini bar', 'Bathtub', 'Lounge'] },
  ]);

  const pw = 'Password@123';
  const [admin, manager, staff, guest] = await Promise.all([
    User.create({ name: 'Admin User', email: 'admin@roomly.test', password: pw, role: 'admin', isVerified: true }),
    User.create({ name: 'Maya Manager', email: 'manager@roomly.test', password: pw, role: 'manager', hotel: hotel._id, isVerified: true, position: 'General Manager' }),
    User.create({ name: 'Sam Staff', email: 'staff@roomly.test', password: pw, role: 'staff', hotel: hotel._id, isVerified: true, position: 'Front Desk' }),
    User.create({ name: 'Gina Guest', email: 'guest@roomly.test', password: pw, role: 'guest', isVerified: true, phone: '+919999999999' }),
  ]);
  hotel.manager = manager._id;
  await hotel.save();

  const rooms = [];
  for (let floor = 1; floor <= 4; floor++) {
    for (let n = 1; n <= 3; n++) {
      const cat = cats[(floor + n) % 3];
      rooms.push({ hotel: hotel._id, category: cat._id, roomNumber: `${floor}0${n}`, floor, price: cat.basePrice, capacity: cat.capacity, amenities: cat.amenities, description: `${cat.name} room on floor ${floor}.`, assignedStaff: staff._id });
    }
  }
  await Room.insertMany(rooms);
  await Config.create([{ key: 'taxRate', value: 0.12 }, { key: 'cancellationHours', value: 24 }]);

  console.log('\nSeed complete. Demo accounts (password: %s):', pw);
  [admin, manager, staff, guest].forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}`));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
