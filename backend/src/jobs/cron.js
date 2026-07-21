const cron = require("node-cron");
const Transaction = require("../models/Transaction.model");
const Account = require("../models/Account.model");
const Budget = require("../models/Budget.model");
const User = require("../models/User.model");
const { sendEmail } = require("../services/email.service");
const {    } = require("../services/gemini.service");
const { renderEmailTemplate } = require("../emails/template");
const {
  calculateNextRecurringDate,
  isTransactionDue,
  isNewMonth,
} = require("../utils/dateHelpers");

/**
 * The original app used Inngest (event-driven functions + cron triggers)
 * for background work: recurring transaction processing, monthly report
 * emails, and budget alert emails. Inngest's event bus/step functions are
 * Next.js/serverless-oriented, so here the same logic is scheduled directly
 * with `node-cron` inside the long-running Express process. The business
 * logic in each job is ported 1:1 from lib/inngest/function.js.
 */

// 1. Process a single recurring transaction (ported from `processRecurringTransaction`)
async function processRecurringTransaction(transactionId, userId) {
  const transaction = await Transaction.findOne({ _id: transactionId, user: userId }).populate(
    "account"
  );

  if (!transaction || !isTransactionDue(transaction)) return;

  const session = await Transaction.startSession();
  try {
    await session.withTransaction(async () => {
      await Transaction.create(
        [
          {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            user: transaction.user,
            account: transaction.account._id,
            isRecurring: false,
          },
        ],
        { session }
      );

      const amount = parseFloat(transaction.amount.toString());
      const balanceChange = transaction.type === "EXPENSE" ? -amount : amount;

      await Account.updateOne(
        { _id: transaction.account._id },
        { $inc: { balance: balanceChange } },
        { session }
      );

      await Transaction.updateOne(
        { _id: transaction._id },
        {
          $set: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval
            ),
          },
        },
        { session }
      );
    });
  } finally {
    session.endSession();
  }
}

// 2. Trigger recurring transactions (ported from `triggerRecurringTransactions`, daily at midnight)
async function triggerRecurringTransactions() {
  const recurringTransactions = await Transaction.find({
    isRecurring: true,
    status: "COMPLETED",
    $or: [{ lastProcessed: null }, { nextRecurringDate: { $lte: new Date() } }],
  });

  for (const transaction of recurringTransactions) {
    await processRecurringTransaction(transaction._id, transaction.user);
  }

  return { triggered: recurringTransactions.length };
}

// 3. Monthly stats helper (ported from `getMonthlyStats`)
async function getMonthlyStats(userId, month) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await Transaction.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate },
  });

  return transactions.reduce(
    (stats, t) => {
      const amount = parseFloat(t.amount.toString());
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    { totalExpenses: 0, totalIncome: 0, byCategory: {}, transactionCount: transactions.length }
  );
}

// 4. Monthly report generation (ported from `generateMonthlyReports`, 1st of each month)
async function generateMonthlyReports() {
  const users = await User.find({});

  for (const user of users) {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const stats = await getMonthlyStats(user._id, lastMonth);
    const monthName = lastMonth.toLocaleString("default", { month: "long" });

    const insights = await  (stats, monthName);

    await sendEmail({
      to: user.email,
      subject: `Your Monthly Financial Report - ${monthName}`,
      html: renderEmailTemplate({
        userName: user.name,
        type: "monthly-report",
        data: { stats, month: monthName, insights },
      }),
    });
  }

  return { processed: users.length };
}

// 5. Budget alerts (ported from `checkBudgetAlerts`, every 6 hours)
async function checkBudgetAlerts() {
  const budgets = await Budget.find({}).populate("user");

  for (const budget of budgets) {
    if (!budget.user) continue;

    const defaultAccount = await Account.findOne({ user: budget.user._id, isDefault: true });
    if (!defaultAccount) continue;

    const startDate = new Date();
    startDate.setDate(1);

    const expenseAgg = await Transaction.aggregate([
      {
        $match: {
          user: budget.user._id,
          account: defaultAccount._id,
          type: "EXPENSE",
          date: { $gte: startDate },
        },
      },
      { $group: { _id: null, total: { $sum: { $toDecimal: "$amount" } } } },
    ]);

    const totalExpenses = expenseAgg[0] ? parseFloat(expenseAgg[0].total.toString()) : 0;
    const budgetAmount = parseFloat(budget.amount.toString());
    const percentageUsed = (totalExpenses / budgetAmount) * 100;

    if (
      percentageUsed >= 80 &&
      (!budget.lastAlertSent || isNewMonth(new Date(budget.lastAlertSent), new Date()))
    ) {
      await sendEmail({
        to: budget.user.email,
        subject: `Budget Alert for ${defaultAccount.name}`,
        html: renderEmailTemplate({
          userName: budget.user.name,
          type: "budget-alert",
          data: {
            percentageUsed,
            budgetAmount: parseInt(budgetAmount).toFixed(1),
            totalExpenses: parseInt(totalExpenses).toFixed(1),
            accountName: defaultAccount.name,
          },
        }),
      });

      await Budget.updateOne({ _id: budget._id }, { $set: { lastAlertSent: new Date() } });
    }
  }
}

function scheduleJobs() {
  // Daily at midnight
  cron.schedule("0 0 * * *", () => {
    triggerRecurringTransactions().catch((err) =>
      console.error("triggerRecurringTransactions failed:", err)
    );
  });

  // First day of each month
  cron.schedule("0 0 1 * *", () => {
    generateMonthlyReports().catch((err) => console.error("generateMonthlyReports failed:", err));
  });

  // Every 6 hours
  cron.schedule("0 */6 * * *", () => {
    checkBudgetAlerts().catch((err) => console.error("checkBudgetAlerts failed:", err));
  });

  console.log("Cron jobs scheduled (recurring transactions, monthly reports, budget alerts).");
}

module.exports = {
  scheduleJobs,
  triggerRecurringTransactions,
  generateMonthlyReports,
  checkBudgetAlerts,
  processRecurringTransaction,
};
