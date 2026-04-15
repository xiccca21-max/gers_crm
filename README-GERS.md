# GERS fork (NextCRM)

Внутренняя CRM на базе [NextCRM](https://github.com/pdovhomilja/nextcrm-app). Отличия от апстрима заданы флагом **`NEXT_PUBLIC_GERS_SLIM_UI`** (по умолчанию включён в `.env.example`).

## Быстрый старт «на веб» (Docker)

Полная пошаговая инструкция: **[DEPLOY-GERS.md](./DEPLOY-GERS.md)**.

**Vercel:** переменные в UI проекта, импорт репозитория — см. **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)** (в репозитории есть [`vercel.json`](./vercel.json) и [`.nvmrc`](./.nvmrc) под pnpm и Node 22).

Кратко:

1. Скопируйте **[`.env.gers.example`](./.env.gers.example)** → `.env`, заполните `APP_PUBLIC_URL`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `NEXTCRM_TOKEN`, пароль Postgres.
2. `docker compose up -d --build`
3. Откройте `APP_PUBLIC_URL`, войдите (email OTP через Resend или Google OAuth).

## Заявки с сайта

`POST /api/integrations/gers-inquiry` с заголовком `Authorization: Bearer <NEXTCRM_TOKEN>` — см. пример тела в **DEPLOY-GERS.md**. Легаси-эндпоинт `POST /api/crm/leads/create-lead-from-web` тоже принимает тот же Bearer-токен.

## Что сделано в форке

- **`lib/gers.ts`** — `isGersSlimUi()`: при slim скрываются кампании, проекты, полнотекстовый поиск в шапке, пункт «LLM Keys» в админке, вкладки профиля Developer / LLM, массовое и одиночное AI-enrichment контактов, MCP отвечает 404.
- **Локаль `ru`**, дефолт маршрутизации **`ru`**, часовой пояс для `ru`: `Europe/Moscow`. Новые пользователи: `userLanguage` по умолчанию **`ru`** (`lib/auth.ts`).
- **Миграция** `prisma/migrations/20260415130000_add_language_ru` — значение enum `Language.ru`.
- **`locales/ru.json`** — копия `en` с русским блоком меню и брендом; остальной текст постепенно переводить.
- **Админ** `/admin` ведёт на `/admin/users` при slim (вместо LLM Keys).
- **`docker-compose.yml`** — `APP_PUBLIC_URL`, `NEXTCRM_TOKEN`, брендинг GERS по умолчанию.

Подробный аудит: **`GERS-NEXTCRM-AUDIT.md`**.

## Локальная разработка (без Docker)

Требования: Node **22+**, **pnpm**, PostgreSQL. Скопируйте `.env.example` → `.env.local`, задайте `DATABASE_URL`, `pnpm install`, `pnpm prisma migrate deploy`, `pnpm dev`.

## Отключить slim

В `.env`: `NEXT_PUBLIC_GERS_SLIM_UI=0` — вернётся полное меню NextCRM и MCP.
