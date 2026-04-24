import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: ['error'],
  });
}

export function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  set(_target, prop, value) {
    const client = getPrismaClient();
    Reflect.set(client, prop, value);
    return true;
  },
  has(_target, prop) {
    return prop in getPrismaClient();
  },
  ownKeys() {
    return Reflect.ownKeys(getPrismaClient());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(getPrismaClient(), prop);
  },
}) as PrismaClient;

/**
 * Executes a Prisma operation with retries to handle transient connection errors
 * common in serverless environments like Neon.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTransient =
        errorMessage.includes("Can't reach database server") ||
        errorMessage.includes('Closed connection') ||
        errorMessage.includes("Can't reach database") ||
        errorMessage.includes('Timed out') ||
        errorMessage.includes('Connection closed');

      if (!isTransient || attempt === maxRetries - 1) {
        throw error;
      }

      const waitTime = delay * Math.pow(2, attempt);
      console.warn(`[Prisma] Connection transient error, retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}
