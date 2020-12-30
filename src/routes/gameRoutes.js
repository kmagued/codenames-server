const express = require("express");
const mongoose = require("mongoose");
const Room = mongoose.model("Room");

const router = express.Router();

router.patch("/game", async (req, res) => {
  const { roomId, message } = req.body;
  const room = await Room.findById({ roomId });

  if (!room) {
    return res.status(422).send({ error: "room not found" });
  }

  const updatedMessages = [...room.messages];
  updatedMessages.push(message);
  try {
    await Room.updateOne({ roomId }, { $set: { messages: updatedMessages } });
  } catch (err) {
    res.status(422).send({ error: "Room update failed" });
  }

  room.save();
  room.messages = updatedMessages;
  res.send(room);
});

router.post("/game/:id", async (req, res) => {
  const id = req.params.id;
  const { clue, user } = req.body;

  const room = await Room.findById(id);

  if (!room) {
    return res.status(422).send({ error: "Room not found" });
  }

  room.grid.map((item) => {
    if (item.text === clue.toLowerCase()) {
      return res.send({ error: "Clue cannot be a word on the grid" });
    }
  });

  if (!clue) {
    return res.send({ error: "You must enter a clue" });
  }
  if (/\d/.test(clue)) {
    return res.send({ error: "Clue can't contain numbers" });
  }

  if (clue.includes(" ")) {
    return res.send({ error: "The clue must be only one word" });
  }

  const userTeam = room.activePlayers.find((player) => player.name === user)
    .team;

  const updatedLogs = [...room.log];
  updatedLogs.push({ team: userTeam, clue, guesses: [] });

  var curTurn = {};

  room.activePlayers.map((player) => {
    if (player.role === "guesser" && player.team === userTeam) {
      curTurn = player;
    }
  });

  try {
    await Room.updateOne(
      { _id: id },
      {
        $set: {
          log: updatedLogs,
          turn: curTurn,
        },
      }
    );
  } catch (err) {
    res.status(422).send({ error: "Error updating logs" });
  }

  room.turn = curTurn;
  await room.save();

  res.send({ room, error: "" });
});

router.patch("/game/:id", async (req, res) => {
  const id = req.params.id;
  const { word, user, number, clue } = req.body;

  const room = await Room.findById(id);
  if (!room) {
    return res.status(422).send({ error: "Couldn't find room" });
  }
  const wordId = room.grid.findIndex((item) => item.text === word);
  const updatedGrid = [...room.grid];
  updatedGrid[wordId].guessed = true;

  const logId = room.log.findIndex((item) => item.clue === clue);
  const updatedLog = [...room.log];
  updatedLog[logId].guesses = [...updatedLog[logId].guesses, word];

  var settersTurn = {};

  room.activePlayers.map((player) => {
    if (player.role === "setter" && player.team !== user.team) {
      settersTurn = player;
    }
  });

  try {
    await Room.updateOne(
      { _id: id },
      {
        $set: {
          grid: updatedGrid,
          log: updatedLog,
          turn: settersTurn,
        },
      }
    );
  } catch (err) {
    res.status(422).send({ error: "Cannot update room" });
  }

  room.grid = updatedGrid;
  room.log = updatedLog;
  room.turn = settersTurn;

  const team1 = room.grid.filter(
    (word) => word.team === 1 && word.guessed === true
  );

  const team2 = room.grid.filter(
    (word) => word.team === 2 && word.guessed === true
  );

  var endGame = false;

  if (
    updatedGrid[wordId].team === 3 ||
    team1.length === 8 ||
    team2.length === 8
  ) {
    endGame = true;
    try {
      await Room.updateOne(
        { _id: room.id },
        {
          $set: {
            ended: endGame,
          },
        }
      );
      room.save();
      room.ended = endGame;

      if (updatedGrid[wordId].team === 3) {
        return res.send({ room, error: "Game lost" });
      }
    } catch (err) {
      return res.status(422).send({ error: "Cannot update game" });
    }
  }

  if (updatedGrid[wordId].team !== user.team) {
    return res.send({ room, error: "Wrong guess" });
  }

  if (updatedLog[logId].guesses.length === number + 1) {
    return res.send({ room, error: "Enough guessing" });
  }

  res.send({ room, error: "" });
});

module.exports = router;
