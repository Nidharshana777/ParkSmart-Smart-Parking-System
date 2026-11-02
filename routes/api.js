const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const ParkingSpot = require('../models/ParkingSpot');
const Booking = require('../models/Booking');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smart-parking-secret-change-this';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Please log in first' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function createToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Health check
router.get('/health', (req, res) => {
  res.json({ message: 'Smart Parking API is running' });
});

// Register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must contain at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });

    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone
    });

    res.status(201).json({
      message: 'Registration successful',
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Current user
router.get('/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add vehicle
router.post('/vehicles', authenticate, async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, vehicleName } = req.body;

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({ message: 'Vehicle number and type are required' });
    }

    const vehicle = await Vehicle.create({
      user: req.user.id,
      vehicleNumber,
      vehicleType,
      vehicleName
    });

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// List my vehicles
router.get('/vehicles', authenticate, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user.id });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete my vehicle
router.delete('/vehicles/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get parking spots and create demo spots if database is empty
router.get('/spots', async (req, res) => {
  try {
    let spots = await ParkingSpot.find().sort({ spotNumber: 1 });

    if (spots.length === 0) {
      const demoSpots = [];

      for (let i = 1; i <= 12; i++) {
        demoSpots.push({
          spotNumber: `A${String(i).padStart(2, '0')}`,
          floor: i <= 6 ? 'Ground Floor' : 'First Floor',
          section: i <= 6 ? 'A' : 'B',
          vehicleType: i % 4 === 0 ? 'EV' : i % 2 === 0 ? '4W' : '2W',
          pricePerHour: i % 4 === 0 ? 30 : i % 2 === 0 ? 20 : 10,
          coordinates: { row: Math.ceil(i / 4), column: ((i - 1) % 4) + 1 }
        });
      }

      await ParkingSpot.insertMany(demoSpots);
      spots = await ParkingSpot.find().sort({ spotNumber: 1 });
    }

    res.json(spots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a parking spot
router.post('/spots', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const spot = await ParkingSpot.create(req.body);
    res.status(201).json(spot);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create booking
router.post('/bookings', authenticate, async (req, res) => {
  try {
    const { vehicleId, spotId, startTime, endTime } = req.body;

    if (!vehicleId || !spotId || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide vehicle, slot and booking times' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Invalid booking time' });
    }

    if (start < new Date(Date.now() - 60000)) {
      return res.status(400).json({ message: 'Booking start time cannot be in the past' });
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: req.user.id });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const spot = await ParkingSpot.findById(spotId);
    if (!spot) return res.status(404).json({ message: 'Parking spot not found' });

    if (spot.vehicleType !== vehicle.vehicleType) {
      return res.status(400).json({ message: 'This slot does not support your vehicle type' });
    }

    const conflict = await Booking.findOne({
      parkingSpot: spotId,
      status: { $in: ['confirmed', 'active'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (conflict) {
      return res.status(409).json({ message: 'This slot is already booked for that time' });
    }

    const hours = Math.ceil((end - start) / 3600000);
    const estimatedFee = hours * spot.pricePerHour;
    const bookingCode = `SP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const booking = await Booking.create({
      user: req.user.id,
      vehicle: vehicleId,
      parkingSpot: spotId,
      bookingCode,
      startTime: start,
      endTime: end,
      estimatedFee,
      findMyVehicle: {
        floor: spot.floor,
        section: spot.section,
        spotNumber: spot.spotNumber
      }
    });

    booking.qrCode = await QRCode.toDataURL(bookingCode);
    await booking.save();

    res.status(201).json({
      message: 'Booking confirmed',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// My bookings
router.get('/bookings', authenticate, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('vehicle')
      .populate('parkingSpot')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel booking
router.patch('/bookings/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!['confirmed', 'active'].includes(booking.status)) {
      return res.status(400).json({ message: 'This booking cannot be cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// QR entry verification
router.post('/bookings/verify', authenticate, async (req, res) => {
  try {
    const { bookingCode } = req.body;
    const booking = await Booking.findOne({ bookingCode });

    if (!booking) return res.status(404).json({ message: 'Invalid QR booking code' });

    if (!['confirmed', 'active'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking is not active' });
    }

    booking.status = 'active';
    booking.entryVerified = true;
    await booking.save();

    res.json({ message: 'QR verified. Entry allowed!', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Find my vehicle
router.get('/bookings/:id/vehicle-location', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('vehicle');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    res.json({
      vehicle: booking.vehicle,
      location: booking.findMyVehicle,
      bookingCode: booking.bookingCode
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Simulated payment
router.post('/bookings/:id/pay', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled bookings cannot be paid' });
    }

    booking.paymentStatus = 'paid';
    booking.actualFee = booking.estimatedFee;
    await booking.save();

    res.json({
      message: 'Demo payment successful',
      receipt: {
        bookingCode: booking.bookingCode,
        amount: booking.actualFee,
        paymentStatus: booking.paymentStatus,
        date: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin dashboard statistics
router.get('/admin/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [users, vehicles, spots, bookings, paidBookings] = await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments(),
      ParkingSpot.countDocuments(),
      Booking.countDocuments(),
      Booking.find({ paymentStatus: 'paid' })
    ]);

    const availableSpots = await ParkingSpot.countDocuments({ status: 'available' });
    const revenue = paidBookings.reduce((sum, booking) => sum + booking.actualFee, 0);

    res.json({
      totalUsers: users,
      totalVehicles: vehicles,
      totalSpots: spots,
      availableSpots,
      totalBookings: bookings,
      revenue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
