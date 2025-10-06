import { config } from './config/env.js';
import { createServer } from './server/fastify.js';
import { webhookBot } from './bot/webhookBot.js';
import { longPollingBot } from './bot/longPollingBot.js';

if (config.BOT_MODE === 'webhook') {
  const bot = webhookBot();
  const server = createServer((u) => bot.processUpdate(u));

  (async () => {
    try {
      await server.listen({ port: config.PORT, host: '0.0.0.0' });
      console.log(`HTTP server listening on :${config.PORT}`);
      if (config.PUBLIC_BASE_URL) {
        console.log(`Webhook path: ${config.PUBLIC_BASE_URL}/tg/${config.WEBHOOK_SECRET}`);
      } else {
        console.log('Set PUBLIC_BASE_URL to complete Telegram setWebhook.');
      }
    } catch (err) {
      console.error('Server start error:', err?.message || err);
      throw err;
    }
  })();

  const shutdown = async (signal) => {
    console.log(`\n${signal} received: shutting down...`);
    try {
      await server.close();
    } catch (e) {
      console.error('Error during shutdown:', e?.message || e);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} else {
  // старый режим: long polling (локальная разработка)
  longPollingBot();
}
