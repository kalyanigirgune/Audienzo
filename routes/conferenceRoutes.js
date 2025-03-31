require('dotenv').config();
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Registration = require("../models/Registration");
const Conference = require('../models/Conference');
const { uploadImage } = require('../config/cloudinary');
const multer = require('multer');
const Attendee = require('../models/Attendee');

router.get('/conference/:id', async (req, res) => {
    try {
        const conferenceId = req.params.id;
        const conference = await Conference.findById(req.params.id);
        if (!conference) return res.status(404).send('Conference not found');
        res.render('conferenceDetail', { conference,conferenceId: conferenceId });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


router.get('/conferenceManagement/:id', async (req, res) => {
    const { id } = req.params;
    const { conferenceTitle, conferenceDate, conferenceOrganizer } = req.query;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid Conference ID format.");
        }

        const conference = await Conference.findById(id);
        if (!conference) {
            return res.status(404).send("Conference not found");
        }

        res.render('conferenceManagement', {
            conference,
            conferenceId: conference._id,  
            conferenceTitle,
            conferenceDate,
            conferenceOrganizer
        });
        

    } catch (error) {
        console.error("Error fetching conference:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/add-conference", (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('addConference', { type: 'unpaid', amount: '' });
});

router.post('/add-conference', uploadImage.single('image'), async (req, res) => {
    if (!req.session.user) return res.status(401).send('Unauthorized');

    const { title, date, time, organizer, location, type, amount, deadline, description } = req.body;
    const imageUrl = req.file ? req.file.path : '';

    try {
        const newConference = new Conference({
            title, date, time, organizer, location, type,
            amount: type === "paid" ? amount : null,
            deadline, imageUrl,
            description: description.trim(),
            createdBy: req.session.user._id
        });

        await newConference.save();
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error saving conference");
    }
});

router.get('/editConference/:id', async (req, res) => {
    try {
        const conference = await Conference.findById(req.params.id);
        if (!conference) {
            return res.status(404).send("Conference not found");
        }
        res.render('editConference', {
            conference,
            conferenceId: conference._id,  
            conferenceTitle: conference.title,
            conferenceDate: conference.date,
            conferenceOrganizer: conference.organizer
        });
        
    } catch (error) {
        res.status(500).send("Error retrieving conference details");
    }
});

router.post('/editConference/:id', uploadImage.single('image'), async (req, res) => {
    try {
        const updatedData = {
            title: req.body.title,
            date: req.body.date ? req.body.date.toString() : "",  
            time: req.body.time ? req.body.time.toString() : "",  
            organizer: req.body.organizer,
            location: req.body.location,
            type: req.body.type,
            amount: req.body.type === "paid" ? req.body.amount : null,
            deadline: req.body.deadline ? req.body.deadline.toString() : "",
            description: req.body.description
        };

        if (req.file) {
            console.log("New Image URL:", req.file.path);
            updatedData.imageUrl = req.file.path;  
        }

        const updatedConference = await Conference.findByIdAndUpdate(
            req.params.id, 
            { $set: updatedData },
            { new: true }
        );

        res.redirect('/dashboard');
    } catch (error) {
        console.error("Error updating conference:", error);

    }
});


// Delete Conference Route
router.delete('/delete-conference/:id', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
        const conference = await Conference.findOneAndDelete({
            _id: req.params.id, createdBy: req.session.user._id
        });

        if (!conference) return res.status(404).json({ success: false, message: 'Conference not found' });

        res.json({ success: true, message: "Conference deleted successfully", redirect: "/dashboard" });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



router.get("/attendees/:conferenceId", async (req, res) => {
    try {
        const { conferenceId } = req.params;

        const conference = await Conference.findById(conferenceId);
        if (!conference) {
            return res.status(404).send("Conference not found");
        }

        const attendees = await Registration.find({ conferenceId, attended: true });
        res.render("attendees", { conference, conferenceId, attendees });
    } catch (error) {
        console.error("Error fetching attendees:", error);
        res.status(500).send("Server Error");
    }
});

router.get('/registrants/:conferenceId', async (req, res) => {
    try {
        const conferenceId = req.params.conferenceId;
        console.log("Received Conference ID:", conferenceId);

        const conference = await Conference.findById(conferenceId);
        if (!conference) {
            console.log("Conference not found");
            return res.status(404).send("Conference not found");
        }

        const attendees = await Registration.find({ conferenceId: conferenceId });
    
        res.render('registrants', { conference, attendees,conferenceId: req.params.conferenceId, });
    } catch (error) {
        console.error("Error fetching attendees:", error);
        res.status(500).send("Server error");
    }
});

module.exports = router;
