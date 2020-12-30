const express = require("express");
const mongoose = require("mongoose");
const { restart } = require("nodemon");
const User = mongoose.model("User");

const router = express.Router();

router.post("/search", async (req, res) => {
  const { userInput } = req.body;

  const users = await User.find({ username: userInput });
  res.send(users);
});

router.patch("/addFriend", async (req, res) => {
  const { username, friendName } = req.body;
  const today = new Date();

  const friend = await User.findOne({ username: friendName });

  const updatedFriends = [...friend.friends];
  updatedFriends.push({
    name: username,
    dateAdded:
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate(),
    accepted: false,
  });

  try {
    await User.updateOne(
      { _id: friend._id },
      { $set: { friends: updatedFriends } }
    );
    friend.save();
    friend.friends = updatedFriends;
  } catch (err) {
    console.log("Error");
  }
  res.send({ friend });
});

router.patch("/accept", async (req, res) => {
  const { username, friendName } = req.body;
  const today = new Date();

  const user = await User.findOne({ username });
  const friend = await User.findOne({ username: friendName });

  const newFriends = [...user.friends];
  const friendId = newFriends.findIndex((friend) => friend.name === friendName);
  newFriends[friendId].accepted = true;
  try {
    await User.updateOne({ _id: user._id }, { $set: { friends: newFriends } });
    user.save();
    user.friends = newFriends;
  } catch (err) {
    console.log("Error");
  }

  const updatedFriends = [...friend.friends];
  updatedFriends.push({
    name: username,
    dateAdded:
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate(),
    accepted: true,
  });

  try {
    await User.updateOne(
      { _id: friend._id },
      { $set: { friends: updatedFriends } }
    );
    friend.save();
    friend.friends = updatedFriends;
  } catch (err) {
    console.log("Error");
  }

  res.send({ user, friend });
});

router.patch("/reject", async (req, res) => {
  const { username, friendName } = req.body;

  const user = await User.findOne({ username });

  const newFriends = [...user.friends];
  const friendId = newFriends.findIndex((friend) => friend.name === friendName);
  newFriends.splice(friendId, 1);

  try {
    await User.updateOne({ _id: user._id }, { $set: { friends: newFriends } });
    user.save();
    user.friends = newFriends;
  } catch (err) {
    console.log("Error");
  }
  res.send({ user });
});

module.exports = router;
