# ЖК «Шарора» — сайт и выбор квартир

Сайт жилого комплекса «Шарора» (Sharora Sokhtmon): статическая главная страница, интерактивный выбор квартир и админ-панель для менеджеров.

| Часть | Стек | Где |
|---|---|---|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · next-intl · TanStack Query · react-zoom-pan-pinch · lucide-react | `frontend/` |
| Backend | FastAPI · SQLAlchemy 2 · Pydantic v2 · Alembic · PostgreSQL (SQLite для разработки) | `backend/` |

**Главная страница не обращается к API**: она собирается статически (SSG) из `frontend/src/content/site.ts`. Backend нужен только странице `/apartments` и админке `/admin`.

---

## Быстрый старт (локально)

Требуется Python 3.12+ и Node.js 20+.

```bash
# 1. Backend → http://localhost:8000 (документация API: /docs)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env                 # заполните JWT_SECRET (openssl rand -hex 32) и DEFAULT_ADMIN_PASSWORD
.venv/bin/alembic upgrade head       # создать таблицы
.venv/bin/python seed.py             # 12 блоков × 11 этажей, 888 помещений
.venv/bin/uvicorn app.main:app --reload --port 8000

# 2. Frontend → http://localhost:3000 (в другом терминале)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

- Сайт: <http://localhost:3000> (RU) и <http://localhost:3000/tg> (TJ)
- Выбор квартиры: <http://localhost:3000/apartments?block=А&floor=2>
- Админка: <http://localhost:3000/admin/login> — логин/пароль из `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` в `backend/.env` (пользователь создаётся при первом запуске API или `seed.py`).

Браузер обращается к API через тот же домен: Next.js проксирует `/api/*` и `/media/*` на `BACKEND_URL` (см. `next.config.ts`). Поэтому JWT-cookie админки остаётся first-party, а CORS в продакшене не нужен.

> `python seed.py` **очищает** блоки, этажи, квартиры и заявки и заполняет их заново. Для Docker используется `seed.py --if-empty`, который ничего не трогает, если данные уже есть.

### Docker Compose (PostgreSQL + backend + frontend)

```bash
cp .env.example .env     # обязательно задайте POSTGRES_PASSWORD, JWT_SECRET и ADMIN_PASSWORD
docker compose up --build
```

Backend при старте выполняет `alembic upgrade head` и `seed.py --if-empty`. Загруженные изображения хранятся в томе `media`, база — в томе `pgdata`.

---

## Переменные окружения

| Переменная | Где | Назначение |
|---|---|---|
| `DATABASE_URL` | backend | `sqlite:///./sharora.db` или `postgresql+psycopg://user:pass@host:5432/sharora` |
| `JWT_SECRET` | backend | **Обязательно.** Секрет подписи токена админки (≥ 32 символа, `openssl rand -hex 32`) |
| `CORS_ORIGINS` | backend | Разрешённые origin через запятую (нужно только при прямых запросах к API) |
| `COOKIE_SECURE` | backend | `true` за HTTPS |
| `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` | backend | Первый менеджер; пароль **обязателен** (≥ 8 символов) |
| `MEDIA_DIR`, `MEDIA_URL`, `MAX_UPLOAD_MB` | backend | Хранение загрузок (локально / Docker) |
| `BLOB_READ_WRITE_TOKEN` | backend | Если задан — загрузки идут в Vercel Blob, в БД сохраняется URL файла |
| `VERCEL` | backend | Ставит сам Vercel: без бутстрапа при старте, `NullPool`, только Blob |
| `BACKEND_URL` | frontend (build) | Куда проксировать `/api` и `/media` |
| `NEXT_PUBLIC_API_URL` | frontend | Пусто = через прокси; иначе прямой URL API |
| `NEXT_PUBLIC_SITE_URL` | frontend | Канонический URL для metadata, OG и `sitemap.xml` |
| `POSTGRES_PASSWORD`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SITE_URL` | корневой `.env` (Docker Compose) | Пароль БД, первый менеджер, URL сайта |

Шаблоны: `.env.example` (Compose), `backend/.env.example`, `frontend/.env.example`. Без `JWT_SECRET` backend не запустится, а без `DEFAULT_ADMIN_PASSWORD` не создаст первого менеджера — встроенных значений по умолчанию нет. Файлы `.env*` (кроме `*.example`) в git не попадают.

## Деплой на Vercel (один проект, два сервиса)

`vercel.json` описывает [Vercel Services](https://vercel.com/docs/services): `frontend` (Next.js) и `backend` (FastAPI, `app.main:app`) на одном домене. `/api/*` и `/media/*` уходят в backend (путь не меняется, FastAPI видит `/api/...`), всё остальное — во frontend. Браузер ходит на относительные `/api`, поэтому JWT-cookie админки first-party; Rewrites из `next.config.ts` на Vercel отключены; binding передаёт frontend внутренний адрес backend в `BACKEND_URL` — на случай будущих серверных запросов (сейчас их нет).

На Vercel (`VERCEL=1`) backend при старте **не** создаёт таблицы, админа и данные, держит соединения через `NullPool` (пулинг делает Neon) и сохраняет загрузки только в Blob. Заглушки планов из `backend/media/` входят в бандл и отдаются по `/media/...`.

### Переменные окружения в Vercel

Переменные проекта общие для обоих сервисов.

| Переменная | Сервис | Пример | Откуда |
|---|---|---|---|
| `DATABASE_URL` | backend | `postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require` | добавит интеграция Neon (pooled) |
| `JWT_SECRET` | backend | вывод `openssl rand -hex 32` | вручную, Sensitive |
| `COOKIE_SECURE` | backend | `true` | вручную |
| `BLOB_READ_WRITE_TOKEN` | backend | `vercel_blob_rw_…` | добавит Blob store |
| `MAX_UPLOAD_MB` | backend | `4` | вручную (лимит тела запроса Vercel — 4,5 МБ) |
| `CORS_ORIGINS` | backend | `https://sharora.tj` | вручную; при одном домене не обязателен |
| `NEXT_PUBLIC_SITE_URL` | frontend | `https://sharora.tj` (или `https://<project>.vercel.app`) | вручную |
| `NEXT_PUBLIC_API_URL` | frontend | — | **не задавать**: пусто = относительные `/api` |

`DEFAULT_ADMIN_*`, `BACKEND_URL`, `MEDIA_DIR` в Vercel не нужны.

### Шаги

1. **Проект.** vercel.com → Add New → Project → импортируйте репозиторий `sharora`. Root Directory — корень репозитория, Framework Preset — **Services** (CLI: `vercel project update --framework services`).
2. **Postgres.** Project → Storage → Create Database → **Neon** → подключите к Production (и Preview, лучше отдельную базу). Интеграция добавит `DATABASE_URL` (pooled) и `DATABASE_URL_UNPOOLED` (прямое соединение — для миграций).
3. **Blob.** Project → Storage → Create → **Blob** → Public → подключите к проекту. Появится `BLOB_READ_WRITE_TOKEN`.
4. **Остальные переменные** из таблицы: Project → Settings → Environment Variables.
5. **Миграции и сид — один раз со своего компьютера.** Скопируйте `DATABASE_URL_UNPOOLED` (Storage → база → `.env.local`, или `vercel env pull`):

   ```bash
   cd backend
   export DATABASE_URL='postgresql://…(DATABASE_URL_UNPOOLED)…'
   export DEFAULT_ADMIN_USERNAME=admin
   export DEFAULT_ADMIN_PASSWORD='надёжный-пароль'
   .venv/bin/alembic upgrade head
   .venv/bin/python seed.py --if-empty      # блоки, квартиры, настройки и первый менеджер
   unset DATABASE_URL DEFAULT_ADMIN_PASSWORD
   ```

   Переменные окружения важнее `backend/.env`, поэтому локальная SQLite не затрагивается. **Не запускайте `seed.py` без `--if-empty`** на продакшене — он очищает квартиры и заявки. После новых миграций повторяйте только `alembic upgrade head`.
6. **Деплой.** Каждый push в `main` деплоит Production, остальные ветки — Preview. Повторный деплой: Deployments → … → Redeploy (нужен после изменения переменных).
7. **Проверка.** `https://<домен>/api/health` → `{"status":"ok"}`, затем `/admin/login`. Свой домен: Project → Settings → Domains, затем обновите `NEXT_PUBLIC_SITE_URL` и Redeploy.

Ограничения: rate-limit заявок (`5/minute`) хранится в памяти инстанса и на serverless работает приблизительно.

## Вход в админку

1. Задайте `DEFAULT_ADMIN_USERNAME` и `DEFAULT_ADMIN_PASSWORD` в `backend/.env` (в Docker — `ADMIN_USERNAME` / `ADMIN_PASSWORD` в корневом `.env`).
2. Примените миграции и запустите API (или `seed.py`) — пользователь создаётся, только если его ещё нет. Смена пароля в `.env` **не меняет** пароль уже созданного пользователя: для этого удалите его из таблицы `admin_users` и перезапустите API.
3. Откройте <http://localhost:3000/admin/login> (ссылка мелким текстом в футере). Сессия — httpOnly JWT-cookie на `ACCESS_TOKEN_EXPIRE_MINUTES` минут; за HTTPS включите `COOKIE_SECURE=true`.

---

## Проверки качества

```bash
# backend
cd backend
.venv/bin/ruff check . && .venv/bin/ruff format --check .
.venv/bin/mypy app seed.py seed_data.py scripts
.venv/bin/python -m pytest -q          # 21 тест: публичные и админские эндпоинты

# frontend
cd frontend
npm run typecheck && npm run lint && npm run format:check
npm run build
```

---

## План и архитектура

```
sharora/
  frontend/
    src/app/[locale]/page.tsx              главная (SSG, без API)
    src/app/[locale]/apartments/page.tsx   выбор квартиры (FastAPI через TanStack Query)
    src/app/[locale]/admin/                вход и панель менеджера
    src/app/sitemap.ts, robots.ts, icon.svg
    src/components/ui/                     дизайн-система (см. ниже)
    src/components/layout/                 Header, Footer, LocaleSwitcher, FeedbackFab
    src/components/sections/               секции главной
    src/components/apartments/             выбор квартиры, схема этажа, модалки, калькулятор
    src/components/admin/                  таблица квартир, разметка полигонов, заявки, настройки
    src/content/site.ts                    ВЕСЬ контент главной (RU/TJ)
    src/messages/{ru,tg}.json              строки интерфейса выбора квартир
    src/lib/api.ts                         клиент FastAPI (только apartments/admin)
    public/                                logo.svg, og.jpg, renders/ (визуализации из макета), docs/
  backend/
    app/main.py, core/, models/, schemas/, routers/, services/
    alembic/                               миграции
    seed.py, seed_data.py                  сид и эталонные данные (площади этажа 2 блока А)
    scripts/generate_media.py              заглушки планов этажей, планировок и чертежей
    tests/
  tools/generate_public_placeholders.py    заглушки hero/интерьеров/документов
  docker-compose.yml
  vercel.json                              Vercel Services: frontend + backend, публичные rewrites
```

### URL-состояние выбора квартиры

`/apartments?block=А&floor=2&apt=3&rooms=2&min_area=50&max_area=90&free=1` — блок, этаж, номер квартиры на этаже (открывает карточку), фильтры. Ссылка копируется и открывается в том же состоянии; переключение языка его сохраняет. Метки генплана на главной ведут на `/apartments?block=<буква>`.

### API

Данные покупателей (таблица `sales`, миграция `0002`) отдаются только админским API — публичные эндпоинты их не содержат (проверяется тестом `test_public_api_never_exposes_buyer`).

Публичные (`/api`): `GET /stats`, `GET /blocks`, `GET /blocks/{letter}/floors`, `GET /floors/{id}/units`, `GET /units/{id}`, `GET /units?block=&floor=&rooms=&min_area=&max_area=&status=`, `GET /settings`, `POST /leads` (телефон `+992XXXXXXXXX`, лимит 5 заявок в минуту с IP).

Админ (`/api/admin`, JWT в httpOnly-cookie): `POST /login`, `POST /logout`, `GET /me`, CRUD `/blocks`, `/floors`, `/units`, `PATCH /units/{id}/status` (нельзя поставить «Продано» — только через `/sell`; при снятии с продажи запись покупателя уходит в архив), `POST /units/{id}/sell`, `GET /units/{id}/sale`, `PATCH /sales/{id}`, `GET /sales?search=&block=&date_from=&date_to=&archived=`, `POST /upload?subdir=floors|units|blocks` (только JPG/PNG/WebP, проверка через Pillow), `GET/PATCH /leads`, `PATCH /settings`. Полная схема — <http://localhost:8000/docs>.

---

## Дизайн-система

Настроение: премиальная архитектура, свет, спокойствие. Без эмодзи, без бейджей ради бейджей, капслок только в маленьких надзаголовках.

### Токены (`frontend/src/app/globals.css`, Tailwind `@theme`)

| Токен | Значение | Применение |
|---|---|---|
| `ink` | `#131B2E` | Navy: тёмные секции, хедер, текст |
| `night` | `#0A0F1C` | Самый тёмный фон (преимущества, карточки на navy) |
| `gold` | `#FFDEA4` | Кнопки, акценты, цифры (на тёмном) |
| `gold-soft` | `#E8C176` | Hover золота, градиенты |
| `gold-deep` | `#94732F` | Золотые акценты на светлом фоне |
| `on-gold` | `#261900` | Текст на золотых кнопках |
| `sand` / `cream` | `#F6F3EE` / `#FCF9F4` | Светлые секции |
| `muted` / `mist` | `#55596A` / `#8B92A9` | Второстепенный текст на светлом / на тёмном |
| `line` | `#E5E2DD` | Границы, разделители |
| `--status-free-line / -fill / -text` | `#16A34A / #DCFCE7 / #15803D` | Свободно |
| `--status-reserved-line / -fill / -text` | `#F59E0B / #FEF3C7 / #B45309` | Забронировано |
| `--status-sold-line / -fill / -text` | `#DC2626 / #FEE2E2 / #B91C1C` | Продано |

Статусы: `line` — обводка 2px карточек и линии 2px полигонов на схеме, `fill` — бледная заливка, `text` — подпись статуса. Объявлены в `:root` и подключены в Tailwind как `bg-status-free-fill`, `border-status-sold-line` и т. д.; классы собраны в `src/components/ui/status.ts` (карточки, схема, легенда, админка используют только их).

¹ `#64748B` из брифа даёт контраст 4.3:1 на `sand` — ниже AA; цвет чуть затемнён до 5.3:1.

- **Шрифты**: Manrope 600–800 (заголовки), Inter 400–600 (текст); подмножества `cyrillic-ext` — таджикские ҳ ҷ қ ғ ӯ ӣ.
- **Шкала**: `text-h1` 36→72px, `text-h2` 28→40px, `text-body` 16→17px, `eyebrow` 12px / трекинг 0.12em.
- **Сетка**: `container-page` 1280px, поля 16/24px; `section-y` 72px / 120px.
- **Радиусы**: карточки 20px (`rounded-card`), поля 14px (`rounded-control`), кнопки 999px.
- **Тени**: `shadow-soft` (покой) и `shadow-lift` (ховер, модалки) — только они.
- **Анимации**: появление секций (fade + 16px), параллакс hero, хедер прозрачный → ink при скролле. `MotionConfig reducedMotion="user"` + `motion-reduce` отключают движение при `prefers-reduced-motion`.

### Компоненты (`src/components/ui`)

`Button` (primary / secondary / ghost / inverse), `SectionHeading` (eyebrow + заголовок + подзаголовок), `Reveal`, `Modal` (фокус-ловушка, Esc, блокировка скролла, возврат фокуса), `Lightbox` (счётчик «1 / 9», стрелки, свайп, зум для документов), `ZoomControls` (+ / − / 100% / сброс / полный экран), `Tabs` (ARIA tabs, стрелки), `Chip`, `Tooltip`, `Toast`, `Skeleton`, `StatBadge`, `StatusDot`. Карточки преимуществ, документов и квартир собраны из этих примитивов.

---

## Как менять контент

- **Тексты главной, телефоны, ссылки WhatsApp/Telegram, координаты карты** — `frontend/src/content/site.ts`. Каждая строка — `{ ru, tg? }`; если `tg` нет, показывается русский текст.
- **TODO (перевод)**: таджикские версии длинных текстов и части строк в `src/messages/tg.json` пока не заполнены — отображается русский. Ключи для перевода — записи без `tg` в `site.ts` и отсутствующие ключи в `tg.json`.
- **Изображения** — замените файлы в `frontend/public` с теми же именами: `logo.svg`, `hero.jpg` (генплан 16:9), `about.jpg`, `og.jpg` (1200×630), `interior/01–09.jpg`, `docs/<slug>-<n>.jpg`. Текущие файлы — сгенерированные заглушки.
- **Метки блоков на генплане** — `site.genplan.blocks` (`x`, `y` в процентах от изображения). После замены `hero.jpg` подвиньте метки на буквы на крышах.
- **Документы** — `site.documents.items`: slug, названия, число страниц (= число файлов `docs/<slug>-N.jpg`).
- **Квартиры, цены, статусы, планировки, полигоны** — в админке. Чтобы разметить схему: выберите блок и этаж → загрузите изображение схемы → выберите квартиру → кликайте по углам её контура → «Сохранить контур».

## Что важно знать

- Locale таджикского языка — `tg` (код ISO 639-1); в переключателе он подписан «TJ», адреса — `/tg/...`.
- Сетка преимуществ — 4 колонки + широкая тёмная карточка «городок из 44 блоков» на всю ширину: при 9 карточках с одной широкой ровная сетка 3×3 невозможна.
- Админка доступна по `/admin/login` (ссылка мелким текстом в футере); middleware перенаправляет без cookie, а API проверяет JWT на каждом запросе.
- Миграции и тесты проверены на SQLite; на PostgreSQL используется драйвер `psycopg` 3 (`postgresql+psycopg://`).
