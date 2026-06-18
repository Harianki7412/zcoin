const userModel = require("../models/userModel");
const { hashPassword, comparePassword } = require("../helpers/authHelper");
const jwt = require("jsonwebtoken");

const registerController = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid fields" });
    }
    const existing = await userModel.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }
    const hashed = await hashPassword(password);
    const user = new userModel({ name, email, password: hashed });
    await user.save();
    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: { id: user._id, name, email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const userObj = user.toObject();
    delete userObj.password;
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userObj,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerController, loginController };
