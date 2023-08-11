const express = require("express");
const currencyController = require("../controllers/currencyController");
const upload = require("../config/multer");
const deleteFile = require("../utils/deleteFile");
const authController = require("../controllers/authController");

const router = express.Router();

router.route("/toggle-status/:id").patch(
  // authController.protect,
  currencyController.toggleCurrencyStatus
);

router
  .route("/")
  .post(
    upload.upload.single("image"),
    currencyController.createCurrency,
    currencyController.getCurrencies
  )
  .get(currencyController.getCurrencies);

router
  .route("/:id")
  .patch(
    // authController.protect,
    upload.upload.single("symbol"),
    currencyController.updateCurrency,
    deleteFile,
    currencyController.getCurrencies
  )
  .delete(
    // authController.protect,
    // authController.restrictTo("room"),
    currencyController.deleteCurrency,
    deleteFile,
    currencyController.getCurrencies
  )
  .get(currencyController.getACurrency);

module.exports = router;
