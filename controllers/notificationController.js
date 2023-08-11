const Notification = require("../models/notificationModel");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.getNotifications = catchAsync(async (req, res, next) => {
  const result = new APIFeatures(Notification.find(), req.query)
    .filter()
    .sort()
    .limitFields();

  const resultLen = await result.query;

  const features = result.paginate();

  const notifications = await features.query.clone();

  res.status(200).json({
    status: "success",
    data: notifications,
    length: resultLen.length,
  });
});
