const withdrawalModel = require("../models/withdrawalModel");

const getMyWithdrawals = async (req, res) => {
  try {
    const withdrawals = await withdrawalModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: withdrawals.length, withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMyWithdrawals };
