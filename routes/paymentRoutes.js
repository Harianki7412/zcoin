const express = require("express");
const {
  createPaymentIntent,
  confirmPayment,
  createPayout,
} = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/create-payment-intent", createPaymentIntent);
router.post("/confirm-payment", confirmPayment);
router.post("/payout", createPayout);

module.exports = router;
