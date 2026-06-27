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



app.get("/", (req, res) => {
  res.status(200).send({
    success: true,
    msg: "Node Server Running ",
  });
});


>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1

>>>>>>> ffe08a0 (second update)
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.bgGreen.white);
});
