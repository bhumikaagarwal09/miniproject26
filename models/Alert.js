const mongoose = require('mongoose');

/**
 * Alert Model — persists every alert fired by the price monitor.
 *
 * alertType values:
 *  BUY     - condition activated (price hit buyPrice)
 *  SELL    - target sell price reached (profit alert)
 *  EXPIRED - condition expired without hitting target
 *  DROP    - price dropped 3%+ below buyPrice (danger alert)
 */
const alertSchema = new mongoose.Schema(
  {
    // ── Ownership ──────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Related Condition ──────────────────────────────────────
    condition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Condition',
    },

    // ── Stock Identifier ───────────────────────────────────────
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // ── Alert Classification ───────────────────────────────────
    alertType: {
      type: String,
      enum: ['BUY', 'SELL', 'EXPIRED', 'DROP'],
      required: true,
    },

    // ── Price at Trigger ───────────────────────────────────────
    triggerPrice: {
      type: Number,
      required: true,
    },

    // ── Profit/Loss percent at time of alert (SELL / DROP) ─────
    profitPercent: {
      type: Number, // positive = profit, negative = loss
      default: null,
    },

    // ── Gemini AI Commentary ───────────────────────────────────
    aiNote: {
      type: String,
      default: null,
    },

    // ── Email Delivery ─────────────────────────────────────────
    emailSent: {
      type: Boolean,
      default: false,
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true } // createdAt, updatedAt
);

// ── Compound index: fast lookup per user + symbol ──────────────
alertSchema.index({ user: 1, symbol: 1 });
alertSchema.index({ user: 1, alertType: 1 });

module.exports = mongoose.model('Alert', alertSchema);
