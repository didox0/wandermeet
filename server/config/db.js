
const mongoose = require('mongoose');
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);


const connectDB = async () => {
  try {
    // This reads the MONGO_URI from your .env file
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected: The Library is Open! 🧭');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    // Do not exit the process in development; allow the server to run without DB
    // so features like the AI endpoint can be tested locally.
    return;
  }
};

module.exports = connectDB;