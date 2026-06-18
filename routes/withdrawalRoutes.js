const express = require("express");
const { getMyWithdrawals } = require("../controllers/withdrawalController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/my", getMyWithdrawals);

module.exports = router;
