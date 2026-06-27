const express = require("express");
const {
  getMyWithdrawals,
  getAllWithdrawals,
  updateWithdrawalStatus,
} = require("../controllers/withdrawalController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/my", getMyWithdrawals);
router.get("/all", getAllWithdrawals);
router.put("/:id", updateWithdrawalStatus);

module.exports = router;
