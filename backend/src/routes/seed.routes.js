const express = require("express");
const { seedTransactions } = require("../controllers/seed.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

// Matches the original GET /api/seed route.
router.get("/", protect, seedTransactions);

module.exports = router;
