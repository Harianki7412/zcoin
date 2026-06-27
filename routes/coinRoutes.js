const express = require("express");
const {
  getBalance,
  getTransactionHistory,
  transferCoins,
  addCoins,
} = require("../controllers/coinController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get("/balance", getBalance);
router.get("/transactions", getTransactionHistory);
router.post("/transfer", transferCoins);
router.post("/add", addCoins); // any authenticated user can add coins to any user

module.exports = router;
