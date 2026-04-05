const mongoose = require('mongoose');
require('dotenv').config();
const Condition = require('./models/Condition');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected");
    const conditions = await Condition.find().sort({ createdAt: -1 });
    console.log("Conditions found:", conditions.length);
    if (conditions.length > 2) {
      const toDelete = conditions.slice(2);
      for (const condition of toDelete) {
        await Condition.findByIdAndDelete(condition._id);
        console.log(`Deleted condition: ${condition.symbol}`);
      }
    } else {
        console.log("No need to delete.");
    }
    process.exit(0);
}).catch(console.error);
