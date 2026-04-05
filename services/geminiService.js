// services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ═══════════════════════════════════════════
// gemini-2.0-flash (1.5-flash-latest is DEPRECATED)
// ═══════════════════════════════════════════
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Helper: delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: retry with backoff
const callGeminiWithRetry = async (prompt, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const waitTime = attempt * 2000;
        console.log(`[AI] ⏳ Retry ${attempt}/${maxRetries} — waiting ${waitTime / 1000}s...`);
        await delay(waitTime);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      const status = error?.status || error?.httpStatusCode;
      if (status === 429 || error?.message?.includes('429')) {
        console.warn(`[AI] ⚠️ Rate limited (attempt ${attempt}/${maxRetries})`);
        if (attempt === maxRetries) throw new Error('Gemini rate limit exceeded after retries');
        await delay(15000); // Wait 15 seconds on rate limit
      } else {
        throw error;
      }
    }
  }
};

// ═══════════════════════════════════════════
// AI Decision: SELL or HOLD
// ═══════════════════════════════════════════
const getAIDecision = async ({ symbol, buyPrice, currentPrice, targetSellPrice, profitPercent, daysHeld, maxDays }) => {
  try {
    const prompt = `You are a stock trading AI assistant. Analyze this trade and give a decision.

Stock: ${symbol}
Buy Price: ₹${buyPrice}
Current Price: ₹${currentPrice}
Target Sell Price: ₹${targetSellPrice}
Current Profit: ${profitPercent}%
Days Held: ${daysHeld} / ${maxDays} max days

Rules:
1. If current price >= target sell price, recommend SELL
2. If current price is very close to target (within 0.2%), recommend SELL
3. If days remaining are very few and price is near target, recommend SELL
4. Otherwise recommend HOLD

Respond in this exact JSON format only (no markdown, no code blocks):
{"decision": "SELL" or "HOLD", "confidence": 0-100, "reasoning": "brief 1-2 sentence explanation"}`;

    const text = await callGeminiWithRetry(prompt);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    console.log(`[AI] ✅ ${symbol}: ${parsed.decision} (${parsed.confidence}% confidence)`);
    return parsed;
  } catch (error) {
    console.error(`[AI] ❌ Decision error for ${symbol}:`, error.message);
    const fallback = currentPrice >= targetSellPrice ? 'SELL' : 'HOLD';
    return {
      decision: fallback,
      confidence: 70,
      reasoning: `AI unavailable — fallback: price ${currentPrice >= targetSellPrice ? 'exceeded' : 'below'} target.`,
    };
  }
};

// ═══════════════════════════════════════════
// AI Drop Analysis
// ═══════════════════════════════════════════
const getDropAnalysis = async ({ symbol, buyPrice, currentPrice, dropPercent }) => {
  try {
    const prompt = `You are a stock trading AI. A stock has dropped significantly.

Stock: ${symbol}
Buy Price: ₹${buyPrice}
Current Price: ₹${currentPrice}
Drop: ${dropPercent}%

Provide a brief analysis (2-3 sentences) on whether to hold, average down, or cut losses.
Respond in plain text only, no JSON, no markdown.`;

    const text = await callGeminiWithRetry(prompt);
    console.log(`[AI] ✅ Drop analysis for ${symbol} generated`);
    return text;
  } catch (error) {
    console.error(`[AI] ❌ Drop analysis error for ${symbol}:`, error.message);
    return `Price dropped ${dropPercent}% below buy price. Review your position and consider your risk tolerance.`;
  }
};

// ═══════════════════════════════════════════
// AI Portfolio Commentary (Daily Summary)
// ═══════════════════════════════════════════
const getPortfolioCommentary = async (conditions) => {
  try {
    const portfolio = conditions.map((c) => {
      const pnl = c.lastCheckedPrice
        ? (((c.lastCheckedPrice - c.buyPrice) / c.buyPrice) * 100).toFixed(2)
        : 'N/A';
      return `${c.symbol}: Buy ₹${c.buyPrice}, Current ₹${c.lastCheckedPrice || 'N/A'}, P&L ${pnl}%, Status ${c.status}`;
    }).join('\n');

    const prompt = `You are a portfolio analyst AI. Here is today's portfolio snapshot:

${portfolio}

Provide a brief portfolio commentary (3-4 sentences). Mention overall performance, stocks needing attention, and general outlook.
Respond in plain text only, no JSON, no markdown.`;

    const text = await callGeminiWithRetry(prompt);
    console.log(`[AI] ✅ Portfolio commentary generated`);
    return text;
  } catch (error) {
    console.error(`[AI] ❌ Portfolio commentary error:`, error.message);
    return `Portfolio has ${conditions.length} active condition(s). Review each position based on current market conditions.`;
  }
};

module.exports = {
  getAIDecision,
  getDropAnalysis,
  getPortfolioCommentary,
};