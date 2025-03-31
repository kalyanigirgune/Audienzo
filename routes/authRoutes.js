require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const User = require('../models/User');

const router = express.Router();

// Middleware Setup
router.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true
}));

// Sign Up Route
router.get('/signup', (req, res) => {
    res.render('signup', { error: null, success: null });
});

router.post('/signup', async (req, res) => {
    try {
        let { username, email, password, terms } = req.body;

        if (!terms) {
            return res.render('signup', { error: 'You must agree to the Terms and Conditions.', success: null });
        }

        if (username.length < 3) {
            return res.render('signup', { error: 'Username must be at least 3 characters long.', success: null });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('signup', { error: 'Please enter a valid email address.', success: null });
        }

        if (password.length < 6) {
            return res.render('signup', { error: 'Password must be at least 6 characters long.', success: null });
        }

        username = username.toLowerCase();
        email = email.toLowerCase();

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.render('signup', { error: 'Username or Email already exists. Try a different one.', success: null });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();

        return res.render('signup', { error: null, success: 'Signup successful! You can now log in.' });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.render('signup', { error: 'An unexpected error occurred. Please try again.', success: null });
    }
});

// Login Routes
router.get('/login', (req, res) => {
    res.render('login', { error: null, success: null });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('login', { error: 'Both fields are required.', success: null });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.render('login', { error: 'Invalid email format.', success: null });
        }

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('login', { error: 'Invalid email or password.', success: null });
        }

        req.session.user = user;
        return res.redirect('/dashboard'); // Redirect to dashboard after login

    } catch (error) {
        console.error(error);
        return res.render('login', { error: 'An error occurred. Please try again.', success: null });
    }
});

// Logout Route
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.redirect('/');
    });
});

module.exports = router;
