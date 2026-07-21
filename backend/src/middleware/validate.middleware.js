const { ZodError } = require("zod");

/**
 * Validates req.body against a Zod schema and replaces req.body with the
 * parsed/coerced result (so controllers receive real numbers/dates, not
 * whatever raw shape the client sent) before calling next().
 *
 * On failure, responds 400 with a flat list of field-level messages instead
 * of throwing, since a validation failure is an expected client error, not
 * a server fault for the errorHandler middleware to log/500 on.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return res.status(400).json({ success: false, error: errors[0]?.message || "Invalid request body", errors });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate, ZodError };
