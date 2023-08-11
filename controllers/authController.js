const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Signup = require("../models/signupModel");
const Referral = require("../models/referralModel");
const Company = require("../models/companyModel");
const Comment = require("../models/commentModel");
const Notification = require("../models/notificationModel");
const Related = require("../models/relatedModel");
const Email = require("../models/emailModel");
const AppError = require("../utils/appError");
const SendEmail = require("../utils/email");
const catchAsync = require("../utils/catchAsync");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRETE, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, code, message) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    user,
    code,
    message,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const data = req.body;
  data.status = "User";

  const numberOfUsers = await User.find();

  //CHECK FOR THE NUMBER OF USERS TO ASSIGN ADMIN
  if (numberOfUsers.length == 0) {
    data.status = "Admin";
    data.suspension = false;
    const user = await User.create(data);
    createSendToken(
      user,
      201,
      res,
      "admin",
      "Congratulations, you have register as an admin, please login to continue"
    );
  } else {
    // VALIDATE THE BASIC RECEIVED FIELDS
    const result = validateUser(
      data.username,
      data.firstName,
      data.lastName,
      data.email,
      data.password,
      data.phoneNumber
    );

    if (result != true) {
      return next(new AppError(result, 401));
    }

    const user = await User.findOne({ username: data.username });

    if (user) {
      return next(
        new AppError(
          `Sorry, a user with this username ${user.username} already exist`,
          500
        )
      );
    }

    const email = await User.findOne({ email: data.email });
    if (email) {
      return next(
        new AppError(
          `Sorry, a user with this email ${email.email} already exist`,
          500
        )
      );
    }

    const phone = await User.findOne({ email: data.phoneNumber });
    if (phone) {
      return next(
        new AppError(
          `Sorry, a user with this email ${phone.phoneNumber} already exist`,
          500
        )
      );
    }

    if (data.autoRegister) {
      data.suspension = false;
      const user = await User.create(data);
      await Related.create(data);
      createSendToken(user, 201, res, "auto", "");
    } else {
      const signupResult = await Signup.find();
      const signup = signupResult[0];
      if (signup) {
        //----------CHECK FOR EMAIL---------------
        if (signup.email) {
          data.suspension = true;
        } else {
          data.suspension = false;
        }
      }

      const user = await User.create(data);

      if (signup.email) {
        prepareEmail(user, "confirm-registration");

        createSendToken(
          user,
          201,
          res,
          "verify",
          "Activate your account by verifying the email sent to you"
        );
      } else {
        const msg =
          "Congrats, you have successfully signed up, kindly login to continue.";
        createUserRecords(user, res, msg);
      }
    }
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError("Please provide username and password!", 400));
  }

  const user = await User.findOne({ username }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect username or password", 401));
  }

  const company = await Company.find();

  if (user.suspension) {
    return next(
      new AppError(
        `Activate your account by verifying the ${company[0].companyName} email sent to you`,
        401
      )
    );
  }

  createSendToken(user, 200, res);
});

exports.getAUser = catchAsync(async (req, res, next) => {
  let token;
  // let io = req.io;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRETE);

  // //3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next();

  createSendToken(currentUser, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on Posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address", 404));
  }
  //2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const company = await Company.findOne();
  const email = await Email.findOne({ template: "reset-password" });

  if (!email) {
    return next(
      new AppError("Sorry, no email set for this operation yet!", 404)
    );
  }

  const domainName = company.companyDomain;
  const resetURL = `${domainName}/change-password/?token=${resetToken}`;
  const content = email.content.replace("{{username}}", `${user.username}`);
  const banner = "";

  try {
    new SendEmail(company, user, email, banner, content, resetURL).sendEmail();
  } catch (err) {
    return next(
      new AppError(
        `There was an error sending the email. Try again later!, ${err}`,
        500
      )
    );
  }

  res.status(200).json({
    status: "success",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.cPassword = req.body.cPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  //3) Update changedPasswordAt property for the user

  //4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the id
  const user = await User.findById(req.user.id).select("+password");

  //2) If token has not expired, and there is a user, set the new password
  if (!(await user.correctPassword(req.body.oldPassword, user.password))) {
    return next(new AppError("Your current password is wrong", 401));
  }

  if (req.body.password != req.body.cPassword) {
    return next(new AppError("Your passwords do not match"));
  }
  user.password = req.body.password;
  user.cPassword = req.body.cPassword;

  await user.save();

  //3) Update changedPasswordAt property for the user

  //4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting the token and check if it exist
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError(
        "Sorry, you are not logged in! Please login to get access",
        401
      )
    );
  }

  //2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRETE);
  //3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(new AppError("Sorry you no longer exist in the database", 401));

  //4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(`User recently changed password! Please login again`, 401)
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  req.token = token;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.staffType)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

exports.activateAUser = catchAsync(async (req, res, next) => {
  let token = req.params.id;

  const oldUser = await User.findById(token);

  if (!oldUser) {
    return next(
      new AppError("User does not exist, please signup to continue.", 400)
    );
  }

  if (oldUser.suspension == false) {
    return next(
      new AppError(
        "You have been activated already, please login to continue.",
        400
      )
    );
  }

  const msg = "Your account has been activated, kindly login to continue";
  createUserRecords(oldUser, res, msg);
});

function validateUser(
  username,
  firstName,
  lastName,
  email,
  password,
  phoneNumber
) {
  const regex = /^.{3,}$/;
  const regexUser = /^.{1,}$/;
  const phoneRegex = /^[0-9+]+$/;

  if (!regexUser.test(username)) {
    return "Username must be at least 2 characters long";
  }

  if (!regexUser.test(firstName)) {
    return "First name must be at least 2 characters long";
  }

  if (!regexUser.test(lastName)) {
    return "Last name must be at least 2 characters long";
  }

  if (!regex.test(password)) {
    return "Password must be at least 3 characters long";
  }

  if (phoneNumber) {
    if (!phoneRegex.test(phoneNumber)) {
      return "Please enter a valid phone number";
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return "Invalid email address";
  }

  // All validations passed
  return true;
}

const createUserRecords = async (userData, res, msg) => {
  const user = await User.findByIdAndUpdate(userData._id, {
    suspension: false,
    status: "User",
  });

  await Comment.create({
    username: user.username,
    country: user.country,
    flag: user.countryFlag,
    profilePicture: user.profilePicture,
    commented: false,
  });

  const referral = await User.findOne({ username: user.referredBy });
  if (referral != null || referral != undefined) {
    const form = {
      username: user.username,
      regDate: user.regDate,
    };

    referral.referrals.push(form);
    await User.findByIdAndUpdate(referral._id, {
      referrals: referral.referrals,
      hasReferred: true,
    });

    await Referral.create({
      username: referral.username,
      referralUsername: user.username,
      regDate: user.regDate,
    });

    prepareEmail(referral, "referral-signup", user);
  }

  prepareEmail(user, "registration-successful", user);

  createSendToken(user, 200, res, "User", msg);
};

const prepareEmail = async (user, template, secondUser) => {
  const email = await Email.findOne({
    template: template,
  });
  const company = await Company.findOne();

  const content = email.content
    .replace("{{company-name}}", company.companyName)
    .replace("{{fullName}}", `${user.fullName}`)
    .replace("{{username}}", `${secondUser.username}`);
  const companyInfo = {
    email: company.systemEmail,
    username: user.username,
  };

  const resetURL = `${company.companyDomain}/confirm-registration?token=${user._id}`;
  const banner = `${company.companyDomain}/uploads/${email.banner}`;

  const users = [companyInfo, user];

  users.forEach((user) => {
    try {
      new SendEmail(
        company,
        user,
        email,
        banner,
        content,
        resetURL
      ).sendEmail();
    } catch (err) {
      return next(
        new AppError(
          `There was an error sending the email. Try again later!, ${err}`,
          500
        )
      );
    }
  });

  const form = {
    username: user.username,
    time: new Date().getTime(),
    message: content,
    subject: email.title,
  };

  await Notification.create(form);
};
