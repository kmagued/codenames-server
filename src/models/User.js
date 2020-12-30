const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  friends: [{ name: String, dateAdded: Date, accepted: Boolean }],
  games: Number,
  wins: Number,
  chats: [
    {
      members: Array,
      messages: {
        sender: String,
        msg: String,
        time: String,
      },
    },
  ],
});

userSchema.pre("save", function (next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }

    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function (enteredPassword) {
  const user = this;

  return new Promise((resolve, reject) => {
    bcrypt.compare(enteredPassword, user.password, (err, matched) => {
      if (err) {
        return reject(err);
      }
      if (!matched) {
        return reject(false);
      }
      resolve(true);
    });
  });
};

mongoose.model("User", userSchema);
