const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const Conference = require("../models/Conference");
const Reminder = require("../models/Reminder");
const Registration = require("../models/Registration");

dotenv.config();

// ✅ Configure Email Transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Show reminder form
router.get("/setReminder/:conferenceId", async (req, res) => {
    try {
        const conference = await Conference.findById(req.params.conferenceId);
        res.render("setReminder", { 
            conference,
            messages: req.flash()  
        });
    } catch (err) {
        console.error("Error fetching conference:", err);
        req.flash("error", "Failed to load conference.");
        res.redirect("/dashboard");
    }
});

// ✅ Handle reminder submission
router.post("/setReminder/:conferenceId", async (req, res) => {
    try {
        let { scheduledTime, message } = req.body;
        const conferenceId = req.params.conferenceId;

        // ✅ Convert scheduled time to IST
        const scheduledDate = new Date(scheduledTime);
        scheduledDate.setHours(scheduledDate.getHours() + 5);
        scheduledDate.setMinutes(scheduledDate.getMinutes() + 30);

        const newReminder = new Reminder({
            conferenceId,
            scheduledTime: scheduledDate,  // Store IST time
            message
        });

        await newReminder.save();
        req.flash("success", "Reminder set successfully!");
        res.redirect(`/setReminder/${conferenceId}?success=Reminder set successfully!`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Failed to set reminder.");
        res.redirect("back");
    }
});

// ✅ Function to schedule a reminder
function scheduleReminder(reminder) {
    const delay = new Date(reminder.scheduledTime) - new Date();
    if (delay > 0) {
        setTimeout(async () => {
            try {
                const conference = await Conference.findById(reminder.conferenceId);
                const registrations = await Registration.find({ conferenceId: reminder.conferenceId });

                for (const registration of registrations) {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: registration.email,
                        subject: `Reminder: ${conference.title}`,
                        text: reminder.message,
                    });
                    console.log(`✅ Reminder sent to ${registration.email}`);
                }

                // ✅ Mark as sent
                reminder.status = "sent";
                await reminder.save();
                console.log(`🗑️ Reminder marked as sent: ${reminder._id}`);
            } catch (err) {
                console.error("❌ Error sending reminder:", err);
            }
        }, delay);
    }
}

// ✅ Schedule existing reminders on server start
(async function scheduleExistingReminders() {
    try {
        const reminders = await Reminder.find({ status: "pending" });
        console.log(`🔄 Rescheduling ${reminders.length} pending reminders...`);
        reminders.forEach(scheduleReminder);
    } catch (err) {
        console.error("❌ Error scheduling reminders on startup:", err);
    }
})();

module.exports = router;
