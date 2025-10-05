# Capital Compass AI (Telegram бот + Yandex GPT)

Диалоговый ассистент на Node.js 20: принимает сообщения в Telegram и отвечает через Yandex GPT Chat Completions v1. Логи — pino. Деплой — Render (Docker + Procfile).

## Возможности
- Приём сообщений (long polling), быстрый ответ.
- Генерация ответов через Yandex GPT.
- Структурированные логи для диагностики.
- Готовность к деплою на Render.

## Быстрый старт (локально)
1. Установи Node 20.10.0 и npm 10.x (рекомендуется nvm).
2. `git clone … && cd …`
3. `cp .env.example .env` и заполни:
   - `TELEGRAM_BOT_TOKEN=...`
   - `YC_API_KEY=...`
   - `YC_FOLDER_ID=...`
   - `YC_GPT_MODEL=yandexgpt/latest`
   - `YC_GPT_ENDPOINT=https://llm.api.cloud.yandex.net/foundationModels/v1/chat/completions`
4. `npm ci`
5. `npm run dev`
6. Напиши что-нибудь своему боту — он ответит.

## Скрипты
- `npm run dev` — запуск в dev.
- `npm run lint` — ESLint.
- `npm run start` — прод-режим.

## Переменные окружения
Смотри `.env.example`. При старте валидация конфигурации сообщает о проблемах (например, неверный `modelUri`).

## Деплой на Render
1. Собери Docker-образ локально (опционально) и проверь запуск.
2. Создай сервис Background Worker на Render, задай старт-команду `node src/index.js`.
3. Передай секреты из `.env` в Render → Environment.
4. Включи авто-деплой из GitHub (push в `main`).

## Логи и мониторинг
- pino выводит JSON-логи.
- Следи за ошибками LLM и таймаутами в Render Dashboard.

## Безопасность
- Ключи/токены храни в переменных окружения.
- Не коммить `.env`.

## Лицензия
MIT (или своя).

---

**Теги:** #telegram #nodejs #yandexgpt #render #docker #pino #github-actions #dotenv #eslint #prettier
