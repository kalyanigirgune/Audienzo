const mongoose = require('mongoose');

const ConferenceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true }, 
    description: { type: String, required: true }, 
    organizer: { type: String, required: true },
    location: { type: String, required: true },
    deadline: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Conference', ConferenceSchema);
