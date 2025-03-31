require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("express-flash");
const MongoStore = require("connect-mongo");
const path = require("path");

const Conference = require("./models/Conference");
const conferenceRoutes = require("./routes/conferenceRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const authRoutes = require("./routes/authRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const bulkemailRoutes = require("./routes/bulkemailRoutes");
const markAttendanceRoutes = require("./routes/markAttendanceRoutes");

const index = express();

// Static Files
index.use(express.static(path.join(__dirname, "public")));
index.set("view engine", "ejs");
index.set("views", path.join(__dirname, "views"));

// Body Parsers
index.use(express.urlencoded({ extended: true }));
index.use(express.json());
index.use(bodyParser.urlencoded({ extended: true }));
index.use(bodyParser.json());

// ✅ Corrected MongoDB Connection (Removed Deprecated Options)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Corrected Session Setup
index.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // ✅ Removed Extra Quote
      collectionName: "sessions",
    }),
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// ✅ Flash Messages Setup
index.use(flash());

// ✅ Middleware for Flash Messages & User Session
index.use((req, res, next) => {
  res.locals.messages = req.flash();
  res.locals.user = req.session.user || null; // Ensuring user is defined
  next();
});

// ✅ Move Reminder Routes AFTER session & flash are set up
index.use(reminderRoutes);

// Routes
index.use(conferenceRoutes);
index.use(authRoutes);
index.use(registrationRoutes);
index.use(bulkemailRoutes);
index.use(markAttendanceRoutes);

// Home Route
index.get("/", async (req, res) => {
  try {
    const conferences = await Conference.find();
    res.render("index", { conferences, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Dashboard Route
index.get("/dashboard", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const conferences = await Conference.find({ createdBy: req.session.user._id });

  res.render("dashboard", { user: req.session.user, conferences });
});

// Start Server
const PORT = process.env.PORT;
index.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
