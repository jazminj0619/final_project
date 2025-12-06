📌 Project Overview

Electron Community Hub is a full-stack web application designed to simulate a community-driven extension ecosystem. It showcases:

  A Plugin Library with filters
  
  An Issue Dashboard for bug tracking
  
  A dynamic FAQ system backed by a database
  
  A consistent UI theme across all pages

This project demonstrates full-stack development using Node.js + Express + SQLite and a front end built with HTML, CSS, and vanilla JavaScript.

🗂️ Table of Contents

  Features
  
  Tech Stack
  
  Project Structure
  
  Installation & Setup
  
  Running the Project
  
  API Documentation
  
  Database Schema

🚀 Features
  Feature 1 – Plugin Library

    A searchable, filterable library of Electron plugins.
    
    Users can:
    
    View all plugins
    
    Filter by tag, minimum rating, or search term
    
    Add new plugins
    
    View tags pulled from the database
    
    Database Tables:
    plugins(id, name, author, version, rating)
    tags(id, name)
    plugin_tags(plugin_id, tag_id)

  Feature 2 – Issue Dashboard

    A lightweight bug tracker.
    
    Users can:
    
    View issues
    
    Filter by severity or status
    
    Submit new issues
    
    Database Table:
    issues(id, title, severity, status, created_at)

  Feature 3 – FAQ (Database-Powered)

    An interactive FAQ page using <details> elements.
    
    Users can:
    
    Read common questions about the project
    
    View FAQs loaded dynamically from SQLite
    
    Database Table:
    faqs(id, question, answer)

🛠️ Tech Stack
    Layer	Technology
    Frontend	HTML5, CSS3, JavaScript
    Backend	Node.js, Express.js
    Database	SQLite
    Tools	Curl/Postman for API testing

📁 Project Structure
final_project/
│
├── backend/
│   ├── server.js          # Express server + API routes
│   └── database.db        # SQLite database (auto-created)
│
├── public/
│   ├── index.html         # Homepage
│   ├── plugins.html       # Plugin Library
│   ├── issues.html        # Issue Dashboard
│   ├── faq.html           # FAQ Page
│   └── styles.css         # Shared stylesheet
│
└── README.md              # Project Documentation

🧩 Installation & Setup
  1️⃣ Install Node.js
  
    Download from: https://nodejs.org/
  
  2️⃣ Install dependencies
  
    Open your terminal in the project folder:
  
      cd final_project
      npm install express cors sqlite3
  
  ▶️ Running the Project
     Start the backend server:
     node backend/server.js


    If successful, you will see:

      Connected to SQLite database
      Server is running at http://localhost:4000
      Static files served from: .../public

    Open the application:
    http://localhost:4000/index.html

📡 API Documentation
GET /api/plugins

  Returns all plugins or filtered results.
  
  Query parameters supported:
  tag, minRating, search

POST /api/plugins

  Add a new plugin.
  
  {
    "name": "Example Plugin",
    "author": "Jane Doe",
    "version": "1.0.0",
    "rating": 4.5,
    "tags": ["debug", "UI"]
  }

GET /api/issues
  
  Supports filtering:
  
  /api/issues?severity=high&status=open

POST /api/issues

  Submit a new issue.
  
  {
    "title": "Crash when opening settings",
    "severity": "high",
    "status": "open"
  }

GET /api/faqs

  Returns all FAQs.

POST /api/faqs
  
  Used to insert new FAQ entries.
  
  {
    "question": "How do I run the project?",
    "answer": "Use node backend/server.js and open localhost:4000."
  }

🗄️ Database Schema
plugins(id, name, author, version, rating)
tags(id, name)
plugin_tags(plugin_id, tag_id)

issues(id, title, severity, status, created_at)

faqs(id, question, answer)


SQLite file is automatically generated as database.db.
