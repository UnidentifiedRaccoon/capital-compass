import { config } from './config/env.js';
import { createServer } from './server/http.js';
import { createWebhookBot } from './bot/webhook.js';
import { initBot as initPolling } from './bot/index.js'; // твой текущий polling-инициализатор

if (config.BOT_MODE === 'webhook') {
  const bot = createWebhookBot();
  const server = createServer((u) => bot.processUpdate(u));

  server.listen(config.PORT, () => {
    console.log(`HTTP server listening on :${config.PORT}`);
    if (config.PUBLIC_BASE_URL) {
      console.log(`Webhook path: ${config.PUBLIC_BASE_URL}/tg/${config.WEBHOOK_SECRET}`);
    } else {
      console.log('Set PUBLIC_BASE_URL to complete Telegram setWebhook.');
    }
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received: shutting down...`);
    server.close(() => {
      throw new Error('Server shutdown');
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} else {
  // старый режим: long polling (локальная разработка)
  initPolling();
}
