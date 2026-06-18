const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: { type: String, enum: ["UPI", "Bank"], required: true },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["approved", "rejected"],
      default: "approved",
    },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
