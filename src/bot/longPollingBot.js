import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.js';
import { attachBotHandlers } from './attachBotHandlers.js';

/**
 * Инициализация long polling бота.
 * Возвращает инстанс, чтобы main мог корректно остановить polling.
 */
export function longPollingBot() {
  const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, {
    polling: { interval: 300, autoStart: true, params: { timeout: 10 } },
  });
  attachBotHandlers(bot);
  return bot;
}
