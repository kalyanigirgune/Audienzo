const express = require("express"); const router = express.Router(); const nodemailer = require("nodemailer"); const dotenv = require("dotenv"); const Conference = require("../models/Conference"); const Reminder = require("../models/Reminder"); const Registration = require("../models/Registration");

dotenv.config();

// Configure Email Transporter const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS, }, });

// Show reminder form router.get("/setReminder/:conferenceId", async (req, res) => { try { const conference = await Conference.findById(req.params.conferenceId); res.render("setReminder", { conference, messages: req.flash() }); } catch (err) { console.error("Error fetching conference:", err); req.flash("error", "Failed to load conference."); res.redirect("/dashboard"); } });

// Handle reminder submission router.post("/setReminder/:conferenceId", async (req, res) => { try { const { scheduledTime, message } = req.body; const conferenceId = req.params.conferenceId;

const newReminder = new Reminder({
        conferenceId,
        scheduledTime,
        message
    });

    await newReminder.save();
    req.flash("success", "Reminder set successfully!");
    res.redirect(`/setReminder/${conferenceId}`);
} catch (err) {
    console.error("Error setting reminder:", err);
    req.flash("error", "Failed to set reminder.");
    res.redirect("back");
}

});

// Function to send reminders async function sendReminders() { try { console.log("⏳ Checking for due reminders..."); const now = new Date(); const reminders = await Reminder.find({ scheduledTime: { $lte: now } });

if (reminders.length === 0) {
        console.log("✅ No reminders due.");
        return;
    }

    for (const reminder of reminders) {
        const conference = await Conference.findById(reminder.conferenceId);
        const registrations = await Registration.find({ conferenceId: reminder.conferenceId });
        
        if (!registrations.length) {
            console.warn(`⚠️ No registrations found for conference: ${conference.title}`);
        }

        for (const registration of registrations) {
            console.log(`📨 Sending email to: ${registration.email}`);
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
        
        await Reminder.deleteOne({ _id: reminder._id });
        console.log(`🗑️ Reminder deleted after successful emails.`);
    }
} catch (err) {
    console.error("❌ Error sending reminders:", err);
}

}

// Schedule reminders to check every minute setInterval(() => { sendReminders().catch(err => console.error("❌ Uncaught error in setInterval:", err)); }, 60 * 1000);

module.exports = router;

