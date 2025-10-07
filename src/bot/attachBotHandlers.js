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

    const welcomeText = `👋 Привет! Я Capital Compass AI. Помогу рассчитать взносы по ПДС, прогноз капитала и ежемесячную выплату. Готов начать? — Нажми «🧮 Рассчитать» или отправь «рассчитать». — Хочешь узнать о правилах ПДС — выбери «ℹ️ Что такое ПДС?».`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🧮 Рассчитать', callback_data: 'calculate' },
            { text: 'ℹ️ Что такое ПДС?', callback_data: 'info' },
          ],
        ],
      },
    };

    await bot.sendMessage(chatId, welcomeText, keyboard);
  });

  bot.onText(/^\/clear\b/, async (msg) => {
    const chatId = msg.chat.id;
    logger.info({ chatId }, 'cmd:/clear');

    // Очищаем контекст чата
    clearChatContext(chatId);

    await bot.sendMessage(chatId, 'Контекст чата очищен. Начинаем с чистого листа! 🧹');
  });

  // Обработчик команды "рассчитать"
  bot.onText(/^рассчитать$/i, async (msg) => {
    const chatId = msg.chat.id;
    logger.info({ chatId }, 'cmd:calculate');

    await bot.sendMessage(
      chatId,
      'Отлично! Давайте рассчитаем ваши пенсионные накопления. Отправьте "рассчитать" или напишите свой вопрос, и я помогу с расчётами по ПДС.'
    );
  });

  // Обработчик команды "что такое пдс"
  bot.onText(/^что такое пдс\?*$/i, async (msg) => {
    const chatId = msg.chat.id;
    logger.info({ chatId }, 'cmd:info');

    await bot.sendMessage(
      chatId,
      'Программа долгосрочных сбережений (ПДС) — это государственная программа для накопления на пенсию с дополнительными льготами:\n\n🏛️ Государственное софинансирование до 36 000 ₽ в год\n💸 Налоговый вычет до 52 000 ₽ в год\n🔒 Гарантирование средств государством до 2,8 млн ₽\n\nОтправьте "рассчитать" для персонального расчёта!'
    );
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

  // Обработчик нажатий на кнопки
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    logger.info({ chatId, data }, 'callback:received');

    try {
      if (data === 'calculate') {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Начинаем расчёт! Отправьте "рассчитать" или напишите свой вопрос.',
        });
        await bot.sendMessage(
          chatId,
          'Отлично! Давайте рассчитаем ваши пенсионные накопления. Отправьте "рассчитать" или напишите свой вопрос, и я помогу с расчётами по ПДС.'
        );
      } else if (data === 'info') {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Рассказываю о ПДС!' });
        await bot.sendMessage(
          chatId,
          'Программа долгосрочных сбережений (ПДС) — это государственная программа для накопления на пенсию с дополнительными льготами:\n\n🏛️ Государственное софинансирование до 36 000 ₽ в год\n💸 Налоговый вычет до 52 000 ₽ в год\n🔒 Гарантирование средств государством до 2,8 млн ₽\n\nОтправьте "рассчитать" для персонального расчёта!'
        );
      }
    } catch (e) {
      logger.error({ chatId, err: e }, 'callback:error');
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'Произошла ошибка. Попробуйте ещё раз.',
      });
    }
  });

  bot.on('polling_error', (err) => logger.error({ err }, 'polling:error'));
}
