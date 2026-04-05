const mongoose = require('mongoose');
require('dotenv').config({ path: 'e:/Algo_Trading_Backend/.env' });

const Condition = require('e:/Algo_Trading_Backend/models/Condition');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const conditions = await Condition.find().sort({ createdAt: -1 });
    console.log(`Found ${conditions.length} conditions.`);

    if (conditions.length > 2) {
      const toDelete = conditions.slice(2);
      for (const condition of toDelete) {
        await Condition.findByIdAndDelete(condition._id);
        console.log(`Deleted condition: ${condition.symbol} (${condition._id})`);
      }
      console.log(`Kept 2 latest conditions. Removed ${toDelete.length}.`);
    } else {
      console.log('2 or fewer conditions exist. No cleanup needed.');
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

cleanup();
