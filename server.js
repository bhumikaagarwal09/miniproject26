require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');  // ← ADD THIS

// Passport config
require('./config/passport');

// Route imports
const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');
const conditionRoutes = require('./routes/conditionRoutes');
const alertRoutes = require('./routes/alertRoutes');

// Cron job
const { startPriceMonitor } = require('./jobs/priceMonitor');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'algo_session_secret',
  resave: false,
  saveUninitialized: false,
}));

// ← ADD THESE 2 LINES
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/conditions', conditionRoutes);
app.use('/api/alerts', alertRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: 'Algo Trading Backend is running 🚀' }));

// ── Database + Server Start ───────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      startPriceMonitor();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
