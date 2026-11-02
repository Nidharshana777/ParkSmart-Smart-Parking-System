const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
  vehicleType: { type: String, enum: ['2W', '4W', 'EV'], required: true },
  vehicleName: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
