import Fastify from 'fastify';
import { config } from '../config/env.js';

/**
 * Создаёт Fastify-сервер с /health и /tg/<WEBHOOK_SECRET>
 * @param {(update: any) => Promise<void>} onUpdate
 * @returns {import('fastify').FastifyInstance}
 */
export function createServer(onUpdate) {
  const app = Fastify({ logger: false });

  // health
  app.get('/health', async () => ({ ok: true }));

  // webhook
  const path = `/tg/${config.WEBHOOK_SECRET}`;
  app.post(path, async (request, reply) => {
    try {
      const update = request.body;
      await onUpdate(update);
      return { ok: true };
    } catch (e) {
      request.log?.error?.(e);
      reply.code(500);
      return { ok: false };
    }
  });

  return app;
}
