const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const colors = require("colors");
const morgan = require("morgan");
const connectDB = require("./config/db");

dotenv.config();

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/v1/auth", require("./routes/userRoutes"));
app.use("/api/v1/coins", require("./routes/coinRoutes"));
app.use("/api/v1/withdrawals", require("./routes/withdrawalRoutes"));
app.use("/api/v1/payments", require("./routes/paymentRoutes"));

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.bgGreen.white);
});
