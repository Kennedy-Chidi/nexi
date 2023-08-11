const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
  },

  lastName: {
    type: String,
    trim: true,
  },

  firstName: {
    type: String,
    trim: true,
  },

  email: {
    type: String,
    trim: true,
    lowercase: true,
  },

  autoRegister: {
    type: Boolean,
    default: false,
  },

  totalBalance: {
    type: Number,
    default: 0,
  },

  commission: {
    type: Number,
    default: 0,
  },

  password: {
    type: String,
    required: [true, "Please fill in your password"],
    minlenght: [4, "Password must be at least 4 characters long"],
    select: false,
  },

  cPassword: {
    type: String,
    required: [true, "Please confirm the password"],
    validate: {
      //This only works on save
      validator: function (el) {
        return el == this.password;
      },
      message: "Sorry the passwords do not match",
    },
  },

  referredBy: {
    type: String,
    default: "",
  },

  hasReferred: {
    type: Boolean,
    default: false,
  },

  status: {
    type: String,
    default: "User",
  },

  phoneNumber: {
    type: Number,
    default: 0,
  },

  dob: {
    type: Number,
    default: 0,
  },
  country: String,
  countryFlag: String,
  profilePicture: String,
  documentName: String,
  documentFile: String,
  referrals: Array,
  regDate: Number,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  suspension: {
    type: Boolean,
    default: true,
  },

  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.cPassword = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = this.passwordChangedAt.getTime() / 1000;
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
