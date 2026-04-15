# Деплой GERS NextCRM на Vercel

### Если в логах Vercel: `Can't reach database server` / `P1001` при регистрации

Это **не** Better Auth и **не** секрет сессии: сервер **не достучался до Postgres** по текущему `DATABASE_URL`.

1. **Supabase на паузе** (Free) — в [Supabase Dashboard](https://supabase.com/dashboard) открой проект → **Restore** / снимай паузу.
2. **Прямой хост `db.<ref>.supabase.co:5432`** с **Vercel** часто даёт `P1001` (IPv6 / маршрутизация). Возьми строку из **Project Settings → Database → Connection string** в режиме **Session pooler** или **Transaction pooler** (порт **6543**, хост `*.pooler.supabase.com`) и подставь её в **`DATABASE_URL`** в Vercel для **Production** и **Preview**. См. [Connection pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler).
3. После смены переменных — **Redeploy**. Миграции по-прежнему гоняй с машины или CI с доступом к БД (см. ниже).

Локально полный `pnpm run build` включает **`prisma migrate deploy`**; на **Vercel** в [`vercel.json`](./vercel.json) используется **`pnpm run vercel-build`** (`prisma generate` + `next build` **без** миграций на билде). Переменные окружения задаёшь в **Vercel → Project → Settings → Environment Variables** (Production / Preview по желанию).

## 1. Подключение проекта

Репозиторий с форком: **https://github.com/xiccca21-max/gers-nextcrm** (приватный).

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project** → импорт **`xiccca21-max/gers-nextcrm`** (или подключи этот репозиторий к уже существующему проекту в **Settings → Git**).
2. **Framework Preset:** Next.js (определится сам).
3. **Root Directory:** корень репозитория (если монорепо — укажи подпапку с `package.json`).
4. **Build Command** / **Install Command** заданы в [`vercel.json`](./vercel.json): `pnpm install --frozen-lockfile` и **`pnpm run vercel-build`** (`prisma generate` + `next build` **без** `migrate deploy` на билде). В **`package.json` → engines** указано `^22.12.0`, в `vercel.json` задан **`NODE_VERSION=22.x`**, чтобы Vercel не поднимал **Node 24** (у `canvas` часто нет пребилдов под новый ABI).

**`DATABASE_URL` на этапе build** всё равно нужен для `prisma generate` ([`prisma.config.ts`](./prisma.config.ts)). В Vercel: **Settings → Environment Variables** → **Expose to Build** для Production/Preview, затем **Redeploy**.

В [`vercel.json`](./vercel.json) в **`build.env`** заданы **заглушки** (как в `Dockerfile` для `next build`), чтобы сборка не падала на Better Auth / Inngest / MinIO при первом деплое. Для **продакшена** обязательно задай в панели Vercel реальные **`BETTER_AUTH_SECRET`**, **`BETTER_AUTH_URL`**, **`NEXT_PUBLIC_APP_URL`**, почту (**`RESEND_API_KEY`**, **`EMAIL_FROM`**), при необходимости **Google OAuth** и **Inngest** — значения из UI **перекрывают** заглушки в рантайме и (при включённом Expose to Build) на этапе сборки.

**Почему нет `prisma migrate deploy` на Vercel:** билд-серверы часто не достучатся до Supabase по **прямому** хосту `db.*.supabase.co:5432` (ошибка `P1001`). Миграции один раз выполни с машины, где есть доступ к БД:

```bash
# PowerShell: подставь строку из Vercel или vercel env pull
$env:DATABASE_URL = "postgresql://..."
pnpm prisma migrate deploy
```

Либо в Supabase используй **Transaction pooler** (порт **6543**) в `DATABASE_URL` для рантайма и отдельно прогоняй миграции с хоста с доступом к **direct** (5432), если настроишь оба URL у себя.

## 2. Обязательные переменные (минимум для входа и CRM)

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Строка подключения **внешнего** PostgreSQL (Neon, Supabase, Railway и т.д.), не URL приложения. |
| `BETTER_AUTH_SECRET` | Случайная строка (например `openssl rand -base64 32`). |
| `BETTER_AUTH_URL` | Точный публичный URL CRM, **как в браузере**, без `/` в конце: `https://<project>.vercel.app` или кастомный домен. |
| `NEXT_PUBLIC_APP_URL` | То же, что `BETTER_AUTH_URL`. |
| `RESEND_API_KEY` | Ключ Resend для **писем админам** о новых пользователях (регистрация). |
| `EMAIL_FROM` | Адрес отправителя в формате `user@verified-domain.com` (домен верифицирован в Resend). |
| `NEXTCRM_TOKEN` | Секрет для `Authorization: Bearer …` на вебхуки (`/api/integrations/gers-inquiry` и совместимый эндпоинт лидов). |
| `BETTER_AUTH_ALLOWED_HOSTS` | Опционально: дополнительные host через запятую (кастомный домен CRM), если не покрывается `BETTER_AUTH_URL` и `*.vercel.app`. |

Дополнительно для форка GERS (рекомендуется в проде):

| Переменная | Значение |
|------------|----------|
| `NEXT_PUBLIC_GERS_SLIM_UI` | `1` (или не задавать — в `.env.example` slim по умолчанию). |
| `NEXT_PUBLIC_APP_NAME` | Например `GERS CRM`. |
| `GERS_WEBHOOK_ALLOWED_ORIGINS` | Если заявки с сайта идут **из браузера** с другого домена — origins через запятую. Серверный `fetch` с сайта CORS не требует. |

## 3. Первый запуск БД: миграции и сид

- **Миграции** на Vercel **не** вшиты в `vercel-build` (см. выше). После первого деплоя выполни **`pnpm prisma migrate deploy`** локально с продовым `DATABASE_URL` или через CI. Для Docker по-прежнему используй **`pnpm run build`** / entrypoint с миграциями.
- **Сид** (`prisma/seed`) на Vercel **не** запускается автоматически. Один раз с машины, где есть `pnpm` и доступ к той же БД:

  ```bash
  # Windows PowerShell — подставь строку или: vercel env pull .env.local
  $env:DATABASE_URL = "postgresql://..."
  # Первый админ в сиде — см. prisma/seeds/seed.ts
  $env:TEST_USER_EMAIL = "you@yourdomain.com"   # служебный email в БД (не поле входа)
  $env:TEST_USER_USERNAME = "admin"               # логин для входа (по умолчанию testuser)
  $env:TEST_USER_PASSWORD = "YourStrongPasswordHere"
  pnpm prisma db seed
  ```

  Сид заполняет справочники CRM и **upsert**-ит пользователя (роль admin, статус ACTIVE). Вход на сайте — **логин + пароль** (`TEST_USER_USERNAME` / `TEST_USER_PASSWORD`), не по почте.

## 4. Хранилище файлов (MinIO / S3)

В `.env.example` указаны `MINIO_*` и `NEXT_PUBLIC_MINIO_ENDPOINT`. Для Vercel нужен **реальный** объектный стор (MinIO в облаке, AWS S3, Cloudflare R2 и т.д.). Без валидных ключей часть функций (вложения, документы) может падать — для «только лиды + вход» часть экранов может не трогать файлы.

## 5. Inngest и фоновые задачи

Приложение подключает Inngest (`INNGEST_ID`, `INNGEST_APP_NAME`, при необходимости `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`). Для полноценных кампаний/очередей на Vercel настрой [Inngest](https://www.inngest.com/) и укажи URL приложения как endpoint синхронизации (см. их доку для Next.js). В **slim**-режиме GERS часть сценариев скрыта в UI, но код маршрута `/api/inngest` может оставаться — при отсутствии ключей проверь логи первого деплоя; при ошибках задай минимальные значения по доке Inngest или отключи неиспользуемые интеграции отдельной задачей.

## 6. Проверка после деплоя

1. Открой `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`.
2. Войди по **логину и паролю** (после сида — `TEST_USER_USERNAME` / `TEST_USER_PASSWORD`) или зарегистрируйся на `/register`.
3. Проверка вебхука (сервером или `curl`):

   `POST https://<твой-домен>/api/integrations/gers-inquiry` с заголовками `Content-Type: application/json` и `Authorization: Bearer <NEXTCRM_TOKEN>`.

## 7. Отличие от Docker

В Docker используется `APP_PUBLIC_URL` в compose; на «чистом» Next/Vercel ориентируйся на **`BETTER_AUTH_URL`** и **`NEXT_PUBLIC_APP_URL`** (как в `.env.example`). `output: "standalone"` в `next.config.js` для Vercel обычно не мешает — билд идёт через стандартный Next build на платформе Vercel.
