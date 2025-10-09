/**
 * Скрипт диагностики PDF генерации
 */

import { runPdfDiagnostics, formatDiagnosticsForLogs } from '../src/pdf/pdfDiagnostics.js';
import { logger } from '../src/logger.js';

async function main() {
  try {
    console.log('🔍 Запускаем диагностику PDF системы...\n');

    const diagnostics = await runPdfDiagnostics();
    const summary = formatDiagnosticsForLogs(diagnostics);

    console.log('📊 Результаты диагностики:');
    console.log('========================\n');

    console.log(`⏰ Время: ${diagnostics.timestamp}`);
    console.log(`🌍 Окружение: ${diagnostics.environment}`);
    console.log(`🖥️  Платформа: ${diagnostics.platform} (${diagnostics.arch})`);
    console.log(`📦 Node.js: ${diagnostics.nodeVersion}`);
    console.log(`💾 Память: ${Math.round(diagnostics.memoryUsage.heapUsed / 1024 / 1024)}MB\n`);

    console.log('🧪 Тесты:');
    console.log('--------\n');

    Object.entries(diagnostics.tests).forEach(([_key, test]) => {
      const status = test.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${test.status}`);

      if (test.status === 'failed' && test.error) {
        console.log(`   Ошибка: ${test.error.message}`);
        if (test.error.code) {
          console.log(`   Код: ${test.error.code}`);
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

    if (summary.overallStatus === 'healthy') {
      console.log('✅ Система PDF работает корректно');
    } else if (summary.overallStatus === 'degraded') {
      console.log('⚠️  Система PDF работает с ограничениями');
    } else {
      console.log('❌ Критические проблемы с системой PDF');
    }

    if (summary.failedTests.length > 0) {
      console.log('\n🚨 Проваленные тесты:');
      summary.failedTests.forEach((test) => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
    }

    if (summary.passedTests.length > 0) {
      console.log('\n✅ Успешные тесты:');
      summary.passedTests.forEach((test) => {
        console.log(`   • ${test.name}`);
      });
    }

    console.log('\n📝 Детальные логи сохранены в лог-файл');
  } catch (error) {
    console.error('❌ Ошибка при выполнении диагностики:', error.message);
    logger.error('Ошибка диагностики PDF', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

main();
