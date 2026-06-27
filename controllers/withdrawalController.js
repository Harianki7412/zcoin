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
    console.error("getMyWithdrawals error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllWithdrawals = async (req, res) => {
  try {
    const withdrawals = await withdrawalModel
      .find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: withdrawals.length, withdrawals });
  } catch (error) {
    console.error("getAllWithdrawals error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    const withdrawal = await withdrawalModel.findById(id);
    if (!withdrawal)
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    if (withdrawal.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Withdrawal already processed" });
    }
    withdrawal.status = status;
    if (adminNote) withdrawal.adminNote = adminNote;
    await withdrawal.save();
    res
      .status(200)
      .json({ success: true, message: `Withdrawal ${status}`, withdrawal });
  } catch (error) {
    console.error("updateWithdrawalStatus error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyWithdrawals,
  getAllWithdrawals,
  updateWithdrawalStatus,
};
