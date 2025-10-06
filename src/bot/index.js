import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.js';
import { attachBotHandlers } from './createHandlers.js';

/**
 * Инициализация long polling бота.
 * Возвращает инстанс, чтобы main мог корректно остановить polling.
 */
export function initBot() {
  const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, {
    polling: {
      interval: 300, // частота опроса (мс)
      autoStart: true, // сразу стартуем
      params: { timeout: 10 }, // long polling timeout (сек)
    },
  });

  attachBotHandlers(bot);

  return bot;
}
