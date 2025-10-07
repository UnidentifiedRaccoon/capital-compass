/**
 * Тестовый скрипт для проверки PDF-генерации в контексте бота
 */

import {
  getChatContext,
  addMessageToContext,
  clearChatContext,
} from '../src/storage/chatContext.js';
import { generatePdfReport } from '../src/pdf/pdfGenerator.js';

// Тестовый chatId
const TEST_CHAT_ID = 12345;

async function testBotPdfGeneration() {
  try {
    console.log('🧪 Тестируем PDF-генерацию в контексте бота...');

    // Очищаем контекст
    clearChatContext(TEST_CHAT_ID);

    // Добавляем тестовый диалог
    addMessageToContext(TEST_CHAT_ID, 'user', 'рассчитать');

    const testBotResponse = `🎯 **Цель:** рассчитать необходимый взнос в ПДС для обеспечения ежемесячной выплаты в размере 150 000 ₽ после выхода на пенсию.

📥 **Входные данные:**
- Возраст: 23 года
- Пол: мужской
- Доход: 200 000 ₽ в месяц
- Стартовый капитал: 100 000 ₽
- Ставка НДФЛ для вычета: 15%
- Реинвестировать налоговый вычет: да
- План начала выплат: по общему правилу

📊 **Результаты:**
- Требуемый взнос: 143 000 ₽ в месяц
- Прогноз капитала к началу выплат: 11 115 000 ₽
- Оценка ежемесячной выплаты из капитала (через 270 мес): 150 000 ₽
- Разбивка притока:
  - 💰 Личные взносы: 1 716 000 ₽ в год
  - 🏛️ Господдержка: 858 000 ₽ в год
  - 💸 Налоговый вычет: 257 400 ₽ в год

🎛️ **Сценарии:**
- С реинвестом налогового вычета
- Без реинвеста налогового вычета

💡 **Подсказки:**
- Для получения максимального софинансирования учитывайте ваш доход.
- Перевод ОПС не участвует в софинансировании.

⚠️ **Ограничения/риски:**
- Расчёты основаны на фиксированной доходности 10%.
- Горизонт накопления может быть недостаточным для достижения цели при раннем начале выплат.`;

    addMessageToContext(TEST_CHAT_ID, 'assistant', testBotResponse);

    // Проверяем контекст
    const context = getChatContext(TEST_CHAT_ID);
    console.log('📋 Контекст чата:', {
      totalMessages: context.length,
      userMessages: context.filter((msg) => msg.role === 'user').length,
      assistantMessages: context.filter((msg) => msg.role === 'assistant').length,
    });

    // Получаем последний ответ бота (как в боте)
    const lastBotMessage = context.filter((msg) => msg.role === 'assistant').pop();

    if (!lastBotMessage) {
      console.error('❌ Нет данных для генерации отчёта');
      return;
    }

    console.log('📝 Последний ответ бота:', {
      hasMessage: !!lastBotMessage,
      messageLength: lastBotMessage.text.length,
      preview: lastBotMessage.text.substring(0, 100) + '...',
    });

    // Генерируем PDF
    console.log('📄 Генерируем PDF...');
    const pdfBuffer = await generatePdfReport(lastBotMessage.text, {
      reportDate: new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      filename: `test-bot-pdf-${TEST_CHAT_ID}`,
    });

    console.log(`✅ PDF сгенерирован успешно! Размер: ${pdfBuffer.length} байт`);
    console.log('🎉 Тест завершён успешно!');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Запускаем тест
testBotPdfGeneration();
