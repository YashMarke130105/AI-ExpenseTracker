const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Account = require("../models/Account.model");
const Transaction = require("../models/Transaction.model");

// GET /api/dashboard/accounts
// Ported from actions/dashboard.js -> getUserAccounts()
const getUserAccounts = asyncHandler(async (req, res) => {
  const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();

  const accountIds = accounts.map((a) => a._id);
  const counts = await Transaction.aggregate([
    { $match: { account: { $in: accountIds } } },
    { $group: { _id: "$account", count: { $sum: 1 } } },
  ]);
  const countMap = counts.reduce((acc, c) => {
    acc[c._id.toString()] = c.count;
    return acc;
  }, {});

  const serialized = accounts.map((account) => ({
    ...account,
    id: account._id.toString(),
    userId: account.user.toString(),
    balance: parseFloat(account.balance.toString()),
    _count: { transactions: countMap[account._id.toString()] || 0 },
    _id: undefined,
    user: undefined,
  }));

  res.json({ success: true, data: serialized });
});

// POST /api/dashboard/accounts
// Ported from actions/dashboard.js -> createAccount(data)
// Rate limiting (Arcjet token bucket) is applied via the `rateLimit` middleware on the route.
const createAccount = asyncHandler(async (req, res) => {
  const data = req.body;

  const balanceFloat = parseFloat(data.balance);
  if (isNaN(balanceFloat)) {
    res.status(400);
    throw new Error("Invalid balance amount");
  }

  const existingAccountsCount = await Account.countDocuments({ user: req.user._id });

  // If it's the first account, make it default regardless of user input.
  const shouldBeDefault = existingAccountsCount === 0 ? true : !!data.isDefault;

  if (shouldBeDefault) {
    await Account.updateMany(
      { user: req.user._id, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  const account = await Account.create({
    name: data.name,
    type: data.type,
    balance: balanceFloat,
    isDefault: shouldBeDefault,
    user: req.user._id,
  });

  res.status(201).json({ success: true, data: account.toJSON() });
});

// GET /api/dashboard/transactions
// Ported from actions/dashboard.js -> getDashboardData()
const getDashboardData = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
  res.json({ success: true, data: transactions.map((t) => t.toJSON()) });
});

module.exports = { getUserAccounts, createAccount, getDashboardData };
