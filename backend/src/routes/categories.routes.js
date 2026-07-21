const express = require("express");
const { defaultCategories, categoryColors } = require("../utils/categories");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ success: true, data: { defaultCategories, categoryColors } });
});

module.exports = router;
