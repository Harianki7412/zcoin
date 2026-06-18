const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["credit"], default: "credit" },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
