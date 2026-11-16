# Домен zarafshon.tj: DNS, SSL, nginx

Основной адрес сайта — **https://zarafshon.tj**. На него уже указывают canonical, `sitemap.xml`,
`robots.txt` и `og:image` (сборка идёт с `SITE_URL=https://zarafshon.tj`). Остальные варианты
(`http://…`, `www.zarafshon.tj`) отвечают одним редиректом 301 на основной адрес.

## Почему `zarafshon.tj` без www не открывался

У домена нет DNS-записи `A` для `zarafshon.tj`, есть только для `www.zarafshon.tj`
(→ 213.199.52.199). Сертификат Let's Encrypt тоже выписан только на `www.zarafshon.tj`.
Nginx здесь ни при чём: запрос до сервера просто не доходит.

## 1. DNS (панель регистратора, NS: ns1/ns2.navjucloud.tj)

| Имя | Тип | Значение |
| --- | --- | --- |
| `@` (zarafshon.tj) | A | `213.199.52.199` |
| `www` | A | `213.199.52.199` (уже есть) |

Если есть AAAA (IPv6) только для одного имени, удалите её или добавьте для обоих.
Проверка (подождите, пока запись разойдётся, обычно от 5 минут до часа):

```bash
dig +short zarafshon.tj        # должно вывести 213.199.52.199
```

## Быстрый путь: один скрипт (после шага 1)

```bash
sudo bash /opt/zarafshon/deploy/setup-domain.sh
```

Скрипт проверяет DNS, делает бэкап `/etc/nginx`, выпускает сертификат на оба имени, ставит
конфиг (при ошибке `nginx -t` откатывает), проверяет `SITE_URL` в `/opt/zarafshon/.env` и
сами редиректы. Шаги 2–4 ниже — то же самое вручную.

## 2. Сертификат на оба имени (на сервере)

```bash
sudo certbot certonly --nginx --cert-name zarafshon.tj -d zarafshon.tj -d www.zarafshon.tj
```

Сертификат ляжет в `/etc/letsencrypt/live/zarafshon.tj/`, этот путь прописан в конфиге.
Старый сертификат `www.zarafshon.tj` можно удалить после проверки: `sudo certbot delete --cert-name www.zarafshon.tj`.

## 3. Nginx

```bash
cd /opt/zarafshon
ls /etc/nginx/sites-enabled/             # найдите текущий конфиг сайта
sudo cp /etc/nginx/sites-available/<текущий> ~/nginx-backup.conf   # резервная копия
sudo rm /etc/nginx/sites-enabled/<текущий>
sudo cp deploy/nginx/zarafshon.tj.conf /etc/nginx/sites-available/zarafshon.tj
sudo ln -sf /etc/nginx/sites-available/zarafshon.tj /etc/nginx/sites-enabled/zarafshon.tj
sudo nginx -t && sudo systemctl reload nginx
```

Если `nginx -t` пишет о дубликате `$connection_upgrade`, удалите блок `map` в конце файла.

## 4. Проверка

```bash
curl -sI http://zarafshon.tj         | grep -i -E "^HTTP|^location"   # 301 → https://zarafshon.tj/
curl -sI http://www.zarafshon.tj     | grep -i -E "^HTTP|^location"   # 301 → https://zarafshon.tj/
curl -sI https://www.zarafshon.tj    | grep -i -E "^HTTP|^location"   # 301 → https://zarafshon.tj/
curl -sI https://zarafshon.tj        | grep -i "^HTTP"                # 200
curl -s  https://zarafshon.tj/robots.txt
```

## 5. Поисковики

1. **Google Search Console** → добавить ресурс «Домен» `zarafshon.tj` (подтверждение TXT-записью
   в DNS) → «Файлы Sitemap» → `https://zarafshon.tj/sitemap.xml` → «Проверка URL» для главной и
   `/apartments` → «Запросить индексирование».
2. **Яндекс Вебмастер** → добавить `https://zarafshon.tj`, отправить тот же sitemap.
3. Вместо TXT-записи можно подтвердить мета-тегом: добавьте в `/opt/zarafshon/.env`
   `GOOGLE_SITE_VERIFICATION=…` / `YANDEX_VERIFICATION=…` (только код из `content="…"`) и
   пересоберите: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend`.
4. Проверка разметки: https://search.google.com/test/rich-results и https://validator.schema.org.
5. **Google Business Profile** (Google Карты) для компании: при поиске «Зарафшон» по Таджикистану
   он даёт больше всего. Заполняется вручную владельцем бизнеса.
