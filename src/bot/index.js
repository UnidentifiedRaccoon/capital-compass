import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.js';

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

  // /start — базовый ответ
  bot.onText(/^\/start\b/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`[/start] chatId=${chatId}`);
    await bot.sendMessage(chatId, 'Привет! Я живой 🫡');
  });

  // Любое текстовое сообщение (кроме команд) — «живой я» + лог chatId
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ?? '';
    if (typeof text === 'string' && !text.startsWith('/')) {
      console.log(`[msg] chatId=${chatId} text="${String(text).slice(0, 60)}"`);
      await bot.sendMessage(chatId, 'живой я');
    }
  });

  // Ошибки polling — просто логируем
  bot.on('polling_error', (err) => {
    console.error('Polling error:', err?.message || err);
  });

  return bot;
}
