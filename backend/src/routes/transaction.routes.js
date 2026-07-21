const express = require("express");
const {
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getUserTransactions,
  scanReceipt,
} = require("../controllers/transaction.controller");
const { protect } = require("../middleware/auth.middleware");
const { rateLimit } = require("../middleware/rateLimiter.middleware");
const { validate } = require("../middleware/validate.middleware");
const { transactionSchema } = require("../utils/schema");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

router.use(protect);

router.get("/", getUserTransactions);
router.post("/", rateLimit(1), validate(transactionSchema), createTransaction);
router.post("/scan-receipt", upload.single("receipt"), scanReceipt);
router.get("/:id", getTransaction);
router.put("/:id", validate(transactionSchema), updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
