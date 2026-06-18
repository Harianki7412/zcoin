const Razorpay = require("razorpay");
const crypto = require("crypto");
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const withdrawalModel = require("../models/withdrawalModel");

// Initialize Razorpay with validation
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log("✅ Razorpay initialized successfully");
} catch (error) {
  console.error("❌ Razorpay initialization failed:", error.message);
}

// Create Razorpay order for adding coins
const createOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Razorpay not initialized. Check API keys.",
      });
    }

    const { amount } = req.body; // amount in INR (1 Zcoin = ₹1)
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    console.log("Creating order for amount:", amount);
    console.log("Using Key ID:", process.env.RAZORPAY_KEY_ID);

    const options = {
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    console.log("Order created:", order.id);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order error:", {
      statusCode: error.statusCode,
      error: error.error,
      message: error.message,
    });
    res.status(500).json({
      success: false,
      message:
        error.error?.description || error.message || "Failed to create order",
    });
  }
};

// Verify payment signature and add coins
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const user = await userModel.findById(req.user._id);
    const coinsToAdd = amount / 100;
    user.coins += coinsToAdd;
    await user.save();

    const transaction = new transactionModel({
      from: user._id,
      to: user._id,
      amount: coinsToAdd,
      type: "credit",
      description: "Razorpay payment",
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Added ${coinsToAdd} coins to your account`,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create payout for withdrawal (auto-approve)
const createPayout = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Razorpay not initialized. Check API keys.",
      });
    }

    const { amount, paymentMethod, paymentDetails } = req.body;
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid amount required" });
    }
    if (!paymentMethod || !paymentDetails) {
      return res
        .status(400)
        .json({ success: false, message: "Payment details required" });
    }

    const user = await userModel.findById(req.user._id);
    if (user.coins < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient coins" });
    }

    // Prepare recipient
    let recipient = {};
    if (paymentMethod === "UPI") {
      recipient = {
        type: "vpa",
        vpa: paymentDetails.upiId,
      };
    } else if (paymentMethod === "Bank") {
      recipient = {
        type: "bank_account",
        bank_account: {
          account_number: paymentDetails.bankAccount,
          ifsc: paymentDetails.ifsc,
          name: paymentDetails.accountHolder,
        },
      };
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method" });
    }

    // Check if payouts are enabled
    if (!razorpay.payouts) {
      return res.status(500).json({
        success: false,
        message: "Razorpay payouts not enabled. Check your account.",
      });
    }

    const payoutData = {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account: recipient,
      amount: amount * 100,
      currency: "INR",
      mode: "IMPS",
      reference_id: `withdraw_${Date.now()}`,
      narration: "Zcoin withdrawal",
    };

    console.log("Creating payout:", payoutData);
    const payout = await razorpay.payouts.create(payoutData);

    user.coins -= amount;
    await user.save();

    const withdrawal = new withdrawalModel({
      user: req.user._id,
      amount,
      paymentMethod,
      paymentDetails,
      status: "approved",
      adminNote: "Razorpay payout",
    });
    await withdrawal.save();

    res.status(201).json({
      success: true,
      message: `Withdrawal of ${amount} coins processed successfully`,
      payout,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Payout error:", {
      statusCode: error.statusCode,
      error: error.error,
      message: error.message,
    });
    res.status(500).json({
      success: false,
      message:
        error.error?.description || error.message || "Failed to process payout",
    });
  }
};

module.exports = { createOrder, verifyPayment, createPayout };
