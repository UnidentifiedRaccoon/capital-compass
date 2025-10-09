import { chat } from '../llm/yandex-gpt.js';
import { tryLock, unlock } from './antiFlood.js';
import { SYSTEM_PROMPT } from './prompt.js';
import {
  MESSAGES,
  createMainKeyboard,
  createPdfKeyboard,
  createBackToMainKeyboard,
  createConfirmDataKeyboard,
  getCommandType,
} from './messages.js';
import { logger } from '../logger.js';
import { markUpdateStart, markUpdateOk, markUpdateErr, markLlm } from '../metrics.js';
import { getChatContext, addMessageToContext, clearChatContext } from '../storage/chatContext.js';
import { generatePdfReport } from '../pdf/pdfGenerator.js';

/**
 * Проверяет, является ли ответ бота запросом на подтверждение данных
 * @param {string} response - Ответ бота
 * @returns {boolean} true если это запрос на подтверждение
 */
function isDataConfirmationRequest(response) {
  // Проверяем наличие индикаторов запроса на подтверждение данных
  const confirmationIndicators = [
    '📋 Подтвердите введённые данные',
    'Проверьте правильность данных',
    'Возраст:',
    'Доход:',
    'Цель:',
    'Взнос:',
    'Начать выплаты:',
  ];

  return confirmationIndicators.some((indicator) => response.includes(indicator));
}

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
/* eslint-disable no-irregular-whitespace */
async function startCalculationDialog(chatId, bot) {
  try {
    await bot.sendChatAction(chatId, 'typing');

    // Стандартное сообщение с вопросами для кнопки "Рассчитать"
    const standardMessage = `🎯 Давай начнём расчёт. Для этого мне нужно узнать несколько данных. Пожалуйста, ответь на следующие вопросы:

1) Пол (жен/муж) — ?
2) Возраст (полных лет) — ?
3) Официальный среднемесячный доход «до НДФЛ» (руб/мес) — ?
4) Цель: допвыплата (руб/мес) или капитал к началу выплат (руб) — ?
5) Планируемый регулярный взнос в ПДС (руб/мес) — ?
6) Когда начать выплаты: «по общему правилу» или «через N лет» — ?

По желанию (для точности):
7) Стартовый капитал для ПДС (если есть), руб — ?
8) Ставка НДФЛ: 13% (по умолчанию) / 15% — ?
9) Реинвестировать налоговый вычет обратно в ПДС: да (по умолчанию) / нет — ?

Жду твоих ответов!`;

    // Добавляем сообщение пользователя в контекст (имитируем запрос на расчёт)
    addMessageToContext(chatId, 'user', 'рассчитать');

    // Добавляем стандартный ответ бота в контекст
    addMessageToContext(chatId, 'assistant', standardMessage);

    markLlm(true);

    // Отправляем стандартное сообщение с кнопкой возврата в главное меню
    const keyboard = createBackToMainKeyboard();
    await bot.sendMessage(chatId, standardMessage, {
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
 * Обрабатывает подтверждение данных и выполняет расчёт
 */
async function processDataConfirmation(chatId, bot) {
  try {
    await bot.sendChatAction(chatId, 'typing');

    // Получаем контекст чата
    const context = getChatContext(chatId);

    // Формируем сообщения для LLM (системный промпт + контекст + подтверждение)
    const messages = [
      { role: 'system', text: SYSTEM_PROMPT },
      ...context.map((msg) => ({ role: msg.role, text: msg.text })),
      { role: 'user', text: 'подтверждаю данные, выполни расчёт с введенными параметрами' },
    ];

    const reply = await chat(messages);

    // Добавляем сообщение пользователя о подтверждении в контекст
    addMessageToContext(
      chatId,
      'user',
      'подтверждаю данные, выполни расчёт с введенными параметрами'
    );

    // Добавляем ответ бота в контекст
    addMessageToContext(chatId, 'assistant', reply);

    markLlm(true);

    // Проверяем, является ли ответ расчётом
    const isCalculation = isCalculationResponse(reply);
    logger.info({ chatId, isCalculation }, 'confirmation:response:type');

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
    logger.info({ chatId }, 'confirmation:processed');
  } catch (e) {
    markLlm(false);
    markUpdateErr();
    logger.error({ chatId, err: e }, 'confirmation:error');
    await bot.sendMessage(chatId, MESSAGES.LLM_ERROR);
  }
}

/**
 * Генерирует и отправляет PDF-отчёт
 */
async function generateAndSendPdf(chatId, bot) {
  try {
    logger.info({ chatId }, 'pdf:start');
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

    if (!lastBotMessage.text || lastBotMessage.text.trim().length === 0) {
      logger.warn({ chatId }, 'pdf:emptyMessage');
      await bot.sendMessage(chatId, 'Ответ бота пуст. Нет данных для генерации отчёта.');
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

    // Проверяем размер PDF
    if (!pdfBuffer || pdfBuffer.length === 0) {
      logger.error({ chatId }, 'pdf:emptyBuffer');
      await bot.sendMessage(chatId, 'Ошибка: сгенерированный PDF пуст. Попробуйте позже.');
      return;
    }

    // Отправляем PDF как документ
    await bot.sendDocument(chatId, pdfBuffer, {
      filename: `pension-report-${Date.now()}.pdf`,
      caption: '📄 Ваш отчёт по пенсионным накоплениям готов!',
    });

    logger.info({ chatId }, 'pdf:sent');
  } catch (e) {
    // Детальное логирование ошибки
    logger.error(
      {
        chatId,
        err: e.message,
        stack: e.stack,
        errorName: e.name,
        errorCode: e.code,
      },
      'pdf:error'
    );

    // Определяем тип ошибки и отправляем соответствующее сообщение
    let errorMessage = 'Ошибка при генерации PDF-отчёта. Попробуйте позже.';

    if (e.message.includes('браузер для генерации PDF недоступен')) {
      errorMessage =
        '❌ Ошибка: браузер для генерации PDF недоступен. Обратитесь к администратору.';
    } else if (e.message.includes('превышено время ожидания') || e.message.includes('timeout')) {
      errorMessage = '⏱️ Ошибка: превышено время ожидания при генерации PDF. Попробуйте позже.';
    } else if (e.message.includes('некорректные данные')) {
      errorMessage = '📝 Ошибка: некорректные данные для генерации PDF.';
    } else if (e.message.includes('нет данных')) {
      errorMessage = '📄 Ошибка: нет данных для генерации PDF.';
    } else if (e.message.includes('не найдены необходимые файлы')) {
      errorMessage = '🔧 Ошибка: не найдены необходимые файлы для генерации PDF.';
    } else if (e.message.includes('недостаточно прав')) {
      errorMessage = '🔐 Ошибка: недостаточно прав для генерации PDF.';
    } else if (e.message.includes('PDF generation failed')) {
      errorMessage = '📄 Ошибка: не удалось сгенерировать PDF. Попробуйте позже.';
    } else if (e.message.includes('ENOENT') || e.message.includes('ENOTFOUND')) {
      errorMessage = '🔧 Ошибка: не найдены необходимые файлы. Обратитесь к администратору.';
    } else if (e.message.includes('EACCES') || e.message.includes('EPERM')) {
      errorMessage = '🔐 Ошибка: недостаточно прав доступа. Обратитесь к администратору.';
    }

    await bot.sendMessage(chatId, errorMessage);
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

      // Проверяем тип ответа
      const isDataConfirmation = isDataConfirmationRequest(reply);
      const isCalculation = isCalculationResponse(reply);
      logger.info({ chatId, isDataConfirmation, isCalculation }, 'msg:response:type');

      // Отправляем ответ с соответствующей клавиатурой
      if (isDataConfirmation) {
        // Для запросов на подтверждение данных показываем кнопки подтверждения
        const keyboard = createConfirmDataKeyboard();
        await bot.sendMessage(chatId, reply, {
          disable_web_page_preview: true,
          ...keyboard,
        });
      } else if (isCalculation) {
        // Для расчётов показываем кнопку PDF
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

      // Обработка подтверждения данных
      if (data === MESSAGES.CALLBACK_DATA.CONFIRM_DATA) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Выполняю расчёт...' });
        await processDataConfirmation(chatId, bot);
        return;
      }

      // Обработка редактирования данных
      if (data === MESSAGES.CALLBACK_DATA.EDIT_DATA) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Внесите изменения в данные.' });
        // Очищаем контекст и начинаем заново
        clearChatContext(chatId);
        await startCalculationDialog(chatId, bot);
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
