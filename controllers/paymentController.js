const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const withdrawalModel = require("../models/withdrawalModel");

// Create Payment Intent for adding coins
const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body; // amount in INR (1 Zcoin = ₹1)
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // in paise (convert to smallest currency unit)
      currency: "inr",
      metadata: {
        userId: req.user._id.toString(),
        type: "add_coins",
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error("Stripe payment intent error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm payment and add coins
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not successful" });
    }

    const amount = paymentIntent.amount / 100; // convert back to rupees
    const userId = paymentIntent.metadata.userId;

    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Add coins
    user.coins += amount;
    await user.save();

    // Record transaction
    const transaction = new transactionModel({
      from: user._id,
      to: user._id,
      amount,
      type: "credit",
      description: "Stripe payment",
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Added ${amount} coins to your account`,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Stripe confirm payment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create payout (withdrawal) – using Stripe Transfers
const createPayout = async (req, res) => {
  try {
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

    // For Stripe, we need a destination (connected account or external account)
    // For simplicity, we'll just deduct coins and create a withdrawal record.
    // In a real scenario, you would use Stripe Connect to transfer funds to a connected account.
    // Or use Stripe Payouts to send to a bank account/UPI if you have a platform account.
    // Since we don't have a connected account setup, we'll simulate a successful payout.

    // Deduct coins
    user.coins -= amount;
    await user.save();

    const withdrawal = new withdrawalModel({
      user: req.user._id,
      amount,
      paymentMethod,
      paymentDetails,
      status: "approved",
      adminNote: "Stripe payout",
    });
    await withdrawal.save();

    res.status(201).json({
      success: true,
      message: `Withdrawal of ${amount} coins processed successfully`,
      withdrawal,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Stripe payout error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPaymentIntent, confirmPayment, createPayout };
