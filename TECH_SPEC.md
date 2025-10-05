# Capital Compass AI — Техническая спецификация

## 1. Цели и границы MVP

- Цель: Telegram-бот финансового ассистента (диалог + ответы Yandex GPT).
- Основной сценарий: пользователь пишет вопрос → бот отвечает с помощью Yandex GPT.
- Вне MVP: веб-чат, БД пользователей, сложные фин-калькуляторы (reserved).

## 2. Архитектура (высокоуровнево)

- Клиент: Telegram (диалоговые сообщения).
- Backend: Node.js 20, модульная структура (bot, llm, logger, config).
- Интеграции: Telegram Bot API, Yandex Cloud GPT Chat Completions v1.
- Деплой: Render (Background Worker), Docker.
- Логи: pino (JSON). Мониторинг: Render Dashboard.

## 3. Технологический стек

- Язык/Runtime: Node.js 20.10.0 (ES-модули), npm 10.x.
- Боты: `node-telegram-bot-api` (long polling).
- HTTP: встроенный `fetch` (Node 20) + таймауты/ретраи.
- Логи: `pino`.
- Линтинг/форматирование: ESLint, Prettier.
- CI: GitHub Actions.
- Облако: Render.com (Dockerfile + Procfile).

## 4. Конфигурация и секреты

Переменные окружения:

- `TELEGRAM_BOT_TOKEN` — токен бота.
- `YC_API_KEY` — API-ключ Yandex Cloud.
- `YC_FOLDER_ID` — Folder ID в Яндекс Облаке.
- `YC_GPT_MODEL` — имя модели (напр. `yandexgpt/latest`).
- `YC_GPT_ENDPOINT` — `https://llm.api.cloud.yandex.net/foundationModels/v1/chat/completions`
- `LOG_LEVEL` — уровень логов (`info` по умолчанию).

Загрузчик: `dotenv` в `src/config/env.js`. Валидация на старте.

## 5. Контракты и протоколы

### 5.1 Telegram

- Приём сообщений (text), ответ в тот же чат.
- Индикация «typing…» во время запроса к LLM.
- Обработка ошибок: дружелюбное сообщение + лог.

### 5.2 Yandex GPT (Chat Completions v1)

- Auth: `Authorization: Api-Key <YC_API_KEY>`.
- Body: `modelUri: 'gpt://<FOLDER_ID>/<model>/latest'`, `messages: [{role, text}]`.
- Ошибки: таймаут, 4xx/5xx — ловим, возвращаем шаблонную подсказку пользователю.

## 6. Логи и наблюдаемость

- Формат JSON (pino), поля: level, msg, ts, chatId, latency_ms, err.
- Корреляция: на время запроса к LLM — логируем `requestId`.
- Ротация/хранение: Render logs (стандарт).

## 7. Производительность и таймауты

- Цель ответа: ≤2s без LLM, ≤5–8s с LLM.
- Таймаут HTTP к LLM: 12–15s + 1 ретрай при `ECONNRESET`.

## 8. Надёжность и ошибки

- Грациозное завершение (SIGINT/SIGTERM).
- Повторные попытки при сетевых сбоях.
- Явные сообщения на частые ошибки (напр., неверный `modelUri`).

## 9. Безопасность

- Секреты только в переменных окружения.
- Не логировать содержимое пользовательских сообщений в проде (или редактировать).
- Обновления зависимостей через CI.

## 10. Сборка и деплой

- Dockerfile (node:20-alpine), `npm ci` → `npm run build` (если нужно) → `node src/index.js`.
- Procfile: `worker: node src/index.js` (совместимость).
- Render: Background Worker, авто-деплой по push в main.

## 11. Тестирование

- Smoke-скрипты (`scripts/echo-llm.mjs`, `scripts/ping-bot.mjs`).
- Линт/типовые юнит-тесты для утилит.

## 12. Руководство по эксплуатации (Ops Runbook)

- «Бот молчит»: проверить токены, логи Render, перезапустить воркер.
- «LLM 4xx/5xx»: проверить `modelUri`, квоты, ключ, сети; переключить уровень логирования.

## 13. Дорожная карта (после MVP)

- Хранение контекста (БД).
- Файловая выдача (PDF/изображения).
- Веб-чат, аутентификация.
