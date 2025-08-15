import { PrismaClient } from '@prisma/client';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a variable to hold our prisma instance
let prisma: any;

if (isBrowser) {
  // In browser environment, we create a mock client that doesn't actually connect to the database
  console.log('Running in browser - using mock Prisma client');
  // This is just a placeholder and won't actually save data
  const mockPrisma = {
    class: {
      findMany: async () => [],
      findUnique: async () => null,
      findFirst: async () => null,
      create: async (data: any) => data.data,
      update: async (data: any) => data.data,
      delete: async () => ({}),
      count: async () => 0,
    },
    student: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async (data: any) => data.data,
      update: async (data: any) => data.data,
      delete: async () => ({}),
      count: async () => 0,
    },
    attendanceRecord: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async (data: any) => data.data,
      update: async (data: any) => data.data,
      delete: async () => ({}),
      count: async () => 0,
    },
    payment: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async (data: any) => data.data,
      update: async (data: any) => data.data,
      delete: async () => ({}),
      count: async () => 0,
    },
    grade: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async (data: any) => data.data,
      update: async (data: any) => data.data,
      delete: async () => ({}),
      count: async () => 0,
    },
  };
  prisma = mockPrisma;
} else {
  // Server environment - use actual PrismaClient
  // Use dynamic import to avoid browser issues
  const loadPrisma = async () => {
    try {
      console.log('Running in Node.js - using actual Prisma client');
      const { PrismaClient } = await import('@prisma/client');
      return new PrismaClient();
    } catch (e) {
      console.error('Failed to load PrismaClient:', e);
      // Provide a fallback mock in case of failure
      return {
        class: { findMany: async () => [] },
        student: { findMany: async () => [] },
        // ... other mock methods
      };
    }
  };
  
  // Initialize prisma variable with a Promise that resolves to the actual client
  const prismaPromise = loadPrisma();
  
  // Override the prisma object with a proxy that awaits the promise for each method call
  prisma = new Proxy({}, {
    get: (_, prop) => {
      return new Proxy({}, {
        get: (_, methodName) => {
          return async (...args: any[]) => {
            const client = await prismaPromise;
            // @ts-ignore - dynamic access
            return client[prop][methodName](...args);
          };
        }
      });
    }
  });
}

// Export Prisma client
export default prisma;

// Initialize the database with seed data if needed
export const initializeDatabase = async () => {
  // Only run in Node.js environment
  if (typeof window !== 'undefined') {
    console.log("Browser environment detected, skipping database initialization");
    return;
  }
  
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

// Only call initialization in a Node.js environment
if (typeof window === 'undefined') {
  initializeDatabase().catch(console.error);
}
