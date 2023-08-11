const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  name: String,
  currencyId: String,
  username: String,
  userId: String,
  walletAddress: String,
  paymentMethod: String,
  symbol: String,
  image: String,
  balance: {
    type: Number,
    default: 0,
  },
  pendingWithdrawal: {
    type: Number,
    default: 0,
  },
  totalWithdrawal: {
    type: Number,
    default: 0,
  },
  pendingDeposit: {
    type: Number,
    default: 0,
  },
  totalDeposit: {
    type: Number,
    default: 0,
  },
  online: {
    type: Boolean,
  },
  time: Number,
});

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
