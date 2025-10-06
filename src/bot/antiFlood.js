// Простейшая защита: не обрабатываем несколько запросов одновременно от одного чата.
const inFlight = new Map(); // chatId -> boolean

export function tryLock(chatId) {
  if (inFlight.get(chatId)) return false;
  inFlight.set(chatId, true);
  return true;
}

export function unlock(chatId) {
  inFlight.delete(chatId);
}
