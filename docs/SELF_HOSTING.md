# Запуск на VPS с HTTPS и PostgreSQL

Этот вариант позволяет выбрать провайдера и регион размещения, в том числе в России. Он не гарантирует доступность из России: её проверяют с реальных российских подключений после публикации. Публикация в этой сессии не выполнялась.

## Первый запуск

Нужны VPS с Docker Compose v2, домен с A-записью на VPS, открытые 80/443 и оплаченный срок как минимум до 28 ноября. PostgreSQL и API не публикуют порты наружу. Caddy автоматически выпускает TLS-сертификат.

1. Загрузите исходный код на VPS. Создайте `.env` (не коммитьте):

```dotenv
DOMAIN=deanery.example.ru
DB_PASSWORD=REPLACE_WITH_RANDOM_HEX
SESSION_SECRET=REPLACE_WITH_ANOTHER_RANDOM_HEX
AI_PROVIDER=gemini
AI_API_KEY=
AI_MODEL=gemini-3.5-flash-lite
```

Получите ДВА независимых значения командой `openssl rand -hex 32`. Для `DB_PASSWORD` используйте hex, чтобы пароль корректно входил в URL PostgreSQL. Пустой ключ ИИ допустим: основные сценарии доступны, ассистент сообщает о недоступности провайдера. Рабочую модель и доступность выбранного провайдера проверяют отдельно; секрет остаётся на сервере.

2. Запустите:

```bash
docker compose up -d --build
docker compose ps
curl --fail https://deanery.example.ru/healthz
```

При создании **нового** volume PostgreSQL выполняет все три миграции автоматически. `/healthz` проверяет наличие таблиц, не раскрывая данные и параметры подключения.

3. Пройдите сценарий из `JURY_GUIDE.md` в двух приватных окнах. Проверьте HTTPS, cookie Secure/HttpOnly/SameSite, реальную перезагрузку, доступ с телефона и из России без VPN. Настройте внешний мониторинг `/healthz` и сохраните скриншот успешного входа с публичного домена.

## Обновление существующей базы

До миграций создайте резервную копию; SQL выполняйте только в базе этого вымышленного прототипа:

```bash
docker compose exec -T db pg_dump -U deanery -d deanery > deanery-backup.sql
docker compose exec -T db psql -U deanery -d deanery -v ON_ERROR_STOP=1 < migrations/003_auth_attempts.sql
docker compose up -d --build
```

При переходе с более старой версии выполните также 001/002, если их ещё нет. Изменение файлов миграций не запускает их заново в существующем volume. Не используйте `docker compose down -v`: это удалит данные.

## Восстановление

Храните резервные копии отдельно от VPS. При ошибке сначала проверьте `docker compose ps`, `/healthz` и логи `docker compose logs --tail=100 app`. Не публикуйте логи с секретами. Простой перезапуск `docker compose restart app` сохраняет данные в volume БД. При потере базы восстановите резервную копию в отдельную базу, проверьте её и только затем переключайте приложение.

Vercel также поддерживается: добавьте migration 003 к 001/002 в своей PostgreSQL и задайте DATABASE_URL, SESSION_SECRET (случайная строка минимум 32 символа), ALLOWED_ORIGIN. Заголовки для Vercel — в vercel.json; для VPS — в server/app.ts.
