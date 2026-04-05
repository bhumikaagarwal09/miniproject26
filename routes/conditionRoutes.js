const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Condition = require('../models/Condition');

// ─────────────────────────────────────────────────────────────
// @route   GET /api/conditions
// @desc    Get all conditions for the logged-in user
//          Supports optional ?status= filter, e.g. ?status=PENDING
// @access  Private
// ─────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = { user: req.user.id };

    // Optional status filter from query string
    const { status } = req.query;
    const VALID_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'];
    if (status) {
      const upperStatus = status.toUpperCase();
      if (!VALID_STATUSES.includes(upperStatus)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      filter.status = upperStatus;
    }

    const conditions = await Condition.find(filter).sort({ createdAt: -1 });
    res.json(conditions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// @route   GET /api/conditions/:id
// @desc    Get a single condition by ID (must belong to user)
// @access  Private
// ─────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const condition = await Condition.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!condition) return res.status(404).json({ message: 'Condition not found' });
    res.json(condition);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// @route   POST /api/conditions
// @desc    Create a new trading condition
// @body    { symbol, buyPrice, targetProfitPercent, maxDays }
// @access  Private
// ─────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { symbol, buyPrice, targetProfitPercent, maxDays } = req.body;

    // ── Validate required fields ─────────────────────────────
    if (!symbol || buyPrice == null || targetProfitPercent == null) {
      return res.status(400).json({
        message: 'symbol, buyPrice, and targetProfitPercent are required',
      });
    }

    if (buyPrice <= 0) {
      return res.status(400).json({ message: 'buyPrice must be a positive number' });
    }

    if (targetProfitPercent <= 0) {
      return res.status(400).json({
        message: 'targetProfitPercent must be a positive number',
      });
    }

    // ── Compute the sell target for use in the AI prompt ─────
    const targetSellPrice = parseFloat(
      (buyPrice * (1 + targetProfitPercent / 100)).toFixed(4)
    );

    // ── Create the condition document ─────────────────────────
    const condition = await Condition.create({
      user: req.user.id,
      symbol: symbol.toUpperCase().trim(),
      buyPrice,
      targetProfitPercent,
      maxDays: maxDays || 30,
      status: 'PENDING',
    });

    res.status(201).json(condition);
  } catch (error) {
    // Handle Mongoose validation errors cleanly
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('; ') });
    }
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// @route   PUT /api/conditions/:id
// @desc    Update a condition's trading parameters
//          Allowed edits: buyPrice, targetProfitPercent, maxDays
//          Status transitions handled separately by monitor job
// @access  Private
// ─────────────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    // Whitelist the fields clients are allowed to update
    const { buyPrice, targetProfitPercent, maxDays } = req.body;
    const allowedUpdates = {};

    if (buyPrice != null) allowedUpdates.buyPrice = buyPrice;
    if (targetProfitPercent != null) allowedUpdates.targetProfitPercent = targetProfitPercent;
    if (maxDays != null) allowedUpdates.maxDays = maxDays;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        message: 'Provide at least one of: buyPrice, targetProfitPercent, maxDays',
      });
    }

    const condition = await Condition.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!condition) return res.status(404).json({ message: 'Condition not found' });
    res.json(condition);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('; ') });
    }
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// @route   PATCH /api/conditions/:id/cancel
// @desc    Cancel a condition (sets status to CANCELLED)
// @access  Private
// ─────────────────────────────────────────────────────────────
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const condition = await Condition.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, status: { $in: ['PENDING', 'ACTIVE'] } },
      { status: 'CANCELLED' },
      { new: true }
    );
    if (!condition) {
      return res.status(404).json({
        message: 'Condition not found or already completed/expired',
      });
    }
    res.json({ message: 'Condition cancelled', condition });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// @route   DELETE /api/conditions/:id
// @desc    Permanently delete a condition
// @access  Private
// ─────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const condition = await Condition.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!condition) return res.status(404).json({ message: 'Condition not found' });
    res.json({ message: 'Condition deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
