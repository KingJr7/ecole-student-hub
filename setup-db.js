
console.log('Setting up the database...');
const { execSync } = require('child_process');

// Run Prisma migrations
try {
  console.log('Creating SQLite database and running migrations...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('Database setup completed successfully!');
} catch (error) {
  console.error('Error setting up the database:', error.message);
  process.exit(1);
}
