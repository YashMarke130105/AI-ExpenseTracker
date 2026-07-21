const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      // Replaces Clerk-managed auth from the original Next.js app.
      type: String,
      required: true,
      select: false,
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt, same as the Prisma schema
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Virtual relations (mirroring the Prisma `User` relations) - populated on demand.
userSchema.virtual("accounts", {
  ref: "Account",
  localField: "_id",
  foreignField: "user",
});

userSchema.virtual("transactions", {
  ref: "Transaction",
  localField: "_id",
  foreignField: "user",
});

userSchema.virtual("budgets", {
  ref: "Budget",
  localField: "_id",
  foreignField: "user",
});

module.exports = mongoose.model("User", userSchema);
