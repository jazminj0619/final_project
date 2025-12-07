/**
 * server.js — Backend Development
 * ---------------------------------------------------
 * This file is a partially completed backend for the
 * Electron Community Hub project.
 *
 * Your task is to finish implementing:
 *   ✔ Database tables
 *   ✔ API routes for plugins
 *   ✔ API routes for issues
 *   ✔ API routes for FAQs
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Initialize the app
const app = express();
const PORT = 4000;

app.use(express.json());
app.use(cors());

// Serve static public files
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// -----------------------------------------------------
// CONNECT TO SQLITE
// -----------------------------------------------------
const DB_PATH = path.join(__dirname, "database.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("Failed to connect:", err.message);
  else console.log("Connected to database:", DB_PATH);
});

// -----------------------------------------------------
// CREATE TABLES
// -----------------------------------------------------
function initializeDatabase() {
  db.serialize(() => {
    console.log("Creating tables…");

    db.run(
      `
      CREATE TABLE IF NOT EXISTS plugins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        version TEXT NOT NULL,
        rating REAL NOT NULL
      );
      `
    );

    db.run(
      `
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
      `
    );

    db.run(
      `
      CREATE TABLE IF NOT EXISTS plugin_tags (
        plugin_id INTEGER,
        tag_id INTEGER
      );
      `
    );

    db.run(
      `
      CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      `
    );

    db.run(
      `
      CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL
      );
      `
    );
  });
}

initializeDatabase();

// -----------------------------------------------------
// API ROUTES
// -----------------------------------------------------

// ---------------- PLUGINS ----------------
app.get("/api/plugins", (req, res) => {
  const query = "SELECT * FROM plugins";

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch plugins" });
    res.json(rows);
  });
});

app.post("/api/plugins", (req, res) => {
  const { name, author, version, rating, tname } = req.body;

  if (!name || !author || !version || !rating || !tname) {
    return res.status(400).json({ error: "All plugin fields are required." });
  }

  // INSERT plugin first
  const pluginSQL = `
    INSERT INTO plugins (name, author, version, rating)
    VALUES (?, ?, ?, ?)
  `;

  db.run(pluginSQL, [name, author, version, rating], function (err) {
    if (err) return res.status(500).json({ error: "Failed to add plugin" });

    const pluginId = this.lastID;

    // INSERT or use existing tag
    const tagSQL = `INSERT OR IGNORE INTO tags (name) VALUES (?)`;

    db.run(tagSQL, [tname], function (err) {
      if (err) return res.status(500).json({ error: "Failed to add tag" });

      // Retrieve tag ID (whether newly inserted or old)
      db.get(
        `SELECT id FROM tags WHERE name = ?`,
        [tname],
        (err, tagRow) => {
          if (err) return res.status(500).json({ error: "Tag lookup failed" });

          const tagId = tagRow.id;

          // Link plugin <-> tag
          db.run(
            `INSERT INTO plugin_tags (plugin_id, tag_id) VALUES (?, ?)`,
            [pluginId, tagId],
            (err) => {
              if (err)
                return res
                  .status(500)
                  .json({ error: "Failed to link plugin and tag" });

              res.status(201).json({
                message: "Plugin successfully added",
                pluginId,
              });
            }
          );
        }
      );
    });
  });
});

// ---------------- TAGS ----------------
app.get("/api/tags", (req, res) => {
  const query = "SELECT * FROM tags";

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch tags" });
    res.json(rows);
  });
});

// ---------------- ISSUES ----------------
app.get("/api/issues", (req, res) => {
  const query = "SELECT * FROM issues";

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch issues" });
    res.json(rows);
  });
});

app.post("/api/issues", (req, res) => {
  const { title, severity, status } = req.body;

  if (!title || !severity || !status) {
    return res.status(400).json({ error: "All issue fields are required." });
  }

  const query = `
    INSERT INTO issues (title, severity, status)
    VALUES (?, ?, ?)
  `;

  db.run(query, [title, severity, status], function (err) {
    if (err) return res.status(500).json({ error: "Failed to add issue" });

    res.status(201).json({
      message: "Issue successfully added",
      issueId: this.lastID,
    });
  });
});

// ---------------- FAQS ----------------
app.get("/api/faqs", (req, res) => {
  const query = "SELECT * FROM faqs";

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch FAQs" });
    res.json(rows);
  });
});

app.post("/api/faqs", (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: "FAQ question and answer required." });
  }

  const query = `
    INSERT INTO faqs (question, answer)
    VALUES (?, ?)
  `;

  db.run(query, [question, answer], function (err) {
    if (err) return res.status(500).json({ error: "Failed to add FAQ" });

    res.status(201).json({
      message: "FAQ successfully added",
      faqId: this.lastID,
    });
  });
});

// -----------------------------------------------------
// START SERVER
// -----------------------------------------------------
app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
  console.log(" Serving files from:", PUBLIC_DIR);
});
