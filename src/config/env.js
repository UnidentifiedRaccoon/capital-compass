import dotenvSafe from 'dotenv-safe';
import { cleanEnv, num, str } from 'envalid';

dotenvSafe.config({ example: '.env.example', allowEmptyValues: false });

export const config = cleanEnv(process.env, {
  API_TIMEOUT_MS: num({ default: 7000, desc: 'HTTP timeout in ms' }),
  TELEGRAM_BOT_TOKEN: str({ desc: 'Telegram bot token from @BotFather' }),
});
