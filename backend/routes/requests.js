// Help request routes: create, list, accept, fulfill, feed
const express = require('express');
const db = require('../db/database');
const requireLogin = require('../middleware/auth');

const router = express.Router();

const EXPIRY_MINUTES = 15;

// Any request still "open" after 15 minutes becomes "expired"
function expireOldRequests() {
  db.prepare(`
    UPDATE requests
    SET status = 'expired'
    WHERE status = 'open'
      AND created_at <= datetime('now', '-${EXPIRY_MINUTES} minutes')
  `).run();
}

// Seconds left before an open request expires (computed by the database, so no timezone problems)
const SECONDS_LEFT = `(${EXPIRY_MINUTES * 60} - (strftime('%s','now') - strftime('%s', r.created_at)))`;

// GET /api/requests/feed : "Recently Helped" (public, used on the homepage)
router.get('/feed', (req, res) => {
  const items = db.prepare(`
    SELECT r.id, r.item, r.venue,
           u.department AS requester_department,
           u.year       AS requester_year,
           h.name       AS helper_name,
           CAST((strftime('%s','now') - strftime('%s', r.fulfilled_at)) / 60 AS INTEGER) AS minutes_ago
    FROM requests r
    JOIN users u ON u.id = r.requester_id
    JOIN users h ON h.id = r.helper_id
    WHERE r.status = 'fulfilled'
    ORDER BY r.fulfilled_at DESC
    LIMIT 10
  `).all();

  const total = db.prepare(`
    SELECT COUNT(*) AS count FROM requests
    WHERE status = 'fulfilled'
      AND strftime('%Y-%m', fulfilled_at) = strftime('%Y-%m', 'now')
  `).get();

  // Show only the helper's first name
  const feed = items.map(i => ({ ...i, helper_name: i.helper_name.split(' ')[0] }));
  res.json({ helpedThisMonth: total.count, feed });
});

// GET /api/requests/mine : my own requests + requests I helped with
router.get('/mine', requireLogin, (req, res) => {
  expireOldRequests();
  const me = req.session.userId;

  const asked = db.prepare(`
    SELECT r.id, r.item, r.venue, r.floor, r.note, r.status, r.created_at,
           h.name AS helper_name,
           ${SECONDS_LEFT} AS seconds_left
    FROM requests r
    LEFT JOIN users h ON h.id = r.helper_id
    WHERE r.requester_id = ?
    ORDER BY r.id DESC
  `).all(me).map(r => ({
    ...r,
    helper_name: r.helper_name ? r.helper_name.split(' ')[0] : null,
    seconds_left: r.status === 'open' ? Math.max(0, r.seconds_left) : null
  }));

  const helped = db.prepare(`
    SELECT r.id, r.item, r.venue, r.floor, r.note, r.status, r.accepted_at,
           u.department AS requester_department, u.year AS requester_year
    FROM requests r
    JOIN users u ON u.id = r.requester_id
    WHERE r.helper_id = ?
    ORDER BY r.id DESC
  `).all(me);

  res.json({ asked, helped });
});

// GET /api/requests : list open requests (requester name is hidden for privacy)
router.get('/', requireLogin, (req, res) => {
  expireOldRequests();
  const rows = db.prepare(`
    SELECT r.id, r.item, r.venue, r.floor, r.note, r.created_at,
           u.department AS requester_department,
           u.year       AS requester_year,
           r.requester_id,
           ${SECONDS_LEFT} AS seconds_left
    FROM requests r
    JOIN users u ON u.id = r.requester_id
    WHERE r.status = 'open'
    ORDER BY r.created_at ASC
  `).all();

  const me = req.session.userId;
  res.json(rows.map(({ requester_id, ...r }) => ({
    ...r,
    seconds_left: Math.max(0, r.seconds_left),
    is_mine: requester_id === me
  })));
});

// POST /api/requests : create a new SOS
router.post('/', requireLogin, (req, res) => {
  const { item, venue, floor, note } = req.body;

  if (!item || !venue || !floor) {
    return res.status(400).json({ error: 'Please choose an item, venue and floor.' });
  }

  expireOldRequests();

  // Only one open request at a time
  const already = db
    .prepare("SELECT id FROM requests WHERE requester_id = ? AND status = 'open'")
    .get(req.session.userId);
  if (already) {
    return res.status(409).json({ error: 'You already have an open request.' });
  }

  const result = db
    .prepare('INSERT INTO requests (requester_id, item, venue, floor, note) VALUES (?, ?, ?, ?, ?)')
    .run(req.session.userId, item.trim(), venue.trim(), floor.trim(), (note || '').trim());

  res.status(201).json({ message: 'SOS sent.', id: Number(result.lastInsertRowid) });
});

// PATCH /api/requests/:id/accept : "I Can Help"
router.patch('/:id/accept', requireLogin, (req, res) => {
  expireOldRequests();

  // Only works if the request is still open and is not the helper's own
  const result = db.prepare(`
    UPDATE requests
    SET status = 'accepted', helper_id = ?, accepted_at = datetime('now')
    WHERE id = ? AND status = 'open' AND requester_id != ?
  `).run(req.session.userId, req.params.id, req.session.userId);

  if (result.changes === 0) {
    return res.status(409).json({ error: 'This request is no longer available.' });
  }

  const r = db
    .prepare('SELECT item, venue, floor, note FROM requests WHERE id = ?')
    .get(req.params.id);
  res.json({ message: 'Thank you for helping!', request: r });
});

// PATCH /api/requests/:id/fulfill : requester confirms "Received"
router.patch('/:id/fulfill', requireLogin, (req, res) => {
  const result = db.prepare(`
    UPDATE requests
    SET status = 'fulfilled', fulfilled_at = datetime('now')
    WHERE id = ? AND requester_id = ? AND status = 'accepted'
  `).run(req.params.id, req.session.userId);

  if (result.changes === 0) {
    return res.status(409).json({ error: 'This request cannot be marked as received.' });
  }
  res.json({ message: 'Marked as received. Thank you!' });
});

module.exports = router;
