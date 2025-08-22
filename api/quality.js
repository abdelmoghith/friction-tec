const express = require('express');
const router = express.Router();
const db = require('./db'); // adjust if your db connection is elsewhere

// GET /api/quality - fetch all quality movements
router.get('/', (req, res) => {
  db.query(`
    SELECT m.*, p.nom AS product_name, p.reference AS product_reference
    FROM movements m
    LEFT JOIN products p ON m.product_id = p.id
    ORDER BY m.date DESC, m.time DESC
  `, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch quality movements', details: err });
    }
    res.json(results);
  });
});

module.exports = router;
