const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Alert = require('../models/Alert');

// ────────────────────────────────────────────────────────────────
// @route   GET /api/alerts
// @desc    Get all alerts for the logged-in user
//          Optional filter: ?alertType=SELL | BUY | EXPIRED | DROP
// @access  Private
// ────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = { user: req.user.id };

    // Optional alertType filter
    if (req.query.alertType) {
      const validTypes = ['BUY', 'SELL', 'EXPIRED', 'DROP'];
      const type = req.query.alertType.toUpperCase();
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: `Invalid alertType. Must be one of: ${validTypes.join(', ')}`,
        });
      }
      filter.alertType = type;
    }

    const alerts = await Alert.find(filter)
      .populate('condition', 'symbol buyPrice targetProfitPercent maxDays status')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('[Alert] GET /api/alerts error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// @route   GET /api/alerts/:id
// @desc    Get a single alert by ID (must belong to logged-in user)
// @access  Private
// ────────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('condition', 'symbol buyPrice targetProfitPercent maxDays status');

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('[Alert] GET /api/alerts/:id error:', error.message);
    // Handle invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid alert ID' });
    }
    res.status(500).json({ message: error.message });
  }
});

// ────────────────────────────────────────────────────────────────
// @route   DELETE /api/alerts/:id
// @desc    Delete an alert log entry (must belong to logged-in user)
// @access  Private
// ────────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found or not authorized' });
    }

    console.log(`[Alert] Deleted alert ${req.params.id} for user ${req.user.id}`);
    res.json({ message: 'Alert deleted successfully', alertId: req.params.id });
  } catch (error) {
    console.error('[Alert] DELETE /api/alerts/:id error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid alert ID' });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
