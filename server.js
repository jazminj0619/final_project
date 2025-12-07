/**
 * server.js — Backend Development
 * ---------------------------------------------------
 * Backend for the Electron Community Hub project.
 *
 * Features in this file:
 *   ✔ SQLite database (database.db)
 *   ✔ Tables: plugins, tags, plugin_tags, issues, faqs
 *   ✔ API routes for plugins + tags
 *   ✔ API routes for issues
 *   ✔ API routes for FAQs
 *
 * IMPORTANT:
 * The backend uses SQLite. The database file MUST exist
 * in the backend folder and must be named:
 *
 *          database.db
 *
 * If the file does not exist, SQLite will automatically
 * create it. But the CREATE TABLE statements MUST run
 * correctly, or the public pages will NOT work.
 */

// -----------------------------------------------------
// 1. IMPORT DEPENDENCIES
// -----------------------------------------------------
const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// -----------------------------------------------------
// 2. INITIALIZE EXPRESS APP
// -----------------------------------------------------
const app = express();
const PORT = 4000;

// Allow JSON in request bodies and CORS for front-end
app.use(express.json());
app.use(cors());

// -----------------------------------------------------
// 3. SERVE STATIC FRONTEND FILES
// -----------------------------------------------------
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// Serve everything in /public, so /index.html, /plugins.html, etc.
app.use(express.static(PUBLIC_DIR));

// Default route → send homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// -----------------------------------------------------
// 4. CONNECT TO SQLITE DATABASE
// -----------------------------------------------------
/**
 * DATABASE NOTE:
 * ---------------
 * SQLite stores all data in a single file.
 * If database.db does NOT exist yet, SQLite will create it.
 *
 * We create tables using SQL so they appear in the file.
 */

const DB_PATH = path.join(__dirname, "database.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ Failed to connect to database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database:", DB_PATH);
  }
});

// -----------------------------------------------------
// 5. CREATE TABLES (IF THEY DO NOT EXIST)
// -----------------------------------------------------
function initializeDatabase() {
  db.serialize(() => {
    console.log("🛠 Creating tables (if they do not exist)...");

    // plugins table
    db.run(
      `
      CREATE TABLE IF NOT EXISTS plugins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        version TEXT NOT NULL,
        rating REAL NOT NULL
      );
      `,
      (err) => {
        if (err) console.log(" Error creating plugins table:", err.message);
        else console.log(" plugins table ready");
      }
    );

    // tags table (unique tag names)
    db.run(
      `
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
      `,
      (err) => {
        if (err) console.log(" Error creating tags table:", err.message);
        else console.log(" tags table ready");
      }
    );

    // plugin_tags join table (many-to-many relationship)
    db.run(
      `
      CREATE TABLE IF NOT EXISTS plugin_tags (
        plugin_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (plugin_id, tag_id)
      );
      `,
      (err) => {
        if (err) console.log(" Error creating plugin_tags table:", err.message);
        else console.log(" plugin_tags table ready");
      }
    );

    // issues table
    db.run(
      `
      CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      `,
      (err) => {
        if (err) console.log(" Error creating issues table:", err.message);
        else console.log(" issues table ready");
      }
    );

    // faqs table
    db.run(
      `
      CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL
      );
      `,
      (err) => {
        if (err) console.log(" Error creating faqs table:", err.message);
        else console.log(" faqs table ready");
      }
    );
  });
}

// Run table creation on server start
initializeDatabase();

// -----------------------------------------------------
// 6. HELPER FUNCTIONS FOR TAGS
// -----------------------------------------------------

/**
 * Ensure a tag exists in the tags table.
 * If it exists → return existing id.
 * If it doesn't → insert and return new id.
 */
function ensureTagExists(tagName, callback) {
  const trimmed = tagName.trim();
  if (!trimmed) return callback(null);

  const findSql = `SELECT id FROM tags WHERE name = ?;`;
  db.get(findSql, [trimmed], (err, row) => {
    if (err) {
      console.error(" Error checking tag:", err);
      return callback(null);
    }

    if (row) {
      // Tag already exists
      return callback(row.id);
    } else {
      // Insert new tag
      const insertSql = `INSERT INTO tags (name) VALUES (?);`;
      db.run(insertSql, [trimmed], function (err) {
        if (err) {
          console.error(" Error inserting tag:", err);
          return callback(null);
        }
        callback(this.lastID);
      });
    }
  });
}

/**
 * Create a link between plugin and tag in plugin_tags table.
 */
function linkPluginTag(pluginId, tagId) {
  if (!pluginId || !tagId) return;
  const linkSql = `
    INSERT OR IGNORE INTO plugin_tags (plugin_id, tag_id)
    VALUES (?, ?);
  `;
  db.run(linkSql, [pluginId, tagId], (err) => {
    if (err) {
      console.error(" Error linking plugin and tag:", err);
    }
  });
}

// -----------------------------------------------------
// 7. API ROUTES — PLUGINS + TAGS
// -----------------------------------------------------

/**
 * GET /api/plugins
 * Returns all plugins.
 * (Your front end already knows how to display them.)
 */
app.get("/api/plugins", (req, res) => {
  const query = "SELECT * FROM plugins ORDER BY rating DESC, name ASC;";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Database error (plugins): ", err);
      return res.status(500).json({ error: "Failed to fetch plugins" });
    }
    res.json(rows);
  });
});

/**
 * POST /api/plugins
 * Body example sent from plugins.html:
 * {
 *   "name": "My Plugin",
 *   "author": "Someone",
 *   "version": "1.0.0",
 *   "rating": 4.5,
 *   "tags": ["debugging", "tools"]
 * }
 */
app.post("/api/plugins", (req, res) => {
  const { name, author, version, rating, tags } = req.body;

  // Basic validation
  if (!name || !author || !version || rating == null) {
    return res.status(400).json({
      error: "Please provide name, author, version, and rating.",
    });
  }

  const numericRating = Number(rating);
  if (Number.isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
    return res.status(400).json({
      error: "Rating must be a number between 0 and 5.",
    });
  }

  // Normalize tags into an array of strings (or empty array)
  let tagList = [];
  if (Array.isArray(tags)) {
    tagList = tags.map((t) => String(t));
  }

  // Insert the plugin itself
  const insertPluginSql = `
    INSERT INTO plugins (name, author, version, rating)
    VALUES (?, ?, ?, ?);
  `;

  db.run(
    insertPluginSql,
    [name.trim(), author.trim(), version.trim(), numericRating],
    function (err) {
      if (err) {
        console.error("Insertion error (plugin): ", err);
        return res.status(500).json({ error: "Failed to add plugin" });
      }

      const pluginId = this.lastID;

      // If there are no tags, just return now
      if (!tagList.length) {
        return res.status(201).json({
          message: "Plugin successfully added (no tags).",
          pluginId,
        });
      }

      // Handle all tags: ensure each exists, then link
      let pending = tagList.length;
      tagList.forEach((tagName) => {
        ensureTagExists(tagName, (tagId) => {
          if (tagId) {
            linkPluginTag(pluginId, tagId);
          }
          pending -= 1;
          if (pending === 0) {
            // All tags processed
            return res.status(201).json({
              message: "Plugin successfully added",
              pluginId,
            });
          }
        });
      });
    }
  );
});

/**
 * GET /api/tags
 * Returns all tags (used for dropdown filter on plugins.html)
 */
app.get("/api/tags", (req, res) => {
  const query = "SELECT * FROM tags ORDER BY name ASC;";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Database error (tags): ", err);
      return res.status(500).json({ error: "Failed to fetch tags" });
    }
    res.json(rows);
  });
});

// -----------------------------------------------------
// 8. API ROUTES — ISSUES
// -----------------------------------------------------

/**
 * GET /api/issues
 * Optional query parameters:
 *   ?severity=low|medium|high|critical
 *   ?status=open|in_progress|closed
 */
app.get("/api/issues", (req, res) => {
  const { severity, status } = req.query;

  let query = "SELECT * FROM issues WHERE 1=1";
  const params = [];

  if (severity) {
    query += " AND severity = ?";
    params.push(severity);
  }

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  query += " ORDER BY datetime(created_at) DESC;";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Database error (issues): ", err);
      return res.status(500).json({ error: "Failed to fetch issues" });
    }
    res.json(rows);
  });
});

/**
 * POST /api/issues
 * Body example:
 * {
 *   "title": "Crash on open",
 *   "severity": "high",
 *   "status": "open"
 * }
 */
app.post("/api/issues", (req, res) => {
  const { title, severity = "low", status = "open" } = req.body;

  if (!title) {
    return res
      .status(400)
      .json({ error: "Please provide a title for the issue." });
  }

  const insertSql = `
    INSERT INTO issues (title, severity, status)
    VALUES (?, ?, ?);
  `;

  db.run(insertSql, [title.trim(), severity, status], function (err) {
    if (err) {
      console.error("Insertion error (issue): ", err);
      return res.status(500).json({ error: "Failed to create issue" });
    }

    const createdId = this.lastID;
    db.get(
      "SELECT * FROM issues WHERE id = ?;",
      [createdId],
      (err, row) => {
        if (err) {
          console.error("Error fetching created issue:", err);
          return res
            .status(500)
            .json({ error: "Issue created but fetch failed" });
        }
        res.status(201).json(row);
      }
    );
  });
});

// -----------------------------------------------------
// 9. API ROUTES — FAQ
// -----------------------------------------------------

/**
 * GET /api/faqs
 * Returns all FAQs for faq.html
 */
app.get("/api/faqs", (req, res) => {
  const query = "SELECT * FROM faqs ORDER BY id ASC;";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Database error (faqs): ", err);
      return res.status(500).json({ error: "Failed to fetch FAQs" });
    }
    res.json(rows);
  });
});

/**
 * POST /api/faqs
 * Body example:
 * {
 *   "question": "How do I run this project?",
 *   "answer": "Use node backend/server.js and open localhost:4000/index.html"
 * }
 */
app.post("/api/faqs", (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res
      .status(400)
      .json({ error: "Please provide both question and answer." });
  }

  const insertSql = `
    INSERT INTO faqs (question, answer)
    VALUES (?, ?);
  `;

  db.run(insertSql, [question.trim(), answer.trim()], function (err) {
    if (err) {
      console.error("Insertion error (faq): ", err);
      return res.status(500).json({ error: "Failed to create FAQ" });
    }

    const createdId = this.lastID;
    db.get(
      "SELECT * FROM faqs WHERE id = ?;",
      [createdId],
      (err, row) => {
        if (err) {
          console.error("Error fetching created FAQ:", err);
          return res
            .status(500)
            .json({ error: "FAQ created but fetch failed" });
        }
        res.status(201).json(row);
      }
    );
  });
});

// -----------------------------------------------------
// 10. START THE SERVER
// -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log("📁 Serving files from:", PUBLIC_DIR);
});
