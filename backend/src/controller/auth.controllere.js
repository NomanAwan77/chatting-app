const UserModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const getCookieOptions = (req) => {
  const reqOrigin = req.headers.origin || "";
  const isHttpsOrigin = reqOrigin.startsWith("https://");
  const forceSameSite = process.env.COOKIE_SAME_SITE;
  const forceSecure = process.env.COOKIE_SECURE;

  return {
    httpOnly: true,
    sameSite: forceSameSite || (isHttpsOrigin ? "none" : "lax"),
    secure: forceSecure ? forceSecure === "true" : isHttpsOrigin,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const register = async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    name,
    email,
    password: hashedPassword,
  });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.cookie("token", token, getCookieOptions(req));
  res.status(201).json({ user });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.cookie("token", token, getCookieOptions(req));
  res.status(200).json({ user });
};
module.exports = { register, login };
