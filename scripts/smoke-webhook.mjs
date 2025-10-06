import { config } from '../src/config/env.js';

// ── простейший парсер флагов ─────────────────────────────────────────────────
function getArg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const baseUrl = (getArg('--url', `http://localhost:${config.PORT}`) || '').replace(/\/$/, '');
const secret = getArg('--secret', config.WEBHOOK_SECRET);
const text = getArg('--text', 'Привет от smoke');
const chatIdArg = getArg('--chat-id', '');
const chatId = chatIdArg ? Number(chatIdArg) : 123; // dry-run по умолчанию

// ── формируем минимальный update ─────────────────────────────────────────────
const now = Math.floor(Date.now() / 1000);
const update = {
  update_id: now,
  message: {
    message_id: 1,
    date: now,
    chat: { id: chatId },
    text,
  },
};

const url = `${baseUrl}/tg/${secret}`;

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(config.API_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        // имитируем заголовок Telegram для сверки секрета
        'X-Telegram-Bot-Api-Secret-Token': secret,
      },
      body: JSON.stringify(update),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} – ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    if (json?.ok !== true) {
      throw new Error(`Unexpected response: ${JSON.stringify(json)}`);
    }

    console.log('✅ Webhook smoke passed:', { url, chatId, text });
    if (!chatIdArg) {
      console.log(
        'ℹ️ Dry-run: используем фейковый chatId=123. Для почти E2E добавь флаг --chat-id <id>'
      );
    }
  } catch (e) {
    console.error('❌ Webhook smoke failed:', e.message || e);
    process.exitCode = 1;
  }
})();
