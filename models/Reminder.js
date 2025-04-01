const mongoose = require("mongoose");

const ReminderSchema = new mongoose.Schema({
    conferenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Conference", required: true },
    scheduledTime: { type: Date, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["pending", "sent"], default: "pending" }
});

module.exports = mongoose.model("Reminder", ReminderSchema);//.
