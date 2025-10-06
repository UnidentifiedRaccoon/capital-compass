import { chat } from '../llm/yandex-gpt.js';
import { tryLock, unlock } from './antiFlood.js';
import { SYSTEM_PROMPT } from './prompt.js';

export function attachBotHandlers(bot) {
  // /start
  bot.onText(/^\/start\b/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`[/start] chatId=${chatId}`);
    await bot.sendMessage(chatId, 'Привет! Я готов отвечать. Напиши вопрос.');
  });

  // текстовые сообщения
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text ?? '').trim();
    if (!text || text.startsWith('/')) return;

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
      await bot.sendMessage(chatId, 'Не удалось получить ответ. Попробуй ещё раз позже.');
    } finally {
      unlock(chatId);
    }
  });

  bot.on('polling_error', (err) => console.error('Polling error:', err?.message || err));
}
