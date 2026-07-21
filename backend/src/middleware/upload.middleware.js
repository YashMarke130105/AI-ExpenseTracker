const multer = require("multer");

// In-memory storage: the original `scanReceipt` action converted the
// uploaded File into an ArrayBuffer -> base64 string. We replicate that
// by keeping the file in memory (req.file.buffer) instead of writing to disk.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;
