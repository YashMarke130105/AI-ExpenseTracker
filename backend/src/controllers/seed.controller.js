const asyncHandler = require("express-async-handler");
const Transaction = require("../models/Transaction.model");
const Account = require("../models/Account.model");

// Ported 1:1 from actions/seed.js.
const CATEGORIES = {
  INCOME: [
    { name: "salary", range: [5000, 8000] },
    { name: "freelance", range: [1000, 3000] },
    { name: "investments", range: [500, 2000] },
    { name: "other-income", range: [100, 1000] },
  ],
  EXPENSE: [
    { name: "housing", range: [1000, 2000] },
    { name: "transportation", range: [100, 500] },
    { name: "groceries", range: [200, 600] },
    { name: "utilities", range: [100, 300] },
    { name: "entertainment", range: [50, 200] },
    { name: "food", range: [50, 150] },
    { name: "shopping", range: [100, 500] },
    { name: "healthcare", range: [100, 1000] },
    { name: "education", range: [200, 1000] },
    { name: "travel", range: [500, 2000] },
  ],
};

function getRandomAmount(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function getRandomCategory(type) {
  const categories = CATEGORIES[type];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const amount = getRandomAmount(category.range[0], category.range[1]);
  return { category: category.name, amount };
}

function subDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * GET /api/seed
 * Ported from actions/seed.js -> seedTransactions() (originally invoked via
 * app/api/seed/route.js). The original hardcoded ACCOUNT_ID/USER_ID
 * placeholders; here it seeds 90 days of demo transactions into the
 * authenticated user's default account (falling back to their first account).
 */
const seedTransactions = asyncHandler(async (req, res) => {
  try {
    const account =
      (await Account.findOne({ user: req.user._id, isDefault: true })) ||
      (await Account.findOne({ user: req.user._id }));

    if (!account) {
      return res.json({
        success: false,
        error: "No account found for this user. Create an account first.",
      });
    }

    const transactions = [];
    let totalBalance = 0;

    for (let i = 90; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const transactionsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < transactionsPerDay; j++) {
        const type = Math.random() < 0.4 ? "INCOME" : "EXPENSE";
        const { category, amount } = getRandomCategory(type);

        transactions.push({
          type,
          amount,
          description: `${type === "INCOME" ? "Received" : "Paid for"} ${category}`,
          date,
          category,
          status: "COMPLETED",
          user: req.user._id,
          account: account._id,
          createdAt: date,
          updatedAt: date,
        });

        totalBalance += type === "INCOME" ? amount : -amount;
      }
    }

    const session = await Transaction.startSession();
    try {
      await session.withTransaction(async () => {
        await Transaction.deleteMany({ account: account._id }, { session });
        await Transaction.insertMany(transactions, { session });
        await Account.updateOne(
          { _id: account._id },
          { $set: { balance: totalBalance } },
          { session }
        );
      });
    } finally {
      session.endSession();
    }

    res.json({
      success: true,
      message: `Created ${transactions.length} transactions`,
    });
  } catch (error) {
    console.error("Error seeding transactions:", error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = { seedTransactions };
