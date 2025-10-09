/**
 * Простой сервис генерации PDF-отчётов с помощью Playwright
 * Конвертирует HTML-отчёты в PDF с минималистичным форматированием
 */

import { chromium } from 'playwright';
import { createSimpleReportHtml } from './simpleParser.js';
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
    logger.info('Начинаем генерацию PDF-отчёта', {
      filename,
      botResponseLength: botResponse?.length || 0,
      hasReportDate: !!reportDate,
    });

    // Проверяем входные данные
    if (!botResponse || typeof botResponse !== 'string') {
      throw new Error(
        'Некорректные данные для генерации PDF: отсутствует или неверный формат ответа бота'
      );
    }

    if (botResponse.trim().length === 0) {
      throw new Error('Пустой ответ бота для генерации PDF');
    }

    // Проверяем доступность Playwright
    logger.info('Проверяем доступность Playwright...');
    const isPlaywrightAvailable = await checkPlaywrightAvailability();
    if (!isPlaywrightAvailable) {
      // В продакшене пытаемся переустановить браузеры
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Playwright недоступен в продакшене, пытаемся переустановить браузеры...');
        try {
          const { execSync } = await import('child_process');
          execSync('npx playwright install chromium --with-deps', {
            stdio: 'pipe',
            timeout: 60000, // 60 секунд таймаут
          });
          logger.info('Браузеры переустановлены, повторная проверка...');

          const isAvailableAfterReinstall = await checkPlaywrightAvailability();
          if (!isAvailableAfterReinstall) {
            throw new Error(
              'Playwright недоступен даже после переустановки. Обратитесь к администратору.'
            );
          }
        } catch (reinstallError) {
          logger.error('Ошибка при переустановке браузеров', { error: reinstallError.message });
          throw new Error(
            'Playwright недоступен и не удалось переустановить браузеры. Обратитесь к администратору.'
          );
        }
      } else {
        throw new Error('Playwright недоступен. Убедитесь, что браузеры установлены.');
      }
    }
    logger.info('Playwright доступен');

    // Создаём HTML-отчёт
    logger.info('Создаём HTML-отчёт...');
    const htmlContent = createSimpleReportHtml(botResponse, { reportDate });
    logger.info('HTML-отчёт создан', { htmlLength: htmlContent.length });

    // Запускаем браузер
    logger.info('Запускаем браузер...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });
    logger.info('Браузер запущен');

    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });
    logger.info('Контекст браузера создан');

    const page = await context.newPage();
    logger.info('Новая страница создана');

    // Устанавливаем содержимое страницы
    logger.info('Устанавливаем содержимое страницы...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle',
      timeout: 30000, // 30 секунд таймаут
    });
    logger.info('Содержимое страницы установлено');

    // Ждём загрузки шрифтов
    logger.info('Ждём загрузки шрифтов...');
    await page.waitForTimeout(1000);

    // Генерируем PDF
    logger.info('Генерируем PDF...');
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
    logger.info('PDF сгенерирован', { pdfSize: pdfBuffer.length });

    logger.info('PDF-отчёт успешно сгенерирован', {
      filename,
      size: pdfBuffer.length,
    });

    return pdfBuffer;
  } catch (error) {
    // Детальное логирование ошибки
    logger.error('Ошибка при генерации PDF-отчёта', {
      error: error.message,
      stack: error.stack,
      filename,
      errorName: error.name,
      errorCode: error.code,
      botResponseLength: botResponse?.length || 0,
      hasBrowser: !!browser,
    });

    // Специфичные сообщения об ошибках
    let userMessage = 'Не удалось сгенерировать PDF-отчёт';

    if (error.message.includes('Playwright недоступен')) {
      userMessage = 'Ошибка: браузер для генерации PDF недоступен. Обратитесь к администратору.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Ошибка: превышено время ожидания при генерации PDF. Попробуйте позже.';
    } else if (error.message.includes('Некорректные данные')) {
      userMessage = 'Ошибка: некорректные данные для генерации PDF.';
    } else if (error.message.includes('Пустой ответ')) {
      userMessage = 'Ошибка: нет данных для генерации PDF.';
    } else if (error.message.includes('ENOENT') || error.message.includes('ENOTFOUND')) {
      userMessage = 'Ошибка: не найдены необходимые файлы для генерации PDF.';
    } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
      userMessage = 'Ошибка: недостаточно прав для генерации PDF.';
    }

    throw new Error(userMessage);
  } finally {
    if (browser) {
      try {
        logger.info('Закрываем браузер...');
        await browser.close();
        logger.info('Браузер закрыт');
      } catch (closeError) {
        logger.error('Ошибка при закрытии браузера', {
          error: closeError.message,
          stack: closeError.stack,
        });
      }
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
  let browser = null;
  try {
    logger.info('Проверяем доступность Playwright...');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    logger.info('Playwright браузер успешно запущен');
    return true;
  } catch (error) {
    logger.error('Playwright недоступен', {
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
    });
    return false;
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.info('Тестовый браузер закрыт');
      } catch (closeError) {
        logger.warn('Ошибка при закрытии тестового браузера', {
          error: closeError.message,
        });
      }
    }
  }
}
