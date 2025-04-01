const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Conference = require("../models/Conference");
const Reminder = require("../models/Reminder");
const Registration = require("../models/Registration");

dotenv.config();

// Configure Email Transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Show reminder form
router.get("/setReminder/:conferenceId", async (req, res) => {
    try {
        const conference = await Conference.findById(req.params.conferenceId);
        res.render("setReminder", { conference, messages: req.flash() });
    } catch (err) {
        console.error("Error fetching conference:", err);
        req.flash("error", "Failed to load conference.");
        res.redirect("/dashboard");
    }
});

// Handle reminder submission
router.post("/setReminder/:conferenceId", async (req, res) => {
    try {
        const { scheduledTime, message } = req.body;
        const conferenceId = req.params.conferenceId;

        const newReminder = new Reminder({  
            conferenceId,  
            scheduledTime: new Date(scheduledTime),  // Ensure correct date format
            message,  
            status: "pending"  // Track reminders that haven't been sent
        });  

        await newReminder.save();  
        req.flash("success", "Reminder set successfully!");  
        res.redirect(`/setReminder/${conferenceId}?success=Reminder set successfully!`);  

    } catch (err) {  
        console.error("❌ Error saving reminder:", err);  
        req.flash("error", "Failed to set reminder.");  
        res.redirect("back");  
    }
});

// Function to send reminders
async function sendReminders() {
    try {
        const now = new Date();
        now.setSeconds(0, 0); // Ignore milliseconds for better matching

        console.log("🔍 Checking for reminders...");
        console.log("📅 Current Server Time:", now);

        const reminders = await Reminder.find({ 
            scheduledTime: { $lte: now },  
            status: "pending"  // Ensure only unsent reminders are fetched
        });

        console.log("📌 Found Reminders:", reminders.length);

        for (const reminder of reminders) {  
            const conference = await Conference.findById(reminder.conferenceId);
            const registrations = await Registration.find({ conferenceId: reminder.conferenceId });

            for (const registration of registrations) {  
                try {  
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

            // Mark reminder as sent instead of deleting (for debugging)
            await Reminder.updateOne({ _id: reminder._id }, { status: "sent" });
        }  
    } catch (err) {  
        console.error("❌ Error sending reminders:", err);  
    }
}

// Schedule reminders to check every minute
setInterval(() => {
    try {
        sendReminders();
    } catch (err) {
        console.error("❌ Error in setInterval:", err);
    }
}, 60 * 1000);

module.exports = router;
