/**
 * Скрипт для проверки PDF генерации в продакшене
 */

import { runPdfDiagnostics } from '../src/pdf/pdfDiagnostics.js';
import { logger } from '../src/logger.js';

async function checkProductionPdf() {
  try {
    console.log('🔍 Проверяем PDF систему в продакшене...\n');

    const diagnostics = await runPdfDiagnostics();

    console.log('📊 Результаты диагностики:');
    console.log('========================\n');

    console.log(`⏰ Время: ${diagnostics.timestamp}`);
    console.log(`🌍 Окружение: ${diagnostics.environment}`);
    console.log(`🖥️  Платформа: ${diagnostics.platform} (${diagnostics.arch})`);
    console.log(`📦 Node.js: ${diagnostics.nodeVersion}`);
    console.log(`💾 Память: ${Math.round(diagnostics.memoryUsage.heapUsed / 1024 / 1024)}MB\n`);

    console.log('🧪 Тесты:');
    console.log('--------\n');

    let allPassed = true;

    Object.entries(diagnostics.tests).forEach(([_key, test]) => {
      const status = test.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${test.status}`);

      if (test.status === 'failed') {
        allPassed = false;
        if (test.error) {
          console.log(`   Ошибка: ${test.error.message}`);
          if (test.error.code) {
            console.log(`   Код: ${test.error.code}`);
          }
        }
      }

      if (test.details) {
        Object.entries(test.details).forEach(([detailKey, detailValue]) => {
          if (typeof detailValue === 'boolean') {
            console.log(`   ${detailKey}: ${detailValue ? '✅' : '❌'}`);
          } else if (typeof detailValue === 'number') {
            console.log(`   ${detailKey}: ${detailValue}`);
          } else if (typeof detailValue === 'string' && detailValue.length < 100) {
            console.log(`   ${detailKey}: ${detailValue}`);
          }
        });
      }
      console.log('');
    });

    console.log('📈 Общий статус:');
    console.log('---------------');

    if (allPassed) {
      console.log('✅ PDF система работает корректно в продакшене');
      return;
    } else {
      console.log('❌ Обнаружены проблемы с PDF системой в продакшене');
      console.log('\n🔧 Рекомендации:');
      console.log('1. Проверьте логи приложения');
      console.log('2. Убедитесь, что браузеры Playwright установлены');
      console.log('3. Проверьте доступность системных ресурсов');
      console.log('4. Обратитесь к администратору');
      throw new Error('PDF система не работает корректно');
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке PDF системы:', error.message);
    logger.error('Ошибка проверки PDF в продакшене', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

checkProductionPdf();
