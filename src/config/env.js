import fs from 'node:fs';
import dotenvSafe from 'dotenv-safe';
import { cleanEnv, num, str, url } from 'envalid';

// Загружаем .env только локально/в CI — в YC его нет
if (fs.existsSync('.env')) {
  dotenvSafe.config({ example: '.env.example', allowEmptyValues: true });
}

export const config = cleanEnv(process.env, {
  API_TIMEOUT_MS: num({ default: 7000 }),
  TELEGRAM_BOT_TOKEN: str(),

  YC_API_KEY: str(),
  YC_FOLDER_ID: str(),
  YC_GPT_MODEL: str({ default: 'yandexgpt/latest' }),
  YC_GPT_ENDPOINT: url({
    default: 'https://llm.api.cloud.yandex.net/foundationModels/v1/chat/completions',
  }),

  BOT_MODE: str({ default: 'webhook' }),
  DEV_PORT: num({ default: 8080 }),
  WEBHOOK_SECRET: str(),
  PUBLIC_BASE_URL: str({ default: '' }), // заполним позже
});
