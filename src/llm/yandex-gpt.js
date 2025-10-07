import { config } from '../config/env.js';
import { request } from '../utils/http/request.js';

/** Собираем modelUri */
function buildModelUri() {
  const model = config.YC_GPT_MODEL.trim().replace(/^\/+|\/+$/g, '');
  return `gpt://${config.YC_FOLDER_ID}/${model}`;
}

/**
 * Вызов Chat Completions v1
 * @param {Array<{role: 'system'|'user'|'assistant', text: string}>} messages
 * @param {{temperature?: number, maxTokens?: number}} [opts]
 * @returns {Promise<string>} text ответа ассистента
 */
export async function chat(messages, opts = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }
  const modelUri = buildModelUri();

  const body = {
    modelUri,
    completionOptions: {
      stream: false,
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2,
      // По докам присутствует maxTokens; укажем мягко (строки тоже приемлемы на стороне API)
      maxTokens: String(typeof opts.maxTokens === 'number' ? opts.maxTokens : 800),
    },
    messages,
  };

  const res = await request(config.YC_GPT_ENDPOINT, {
    method: 'POST',
    timeoutMs: config.API_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${config.YC_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  const text = json?.result?.alternatives?.[0]?.message?.text || '';

  if (!text) {
    throw new Error(`Empty LLM response. Raw: ${JSON.stringify(json).slice(0, 300)}...`);
  }
  return text;
}
