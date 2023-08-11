const Comment = require("../models/commentModel");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.createComment = catchAsync(async (req, res, next) => {
  if (req.file) {
    req.body.profilePicture = req.file.filename;
  }
  await Comment.create(req.body);
  next();
});

exports.getComment = catchAsync(async (req, res) => {
  const result = new APIFeatures(Comment.find(), req.query)
    .filter()
    .sort()
    .limitFields();

  const resultLen = await result.query;

  const features = result.paginate();

  const comment = await features.query.clone();

  res.status(200).json({
    status: "success",
    data: comment,
    resultLength: resultLen.length,
  });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const filesToDelete = [];
  if (req.file) {
    req.body.image = req.file.filename;
    const oldComment = await Comment.findById(req.params.id);
    filesToDelete.push(oldComment.image);
  }

  await Comment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  req.fileNames = filesToDelete;

  next();
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const filesToDelete = [];

  const comment = await Comment.findById(req.params.id);

  await Comment.findByIdAndDelete(req.params.id);

  if (!comment) {
    return next(new AppError("No Comment found with that ID", 404));
  }
  filesToDelete.push(comment.profilePicture);
  req.fileNames = filesToDelete;
  next();
});
