const asyncHandler = require("express-async-handler");
const Account = require("../models/Account.model");
const Transaction = require("../models/Transaction.model");

// GET /api/accounts/:id
// Ported from actions/account.js -> getAccountWithTransactions(accountId)
const getAccountWithTransactions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const account = await Account.findOne({ _id: id, user: req.user._id });
  if (!account) {
    return res.json({ success: true, data: null });
  }

  const transactions = await Transaction.find({ account: account._id }).sort({ date: -1 });
  const transactionCount = transactions.length;

  res.json({
    success: true,
    data: {
      ...account.toJSON(),
      transactions: transactions.map((t) => t.toJSON()),
      _count: { transactions: transactionCount },
    },
  });
});

// POST /api/accounts/transactions/bulk-delete
// Ported from actions/account.js -> bulkDeleteTransactions(transactionIds)
const bulkDeleteTransactions = asyncHandler(async (req, res) => {
  const { transactionIds } = req.body;

  try {
    const transactions = await Transaction.find({
      _id: { $in: transactionIds },
      user: req.user._id,
    });

    // Group transactions by account to update balances
    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const amount = parseFloat(transaction.amount.toString());
      const change = transaction.type === "EXPENSE" ? amount : -amount;
      const accId = transaction.account.toString();
      acc[accId] = (acc[accId] || 0) + change;
      return acc;
    }, {});

    const session = await Transaction.startSession();
    try {
      await session.withTransaction(async () => {
        await Transaction.deleteMany(
          { _id: { $in: transactionIds }, user: req.user._id },
          { session }
        );

        for (const [accountId, balanceChange] of Object.entries(accountBalanceChanges)) {
          await Account.updateOne(
            { _id: accountId },
            { $inc: { balance: balanceChange } },
            { session }
          );
        }
      });
    } finally {
      session.endSession();
    }

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// PATCH /api/accounts/:id
const updateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const allowedUpdates = {};
  if (typeof updates.name === "string" && updates.name.trim()) {
    allowedUpdates.name = updates.name.trim();
  }
  if (updates.type && ["CURRENT", "SAVINGS"].includes(updates.type)) {
    allowedUpdates.type = updates.type;
  }
  if (updates.balance !== undefined) {
    const balanceFloat = parseFloat(updates.balance);
    if (Number.isNaN(balanceFloat)) {
      res.status(400);
      throw new Error("Invalid balance amount");
    }
    allowedUpdates.balance = balanceFloat;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    res.status(400);
    throw new Error("No valid account fields provided");
  }

  const account = await Account.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { $set: allowedUpdates },
    { new: true }
  );

  if (!account) {
    res.status(404);
    throw new Error("Account not found");
  }

  res.json({ success: true, data: account.toJSON() });
});

// PATCH /api/accounts/:id/default
// Ported from actions/account.js -> updateDefaultAccount(accountId)
const updateDefaultAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Account.startSession();
  let account;
  try {
    await session.withTransaction(async () => {
      const target = await Account.findOne({ _id: id, user: req.user._id }, null, { session });
      if (!target) {
        const err = new Error("Account not found");
        err.status = 404;
        throw err;
      }

      // Both writes are now inside the same transaction, so a crash between
      // them can't leave the user with zero or two default accounts the way
      // two separate un-transacted writes could.
      await Account.updateMany(
        { user: req.user._id, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );

      account = await Account.findOneAndUpdate(
        { _id: id, user: req.user._id },
        { $set: { isDefault: true } },
        { new: true, session }
      );
    });
  } catch (error) {
    if (error.status === 404) {
      return res.json({ success: false, error: "Account not found" });
    }
    return res.json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }

  res.json({ success: true, data: account.toJSON() });
});

module.exports = { getAccountWithTransactions, bulkDeleteTransactions, updateAccount, updateDefaultAccount };
