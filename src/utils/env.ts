import dotenv from "dotenv";

// Load environment variables from .env and .env.local
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

/**
 * Get an environment variable value
 * @param key - The environment variable key
 * @param required - Whether the variable is required (throws if missing)
 * @returns The environment variable value, or undefined if not found and not required
 */
export function getEnvVariable(
  key: string,
  required = false
): string | undefined {
  const value = process.env[key];

  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value;
}
