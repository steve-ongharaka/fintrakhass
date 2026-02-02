// Retry utility for database operations with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 500
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a transient connection error that we should retry
      const isRetryableError = 
        error?.message?.includes('terminating connection') ||
        error?.message?.includes('idle-session timeout') ||
        error?.message?.includes('Connection refused') ||
        error?.code === 'P1001' || // Prisma connection error
        error?.code === 'P1002' || // Server has closed the connection
        error?.code === 'P1008' || // Operations timed out
        error?.code === 'P1017';   // Server has closed the connection
      
      if (isRetryableError && attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}
