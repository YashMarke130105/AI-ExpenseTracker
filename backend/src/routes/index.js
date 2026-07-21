const express = require("express");

const authRoutes = require("./auth.routes");
const dashboardRoutes = require("./dashboard.routes");
const accountRoutes = require("./account.routes");
const budgetRoutes = require("./budget.routes");
const transactionRoutes = require("./transaction.routes");
const seedRoutes = require("./seed.routes");
const categoriesRoutes = require("./categories.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/accounts", accountRoutes);
router.use("/budgets", budgetRoutes);
router.use("/transactions", transactionRoutes);
router.use("/seed", seedRoutes);
router.use("/categories", categoriesRoutes);

module.exports = router;
