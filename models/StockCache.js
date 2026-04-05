const mongoose = require('mongoose');

/**
 * StockCache Model
 *
 * Stores the most-recently fetched price data for each symbol.
 * Acts as a short-term cache so that:
 *   1. Rapid API calls don't hammer Yahoo Finance and trigger rate limits.
 *   2. The price-monitor cron job has a reliable source even during brief outages.
 *
 * Strategy:
 *   - Upsert on symbol (findOneAndUpdate with upsert: true).
 *   - MongoDB TTL index auto-expires documents after `CACHE_TTL_SECONDS`.
 *
 * Usage example:
 *   await StockCache.findOneAndUpdate(
 *     { symbol: 'RELIANCE.NS' },
 *     { price: 2500, previousClose: 2480, currency: 'INR',
 *       exchange: 'NSI', fetchedAt: new Date() },
 *     { upsert: true, new: true }
 *   );
 */

const CACHE_TTL_SECONDS = 300; // 5 minutes — tune as needed

const stockCacheSchema = new mongoose.Schema(
  {
    // ── Symbol (primary key for cache lookup) ─────────────────
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,   // one document per symbol
    },

    // ── Price Data ────────────────────────────────────────────
    price: {
      type: Number,
      required: true,
    },

    previousClose: {
      type: Number,
    },

    currency: {
      type: String,
    },

    exchange: {
      type: String,
    },

    // ── Metadata ──────────────────────────────────────────────
    /**
     * fetchedAt drives the TTL index.
     * MongoDB will automatically delete the document
     * CACHE_TTL_SECONDS after this timestamp.
     */
    fetchedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    /**
     * Number of times this cache entry has been served
     * (incremented on every cache hit — useful for diagnostics).
     */
    hitCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false, // fetchedAt is sufficient; skip createdAt/updatedAt
  }
);

// ── TTL Index ─────────────────────────────────────────────────
// MongoDB Background process removes documents automatically
// after CACHE_TTL_SECONDS from `fetchedAt`.
stockCacheSchema.index(
  { fetchedAt: 1 },
  { expireAfterSeconds: CACHE_TTL_SECONDS, name: 'cache_ttl' }
);

module.exports = mongoose.model('StockCache', stockCacheSchema);
