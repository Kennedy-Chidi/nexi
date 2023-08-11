const express = require("express");
const reviewController = require("../controllers/reviewController");
const authController = require("../controllers/authController");
const upload = require("../config/multer");
const deleteFile = require("../utils/deleteFile");

const router = express.Router();

router
  .route("/")
  .post(
    upload.upload.single("profilePicture"),
    reviewController.createComment,
    reviewController.getComment
  )
  .get(reviewController.getComment);

router
  .route("/:id")
  .patch(
    // authController.protect,
    upload.upload.single("image"),
    reviewController.updateComment,
    deleteFile,
    reviewController.getComment
  )
  .delete(
    // authController.protect,
    // authController.restrictTo("room"),
    reviewController.deleteComment,
    deleteFile,
    reviewController.getComment
  );

module.exports = router;
