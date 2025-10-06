import { chat } from '../llm/yandex-gpt.js';
import { tryLock, unlock } from './antiFlood.js';
import { SYSTEM_PROMPT } from './prompt.js';
import { logger } from '../logger.js';
import { markUpdateStart, markUpdateOk, markUpdateErr, markLlm } from '../metrics.js';

export function attachBotHandlers(bot) {
  bot.onText(/^\/start\b/, async (msg) => {
    const chatId = msg.chat.id;
    logger.info({ chatId }, 'cmd:/start');
    await bot.sendMessage(chatId, 'Привет! Я готов отвечать. Напиши вопрос.');
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
      const reply = await chat([
        { role: 'system', text: SYSTEM_PROMPT },
        { role: 'user', text },
      ]);
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
