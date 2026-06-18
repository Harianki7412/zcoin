const express = require("express");
const {
  createOrder,
  verifyPayment,
  createPayout,
} = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.post("/payout", createPayout);

module.exports = router;
