# Диагностика проблем с деплоем

## ❌ Ошибка: "Service account aje8smeevvt1djo39tfs is not available"

### 🔍 Возможные причины:

1. **Сервисный аккаунт удален или деактивирован**
2. **Неправильные права доступа**
3. **Сервисный аккаунт не в той папке/облаке**
4. **Сервисный аккаунт не имеет нужных ролей**

### 🛠️ Диагностика:

#### 1. Проверьте, что сервисный аккаунт существует:

```bash
# Аутентификация
yc config set service-account-key sa.json
yc config set cloud-id YOUR_CLOUD_ID
yc config set folder-id YOUR_FOLDER_ID

# Проверка сервисного аккаунта
yc iam service-account get aje8smeevvt1djo39tfs
```

#### 2. Проверьте права сервисного аккаунта:

```bash
# Список ролей сервисного аккаунта
yc iam service-account list-access-bindings aje8smeevvt1djo39tfs
```

#### 3. Проверьте, что сервисный аккаунт в правильной папке:

```bash
# Информация о сервисном аккаунте
yc iam service-account get aje8smeevvt1djo39tfs --format json | jq '.folder_id'
```

### 🔧 Решение:

#### Вариант 1: Создайте новый сервисный аккаунт

```bash
# Создание нового сервисного аккаунта
yc iam service-account create \
  --name capital-compass-sa \
  --description "Service account for Capital Compass bot" \
  --folder-id YOUR_FOLDER_ID

# Создание ключа для нового сервисного аккаунта
yc iam key create \
  --service-account-name capital-compass-sa \
  --output new-sa.json

# Назначение ролей
yc resource-manager folder add-access-binding YOUR_FOLDER_ID \
  --role serverless.containers.invoker \
  --subject serviceAccount:NEW_SERVICE_ACCOUNT_ID

yc resource-manager folder add-access-binding YOUR_FOLDER_ID \
  --role serverless.containers.editor \
  --subject serviceAccount:NEW_SERVICE_ACCOUNT_ID

yc resource-manager folder add-access-binding YOUR_FOLDER_ID \
  --role container-registry.images.puller \
  --subject serviceAccount:NEW_SERVICE_ACCOUNT_ID
```

#### Вариант 2: Восстановите права существующего

```bash
# Назначение ролей существующему сервисному аккаунту
yc resource-manager folder add-access-binding YOUR_FOLDER_ID \
  --role serverless.containers.invoker \
  --subject serviceAccount:aje8smeevvt1djo39tfs

yc resource-manager folder add-access-binding YOUR_FOLDER_ID \
  --role serverless.containers.editor \
  --subject serviceAccount:aje8smeevvt1djo39tfs

yc resource-manager folder add-access-binding YOUR_FOLDER_ID \
  --role container-registry.images.puller \
  --subject serviceAccount:aje8smeevvt1djo39tfs
```

### 📋 После исправления:

1. **Обновите секрет** `YC_SA_JSON` в GitHub (если создали новый сервисный аккаунт)
2. **Проверьте права** - убедитесь, что все роли назначены
3. **Повторите деплой** - GitHub Actions должен пройти успешно

### 🎯 Необходимые роли:

- `serverless.containers.invoker` - для запуска контейнера
- `serverless.containers.editor` - для создания/обновления ревизий
- `container-registry.images.puller` - для загрузки образов из registry
