const express = require("express");
const router = express.Router();
const Registration = require("../models/Registration");
const mongoose = require("mongoose");

router.get("/markAttendance/:conferenceId", (req, res) => {
    res.render("markAttendance", { conferenceId: req.params.conferenceId });
});

router.post("/markAttendance/:conferenceId", async (req, res) => {
    try {
        const { email } = req.body;
        let { conferenceId } = req.params;

        if (mongoose.Types.ObjectId.isValid(conferenceId)) {
            conferenceId = new mongoose.Types.ObjectId(conferenceId);
        }

        const user = await Registration.findOne({ email, conferenceId });

        if (!user) {
            return res.status(404).json({ message: "❌ User not registered for this conference!" });
        }

        user.attended = true;
        await user.save();

        return res.json({ message: "✅ Attendance marked successfully!" });

    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ message: "❌ Server Error" });
    }
});

module.exports = router; 
