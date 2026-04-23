import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Executes a Prisma operation with retries to handle transient connection errors
 * common in serverless environments like Neon.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check for common connection-related error messages
      const errorMessage = error?.message || '';
      const isTransient = 
        errorMessage.includes('Can\'t reach database server') ||
        errorMessage.includes('Closed connection') ||
        errorMessage.includes('Can\'t reach database') ||
        errorMessage.includes('Timed out') ||
        errorMessage.includes('Connection closed');

      if (!isTransient || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt);
      console.warn(`[Prisma] Connection transient error, retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw lastError;
}
