const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["CURRENT", "SAVINGS"],
      required: true,
    },
    balance: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
        if (ret.balance != null) {
          ret.balance = parseFloat(ret.balance.toString());
        }
        delete ret._id;
        delete ret.__v;
        delete ret.user;
        return ret;
      },
    },
  }
);

accountSchema.virtual("transactions", {
  ref: "Transaction",
  localField: "_id",
  foreignField: "account",
});

module.exports = mongoose.model("Account", accountSchema);
