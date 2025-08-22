const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const upload = multer();

router.get('/', (req, res) => {
  const query = `
    SELECT 
      m.id,
      m.product_id,
      m.fournisseur_id,
      m.location_id,
      m.etage_id,
      m.part_id,
      m.status,
      m.date,
      m.time,
      m.batch_number,
      m.quantity,
      m.product_type,
      m.needs_examination,
      m.isolation_reason,
      m.quality_status,
      m.internal_transfer,
      m.is_transfer,
      m.staff_id,
      m.atelier,
      m.certification_file_type,
      m.created_at,
      m.updated_at,
      p.nom AS product_name,
      p.reference AS product_reference,
      p.unite,
      l.name AS location_name,
      e.name AS etage_name,
      pt.name AS part_name,
      DATE_FORMAT(m.fabrication_date, '%Y-%m-%d') as fabrication_date,
      DATE_FORMAT(m.expiration_date, '%Y-%m-%d') as expiration_date
    FROM movements m
    LEFT JOIN products p ON m.product_id = p.id
    LEFT JOIN locations l ON m.location_id = l.id
    LEFT JOIN location_etages e ON m.etage_id = e.id
    LEFT JOIN location_parts pt ON m.part_id = pt.id
    WHERE m.status = 'Entrée'
    ORDER BY m.date DESC, m.time DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch quality movements', details: err });
    }
    console.log('Fetched movements:', results);
    res.json(results);
  });
});

// Update quality status, optionally with file
router.patch('/:id', upload.single('file'), (req, res) => {
  const { id } = req.params;
  const quality_status = req.body.quality_status;

  if (!quality_status || !['conforme', 'non-conforme'].includes(quality_status)) {
    return res.status(400).json({ error: 'Invalid quality status' });
  }

  const now = new Date();
  const updatedAt = now.toISOString().slice(0, 19).replace('T', ' ');

  // If file is present, save it as MEDIUMBLOB in certification_file and store its MIME type
  if (req.file) {
    db.query(
      'UPDATE movements SET quality_status = ?, updated_at = ?, certification_file = ?, certification_file_type = ? WHERE id = ?',
      [quality_status, updatedAt, req.file.buffer, req.file.mimetype, id],
      (err, result) => {
        if (err) {
          console.error('Error updating quality status with file:', err);
          return res.status(500).json({ error: 'Failed to update quality status' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Movement not found' });
        }
        res.json({
          success: true,
          updated_at: updatedAt,
          quality_status: quality_status,
          file_uploaded: true
        });
      }
    );
  } else {
    // No file, keep previous logic
    db.query(
      'UPDATE movements SET quality_status = ?, updated_at = ? WHERE id = ?',
      [quality_status, updatedAt, id],
      (err, result) => {
        if (err) {
          console.error('Error updating quality status:', err);
          return res.status(500).json({ error: 'Failed to update quality status' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Movement not found' });
        }
        res.json({
          success: true,
          updated_at: updatedAt,
          quality_status: quality_status,
          file_uploaded: false
        });
      }
    );
  }
});

// Download certification file for a movement (send correct MIME type)
router.get('/:id/file', (req, res) => {
  const { id } = req.params;
  db.query('SELECT certification_file, certification_file_type FROM movements WHERE id = ?', [id], (err, rows) => {
    if (err) {
      console.error('Error fetching certification file:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows.length || !rows[0].certification_file) {
      return res.status(404).json({ error: 'File not found' });
    }
    const fileBuffer = rows[0].certification_file;
    const fileType = rows[0].certification_file_type || 'application/octet-stream';
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `inline; filename=certification_file_${id}`);
    res.send(fileBuffer);
  });
});

module.exports = router;
