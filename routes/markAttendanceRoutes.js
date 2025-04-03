const express = require("express");
const router = express.Router();
const Registration = require("../models/Registration");
const mongoose = require("mongoose");

// Route to render the attendance page
router.get("/markAttendance/:conferenceId", (req, res) => {
    res.render("markAttendance", { conferenceId: req.params.conferenceId });
});

// Route to mark attendance
router.post("/markAttendance/:conferenceId", async (req, res) => {
    try {
        const { email } = req.body;
        let { conferenceId } = req.params;

        // Convert conferenceId to ObjectId if it's valid
        if (mongoose.Types.ObjectId.isValid(conferenceId)) {
            conferenceId = new mongoose.Types.ObjectId(conferenceId);
        }

        // Find the registered user for the given conference
        const user = await Registration.findOne({ email, conferenceId });

        if (!user) {
            return res.status(404).json({ message: "❌ User not registered for this conference!" });
        }

        // Mark attendance
        user.attended = true;
        await user.save();

        return res.json({ message: "✅ Attendance marked successfully!" });

    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ message: "❌ Server Error" });
    }
});

module.exports = router;
