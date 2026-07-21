require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { scheduleJobs } = require("./src/jobs/cron");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  scheduleJobs();

  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
  });
})();
