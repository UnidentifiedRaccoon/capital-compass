/**
 * In-memory хранилище контекста чатов
 * Хранит последние 10 сообщений для каждого чата
 */

// Map: chatId -> { messages: [...], lastUpdate: timestamp, state: 'idle' | 'waiting_confirmation' }
const chatContexts = new Map();

// Максимальное количество сообщений в контексте (5 от бота + 5 от пользователя)
const MAX_CONTEXT_MESSAGES = 10;

/**
 * Получить контекст чата
 * @param {number} chatId - ID чата
 * @returns {Array} Массив сообщений
 */
export function getChatContext(chatId) {
  const context = chatContexts.get(chatId);
  return context?.messages || [];
}

/**
 * Добавить сообщение в контекст чата
 * @param {number} chatId - ID чата
 * @param {string} role - 'user' или 'assistant'
 * @param {string} text - Текст сообщения
 */
export function addMessageToContext(chatId, role, text) {
  if (!chatContexts.has(chatId)) {
    chatContexts.set(chatId, {
      messages: [],
      lastUpdate: Date.now(),
      state: 'idle',
    });
  }

  const context = chatContexts.get(chatId);

  // Добавляем новое сообщение
  context.messages.push({
    role,
    text,
    timestamp: Date.now(),
  });

  // Ограничиваем количество сообщений
  if (context.messages.length > MAX_CONTEXT_MESSAGES) {
    context.messages = context.messages.slice(-MAX_CONTEXT_MESSAGES);
  }

  // Обновляем время последнего обновления
  context.lastUpdate = Date.now();
}

/**
 * Очистить контекст чата
 * @param {number} chatId - ID чата
 */
export function clearChatContext(chatId) {
  chatContexts.delete(chatId);
}

/**
 * Установить состояние чата
 * @param {number} chatId - ID чата
 * @param {string} state - Состояние чата ('idle' | 'waiting_confirmation')
 */
export function setChatState(chatId, state) {
  if (!chatContexts.has(chatId)) {
    chatContexts.set(chatId, {
      messages: [],
      lastUpdate: Date.now(),
      state: 'idle',
    });
  }

  const context = chatContexts.get(chatId);
  context.state = state;
  context.lastUpdate = Date.now();
}

/**
 * Получить состояние чата
 * @param {number} chatId - ID чата
 * @returns {string} Состояние чата
 */
export function getChatState(chatId) {
  const context = chatContexts.get(chatId);
  return context?.state || 'idle';
}

/**
 * Получить статистику по контекстам
 * @returns {Object} Статистика
 */
export function getContextStats() {
  return {
    totalChats: chatContexts.size,
    totalMessages: Array.from(chatContexts.values()).reduce(
      (sum, context) => sum + context.messages.length,
      0
    ),
    oldestContext: Math.min(
      ...Array.from(chatContexts.values()).map((context) => context.lastUpdate)
    ),
  };
}

/**
 * Очистить старые контексты (старше 24 часов)
 * Вызывается вручную при необходимости
 */
export function cleanupOldContexts() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 часа

  for (const [chatId, context] of chatContexts.entries()) {
    if (now - context.lastUpdate > maxAge) {
      chatContexts.delete(chatId);
    }
  }
}
