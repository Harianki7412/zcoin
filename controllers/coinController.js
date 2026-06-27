const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");

const getBalance = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .select("coins name email");
    res.status(200).json({
      success: true,
      balance: user.coins,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    const transactions = await transactionModel
      .find({ $or: [{ from: req.user._id }, { to: req.user._id }] })
      .populate("from", "name email")
      .populate("to", "name email")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const transferCoins = async (req, res) => {
  try {
    const { recipientEmail, amount, description } = req.body;
    if (!recipientEmail || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }
    const sender = await userModel.findById(req.user._id);
    const recipient = await userModel.findOne({ email: recipientEmail });
    if (!recipient)
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    if (sender._id.equals(recipient._id))
      return res
        .status(400)
        .json({ success: false, message: "Cannot transfer to self" });
    if (sender.coins < amount)
      return res
        .status(400)
        .json({ success: false, message: "Insufficient coins" });

    sender.coins -= amount;
    recipient.coins += amount;
    await sender.save();
    await recipient.save();

    const transaction = new transactionModel({
      from: sender._id,
      to: recipient._id,
      amount,
      type: "transfer",
      description: description || "Transfer",
    });
    await transaction.save();

    res
      .status(200)
      .json({ success: true, message: "Transfer successful", transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addCoins = async (req, res) => {
  try {
    const { email, amount, description } = req.body;
    if (!email || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }
    const user = await userModel.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    user.coins += amount;
    await user.save();
    const transaction = new transactionModel({
      from: req.user._id,
      to: user._id,
      amount,
      type: "credit",
      description: description || "Added by user",
    });
    await transaction.save();
    res.status(200).json({
      success: true,
      message: `Added ${amount} coins to ${email}`,
      newBalance: user.coins,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBalance, getTransactionHistory, transferCoins, addCoins };
