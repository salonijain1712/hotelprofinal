const round = (n) => Math.round(n * 100) / 100;

// Nightly price with seasonal multipliers (checkIn inclusive, checkOut exclusive)
exports.calcPrice = (room, checkIn, checkOut, taxRate = 0) => {
  let subtotal = 0;
  let nights = 0;
  for (const d = new Date(checkIn); d < checkOut; d.setUTCDate(d.getUTCDate() + 1)) {
    let rate = room.price;
    for (const s of room.seasonalPricing || []) {
      if (d >= s.startDate && d <= s.endDate) {
        rate = room.price * s.multiplier;
        break;
      }
    }
    subtotal += rate;
    nights++;
  }
  subtotal = round(subtotal);
  const tax = round(subtotal * Number(taxRate));
  return { nights, subtotal, tax, total: round(subtotal + tax) };
};
