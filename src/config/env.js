import dotenvSafe from 'dotenv-safe';
import { cleanEnv, num, str, url } from 'envalid';

dotenvSafe.config({ example: '.env.example', allowEmptyValues: false });

export const config = cleanEnv(
  process.env,
  {
    API_TIMEOUT_MS: num({ default: 7000, desc: 'HTTP timeout in ms' }),
    TELEGRAM_BOT_TOKEN: str({ desc: 'Telegram bot token from @BotFather' }),
    YC_API_KEY: str({ desc: 'Yandex Cloud API key (Api-Key ...)' }),
    YC_FOLDER_ID: str({ desc: 'Yandex Cloud folder ID' }),
    YC_GPT_MODEL: str({ default: 'yandexgpt/latest' }),
    YC_GPT_ENDPOINT: url({
      default: 'https://llm.api.cloud.yandex.net/foundationModels/v1/chat/completions',
    }),
  },
  {
    reporter: ({ errors }) =>
      Object.keys(errors).length &&
      (() => {
        throw new Error('Environment validation failed');
      })(),
  }
);
