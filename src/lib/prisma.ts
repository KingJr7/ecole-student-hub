
import { PrismaClient } from '@prisma/client';

// Use a single instance of Prisma Client in the entire app
const prisma = new PrismaClient();

// Export Prisma client
export default prisma;

// Initialize the database with seed data if needed
export const initializeDatabase = async () => {
  try {
    // Check if there's data already
    const classCount = await prisma.class.count();
    
    if (classCount === 0) {
      console.log("Database is empty. Initializing with seed data...");
      // Import and run the seed function
      const { seedDatabase } = await import('./seed');
      await seedDatabase();
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
};

// Call initialization
initializeDatabase().catch(console.error);
