const express = require("express");
const router = express.Router();
const Team = require("../models/Team");

const puzzles = {
  L1: {
    question: "What has keys but no locks, space but no room, and you can enter but can't go inside?",
    answer: "keyboard"
  },
  L2: {
    question: "What runs but never walks, has a mouth but never talks, has a head but never weeps?",
    answer: "river"
  },
  L3: {
    question: "I am always ahead of you in a race but you can never see me or touch me. I scare some and excite others. What am I?",
    answer: "future"
  },
  L4: {
    question: "I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?",
    answer: "echo"
  },
  L5: {
    question: "I am the one thing you always throw away when you need me and always pick up when you don't. What am I?",
    answer: "anchor"
  },
  L6: {
    question: "A man builds a house with 4 walls. Every wall faces south. A bear walks past. What color is the bear?",
    answer: "white"
  },
  L7: {
    question: "What can you catch but never throw?",
    answer: "cold"
  },
};

// Starting hints for each route
// Each team gets a different first location — this tells them where to go!
const startingHints = {
  L1: "Your hunt begins where hunger dies between lectures — the place every student runs to when the clock strikes break time!",
  L2: "Your hunt begins where metal beasts stand in perfect silence, dreaming of roads they have not yet traveled. They wait in rows, loyal and still!",
  L3: "Your hunt begins where fire and iron dance together — where raw hands shape raw metal into something the world has never seen!",
  L4: "Your hunt begins at the tiny kingdom that never sleeps and never says no — standing guard near where the girls live!",
  L5: "Your hunt begins at the building that holds a thousand futures locked in files and folders — standing quietly between the sleeping metal beasts of those who teach you!",
  L6: "Your hunt begins at the ground that has heard every secret, every laugh and every dream — hiding silently behind the hall of great words!",
  L7: "Your hunt begins at the place that has no roof yet shelters hundreds — no kitchen yet feeds the soul. Every student knows exactly where it is at noon!",
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