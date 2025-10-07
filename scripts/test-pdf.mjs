/**
 * Тестовый скрипт для проверки генерации PDF-отчётов
 */

import { generatePdfReportToFile } from '../src/pdf/pdfGenerator.js';
import { createReportHtml } from '../src/pdf/markdownParser.js';
import { extractDataForVisualization } from '../src/pdf/dataExtractor.js';
import { join } from 'path';

// Пример ответа бота из вашего сообщения
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

async function testPdfGeneration() {
  try {
    console.log('🧪 Тестируем генерацию PDF-отчёта...');

    // Тестируем извлечение данных
    console.log('🔍 Извлекаем данные для визуализации...');
    const visualizationData = extractDataForVisualization(testBotResponse);
    console.log('📊 Извлечённые данные:', JSON.stringify(visualizationData, null, 2));

    // Тестируем HTML-генерацию
    console.log('📝 Генерируем HTML с таблицами и графиками...');
    const html = createReportHtml(testBotResponse, {
      reportDate: new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    // Сохраняем HTML во временную директорию
    const os = await import('os');
    const tempDir = os.tmpdir();
    const htmlPath = join(tempDir, 'test-report.html');
    const fs = await import('fs/promises');
    await fs.writeFile(htmlPath, html);
    console.log(`✅ HTML сохранён: ${htmlPath}`);

    // Тестируем PDF-генерацию
    console.log('📄 Генерируем PDF...');
    const pdfPath = join(tempDir, 'test-report.pdf');
    await generatePdfReportToFile(testBotResponse, pdfPath, {
      reportDate: new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      filename: 'test-pension-report',
    });

    console.log(`✅ PDF сохранён: ${pdfPath}`);

    // Очищаем временные файлы
    try {
      await fs.unlink(htmlPath);
      await fs.unlink(pdfPath);
      console.log('🧹 Временные файлы очищены');
    } catch (error) {
      // Игнорируем ошибки очистки
    }
    console.log('🎉 Тест завершён успешно!');
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Запускаем тест
testPdfGeneration();
