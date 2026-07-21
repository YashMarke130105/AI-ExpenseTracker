const asyncHandler = require("express-async-handler");
const Transaction = require("../models/Transaction.model");
const Account = require("../models/Account.model");
const { calculateNextRecurringDate } = require("../utils/dateHelpers");
const { scanReceipt: scanReceiptService } = require("../services/gemini.service");

// POST /api/transactions
// Ported from actions/transaction.js -> createTransaction(data)
// Rate limiting (Arcjet token bucket) is applied via the `rateLimit` middleware on the route.
const createTransaction = asyncHandler(async (req, res) => {
  const data = req.body;

  const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;

  const session = await Transaction.startSession();
  let newTransaction;
  try {
    await session.withTransaction(async () => {
      // Re-check the account inside the transaction (with `session`) rather
      // than reading its balance beforehand and writing a precomputed
      // absolute value with $set. Two concurrent createTransaction calls
      // both reading the same starting balance and both $set-ing their own
      // computed total is a classic lost-update race; $inc is atomic at the
      // document level and immune to that, regardless of how many other
      // writes interleave.
      const account = await Account.findOne(
        { _id: data.accountId, user: req.user._id },
        null,
        { session }
      );
      if (!account) {
        const err = new Error("Account not found");
        err.status = 404;
        throw err;
      }

      const [created] = await Transaction.create(
        [
          {
            type: data.type,
            amount: data.amount,
            description: data.description,
            date: data.date,
            category: data.category,
            receiptUrl: data.receiptUrl,
            isRecurring: data.isRecurring,
            recurringInterval: data.recurringInterval,
            status: data.status,
            user: req.user._id,
            account: data.accountId,
            nextRecurringDate:
              data.isRecurring && data.recurringInterval
                ? calculateNextRecurringDate(data.date, data.recurringInterval)
                : null,
          },
        ],
        { session }
      );
      newTransaction = created;

      await Account.updateOne(
        { _id: data.accountId },
        { $inc: { balance: balanceChange } },
        { session }
      );
    });
  } catch (err) {
    if (err.status === 404) {
      res.status(404);
      throw new Error("Account not found");
    }
    throw err;
  } finally {
    session.endSession();
  }

  res.status(201).json({ success: true, data: newTransaction.toJSON() });
});

// GET /api/transactions/:id
// Ported from actions/transaction.js -> getTransaction(id)
const getTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error("Transaction not found");
  }

  res.json({ success: true, data: transaction.toJSON() });
});

// PUT /api/transactions/:id
// Ported from actions/transaction.js -> updateTransaction(id, data)
const updateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const session = await Transaction.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const originalTransaction = await Transaction.findOne(
        { _id: id, user: req.user._id },
        null,
        { session }
      );
      if (!originalTransaction) {
        const err = new Error("Transaction not found");
        err.status = 404;
        throw err;
      }

      // The transaction may be moving to a different account than the one
      // it's currently on. Verify the destination account also belongs to
      // this user (findOne with a `user` filter is itself the auth check —
      // no separate assertion needed once we're relying on its result).
      const newAccount = await Account.findOne(
        { _id: data.accountId, user: req.user._id },
        null,
        { session }
      );
      if (!newAccount) {
        const err = new Error("Account not found");
        err.status = 404;
        throw err;
      }

      const originalAmount = parseFloat(originalTransaction.amount.toString());
      const oldBalanceChange =
        originalTransaction.type === "EXPENSE" ? -originalAmount : originalAmount;
      const newBalanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;

      const oldAccountId = originalTransaction.account.toString();
      const movingAccounts = oldAccountId !== data.accountId;

      updated = await Transaction.findOneAndUpdate(
        { _id: id, user: req.user._id },
        {
          $set: {
            type: data.type,
            amount: data.amount,
            description: data.description,
            date: data.date,
            category: data.category,
            account: data.accountId,
            isRecurring: data.isRecurring,
            recurringInterval: data.recurringInterval,
            nextRecurringDate:
              data.isRecurring && data.recurringInterval
                ? calculateNextRecurringDate(data.date, data.recurringInterval)
                : null,
          },
        },
        { new: true, session }
      );

      if (movingAccounts) {
        // Reverse the transaction's original contribution on the account it's
        // leaving, and apply its new contribution to the account it's moving
        // to — rather than applying the net change only to the new account,
        // which silently left the old account's balance permanently wrong.
        await Account.updateOne(
          { _id: oldAccountId },
          { $inc: { balance: -oldBalanceChange } },
          { session }
        );
        await Account.updateOne(
          { _id: data.accountId },
          { $inc: { balance: newBalanceChange } },
          { session }
        );
      } else {
        const netBalanceChange = newBalanceChange - oldBalanceChange;
        await Account.updateOne(
          { _id: data.accountId },
          { $inc: { balance: netBalanceChange } },
          { session }
        );
      }
    });
  } catch (err) {
    if (err.status === 404) {
      res.status(404);
      throw new Error(err.message);
    }
    throw err;
  } finally {
    session.endSession();
  }

  res.json({ success: true, data: updated.toJSON() });
});

// GET /api/transactions
// Ported from actions/transaction.js -> getUserTransactions(query)
const getUserTransactions = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  if (req.query.accountId) filter.account = req.query.accountId;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.isRecurring) filter.isRecurring = req.query.isRecurring === "true";
  if (req.query.search) {
    const search = req.query.search.trim();
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
  }

  const dateExpr = [];
  if (req.query.dateDay && req.query.dateDay !== "ALL") {
    const day = parseInt(req.query.dateDay, 10);
    if (!Number.isNaN(day)) {
      dateExpr.push({ $eq: [{ $dayOfMonth: "$date" }, day] });
    }
  }
  if (req.query.dateMonth && req.query.dateMonth !== "ALL") {
    const month = parseInt(req.query.dateMonth, 10);
    if (!Number.isNaN(month)) {
      dateExpr.push({ $eq: [{ $month: "$date" }, month] });
    }
  }
  if (req.query.dateYear && req.query.dateYear !== "ALL") {
    const year = parseInt(req.query.dateYear, 10);
    if (!Number.isNaN(year)) {
      dateExpr.push({ $eq: [{ $year: "$date" }, year] });
    }
  }
  if (dateExpr.length > 0) {
    filter.$expr = { $and: dateExpr };
  }

  const sortField = req.query.sortBy || "date";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  const limit = parseInt(req.query.limit, 10) || 0;
  const page = parseInt(req.query.page, 10) || 1;
  const skip = limit > 0 ? (page - 1) * limit : 0;

  const query = Transaction.find(filter).populate("account").sort(sort);
  if (limit > 0) query.skip(skip).limit(limit);

  const [transactions, total] = await Promise.all([
    query,
    limit > 0 ? Transaction.countDocuments(filter) : Promise.resolve(null),
  ]);

  const payload = transactions.map((t) => t.toJSON());
  if (limit > 0) {
    return res.json({
      success: true,
      data: {
        transactions: payload,
        total,
        page,
        limit,
      },
    });
  }

  res.json({ success: true, data: payload });
});

// DELETE /api/transactions/:id
// Ported from actions/transaction.js -> deleteTransaction(id)
const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await Transaction.startSession();

  try {
    await session.withTransaction(async () => {
      const transaction = await Transaction.findOne({ _id: id, user: req.user._id }, null, { session });
      if (!transaction) {
        const err = new Error("Transaction not found");
        err.status = 404;
        throw err;
      }

      const amount = parseFloat(transaction.amount.toString());
      const balanceChange = transaction.type === "EXPENSE" ? amount : -amount;

      await Transaction.deleteOne({ _id: id, user: req.user._id }, { session });
      await Account.updateOne(
        { _id: transaction.account },
        { $inc: { balance: balanceChange } },
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  res.json({ success: true });
});

// POST /api/transactions/scan-receipt  (multipart/form-data, field name: "receipt")
// Ported from actions/transaction.js -> scanReceipt(file)
const scanReceipt = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No receipt file uploaded");
  }

  const data = await scanReceiptService(req.file);
  res.json({ success: true, data });
});

module.exports = {
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getUserTransactions,
  scanReceipt,
};
