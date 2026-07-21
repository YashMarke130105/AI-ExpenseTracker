const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    lastAlertSent: {
      type: Date,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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
        if (ret.amount != null) {
          ret.amount = parseFloat(ret.amount.toString());
        }
        delete ret._id;
        delete ret.__v;
        delete ret.user;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("Budget", budgetSchema);
