// index.js
const express = require("express");
const cors = require("cors");
const generateXmlRouter = require("./generate-xml");

const app = express();
app.use(cors());
app.use(express.json());

// For Node-based routes
app.use("/generate-xml", generateXmlRouter);

// Health check / root route
app.get("/", (req, res) => {
  res.send("Drum AI Backend - Node/Express is live!");
});

// Export the Express app so Vercel can run it
module.exports = app;
