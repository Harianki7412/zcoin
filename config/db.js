const mongoose = require("mongoose");
const colors = require("colors");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB connected: ${mongoose.connection.host}`.green.bold);
  } catch (error) {
    console.log(`Error connecting to MongoDB: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;