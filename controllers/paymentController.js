const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const withdrawalModel = require("../models/withdrawalModel");

// Create Payment Intent (supports card or UPI)
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, paymentMethod = "card" } = req.body;
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    // Determine allowed payment method types
    let paymentMethodTypes;
    switch (paymentMethod) {
      case "upi":
        paymentMethodTypes = ["upi"];
        break;
      case "card":
      default:
        paymentMethodTypes = ["card"];
        break;
    }

    // Create PaymentIntent with the selected types
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // paise
      currency: "inr",
      payment_method_types: paymentMethodTypes,
      metadata: {
        userId: req.user._id.toString(),
        type: "add_coins",
      },
      // Optional: set up future usage if you plan to save UPI ID
      // setup_future_usage: paymentMethod === 'upi' ? 'off_session' : undefined,
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error("Stripe payment intent error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Confirm payment and add coins (called after PaymentSheet success)
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res
        .status(400)
        .json({ success: false, message: "Payment intent ID required" });
    }

    // Retrieve the PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 1. Verify status
    if (paymentIntent.status !== "succeeded") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not successful" });
    }

    // 2. Verify ownership – prevent users from using another user's payment
    const userIdFromMetadata = paymentIntent.metadata.userId;
    if (userIdFromMetadata !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized payment" });
    }

    const amount = paymentIntent.amount / 100; // back to rupees
    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 3. Add coins
    user.coins += amount;
    await user.save();

    // 4. Record transaction (system credits user)
    const transaction = new transactionModel({
      from: null, // system
      to: user._id,
      amount,
      type: "credit",
      description: `Stripe payment (${paymentIntent.id}) via ${paymentIntent.payment_method_types[0]}`,
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

// Create a withdrawal request (pending admin approval)
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

    // Deduct coins immediately
    user.coins -= amount;
    await user.save();

    // Create withdrawal record with 'pending' status
    const withdrawal = new withdrawalModel({
      user: req.user._id,
      amount,
      paymentMethod,
      paymentDetails,
      status: "pending",
      adminNote: "Awaiting approval",
    });
    await withdrawal.save();

    // (Optional) Trigger actual Stripe payout if you have a connected account
    // For now, we only record the request.

    res.status(201).json({
      success: true,
      message: `Withdrawal request for ${amount} coins submitted`,
      withdrawal,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Stripe payout error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPaymentIntent, confirmPayment, createPayout };
