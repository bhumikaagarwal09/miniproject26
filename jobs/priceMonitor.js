// jobs/priceMonitor.js
const cron = require('node-cron');
const Condition = require('../models/Condition');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { getStockPrice } = require('../services/stockService');
const { getAIDecision, getDropAnalysis, getPortfolioCommentary } = require('../services/geminiService');
const { sendSellAlertEmail, sendDropAlertEmail, sendDailySummaryEmail } = require('../services/emailService');

// ═══════════════════════════════════════════
// Helper: Delay to avoid Gemini 429 rate limit
// ═══════════════════════════════════════════
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ═══════════════════════════════════════════
// PRICE MONITOR — Every 5 minutes
// ═══════════════════════════════════════════
const startPriceMonitor = () => {

  cron.schedule('*/2 * * * *', async () => {
    const startTime = Date.now();
    console.log(`\n[Monitor] ⏱  Cron fired at ${new Date().toISOString()}`);

    try {
      // ─── Fetch all PENDING + ACTIVE conditions ───
      const conditions = await Condition.find({
        status: { $in: ['PENDING', 'ACTIVE'] },
      }).populate('user', 'email name');

      if (conditions.length === 0) {
        console.log('[Monitor] 📭 No PENDING/ACTIVE conditions. Sleeping...');
        return;
      }

      console.log(`[Monitor] 📋 Evaluating ${conditions.length} condition(s)…`);

      // ─── Fetch prices for unique symbols (uses StockCache) ───
      const symbols = [...new Set(conditions.map((c) => c.symbol))];
      const priceMap = {};

      for (const symbol of symbols) {
        try {
          const data = await getStockPrice(symbol);
          priceMap[symbol] = data.price;
          console.log(`[Monitor] 💰 ${symbol} → ₹${data.price} (cache: ${data.fromCache})`);
        } catch (err) {
          console.error(`[Monitor] ❌ Price fetch failed for ${symbol}:`, err.message);
        }
      }

      // ─── Process each condition ───
      for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        const currentPrice = priceMap[condition.symbol];

        if (!currentPrice) {
          console.log(`[Monitor] ⚠️  No price for ${condition.symbol}, skipping`);
          continue;
        }

        const userEmail = condition.user?.email;
        const userName = condition.user?.name || 'Trader';

        // Update last checked price
        condition.lastCheckedPrice = currentPrice;

        // ═══════════════════════════════════════════
        // STEP 1: PENDING → ACTIVE (only when price hits buyPrice)
        // ═══════════════════════════════════════════
        if (condition.status === 'PENDING') {
          if (currentPrice >= condition.buyPrice) {
            condition.status = 'ACTIVE';
            condition.activatedAt = new Date();
            console.log(`[Monitor] 🟢 ${condition.symbol}: PENDING → ACTIVE (buyPrice: ₹${condition.buyPrice} hit at ₹${currentPrice})`);
            // Don't save yet — continue to evaluate in same cycle
          } else {
            console.log(`[Monitor] ⏳ ${condition.symbol}: PENDING — waiting for price ₹${currentPrice} to reach buyPrice ₹${condition.buyPrice}`);
            await condition.save(); // save lastCheckedPrice update
            continue;
          }
        }

        // ═══════════════════════════════════════════
        // STEP 2: Check EXPIRY
        // ═══════════════════════════════════════════
        if (condition.status === 'ACTIVE') {
          const activatedAt = condition.activatedAt || condition.createdAt;
          const daysHeld = Math.floor(
            (Date.now() - new Date(activatedAt).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysHeld >= condition.maxDays) {
            condition.status = 'EXPIRED';
            condition.expiredAt = new Date();
            condition.aiNote = `Expired after ${daysHeld} days. Last price: ₹${currentPrice}`;
            await condition.save();
            console.log(`[Monitor] ⏰ ${condition.symbol}: EXPIRED after ${daysHeld}/${condition.maxDays} days`);
            continue;
          }

          // ═══════════════════════════════════════════
          // STEP 3: Calculate profit & target
          // ═══════════════════════════════════════════
          const targetSellPrice = condition.buyPrice * (1 + condition.targetProfitPercent / 100);
          const profitPercent = (((currentPrice - condition.buyPrice) / condition.buyPrice) * 100).toFixed(2);

          console.log(
            `[Monitor] 📈 ${condition.symbol}: Buy ₹${condition.buyPrice} | ` +
            `Current ₹${currentPrice} | Target ₹${targetSellPrice.toFixed(2)} | P&L ${profitPercent}%`
          );

          // ═══════════════════════════════════════════
          // STEP 4: SELL CHECK — price >= target
          // ═══════════════════════════════════════════
          if (currentPrice >= targetSellPrice) {
            console.log(`[Monitor] 🎯 ${condition.symbol}: Target reached! Asking AI...`);

            // Delay before Gemini call to avoid 429
            await delay(3000);

            const aiResult = await getAIDecision({
              symbol: condition.symbol,
              buyPrice: condition.buyPrice,
              currentPrice,
              targetSellPrice: targetSellPrice.toFixed(2),
              profitPercent,
              daysHeld,
              maxDays: condition.maxDays,
            });

            if (aiResult.decision === 'SELL') {
              // Update condition → COMPLETED
              condition.status = 'COMPLETED';
              condition.completedAt = new Date();
              condition.aiNote = `${aiResult.decision}: ${aiResult.reasoning} (Confidence: ${aiResult.confidence}%)`;

              // Save alert to DB
              const alert = await Alert.create({
                user: condition.user._id,
                condition: condition._id,
                symbol: condition.symbol,
                alertType: 'SELL',
                triggerPrice: currentPrice,
                profitPercent: parseFloat(profitPercent),
                aiNote: condition.aiNote,
                emailSent: false,
              });

              console.log(`[Alert] 💾 SELL alert saved — ${condition.symbol} @ ₹${currentPrice}`);

              // Send SELL email
              if (userEmail) {
                const emailResult = await sendSellAlertEmail({
                  to: userEmail,
                  symbol: condition.symbol,
                  buyPrice: condition.buyPrice,
                  currentPrice,
                  targetSellPrice: targetSellPrice.toFixed(2),
                  profitPercent,
                  aiNote: aiResult.reasoning,
                });

                alert.emailSent = emailResult.success;
                alert.sentAt = emailResult.success ? new Date() : null;
                await alert.save();

                console.log(`[Email] ${emailResult.success ? '✅' : '❌'} SELL email → ${userEmail}`);
              }

              console.log(`[Monitor] ✅ ${condition.symbol}: COMPLETED — Profit: ${profitPercent}%`);
            } else {
              // AI says HOLD
              condition.aiNote = `HOLD: ${aiResult.reasoning} (Confidence: ${aiResult.confidence}%)`;
              console.log(`[Monitor] ✋ ${condition.symbol}: AI says HOLD — ${aiResult.reasoning}`);
            }
          }

          // ═══════════════════════════════════════════
          // STEP 5: DROP CHECK — 3% below buyPrice
          // ═══════════════════════════════════════════
          if (currentPrice < condition.buyPrice && condition.status === 'ACTIVE') {
            const dropPercent = (((condition.buyPrice - currentPrice) / condition.buyPrice) * 100).toFixed(2);

            if (parseFloat(dropPercent) >= 3 && !condition.dropAlertSent) {
              console.log(`[Monitor] 🔴 ${condition.symbol}: Dropped ${dropPercent}% below buyPrice!`);

              // Delay before Gemini call
              await delay(3000);

              const dropAnalysis = await getDropAnalysis({
                symbol: condition.symbol,
                buyPrice: condition.buyPrice,
                currentPrice,
                dropPercent,
              });

              // Save DROP alert
              const dropAlert = await Alert.create({
                user: condition.user._id,
                condition: condition._id,
                symbol: condition.symbol,
                alertType: 'DROP',
                triggerPrice: currentPrice,
                profitPercent: parseFloat(-dropPercent),
                aiNote: dropAnalysis,
                emailSent: false,
              });

              console.log(`[Alert] 💾 DROP alert saved — ${condition.symbol} @ ₹${currentPrice}`);

              // Send DROP email
              if (userEmail) {
                const emailResult = await sendDropAlertEmail({
                  to: userEmail,
                  symbol: condition.symbol,
                  buyPrice: condition.buyPrice,
                  currentPrice,
                  dropPercent,
                  aiNote: dropAnalysis,
                });

                dropAlert.emailSent = emailResult.success;
                dropAlert.sentAt = emailResult.success ? new Date() : null;
                await dropAlert.save();

                console.log(`[Email] ${emailResult.success ? '✅' : '❌'} DROP email → ${userEmail}`);
              }

              condition.dropAlertSent = true;
              console.log(`[Monitor] ✅ ${condition.symbol}: DROP alert complete`);
            }
          } else if (currentPrice >= condition.buyPrice && condition.dropAlertSent) {
            // Bug #3 fix: reset drop alert guard once price recovers above buyPrice
            condition.dropAlertSent = false;
            console.log(`[Monitor] 🔄 ${condition.symbol}: Price recovered above buyPrice — drop alert reset`);
          }
        }

        // Save all condition updates
        await condition.save();

        // ─── Delay between conditions to avoid Gemini 429 ───
        if (i < conditions.length - 1) {
          await delay(3000);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Monitor] ✅ Cycle complete in ${elapsed}ms\n`);
    } catch (error) {
      console.error('[Monitor] ❌ Cron error:', error.message);
    }
  });

  console.log('[Monitor] 🚀 Price monitor started — running every 2 minutes.');

  // ═══════════════════════════════════════════
  // DAILY SUMMARY — 8:00 AM every day
  // ═══════════════════════════════════════════
  cron.schedule('0 8 * * *', async () => {
    console.log(`\n[Daily] 📊 Daily summary triggered at ${new Date().toISOString()}`);

    try {
      const activeConditions = await Condition.find({
        status: 'ACTIVE',
      }).populate('user', 'email name');

      if (activeConditions.length === 0) {
        console.log('[Daily] 📭 No active conditions for summary');
        return;
      }

      // Group conditions by user
      const userMap = {};
      activeConditions.forEach((c) => {
        const uid = c.user._id.toString();
        if (!userMap[uid]) {
          userMap[uid] = {
            email: c.user.email,
            name: c.user.name,
            conditions: [],
          };
        }
        userMap[uid].conditions.push(c);
      });

      // Send summary to each user
      for (const userId of Object.keys(userMap)) {
        const { email, name, conditions } = userMap[userId];

        // Delay before Gemini call
        await delay(3000);

        const aiCommentary = await getPortfolioCommentary(conditions);

        const emailResult = await sendDailySummaryEmail({
          to: email,
          conditions,
          aiCommentary,
        });

        console.log(
          `[Daily] ${emailResult.success ? '✅' : '❌'} Summary → ${email} (${conditions.length} conditions)`
        );
      }

      console.log('[Daily] ✅ All summaries sent\n');
    } catch (error) {
      console.error('[Daily] ❌ Summary error:', error.message);
    }
  });

  console.log('[Daily] 📅 Daily summary job scheduled — fires at 08:00 AM every day.');
};

module.exports = { startPriceMonitor };