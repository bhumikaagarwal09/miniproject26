require('dotenv').config();
const mongoose = require('mongoose');
const Condition = require('./models/Condition');
const Alert = require('./models/Alert');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const recent = await Condition.find().sort({ createdAt: -1 }).limit(3);
  console.log('\n📋 Recent conditions:');
  recent.forEach(c => {
    console.log(`  Symbol: ${c.symbol}`);
    console.log(`  Status: ${c.status}`);
    console.log(`  aiNote: ${c.aiNote || '(empty)'}`);
    console.log(`  Created: ${c.createdAt}`);
    console.log('  ---');
  });

  const alerts = await Alert.find().sort({ createdAt: -1 }).limit(3);
  console.log('\n🔔 Recent alerts:');
  alerts.forEach(a => {
    console.log(`  ${a.symbol} | ${a.alertType} | emailSent: ${a.emailSent} | ${a.createdAt}`);
  });

  process.exit(0);
});
