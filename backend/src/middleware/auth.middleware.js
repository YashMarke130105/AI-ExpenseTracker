const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User.model");

/**
 * Replaces Clerk's `auth()` + `currentUser()` helpers from the original
 * Next.js app. Expects `Authorization: Bearer <token>`.
 * On success, attaches the full Mongo user document to `req.user`
 * (equivalent to the Prisma `user` record looked up via `clerkUserId`).
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Unauthorized");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Unauthorized");
  }
});

module.exports = { protect };
