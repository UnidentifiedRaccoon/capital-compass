import { chat } from '../llm/yandex-gpt.js';
import { tryLock, unlock } from './antiFlood.js';
import { SYSTEM_PROMPT } from './prompt.js';
import { logger } from '../logger.js';
import { markUpdateStart, markUpdateOk, markUpdateErr, markLlm } from '../metrics.js';
import { getChatContext, addMessageToContext, clearChatContext } from '../storage/chatContext.js';

export function attachBotHandlers(bot) {
  bot.onText(/^\/start\b/, async (msg) => {
    const chatId = msg.chat.id;
    logger.info({ chatId }, 'cmd:/start');

    // Очищаем контекст при /start
    clearChatContext(chatId);

    await bot.sendMessage(chatId, 'Привет! Я готов отвечать. Напиши вопрос.');
  });

  bot.onText(/^\/clear\b/, async (msg) => {
    const chatId = msg.chat.id;
    logger.info({ chatId }, 'cmd:/clear');

    // Очищаем контекст чата
    clearChatContext(chatId);

    await bot.sendMessage(chatId, 'Контекст чата очищен. Начинаем с чистого листа! 🧹');
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text ?? '').trim();
    if (!text || text.startsWith('/')) return;

    markUpdateStart();
    logger.info({ chatId, text }, 'msg:in');

    if (!tryLock(chatId)) {
      await bot.sendMessage(chatId, 'Подожди, ещё отвечаю на прошлый вопрос…');
      return;
    }

    const t0 = Date.now();
    try {
      await bot.sendChatAction(chatId, 'typing');

      // Добавляем сообщение пользователя в контекст
      addMessageToContext(chatId, 'user', text);

      // Получаем контекст чата
      const context = getChatContext(chatId);

      // Формируем сообщения для LLM (системный промпт + контекст)
      const messages = [
        { role: 'system', text: SYSTEM_PROMPT },
        ...context.map((msg) => ({ role: msg.role, text: msg.text })),
      ];

      const reply = await chat(messages);

      // Добавляем ответ бота в контекст
      addMessageToContext(chatId, 'assistant', reply);

      markLlm(true, Date.now() - t0);
      await bot.sendMessage(chatId, reply, { disable_web_page_preview: true });
      markUpdateOk();
      logger.info({ chatId }, 'msg:out:ok');
    } catch (e) {
      markLlm(false, Date.now() - t0);
      markUpdateErr();
      logger.error({ chatId, err: e }, 'msg:out:error');
      await bot.sendMessage(chatId, 'Не удалось получить ответ. Попробуй ещё раз позже.');
    } finally {
      unlock(chatId);
    }
  });

  bot.on('polling_error', (err) => logger.error({ err }, 'polling:error'));
}
