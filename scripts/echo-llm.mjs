import { chat } from '../src/llm/yandex-gpt.js';

const userText = process.argv.slice(2).join(' ').trim() || 'Привет! Коротко представься.';
(async () => {
  try {
    const reply = await chat([
      { role: 'system', text: 'Отвечай кратко и дружелюбно.' },
      { role: 'user', text: userText },
    ]);
    console.log('🤖', reply);
  } catch (e) {
    console.error('❌ LLM error:', e.message);
    process.exitCode = 1;
  }
})();
