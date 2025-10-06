import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.js';
import { attachBotHandlers } from './createHandlers.js';

export function createWebhookBot() {
  // polling: false — мы сами будем передавать апдейты
  const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: false });
  attachBotHandlers(bot);
  return bot;
}
