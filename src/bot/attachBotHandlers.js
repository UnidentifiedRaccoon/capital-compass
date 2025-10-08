import { chat } from '../llm/yandex-gpt.js';
import { tryLock, unlock } from './antiFlood.js';
import { SYSTEM_PROMPT } from './prompt.js';
import {
  MESSAGES,
  createMainKeyboard,
  createPdfKeyboard,
  createBackToMainKeyboard,
  getCommandType,
} from './messages.js';
import { logger } from '../logger.js';
import { markUpdateStart, markUpdateOk, markUpdateErr, markLlm } from '../metrics.js';
import { getChatContext, addMessageToContext, clearChatContext } from '../storage/chatContext.js';
import { generatePdfReport } from '../pdf/pdfGenerator.js';

/**
 * Проверяет, является ли ответ бота расчётом пенсионных накоплений
 * @param {string} response - Ответ бота
 * @returns {boolean} true если это расчёт
 */
function isCalculationResponse(response) {
  // Проверяем наличие ключевых индикаторов расчёта
  const calculationIndicators = [
    '📊 Результаты:',
    'Требуемый взнос:',
    'Прогноз капитала',
    'Ежемесячная выплата',
    'Разбивка притока:',
    '💰 Личные взносы:',
    '🏛️ Господдержка:',
    '💸 Налоговый вычет:',
  ];

  return calculationIndicators.some((indicator) => response.includes(indicator));
}

/**
 * Начинает диалог расчёта с LLM
 */
async function startCalculationDialog(chatId, bot) {
  try {
    await bot.sendChatAction(chatId, 'typing');

    // Добавляем сообщение пользователя в контекст (имитируем запрос на расчёт)
    addMessageToContext(chatId, 'user', 'рассчитать');

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

    markLlm(true);

    // Отправляем ответ с кнопкой PDF (всегда для расчётов)
    const keyboard = createPdfKeyboard();
    await bot.sendMessage(chatId, reply, {
      disable_web_page_preview: true,
      ...keyboard,
    });

    markUpdateOk();
    logger.info({ chatId }, 'calculation:started');
  } catch (e) {
    markLlm(false);
    markUpdateErr();
    logger.error({ chatId, err: e }, 'calculation:error');
    await bot.sendMessage(chatId, MESSAGES.LLM_ERROR);
  }
}

/**
 * Генерирует и отправляет PDF-отчёт
 */
async function generateAndSendPdf(chatId, bot) {
  try {
    await bot.sendChatAction(chatId, 'typing');

    // Получаем последний ответ бота из контекста
    const context = getChatContext(chatId);
    logger.info({ chatId, contextLength: context.length }, 'pdf:context:check');

    const lastBotMessage = context.filter((msg) => msg.role === 'assistant').pop();
    logger.info(
      { chatId, hasLastMessage: !!lastBotMessage, messageLength: lastBotMessage?.text?.length },
      'pdf:lastMessage:check'
    );

    if (!lastBotMessage) {
      logger.warn({ chatId, contextLength: context.length }, 'pdf:noData');
      await bot.sendMessage(chatId, 'Нет данных для генерации отчёта. Сначала выполните расчёт.');
      return;
    }

    logger.info(
      { chatId, messagePreview: lastBotMessage.text.substring(0, 100) },
      'pdf:generating'
    );

    // Генерируем PDF
    const pdfBuffer = await generatePdfReport(lastBotMessage.text, {
      reportDate: new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      filename: `pension-report-${chatId}-${Date.now()}`,
    });

    logger.info({ chatId, pdfSize: pdfBuffer.length }, 'pdf:generated');

    // Отправляем PDF как документ
    await bot.sendDocument(chatId, pdfBuffer, {
      filename: `pension-report-${Date.now()}.pdf`,
      caption: '📄 Ваш отчёт по пенсионным накоплениям готов!',
    });

    logger.info({ chatId }, 'pdf:sent');
  } catch (e) {
    logger.error({ chatId, err: e.message, stack: e.stack }, 'pdf:error');
    await bot.sendMessage(chatId, 'Ошибка при генерации PDF-отчёта. Попробуйте позже.');
  }
}

/**
 * Обработка команд пользователя
 */
async function handleCommand(chatId, command, bot) {
  switch (command) {
    case 'start': {
      clearChatContext(chatId);
      const keyboard = createMainKeyboard();
      await bot.sendMessage(chatId, MESSAGES.WELCOME, keyboard);
      break;
    }
    case 'clear':
      clearChatContext(chatId);
      await bot.sendMessage(chatId, MESSAGES.CLEAR_CONTEXT);
      break;
    case 'calculate':
      // Сразу начинаем диалог с LLM для сбора данных
      await startCalculationDialog(chatId, bot);
      break;
    case 'info':
      await bot.sendMessage(chatId, MESSAGES.INFO_ABOUT_PDS);
      break;
    default:
      await bot.sendMessage(chatId, MESSAGES.UNKNOWN_COMMAND);
  }
}

export function attachBotHandlers(bot) {
  // Обработчик команд /start и /clear
  bot.onText(/^\/(start|clear)\b/, async (msg) => {
    const chatId = msg.chat.id;
    const command = msg.text.split(' ')[0].substring(1); // убираем /
    logger.info({ chatId, command }, 'cmd:slash');
    await handleCommand(chatId, command, bot);
  });

  // Обработчик текстовых команд
  bot.onText(/^(рассчитать|что такое пдс\?*)$/i, async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase().trim();
    const command = getCommandType(text) || 'unknown';
    logger.info({ chatId, command }, 'cmd:text');

    // Для команды calculate сразу начинаем диалог
    if (command === 'calculate') {
      await startCalculationDialog(chatId, bot);
    } else {
      await handleCommand(chatId, command, bot);
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text ?? '').trim();
    if (!text || text.startsWith('/')) return;

    markUpdateStart();
    logger.info({ chatId, text }, 'msg:in');

    if (!tryLock(chatId)) {
      await bot.sendMessage(chatId, MESSAGES.WAIT_PREVIOUS);
      return;
    }

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

      markLlm(true);

      // Проверяем, является ли ответ расчётом
      const isCalculation = isCalculationResponse(reply);
      logger.info({ chatId, isCalculation }, 'msg:response:type');

      // Отправляем ответ с кнопкой PDF только для расчётов
      if (isCalculation) {
        const keyboard = createPdfKeyboard();
        await bot.sendMessage(chatId, reply, {
          disable_web_page_preview: true,
          ...keyboard,
        });
      } else {
        // Для обычных ответов показываем только кнопку "Главное меню"
        const keyboard = createBackToMainKeyboard();
        await bot.sendMessage(chatId, reply, {
          disable_web_page_preview: true,
          ...keyboard,
        });
      }

      markUpdateOk();
      logger.info({ chatId }, 'msg:out:ok');
    } catch (e) {
      markLlm(false);
      markUpdateErr();
      logger.error({ chatId, err: e }, 'msg:out:error');
      await bot.sendMessage(chatId, MESSAGES.LLM_ERROR);
    } finally {
      unlock(chatId);
    }
  });

  // Обработчик нажатий на кнопки
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    logger.info({ chatId, data }, 'callback:received');

    try {
      // Обработка PDF-генерации
      if (data === MESSAGES.CALLBACK_DATA.DOWNLOAD_PDF) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Генерирую PDF...' });
        await generateAndSendPdf(chatId, bot);
        return;
      }

      // Маппинг callback_data на команды
      const commandMap = {
        [MESSAGES.CALLBACK_DATA.CALCULATE]: 'calculate',
        [MESSAGES.CALLBACK_DATA.INFO]: 'info',
        [MESSAGES.CALLBACK_DATA.MAIN_MENU]: 'start',
      };

      const command = commandMap[data];
      if (command) {
        // Для команды calculate не показываем промежуточное сообщение
        if (command === 'calculate') {
          await bot.answerCallbackQuery(callbackQuery.id, { text: 'Начинаем расчёт!' });
          await startCalculationDialog(chatId, bot);
        } else {
          // Отвечаем на callback
          const responseText = MESSAGES.CALLBACK_RESPONSES[command.toUpperCase()] || 'OK';
          await bot.answerCallbackQuery(callbackQuery.id, { text: responseText });

          // Выполняем команду
          await handleCommand(chatId, command, bot);
        }
      }
    } catch (e) {
      logger.error({ chatId, err: e }, 'callback:error');
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: MESSAGES.CALLBACK_RESPONSES.ERROR,
      });
    }
  });

  bot.on('polling_error', (err) => logger.error({ err }, 'polling:error'));
}
