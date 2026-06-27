const express = require("express");
const {
  getMyWithdrawals,
  getAllWithdrawals,
  updateWithdrawalStatus,
} = require("../controllers/withdrawalController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User's own withdrawals
router.get("/my", getMyWithdrawals);

// All withdrawals (accessible to any authenticated user)
router.get("/all", getAllWithdrawals);

// Update withdrawal status (any authenticated user)
router.put("/:id", updateWithdrawalStatus);

module.exports = router;
