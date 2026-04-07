const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Initialize both APIs ──────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Helper — JSON extract karo response se ────────────────────
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[0]);
}

// ── Groq se decision lo ───────────────────────────────────────
async function analyzeWithGroq(symbol, buyPrice, currentPrice, targetProfitPercent, maxDays, targetSellPrice, profitPercent) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'user',
      content: `You are an expert stock trading analyst. Make a SELL or HOLD decision.

      Stock Symbol     : ${symbol}
      Buy Price        : ₹${buyPrice}
      Current Price    : ₹${currentPrice}
      Target Sell Price: ₹${targetSellPrice} (${targetProfitPercent}% target profit)
      Current P&L      : ${profitPercent}% profit
      Max Holding Days : ${maxDays}

      RULE: If Current Price >= Target Sell Price, you MUST recommend SELL.
      Current price ₹${currentPrice} is ${parseFloat(profitPercent) >= 0 ? 'above' : 'below'} buy price by ${Math.abs(profitPercent)}%.

      Reply ONLY in this exact JSON format, no extra text:
      {
        "action": "SELL" or "HOLD",
        "reason": "one clear sentence explaining why",
        "confidence": "HIGH" or "MEDIUM" or "LOW",
        "riskLevel": "HIGH" or "MEDIUM" or "LOW"
      }`
    }],
    temperature: 0.3,
    max_tokens: 200,
  });

  const text = completion.choices[0].message.content;
  return extractJSON(text);
}

// ── Gemini se decision lo ─────────────────────────────────────
async function analyzeWithGemini(symbol, buyPrice, currentPrice, targetProfitPercent, maxDays, targetSellPrice, profitPercent) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  const prompt = `You are an expert stock trading analyst. Make a SELL or HOLD decision.

  Stock Symbol     : ${symbol}
  Buy Price        : ₹${buyPrice}
  Current Price    : ₹${currentPrice}
  Target Sell Price: ₹${targetSellPrice} (${targetProfitPercent}% target profit)
  Current P&L      : ${profitPercent}% profit
  Max Holding Days : ${maxDays}

  RULE: If Current Price >= Target Sell Price, you MUST recommend SELL.

  Reply ONLY in this exact JSON format, no extra text:
  {
    "action": "SELL" or "HOLD",
    "reason": "one clear sentence explaining why",
    "confidence": "HIGH" or "MEDIUM" or "LOW",
    "riskLevel": "HIGH" or "MEDIUM" or "LOW"
  }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return extractJSON(text);
}

// ── Main Function — Groq first, Gemini fallback ───────────────
async function analyzeStock(symbol, buyPrice, currentPrice, targetProfitPercent, maxDays, targetSellPrice, profitPercent) {
  // Try 1 — Groq (fast + no rate limit)
  try {
    const decision = await analyzeWithGroq(
      symbol, buyPrice, currentPrice, targetProfitPercent, maxDays, targetSellPrice, profitPercent
    );
    console.log(`[AI] ✅ Groq decision for ${symbol}:`, decision.action);
    return decision;
  } catch (groqError) {
    console.warn(`[AI] ⚠️ Groq failed for ${symbol}: ${groqError.message}`);
  }

  // Try 2 — Gemini fallback
  try {
    const decision = await analyzeWithGemini(
      symbol, buyPrice, currentPrice, targetProfitPercent, maxDays, targetSellPrice, profitPercent
    );
    console.log(`[AI] ✅ Gemini fallback for ${symbol}:`, decision.action);
    return decision;
  } catch (geminiError) {
    console.warn(`[AI] ⚠️ Gemini failed for ${symbol}: ${geminiError.message}`);
  }

  // Try 3 — Rule based fallback
  console.log(`[AI] ⚠️ Both AI failed — using rule-based for ${symbol}`);
  const fallbackAction = parseFloat(currentPrice) >= parseFloat(targetSellPrice) ? 'SELL' : 'HOLD';
  return {
    action: fallbackAction,
    reason: `AI unavailable — price ${fallbackAction === 'SELL' ? 'exceeded' : 'below'} target.`,
    confidence: 'LOW',
    riskLevel: 'MEDIUM',
  };
}

// ── Market Summary — Groq first, Gemini fallback ──────────────
async function getMarketSummary(symbol, currentPrice) {
  const prompt = `Stock ${symbol} is currently trading at ${currentPrice}. 
  Give a brief 1-2 sentence market commentary. Be factual and concise.`;

  // Try Groq first
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });
    return completion.choices[0].message.content;
  } catch (_) { }

  // Try Gemini fallback
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (_) { }

  // Final fallback
  return `${symbol} is currently trading at ${currentPrice}.`;
}

module.exports = { analyzeStock, getMarketSummary };