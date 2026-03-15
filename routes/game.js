const express = require("express");
const router = express.Router();
const Team = require("../models/Team");

const puzzles = {
  L1: { question: "What has keys but no locks, space but no room, and you can enter but can't go inside?", answer: "keyboard" },
  L2: { question: "What runs but never walks, has a mouth but never talks, has a head but never weeps?", answer: "river" },
  L3: { question: "What has a head and tail but no body?", answer: "coin" },
  L4: { question: "I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?", answer: "echo" },
  L5: { question: "What gets wetter the more it dries?", answer: "towel" },
  L6: { question: "What has one eye but cannot see?", answer: "needle" },
  L7: { question: "What can you catch but never throw?", answer: "cold" },
};

// Starting hints for each route
// Each team gets a different first location — this tells them where to go!
const startingHints = {
  L1: "Your journey begins where knowledge lives — head to the place where books and wisdom are found!",
  L2: "Your first clue awaits near flowing water — find the place where things move and flow!",
  L3: "Start your hunt at the place where money and transactions happen on campus!",
  L4: "Listen carefully — your first location is where sound echoes the most on campus!",
  L5: "Feeling hungry? Your first clue is hidden where food and smells fill the air!",
  L6: "Look sharp! Your first location needs a keen eye — head to the craft or design area!",
};

// ── START: get starting hint based on team credentials ──
router.post("/start", async (req, res) => {
  try {
    const { teamNumber, teamCode } = req.body;

    if (!teamNumber || !teamCode) {
      return res.status(400).json({ error: "Please enter team number and code!" });
    }

    const team = await Team.findOne({
      teamNumber: Number(teamNumber),
      teamCode: teamCode.toUpperCase()
    });

    if (!team) {
      return res.status(401).json({ error: "Invalid team number or code!" });
    }

    if (team.finished) {
      return res.status(400).json({ error: "Your team already finished the hunt!" });
    }

    // First location in their route
    const firstLocation = team.route[0];
    const hint = startingHints[firstLocation] || "Head to your first location: " + firstLocation;

    res.json({
      success: true,
      teamNumber: team.teamNumber,
      firstLocation: firstLocation,
      hint: hint
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── VERIFY team + get puzzle ──
router.post("/verify", async (req, res) => {
  try {
    const { teamNumber, teamCode, location } = req.body;

    if (!teamNumber || !teamCode || !location) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const team = await Team.findOne({
      teamNumber: Number(teamNumber),
      teamCode: teamCode.toUpperCase()
    });

    if (!team) {
      return res.status(401).json({ error: "Invalid team number or code!" });
    }

    if (team.finished) {
      return res.status(400).json({ error: "Your team already finished the hunt!" });
    }

    const expectedLocation = team.route[team.currentStep];

    if (expectedLocation !== location.toUpperCase()) {
      return res.status(403).json({
        error: "Wrong location! You should be at " + expectedLocation
      });
    }

    const puzzle = puzzles[expectedLocation];
    if (!puzzle) {
      return res.status(404).json({ error: "No puzzle found for this location!" });
    }

    res.json({
      success: true,
      question: puzzle.question,
      story: puzzle.story || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET CLUE (kept for admin/testing) ──
router.get("/clue/:location", (req, res) => {
  const loc = req.params.location.toUpperCase();
  if (!puzzles[loc]) {
    return res.status(404).json({ error: "Invalid location" });
  }
  res.json({ location: loc, question: puzzles[loc].question });
});

// ── SUBMIT ANSWER ──
router.post("/answer", async (req, res) => {
  try {
    const { teamNumber, teamCode, location, answer } = req.body;

    if (!teamNumber || !teamCode || !location || !answer) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const team = await Team.findOne({
      teamNumber: Number(teamNumber),
      teamCode: teamCode.toUpperCase()
    });

    if (!team) {
      return res.status(401).json({ error: "Invalid team credentials" });
    }

    if (team.finished) {
      return res.status(400).json({ error: "Your team already finished!" });
    }

    const expectedLocation = team.route[team.currentStep];

    if (expectedLocation !== location.toUpperCase()) {
      return res.status(403).json({
        error: "Wrong location!"
      });
    }

    const puzzle = puzzles[location.toUpperCase()];
    if (!puzzle) {
      return res.status(404).json({ error: "No puzzle found!" });
    }

    if (answer.toLowerCase().trim() !== puzzle.answer.toLowerCase().trim()) {
      return res.json({ success: false, message: "Wrong answer! Try again!" });
    }

    // Correct answer — advance step
    team.currentStep += 1;

    if (team.route[team.currentStep] === "finish") {
      team.finished = true;
      team.finishTime = new Date();
      await team.save();
      return res.json({
        success: true,
        finished: true,
        message: "Treasure Hunt Completed!"
      });
    }

    await team.save();

    res.json({
      success: true,
      finished: false,
      nextLocation: team.route[team.currentStep]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;