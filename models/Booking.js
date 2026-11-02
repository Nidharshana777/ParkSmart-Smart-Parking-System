const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  parkingSpot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot', required: true },
  bookingCode: { type: String, required: true, unique: true },
  qrCode: { type: String, default: '' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['confirmed', 'active', 'completed', 'cancelled', 'expired'],
    default: 'confirmed'
  },
  estimatedFee: { type: Number, default: 0 },
  actualFee: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  entryVerified: { type: Boolean, default: false },
  findMyVehicle: {
    floor: String,
    section: String,
    spotNumber: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
