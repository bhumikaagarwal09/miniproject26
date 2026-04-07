require('dotenv').config();
const mongoose = require('mongoose');
const Condition = require('./models/Condition');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await Condition.deleteMany({ status: 'COMPLETED' });
  console.log(`✅ Deleted ${result.deletedCount} COMPLETED conditions`);

  const remaining = await Condition.countDocuments();
  console.log(`📋 Remaining conditions in DB: ${remaining}`);

  process.exit(0);
});
