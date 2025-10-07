/**
 * Сервис генерации PDF-отчётов с помощью Playwright
 * Конвертирует HTML-отчёты в PDF с красивым форматированием
 */

import { chromium } from 'playwright';
import { createReportHtml } from './markdownParser.js';
import { logger } from '../logger.js';

/**
 * Генерирует PDF-отчёт из ответа бота
 * @param {string} botResponse - Ответ бота в markdown-формате
 * @param {Object} options - Опции генерации
 * @param {string} options.reportDate - Дата отчёта
 * @param {string} options.filename - Имя файла (без расширения)
 * @returns {Promise<Buffer>} PDF-файл в виде Buffer
 */
export async function generatePdfReport(botResponse, options = {}) {
  const { reportDate, filename = 'pension-report' } = options;

  let browser = null;

  try {
    logger.info('Начинаем генерацию PDF-отчёта', { filename });

    // Создаём HTML-отчёт
    const htmlContent = createReportHtml(botResponse, { reportDate });

    // Запускаем браузер
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });

    const page = await context.newPage();

    // Устанавливаем содержимое страницы
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle',
    });

    // Ждём загрузки шрифтов
    await page.waitForTimeout(1000);

    // Генерируем PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; color: #6b7280; text-align: center; width: 100%; padding: 5px;">
          Capital Compass AI - Отчёт по пенсионным накоплениям
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; color: #6b7280; text-align: center; width: 100%; padding: 5px;">
          Страница <span class="pageNumber"></span> из <span class="totalPages"></span>
        </div>
      `,
    });

    logger.info('PDF-отчёт успешно сгенерирован', {
      filename,
      size: pdfBuffer.length,
    });

    return pdfBuffer;
  } catch (error) {
    logger.error('Ошибка при генерации PDF-отчёта', {
      error: error.message,
      stack: error.stack,
      filename,
    });
    throw new Error(`Не удалось сгенерировать PDF-отчёт: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Генерирует PDF-отчёт и сохраняет его в файл
 * @param {string} botResponse - Ответ бота в markdown-формате
 * @param {string} filePath - Путь для сохранения файла
 * @param {Object} options - Опции генерации
 * @returns {Promise<string>} Путь к сохранённому файлу
 */
export async function generatePdfReportToFile(botResponse, filePath, options = {}) {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    // Генерируем PDF
    const pdfBuffer = await generatePdfReport(botResponse, options);

    // Создаём директорию если не существует
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Сохраняем файл
    await fs.writeFile(filePath, pdfBuffer);

    logger.info('PDF-отчёт сохранён в файл', { filePath });

    return filePath;
  } catch (error) {
    logger.error('Ошибка при сохранении PDF-отчёта', {
      error: error.message,
      filePath,
    });
    throw error;
  }
}

/**
 * Генерирует PDF-отчёт во временный файл
 * @param {string} botResponse - Ответ бота в markdown-формате
 * @param {Object} options - Опции генерации
 * @returns {Promise<string>} Путь к временному файлу
 */
export async function generatePdfReportToTempFile(botResponse, options = {}) {
  const os = await import('os');
  const path = await import('path');

  const tempDir = os.tmpdir();
  const filename = options.filename || `pension-report-${Date.now()}`;
  const filePath = path.join(tempDir, `${filename}.pdf`);

  return await generatePdfReportToFile(botResponse, filePath, options);
}

/**
 * Проверяет доступность Playwright
 * @returns {Promise<boolean>} true если Playwright доступен
 */
export async function checkPlaywrightAvailability() {
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch (error) {
    logger.warn('Playwright недоступен', { error: error.message });
    return false;
  }
}
