const express = require("express");
const {
  getStats,
  getAllUsers,
  toggleUserActive,
  getWithdrawalsByStatus,
  updateWithdrawalStatus,
} = require("../controllers/adminController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.put("/users/:id/toggle", toggleUserActive);
router.get("/withdrawals/:status", getWithdrawalsByStatus);
router.put("/withdrawals/:id/status", updateWithdrawalStatus);

module.exports = router;
