import Fastify from 'fastify';
import { config } from '../config/env.js';
import { logger } from '../logger.js';
import { metricsSnapshot } from '../metrics.js';

/**
 * Создаёт Fastify-сервер с /health и /tg/<WEBHOOK_SECRET>
 * @param {(update: any) => Promise<void>} onUpdate
 * @returns {import('fastify').FastifyInstance}
 */
export function createServer(onUpdate) {
  const app = Fastify({ logger: false });

  // health
  app.get('/health', async () => ({ ok: true }));

  // metrics (простые in-memory метрики)
  app.get('/metrics', async () => await metricsSnapshot());

  // webhook
  const path = `/tg/${config.WEBHOOK_SECRET}`;
  app.post(path, async (request, reply) => {
    const secret = request.headers['x-telegram-bot-api-secret-token'];
    if (secret && secret !== config.WEBHOOK_SECRET) {
      reply.code(401);
      return { ok: false, error: 'bad secret' };
    }

    const update = request.body;
    logger.debug({ update_id: update?.update_id }, 'webhook:update:received');

    // мгновенно подтверждаем Telegram и обрабатываем в фоне
    reply.send({ ok: true });

    // Обрабатываем в фоне без дополнительных try-catch
    onUpdate(update).catch((e) => {
      logger.error({ err: e }, 'webhook:handler:error');
    });
  });

  return app;
}
