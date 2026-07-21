const express = require("express");
const { getCurrentBudget, updateBudget } = require("../controllers/budget.controller");
const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.get("/current", getCurrentBudget);
router.put("/", updateBudget);

module.exports = router;
