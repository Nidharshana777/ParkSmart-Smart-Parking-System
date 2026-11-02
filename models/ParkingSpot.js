const mongoose = require('mongoose');

const parkingSpotSchema = new mongoose.Schema({
  spotNumber: { type: String, required: true, unique: true },
  floor: { type: String, default: 'Ground Floor' },
  section: { type: String, default: 'A' },
  vehicleType: { type: String, enum: ['2W', '4W', 'EV'], required: true },
  status: { type: String, enum: ['available', 'booked', 'occupied'], default: 'available' },
  pricePerHour: { type: Number, required: true },
  coordinates: {
    row: { type: Number, default: 1 },
    column: { type: Number, default: 1 }
  }
}, { timestamps: true });

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);
