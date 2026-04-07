require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  try {
    console.log('Testing Groq with key:', process.env.GROQ_API_KEY?.slice(0, 15) + '...');
    const r = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Say hello in one word.' }],
      max_tokens: 10,
    });
    console.log('✅ GROQ WORKS:', r.choices[0].message.content);
  } catch (e) {
    console.error('❌ GROQ ERROR:', e.message);
  }
  process.exit(0);
}

test();
