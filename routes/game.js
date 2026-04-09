const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const mongoose = require("mongoose");

async function isGameLocked() {
  const setting = await mongoose.connection.collection('settings').findOne({ key: 'gameLocked' });
  return setting ? setting.value : true;
}

const puzzles = {
  L1: { question: "What is 2 + 2?", answer: "4" },
  L2: { question: "What color is the sky?", answer: "blue" },
  L3: { question: "How many days in a week?", answer: "7" },
  L4: { question: "What is the capital of India?", answer: "delhi" },
  L5: { question: "How many fingers on one hand?", answer: "5" },
  L6: { question: "What comes after Monday?", answer: "tuesday" },
  L7: { question: "How many hours in a day?", answer: "24" },
};

const startingHints = {
  L1: "TEST HINT — Go to Location 1",
  L2: "TEST HINT — Go to Location 2",
  L3: "TEST HINT — Go to Location 3",
  L4: "TEST HINT — Go to Location 4",
  L5: "TEST HINT — Go to Location 5",
  L6: "TEST HINT — Go to Location 6",
  L7: "TEST HINT — Go to Location 7",
};

// ── START: get starting hint based on team credentials ──
router.post("/start", async (req, res) => {
  try {
    const { teamNumber, teamCode } = req.body;

    const locked = await isGameLocked();
    if (locked) {
      return res.status(403).json({ error: "Game not started yet! Please wait for the organizer to start the game." });
    }

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

    const locked = await isGameLocked();
    if (locked) {
      return res.status(403).json({ error: "Game not started yet! Please wait for the organizer to start the game." });
    }

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