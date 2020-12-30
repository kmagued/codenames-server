const express = require("express");
const mongoose = require("mongoose");
const randomWords = require("random-words");
const Room = mongoose.model("Room");

const router = express.Router();
//FETCH ROOMS - Working fine
router
  .route("/rooms")
  //FETCH ROOMS
  .get(async (req, res) => {
    const rooms = await Room.find();
    res.send(rooms);
  })
  //CREATE ROOM
  .post(async (req, res) => {
    const { name, password, numOfPlayers, timeLimit } = req.body;

    const coloredWords = [];
    const words = randomWords({ exactly: 24, maxLength: 7 });

    words.map((word) => {
      const index = words.indexOf(word);

      if (index < 8) {
        coloredWords.push({ text: word, team: 1, guessed: false });
      } else if (index < 16) {
        coloredWords.push({ text: word, team: 2, guessed: false });
      } else if (index === 16) {
        coloredWords.push({ text: word, team: 3, guessed: false });
      } else {
        coloredWords.push({ text: word, team: 0, guessed: false });
      }
    });

    coloredWords.sort(() => Math.random() - 0.5);

    try {
      const room = new Room({
        name,
        password,
        numOfPlayers,
        timeLimit,
        activePlayers: [],
        ended: false,
        grid: coloredWords,
        messages: [],
        log: [],
        turn: {},
      });
      await room.save();
      res.send(room);
    } catch (err) {
      res.status(422).send({ error: "Couldn't create room" });
    }
  })
  //LEAVE ROOM
  .patch(async (req, res) => {
    const { id, user } = req.body;

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).send({ error: "Error finding room" });
    }

    const players = [...room.activePlayers];

    if (players.find((player) => player.name === user.username)) {
      const updatedPlayers = players.filter(
        (player) => player.name !== user.username
      );

      if (updatedPlayers.length <= 0) {
        try {
          await Room.deleteOne({ _id: room._id });
          return res.send({ delete: true });
        } catch (err) {
          return res.send({ error: "Error deleting room" });
        }
      } else {
        try {
          await Room.updateOne(
            { _id: room._id },
            { $set: { activePlayers: updatedPlayers } }
          );
        } catch (err) {
          return res.send("Error updating room");
        }
      }
      room.activePlayers = updatedPlayers;
      await room.save();
    } else {
      res.send({ delete: true });
    }
    res.send(room);
  });

//JOIN ROOM
router
  .route("/rooms/:id")
  .post(async (req, res) => {
    const id = req.params.id;
    const { password, user } = req.body;

    const room = await Room.findById(id);

    if (!room) {
      return res.send({ error: "Room not found" });
    }

    if (room.activePlayers.find((player) => player.name === user.username)) {
      return res.send({ room, error: "" });
    }

    if (room.activePlayers.length === room.numOfPlayers) {
      return res.send({ error: "Room is full" });
    }

    if (room.password) {
      try {
        await room.comparePassword(password);
      } catch (err) {
        return res.send({ error: "Incorrect password" });
      }
    }

    res.send({ room, error: "" });
  })
  .patch(async (req, res) => {
    const { user, role, team } = req.body;
    const id = req.params.id;

    const room = await Room.findById(id);
    if (!room) {
      res.status(404).send({ error: "Error finding game" });
    }
    const players = [...room.activePlayers];

    const index = players.findIndex((player) => player.name === user.username);

    if (players.length !== 0 && index != -1) {
      players[index].role = role;
      players[index].team = team;
    } else {
      players.push({
        name: user.username,
        role,
        team,
      });
    }
    var turn = {};
    players.map((player) => {
      if (player.role === "setter" && player.team === 1) {
        turn = player;
      }
    });

    await Room.updateOne(
      { _id: room._id },
      {
        $set: {
          activePlayers: players,
          turn,
        },
      }
    );
    room.activePlayers = players;
    await room.save();
    res.send(room);
  });

module.exports = router;
