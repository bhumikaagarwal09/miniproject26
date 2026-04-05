const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStockPrice, getMultiplePrices, clearCache } = require('../services/stockService');
const Watchlist = require('../models/Watchlist');

// @route   GET /api/stocks/watchlist/prices
// @desc    Get live prices for all stocks in watchlist
// @access  Private
router.get('/watchlist/prices', protect, async (req, res) => {
  try {
    const watchlist = await Watchlist.find({ user: req.user.id });
    const symbols = watchlist.map((w) => w.symbol);
    if (!symbols.length) return res.json([]);
    const prices = await getMultiplePrices(symbols);
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/stocks/watchlist
// @desc    Add stock to watchlist
// @access  Private
router.post('/watchlist', protect, async (req, res) => {
  try {
    const { symbol, companyName } = req.body;
    const entry = await Watchlist.create({
      user: req.user.id,
      symbol: symbol.toUpperCase(),
      companyName,
    });
    res.status(201).json(entry);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Stock already in watchlist' });
    }
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/stocks/watchlist/:symbol
// @desc    Remove stock from watchlist
// @access  Private
router.delete('/watchlist/:symbol', protect, async (req, res) => {
  try {
    await Watchlist.findOneAndDelete({
      user: req.user.id,
      symbol: req.params.symbol.toUpperCase(),
    });
    res.json({ message: 'Removed from watchlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/stocks/cache/:symbol
// @desc    Clear cache for a symbol (testing only)
// @access  Private
router.delete('/cache/:symbol', protect, async (req, res) => {
  try {
    const cleared = await clearCache(req.params.symbol);
    res.json({
      success: cleared,
      message: cleared
        ? `Cache cleared for ${req.params.symbol.toUpperCase()}`
        : `No cache found for ${req.params.symbol.toUpperCase()}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/stocks/price/:symbol
// @desc    Get live price for a single stock
// @access  Private
router.get('/price/:symbol', protect, async (req, res) => {
  try {
    const data = await getStockPrice(req.params.symbol.toUpperCase());
    if (!data) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;