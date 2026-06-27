const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const withdrawalModel = require("../models/withdrawalModel");

<<<<<<< HEAD
// Create Payment Intent (supports card or UPI)
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, paymentMethod = "card" } = req.body; // 'card' or 'upi'
=======
// Create Payment Intent for adding coins
const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body; // amount in INR (1 Zcoin = ₹1)
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

<<<<<<< HEAD
    // Map frontend method to Stripe payment_method_types
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // paise
      currency: "inr",
      payment_method_types: paymentMethodTypes,
=======
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // in paise (convert to smallest currency unit)
      currency: "inr",
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
      metadata: {
        userId: req.user._id.toString(),
        type: "add_coins",
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
<<<<<<< HEAD
      paymentIntentId: paymentIntent.id,
=======
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error("Stripe payment intent error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

<<<<<<< HEAD
// Confirm payment and add coins (called after PaymentSheet success)
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res
        .status(400)
        .json({ success: false, message: "Payment intent ID required" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 1. Verify status
    if (paymentIntent.status !== "succeeded") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not successful" });
    }

    // 2. Verify ownership (prevent users from using another's paymentIntentId)
    const userIdFromMetadata = paymentIntent.metadata.userId;
    if (userIdFromMetadata !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized payment" });
    }

    const amount = paymentIntent.amount / 100; // back to rupees
    const user = await userModel.findById(req.user._id);
=======
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
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

<<<<<<< HEAD
    // 3. Add coins
    user.coins += amount;
    await user.save();

    // 4. Record transaction (system credits user)
=======
    // Add coins
    user.coins += amount;
    await user.save();

    // Record transaction
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
    const transaction = new transactionModel({
      from: null, // system
      to: user._id,
      amount,
      type: "credit",
<<<<<<< HEAD
      description: `Stripe payment (${paymentIntent.id})`,
=======
      description: "Stripe payment",
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
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

<<<<<<< HEAD
// Create a withdrawal request (approval pending)
=======
// Create payout (withdrawal) – using Stripe Transfers
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
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

<<<<<<< HEAD
    // Deduct coins immediately (or hold them – adjust as needed)
=======
    // For Stripe, we need a destination (connected account or external account)
    // For simplicity, we'll just deduct coins and create a withdrawal record.
    // In a real scenario, you would use Stripe Connect to transfer funds to a connected account.
    // Or use Stripe Payouts to send to a bank account/UPI if you have a platform account.
    // Since we don't have a connected account setup, we'll simulate a successful payout.

    // Deduct coins
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
    user.coins -= amount;
    await user.save();

    // Create withdrawal record with 'pending' status (admin will process)
    const withdrawal = new withdrawalModel({
      user: req.user._id,
      amount,
      paymentMethod,
      paymentDetails,
<<<<<<< HEAD
      status: "pending", // admin will approve and actually send money
      adminNote: "Awaiting approval",
=======
      status: "approved",
      adminNote: "Stripe payout",
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
    });
    await withdrawal.save();

    // (Optional) Use Stripe Payouts or Connect here if you have a connected account
    // For now, we only record the request.

    res.status(201).json({
      success: true,
<<<<<<< HEAD
      message: `Withdrawal request for ${amount} coins submitted`,
=======
      message: `Withdrawal of ${amount} coins processed successfully`,
>>>>>>> ffe08a0dbfd4fb4a808ea89e87658a2bfe325ba1
      withdrawal,
      newBalance: user.coins,
    });
  } catch (error) {
    console.error("Stripe payout error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPaymentIntent, confirmPayment, createPayout };
