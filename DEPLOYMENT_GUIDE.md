# Руководство по деплою в Yandex Cloud

## 🎯 Как работает деплой

**Serverless Container создается ОДИН РАЗ** вручную, а CI/CD только **обновляет ревизии** с новым образом.

## 📋 Необходимые секреты в GitHub

### Обязательные:

- `YC_SA_JSON` - весь JSON файл `sa.json` (из него извлекаются `service_account_id` и `private_key`)
- `YC_REGISTRY_ID` - ID Container Registry
- `YC_FOLDER_ID` - ID папки в Yandex Cloud
- `YC_CLOUD_ID` - ID облака
- `YC_CONTAINER_NAME` - имя контейнера
- `WEBHOOK_SECRET` - секрет для webhook
- Переменные окружения приложения

## 🚀 Пошаговая настройка

### 1. Создайте Serverless Container вручную

```bash
# Аутентификация
yc config set service-account-key sa.json
yc config set cloud-id YOUR_CLOUD_ID
yc config set folder-id YOUR_FOLDER_ID

# Создание контейнера (ОДИН РАЗ)
yc serverless container create \
  --name capital-compass \
  --description "Capital Compass AI Telegram Bot" \
  --folder-id YOUR_FOLDER_ID
```

### 2. Настройте секреты в GitHub

Перейдите в `Settings` → `Secrets and variables` → `Actions` и добавьте все секреты.

### 3. Проверьте права сервисного аккаунта

Убедитесь, что сервисный аккаунт имеет права:

- `serverless.containers.invoker`
- `serverless.containers.editor`
- `container-registry.images.puller`

## 🔄 Как работает CI/CD

1. **Сборка образа** - GitHub Actions собирает Docker образ
2. **Публикация в Registry** - образ загружается в Yandex Container Registry
3. **Обновление ревизии** - создается новая ревизия контейнера с новым образом
4. **Автоматический деплой** - контейнер переключается на новую ревизию

## ❌ Частые проблемы

### "Service account is not available"

- Проверьте, что `YC_SA_JSON` содержит правильный `service_account_id`
- Убедитесь, что сервисный аккаунт активен
- Проверьте права доступа

### "Container already exists"

- Это нормально! Контейнер создается один раз
- CI/CD только обновляет ревизии

### "Password required"

- Проверьте, что `YC_SA_JSON` содержит полный JSON файл
- Убедитесь, что JSON валидный

## 🎉 После успешного деплоя

Ваш бот будет доступен по URL, который Yandex Cloud сгенерирует для Serverless Container.
