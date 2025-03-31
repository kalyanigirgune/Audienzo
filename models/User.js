const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true,  
        minlength: [3, 'Username must be at least 3 characters long']  
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,  
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']  
    },
    password: { 
        type: String, 
        required: true 
    }
}, { timestamps: true }); 

module.exports = mongoose.model('User', userSchema);
