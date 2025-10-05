import dotenvSafe from 'dotenv-safe';
import { cleanEnv, num } from 'envalid';

// Load environment variables with validation of example file
dotenvSafe.config({
  allowEmptyValues: false,
  example: '.env.example',
});

export const env = cleanEnv(process.env, {
  API_TIMEOUT_MS: num({ default: 7000 }),
});

export const config = {
  API_TIMEOUT_MS: env.API_TIMEOUT_MS,
};
