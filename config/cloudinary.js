require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 🔹 Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 Cloudinary Storage for Images
const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'conference-images',
        allowed_formats: ['png', 'jpg', 'jpeg'],
        public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`
    }
});

const uploadImage = multer({ storage: imageStorage });

module.exports = { cloudinary, uploadImage };
