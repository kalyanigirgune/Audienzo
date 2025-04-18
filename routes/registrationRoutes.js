require('dotenv').config();
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Conference = require('../models/Conference');
const cloudinary = require('cloudinary').v2;
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const flash = require('express-flash');
const session = require('express-session');

// Ensure session is configured properly
router.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
router.use(flash());

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// GET: Registration Form
router.get('/register/:id', async (req, res) => {
    try {
        const conference = await Conference.findById(req.params.id);
        if (!conference) {
            req.flash('error', 'Conference not found.');
            return res.redirect('/');
        }
        res.render('register', { conferenceId: req.params.id });
    } catch (err) {
        console.error('Error fetching conference:', err);
        req.flash('error', 'Server error. Please try again later.');
        res.redirect('/');
    }
});

// POST: Handle Registration Submission
router.post('/register/:id', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        console.log("Received registration request:", req.body);
        console.log("Session data:", req.session);
        console.log(name,email,phone);
        if (!name || !email || !phone) {
            return res.json({ success: false, message: 'All fields are required.' });
        }

        // Check if the user has verified OTP
        if (!req.session.verified || req.session.email !== email) {
            return res.json({ success: false, message: 'Email not verified. Please verify OTP first.' });
        }

        const conferenceId = req.params.id;
        const conference = await Conference.findById(conferenceId);
        if (!conference) {
            return res.json({ success: false, message: 'Conference not found.' });
        }

        const deadlineDate = new Date(conference.deadline);
        deadlineDate.setHours(23, 59, 59, 999); // Set to end of the day

        if (new Date() > deadlineDate) {
        return res.json({ success: false, message: 'Registration deadline has passed.' });
        }

        const existingRegistration = await Registration.findOne({ conferenceId, email });
        if (existingRegistration) {
            return res.json({ success: false, message: 'You have already registered for this conference.' });
        }

        const qrData = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nConference: ${conference.title}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrData);

        console.log("Generated QR Code Data URL");

        // Upload QR code to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(qrCodeDataUrl, {
            folder: 'conference_qr_codes',
            public_id: `QR_${conferenceId}_${Date.now()}`
        });

        console.log("Upload result:", uploadResult);

        const qrCodeUrl = uploadResult.secure_url;

        // Save registration data
        const newRegistration = new Registration({ conferenceId, name, email, phone, qrCodeUrl });
        await newRegistration.save();

        console.log("Saved registration to DB");

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Registration Confirmation - ${conference.title}`,
            html: `<p>Dear ${name}, you have successfully registered for ${conference.title}. Your QR code is below:</p>
                   <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 250px;">`
        };
        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: 'Registration successful! Check your email for confirmation.' });
    } catch (err) {
        console.error('Error processing registration:', err);
        return res.json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.json({ success: false, message: 'Email is required.' });

        const otp = Math.floor(100000 + Math.random() * 900000);
        req.session.otp = otp;
        req.session.email = email;
        req.session.verified = false; // Reset verification status

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Conference Registration OTP',
            text: `Your OTP for registration is: ${otp}`
        };
        await transporter.sendMail(mailOptions);

        console.log(`OTP sent to ${email}: ${otp}`);

        return res.json({ success: true, message: 'OTP sent to your email.' });
    } catch (err) {
        console.error('Error sending OTP:', err);
        return res.json({ success: false, message: 'Error sending OTP. Try again.' });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.json({ success: false, message: 'Email and OTP are required.' });

        if (req.session.otp && req.session.otp == otp && req.session.email === email) {
            req.session.verified = true;
            console.log(`OTP verified for ${email}`);
            return res.json({ success: true, message: 'OTP verified successfully.' });
        }

        return res.json({ success: false, message: 'Invalid OTP. Try again.' });
    } catch (err) {
        console.error('Error verifying OTP:', err);
        return res.json({ success: false, message: 'Error verifying OTP. Try again.' });
    }
});

module.exports = router;
