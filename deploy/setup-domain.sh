#!/usr/bin/env bash
# One-time server setup: https://zarafshon.tj becomes the primary domain.
#   - certificate (Let's Encrypt) for zarafshon.tj + www.zarafshon.tj
#   - nginx: http://*, https://www → 301 https://zarafshon.tj$request_uri
#
# Run on the VPS as root, from the repo checkout:
#   sudo bash /opt/zarafshon/deploy/setup-domain.sh
# or with the files copied elsewhere:
#   sudo bash setup-domain.sh /path/to/zarafshon.tj.conf
#
# Safe to re-run. /etc/nginx is backed up first and restored if `nginx -t` fails.
set -euo pipefail

DOMAIN=zarafshon.tj
WWW=www.zarafshon.tj
SERVER_IP=213.199.52.199
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SRC="${1:-$HERE/nginx/zarafshon.tj.conf}"
APP_DIR=/opt/zarafshon
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/nginx-backup-$STAMP"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31mОШИБКА: %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "запустите через sudo"
[[ -f "$CONF_SRC" ]] || die "не найден конфиг $CONF_SRC"
command -v nginx >/dev/null || die "nginx не установлен"

say "1/6 Проверка DNS"
for host in "$DOMAIN" "$WWW"; do
  ip="$(getent ahostsv4 "$host" | awk 'NR==1{print $1}')"
  [[ "$ip" == "$SERVER_IP" ]] \
    || die "$host → '${ip:-нет записи}', нужно $SERVER_IP. Добавьте A-запись у регистратора (navjucloud.tj) и подождите."
  echo "$host → $ip ✓"
done

say "2/6 Резервная копия /etc/nginx → $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -a /etc/nginx "$BACKUP_DIR/nginx"

restore() {
  echo "Восстанавливаю /etc/nginx из $BACKUP_DIR …" >&2
  rm -rf /etc/nginx && cp -a "$BACKUP_DIR/nginx" /etc/nginx
  nginx -t && systemctl reload nginx
}

say "3/6 Сертификат на $DOMAIN и $WWW"
if ! command -v certbot >/dev/null; then
  apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
fi
# The nginx plugin answers the challenge through the running nginx; nothing is rewritten
# (certonly). --expand lets a re-run add names to an existing zarafshon.tj certificate.
certbot certonly --nginx --non-interactive --agree-tos --register-unsafely-without-email \
  --keep-until-expiring --expand --cert-name "$DOMAIN" -d "$DOMAIN" -d "$WWW"
certbot certificates --cert-name "$DOMAIN" | grep -E "Domains|Expiry"

# The config includes certbot's shared TLS settings; create them if this server never had them.
LE=/etc/letsencrypt
if [[ ! -f $LE/options-ssl-nginx.conf ]]; then
  src="$(python3 -c 'import certbot_nginx, os; print(os.path.join(os.path.dirname(certbot_nginx.__file__), "_internal", "tls_configs", "options-ssl-nginx.conf"))' 2>/dev/null || true)"
  if [[ -f "$src" ]]; then cp "$src" $LE/options-ssl-nginx.conf
  else printf 'ssl_session_cache shared:le_nginx_SSL:10m;\nssl_session_timeout 1440m;\nssl_session_tickets off;\nssl_protocols TLSv1.2 TLSv1.3;\nssl_prefer_server_ciphers off;\n' > $LE/options-ssl-nginx.conf; fi
fi
[[ -f $LE/ssl-dhparams.pem ]] || openssl dhparam -out $LE/ssl-dhparams.pem 2048

say "4/6 Конфиг nginx"
# Disable the old site configs for this domain (kept in the backup, moved out of sites-enabled).
mkdir -p "$BACKUP_DIR/disabled"
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
  [[ -e "$f" ]] || continue
  [[ "$(readlink -f "$f")" == /etc/nginx/sites-available/$DOMAIN ]] && continue
  if grep -qE "server_name[^;]*(\s|^)(www\.)?zarafshon\.tj" "$f"; then
    echo "отключаю старый конфиг: $f"
    mv "$f" "$BACKUP_DIR/disabled/"
  fi
done
cp "$CONF_SRC" /etc/nginx/sites-available/$DOMAIN
# Another site may already define $connection_upgrade: then drop our copy of the map.
if grep -rqs --exclude="$DOMAIN" 'map \$http_upgrade \$connection_upgrade' /etc/nginx/nginx.conf /etc/nginx/conf.d /etc/nginx/sites-enabled; then
  echo "map \$connection_upgrade уже есть — убираю дубликат из нашего конфига"
  sed -i '/^map \$http_upgrade \$connection_upgrade {/,/^}/d' /etc/nginx/sites-available/$DOMAIN
fi
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

if ! nginx -t; then restore; die "nginx -t не прошёл — старая конфигурация восстановлена"; fi
systemctl reload nginx

say "5/6 SITE_URL проекта"
if [[ -f $APP_DIR/.env ]]; then
  if grep -q '^SITE_URL=' $APP_DIR/.env; then
    current="$(grep '^SITE_URL=' $APP_DIR/.env | tail -1 | cut -d= -f2-)"
    if [[ "$current" != "https://$DOMAIN" ]]; then
      sed -i "s|^SITE_URL=.*|SITE_URL=https://$DOMAIN|" $APP_DIR/.env
      echo "SITE_URL: $current → https://$DOMAIN (пересоберите frontend, см. ниже)"
    else echo "SITE_URL=https://$DOMAIN ✓"; fi
  else
    echo "SITE_URL=https://$DOMAIN" >> $APP_DIR/.env; echo "добавлен SITE_URL=https://$DOMAIN (пересоберите frontend)"
  fi
  if grep -q '^CORS_ORIGINS=' $APP_DIR/.env && ! grep -q "^CORS_ORIGINS=.*https://$DOMAIN" $APP_DIR/.env; then
    echo "внимание: CORS_ORIGINS не содержит https://$DOMAIN (при одном домене через Next.js прокси не обязателен)"
  fi
else
  echo "$APP_DIR/.env не найден — проверьте SITE_URL вручную"
fi

say "6/6 Проверка"
check() { # url expected_code expected_location
  read -r code loc < <(curl -sS -o /dev/null -m 15 -w '%{http_code} %{redirect_url}\n' "$1")
  if [[ "$code" == "$2" && "$loc" == "$3" ]]; then echo "✓ $1 → $code ${loc}"
  else echo "✗ $1 → $code ${loc} (ожидалось $2 $3)"; FAIL=1; fi
}
FAIL=0
check "http://$DOMAIN/apartments?x=1"  301 "https://$DOMAIN/apartments?x=1"
check "http://$WWW/apartments?x=1"     301 "https://$DOMAIN/apartments?x=1"
check "https://$WWW/apartments?x=1"    301 "https://$DOMAIN/apartments?x=1"
check "https://$DOMAIN/"               200 ""
check "https://$DOMAIN/robots.txt"     200 ""
[[ $FAIL -eq 0 ]] || die "не все проверки прошли (бэкап: $BACKUP_DIR)"

echo
echo "Готово. Бэкап старой конфигурации: $BACKUP_DIR"
echo "Продление сертификата: certbot уже сделал таймер — проверка: certbot renew --dry-run"
echo "Если SITE_URL менялся: cd $APP_DIR && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend"
