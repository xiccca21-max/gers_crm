# Деплой GERS CRM (Docker)

Цель: один `docker compose up`, миграции, сид, вход по **email и паролю** (регистрация + логин), заявки с сайта в лиды.

**Деплой на Vercel** (env в панели Vercel, без Docker): **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)**.

## 1. Сервер

- Docker + Docker Compose v2
- Открытый порт **3000** (или прокси типа Caddy/Nginx на 443 → 3000)
- DNS: например `crm.gers.agency` → IP сервера

## 2. Конфиг

```bash
cp .env.gers.example .env
# отредактируйте .env: APP_PUBLIC_URL, ADMIN_EMAIL, POSTGRES_PASSWORD, SMTP (EMAIL_*), NEXTCRM_TOKEN; при необходимости RESEND_API_KEY
```

**Важно:** `APP_PUBLIC_URL` должен совпадать с тем, как пользователи открывают CRM в браузере (схема + хост, без `/` в конце). Иначе Better Auth и magic-link не сработают.

Сгенерировать токен для вебхука:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Запишите значение в `NEXTCRM_TOKEN` — его же передаёте с сайта в заголовке `Authorization: Bearer <токен>`.

## 3. Запуск

```bash
docker compose build
docker compose up -d
docker compose logs -f app
```

Первый старт: entrypoint выполнит `prisma migrate deploy`, создаст бакет MinIO, при пустой БД — **seed** (справочники CRM + пользователь `ADMIN_EMAIL` со статусом ACTIVE и ролью admin).

## 4. Вход и регистрация

1. Откройте `APP_PUBLIC_URL`.
2. **Регистрация:** `/register` — имя, **логин** (латиница, цифры, `_`), пароль (не короче 8 символов). Почта не спрашивается; в БД сохраняется служебный адрес вида `{логин}@users.invalid` (валидный для Better Auth / Zod `z.email()`). Новые пользователи по умолчанию **PENDING**, пока админ не активирует.
3. **Вход:** `/sign-in` — логин и пароль.

Уведомление админам о новой регистрации: `newUserNotify` → `lib/sendmail.ts` (**SMTP**: `EMAIL_HOST`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, плюс `EMAIL_FROM`). Пакет **resend** / `RESEND_API_KEY` в проекте — из апстрим-NextCRM (кампании, `lib/resend.ts`, Inngest), не эта ветка отправки для `newUserNotify`.

## 5. Заявки с сайта GERS

**Endpoint:** `POST {APP_PUBLIC_URL}/api/integrations/gers-inquiry`

**Заголовки:**

- `Content-Type: application/json`
- `Authorization: Bearer <NEXTCRM_TOKEN>`

**Тело JSON (пример):**

```json
{
  "name": "Иван Петров",
  "email": "client@mail.com",
  "telegram": "@username",
  "projectType": "Веб-приложение",
  "budget": "100000 - 300000 ₽",
  "message": "Нужен личный кабинет и оплата.",
  "source": "contact-form"
}
```

Нужен **хотя бы** `email` или `telegram`. В CRM появится **лид** с источником «GERS Website», статус «New», тип «Demo» (если есть в сиде).

Если форма на **другом домене** и запрос идёт из браузера (fetch), добавьте origin в `GERS_WEBHOOK_ALLOWED_ORIGINS` в `.env`.

Серверный прокси с сайта (рекомендуется): Next/Node на gers.agency делает `fetch` на CRM с секретом — CORS не нужен.

Проверка с сервера (`NEXTCRM_TOKEN` подставьте свой):

```bash
curl -sS -X POST "$APP_PUBLIC_URL/api/integrations/gers-inquiry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEXTCRM_TOKEN" \
  -d '{"name":"Тест Клиент","email":"test@example.com","telegram":"@test","projectType":"Сайт","message":"curl"}'
```

Ожидается JSON с `"ok":true` и `id` лида.

## 6. Slim-режим

По умолчанию включён (`NEXT_PUBLIC_GERS_SLIM_UI=1` в compose). Полный NextCRM: `NEXT_PUBLIC_GERS_SLIM_UI=0` в `.env` и перезапуск.

## 7. Обновление

```bash
git pull
docker compose build --no-cache app
docker compose up -d
```

---

Проблемы с Inngest/MinIO: стек из `docker-compose.yml` совпадает с апстримом NextCRM; для минимального прод без фоновых задач можно позже вынести отдельный compose — не делалось в этом форке.
