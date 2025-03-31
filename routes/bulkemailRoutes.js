const express = require('express');
const router = express.Router();
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const Conference = require('../models/Conference');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 🔹 Storage for CSV Uploads
const csvStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

// 🔹 Allowed File Types
const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'image/png', 'image/jpg', 'image/jpeg'];

const fileFilter = (req, file, cb) => {
    allowedMimeTypes.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Invalid file type. Only images and CSV files are allowed.'), false);
};

// 🔹 Multer Upload Middleware
const uploadFiles = multer({ storage: csvStorage, fileFilter }).fields([
    { name: 'attachment', maxCount: 1 },
    { name: 'csvUpload', maxCount: 1 }
]);

// 🔹 Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.get('/send-bulk-mail', async (req, res) => {
    try {
        const { conferenceId, conferenceTitle, conferenceDate, conferenceOrganizer } = req.query;
  
        if (!conferenceId) {
            return res.status(400).send("Conference ID is required.");
        }

        const conference = await Conference.findById(conferenceId);
        if (!conference) {
            return res.status(404).send("Conference not found.");
        }
        res.render('send-bulk-mail', { conferenceId, conference, conferenceTitle, conferenceDate, conferenceOrganizer });
  
    } catch (error) {
        console.error("Error fetching conference:", error);
        res.status(500).send("Internal Server Error");
    }
});
  
// 🔹 Bulk Email Route (CSV Upload + Attachment)
router.post('/send-bulk-mail', uploadFiles, async (req, res) => {
    try {
        let recipients = [];

        // 🔹 Process CSV File if Uploaded
        if (req.files && req.files['csvUpload']) {
            const csvFile = req.files['csvUpload'][0];
            const filePath = csvFile.path;

            if (!fs.existsSync(filePath)) {
                return res.status(400).json({ success: false, message: "Uploaded CSV file not found." });
            }

            const fileStream = fs.createReadStream(filePath);

            await new Promise((resolve, reject) => {
                fileStream
                    .pipe(csvParser())
                    .on('data', (row) => {
                        const email = Object.values(row)[0]?.trim();
                        if (email && /\S+@\S+\.\S+/.test(email)) recipients.push(email);
                    })
                    .on('end', () => {
                        if (recipients.length === 0) {
                            return reject(new Error("No valid email addresses found in CSV."));
                        }
                        resolve();
                    })
                    .on('error', reject);
            });

            fs.unlinkSync(filePath); 
        }

        // 🔹 Add Manually Entered Emails
        if (req.body.recipients) {
            const manualEmails = req.body.recipients
                .split(',')
                .map(email => email.trim())
                .filter(email => /\S+@\S+\.\S+/.test(email));

            recipients = recipients.concat(manualEmails);
        }

        if (recipients.length === 0) {
            return res.status(400).json({ success: false, message: "No valid email addresses provided." });
        }

        // 🔹 Email Attachment (If Image is Uploaded)
        let attachments = [];
        if (req.files && req.files['attachment']) {
            const attachmentFile = req.files['attachment'][0];

            attachments.push({
                filename: attachmentFile.originalname,
                path: attachmentFile.path.startsWith("http") ? attachmentFile.path : path.resolve(__dirname, '../uploads', attachmentFile.filename)
            });
        }

        // 🔹 Send Emails
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipients.join(','),
            subject: req.body.subject || "No Subject",
            html: req.body.message || "No Message Content",
            attachments
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "Emails sent successfully!" });

    } catch (error) {
        console.error("❌ Error sending emails:", error);
        res.status(500).json({ success: false, message: error.message || "Error sending emails" });
    }
});

module.exports = router;
