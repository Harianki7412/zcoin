const userModel = require("../models/userModel");
const withdrawalModel = require("../models/withdrawalModel");

const getStats = async (req, res) => {
  try {
    const totalUsers = await userModel.countDocuments();
    const activeUsers = await userModel.countDocuments({ isActive: true });
    const inactiveUsers = await userModel.countDocuments({ isActive: false });
    const totalCoins = await userModel.aggregate([
      { $group: { _id: null, total: { $sum: "$coins" } } },
    ]);
    const approvedWithdrawals = await withdrawalModel.countDocuments({
      status: "approved",
    });
    const pendingWithdrawals = await withdrawalModel.countDocuments({
      status: "pending",
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalCoins: totalCoins[0]?.total || 0,
        approvedWithdrawals,
        pendingWithdrawals,
      },
    });
  } catch (error) {
    console.error("getStats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find().select("-password");
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.isActive = !user.isActive;
    await user.save();
    res
      .status(200)
      .json({ success: true, user: { id: user._id, isActive: user.isActive } });
  } catch (error) {
    console.error("toggleUserActive error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWithdrawalsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    const withdrawals = await withdrawalModel
      .find({ status })
      .populate("user", "name email coins")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, withdrawals });
  } catch (error) {
    console.error("getWithdrawalsByStatus error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    const withdrawal = await withdrawalModel.findById(id);
    if (!withdrawal) {
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal not found" });
    }
    if (withdrawal.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Withdrawal already processed" });
    }
    withdrawal.status = status;
    await withdrawal.save();
    res.status(200).json({ success: true, withdrawal });
  } catch (error) {
    console.error("updateWithdrawalStatus error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  toggleUserActive,
  getWithdrawalsByStatus,
  updateWithdrawalStatus,
};
