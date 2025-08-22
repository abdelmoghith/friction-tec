const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'your_database_name'
});

// Read and execute the migrations
const migrationPaths = [
  path.join(__dirname, 'migrations', 'add_decision_column.sql'),
  path.join(__dirname, 'migrations', 'add_isolation_reason_column.sql')
];

let allStatements = [];
migrationPaths.forEach(migrationPath => {
  if (fs.existsSync(migrationPath)) {
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    allStatements = allStatements.concat(statements);
  }
});

console.log('Running migrations: add_decision_column.sql, add_isolation_reason_column.sql');

// Execute each statement
allStatements.forEach((statement, index) => {
  if (statement.trim()) {
    db.query(statement, (err, result) => {
      if (err) {
        console.error(`Error executing statement ${index + 1}:`, err.message);
      } else {
        console.log(`Statement ${index + 1} executed successfully`);
      }
    });
  }
});

// Close connection after a delay to allow all queries to complete
setTimeout(() => {
  db.end();
  console.log('Migration completed');
}, 1000);