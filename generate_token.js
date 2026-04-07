require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

async function generateTestToken() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB...");
  const user = await User.findOne();
  if (!user) {
    console.log("No users found in database!");
    process.exit(1);
  }
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  console.log("\n=================================");
  console.log("✅ HERE IS YOUR VALID TEST TOKEN:");
  console.log("=================================\n");
  console.log(token);
  console.log("\nCopy that string and paste it into Postman's Authorization -> Bearer Token field.");
  process.exit(0);
}

generateTestToken();
