/**
 * Диагностика проблем с PDF генерацией
 */

import { chromium } from 'playwright';
import { logger } from '../logger.js';
import { createSimpleReportHtml } from './simpleParser.js';

/**
 * Выполняет полную диагностику системы PDF генерации
 * @returns {Promise<Object>} Результат диагностики
 */
export async function runPdfDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: process.memoryUsage(),
    tests: {},
  };

  logger.info('Начинаем диагностику PDF системы', { diagnostics });

  // Тест 1: Проверка доступности Playwright
  diagnostics.tests.playwright = await testPlaywrightAvailability();

  // Тест 2: Проверка генерации HTML
  diagnostics.tests.htmlGeneration = await testHtmlGeneration();

  // Тест 3: Проверка полного цикла PDF генерации
  diagnostics.tests.fullPdfGeneration = await testFullPdfGeneration();

  // Тест 4: Проверка системных ресурсов
  diagnostics.tests.systemResources = await testSystemResources();

  logger.info('Диагностика PDF системы завершена', { diagnostics });

  return diagnostics;
}

/**
 * Тестирует доступность Playwright
 */
async function testPlaywrightAvailability() {
  const test = {
    name: 'Playwright Availability',
    status: 'unknown',
    error: null,
    details: {},
  };

  try {
    logger.info('Тестируем доступность Playwright...');

    const browser = await chromium.launch({
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

    test.details.browserLaunched = true;

    const context = await browser.newContext();
    test.details.contextCreated = true;

    const page = await context.newPage();
    test.details.pageCreated = true;

    await page.setContent('<html><body><h1>Test</h1></body></html>');
    test.details.contentSet = true;

    await browser.close();
    test.details.browserClosed = true;

    test.status = 'success';
    logger.info('Playwright тест успешен');
  } catch (error) {
    test.status = 'failed';
    test.error = {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    };
    logger.error('Playwright тест провален', { error: test.error });
  }

  return test;
}

/**
 * Тестирует генерацию HTML
 */
async function testHtmlGeneration() {
  const test = {
    name: 'HTML Generation',
    status: 'unknown',
    error: null,
    details: {},
  };

  try {
    logger.info('Тестируем генерацию HTML...');

    const sampleResponse = `🎯 **Цель:** тест генерации PDF

📊 **Результаты расчёта:**
• Тестовый результат 1
• Тестовый результат 2

💡 **Подсказки:**
• Тестовая подсказка`;

    const html = createSimpleReportHtml(sampleResponse, {
      reportDate: new Date().toLocaleDateString('ru-RU'),
    });

    test.details.htmlLength = html.length;
    test.details.hasContent = html.includes('Capital Compass AI');
    test.details.hasStyles = html.includes('<style>');
    test.details.hasTestContent = html.includes('тест генерации PDF');

    test.status = 'success';
    logger.info('HTML генерация тест успешен', { htmlLength: html.length });
  } catch (error) {
    test.status = 'failed';
    test.error = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
    logger.error('HTML генерация тест провален', { error: test.error });
  }

  return test;
}

/**
 * Тестирует полную генерацию PDF
 */
async function testFullPdfGeneration() {
  const test = {
    name: 'Full PDF Generation',
    status: 'unknown',
    error: null,
    details: {},
  };

  let browser = null;

  try {
    logger.info('Тестируем полную генерацию PDF...');

    const sampleResponse = `🎯 **Цель:** тест генерации PDF

📊 **Результаты расчёта:**
• Тестовый результат 1: 1000 ₽
• Тестовый результат 2: 2000 ₽

💡 **Подсказки:**
• Тестовая подсказка 1
• Тестовая подсказка 2`;

    const html = createSimpleReportHtml(sampleResponse, {
      reportDate: new Date().toLocaleDateString('ru-RU'),
    });

    test.details.htmlGenerated = true;
    test.details.htmlLength = html.length;

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

    test.details.browserLaunched = true;

    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });

    test.details.contextCreated = true;

    const page = await context.newPage();
    test.details.pageCreated = true;

    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    test.details.contentSet = true;

    await page.waitForTimeout(1000);
    test.details.fontsLoaded = true;

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    test.details.pdfGenerated = true;
    test.details.pdfSize = pdfBuffer.length;
    test.details.pdfValid = pdfBuffer.length > 0;

    test.status = 'success';
    logger.info('Полная генерация PDF тест успешен', { pdfSize: pdfBuffer.length });
  } catch (error) {
    test.status = 'failed';
    test.error = {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    };
    logger.error('Полная генерация PDF тест провален', { error: test.error });
  } finally {
    if (browser) {
      try {
        await browser.close();
        test.details.browserClosed = true;
      } catch (closeError) {
        test.details.browserCloseError = closeError.message;
      }
    }
  }

  return test;
}

/**
 * Тестирует системные ресурсы
 */
async function testSystemResources() {
  const test = {
    name: 'System Resources',
    status: 'unknown',
    error: null,
    details: {},
  };

  try {
    logger.info('Тестируем системные ресурсы...');

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    test.details.memoryUsage = memoryUsage;
    test.details.cpuUsage = cpuUsage;
    test.details.uptime = process.uptime();
    test.details.platform = process.platform;
    test.details.arch = process.arch;
    test.details.nodeVersion = process.version;

    // Проверяем доступность памяти
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    test.details.memoryMB = Math.round(memoryMB);
    test.details.memoryOK = memoryMB < 1000; // Менее 1GB

    test.status = 'success';
    logger.info('Системные ресурсы тест успешен', { memoryMB: test.details.memoryMB });
  } catch (error) {
    test.status = 'failed';
    test.error = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
    logger.error('Системные ресурсы тест провален', { error: test.error });
  }

  return test;
}

/**
 * Форматирует результат диагностики для логов
 */
export function formatDiagnosticsForLogs(diagnostics) {
  const summary = {
    timestamp: diagnostics.timestamp,
    environment: diagnostics.environment,
    overallStatus: 'unknown',
    failedTests: [],
    passedTests: [],
  };

  Object.entries(diagnostics.tests).forEach(([_key, test]) => {
    if (test.status === 'success') {
      summary.passedTests.push(test.name);
    } else if (test.status === 'failed') {
      summary.failedTests.push({
        name: test.name,
        error: test.error?.message || 'Unknown error',
      });
    }
  });

  if (summary.failedTests.length === 0) {
    summary.overallStatus = 'healthy';
  } else if (summary.passedTests.length === 0) {
    summary.overallStatus = 'critical';
  } else {
    summary.overallStatus = 'degraded';
  }

  return summary;
}
