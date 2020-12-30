const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const roomSchema = new mongoose.Schema({
  name: String,
  password: String,
  numOfPlayers: Number,
  activePlayers: [
    {
      name: String,
      team: Number,
      role: String,
    },
  ],
  timeLimit: Number,
  grid: [
    {
      text: String,
      team: Number,
      guessed: Boolean,
    },
  ],
  log: [
    {
      team: Number,
      clue: String,
      guesses: Array,
    },
  ],
  ended: Boolean,
  turn: {
    name: String,
    team: Number,
    role: String,
  },
});

roomSchema.pre("save", function (next) {
  const room = this;
  if (!room.isModified("password")) {
    return next();
  }

  if (room.password) {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        return next(err);
      }

      bcrypt.hash(room.password, salt, (err, hash) => {
        if (err) {
          return next(err);
        }
        room.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

roomSchema.methods.comparePassword = function (enteredPassword) {
  const room = this;

  return new Promise((resolve, reject) => {
    bcrypt.compare(enteredPassword, room.password, (err, matched) => {
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

mongoose.model("Room", roomSchema);
