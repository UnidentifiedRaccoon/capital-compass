import { chat } from '../src/llm/yandex-gpt.js';

const userText = process.argv.slice(2).join(' ').trim() || 'Привет! Коротко представься.';

(async () => {
  try {
    // Проверяем наличие необходимых переменных окружения
    const requiredEnvVars = ['YC_API_KEY', 'YC_FOLDER_ID'];
    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error(
        '❌ LLM error: Missing required environment variables:',
        missingVars.join(', ')
      );
      console.log('ℹ️  Skipping LLM test in CI environment');
      process.exitCode = 0; // Не считаем это критической ошибкой
      return;
    }

    const reply = await chat([
      { role: 'system', text: 'Отвечай кратко и дружелюбно.' },
      { role: 'user', text: userText },
    ]);
    console.log('🤖', reply);
  } catch (e) {
    console.error('❌ LLM error:', e.message);

    // В CI окружении не считаем ошибки LLM критическими
    if (process.env.CI) {
      console.log('ℹ️  LLM test failed in CI, but continuing...');
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  }
})();
