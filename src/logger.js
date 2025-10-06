import pino from 'pino';

/**
 * Структурированный логгер.
 * В проде — JSON; локально можно смотреть через pino-pretty.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { svc: 'capital-compass-ai-bot' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
