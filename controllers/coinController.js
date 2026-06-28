const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");

const getBalance = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .select("coins name email");
    res
      .status(200)
      .json({
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

module.exports = { getBalance, getTransactionHistory };
