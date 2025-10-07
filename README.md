# Capital Compass AI

> 🤖 Telegram-бот для консультаций по пенсионным накоплениям (ПДС) с использованием Yandex GPT

Диалоговый ассистент на Node.js 20, который помогает пользователям рассчитать оптимальные взносы в Программу долгосрочных сбережений (ПДС) для достижения желаемых пенсионных целей.

## 🚀 Возможности

- **💬 Интеллектуальные консультации** — специализированный бот по пенсионным накоплениям
- **📊 Математические расчёты** — точные вычисления с учётом господдержки и налоговых вычетов
- **🎯 Персональные рекомендации** — индивидуальные советы на основе дохода и целей
- **🔄 Контекстные диалоги** — запоминание истории общения для более качественных ответов
- **⚡ Быстрые ответы** — оптимизированная архитектура для минимального времени отклика
- **📈 Мониторинг** — встроенные метрики и логирование для отслеживания работы

## 🏗️ Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Telegram      │    │   Fastify        │    │   Yandex GPT    │
│   Bot API       │◄──►│   Web Server     │◄──►│   API           │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Chat Context   │
                       │   Storage        │
                       └──────────────────┘
```

### Основные компоненты

- **`src/bot/`** — обработчики Telegram-бота (webhook/polling)
- **`src/llm/`** — интеграция с Yandex GPT API
- **`src/server/`** — Fastify HTTP-сервер с эндпоинтами
- **`src/storage/`** — in-memory хранилище контекста чатов
- **`src/config/`** — конфигурация и валидация переменных окружения

## 🛠️ Технологический стек

- **Node.js 20.10.0** — основная платформа
- **Fastify** — быстрый HTTP-сервер
- **node-telegram-bot-api** — Telegram Bot API
- **Yandex GPT** — языковая модель для генерации ответов
- **Pino** — структурированное логирование
- **Docker** — контейнеризация
- **GitHub Actions** — CI/CD

## 📦 Установка и запуск

### Требования

- Node.js 20.10.0+
- npm 10.2.3+
- Telegram Bot Token
- Yandex Cloud API ключ

### Локальная разработка

1. **Клонирование репозитория**

   ```bash
   git clone <repository-url>
   cd capital-compass
   ```

2. **Установка зависимостей**

   ```bash
   npm ci
   ```

3. **Настройка переменных окружения**

   ```bash
   cp .env.example .env
   ```

   Заполните `.env` файл:

   ```env
   # Telegram Bot
   TELEGRAM_BOT_TOKEN=your_bot_token

   # Yandex Cloud
   YC_API_KEY=your_api_key
   YC_FOLDER_ID=your_folder_id
   YC_GPT_MODEL=yandexgpt/latest
   YC_GPT_ENDPOINT=https://llm.api.cloud.yandex.net/foundationModels/v1/chat/completions

   # Server Configuration
   BOT_MODE=webhook
   DEV_PORT=8080
   WEBHOOK_SECRET=your_webhook_secret
   PUBLIC_BASE_URL=https://your-domain.com

   # Optional
   API_TIMEOUT_MS=7000
   ```

4. **Запуск в режиме разработки**
   ```bash
   npm run start:dev
   ```

### Доступные скрипты

```bash
# Разработка
npm run start:dev          # Запуск в dev-режиме
npm run start              # Запуск в production-режиме

# Качество кода
npm run lint               # ESLint проверка
npm run lint:fix           # Автоисправление ESLint
npm run format             # Prettier форматирование
npm run format:check       # Проверка форматирования

# Тестирование
npm run smoke:http         # HTTP smoke test
npm run smoke:llm          # LLM smoke test
npm run smoke:webhook      # Webhook smoke test
```

## 🌐 API Документация

### Эндпоинты

- **`GET /health`** — проверка состояния сервиса
- **`GET /metrics`** — метрики производительности
- **`POST /tg/{webhook_secret}`** — webhook для Telegram

### Примеры запросов

```bash
# Проверка здоровья
curl http://localhost:8080/health

# Получение метрик
curl http://localhost:8080/metrics
```

## 🚀 Деплой

### Yandex Cloud Serverless Container

Проект настроен для автоматического деплоя в Yandex Cloud через GitHub Actions:

1. **Настройка секретов в GitHub**

   - `TELEGRAM_BOT_TOKEN` — токен Telegram бота
   - `YC_API_KEY` — API ключ Yandex Cloud
   - `YC_FOLDER_ID` — ID папки в Yandex Cloud
   - `YC_GPT_MODEL` — модель GPT (по умолчанию: yandexgpt/latest)
   - `YC_GPT_ENDPOINT` — эндпоинт API
   - `WEBHOOK_SECRET` — секрет для webhook
   - `YC_DOCKER_PASSWORD` — пароль для Container Registry
   - `YC_SA_JSON` — JSON ключ сервисного аккаунта
   - `YC_CLOUD_ID` — ID облака
   - `YC_REGISTRY_ID` — ID реестра контейнеров
   - `YC_CONTAINER_NAME` — имя контейнера
   - `YC_SERVICE_ACCOUNT_ID` — ID сервисного аккаунта

2. **Автоматический деплой**
   - Push в ветку `main` автоматически запускает деплой
   - Сборка Docker-образа и публикация в Container Registry
   - Обновление ревизии Serverless Container

### Docker

```bash
# Сборка образа
docker build -t capital-compass .

# Запуск контейнера
docker run -p 8080:8080 \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e YC_API_KEY=your_key \
  -e YC_FOLDER_ID=your_folder \
  -e WEBHOOK_SECRET=your_secret \
  capital-compass
```

## 📊 Мониторинг и логирование

### Логирование

- **Pino** — структурированные JSON-логи
- **Уровни логирования** — debug, info, warn, error, fatal
- **Контекстная информация** — chatId, timing, ошибки

### Метрики

- `updates_total` — общее количество обновлений
- `updates_ok` — успешные обновления
- `updates_err` — ошибки обновлений
- `llm_calls` — вызовы LLM
- `llm_failed` — неудачные вызовы LLM
- `llm_last_latency_ms` — последняя задержка LLM
- `uptime_s` — время работы в секундах

### Мониторинг контекста

- `context.totalChats` — количество активных чатов
- `context.totalMessages` — общее количество сообщений в контексте
- `context.oldestContext` — время создания самого старого контекста

## 🔧 Разработка

### Структура проекта

```
src/
├── bot/                    # Telegram Bot логика
│   ├── attachBotHandlers.js    # Обработчики сообщений
│   ├── longPollingBot.js       # Long polling режим
│   ├── webhookBot.js           # Webhook режим
│   ├── prompt.js               # Системный промпт
│   └── antiFlood.js            # Защита от спама
├── config/
│   └── env.js                  # Конфигурация окружения
├── llm/
│   └── yandex-gpt.js           # Yandex GPT интеграция
├── server/
│   └── fastify.js              # HTTP сервер
├── storage/
│   └── chatContext.js          # Хранилище контекста
├── utils/
│   └── http/                   # HTTP утилиты
├── index.js                    # Точка входа
├── logger.js                   # Настройка логирования
└── metrics.js                  # Метрики
```

### Добавление новых функций

1. **Новые команды бота** — добавьте обработчики в `src/bot/attachBotHandlers.js`
2. **Новые эндпоинты** — расширьте `src/server/fastify.js`
3. **Новые метрики** — добавьте в `src/metrics.js`

### Тестирование

```bash
# Запуск всех тестов
npm run smoke:http && npm run smoke:llm && npm run smoke:webhook

# Проверка линтера
npm run lint

# Проверка форматирования
npm run format:check
```

## 🔒 Безопасность

- **Переменные окружения** — все секреты хранятся в переменных окружения
- **Валидация конфигурации** — строгая проверка при запуске
- **Webhook секреты** — защита webhook эндпоинтов
- **Rate limiting** — защита от спама через antiFlood механизм

## 📝 Лицензия

MIT License

---

**Теги:** #telegram #nodejs #yandexgpt #pension #financial-advice #docker #github-actions #fastify #pino
