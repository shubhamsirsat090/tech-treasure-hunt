const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static("public"));

const gameRoutes = require("./routes/game");
const adminRoutes = require("./routes/admin");

app.use("/api/game", gameRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Tech Treasure Backend Running 🚀");
});

async function seedTeams() {
  const Team = require("./models/Team");
  const routes = [
    ["L1","L2","L3","L4","L5","L6","L7","finish"],
    ["L3","L4","L5","L6","L7","L1","L2","finish"],
    ["L5","L6","L7","L1","L2","L3","L4","finish"],
    ["L2","L3","L4","L5","L6","L7","L1","finish"],
    ["L4","L5","L6","L7","L1","L2","L3","finish"],
    ["L6","L7","L1","L2","L3","L4","L5","finish"],
  ];

  const count = await Team.countDocuments();
  if (count !== 25) {
    await Team.deleteMany({});
    for (let i = 1; i <= 25; i++) {
      await Team.create({
        teamNumber: i,
        teamCode: "TT26" + i,
        route: routes[(i - 1) % routes.length],
        currentStep: 0,
        finished: false,
      });
    }
    console.log("25 teams seeded!");
  } else {
    console.log("Teams ready");
  }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");
    await seedTeams();
    app.listen(5000, () => {
      console.log("Server running on port 5000");
      
      // Keep alive ping every 14 minutes
      setInterval(() => {
        fetch('https://tech-treasure-hunt-2k26.onrender.com/api/game/clue/L1')
          .then(() => console.log('Keep alive ping sent!'))
          .catch(() => console.log('Ping failed'));
      }, 14 * 60 * 1000);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });