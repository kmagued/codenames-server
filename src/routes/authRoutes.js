const jwt = require("jsonwebtoken");
const express = require("express");
const mongoose = require("mongoose");
const User = mongoose.model("User");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.send({ error: "Please provide data required" });
    }

    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res.send({ error: "Please provide a valid mail" });
    }

    if (password.length < 6) {
      return res.send({ error: "Password must be at least 6 characters" });
    }

    const user = new User({
      username,
      email,
      password,
      friends: [],
      games: 0,
      wins: 0,
      chats: [],
    });
    await user.save();
    const token = jwt.sign({ userId: user._id }, "abcd1234");
    if (token) {
      res.send(user);
    }
  } catch (err) {
    return res.send({ error: "Username already exists" });
  }
});

router.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  // if (username.includes("guest") && !password) {
  //   return res.send(username);
  // }

  if (!username || !password) {
    return res.send({ error: "Must provide username and password" });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.send({ error: "Invalid username or password" });
  }
  try {
    await user.comparePassword(password);
    const token = jwt.sign({ userId: user._id }, "abcd1234");
    if (token) {
      res.send(user);
    }
  } catch (err) {
    return res.send({ error: "Invalid username or password" });
  }
});

router.get("/profile/:username", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(422).send({ error: "User not found" });
  }

  res.send(user);
});

module.exports = router;
