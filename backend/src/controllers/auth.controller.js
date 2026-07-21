const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User.model");

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/**
 * Replaces Clerk's sign-up flow + lib/checkUser.js (which lazily created a
 * User row keyed by `clerkUserId` the first time a Clerk user hit the app).
 * Here the User document is created directly at registration time.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, imageUrl } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({ name, email, password, imageUrl });

  res.status(201).json({
    success: true,
    data: {
      user: user.toJSON(),
      token: signToken(user._id),
    },
  });
});

// Replaces Clerk's sign-in flow.
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      token: signToken(user._id),
    },
  });
});

// Replaces Clerk's `currentUser()`.
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toJSON() });
});

module.exports = { register, login, getMe };
