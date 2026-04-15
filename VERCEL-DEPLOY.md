# Деплой GERS NextCRM на Vercel

Сборка в CI такая же, как локально: **pnpm** + скрипт `build` (`prisma generate`, `prisma migrate deploy`, `next build`). Переменные окружения задаёшь в **Vercel → Project → Settings → Environment Variables** (Production / Preview по желанию).

## 1. Подключение проекта

Репозиторий с форком: **https://github.com/xiccca21-max/gers-nextcrm** (приватный).

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project** → импорт **`xiccca21-max/gers-nextcrm`** (или подключи этот репозиторий к уже существующему проекту в **Settings → Git**).
2. **Framework Preset:** Next.js (определится сам).
3. **Root Directory:** корень репозитория (если монорепо — укажи подпапку с `package.json`).
4. **Build Command** / **Install Command** уже заданы в [`vercel.json`](./vercel.json) (`pnpm install --frozen-lockfile`, `pnpm run build`). В **`package.json` → engines** указано `^22.12.0`, в `vercel.json` задан **`NODE_VERSION=22.x`**, чтобы Vercel не поднимал **Node 24** (у `canvas` часто нет пребилдов под новый ABI и падает `pnpm install`).

**Без `DATABASE_URL` сборка не пройдёт:** `prisma generate` читает URL из [`prisma.config.ts`](./prisma.config.ts). Добавь `DATABASE_URL` в **Settings → Environment Variables** для **Production** и **Preview** и отметь **Expose to Build**, затем **Redeploy**.

## 2. Обязательные переменные (минимум для входа и CRM)

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Строка подключения **внешнего** PostgreSQL (Neon, Supabase, Railway и т.д.), не URL приложения. |
| `BETTER_AUTH_SECRET` | Случайная строка (например `openssl rand -base64 32`). |
| `BETTER_AUTH_URL` | Точный публичный URL CRM, **как в браузере**, без `/` в конце: `https://<project>.vercel.app` или кастомный домен. |
| `NEXT_PUBLIC_APP_URL` | То же, что `BETTER_AUTH_URL`. |
| `RESEND_API_KEY` | Ключ Resend для OTP по почте. |
| `EMAIL_FROM` | Адрес отправителя в формате `user@verified-domain.com` (домен верифицирован в Resend). |
| `NEXTCRM_TOKEN` | Секрет для `Authorization: Bearer …` на вебхуки (`/api/integrations/gers-inquiry` и совместимый эндпоинт лидов). |

Дополнительно для форка GERS (рекомендуется в проде):

| Переменная | Значение |
|------------|----------|
| `NEXT_PUBLIC_GERS_SLIM_UI` | `1` (или не задавать — в `.env.example` slim по умолчанию). |
| `NEXT_PUBLIC_APP_NAME` | Например `GERS CRM`. |
| `GERS_WEBHOOK_ALLOWED_ORIGINS` | Если заявки с сайта идут **из браузера** с другого домена — origins через запятую. Серверный `fetch` с сайта CORS не требует. |

**Google OAuth:** при использовании входа через Google добавь `GOOGLE_ID`, `GOOGLE_SECRET` и в Google Cloud Console укажи redirect URI для Better Auth на твой `BETTER_AUTH_URL` (см. доку Better Auth / консоль ошибок при логине).

## 3. Первый запуск БД: миграции и сид

- **Миграции** выполняются на каждой сборке: `pnpm run build` → `prisma migrate deploy` (нужен `DATABASE_URL` в окружении **build** на Vercel — включи для Production и при необходимости Preview).
- **Сид** (`prisma/seed`) на Vercel **не** запускается автоматически. Один раз с машины, где есть `pnpm` и доступ к той же БД:

  ```bash
  # Windows PowerShell — подставь строку или: vercel env pull .env.local
  $env:DATABASE_URL = "postgresql://..."
  # Почта первого админа в сиде — см. prisma/seeds/seed.ts (переменная TEST_USER_EMAIL, иначе test@nextcrm.app)
  $env:TEST_USER_EMAIL = "you@yourdomain.com"
  pnpm prisma db seed
  ```

  Сид заполняет справочники CRM и **upsert**-ит пользователя с `TEST_USER_EMAIL` (роль admin, статус ACTIVE). Задай свою почту до запуска сида, затем войди через OTP на этот адрес.

## 4. Хранилище файлов (MinIO / S3)

В `.env.example` указаны `MINIO_*` и `NEXT_PUBLIC_MINIO_ENDPOINT`. Для Vercel нужен **реальный** объектный стор (MinIO в облаке, AWS S3, Cloudflare R2 и т.д.). Без валидных ключей часть функций (вложения, документы) может падать — для «только лиды + вход» часть экранов может не трогать файлы.

## 5. Inngest и фоновые задачи

Приложение подключает Inngest (`INNGEST_ID`, `INNGEST_APP_NAME`, при необходимости `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`). Для полноценных кампаний/очередей на Vercel настрой [Inngest](https://www.inngest.com/) и укажи URL приложения как endpoint синхронизации (см. их доку для Next.js). В **slim**-режиме GERS часть сценариев скрыта в UI, но код маршрута `/api/inngest` может оставаться — при отсутствии ключей проверь логи первого деплоя; при ошибках задай минимальные значения по доке Inngest или отключи неиспользуемые интеграции отдельной задачей.

## 6. Проверка после деплоя

1. Открой `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`.
2. Войди (OTP или Google).
3. Проверка вебхука (сервером или `curl`):

   `POST https://<твой-домен>/api/integrations/gers-inquiry` с заголовками `Content-Type: application/json` и `Authorization: Bearer <NEXTCRM_TOKEN>`.

## 7. Отличие от Docker

В Docker используется `APP_PUBLIC_URL` в compose; на «чистом» Next/Vercel ориентируйся на **`BETTER_AUTH_URL`** и **`NEXT_PUBLIC_APP_URL`** (как в `.env.example`). `output: "standalone"` в `next.config.js` для Vercel обычно не мешает — билд идёт через стандартный Next build на платформе Vercel.
