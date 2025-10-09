/**
 * Тестовый скрипт для проверки простого PDF генератора
 */

import { generatePdfReportToFile } from '../src/pdf/pdfGenerator.js';
import { logger } from '../src/logger.js';

// Пример ответа бота в формате, который вы указали
const sampleBotResponse = `🎯 **Цель:** рассчитать необходимый взнос в ПДС для обеспечения дополнительной выплаты в размере 50 000 ₽ в месяц.

📊 **Результаты расчёта:**
• Требуемый взнос: 10 000 ₽ в месяц
• Прогноз капитала к началу выплат: достаточно для обеспечения выплаты
• Оценка ежемесячной выплаты из капитала (через 270 мес): 50 000 ₽

🎛️ **Сценарии:**
• С реинвестом налогового вычета
• Без реинвеста налогового вычета

💡 **Подсказки:**
• Для максимума софинансирования учитывайте доход
• Перевод ОПС не участвует в софинансировании

⚠️ **Ограничения/риски:**
• Расчёты основаны на фиксированной доходности 10%
• Горизонт выплат — 270 месяцев (22,5 года)`;

async function testSimplePdf() {
  try {
    logger.info('Начинаем тестирование простого PDF генератора');

    // Генерируем простой PDF
    const filePath = await generatePdfReportToFile(sampleBotResponse, './test-simple-output.pdf', {
      filename: 'simple-pension-report',
      reportDate: new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    logger.info('Простой PDF успешно сгенерирован', { filePath });

    // Также создаем HTML версию для предварительного просмотра
    const { createSimpleReportHtml } = await import('../src/pdf/simpleParser.js');
    const htmlContent = createSimpleReportHtml(sampleBotResponse, {
      reportDate: new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    const fs = await import('fs/promises');
    await fs.writeFile('./test-simple-output.html', htmlContent);
    logger.info('HTML версия сохранена', { filePath: './test-simple-output.html' });

    console.log('✅ Тест простого PDF генератора завершен успешно');
    console.log(`📄 PDF файл: ${filePath}`);
    console.log(`🌐 HTML файл: ./test-simple-output.html`);
  } catch (error) {
    logger.error('Ошибка при тестировании простого PDF генератора', {
      error: error.message,
      stack: error.stack,
    });
    console.error('❌ Ошибка:', error.message);
    throw error;
  }
}

// Запускаем тест
testSimplePdf();
