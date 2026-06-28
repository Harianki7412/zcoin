const express = require("express");
const {
  getBalance,
  getTransactionHistory,
} = require("../controllers/coinController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/balance", getBalance);
router.get("/transactions", getTransactionHistory);

module.exports = router;
