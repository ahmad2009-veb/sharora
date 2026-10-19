# ЖК «Зарафшон» — сайт и выбор квартир

Сайт жилого комплекса «Зарафшон» (Zarafshon Sokhtmon): статическая главная страница, интерактивный выбор квартир и админ-панель для менеджеров.

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
.venv/bin/python seed.py             # 2 блока × 9 этажей (магазин + 8 × 7 квартир), 114 помещений
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

> `python seed.py` **очищает** блоки, этажи, квартиры и заявки и заполняет их заново (все помещения свободны; `--demo-statuses` — случайный набор статусов для демо). Для Docker и Vercel используется `seed.py --if-empty`, который ничего не трогает, если данные уже есть.
>
> Существующую базу со старой структурой (12 блоков А–Н) переводит на 2 блока миграция `0003` (`alembic upgrade head`): Блок А → Блок 1, Блок Б → Блок 2, лишнее удаляется, заявки и продажи сохраняются (у удалённых квартир старый адрес дописывается в комментарий), статусы сбрасываются на «свободно», кроме квартир с активной продажей.

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
| `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` | backend | Если задан один из них — загрузки идут в Vercel Blob (токен или OIDC), в БД сохраняется URL файла |
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
| `BLOB_STORE_ID` (или `BLOB_READ_WRITE_TOKEN`) | backend | `store_…` | добавит Blob store; со `BLOB_STORE_ID` backend авторизуется OIDC-токеном Vercel |
| `MAX_UPLOAD_MB` | backend | `4` | вручную (лимит тела запроса Vercel — 4,5 МБ) |
| `CORS_ORIGINS` | backend | `https://sharora.tj` | вручную; при одном домене не обязателен |
| `NEXT_PUBLIC_SITE_URL` | frontend | `https://sharora.tj` (или `https://<project>.vercel.app`) | вручную |
| `NEXT_PUBLIC_API_URL` | frontend | — | **не задавать**: пусто = относительные `/api` |

`DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` (Secret) нужны только сборке для первого сида. `BACKEND_URL` задаёт binding, `MEDIA_DIR` в Vercel не нужен.

### Шаги

1. **Проект.** vercel.com → Add New → Project → импортируйте репозиторий `sharora`. Root Directory — корень репозитория, Framework Preset — **Services** (CLI: `vercel project update --framework services`).
2. **Postgres.** Project → Storage → Create Database → **Neon** → подключите к Production (и Preview, лучше отдельную базу). Интеграция добавит `DATABASE_URL` (pooled) и `DATABASE_URL_UNPOOLED` (прямое соединение — для миграций).
3. **Blob.** Project → Storage → Create → **Blob** → Public → подключите к проекту. Появится `BLOB_READ_WRITE_TOKEN`.
4. **Остальные переменные** из таблицы: Project → Settings → Environment Variables.
5. **Миграции и сид — в сборке.** `buildCommand` сервиса `backend` (`python -m scripts.deploy_setup`) при каждой **production**-сборке выполняет `alembic upgrade head` и `seed.py --if-empty` по `DATABASE_URL_UNPOOLED` (или `DATABASE_URL`). Сид срабатывает только на пустой базе и создаёт менеджера из `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD` (добавьте их в Vercel как Secret). Preview-сборки базу не трогают: она общая с production. Ошибка миграции валит сборку — сайт остаётся на предыдущем деплое.
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
    seed.py, seed_data.py                  сид и эталонные данные (2 блока, 7 квартир на этаже)
    scripts/generate_media.py              заглушки планов этажей, планировок и чертежей
    tests/
  tools/generate_public_placeholders.py    заглушки hero/интерьеров/документов
  docker-compose.yml
  vercel.json                              Vercel Services: frontend + backend, публичные rewrites
```

### URL-состояние выбора квартиры

`/apartments?block=1&floor=2&apt=3&rooms=2&min_area=50&max_area=90&free=1` — блок, этаж, номер квартиры на этаже (открывает карточку), фильтры. Ссылка копируется и открывается в том же состоянии; переключение языка его сохраняет. Блоки на главной ведут на `/apartments?block=<номер>`.

### API

Данные покупателей (таблица `sales`, миграция `0002`) и графики платежей (`installment_payments`, миграция `0004`) отдаются только админским API — публичные эндпоинты их не содержат (проверяется тестом `test_public_api_never_exposes_buyer`).

Рассрочка: остаток (стоимость − первоначальный взнос, плюс наценка %) делится на равные платежи в целых сомони, разница от округления — в последнем платеже; даты — то же число каждого месяца (31-е → последний день короткого месяца). Расчёт — одна функция `app/services/installments.py::build_schedule` (тесты `tests/test_installments.py`); превью в модалке продажи повторяет её в `frontend/src/lib/installments.ts` — меняйте обе. «Просрочено» не хранится, а считается при чтении по дате Таджикистана (UTC+5). При изменении условий продажи строки с оплатой сохраняются (частично оплаченная закрывается на внесённой сумме), остальные формируются заново. «Полная оплата» требует взнос = стоимости; старые продажи без графика стали «полной оплатой» и отображаются как раньше.

Публичные (`/api`): `GET /stats`, `GET /blocks`, `GET /blocks/{letter}/floors`, `GET /floors/{id}/units`, `GET /units/{id}`, `GET /units?block=&floor=&rooms=&min_area=&max_area=&status=`, `GET /settings`, `POST /leads` (телефон `+992XXXXXXXXX`, лимит 5 заявок в минуту с IP).

Админ (`/api/admin`, JWT в httpOnly-cookie): `POST /login`, `POST /logout`, `GET /me`, CRUD `/blocks`, `/floors`, `/units`, `PATCH /units/{id}/status` (нельзя поставить «Продано» — только через `/sell`; при снятии с продажи запись покупателя уходит в архив), `POST /units/{id}/sell`, `GET /units/{id}/sale`, `PATCH /sales/{id}` (изменение условий пересчитывает неоплаченную часть графика), `GET /sales?search=&block=&date_from=&date_to=&archived=&overdue=`, `GET /sales/{id}/schedule`, `GET /sales/{id}/export.xlsx|docx`, `POST /payments/{id}/pay` (сумма добавляется к оплаченному, частичная оплата разрешена), `POST /payments/{id}/reset`, `GET /payments/overdue`, `POST /upload?subdir=floors|units|blocks` (только JPG/PNG/WebP, проверка через Pillow), `GET/PATCH /leads`, `PATCH /settings`. Полная схема — <http://localhost:8000/docs>.

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
- **Фон первого экрана** — исходник `public/renders/hero-building.jpg` (1150×837, хранится как резервная копия). На сайте показываются `public/renders/hero/hero-{1280,1920,2560}.{avif,webp}`: апскейл ×4 через [Real-ESRGAN ncnn-vulkan](https://github.com/xinntao/Real-ESRGAN) (модель `realesrgan-x4plus`, лицензия BSD-3-Clause), лёгкая резкость/контраст в `sharp`, экспорт AVIF/WebP. Vercel отдаёт `public/` без оптимизации, поэтому набор собран заранее и подключён через `<picture>`; при замене рендера пересоберите все файлы и обновите `blurDataURL`, `width`, `height` в `site.hero.image`.
- **Анимация первого экрана** (`HeroBackdrop.tsx`, `globals.css`) — Ken Burns, параллакс, золотой блик и «светящиеся частицы» сделаны на CSS/Framer Motion без сторонних ассетов (Lottie и т. п. не используются).
- **Блоки** — структура (2 блока, 1-й этаж — магазин, 2–9 — по 7 квартир, площади) задаётся в `backend/seed_data.py`; на главной — `site.genplan.blocks` (номера блоков) и 3D-модель в `src/components/three/layout.ts`. Площади, цены и статусы квартир правьте в админке.
- **Документы** — `site.documents.items`: slug, названия, число страниц (= число файлов `docs/<slug>-N.jpg`).
- **Квартиры, цены, статусы, планировки, полигоны** — в админке. Схемы этажей: вкладка «Этажи и схемы» → блок и этаж → загрузите изображение схемы → выберите квартиру → кликайте по углам её контура → «Сохранить контур». Сейчас на этажах 2–9 стоит общая заглушка `backend/media/floors/plan_typical.svg`, на 1-м — `plan_shop.svg`. Добавить/удалить помещение на этаже — «Фонд квартир» → фильтр «Этаж» → «Добавить квартиру» / корзина в строке.

## Что важно знать

- Locale таджикского языка — `tg` (код ISO 639-1); в переключателе он подписан «TJ», адреса — `/tg/...`.
- Сетка преимуществ — 8 карточек (4 × 2) и цитата под ними; карточка «городок из 44 блоков» и паркинг убраны (2026-10).
- Админка доступна по `/admin/login` (ссылка мелким текстом в футере); middleware перенаправляет без cookie, а API проверяет JWT на каждом запросе.
- Миграции и тесты проверены на SQLite; на PostgreSQL используется драйвер `psycopg` 3 (`postgresql+psycopg://`).
