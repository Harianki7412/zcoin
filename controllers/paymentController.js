const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const withdrawalModel = require("../models/withdrawalModel");

// Create Payment Intent (supports card & UPI)
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, paymentMethod = "card" } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Determine allowed payment method types
    let paymentMethodTypes = ["card"];
    if (paymentMethod === "upi") {
      paymentMethodTypes = ["upi"];
    }

    // UPI requires a mandate and may need additional setup – we'll keep it simple
    // For test mode, UPI works with any UPI ID (use test UPI IDs like 'success@upi' or 'failure@upi')

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // paise
      currency: "inr",
      payment_method_types: paymentMethodTypes,
      metadata: {
        userId: req.user._id.toString(),
        type: "add_coins",
      },
      // For UPI, you can optionally set payment_method_options if needed
      // payment_method_options: {
      //   upi: { mandate_data: { ... } }
      // }
    });

    console.log("PaymentIntent created:", paymentIntent.id);

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe payment intent error:", error);
    // Return a user-friendly error message
    let message = "Failed to create payment intent. Please try again.";
    if (error.type === "StripeAuthenticationError") {
      message = "Stripe authentication failed. Check your API keys.";
    } else if (error.message) {
      message = error.message;
    }
    res.status(500).json({ success: false, message });
  }
};

// Confirm payment – add coins after success
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

    // Check if coins were already added (idempotency)
    const existingTransaction = await transactionModel.findOne({
      description: `Stripe payment (${paymentIntent.id})`,
      type: "credit",
    });
    if (existingTransaction) {
      console.warn("Duplicate payment detected for", paymentIntent.id);
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
        newBalance: req.user.coins,
      });
    }

    const amount = paymentIntent.amount / 100; // convert back to rupees
    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Add coins
    user.coins += amount;
    await user.save();

    // Record transaction
    const transaction = new transactionModel({
      from: null, // system
      to: user._id,
      amount,
      type: "credit",
      description: `Stripe payment (${paymentIntent.id})`,
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Added ${amount} coins to your account`,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ success: false, message: error.message || "Payment confirmation failed" });
  }
};

// Withdrawal – deduct coins and create pending request
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
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.coins < amount) {
      return res.status(400).json({ success: false, message: "Insufficient coins" });
    }

    // Deduct coins immediately
    user.coins -= amount;
    await user.save();

    // Create withdrawal record
    const withdrawal = new withdrawalModel({
      user: req.user._id,
      amount,
      paymentMethod,
      paymentDetails,
      status: "pending",
      adminNote: "Awaiting approval",
    });
    await withdrawal.save();

    // Record debit transaction
    const transaction = new transactionModel({
      from: user._id,
      to: null,
      amount,
      type: "debit",
      description: `Withdrawal request (${withdrawal._id})`,
    });
    await transaction.save();

    res.status(201).json({
      success: true,
      message: `Withdrawal request for ${amount} coins submitted`,
      withdrawal,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    res.status(500).json({ success: false, message: error.message || "Withdrawal failed" });
  }
};

module.exports = { createPaymentIntent, confirmPayment, createPayout };
