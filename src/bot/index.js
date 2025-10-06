import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/env.js';
import { chat } from '../llm/yandex-gpt.js';
import { tryLock, unlock } from './antiFlood.js';
import { SYSTEM_PROMPT } from './prompt.js';

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

  bot.onText(/^\/start\b/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`[/start] chatId=${chatId}`);
    await bot.sendMessage(chatId, 'Привет! Я готов отвечать. Напиши вопрос.');
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text ?? '').trim();
    if (!text || text.startsWith('/')) return;

    // Анти-флуд: один запрос за раз
    if (!tryLock(chatId)) {
      await bot.sendMessage(chatId, 'Подожди, ещё отвечаю на прошлый вопрос…');
      return;
    }

    try {
      await bot.sendChatAction(chatId, 'typing');

      const reply = await chat([
        { role: 'system', text: SYSTEM_PROMPT },
        { role: 'user', text },
      ]);

      await bot.sendMessage(chatId, reply, { disable_web_page_preview: true });
    } catch (e) {
      console.error('LLM error:', e?.message || e);
      const hint = e?.message?.includes('modelUri')
        ? 'Похоже, неверная модель или FOLDER_ID. Проверь настройки.'
        : 'Не удалось получить ответ. Попробуй ещё раз позже.';
      await bot.sendMessage(chatId, `Упс… ${hint}`);
    } finally {
      unlock(chatId);
    }
  });

  // Ошибки polling — просто логируем
  bot.on('polling_error', (err) => {
    console.error('Polling error:', err?.message || err);
  });

  return bot;
}
