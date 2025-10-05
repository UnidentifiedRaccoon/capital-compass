import { config } from '../config/env.js';
import { request } from '../utils/http/request.js';

/** Валидатор modelUri (формат: gpt://<folder>/<model>/<branch|version>[@suffix] ) */
const MODEL_URI_RE = /^gpt:\/\/[a-z0-9][a-z0-9-]{3,}\/[a-z0-9-]+\/([a-z0-9.-]+)(@[a-z0-9-]+)?$/i;

/** Собираем и валидируем modelUri */
function buildModelUri() {
  // ожидаем YC_GPT_MODEL вида: yandexgpt/latest или yandexgpt-lite/latest
  const model = config.YC_GPT_MODEL.trim().replace(/^\/+|\/+$/g, '');
  const uri = `gpt://${config.YC_FOLDER_ID}/${model}`;
  if (!MODEL_URI_RE.test(uri)) {
    const hint = 'Ожидается вид: gpt://<FOLDER_ID>/<model-name>/(latest|rc|deprecated|<version>)';
    const example =
      'Напр.: gpt://b1g123abcd/yandexgpt/latest или gpt://b1g123abcd/yandexgpt-lite/latest';
    throw new Error(`Invalid modelUri: "${uri}". ${hint}. ${example}`);
  }
  return uri;
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
  // Структура ответа: берём первую альтернативу ассистента
  // (AI Studio возвращает массив альтов/фрагментов).
  const text =
    json?.result?.alternatives?.[0]?.message?.text ??
    json?.alternatives?.[0]?.message?.text ?? // на случай другой обёртки
    '';

  if (!text) {
    // покажем кусок «сырых» данных для отладки
    throw new Error(`Empty LLM response. Raw: ${JSON.stringify(json).slice(0, 300)}...`);
  }
  return text;
}
