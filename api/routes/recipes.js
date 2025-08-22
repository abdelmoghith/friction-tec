const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/recipes - Get all recipes with optional filters
router.get('/', (req, res) => {
  const { product_id, batch_number, operation_type, limit = 50, offset = 0 } = req.query;
  
  let query = `
    SELECT
      r.*,
      p.nom as product_designation,
      p.reference as product_reference,
      p.unite as product_unite
    FROM recipes r
    LEFT JOIN products p ON r.product_id = p.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (product_id) {
    query += ' AND r.product_id = ?';
    params.push(product_id);
  }
  
  if (batch_number) {
    query += ' AND r.batch_number LIKE ?';
    params.push(`%${batch_number}%`);
  }
  
  if (operation_type) {
    query += ' AND r.operation_type = ?';
    params.push(operation_type);
  }
  
  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching recipes:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse locations_info JSON for each recipe
    const recipes = results.map(recipe => ({
      ...recipe,
      locations_info: recipe.locations_info ? JSON.parse(recipe.locations_info) : []
    }));
    
    res.json(recipes);
  });
});

// GET /api/recipes/:id - Get a specific recipe
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT
      r.*,
      p.nom as product_designation,
      p.reference as product_reference,
      p.unite as product_unite,
      m.date as movement_date,
      m.time as movement_time
    FROM recipes r
    LEFT JOIN products p ON r.product_id = p.id
    LEFT JOIN movements m ON r.movement_id = m.id
    WHERE r.id = ?
  `;
  
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching recipe:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = {
      ...results[0],
      locations_info: results[0].locations_info ? JSON.parse(results[0].locations_info) : []
    };
    
    res.json(recipe);
  });
});

// POST /api/recipes - Create a new recipe
router.post('/', (req, res) => {
  const {
    movement_id,
    product_id,
    product_designation,
    product_reference,
    product_unite,
    supplier_name,
    batch_number,
    quantity,
    fabrication_date,
    expiration_date,
    quality_status,
    needs_examination,
    operation_type = 'Complément Stock',
    locations_info
  } = req.body;
  
  // Validate required fields
  if (!movement_id || !product_id || !product_designation || !quantity || !batch_number) {
    return res.status(400).json({ 
      error: 'Missing required fields: movement_id, product_id, product_designation, quantity, batch_number' 
    });
  }
  
  const query = `
    INSERT INTO recipes (
      movement_id, product_id, product_designation, product_reference, product_unite,
      supplier_name, batch_number, quantity, fabrication_date, expiration_date,
      quality_status, needs_examination, operation_type, locations_info
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    movement_id,
    product_id,
    product_designation,
    product_reference,
    product_unite,
    supplier_name,
    batch_number,
    quantity,
    fabrication_date,
    expiration_date,
    quality_status,
    needs_examination || false,
    operation_type,
    JSON.stringify(locations_info || [])
  ];
  
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error creating recipe:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Return the created recipe
    res.status(201).json({
      id: result.insertId,
      movement_id,
      product_id,
      product_designation,
      product_reference,
      product_unite,
      supplier_name,
      batch_number,
      quantity,
      fabrication_date,
      expiration_date,
      quality_status,
      needs_examination: needs_examination || false,
      operation_type,
      locations_info: locations_info || []
    });
  });
});

// PUT /api/recipes/:id - Update a recipe
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    supplier_name,
    batch_number,
    quantity,
    fabrication_date,
    expiration_date,
    quality_status,
    needs_examination,
    locations_info
  } = req.body;
  
  const query = `
    UPDATE recipes SET
      supplier_name = ?,
      batch_number = ?,
      quantity = ?,
      fabrication_date = ?,
      expiration_date = ?,
      quality_status = ?,
      needs_examination = ?,
      locations_info = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [
    supplier_name,
    batch_number,
    quantity,
    fabrication_date,
    expiration_date,
    quality_status,
    needs_examination || false,
    JSON.stringify(locations_info || []),
    id
  ];
  
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error updating recipe:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ message: 'Recipe updated successfully' });
  });
});

// DELETE /api/recipes/:id - Delete a recipe
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM recipes WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting recipe:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ message: 'Recipe deleted successfully' });
  });
});

// GET /api/recipes/by-movement/:movement_id - Get recipe by movement ID
router.get('/by-movement/:movement_id', (req, res) => {
  const { movement_id } = req.params;
  
  const query = `
    SELECT
      r.*,
      p.nom as product_designation,
      p.reference as product_reference,
      p.unite as product_unite,
      m.date as movement_date,
      m.time as movement_time
    FROM recipes r
    LEFT JOIN products p ON r.product_id = p.id
    LEFT JOIN movements m ON r.movement_id = m.id
    WHERE r.movement_id = ?
  `;
  
  db.query(query, [movement_id], (err, results) => {
    if (err) {
      console.error('Error fetching recipe by movement:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Recipe not found for this movement' });
    }
    
    const recipe = {
      ...results[0],
      locations_info: results[0].locations_info ? JSON.parse(results[0].locations_info) : []
    };
    
    res.json(recipe);
  });
});

module.exports = router;