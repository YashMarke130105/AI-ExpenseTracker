const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler.middleware");
const { generateMonthlyReports } = require("./jobs/cron");

const app = express();

// Auth here is a JWT Bearer token in the Authorization header, not a cookie,
// so `credentials: true` (which governs cookie/session sharing) isn't
// actually needed — and combining it with a `"*"` origin fallback is
// something browsers reject outright, silently breaking any cross-origin
// request whenever CLIENT_URL isn't set. Default to the frontend's dev
// origin instead of a wildcard, and drop `credentials`.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => res.json({ success: true, status: "ok" }));

app.post("/debug/generate-monthly-reports", async (req, res, next) => {
  try {
    const result = await generateMonthlyReports();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
