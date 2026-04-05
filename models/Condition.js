const mongoose = require('mongoose');

/**
 * Condition Model — represents a user's trading strategy for a single stock.
 *
 * Core trading fields:
 *  - buyPrice          : price at which the user intends to buy
 *  - targetProfitPercent: desired profit % above buyPrice to trigger a sell alert
 *  - maxDays           : maximum days to hold before the condition expires
 *
 * Lifecycle:
 *  PENDING  → waiting for price to hit buyPrice
 *  ACTIVE   → position open, monitoring for targetSellPrice
 *  COMPLETED→ target hit, profit alert sent
 *  EXPIRED  → maxDays elapsed without target being hit
 *  CANCELLED→ manually deactivated by user
 */
const conditionSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Stock Identifier ──────────────────────────────────────
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // ── Core Trading Parameters ───────────────────────────────
    buyPrice: {
      type: Number,
      required: [true, 'Buy price is required'],
      min: [0.01, 'Buy price must be positive'],
    },

    targetProfitPercent: {
      type: Number,
      required: [true, 'Target profit percent is required'],
      min: [0.01, 'Target profit must be at least 0.01%'],
      max: [1000, 'Target profit percent seems unreasonably large'],
    },

    maxDays: {
      type: Number,
      required: [true, 'Max holding days is required'],
      min: [1, 'Must hold for at least 1 day'],
      max: [365, 'Max holding period is 365 days'],
      default: 30,
    },

    // ── Condition Lifecycle ───────────────────────────────────
    /**
     * PENDING  - waiting for current price to reach buyPrice
     * ACTIVE   - buy triggered, monitoring for targetSellPrice
     * COMPLETED- sell target reached, alert sent
     * EXPIRED  - maxDays exceeded without hitting target
     * CANCELLED- user manually deactivated
     */
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
    },

    // ── Tracking Fields (populated by price monitor job) ─────
    activatedAt: {
      type: Date, // when buyPrice was first hit
    },

    completedAt: {
      type: Date, // when targetSellPrice was hit
    },

    expiredAt: {
      type: Date, // when condition exceeded maxDays
    },

    lastCheckedPrice: {
      type: Number, // last price seen by monitor job
    },

    // ── Drop Alert Guard ──────────────────────────────────────
    dropAlertSent: {
      type: Boolean,  // true once a DROP alert email has been sent
      default: false,
    },

    // ── AI Analysis ───────────────────────────────────────────
    aiNote: {
      type: String, // Gemini AI commentary on the strategy
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: computed sell target price ───────────────────────
conditionSchema.virtual('targetSellPrice').get(function () {
  if (this.buyPrice == null || this.targetProfitPercent == null) return null;
  return parseFloat(
    (this.buyPrice * (1 + this.targetProfitPercent / 100)).toFixed(4)
  );
});

// ── Virtual: deadline date (createdAt + maxDays) ──────────────
conditionSchema.virtual('expiresAt').get(function () {
  if (!this.createdAt || this.maxDays == null) return null;
  const d = new Date(this.createdAt);
  d.setDate(d.getDate() + this.maxDays);
  return d;
});

// ── Compound index: fast lookup per user + symbol ─────────────
conditionSchema.index({ user: 1, symbol: 1 });
conditionSchema.index({ status: 1, user: 1 });

module.exports = mongoose.model('Condition', conditionSchema);
