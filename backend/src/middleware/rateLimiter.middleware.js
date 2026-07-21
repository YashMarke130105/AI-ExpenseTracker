/**
 * Replaces the Arcjet `tokenBucket` rule used in the original Next.js
 * `actions/dashboard.js` and `actions/transaction.js` (10 tokens capacity,
 * refilling 10 tokens/hour, keyed by userId).
 *
 * This is a simple in-memory token bucket. Logic mirrors Arcjet's behavior:
 * each protected request consumes 1 token; if none are left, the request
 * is rejected the same way `decision.isDenied()` was handled before.
 */

const buckets = new Map();

const CAPACITY = Number(process.env.RATE_LIMIT_CAPACITY || 10);
const REFILL_RATE = Number(process.env.RATE_LIMIT_REFILL || 10);
const INTERVAL_MS = Number(process.env.RATE_LIMIT_INTERVAL_SECONDS || 3600) * 1000;

function getBucket(key) {
  let bucket = buckets.get(key);
  const now = Date.now();

  if (!bucket) {
    bucket = { tokens: CAPACITY, lastRefill: now };
    buckets.set(key, bucket);
    return bucket;
  }

  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refillAmount = (elapsed / INTERVAL_MS) * REFILL_RATE;
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + refillAmount);
    bucket.lastRefill = now;
  }

  return bucket;
}

const rateLimit = (requested = 1) =>
  function rateLimitMiddleware(req, res, next) {
    const key = req.user?.id?.toString() || req.ip;
    const bucket = getBucket(key);

    if (bucket.tokens < requested) {
      console.error({
        code: "RATE_LIMIT_EXCEEDED",
        details: {
          remaining: bucket.tokens,
          resetInSeconds: INTERVAL_MS / 1000,
        },
      });
      res.status(429);
      return next(new Error("Too many requests. Please try again later."));
    }

    bucket.tokens -= requested;
    next();
  };

module.exports = { rateLimit };
