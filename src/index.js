import { config } from './config/env.js';
import { createServer } from './server/fastify.js';
import { webhookBot } from './bot/webhookBot.js';
import { longPollingBot } from './bot/longPollingBot.js';
import { logger } from './logger.js';

const platformPort = process.env.PORT && Number(process.env.PORT);
const PORT = platformPort || config.DEV_PORT; // в YC возьмём PORT, локально DEV_PORT

if (config.BOT_MODE === 'webhook') {
  const bot = webhookBot();
  const server = createServer((u) => bot.processUpdate(u));

  (async () => {
    try {
      await server.listen({ port: PORT, host: '0.0.0.0' });
      logger.info({ port: PORT }, 'http:listening');
      if (config.PUBLIC_BASE_URL) {
        logger.info(
          { webhook: `${config.PUBLIC_BASE_URL}/tg/${config.WEBHOOK_SECRET}` },
          'webhook:path'
        );
      } else {
        logger.warn('Set PUBLIC_BASE_URL to complete Telegram setWebhook.');
      }
    } catch (err) {
      logger.fatal({ err }, 'http:start:error');
      throw err;
    }
  })();

  const shutdown = async (signal) => {
    logger.warn({ signal }, 'shutdown:start');
    try {
      await server.close();
      logger.info('shutdown:done');
    } catch (e) {
      logger.fatal({ err: e }, 'shutdown:error');
      throw e;
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} else {
  // старый режим: long polling (локальная разработка)
  logger.info('mode:polling');
  longPollingBot();
}
