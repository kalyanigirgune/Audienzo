const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Conference = require("../models/Conference");
const Reminder = require("../models/Reminder");
const Registration = require("../models/Registration");

dotenv.config();

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Make sure this is set in .env
        pass: process.env.EMAIL_PASS, // Use App Password if needed
    },
});

// ✅ Show reminder form
router.get("/setReminder/:conferenceId", async (req, res) => {
    try {
        const conference = await Conference.findById(req.params.conferenceId);
        if (!conference) {
            req.flash("error", "Conference not found.");
            return res.redirect("/dashboard");
        }

        res.render("setReminder", { conference, messages: req.flash() });
    } catch (err) {
        console.error("❌ Error fetching conference:", err);
        req.flash("error", "Failed to load conference.");
        res.redirect("/dashboard");
    }
});

// ✅ Handle reminder submission
router.post("/setReminder/:conferenceId", async (req, res) => {
    try {
        const { scheduledTime, message } = req.body;
        const conferenceId = req.params.conferenceId;

        if (!scheduledTime || !message) {
            req.flash("error", "All fields are required.");
            return res.redirect("back");
        }

        const newReminder = new Reminder({
            conferenceId,
            scheduledTime: new Date(scheduledTime),
            message,
        });

        await newReminder.save();
        console.log("✅ Reminder saved:", newReminder);
        req.flash("success", "Reminder set successfully!");
        res.redirect(`/setReminder/${conferenceId}`);
    } catch (err) {
        console.error("❌ Error setting reminder:", err);
        req.flash("error", "Failed to set reminder.");
        res.redirect("back");
    }
});

// ✅ Function to send reminders
async function sendReminders() {
    try {
        console.log("🔍 Checking for reminders...");
        const now = new Date();
        now.setSeconds(0, 0); // Remove milliseconds for better comparison
        console.log("🕒 Current Server Time:", now);

        const reminders = await Reminder.find({ scheduledTime: { $lte: now } });

        console.log("📌 Found Reminders:", reminders.length);
        if (reminders.length === 0) return;

        for (const reminder of reminders) {
            console.log(`📩 Processing reminder for conference ID: ${reminder.conferenceId}`);

            const conference = await Conference.findById(reminder.conferenceId);
            if (!conference) {
                console.error(`❌ Conference not found for ID: ${reminder.conferenceId}`);
                continue;
            }

            const registrations = await Registration.find({ conferenceId: reminder.conferenceId });
            if (registrations.length === 0) {
                console.log("⚠️ No registrations found for this conference.");
                continue;
            }

            for (const registration of registrations) {
                try {
                    console.log(`📧 Sending email to: ${registration.email}`);
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: registration.email,
                        subject: `Reminder: ${conference.title}`,
                        text: reminder.message,
                    });
                    console.log(`✅ Reminder sent to ${registration.email}`);
                } catch (emailErr) {
                    console.error(`❌ Failed to send email to ${registration.email}:`, emailErr);
                }
            }

            await Reminder.updateOne({ _id: reminder._id }, { status: "sent" });
            console.log(`✅ Marked reminder ${reminder._id} as sent.`);
        }
    } catch (err) {
        console.error("❌ Error sending reminders:", err);
    }
}


// ✅ Call `sendReminders()` at startup to check immediately
setTimeout(() => {
    console.log("🚀 Initializing reminder check...");
    sendReminders();
}, 5000); // Wait 5s after server starts

// ✅ Schedule reminders to check every minute
setInterval(() => {
    try {
        sendReminders();
    } catch (err) {
        console.error("❌ Error in scheduled reminder task:", err);
    }
}, 60 * 1000);

module.exports = router;
