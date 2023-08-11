const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  username: String,
  profilePicture: String,
  rating: Number,
  comment: String,
  country: String,
  flag: String,
  time: Number,
  commented: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Boolean,
    default: false,
  },
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
