require("./models/User");
require("./models/Room");
const express = require("express");
const mongoose = require("mongoose");
const socketio = require("socket.io");
const http = require("http");

const app = express();
const server = http.Server(app);
const io = socketio(server);

const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const gameRoutes = require("./routes/gameRoutes");
const userRoutes = require("./routes/userRoutes");
const requireAuth = require("./middlewares/requireAuth");

app.use(bodyParser.json());
app.use(authRoutes);
app.use(roomRoutes);
app.use(gameRoutes);
app.use(userRoutes);

const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to mongo instance");
});

mongoose.connection.on("error", (err) => {
  console.error("Error connecting to mongo\n", err);
});

app.get("/", requireAuth, (req, res) => {
  res.send(req.user);
});

const onlineUsers = [];

io.on("connection", (socket) => {
  socket.on("user", (data) => {
    onlineUsers.push(data);
    console.log(data.username, "is now online");
  });

  //JOIN ROOM
  socket.on("join", (room) => {
    socket.join(room._id);
  });

  //LEAVE ROOM
  socket.on("leave", (room) => {
    socket.leave(room._id);
  });

  //UPDATE PLAYERS IN WAITING ROOM
  socket.on("update", (room) => {
    io.in(room._id).emit("players", room.activePlayers);
  });

  //SELECT SETTER
  socket.on("nextSetter", (data) => {
    console.log("SETTER TURN:", data.user);
    io.in(data.room._id).emit("curSetterTurn", data.user);
  });

  socket.on("joinGame", (room) => {
    socket.join(room._id);
  });

  //SELECT GUESSER
  socket.on("nextGuesser", (data) => {
    console.log("GUESSER TURN:", data.user);
    io.in(data.room._id).emit("curGuesserTurn", {
      turn: data.user,
      clue: data.clue,
      number: data.number,
    });
  });

  //UPDATE GRID
  socket.on("updateGrid", (data) => {
    data.game.log.map((log) => {
      if (log.clue === data.clue) {
        io.in(data.room._id).emit("grid", {
          grid: data.game.grid,
          guesses: log.guesses,
        });
      }
    });
  });

  //HANDLE LOSS
  socket.on("lost", (data) => {
    data.room.activePlayers.map((player) => {
      if (player.name === data.user.name) {
        io.in(data.room._id).emit("game finished", player.team === 1 ? 2 : 1);
      }
    });
  });

  //HANDLE WIN
  socket.on("won", (data) => {
    data.room.activePlayers.map((player) => {
      if (player.name === data.user.name) {
        io.in(data.room._id).emit("game finished", data.word.team);
      }
    });
  });

  //MESSAGE
  socket.on("send message", (data) => {
    io.in(data.room._id).emit("message", {
      user: data.user,
      msg: data.text,
      team: data.team,
    });
  });
});

server.listen(80);

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
