const fs = require('fs');
const path = require('path');
const db = require('./db');

// Read the safe migration file
const migrationPath = path.join(__dirname, 'migrations', 'staff_management_safe.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split the SQL into individual statements
const statements = migrationSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

console.log('Running safe staff management migration...');
console.log(`Found ${statements.length} SQL statements to execute.`);

// Execute each statement
let completed = 0;
const executeNext = () => {
  if (completed >= statements.length) {
    console.log('✅ Staff management migration completed successfully!');
    console.log('');
    console.log('🎉 Setup Complete!');
    console.log('');
    console.log('Default admin user:');
    console.log('  📧 Email: admin@company.com');
    console.log('  🔑 Password: admin123');
    console.log('  👑 Role: ADMIN');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your API server');
    console.log('2. Login with the admin credentials');
    console.log('3. Create additional staff members');
    console.log('4. Test the permission system');
    process.exit(0);
    return;
  }

  const statement = statements[completed];
  console.log(`Executing statement ${completed + 1}/${statements.length}...`);
  
  db.query(statement, (err, result) => {
    if (err) {
      console.error(`❌ Error executing statement ${completed + 1}:`, err.message);
      console.error('Statement:', statement);
      process.exit(1);
      return;
    }
    
    console.log(`✅ Statement ${completed + 1} executed successfully`);
    completed++;
    executeNext();
  });
};

// Start execution
executeNext();