const express = require("express");
const {
  getUserAccounts,
  createAccount,
  getDashboardData,
} = require("../controllers/dashboard.controller");
const { protect } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rateLimiter.middleware");
const { validate } = require("../middleware/validate.middleware");
const { accountSchema } = require("../utils/schema");

const router = express.Router();

router.use(protect);

router.get("/accounts", getUserAccounts);
router.post("/accounts", rateLimit(1), validate(accountSchema), createAccount);
router.get("/transactions", getDashboardData);

module.exports = router;
