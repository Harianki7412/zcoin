const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const withdrawalModel = require("../models/withdrawalModel");

// ✅ CREATE PAYMENT INTENT – supports card & UPI
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, paymentMethod = "card" } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Determine allowed payment method types
    let paymentMethodTypes = [];
    if (paymentMethod === "upi") {
      paymentMethodTypes = ["upi"];
    } else {
      paymentMethodTypes = ["card"];
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "inr",
      payment_method_types: paymentMethodTypes,
      metadata: {
        userId: req.user._id.toString(),
        type: "add_coins",
      },
      // Optional: enable UPI mandate if required later
    });

    console.log("✅ PaymentIntent created:", paymentIntent.id);

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("❌ Stripe createPaymentIntent error:", error);
    // Send a more user‑friendly message
    let message = "Failed to create payment intent.";
    if (error.type === "StripeAuthenticationError") {
      message = "Invalid Stripe API key. Please check your configuration.";
    } else if (error.message) {
      message = error.message;
    }
    res.status(500).json({ success: false, message });
  }
};

// ✅ CONFIRM PAYMENT – add coins after successful payment
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: "Payment intent ID required" });
    }

    // Retrieve the PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("PaymentIntent status:", paymentIntent.status);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Current status: ${paymentIntent.status}`,
      });
    }

    // Verify ownership
    const userId = paymentIntent.metadata.userId;
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized payment" });
    }

    // Idempotency: prevent duplicate coin additions
    const existing = await transactionModel.findOne({
      description: {paymentIntent.id},
      type: "credit",
    });
    if (existing) {
      console.warn("⚠️ Duplicate payment detected for", paymentIntent.id);
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
        newBalance: req.user.coins,
      });
    }

    const amount = paymentIntent.amount / 100;
    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Add coins
    user.coins += amount;
    await user.save();

    // Record transaction
    const transaction = new transactionModel({
      from: null,
      to: user._id,
      amount,
      type: "credit",
      description: {paymentIntent.id},
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Added ${amount} coins to your account`,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("❌ Stripe confirmPayment error:", error);
    res.status(500).json({ success: false, message: error.message || "Payment confirmation failed" });
  }
};

// ✅ CREATE PAYOUT – withdrawal request
const createPayout = async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount required" });
    }
    if (!paymentMethod || !paymentDetails) {
      return res.status(400).json({ success: false, message: "Payment details required" });
    }

    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.coins < amount) {
      return res.status(400).json({ success: false, message: "Insufficient coins" });
    }

    user.coins -= amount;
    await user.save();

    const withdrawal = new withdrawalModel({
      user: req.user._id,
      amount,
      paymentMethod,
      paymentDetails,
      status: "pending",
      adminNote: "Awaiting approval",
    });
    await withdrawal.save();

    const transaction = new transactionModel({
      from: user._id,
      to: null,
      amount,
      type: "debit",
      description: {withdrawal._id},
    });
    await transaction.save();

    res.status(201).json({
      success: true,
      message: `Withdrawal request for ${amount} coins submitted`,
      withdrawal,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    res.status(500).json({ success: false, message: error.message || "Withdrawal failed" });
  }
};

module.exports = { createPaymentIntent, confirmPayment, createPayout };
