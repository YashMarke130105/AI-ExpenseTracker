const express = require("express");
const {
  getAccountWithTransactions,
  bulkDeleteTransactions,
  updateAccount,
  updateDefaultAccount,
} = require("../controllers/account.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.get("/:id", getAccountWithTransactions);
router.patch("/:id", updateAccount);
router.patch("/:id/default", updateDefaultAccount);
router.post("/transactions/bulk-delete", bulkDeleteTransactions);

module.exports = router;
