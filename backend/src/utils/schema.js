const { z } = require("zod");

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["CURRENT", "SAVINGS"]),
  // z.coerce.number() accepts either a string ("100.50") or a number (100.5)
  // from the client and always produces a real number, so downstream
  // arithmetic (account.balance + amount) can never silently become string
  // concatenation regardless of what shape the request body arrives in.
  balance: z.coerce.number({ required_error: "Initial balance is required" }),
  isDefault: z.boolean().default(false),
});

const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.coerce.number({ required_error: "Amount is required" }).positive("Amount must be greater than 0"),
    description: z.string().nullable().optional(),
    date: z.coerce.date({ required_error: "Date is required" }),
    accountId: z.string().min(1, "Account is required"),
    category: z.string().min(1, "Category is required"),
    isRecurring: z.boolean().default(false),
    recurringInterval: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).nullable().optional(),
    receiptUrl: z.string().nullable().optional(),
    status: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && !data.recurringInterval) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurring interval is required for recurring transactions",
        path: ["recurringInterval"],
      });
    }
  });

module.exports = { accountSchema, transactionSchema };
