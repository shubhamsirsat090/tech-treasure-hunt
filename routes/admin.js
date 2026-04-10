const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const mongoose = require("mongoose");

// Admin password — change this to whatever you want!
const ADMIN_PASSWORD = "123";

// ── PASSWORD CHECK ──
router.post("/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Wrong password!" });
  }
});

// ── MIDDLEWARE: protect all routes below ──
function checkAuth(req, res, next) {
  const password = req.headers["x-admin-password"];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// ── LEADERBOARD ──
router.get("/leaderboard", checkAuth, async (req, res) => {
  try {
    const teams = await Team.find({ finished: true }).sort({ finishTime: 1 });
    const leaderboard = teams.map((t, i) => ({
      rank: i + 1,
      teamNumber: t.teamNumber,
      finishTime: t.finishTime,
    }));
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── ALL TEAMS STATUS ──
router.get("/teams", checkAuth, async (req, res) => {
  try {
    const teams = await Team.find().sort({ teamNumber: 1 });
    const status = teams.map((t) => ({
      teamNumber: t.teamNumber,
      teamCode: t.teamCode,
      currentStep: t.currentStep,
      currentLocation: t.route[t.currentStep] || "finished",
      totalSteps: t.route.length - 1,
      finished: t.finished,
      finishTime: t.finishTime || null,
    }));
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── RESET ONE TEAM ──
router.post("/reset/:teamNumber", checkAuth, async (req, res) => {
  try {
    const team = await Team.findOne({ teamNumber: Number(req.params.teamNumber) });
    if (!team) return res.status(404).json({ error: "Team not found" });
    team.currentStep = 0;
    team.finished = false;
    team.finishTime = undefined;
    await team.save();
    res.json({ success: true, message: `Team ${team.teamNumber} has been reset` });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// ── RESET ALL TEAMS ──
router.post("/resetall", checkAuth, async (req, res) => {
  try {
    await Team.updateMany({}, { currentStep: 0, finished: false, finishTime: null });
    res.json({ success: true, message: "All teams reset!" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── GAME LOCK ──
router.post("/lock", checkAuth, async (req, res) => {
  try {
    await mongoose.connection.collection('settings').updateOne(
      { key: 'gameLocked' },
      { $set: { key: 'gameLocked', value: true } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Game locked!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GAME UNLOCK ──
router.post("/unlock", checkAuth, async (req, res) => {
  try {
    await mongoose.connection.collection('settings').updateOne(
      { key: 'gameLocked' },
      { $set: { key: 'gameLocked', value: false } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Game unlocked!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GAME STATUS ──
router.get("/gamestatus", checkAuth, async (req, res) => {
  try {
    const setting = await mongoose.connection.collection('settings').findOne({ key: 'gameLocked' });
    res.json({ locked: setting ? setting.value : true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;