
// This is a mock implementation for browser environments
// In a real application, you would use an API layer to communicate with the server

import { PrismaClient } from '@prisma/client'

// Add prisma to the global object so it can be reused across requests
// This prevents having too many connections in development

declare global {
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (typeof window === 'undefined') {
  // Server-side environment (Node.js)
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient()
  } else {
    // Use shared connection in development
    if (!global.prisma) {
      global.prisma = new PrismaClient()
    }
    prisma = global.prisma
  }
} else {
  // Browser environment
  // In a real application, you would make API calls to a backend
  // This is just to prevent errors in the browser
  prisma = {} as PrismaClient
}

export default prisma
