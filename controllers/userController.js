const { token } = require("morgan");
const upload = require("../config/multer");
const User = require("../models/userModel");
const Related = require("../models/relatedModel");
const Wallet = require("../models/walletModel");
const Currency = require("../models/currencyModel");
const History = require("../models/historyModel");
const Referral = require("../models/referralModel");
const Comment = require("../models/commentModel");
const Transaction = require("../models/transactionModel");
const Active = require("../models/activeModel");
const Earning = require("../models/earningModel");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const Email = require("../models/emailModel");
const Company = require("../models/companyModel");
const SendEmail = require("../utils/email");

exports.getAllUsers = catchAsync(async (req, res, next) => {
  // 1A) FILTERING

  // 2) SORTING

  // 3) FIELDS

  // 4) PAGINATION

  const result = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields();

  const resultLen = await result.query;

  const features = result.paginate();

  const users = await features.query.clone();

  res.status(200).json({
    status: "success",
    length: resultLen.length,
    data: users,
  });
});

exports.getAUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: user,
  });
});

exports.editUser = catchAsync(async (req, res, next) => {
  let files = [];
  const oldUser = await User.findById(req.params.id);

  if (req.files.profilePicture) {
    if (req.files.profilePicture) {
      req.body.profilePicture = req.files.profilePicture[0].filename;
      files.push(oldUser.profilePicture);
    }
    if (req.files.idPicture) {
      req.body.idPicture = req.files.idPicture[0].filename;
      files.push(oldUser.idPicture);
    }
  }

  req.body.password = undefined;
  req.body.cPassword = undefined;

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    // runValidators: true,
  });

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  let totalBalance = 0;
  const wallets = JSON.parse(req.body.wallets);
  wallets.forEach((el) => {
    totalBalance += el.balance;
  });

  wallets.forEach(async (el) => {
    const form = {
      balance: el.balance,
      walletAddress: el.walletAddress,
    };
    await Wallet.findByIdAndUpdate(el._id, form);
  });

  await User.updateOne(
    { _id: req.params.id },
    { totalBalance: totalBalance * 1 }
  );

  req.fileNames = files;

  req.user = user;

  next();
});

exports.getRelatedData = catchAsync(async (req, res, next) => {
  const related = await Related.findOne({ username: req.params.username });

  if (!related) {
    return next(new AppError("No user found with that username", 404));
  }
  res.status(200).json({
    status: "success",
    data: related,
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  await User.findByIdAndDelete(req.params.id);
  await Transaction.deleteMany({
    username: user.username,
  });

  await Wallet.deleteMany(
    { username: user.username },
    {
      $set: {
        balance: 0,
        totalDeposit: 0,
        pendingDeposit: 0,
        totalWithdrawal: 0,
        pendingWithdrawal: 0,
      },
    }
  );
  await Active.deleteMany({ username: user.username });
  await Earning.deleteMany({ username: user.username });

  next();
});

exports.resetUsers = catchAsync(async (req, res, next) => {
  await User.updateMany({ $set: { totalBalance: 0 } });
  await Wallet.updateMany({
    $set: {
      balance: 0,
      totalDeposit: 0,
      pendingDeposit: 0,
      totalWithdrawal: 0,
      pendingWithdrawal: 0,
    },
  });
  await Currency.updateMany({
    $set: {
      totalDeposit: 0,
      pendingDeposit: 0,
      totalWithdrawal: 0,
      pendingWithdrawal: 0,
    },
  });
  await Transaction.deleteMany();
  await Active.deleteMany();
  await Earning.deleteMany();
  await History.deleteMany();
  await Referral.updateMany({
    commission: 0,
  });

  res.status(200).json({
    status: "success",
  });
});

exports.resetUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  await User.updateMany({ _id: req.params.id }, { $set: { totalBalance: 0 } });
  await Wallet.updateMany(
    { username: user.username },
    {
      $set: {
        balance: 0,
        totalDeposit: 0,
        pendingDeposit: 0,
        totalWithdrawal: 0,
        pendingWithdrawal: 0,
      },
    }
  );
  await Transaction.deleteMany({ username: user.username });
  await Active.deleteMany({ username: user.username });
  await Earning.deleteMany({ username: user.username });

  res.status(200).json({
    status: "success",
  });
});

exports.fetchUsers = (io, socket) => {
  socket.on("fetchUsers", async (item) => {
    const limit = item.limit;
    const users = await User.find({
      username: { $regex: new RegExp(item.keyWord, "i") },
    }).limit(limit);

    io.emit("fetchedUsers", users);
  });
};

exports.editUserPictue = catchAsync(async (req, res, next) => {
  let files = [];
  const oldUser = await User.findById(req.params.id);

  req.body.password = undefined;
  req.body.cPassword = undefined;

  await User.findByIdAndUpdate(
    req.params.id,
    { profilePicture: req.file.filename },
    {
      new: true,
      // runValidators: true,
    }
  );
  files.push(oldUser.profilePicture);
  req.fileNames = files;

  next();
});

exports.editComment = catchAsync(async (req, res, next) => {
  await Comment.findOneAndUpdate({ username: req.params.username }, req.body);

  next();
});

exports.getComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findOneAndUpdate({
    username: req.query.username,
  });

  res.status(200).json({
    status: "success",
    data: comment,
  });
});
