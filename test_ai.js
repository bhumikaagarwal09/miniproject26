require('dotenv').config();
const { analyzeStock } = require('./services/geminiService');

async function test() {
  console.log('🧪 Testing dual-AI system (Groq → Gemini → Fallback)...\n');
  const result = await analyzeStock('TCS.NS', 1950, 0.5, 7, '1959.75');
  console.log('\n📊 Final result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

test();
