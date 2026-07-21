const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"],
      required: true,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringInterval: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY", null],
      default: null,
    },
    nextRecurringDate: {
      type: Date,
      default: null,
    },
    lastProcessed: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "COMPLETED",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.user?.toString ? ret.user.toString() : ret.user;
        ret.accountId = ret.account?.toString ? ret.account.toString() : ret.account;
        if (ret.amount != null) {
          ret.amount = parseFloat(ret.amount.toString());
        }
        delete ret._id;
        delete ret.__v;
        delete ret.user;
        delete ret.account;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
