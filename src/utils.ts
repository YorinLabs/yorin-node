import { setTimeout } from "timers";

export class Logger {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  log(...args: unknown[]): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[Aizu]', ...args);
    }
  }

  error(...args: unknown[]): void {
    console.error('[Aizu Error]', ...args);
  }

  warn(...args: unknown[]): void {
    if (this.debug) {
      console.warn('[Aizu Warning]', ...args);
    }
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('All retry attempts failed');

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), delay);
        });
      }
    }
  }

  throw lastError;
}

export function validateSecretKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  return key.startsWith('sk_');
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}