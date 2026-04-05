const axios = require('axios');
const StockCache = require('../models/StockCache');

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

// ─────────────────────────────────────────────────────────────────────────────
// Helper — fetch fresh price data from Yahoo Finance
// Returns raw price object or throws on failure
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromYahoo(symbol) {
  const url = `${YAHOO_BASE}/${symbol}?interval=1m&range=1d`;

  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000, // 8 second timeout
  });

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for symbol: ${symbol}`);

  const meta = result.meta;

  return {
    symbol: meta.symbol,
    price: meta.regularMarketPrice,
    previousClose: meta.previousClose,
    currency: meta.currency || 'USD',
    exchange: meta.exchangeName || 'UNKNOWN',
    fetchedAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getStockPrice — cache-aware main function
//
// 1. Check MongoDB StockCache for a fresh entry (< 5 min old)
// 2. If cache hit  → return cached data, increment hitCount
// 3. If cache miss → fetch from Yahoo, upsert cache, return fresh data
// ─────────────────────────────────────────────────────────────────────────────
async function getStockPrice(symbol) {
  const upperSymbol = symbol.toUpperCase().trim();

  try {
    // ── Step 1: Check cache ─────────────────────────────────
    const cached = await StockCache.findOne({ symbol: upperSymbol });

    if (cached) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();

      if (ageMs < CACHE_TTL_MS) {
        // ── Cache HIT — return cached price ─────────────────
        console.log(`[StockCache] HIT  → ${upperSymbol} (age: ${Math.round(ageMs / 1000)}s)`);

        // Increment hit counter (fire and forget)
        StockCache.findOneAndUpdate(
          { symbol: upperSymbol },
          { $inc: { hitCount: 1 } }
        ).exec();

        return {
          symbol: cached.symbol,
          price: cached.price,
          previousClose: cached.previousClose,
          currency: cached.currency,
          exchange: cached.exchange,
          fetchedAt: cached.fetchedAt,
          fromCache: true,   // helpful for debugging
        };
      }

      // Cache exists but EXPIRED — fall through to Yahoo fetch
      console.log(`[StockCache] EXPIRED → ${upperSymbol} — fetching fresh data`);
    } else {
      console.log(`[StockCache] MISS  → ${upperSymbol} — fetching from Yahoo`);
    }

    // ── Step 2: Fetch from Yahoo Finance ───────────────────
    const fresh = await fetchFromYahoo(upperSymbol);

    // ── Step 3: Upsert into cache ──────────────────────────
    await StockCache.findOneAndUpdate(
      { symbol: upperSymbol },
      {
        price: fresh.price,
        previousClose: fresh.previousClose,
        currency: fresh.currency,
        exchange: fresh.exchange,
        fetchedAt: fresh.fetchedAt,
        hitCount: 0, // reset hit count on fresh fetch
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[StockCache] SAVED → ${upperSymbol} @ ${fresh.price}`);

    return { ...fresh, fromCache: false };

  } catch (error) {
    console.error(`[StockService] Error fetching ${upperSymbol}:`, error.message);
    throw error; // re-throw so callers handle it — never return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMultiplePrices — fetch multiple symbols in parallel
// Failed fetches are silently filtered out
// ─────────────────────────────────────────────────────────────────────────────
async function getMultiplePrices(symbols) {
  const results = await Promise.allSettled(
    symbols.map((s) => getStockPrice(s))
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
}

// ─────────────────────────────────────────────────────────────────────────────
// clearCache — manually clear cache for a symbol (useful for testing)
// ─────────────────────────────────────────────────────────────────────────────
async function clearCache(symbol) {
  const result = await StockCache.findOneAndDelete({
    symbol: symbol.toUpperCase().trim(),
  });
  return result !== null;
}

module.exports = { getStockPrice, getMultiplePrices, clearCache };