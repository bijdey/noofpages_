const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require("fs");
const getPageCount = require("./getPageCount");

const app = express();

// Middleware
app.use(fileUpload());
app.use(express.static("public")); 

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Upload route
app.post("/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).send("No file uploaded.");
    }

    const file = req.files.file;
    const filePath = path.join(uploadDir, file.name);

    // Save uploaded file
    await file.mv(filePath);

    // Count pages/slides
    const pages = await getPageCount(filePath);

    res.json({ file: file.name, pages });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing file: " + err.message);
  }
});

app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
