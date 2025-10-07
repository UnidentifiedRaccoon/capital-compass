import { config } from '../../config/env.js';

/**
 * Простой класс HTTP ошибки
 */
class HttpError extends Error {
  constructor(status, statusText, bodySnippet = '') {
    const note = bodySnippet ? ` – ${bodySnippet}` : '';
    super(`HTTP ${status} ${statusText}${note}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Базовый fetch с таймаутом и дефолтными заголовками.
 * Никаких ретраев и авто-JSON — только сеть и ошибки.
 */
export async function request(url, options = {}) {
  const { timeoutMs = config.API_TIMEOUT_MS, headers, signal, ...rest } = options;

  // Node 20+: простой таймаут
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const composedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const res = await fetch(url, {
    ...rest,
    signal: composedSignal,
    headers: {
      'User-Agent': 'capital-compass-ai-bot',
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!res.ok) {
    let snippet = '';
    try {
      const text = await res.text();
      snippet = text.slice(0, 200).replace(/\s+/g, ' ');
    } catch (_) {
      // ignore body read errors, we still throw using status and statusText
    }
    throw new HttpError(res.status, res.statusText, snippet);
  }

  return res;
}

/**
 * Простая функция для получения JSON
 */
export async function getJSON(url, options = {}) {
  const res = await request(url, options);
  return res.json();
}
