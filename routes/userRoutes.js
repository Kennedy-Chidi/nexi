const express = require("express");
const upload = require("../config/multer");
const deleteFile = require("../utils/deleteFile");
const authController = require("../controllers/authController");
const emailController = require("../controllers/emailController");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/login", authController.login);
router.route("/get-user").get(authController.getAUser);
router.route("/activate-user/:id").patch(authController.activateAUser);

router.route("/related/:username").get(userController.getRelatedData);
router.route("/reset").get(userController.resetUsers);

router.route("/reset/:id").patch(userController.resetUser);
router.patch(
  "/edit-picture/:id",
  upload.upload.single("profilePicture"),
  userController.editUserPictue,
  deleteFile,
  authController.getAUser
);

router
  .patch(
    "/comment/:username",
    userController.editComment,
    userController.getComment
  )
  .get("/comment", userController.getComment);

router
  .route("/update-password")
  .patch(authController.protect, authController.updatePassword);

router.route("/forgotten-password").patch(authController.forgotPassword);
router.route("/reset-password/:token").patch(authController.resetPassword);

router.post(
  "/signup",
  upload.upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "documentFile", maxCount: 1 },
  ]),
  authController.signup
);

router.route("/").get(userController.getAllUsers);

router
  .route("/:id")
  .get(userController.getAUser)
  .patch(
    // authController.protect,
    upload.upload.fields([
      { name: "profilePicture", maxCount: 1 },
      { name: "documentFile", maxCount: 1 },
    ]),
    userController.editUser,
    deleteFile,
    userController.getAllUsers
  )
  .delete(
    // authController.protect,
    // authController.restrictTo("room"),
    userController.deleteUser,
    userController.getAllUsers
  );

module.exports = router;
