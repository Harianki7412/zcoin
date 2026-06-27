const express = require("express");
const {
  createPaymentIntent,
  confirmPayment,
  createPayout,
} = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Add coins via Stripe
router.post("/create-payment-intent", createPaymentIntent);
router.post("/confirm-payment", confirmPayment);

// Withdraw coins
router.post("/payout", createPayout);

module.exports = router;
