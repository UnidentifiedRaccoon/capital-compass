import http from 'node:http';
import { config } from '../config/env.js';

/**
 * Создаёт HTTP сервер с /health и /tg/<WEBHOOK_SECRET>
 * @param {(update: any) => Promise<void>} onUpdate - функция передачи апдейта в бот
 */
export function createServer(onUpdate) {
  const server = http.createServer(async (req, res) => {
    // Health
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Webhook: /tg/<secret>
    const webhookPath = `/tg/${config.WEBHOOK_SECRET}`;
    if (req.method === 'POST' && req.url === webhookPath) {
      try {
        const chunks = [];
        for await (const ch of req) chunks.push(ch);
        const bodyRaw = Buffer.concat(chunks).toString('utf8');
        const update = JSON.parse(bodyRaw);
        await onUpdate(update);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('Webhook error:', e?.message || e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
  });

  return server;
}
