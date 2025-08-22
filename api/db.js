// Database connection setup
// Replace with your actual database and credentials

const mysql = require('mysql2');

const connection = mysql.createConnection({
 host: 'mysql-306a8039-whary-16.f.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_V9Idfnn9LgcZDQM_9Es',
  port: '24139',
  database: 'friction_tec',
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database as id ' + connection.threadId);
});

module.exports = connection; 