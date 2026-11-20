// HerAid database: SQLite using Node's built-in "node:sqlite" (no install needed)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// The database is stored in one file: backend/db/heraid.db (created automatically)
const db = new DatabaseSync(path.join(__dirname, 'heraid.db'));

// Table 1: users (one row per student)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    department    TEXT NOT NULL,
    year          INTEGER NOT NULL
  )
`);

// Table 2: requests (one row per SOS)
// status is one of: open, accepted, fulfilled, expired
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id  INTEGER NOT NULL,
    item          TEXT NOT NULL,
    venue         TEXT NOT NULL,
    floor         TEXT NOT NULL,
    note          TEXT,
    status        TEXT NOT NULL DEFAULT 'open',
    helper_id     INTEGER,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at   TEXT,
    fulfilled_at  TEXT,
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (helper_id)    REFERENCES users(id)
  )
`);

module.exports = db;
