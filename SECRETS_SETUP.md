# Настройка секретов для GitHub Actions

## Проблема

GitHub Actions падает с ошибкой "Password required" при попытке аутентификации в Yandex Container Registry.

## Решение

Нужно добавить правильные секреты в GitHub. Для аутентификации в Container Registry нужен только приватный ключ, а не весь JSON файл.

## Необходимые секреты в GitHub

### 1. YC_SA_PRIVATE_KEY

**Содержимое:** Только приватный ключ из `sa.json`

```bash
# Извлечь приватный ключ из sa.json
cat sa.json | jq -r '.private_key'
```

**Пример содержимого:**

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCY/vj16IBdkIbP
uhS+BD0ihsliiG0b3YbTow4cfJylYHjVZlCN0a5pgVXa7nQAt2leIUSE8a9azulp
VeBBnPoXtJ4Ss6dbpFYHOsCLv1yv/IjujT6o42gc8HV7plzIgIXGWYl+BjZGrXrg
0e2wM4tqNdaTE0FhDfyG9Kd9d9qBZ3N9fpMrvnOQx1rXVRt6JYoED8A6DwEzcQv+
guFoFK9YoXYlRChZ1KLse1XI46u5RxVXIsoV79LKG7ovjA0nzyrB3c/p36acDsiv
5w0q0qx7B+6zJ2ssY0rpvVuuEvT5xTBNPt5VtHhfUZmUX+YGeiQmwOCsKxgKMgV4
oZSlZ8JTAgMBAAECggEAFFZEMq/irE1DVkZ2bmGy3K2NBG99DWivfN9eR1QbIHKH
7Vnp2Egohna+OllbCyNWOsByUrerpwb9CNb09dPPfKoyHutJkklwdAqPwKPBxtTr
QMZ+r0V3N+2QuEx/ZdmLrreFKr7ZpSB3Rn4xOaxIWmhoquky1htdV3Ua9HcjkPLC
I8vAP/KkmrK9NFSW/eB/lf3NaX5yGyahL0ZEPBlTT+7ECyCzkbJNBgEE7SpI/5IT
bGKnsROBJ2a4MJWbGuawR+5XSDJMGNQCYj8yzmEuIzXyc8rWXo/+M13DQC88+ROe
340afyqfsxr6kuTIIHSISu0Ls6VHvaLuR54y5Po2oQKBgQDWUSQi+So9L8Kr8ke7
/4gXuRhqJ8iFKjvwcNKZqpgaVvynlEFVEzHSd3yJXV0QJp1Cm/fqq3NnrOh4+neT
luL2HUqcFf6j8+XVnVTlXJ6KgT4Iso9cM1nDUxnTnA7Au+1sJncxDEr9xjjRDlOB
qdFSwyhbTX/zV6OBBXuMZy+NMwKBgQC2wKe5KIRqaY9Fwz/KZws//4yT/p624SWU
7BvR1L6HIOEYCSK371FoSa2t5ZOA6LCkGJHp/QBExHx7qal5J4yIYEM8VXxLXrSW
cF66R6iApbnsEEcfm8TJehsK8ceiTJtVn7/9rh2mr4cylUKYQF7NBsEKh2JMNcMb
XMk+f/u2YQKBgFvEdrK6+gklEDhMD8dCDWYLDZc23beXc/7qcGL4FxUANkMTSj5B
b83s99hhr92giyngWvGS5GF6OjjDFryNmTVFKZNYH6bYYotrSNTFKeWonYVf397c
5gyq4p4nbnG8hlcOyW6pEttDK0To23zj2AuWIQunTahG2G4AiPx/mm7dAoGBAK3n
jrNnlvocETZ1ohJdFBuGdqOuPCITBcw9EgwOwm+cHhbdOqiFl5YB5sAAIukchFri
9pcPJl5KC5sxzA96TwTHdbPINUsTiA1QSRRCdFpXWiEFLGkrtYt0Ip+7jBkphPdp
2Szxr02a4rCD0KdJOe0obDI0upmC33L+TJKo/0KBAoGAWQrkvgiTq9szWEJ74xdp
MZZDRWUXMBM/ea5j2h6hXqT0cbJBBylLK9vkeAftk3pGdSNrsVZCekM8rDKxlXO3
aiNqEw04CMDtzwC7OfH3dygrLCLo79sUvVnte/dhgnh/VuQ9damLbPbSSgkbs4w7
AQ33HsqRcuiwQ9o8jTrCvCE=
-----END PRIVATE KEY-----
```

### 2. YC_SA_JSON

**Содержимое:** Весь JSON файл `sa.json` (для Yandex CLI)

### 3. Остальные секреты (уже должны быть настроены):

- `YC_REGISTRY_ID` - ID Container Registry
- `YC_FOLDER_ID` - ID папки в Yandex Cloud
- `YC_CLOUD_ID` - ID облака
- `YC_CONTAINER_NAME` - имя контейнера
- `YC_SERVICE_ACCOUNT_ID` - ID сервисного аккаунта
- `WEBHOOK_SECRET` - секрет для webhook
- Переменные окружения приложения

## Как добавить секреты в GitHub:

1. Перейдите в репозиторий: `Settings` → `Secrets and variables` → `Actions`
2. Нажмите `New repository secret`
3. Добавьте каждый секрет с правильным именем и содержимым

## Проверка:

После добавления секретов сделайте push в `main` и проверьте GitHub Actions.
