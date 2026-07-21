const asyncHandler = require("express-async-handler");
const Budget = require("../models/Budget.model");
const Transaction = require("../models/Transaction.model");

// GET /api/budgets/current?accountId=...
// Ported from actions/budget.js -> getCurrentBudget(accountId)
const getCurrentBudget = asyncHandler(async (req, res) => {
  const { accountId } = req.query;

  const budget = await Budget.findOne({ user: req.user._id });

  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const expenseAgg = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        type: "EXPENSE",
        date: { $gte: startOfMonth, $lte: endOfMonth },
        account: new (require("mongoose").Types.ObjectId)(accountId),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $toDecimal: "$amount" } },
      },
    },
  ]);

  const currentExpenses = expenseAgg[0] ? parseFloat(expenseAgg[0].total.toString()) : 0;

  res.json({
    success: true,
    data: {
      budget: budget ? budget.toJSON() : null,
      currentExpenses,
    },
  });
});

// PUT /api/budgets
// Ported from actions/budget.js -> updateBudget(amount)
const updateBudget = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  try {
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id },
      { $set: { amount } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: budget.toJSON() });
  } catch (error) {
    console.error("Error updating budget:", error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = { getCurrentBudget, updateBudget };
