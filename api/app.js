const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;
const db = require('./db');
const qualityRouter = require('./routes/quality');
const recipesRouter = require('./routes/recipes');

const cors = require('cors');
app.use(cors());

app.use(express.json());
app.use('/api/quality', qualityRouter);
app.use('/api/recipes', recipesRouter);


// Health check endpoint for Electron app
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Function to broadcast new notifications to all connected clients
function broadcastNotification(notification) {
  console.log('🔔 Broadcasting notification via WebSocket:', notification);
  io.emit('newNotification', notification);
  console.log('📡 WebSocket broadcast sent to all connected clients');
}

// List all fournisseurs
app.get('/fournisseurs', (req, res) => {
  db.query('SELECT * FROM fournisseurs', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    const parsed = results.map(f => {
      let telephones = [];
      if (f.telephones) {
        try {
          // If already a JSON array, parse it
          if (typeof f.telephones === 'string' && f.telephones.trim().startsWith('[')) {
            telephones = JSON.parse(f.telephones);
          } else {
            // Otherwise, wrap as array
            telephones = [f.telephones];
          }
        } catch (e) {
          telephones = [f.telephones];
        }
      }
      return { ...f, telephones };
    });
    res.json(parsed);
  });
});

// Insert a new fournisseur
app.post('/fournisseurs', (req, res) => {
  const { code, designation, telephones, adresse, type } = req.body;
  if (!code || !designation || !type) return res.status(400).json({ error: 'Code, designation, and type are required' });
  db.query('INSERT INTO fournisseurs (code, designation, telephones, adresse, type) VALUES (?, ?, ?, ?, ?)', [code, designation, JSON.stringify(telephones || []), adresse || '', type], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    db.query('SELECT * FROM fournisseurs WHERE id = ?', [result.insertId], (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'Database error', details: err2 });
      const f = rows[0];
      f.telephones = f.telephones ? JSON.parse(f.telephones) : [];
      res.status(201).json(f);
    });
  });
});

// Get one fournisseur by id
app.get('/fournisseurs/:id', (req, res) => {
  db.query('SELECT * FROM fournisseurs WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    if (!results.length) return res.status(404).json({ error: 'Not found' });
    const f = results[0];
    if (f.telephones) {
      try {
        if (typeof f.telephones === 'string' && f.telephones.trim().startsWith('[')) {
          f.telephones = JSON.parse(f.telephones);
        } else {
          f.telephones = [f.telephones];
        }
      } catch {
        f.telephones = [f.telephones];
      }
    } else {
      f.telephones = [];
    }
    res.json(f);
  });
});

// Update fournisseur by id
app.put('/fournisseurs/:id', (req, res) => {
  const { code, designation, telephones, adresse, type } = req.body;
  db.query('UPDATE fournisseurs SET code = ?, designation = ?, telephones = ?, adresse = ?, type = ? WHERE id = ?', [code, designation, JSON.stringify(telephones || []), adresse || '', type, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    db.query('SELECT * FROM fournisseurs WHERE id = ?', [req.params.id], (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'Database error', details: err2 });
      const f = rows[0];
      f.telephones = f.telephones ? JSON.parse(f.telephones) : [];
      res.json(f);
    });
  });
});

// Delete fournisseur by id
app.delete('/fournisseurs/:id', (req, res) => {
  db.query('DELETE FROM fournisseurs WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

// List all locations
app.get('/api/locations', (req, res) => {
  db.query('SELECT * FROM locations', async (err, locations) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    // For each location, fetch etages and parts
    const promises = locations.map(loc => {
      return new Promise((resolve, reject) => {
        db.query('SELECT * FROM location_etages WHERE location_id = ?', [loc.id], (err1, etages) => {
          if (err1) return reject(err1);
          db.query('SELECT * FROM location_parts WHERE location_id = ?', [loc.id], (err2, parts) => {
            if (err2) return reject(err2);
            resolve({
              ...loc,
              etages,
              parts,
            });
          });
        });
      });
    });
    Promise.all(promises)
      .then(locationsWithDetails => res.json(locationsWithDetails))
      .catch(error => res.status(500).json({ error: 'Database error', details: error }));
  });
});

// Get stock of each raw material by location/etage/part
app.get('/api/materials/stock', (req, res) => {
  db.query(
    `SELECT p.id as material_id, p.nom as material_name, p.unite, p.stock,
            l.id as location_id, l.name as location_name,
            e.id as etage_id, e.name as etage_name, e.currentStock as etage_stock,
            pt.id as part_id, pt.name as part_name, pt.currentStock as part_stock
     FROM products p
     LEFT JOIN movements m ON p.id = m.product_id
     LEFT JOIN locations l ON m.location_id = l.id
     LEFT JOIN location_etages e ON m.etage_id = e.id
     LEFT JOIN location_parts pt ON m.part_id = pt.id
     WHERE p.type = 'matiere'
     GROUP BY p.id, l.id, e.id, pt.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      // Group by material
      const result = {};
      rows.forEach(row => {
        if (!result[row.material_id]) {
          result[row.material_id] = {
            id: row.material_id,
            name: row.material_name,
            unite: row.unite,
            stock: row.stock,
            locations: []
          };
        }
        result[row.material_id].locations.push({
          location_id: row.location_id,
          location_name: row.location_name,
          etage_id: row.etage_id,
          etage_name: row.etage_name,
          etage_stock: row.etage_stock,
          part_id: row.part_id,
          part_name: row.part_name,
          part_stock: row.part_stock
        });
      });
      res.json(Object.values(result));
    }
  );
});

// Add a new location with etages or parts
app.post('/api/locations', (req, res) => {
  const { name, description, type, is_prison, etages, parts } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    db.query('INSERT INTO locations (name, description, type, is_prison) VALUES (?, ?, ?, ?)', [name, description || '', type, is_prison ? 1 : 0], (err, result) => {
      if (err) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err }));
      const locationId = result.insertId;
      if (type === 'with_etages') {
        if (!Array.isArray(etages) || etages.length === 0) return db.rollback(() => res.status(400).json({ error: 'At least one etage is required' }));
        const etageValues = etages.map(et => [locationId, et.name, et.places, et.currentStock || 0]);
        db.query('INSERT INTO location_etages (location_id, name, places, currentStock) VALUES ?', [etageValues], (err2) => {
          if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
          db.commit(err3 => {
            if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
            db.query('SELECT * FROM locations WHERE id = ?', [locationId], (err4, rows) => {
              if (err4) return res.status(500).json({ error: 'Database error', details: err4 });
              db.query('SELECT * FROM location_etages WHERE location_id = ?', [locationId], (err5, etagesRows) => {
                if (err5) return res.status(500).json({ error: 'Database error', details: err5 });
                res.status(201).json({ ...rows[0], etages: etagesRows, parts: [] });
              });
            });
          });
        });
      } else if (type === 'with_parts') {
        if (!Array.isArray(parts) || parts.length === 0) return db.rollback(() => res.status(400).json({ error: 'At least one part is required' }));
        const partValues = parts.map(pt => [locationId, pt.name, pt.maxCapacity, pt.currentStock || 0]);
        db.query('INSERT INTO location_parts (location_id, name, maxCapacity, currentStock) VALUES ?', [partValues], (err2) => {
          if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
          db.commit(err3 => {
            if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
            db.query('SELECT * FROM locations WHERE id = ?', [locationId], (err4, rows) => {
              if (err4) return res.status(500).json({ error: 'Database error', details: err4 });
              db.query('SELECT * FROM location_parts WHERE location_id = ?', [locationId], (err5, partsRows) => {
                if (err5) return res.status(500).json({ error: 'Database error', details: err5 });
                res.status(201).json({ ...rows[0], etages: [], parts: partsRows });
              });
            });
          });
        });
      } else {
        db.rollback(() => res.status(400).json({ error: 'Invalid type' }));
      }
    });
  });
});

// Update a location by id
app.put('/api/locations/:id', (req, res) => {
  const { name, description, type, is_prison, etages, parts } = req.body;
  const locationId = req.params.id;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    db.query('UPDATE locations SET name = ?, description = ?, type = ?, is_prison = ? WHERE id = ?', [name, description || '', type, is_prison ? 1 : 0, locationId], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return db.rollback(() => res.status(400).json({ error: "DUPLICATE_NAME", message: "A location with this name already exists." }));
        }
        return db.rollback(() => res.status(500).json({ error: 'Database error' }));
      }
      // Remove old etages/parts and insert new ones
      db.query('DELETE FROM location_etages WHERE location_id = ?', [locationId], (err1) => {
        if (err1) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err1 }));
        db.query('DELETE FROM location_parts WHERE location_id = ?', [locationId], (err2) => {
          if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
          if (type === 'with_etages') {
            if (!Array.isArray(etages) || etages.length === 0) return db.rollback(() => res.status(400).json({ error: 'At least one etage is required' }));
            const etageValues = etages.map(et => [locationId, et.name, et.places, et.currentStock || 0]);
            db.query('INSERT INTO location_etages (location_id, name, places, currentStock) VALUES ?', [etageValues], (err3) => {
              if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
              db.commit(err4 => {
                if (err4) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err4 }));
                db.query('SELECT * FROM locations WHERE id = ?', [locationId], (err5, rows) => {
                  if (err5) return res.status(500).json({ error: 'Database error', details: err5 });
                  db.query('SELECT * FROM location_etages WHERE location_id = ?', [locationId], (err6, etagesRows) => {
                    if (err6) return res.status(500).json({ error: 'Database error', details: err6 });
                    res.json({ ...rows[0], etages: etagesRows, parts: [] });
                  });
                });
              });
            });
          } else if (type === 'with_parts') {
            if (!Array.isArray(parts) || parts.length === 0) return db.rollback(() => res.status(400).json({ error: 'At least one part is required' }));
            const partValues = parts.map(pt => [locationId, pt.name, pt.maxCapacity, pt.currentStock || 0]);
            db.query('INSERT INTO location_parts (location_id, name, maxCapacity, currentStock) VALUES ?', [partValues], (err3) => {
              if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
              db.commit(err4 => {
                if (err4) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err4 }));
                db.query('SELECT * FROM locations WHERE id = ?', [locationId], (err5, rows) => {
                  if (err5) return res.status(500).json({ error: 'Database error', details: err5 });
                  db.query('SELECT * FROM location_parts WHERE location_id = ?', [locationId], (err6, partsRows) => {
                    if (err6) return res.status(500).json({ error: 'Database error', details: err6 });
                    res.json({ ...rows[0], etages: [], parts: partsRows });
                  });
                });
              });
            });
          } else {
            db.rollback(() => res.status(400).json({ error: 'Invalid type' }));
          }
        });
      });
    });
  });
});

// Delete a location by id (and its etages/parts)
app.delete('/api/locations/:id', (req, res) => {
  const locationId = req.params.id;
  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    // Delete etages
    db.query('DELETE FROM location_etages WHERE location_id = ?', [locationId], (err1) => {
      if (err1) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err1 }));
      // Delete parts
      db.query('DELETE FROM location_parts WHERE location_id = ?', [locationId], (err2) => {
        if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
        // Delete location
        db.query('DELETE FROM locations WHERE id = ?', [locationId], (err3, result) => {
          if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
          if (result.affectedRows === 0) return db.rollback(() => res.status(404).json({ error: 'Not found' }));
          db.commit(err4 => {
            if (err4) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err4 }));
            res.json({ success: true });
          });
        });
      });
    });
  });
});

// Insert a new product
app.post('/api/products', (req, res) => {
  const { reference, nom, unite, alerte, type } = req.body;
  if (!reference || !nom || !unite) {
    return res.status(400).json({ error: 'Reference, nom, and unite are required' });
  }
  const productType = type || 'matiere';
  db.query(
    'INSERT INTO products (reference, nom, unite, alerte, type) VALUES (?, ?, ?, ?, ?)',
    [reference, nom, unite, alerte, productType],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      db.query('SELECT * FROM products WHERE id = ?', [result.insertId], (err2, rows) => {
        if (err2) return res.status(500).json({ error: 'Database error', details: err2 });
        res.status(201).json(rows[0]);
      });
    }
  );
});

// Add a new product with its materials (BOM)
app.post('/api/products-with-materials', (req, res) => {
  const { reference, nom, type, materials, alerte } = req.body;
  if (!reference || !nom || !type) {
    return res.status(400).json({ error: 'Reference, nom, and type are required' });
  }
  // Default values for other columns
  const unite = '';
  const statut = 'Alerte';
  const stock = 0;
  const total_sortie = 0;
  const total_entrer = 0;

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    db.query(
      'INSERT INTO products (reference, nom, type, unite, statut, stock, total_sortie, total_entrer, alerte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [reference, nom, type, unite, statut, stock, total_sortie, total_entrer, alerte || 0],
      (err, result) => {
        if (err) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err }));
        const productId = result.insertId;
        if (!Array.isArray(materials) || materials.length === 0) {
          return db.commit(err2 => {
            if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
            res.status(201).json({ id: productId, reference, nom, type, materials: [] });
          });
        }
        // Insert materials
        let idx = 0;
        function insertNextMaterial(err) {
          if (err) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err }));
          if (idx >= materials.length) {
            return db.commit(err2 => {
              if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
              res.status(201).json({ id: productId, reference, nom, type, materials });
            });
          }
          const mat = materials[idx++];
          const materialType = mat.materialType || 'matiere'; // Default to raw material if not specified

          // Search for the material based on type
          const searchQuery = materialType === 'matiere'
            ? 'SELECT id FROM products WHERE nom = ? AND type = "matiere"'
            : 'SELECT id FROM products WHERE nom = ? AND type = ?';
          const searchParams = materialType === 'matiere'
            ? [mat.name]
            : [mat.name, materialType];

          db.query(searchQuery, searchParams, (err, rows) => {
            if (err) return insertNextMaterial(err);
            if (!rows.length) return insertNextMaterial(); // skip if not found
            const materialId = rows[0].id;
            db.query(
              'INSERT INTO product_materials (product_id, material_id, material_type, quantity) VALUES (?, ?, ?, ?)',
              [productId, materialId, materialType, mat.quantity],
              insertNextMaterial
            );
          });
        }
        insertNextMaterial();
      }
    );
  });
});

// Update a product and its materials (BOM)
app.put('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const { reference, nom, type, materials, alerte } = req.body;
  if (!reference || !nom || !type) {
    return res.status(400).json({ error: 'Reference, nom, and type are required' });
  }
  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    // Update product fields
    db.query(
      'UPDATE products SET reference = ?, nom = ?, type = ?, alerte = ? WHERE id = ?',
      [reference, nom, type, alerte || 0, productId],
      (err, result) => {
        if (err) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err }));
        // Remove old materials
        db.query('DELETE FROM product_materials WHERE product_id = ?', [productId], (err2) => {
          if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
          if (!Array.isArray(materials) || materials.length === 0) {
            return db.commit(err3 => {
              if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
              db.query('SELECT * FROM products WHERE id = ?', [productId], (err4, rows) => {
                if (err4) return res.status(500).json({ error: 'Database error', details: err4 });
                res.json({ ...rows[0], materials: [] });
              });
            });
          }
          // Insert new materials
          let idx = 0;
          function insertNextMaterial(err) {
            if (err) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err }));
            if (idx >= materials.length) {
              return db.commit(err3 => {
                if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
                db.query('SELECT * FROM products WHERE id = ?', [productId], (err4, rows) => {
                  if (err4) return res.status(500).json({ error: 'Database error', details: err4 });
                  res.json({ ...rows[0], materials });
                });
              });
            }
            const mat = materials[idx++];
            const materialType = mat.materialType || 'matiere';
            const searchQuery = materialType === 'matiere'
              ? 'SELECT id FROM products WHERE nom = ? AND type = "matiere"'
              : 'SELECT id FROM products WHERE nom = ? AND type = ?';
            const searchParams = materialType === 'matiere'
              ? [mat.name]
              : [mat.name, materialType];
            db.query(searchQuery, searchParams, (err, rows) => {
              if (err) return insertNextMaterial(err);
              if (!rows.length) return insertNextMaterial(); // skip if not found
              const materialId = rows[0].id;
              db.query(
                'INSERT INTO product_materials (product_id, material_id, material_type, quantity) VALUES (?, ?, ?, ?)',
                [productId, materialId, materialType, mat.quantity],
                insertNextMaterial
              );
            });
          }
          insertNextMaterial();
        });
      }
    );
  });
});

// Delete a product and its BOM by id
app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    // Delete BOM/materials first
    db.query('DELETE FROM product_materials WHERE product_id = ?', [productId], (err1) => {
      if (err1) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err1 }));
      // Delete the product
      db.query('DELETE FROM products WHERE id = ?', [productId], (err2, result) => {
        if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
        if (result.affectedRows === 0) return db.rollback(() => res.status(404).json({ error: 'Not found' }));
        db.commit(err3 => {
          if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
          res.json({ success: true });
        });
      });
    });
  });
});

// List all products
app.get('/api/products', (req, res) => {
  const { type, name } = req.query;
  let query = 'SELECT * FROM products';
  const params = [];

  if (type || name) {
    query += ' WHERE';
    if (type) {
      query += ' type = ?';
      params.push(type);
    }
    if (name) {
      if (type) query += ' AND';
      query += ' nom = ?';
      params.push(name);
    }
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    res.json(results);
  });
});

// Get a single product by id
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!results.length) return res.status(404).json({ error: 'Product not found' });
    res.json(results[0]);
  });
});

// List all semi-products (type is neither 'matiere' nor 'fini')
app.get('/api/semi-products', (req, res) => {
  db.query("SELECT * FROM products WHERE type != 'matiere' AND type != 'finis'", (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    res.json(results);
  });
});

// List all finished products (type is 'fini')
app.get('/api/finished-products', (req, res) => {
  db.query("SELECT * FROM products WHERE type = 'finis'", (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    res.json(results);
  });
});

// Get a single semi-product by reference
app.get('/api/semi-products/by-reference/:reference', (req, res) => {
  const { reference } = req.params;
  db.query('SELECT * FROM products WHERE reference = ? AND type != "matiere" AND type != "finis"', [reference], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!results.length) return res.status(404).json({ error: 'Semi-product not found' });
    res.json(results[0]);
  });
});

// Get all available materials (raw materials and semi-finished products)
app.get('/api/available-materials', (req, res) => {
  db.query(
    `SELECT id, nom, unite, type FROM products WHERE type IN ('matiere', 'semi') ORDER BY type, nom`,
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      res.json(results);
    }
  );
});

// Get materials (BOM) for a product
app.get('/api/products/:id/materials', (req, res) => {
  const productId = req.params.id;
  db.query(
    `SELECT pm.product_id, pm.material_id, pm.quantity, pm.material_type, p.nom as name, p.unite as unit
     FROM product_materials pm
     JOIN products p ON pm.material_id = p.id
     WHERE pm.product_id = ?`,
    [productId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      res.json(rows);
    }
  );
});

// Add a new movement (for product_type 'matiere' or 'semi')
app.post('/api/movements', (req, res) => {
  const {
    product_type,
    product_id,
    status,
    quantity,
    location_id,
    date,
    time,
    batch_number,
    fournisseur_id,
    atelier,
    staff_id,
    etage_id,
    part_id,
    fabricationDate,
    expirationDate,
    internal_transfer,
    is_transfer,
    quality_status,
    decision,
    isolation_reason,
    created_at
  } = req.body;

  console.log('[DEBUG] /api/movements POST body:', req.body);

  if (!product_id || !status || !quantity || !location_id) {
    return res.status(400).json({ error: 'product_id, status, quantity, and location_id are required' });
  }

  // Use current date for fabrication/expiration if not provided
  const now = new Date();
  const fabrication = fabricationDate || now.toISOString().slice(0, 10);
  const expiration = expirationDate || fabricationDate; // Allow null for expiration date
  const movementDate = date || fabrication;
  const movementTime = time || now.toTimeString().slice(0, 8);
  const createdAtDate = created_at ? new Date(created_at) : now; // Use provided created_at or current time

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });

    db.query(
      `INSERT INTO movements (
        product_type, product_id, status, quantity, location_id, date, time, batch_number, fournisseur_id, atelier, staff_id, etage_id, part_id, fabrication_date, expiration_date, created_at, is_transfer, quality_status, needs_examination, decision, isolation_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_type,
        product_id,
        status,
        quantity,
        location_id,
        movementDate,
        movementTime,
        batch_number || null,
        fournisseur_id || null,
        atelier || null,
        staff_id || null,
        etage_id || null,
        part_id || null,
        fabricationDate || null,
        expiration,
        createdAtDate,
        !!is_transfer,
        quality_status || null,
        1,
        decision || null,
        isolation_reason || null
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => res.status(500).json({ error: 'Database error', details: err }));
        }

        // Store notification data for later broadcast
        let notificationData = null;

        // Prepare notification data if needed
        if (status !== 'Sortie' && (!is_transfer || is_transfer === false)) {
          notificationData = {
            product_id,
            product_type,
            status,
            quantity,
            location_id,
            movement_id: result.insertId
          };
        }

        // If affect_stock is false, skip stock update and just commit
        if (req.body.affect_stock === false) {
          db.commit(err6 => {
            if (err6) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err6 }));

            // Send response first
            res.status(201).json({
              id: result.insertId,
              product_type,
              product_id,
              status,
              quantity,
              location_id,
              date: movementDate,
              time: movementTime,
              batch_number,
              fournisseur_id,
              atelier,
              staff_id,
              etage_id,
              part_id,
              fabricationDate,
              expirationDate,
              is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
              decision: decision || null,
              isolation_reason: isolation_reason || null
            });

            // Then handle notifications asynchronously
            if (notificationData) {
              handleNotificationAsync(notificationData);
            }
          });
          return;
        }

        // Handle stock updates for movements that affect stock
        db.query('SELECT nom, stock, alerte FROM products WHERE id = ?', [product_id], (err6, productRows) => {
          if (err6) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err6 }));
          if (productRows.length === 0) return db.rollback(() => res.status(404).json({ error: 'Product not found' }));

          const { nom, stock: currentStock, alerte } = productRows[0];
          let newStock = currentStock;

          // Update product stock based on movement type
          if (status === 'Entrée') {
            newStock = currentStock + quantity;
            db.query(
              'UPDATE products SET stock = stock + ?, total_entrer = total_entrer + ? WHERE id = ?',
              [quantity, quantity, product_id],
              (err7) => {
                if (err7) return db.rollback(() => res.status(500).json({ error: 'Failed to update product stock' }));

                // Update location stock for Entrée
                const updateLocationStock = (callback) => {
                  if (etage_id) {
                    db.query('UPDATE location_etages SET currentStock = currentStock + ? WHERE id = ?', [quantity, etage_id], (err8, result) => {
                      if (err8) return callback(err8);
                      if (result.affectedRows === 0) return callback(new Error('Invalid etage_id for location_etages'));
                      callback();
                    });
                  } else if (part_id) {
                    db.query('UPDATE location_parts SET currentStock = currentStock + ? WHERE id = ?', [quantity, part_id], (err8, result) => {
                      if (err8) return callback(err8);
                      if (result.affectedRows === 0) return callback(new Error('Invalid part_id for location_parts'));
                      callback();
                    });
                  } else {
                    callback();
                  }
                };

                updateLocationStock((err8) => {
                  if (err8) return db.rollback(() => res.status(500).json({ error: 'Failed to update location stock', details: err8 }));

                  db.query(
                    `UPDATE notifications SET is_read = 1 WHERE product_id = ? AND (message LIKE '%Stock alert%' OR message LIKE '%examination required%') AND is_read = 0`,
                    [product_id],
                    (err8_5) => {
                      if (err8_5) {
                        console.error('Error marking notifications as read:', err8_5);
                      }

                      // Check for stock alert after entry
                      if (alerte > 0 && newStock <= alerte) {
                        const message = `Stock alert: Product "${nom}" (ID: ${product_id}) is at or below alert level (${newStock}/${alerte})`;

                        // Check if there's already an unread stock alert notification for this product
                        db.query('SELECT id FROM notifications WHERE product_id = ? AND message LIKE \'%Stock alert%\' AND is_read = 0 LIMIT 1', [product_id], (err9, notifRows) => {
                          if (err9) {
                            return db.rollback(() => res.status(500).json({ error: 'Database error', details: err9 }));
                          }

                          if (notifRows.length === 0) {
                            // No unread stock alert notification, insert new
                            db.query('INSERT INTO notifications (product_id, message) VALUES (?, ?)', [product_id, message], (err9, stockNotifResult) => {
                              if (err9) {
                                return db.rollback(() => res.status(500).json({ error: 'Database error', details: err9 }));
                              }
                              // Broadcast stock alert notification via WebSocket
                              const stockNotification = {
                                id: stockNotifResult.insertId,
                                product_id: product_id,
                                message: message,
                                is_read: 0,
                                created_at: new Date(),
                                product_name: nom
                              };
                              broadcastNotification(stockNotification);

                              // Also check for examination notification (only if not Sortie and not internal transfer)
                              if (status !== 'Sortie' && (!is_transfer || is_transfer === false)) {
                                const examMessage = `Quality examination required: Product "${nom}" (ID: ${product_id}) movement requires verification`;
                                db.query('SELECT id FROM notifications WHERE product_id = ? AND message LIKE \'%examination required%\' AND is_read = 0 LIMIT 1', [product_id], (err10, examNotifRows) => {
                                  if (err10) {
                                    return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));
                                  }
                                  if (examNotifRows.length === 0) {
                                    // No unread examination notification, insert new
                                    db.query('INSERT INTO notifications (product_id, message) VALUES (?, ?)', [product_id, examMessage], (err11, examNotifResult) => {
                                      if (err11) {
                                        return db.rollback(() => res.status(500).json({ error: 'Database error', details: err11 }));
                                      }
                                      // Broadcast examination notification via WebSocket
                                      const examNotification = {
                                        id: examNotifResult.insertId,
                                        product_id: product_id,
                                        message: examMessage,
                                        is_read: 0,
                                        created_at: new Date(),
                                        product_name: nom
                                      };
                                      broadcastNotification(examNotification);

                                      db.commit(err12 => {
                                        if (err12) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err12 }));

                                        // Send response first
                                        res.status(201).json({
                                          id: result.insertId,
                                          product_type,
                                          product_id,
                                          status,
                                          quantity,
                                          location_id,
                                          date: movementDate,
                                          time: movementTime,
                                          batch_number,
                                          fournisseur_id,
                                          atelier,
                                          staff_id,
                                          etage_id,
                                          part_id,
                                          fabricationDate,
                                          expirationDate,
                                          is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                          decision: decision || null,
                                          isolation_reason: isolation_reason || null
                                        });
                                      });
                                    });
                                  } else {
                                    // Unread examination notification exists, update its timestamp
                                    const examNotifId = examNotifRows[0].id;
                                    db.query('UPDATE notifications SET message = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [examMessage, examNotifId], (err11) => {
                                      if (err11) {
                                        return db.rollback(() => res.status(500).json({ error: 'Database error', details: err11 }));
                                      }
                                      // Broadcast updated examination notification via WebSocket
                                      const updatedExamNotification = {
                                        id: examNotifId,
                                        product_id: product_id,
                                        message: examMessage,
                                        is_read: 0,
                                        created_at: new Date(),
                                        product_name: nom
                                      };
                                      broadcastNotification(updatedExamNotification);

                                      db.commit(err12 => {
                                        if (err12) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err12 }));

                                        // Send response first
                                        res.status(201).json({
                                          id: result.insertId,
                                          product_type,
                                          product_id,
                                          status,
                                          quantity,
                                          location_id,
                                          date: movementDate,
                                          time: movementTime,
                                          batch_number,
                                          fournisseur_id,
                                          atelier,
                                          staff_id,
                                          etage_id,
                                          part_id,
                                          fabricationDate,
                                          expirationDate,
                                          is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                          decision: decision || null,
                                          isolation_reason: isolation_reason || null
                                        });
                                      });
                                    });
                                  }
                                });
                              } else {
                                db.commit(err10 => {
                                  if (err10) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));

                                  // Send response first
                                  res.status(201).json({
                                    id: result.insertId,
                                    product_type,
                                    product_id,
                                    status,
                                    quantity,
                                    location_id,
                                    date: movementDate,
                                    time: movementTime,
                                    batch_number,
                                    fournisseur_id,
                                    atelier,
                                    staff_id,
                                    etage_id,
                                    part_id,
                                    fabricationDate,
                                    expirationDate,
                                    is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                    decision: decision || null,
                                    isolation_reason: isolation_reason || null
                                  });
                                });
                              }
                            });
                          } else {
                            // Unread stock alert notification exists, update its message
                            const notifId = notifRows[0].id;
                            db.query('UPDATE notifications SET message = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [message, notifId], (err9) => {
                              if (err9) {
                                return db.rollback(() => res.status(500).json({ error: 'Database error', details: err9 }));
                              }
                              // Also check for examination notification (only if not Sortie and not internal transfer)
                              if (status !== 'Sortie' && (!is_transfer || is_transfer === false)) {
                                const examMessage = `Quality examination required: Product "${nom}" (ID: ${product_id}) movement requires verification`;
                                db.query('SELECT id FROM notifications WHERE product_id = ? AND message LIKE \'%examination required%\' AND is_read = 0 LIMIT 1', [product_id], (err10, examNotifRows) => {
                                  if (err10) {
                                    return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));
                                  }
                                  if (examNotifRows.length === 0) {
                                    // No unread examination notification, insert new
                                    db.query('INSERT INTO notifications (product_id, message) VALUES (?, ?)', [product_id, examMessage], (err11, examNotifResult) => {
                                      if (err11) {
                                        return db.rollback(() => res.status(500).json({ error: 'Database error', details: err11 }));
                                      }
                                      // Broadcast examination notification via WebSocket
                                      const examNotification = {
                                        id: examNotifResult.insertId,
                                        product_id: product_id,
                                        message: examMessage,
                                        is_read: 0,
                                        created_at: new Date(),
                                        product_name: nom
                                      };
                                      broadcastNotification(examNotification);

                                      db.commit(err12 => {
                                        if (err12) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err12 }));

                                        // Send response first
                                        res.status(201).json({
                                          id: result.insertId,
                                          product_type,
                                          product_id,
                                          status,
                                          quantity,
                                          location_id,
                                          date: movementDate,
                                          time: movementTime,
                                          batch_number,
                                          fournisseur_id,
                                          atelier,
                                          staff_id,
                                          etage_id,
                                          part_id,
                                          fabricationDate,
                                          expirationDate,
                                          is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                          decision: decision || null,
                                          isolation_reason: isolation_reason || null
                                        });
                                      });
                                    });
                                  } else {
                                    // Unread examination notification exists, update its timestamp
                                    const examNotifId = examNotifRows[0].id;
                                    db.query('UPDATE notifications SET message = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [examMessage, examNotifId], (err11) => {
                                      if (err11) {
                                        return db.rollback(() => res.status(500).json({ error: 'Database error', details: err11 }));
                                      }
                                      // Broadcast updated examination notification via WebSocket
                                      const updatedExamNotification = {
                                        id: examNotifId,
                                        product_id: product_id,
                                        message: examMessage,
                                        is_read: 0,
                                        created_at: new Date(),
                                        product_name: nom
                                      };
                                      broadcastNotification(updatedExamNotification);

                                      db.commit(err12 => {
                                        if (err12) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err12 }));

                                        // Send response first
                                        res.status(201).json({
                                          id: result.insertId,
                                          product_type,
                                          product_id,
                                          status,
                                          quantity,
                                          location_id,
                                          date: movementDate,
                                          time: movementTime,
                                          batch_number,
                                          fournisseur_id,
                                          atelier,
                                          staff_id,
                                          etage_id,
                                          part_id,
                                          fabricationDate,
                                          expirationDate,
                                          is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                          decision: decision || null,
                                          isolation_reason: isolation_reason || null
                                        });
                                      });
                                    });
                                  }
                                });
                              } else {
                                db.commit(err10 => {
                                  if (err10) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));

                                  // Send response first
                                  res.status(201).json({
                                    id: result.insertId,
                                    product_type,
                                    product_id,
                                    status,
                                    quantity,
                                    location_id,
                                    date: movementDate,
                                    time: movementTime,
                                    batch_number,
                                    fournisseur_id,
                                    atelier,
                                    staff_id,
                                    etage_id,
                                    part_id,
                                    fabricationDate,
                                    expirationDate,
                                    is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                    decision: decision || null,
                                    isolation_reason: isolation_reason || null
                                  });
                                });
                              }
                            });
                          }
                        });
                      } else {
                        // No stock alert, but check if movement needs examination and send notification
                        // Only send notifications if: status is NOT "Sortie" AND internal_transfer is 0 (not an internal transfer)
                        if (1 && status !== 'Sortie' && (!is_transfer || is_transfer === false)) { // needs_examination is always 1 for new movements
                          const productName = nom; // We already have the product name from the stock check
                          const message = `Quality examination required: Product "${productName}" (ID: ${product_id}) movement requires verification`;

                          // Check if there's already an unread examination notification for this product
                          db.query('SELECT id FROM notifications WHERE product_id = ? AND message LIKE \'%examination required%\' AND is_read = 0 LIMIT 1', [product_id], (err8, notifRows) => {
                            if (err8) {
                              return db.rollback(() => res.status(500).json({ error: 'Database error', details: err8 }));
                            }

                            if (notifRows.length === 0) {
                              // No unread examination notification, insert new
                              db.query('INSERT INTO notifications (product_id, message) VALUES (?, ?)', [product_id, message], (err9, notifResult) => {
                                if (err9) {
                                  return db.rollback(() => res.status(500).json({ error: 'Database error', details: err9 }));
                                }
                                // Broadcast new notification via WebSocket
                                const newNotification = {
                                  id: notifResult.insertId,
                                  product_id: product_id,
                                  message: message,
                                  is_read: 0,
                                  created_at: new Date(),
                                  product_name: productName
                                };
                                broadcastNotification(newNotification);

                                db.commit(err10 => {
                                  if (err10) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));

                                  // Send response first
                                  res.status(201).json({
                                    id: result.insertId,
                                    product_type,
                                    product_id,
                                    status,
                                    quantity,
                                    location_id,
                                    date: movementDate,
                                    time: movementTime,
                                    batch_number,
                                    fournisseur_id,
                                    atelier,
                                    staff_id,
                                    etage_id,
                                    part_id,
                                    fabricationDate,
                                    expirationDate,
                                    is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                    decision: decision || null,
                                    isolation_reason: isolation_reason || null
                                  });
                                });
                              });
                            } else {
                              // Unread examination notification exists, update its timestamp
                              const notifId = notifRows[0].id;
                              db.query('UPDATE notifications SET message = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [message, notifId], (err9) => {
                                if (err9) {
                                  return db.rollback(() => res.status(500).json({ error: 'Database error', details: err9 }));
                                }
                                // Broadcast updated notification via WebSocket
                                const updatedNotification = {
                                  id: notifId,
                                  product_id: product_id,
                                  message: message,
                                  is_read: 0,
                                  created_at: new Date(),
                                  product_name: productName
                                };
                                broadcastNotification(updatedNotification);

                                db.commit(err10 => {
                                  if (err10) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));

                                  // Send response first
                                  res.status(201).json({
                                    id: result.insertId,
                                    product_type,
                                    product_id,
                                    status,
                                    quantity,
                                    location_id,
                                    date: movementDate,
                                    time: movementTime,
                                    batch_number,
                                    fournisseur_id,
                                    atelier,
                                    staff_id,
                                    etage_id,
                                    part_id,
                                    fabricationDate,
                                    expirationDate,
                                    is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                                    decision: decision || null,
                                    isolation_reason: isolation_reason || null
                                  });
                                });
                              });
                            }
                          });
                        } else {
                          db.commit(err8 => {
                            if (err8) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err8 }));

                            // Send response first
                            res.status(201).json({
                              id: result.insertId,
                              product_type,
                              product_id,
                              status,
                              quantity,
                              location_id,
                              date: movementDate,
                              time: movementTime,
                              batch_number,
                              fournisseur_id,
                              atelier,
                              staff_id,
                              etage_id,
                              part_id,
                              fabricationDate,
                              expirationDate,
                              is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                              decision: decision || null,
                              isolation_reason: isolation_reason || null
                            });
                          });
                        }
                      }
                    }); // Close mark notifications as read callback
                }); // Close updateLocationStock callback
              }
            );
          } else if (status === 'Sortie') {
            newStock = currentStock - quantity;
            db.query(
              'UPDATE products SET stock = stock - ?, total_sortie = total_sortie + ? WHERE id = ?',
              [quantity, quantity, product_id],
              (err7) => {
                if (err7) return db.rollback(() => res.status(500).json({ error: 'Failed to update product stock' }));

                // Update location stock for Sortie
                const updateLocationStock = (callback) => {
                  if (etage_id) {
                    db.query('UPDATE location_etages SET currentStock = currentStock - ? WHERE id = ?', [quantity, etage_id], (err8, result) => {
                      if (err8) return callback(err8);
                      if (result.affectedRows === 0) return callback(new Error('Invalid etage_id for location_etages'));
                      callback();
                    });
                  } else if (part_id) {
                    db.query('UPDATE location_parts SET currentStock = currentStock - ? WHERE id = ?', [quantity, part_id], (err8, result) => {
                      if (err8) return callback(err8);
                      if (result.affectedRows === 0) return callback(new Error('Invalid part_id for location_parts'));
                      callback();
                    });
                  } else {
                    callback();
                  }
                };

                updateLocationStock((err8) => {
                  if (err8) return db.rollback(() => res.status(500).json({ error: 'Failed to update location stock', details: err8 }));

                  // Check for stock alert after sortie movement
                  if (alerte > 0 && newStock <= alerte) {
                    const message = `Stock alert: Product "${nom}" (ID: ${product_id}) is at or below alert level (${newStock}/${alerte})`;

                    // Check if there's already an unread stock alert notification for this product
                    db.query('SELECT id FROM notifications WHERE product_id = ? AND message LIKE \'%Stock alert%\' AND is_read = 0 LIMIT 1', [product_id], (err9, notifRows) => {
                      if (err9) {
                        return db.rollback(() => res.status(500).json({ error: 'Database error', details: err9 }));
                      }

                      if (notifRows.length === 0) {
                        // No unread stock alert notification, insert new
                        db.query('INSERT INTO notifications (product_id, message) VALUES (?, ?)', [product_id, message], (err10, stockNotifResult) => {
                          if (err10) {
                            return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));
                          }
                          // Broadcast stock alert notification via WebSocket
                          const stockNotification = {
                            id: stockNotifResult.insertId,
                            product_id: product_id,
                            message: message,
                            is_read: 0,
                            created_at: new Date(),
                            product_name: nom
                          };
                          broadcastNotification(stockNotification);

                          db.commit(err11 => {
                            if (err11) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err11 }));

                            // Send response
                            res.status(201).json({
                              id: result.insertId,
                              product_type,
                              product_id,
                              status,
                              quantity,
                              location_id,
                              date: movementDate,
                              time: movementTime,
                              batch_number,
                              fournisseur_id,
                              atelier,
                              staff_id,
                              etage_id,
                              part_id,
                              fabricationDate,
                              expirationDate,
                              is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                              decision: decision || null,
                              isolation_reason: isolation_reason || null
                            });
                          });
                        });
                      } else {
                        // Already has unread stock alert, just commit and respond
                        db.commit(err10 => {
                          if (err10) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err10 }));

                          res.status(201).json({
                            id: result.insertId,
                            product_type,
                            product_id,
                            status,
                            quantity,
                            location_id,
                            date: movementDate,
                            time: movementTime,
                            batch_number,
                            fournisseur_id,
                            atelier,
                            staff_id,
                            etage_id,
                            part_id,
                            fabricationDate,
                            expirationDate,
                            is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                            decision: decision || null,
                            isolation_reason: isolation_reason || null
                          });
                        });
                      }
                    });
                  } else {
                    // No stock alert needed, just commit and respond
                    db.commit(err9 => {
                      if (err9) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err9 }));

                      res.status(201).json({
                        id: result.insertId,
                        product_type,
                        product_id,
                        status,
                        quantity,
                        location_id,
                        date: movementDate,
                        time: movementTime,
                        batch_number,
                        fournisseur_id,
                        atelier,
                        staff_id,
                        etage_id,
                        part_id,
                        fabricationDate,
                        expirationDate,
                        is_transfer: typeof is_transfer === 'boolean' ? is_transfer : false,
                        decision: decision || null,
                        isolation_reason: isolation_reason || null
                      });
                    });
                  }
                });
              }
            );
          }
        });


      }
    );
  });
});



// Get all movements for a product (with joins for display)
app.get('/api/movements', (req, res) => {
  const { product_id } = req.query;
  let query = `SELECT m.*, 
    l.name AS location_name, 
    l.is_prison,
    f.designation AS fournisseur_name, 
    e.name AS etage_name,
    pt.name AS part_name,
    m.is_transfer,
    m.quality_status,
    CASE WHEN r.id IS NOT NULL THEN 1 ELSE null END AS has_recipe
  FROM movements m
  LEFT JOIN locations l ON m.location_id = l.id
  LEFT JOIN fournisseurs f ON m.fournisseur_id = f.id
  LEFT JOIN location_etages e ON m.etage_id = e.id
  LEFT JOIN location_parts pt ON m.part_id = pt.id
  LEFT JOIN recipes r ON m.id = r.movement_id`;

  // If product_id is provided, filter by it
  if (product_id) {
    query += ` WHERE m.product_id = ?`;
  }

  query += ` ORDER BY m.date DESC, m.time DESC`;

  const params = product_id ? [product_id] : [];

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    res.json(rows);
  });
});

// Get all movements for materials (products with type 'matiere')
app.get('/api/movements/materials', (req, res) => {
  const { material_name } = req.query;
  if (!material_name) return res.status(400).json({ error: 'material_name is required' });
  db.query(
    `SELECT m.*, 
      l.name AS location_name, 
      f.designation AS fournisseur_name, 
      e.name AS etage_name
    FROM movements m
    LEFT JOIN locations l ON m.location_id = l.id
    LEFT JOIN fournisseurs f ON m.fournisseur_id = f.id
    LEFT JOIN location_etages e ON m.etage_id = e.id
    LEFT JOIN products p ON m.product_id = p.id
    WHERE p.nom = ? AND (p.type = 'matiere' OR p.type = 'semi')
    ORDER BY m.date DESC, m.time DESC`,
    [material_name],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      res.json(rows);
    }
  );
});

// Get stock of each semi-finished product by location/etage/part
app.get('/api/semi-products/stock', (req, res) => {
  db.query(
    `SELECT p.id as semi_id, p.nom as semi_name, p.unite, p.stock,
            l.id as location_id, l.name as location_name,
            e.id as etage_id, e.name as etage_name, e.currentStock as etage_stock,
            pt.id as part_id, pt.name as part_name, pt.currentStock as part_stock
     FROM products p
     LEFT JOIN movements m ON p.id = m.product_id
     LEFT JOIN locations l ON m.location_id = l.id
     LEFT JOIN location_etages e ON m.etage_id = e.id
     LEFT JOIN location_parts pt ON m.part_id = pt.id
     WHERE p.type = 'semi'
     GROUP BY p.id, l.id, e.id, pt.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      // Group by semi-product
      const result = {};
      rows.forEach(row => {
        if (!result[row.semi_id]) {
          result[row.semi_id] = {
            id: row.semi_id,
            name: row.semi_name,
            unite: row.unite,
            stock: row.stock,
            locations: []
          };
        }
        result[row.semi_id].locations.push({
          location_id: row.location_id,
          location_name: row.location_name,
          etage_id: row.etage_id,
          etage_name: row.etage_name,
          etage_stock: row.etage_stock,
          part_id: row.part_id,
          part_name: row.part_name,
          part_stock: row.part_stock
        });
      });
      res.json(Object.values(result));
    }
  );
});

// Insert a new sortie for a semi-finished product (same logic as matiere)
app.post('/api/semi-products/:id/sortie', (req, res) => {
  const product_id = req.params.id;
  const {
    quantity,
    location_id,
    etage_id,
    part_id,
    batch_number,
    date,
    time,
    fabricationDate,
    expirationDate,
    staff_id,
    atelier
  } = req.body;

  if (!quantity || !location_id) {
    return res.status(400).json({ error: 'quantity and location_id are required' });
  }

  // Use current date for fabrication/expiration if not provided
  const now = new Date();
  const fabrication = fabricationDate || now.toISOString().slice(0, 10);
  const expiration = expirationDate || fabrication;
  const movementDate = date || fabrication;
  const movementTime = time || now.toTimeString().slice(0, 8);

  // Check that the product is of type 'semi'
  db.query('SELECT * FROM products WHERE id = ? AND type = "semi"', [product_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    if (!rows.length) return res.status(404).json({ error: 'Semi-finished product not found' });

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      db.query(
        `INSERT INTO movements (
          product_type, product_id, status, quantity, location_id, date, time, batch_number, staff_id, atelier, etage_id, part_id, fabrication_date, expiration_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          'semi',
          product_id,
          'Sortie',
          quantity,
          location_id,
          movementDate,
          movementTime,
          batch_number || null,
          staff_id || null,
          atelier || null,
          etage_id || null,
          part_id || null,
          fabrication,
          expiration,
          now
        ],
        (err, result) => {
          if (err) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err }));
          // Update currentStock in location_etages or location_parts
          const updateStock = (cb) => {
            if (etage_id) {
              db.query('UPDATE location_etages SET currentStock = currentStock - ? WHERE id = ?', [quantity, etage_id], (err2, result) => {
                if (err2) return db.rollback(() => res.status(500).json({ error: 'Failed to update location stock' }));
                if (result.affectedRows === 0) return db.rollback(() => res.status(500).json({ error: 'Invalid etage_id for location_etages' }));
                cb();
              });
              return;
            }
            if (part_id) {
              db.query('UPDATE location_parts SET currentStock = currentStock - ? WHERE id = ?', [quantity, part_id], (err3, result) => {
                if (err3) return db.rollback(() => res.status(500).json({ error: 'Failed to update location stock' }));
                if (result.affectedRows === 0) return db.rollback(() => res.status(500).json({ error: 'Invalid part_id for location_parts' }));
                cb();
              });
              return;
            }
            cb();
          };
          updateStock(() => {
            // Update product stock and total_sortie
            db.query(
              'UPDATE products SET stock = stock - ?, total_sortie = total_sortie + ? WHERE id = ?',
              [quantity, quantity, product_id],
              (err4) => {
                if (err4) return db.rollback(() => res.status(500).json({ error: 'Failed to update product stock' }));

                // Get updated product info for stock alert check
                db.query('SELECT stock, alerte, nom FROM products WHERE id = ?', [product_id], (err5, productRows) => {
                  if (err5) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err5 }));

                  const { stock: newStock, alerte, nom } = productRows[0];

                  // Check for stock alert after sortie movement
                  if (alerte > 0 && newStock <= alerte) {
                    const message = `Stock alert: Product "${nom}" (ID: ${product_id}) is at or below alert level (${newStock}/${alerte})`;

                    // Check if there's already an unread stock alert notification for this product
                    db.query('SELECT id FROM notifications WHERE product_id = ? AND message LIKE \'%Stock alert%\' AND is_read = 0 LIMIT 1', [product_id], (err6, notifRows) => {
                      if (err6) {
                        return db.rollback(() => res.status(500).json({ error: 'Database error', details: err6 }));
                      }

                      if (notifRows.length === 0) {
                        // No unread stock alert notification, insert new
                        db.query('INSERT INTO notifications (product_id, message) VALUES (?, ?)', [product_id, message], (err7, stockNotifResult) => {
                          if (err7) {
                            return db.rollback(() => res.status(500).json({ error: 'Database error', details: err7 }));
                          }
                          // Broadcast stock alert notification via WebSocket
                          const stockNotification = {
                            id: stockNotifResult.insertId,
                            product_id: product_id,
                            message: message,
                            is_read: 0,
                            created_at: new Date(),
                            product_name: nom
                          };
                          broadcastNotification(stockNotification);

                          db.commit(err8 => {
                            if (err8) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err8 }));
                            res.status(201).json({ id: result.insertId, product_id, status: 'Sortie', quantity, location_id, etage_id, part_id, batch_number, fabricationDate: fabrication, expirationDate: expiration });
                          });
                        });
                      } else {
                        // Already has unread stock alert, just commit and respond
                        db.commit(err7 => {
                          if (err7) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err7 }));
                          res.status(201).json({ id: result.insertId, product_id, status: 'Sortie', quantity, location_id, etage_id, part_id, batch_number, fabricationDate: fabrication, expirationDate: expiration });
                        });
                      }
                    });
                  } else {
                    // No stock alert needed, just commit and respond
                    db.commit(err6 => {
                      if (err6) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err6 }));
                      res.status(201).json({ id: result.insertId, product_id, status: 'Sortie', quantity, location_id, etage_id, part_id, batch_number, fabricationDate: fabrication, expirationDate: expiration });
                    });
                  }
                });
              }
            );
          });
        }
      );
    });
  });
});

// Get all movements for a fournisseur by fournisseur_id
app.get('/api/fournisseurs/:id/history', (req, res) => {
  const fournisseurId = req.params.id;
  db.query(
    `SELECT m.*, 
      l.name AS location_name, 
      f.designation AS fournisseur_name, 
      e.name AS etage_name,
      p.nom AS product_name
    FROM movements m
    LEFT JOIN locations l ON m.location_id = l.id
    LEFT JOIN fournisseurs f ON m.fournisseur_id = f.id
    LEFT JOIN location_etages e ON m.etage_id = e.id
    LEFT JOIN products p ON m.product_id = p.id
    WHERE m.fournisseur_id = ?
    ORDER BY m.date DESC, m.time DESC`,
    [fournisseurId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      res.json(rows);
    }
  );
});

// Debug endpoint: Sortie for 'finis' product (update stock and total_sortie)
app.post('/api/finis-sortie', (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'product_id and quantity are required' });
  }
  // Log before
  db.query('SELECT stock, total_entrer, total_sortie, type FROM products WHERE id = ?', [product_id], (err, beforeRows) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    console.log('[DEBUG] Before /api/finis-sortie:', beforeRows[0]);
    db.query(
      'UPDATE products SET stock = stock - ?, total_sortie = total_sortie + ? WHERE id = ?',
      [quantity, quantity, product_id],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: 'Database error', details: err2 });
        // Log after and check for stock alert
        db.query('SELECT stock, total_entrer, total_sortie, type, alerte, nom FROM products WHERE id = ?', [product_id], (err3, afterRows) => {
          if (err3) return res.status(500).json({ error: 'Database error', details: err3 });
          console.log('[DEBUG] After /api/finis-sortie:', afterRows[0]);

          const { stock: newStock, alerte, nom } = afterRows[0];

          // Check for stock alert after sortie movement
          if (alerte > 0 && newStock <= alerte) {
            const message = `Stock alert: Product "${nom}" (ID: ${product_id}) is at or below alert level (${newStock}/${alerte})`;

            // Check if there's already an unread stock alert notification for this product
            db.query('SELECT id FROM notifications WHERE product_id = ? AND message LIKE \'%Stock alert%\' AND is_read = 0 LIMIT 1', [product_id], (err4, notifRows) => {
              if (err4) {
                console.error('Error checking notifications:', err4);
                return res.json({ before: beforeRows[0], after: afterRows[0], affectedRows: result.affectedRows });
              }

              if (notifRows.length === 0) {
                // No unread stock alert notification, insert new
                db.query('INSERT INTO notifications (product_id, message) VALUES (?, ?)', [product_id, message], (err5, stockNotifResult) => {
                  if (err5) {
                    console.error('Error inserting notification:', err5);
                    return res.json({ before: beforeRows[0], after: afterRows[0], affectedRows: result.affectedRows });
                  }
                  // Broadcast stock alert notification via WebSocket
                  const stockNotification = {
                    id: stockNotifResult.insertId,
                    product_id: product_id,
                    message: message,
                    is_read: 0,
                    created_at: new Date(),
                    product_name: nom
                  };
                  broadcastNotification(stockNotification);

                  res.json({ before: beforeRows[0], after: afterRows[0], affectedRows: result.affectedRows });
                });
              } else {
                // Already has unread stock alert
                res.json({ before: beforeRows[0], after: afterRows[0], affectedRows: result.affectedRows });
              }
            });
          } else {
            // No stock alert needed
            res.json({ before: beforeRows[0], after: afterRows[0], affectedRows: result.affectedRows });
          }
        });
      }
    );
  });
});

// Get all movements for ready products (product_type = 'ready')
app.get('/api/movements/ready', (req, res) => {
  db.query(
    `SELECT m.*, 
      l.name AS location_name, 
      f.designation AS fournisseur_name, 
      e.name AS etage_name,
      pt.name AS part_name
    FROM movements m
    LEFT JOIN locations l ON m.location_id = l.id
    LEFT JOIN fournisseurs f ON m.fournisseur_id = f.id
    LEFT JOIN location_etages e ON m.etage_id = e.id
    LEFT JOIN location_parts pt ON m.part_id = pt.id
    WHERE m.product_type = 'ready'
    ORDER BY m.date DESC, m.time DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      res.json(rows);
    }
  );
});

// New endpoint for ready product sortie without requiring location_id
app.post('/api/movements/ready-sortie', (req, res) => {
  const { product_id, quantity, etage_id, part_id, batch_number, fabricationDate, expirationDate, date, decision, isolation_reason } = req.body;
  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'product_id and quantity are required' });
  }
  // Find the correct location_id if possible (from etage or part)
  const getLocationId = (cb) => {
    if (etage_id) {
      db.query('SELECT location_id FROM location_etages WHERE id = ?', [etage_id], (err, rows) => {
        if (err) return cb(err);
        if (!rows.length) return cb(new Error('Invalid etage_id'));
        cb(null, rows[0].location_id);
      });
    } else if (part_id) {
      db.query('SELECT location_id FROM location_parts WHERE id = ?', [part_id], (err, rows) => {
        if (err) return cb(err);
        if (!rows.length) return cb(new Error('Invalid part_id'));
        cb(null, rows[0].location_id);
      });
    } else {
      cb(null, null);
    }
  };
  getLocationId((err, location_id) => {
    if (err) return res.status(400).json({ error: err.message });
    const now = new Date();
    const movementDate = date || now.toISOString().slice(0, 10);
    const movementTime = now.toTimeString().slice(0, 8);
    db.query(
      `INSERT INTO movements (
        product_type, product_id, status, quantity, location_id, date, time, batch_number, etage_id, part_id, fabrication_date, expiration_date, decision, isolation_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        'ready',
        product_id,
        'Sortie',
        quantity,
        location_id,
        movementDate,
        movementTime,
        batch_number || null,
        etage_id || null,
        part_id || null,
        fabricationDate || movementDate,
        expirationDate || movementDate,
        decision || null,
        isolation_reason || null
      ],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err });
        // Update stock in etage or part
        const updateStock = (cb) => {
          if (etage_id) {
            db.query('UPDATE location_etages SET currentStock = currentStock - ? WHERE id = ?', [quantity, etage_id], (err2, result2) => {
              if (err2) return cb(err2);
              cb();
            });
          } else if (part_id) {
            db.query('UPDATE location_parts SET currentStock = currentStock - ? WHERE id = ?', [quantity, part_id], (err3, result3) => {
              if (err3) return cb(err3);
              cb();
            });
          } else {
            cb();
          }
        };
        updateStock((err2) => {
          if (err2) return res.status(500).json({ error: 'Failed to update stock', details: err2 });
          res.status(201).json({ id: result.insertId, product_id, status: 'Sortie', quantity, location_id, etage_id, part_id, batch_number, fabricationDate, expirationDate, decision: decision || null, isolation_reason: isolation_reason || null });
        });
      }
    );
  });
});

// Update a specific movement by ID
app.put('/api/movements/:id', (req, res) => {
  const movementId = req.params.id;
  const {
    quantity,
    location_name,
    batch_number,
    quality_status,
    fabrication_date,
    expiration_date,
    time,
    date,
    fournisseur_id,
    etage_id,
    etage_name,
    part_id,
    part_name
  } = req.body;

  if (!movementId) {
    return res.status(400).json({ error: 'Movement ID is required' });
  }

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Valid quantity is required' });
  }

  // Start a transaction to ensure data consistency
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }

    // First, get the current movement details
    db.query(
      'SELECT * FROM movements WHERE id = ?',
      [movementId],
      (err, movements) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ error: 'Database error', details: err });
          });
        }

        if (movements.length === 0) {
          return db.rollback(() => {
            res.status(404).json({ error: 'Movement not found' });
          });
        }

        const oldMovement = movements[0];
        const quantityDiff = quantity - oldMovement.quantity;

        // Get location_id from location_name if provided
        let locationUpdatePromise = Promise.resolve(oldMovement.location_id);
        
        if (location_name) {
          locationUpdatePromise = new Promise((resolve, reject) => {
            db.query('SELECT id FROM locations WHERE name = ?', [location_name], (err, results) => {
              if (err) return reject(err);
              if (results.length === 0) return reject(new Error('Location not found'));
              resolve(results[0].id);
            });
          });
        }

        locationUpdatePromise.then(location_id => {
          // Prepare update data with proper floor/part handling
          const updateData = {
            quantity: quantity,
            location_id: location_id,
            batch_number: batch_number || oldMovement.batch_number,
            quality_status: quality_status || oldMovement.quality_status,
            fabrication_date: fabrication_date || oldMovement.fabrication_date,
            expiration_date: expiration_date || oldMovement.expiration_date,
            time: time || oldMovement.time,
            date: date || oldMovement.date,
            fournisseur_id: fournisseur_id || oldMovement.fournisseur_id,
            // Handle etage_id and part_id properly - clear both first, then set the correct one
            etage_id: etage_id !== undefined ? etage_id : null,
            part_id: part_id !== undefined ? part_id : null
          };

          console.log('[DEBUG] Update data prepared:', {
            oldEtageId: oldMovement.etage_id,
            oldPartId: oldMovement.part_id,
            newEtageId: updateData.etage_id,
            newPartId: updateData.part_id,
            locationChanged: location_id !== oldMovement.location_id
          });

          // Update the movement with proper NULL handling
          console.log('[DEBUG] Executing movement update with:', {
            quantity: updateData.quantity,
            location_id: updateData.location_id,
            etage_id: updateData.etage_id,
            part_id: updateData.part_id,
            movementId: movementId
          });

          db.query(
            `UPDATE movements SET 
             quantity = ?, location_id = ?, batch_number = ?, quality_status = ?, 
             fabrication_date = ?, expiration_date = ?, time = ?, date = ?, 
             fournisseur_id = ?, etage_id = ?, part_id = ?
             WHERE id = ?`,
            [
              updateData.quantity, updateData.location_id, updateData.batch_number,
              updateData.quality_status, updateData.fabrication_date, updateData.expiration_date,
              updateData.time, updateData.date, updateData.fournisseur_id,
              updateData.etage_id, updateData.part_id, movementId
            ],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ error: 'Failed to update movement', details: err });
                });
              }

              // Update product stock totals if quantity changed
              if (quantityDiff !== 0) {
                let stockUpdateQuery = '';
                let stockUpdateParams = [];

                if (oldMovement.status === 'Entrée') {
                  stockUpdateQuery = 'UPDATE products SET total_entrer = total_entrer + ?, stock = stock + ? WHERE id = ?';
                  stockUpdateParams = [quantityDiff, quantityDiff, oldMovement.product_id];
                } else if (oldMovement.status === 'Sortie') {
                  stockUpdateQuery = 'UPDATE products SET total_sortie = total_sortie + ?, stock = stock - ? WHERE id = ?';
                  stockUpdateParams = [quantityDiff, quantityDiff, oldMovement.product_id];
                }

                if (stockUpdateQuery) {
                  db.query(stockUpdateQuery, stockUpdateParams, (err) => {
                    if (err) {
                      return db.rollback(() => {
                        res.status(500).json({ error: 'Failed to update product stock', details: err });
                      });
                    }

                    // Update location stock if quantity or location changed
                    updateLocationStock();
                  });
                } else {
                  updateLocationStock();
                }
              } else {
                updateLocationStock();
              }

              function updateLocationStock() {
                console.log('[DEBUG] Updating location stock:', {
                  oldLocation: oldMovement.location_id,
                  newLocation: location_id,
                  oldEtage: oldMovement.etage_id,
                  newEtage: updateData.etage_id,
                  oldPart: oldMovement.part_id,
                  newPart: updateData.part_id,
                  oldQuantity: oldMovement.quantity,
                  newQuantity: quantity,
                  status: oldMovement.status,
                  locationChanged: location_id !== oldMovement.location_id,
                  floorChanged: (oldMovement.etage_id !== updateData.etage_id) || (oldMovement.part_id !== updateData.part_id)
                });

                const promises = [];

                // Step 1: ALWAYS remove stock from old location/floor first
                if (oldMovement.etage_id) {
                  promises.push(new Promise((resolve, reject) => {
                    // Remove the old quantity from old etage
                    const stockChange = oldMovement.status === 'Entrée' ? -oldMovement.quantity : oldMovement.quantity;
                    console.log('[DEBUG] Removing from old etage:', oldMovement.etage_id, 'change:', stockChange);
                    db.query('UPDATE location_etages SET currentStock = currentStock + ? WHERE id = ?', 
                      [stockChange, oldMovement.etage_id], (err) => {
                        if (err) {
                          console.error('[DEBUG] Error removing from old etage:', err);
                          reject(err);
                        } else {
                          console.log('[DEBUG] Successfully removed from old etage');
                          resolve();
                        }
                      });
                  }));
                }
                
                if (oldMovement.part_id) {
                  promises.push(new Promise((resolve, reject) => {
                    // Remove the old quantity from old part
                    const stockChange = oldMovement.status === 'Entrée' ? -oldMovement.quantity : oldMovement.quantity;
                    console.log('[DEBUG] Removing from old part:', oldMovement.part_id, 'change:', stockChange);
                    db.query('UPDATE location_parts SET currentStock = currentStock + ? WHERE id = ?', 
                      [stockChange, oldMovement.part_id], (err) => {
                        if (err) {
                          console.error('[DEBUG] Error removing from old part:', err);
                          reject(err);
                        } else {
                          console.log('[DEBUG] Successfully removed from old part');
                          resolve();
                        }
                      });
                  }));
                }

                // Step 2: ALWAYS add stock to new location/floor
                if (updateData.etage_id) {
                  promises.push(new Promise((resolve, reject) => {
                    // Add the new quantity to new etage
                    const stockChange = oldMovement.status === 'Entrée' ? quantity : -quantity;
                    console.log('[DEBUG] Adding to new etage:', updateData.etage_id, 'change:', stockChange);
                    db.query('UPDATE location_etages SET currentStock = currentStock + ? WHERE id = ?', 
                      [stockChange, updateData.etage_id], (err) => {
                        if (err) {
                          console.error('[DEBUG] Error adding to new etage:', err);
                          reject(err);
                        } else {
                          console.log('[DEBUG] Successfully added to new etage');
                          resolve();
                        }
                      });
                  }));
                }
                
                if (updateData.part_id) {
                  promises.push(new Promise((resolve, reject) => {
                    // Add the new quantity to new part
                    const stockChange = oldMovement.status === 'Entrée' ? quantity : -quantity;
                    console.log('[DEBUG] Adding to new part:', updateData.part_id, 'change:', stockChange);
                    db.query('UPDATE location_parts SET currentStock = currentStock + ? WHERE id = ?', 
                      [stockChange, updateData.part_id], (err) => {
                        if (err) {
                          console.error('[DEBUG] Error adding to new part:', err);
                          reject(err);
                        } else {
                          console.log('[DEBUG] Successfully added to new part');
                          resolve();
                        }
                      });
                  }));
                }

                Promise.all(promises).then(() => {
                  // Commit the transaction
                  db.commit((err) => {
                    if (err) {
                      return db.rollback(() => {
                        res.status(500).json({ error: 'Failed to commit transaction', details: err });
                      });
                    }

                    res.json({ 
                      message: 'Movement updated successfully',
                      updatedMovement: { id: movementId, ...updateData }
                    });
                  });
                }).catch((err) => {
                  db.rollback(() => {
                    res.status(500).json({ error: 'Failed to update location stock', details: err });
                  });
                });
              }
            }
          );
        }).catch((err) => {
          db.rollback(() => {
            res.status(500).json({ error: err.message || 'Database error', details: err });
          });
        });
      }
    );
  });
});

// Delete a specific movement by ID
app.delete('/api/movements/:id', (req, res) => {
  const movementId = req.params.id;
  
  if (!movementId) {
    return res.status(400).json({ error: 'Movement ID is required' });
  }

  // Start a transaction to ensure data consistency
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }

    // First, get the movement details to reverse the stock changes
    db.query(
      'SELECT * FROM movements WHERE id = ?',
      [movementId],
      (err, movements) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ error: 'Database error', details: err });
          });
        }

        if (movements.length === 0) {
          return db.rollback(() => {
            res.status(404).json({ error: 'Movement not found' });
          });
        }

        const movement = movements[0];
        const { product_id, status, quantity, etage_id, part_id } = movement;

        // Delete the movement
        db.query(
          'DELETE FROM movements WHERE id = ?',
          [movementId],
          (err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: 'Failed to delete movement', details: err });
              });
            }

            // Update product stock totals
            let stockUpdateQuery = '';
            let stockUpdateParams = [];

            if (status === 'Entrée') {
              // If it was an entry, subtract from total_entrer and stock
              stockUpdateQuery = 'UPDATE products SET total_entrer = total_entrer - ?, stock = stock - ? WHERE id = ?';
              stockUpdateParams = [quantity, quantity, product_id];
            } else if (status === 'Sortie') {
              // If it was an exit, subtract from total_sortie and add back to stock
              stockUpdateQuery = 'UPDATE products SET total_sortie = total_sortie - ?, stock = stock + ? WHERE id = ?';
              stockUpdateParams = [quantity, quantity, product_id];
            }

            if (stockUpdateQuery) {
              db.query(stockUpdateQuery, stockUpdateParams, (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ error: 'Failed to update product stock', details: err });
                  });
                }

                // Update location stock (etage or part)
                let locationUpdateQuery = '';
                let locationUpdateParams = [];

                if (etage_id) {
                  if (status === 'Entrée') {
                    // If it was an entry, subtract from etage currentStock
                    locationUpdateQuery = 'UPDATE location_etages SET currentStock = currentStock - ? WHERE id = ?';
                    locationUpdateParams = [quantity, etage_id];
                  } else if (status === 'Sortie') {
                    // If it was an exit, add back to etage currentStock
                    locationUpdateQuery = 'UPDATE location_etages SET currentStock = currentStock + ? WHERE id = ?';
                    locationUpdateParams = [quantity, etage_id];
                  }
                } else if (part_id) {
                  if (status === 'Entrée') {
                    // If it was an entry, subtract from part currentStock
                    locationUpdateQuery = 'UPDATE location_parts SET currentStock = currentStock - ? WHERE id = ?';
                    locationUpdateParams = [quantity, part_id];
                  } else if (status === 'Sortie') {
                    // If it was an exit, add back to part currentStock
                    locationUpdateQuery = 'UPDATE location_parts SET currentStock = currentStock + ? WHERE id = ?';
                    locationUpdateParams = [quantity, part_id];
                  }
                }

                if (locationUpdateQuery) {
                  db.query(locationUpdateQuery, locationUpdateParams, (err) => {
                    if (err) {
                      return db.rollback(() => {
                        res.status(500).json({ error: 'Failed to update location stock', details: err });
                      });
                    }

                    // Commit the transaction
                    db.commit((err) => {
                      if (err) {
                        return db.rollback(() => {
                          res.status(500).json({ error: 'Failed to commit transaction', details: err });
                        });
                      }

                      res.json({ 
                        message: 'Movement deleted successfully',
                        deletedMovement: movement
                      });
                    });
                  });
                } else {
                  // No location update needed, commit the transaction
                  db.commit((err) => {
                    if (err) {
                      return db.rollback(() => {
                        res.status(500).json({ error: 'Failed to commit transaction', details: err });
                      });
                    }

                    res.json({ 
                      message: 'Movement deleted successfully',
                      deletedMovement: movement
                    });
                  });
                }
              });
            } else {
              // No stock update needed, commit the transaction
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ error: 'Failed to commit transaction', details: err });
                  });
                }

                res.json({ 
                  message: 'Movement deleted successfully',
                  deletedMovement: movement
                });
              });
            }
          }
        );
      }
    );
  });
});

// ADMIN: Delete all movement data and reset all product totals to 0, and set currentStock in location_etages and location_parts to 0
app.post('/api/admin/reset-movements-products', (req, res) => {
  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    // Delete all movements
    db.query('DELETE FROM movements', (err1) => {
      if (err1) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err1 }));
      // Reset all product totals
      db.query('UPDATE products SET stock = 0, total_entrer = 0, total_sortie = 0', (err2) => {
        if (err2) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err2 }));
        // Reset currentStock in location_etages
        db.query('UPDATE location_etages SET currentStock = 0', (err3) => {
          if (err3) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err3 }));
          // Reset currentStock in location_parts
          db.query('UPDATE location_parts SET currentStock = 0', (err4) => {
            if (err4) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err4 }));
            // Delete all notifications
            db.query('DELETE FROM notifications', (err5) => {
              if (err5) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err5 }));
              db.commit(err6 => {
                if (err6) return db.rollback(() => res.status(500).json({ error: 'Database error', details: err6 }));
                res.json({ success: true });
              });
            });
          });
        });
      });
    });
  });
});



// Get all notifications or only unread
app.get('/api/notifications', (req, res) => {
  const showAll = req.query.all === '1';
  const where = showAll ? '' : 'WHERE n.is_read = 0';
  db.query(
    `SELECT n.id, n.product_id, n.message, n.is_read, n.created_at, p.nom as product_name
     FROM notifications n
     JOIN products p ON n.product_id = p.id
     ${where}
     ORDER BY n.created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err });
      res.json(rows);
    }
  );
});

// Mark a notification as read
app.post('/api/notifications/:id/read', (req, res) => {
  const notificationId = req.params.id;
  db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  });
});

// Mark a notification as unread
app.post('/api/notifications/:id/unread', (req, res) => {
  const notificationId = req.params.id;
  db.query('UPDATE notifications SET is_read = 0 WHERE id = ?', [notificationId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error', details: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the backend server!');
});

// Lightweight health check for Electron readiness probe
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is ready for real-time notifications`);
});

