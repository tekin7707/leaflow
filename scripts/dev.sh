#!/usr/bin/env bash
#
# Provit local dev orchestrator.
#
# Akış:
#   1) Postgres + API + Web container'larını rebuild edip ayağa kaldırır.
#   2) API health'ini bekler.
#   3) Prisma db push (schema -> Postgres) çalıştırır.
#   4) Mobil için: pnpm install + Metro bundler'ı foreground'da açar.
#      (Expo Go ile QR okutursun. Yayın yapmaz, EAS build de yapmaz.)
#
# Kullanım:
#   ./scripts/dev.sh              # her şeyi rebuild + Metro
#   ./scripts/dev.sh --no-build   # rebuild atla, sadece up + Metro
#   ./scripts/dev.sh --reset      # DB'yi sıfırla (down -v + seed)
#   ./scripts/dev.sh --no-mobile  # Metro başlatma; sadece API + Web
#
set -euo pipefail

cd "$(dirname "$0")/.."

NO_BUILD=0
RESET=0
NO_MOBILE=0
for arg in "$@"; do
  case "$arg" in
    --no-build) NO_BUILD=1 ;;
    --reset)    RESET=1 ;;
    --no-mobile) NO_MOBILE=1 ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//' | head -n 22
      exit 0 ;;
    *) echo "Bilinmeyen argüman: $arg"; exit 1 ;;
  esac
done

cyan()  { printf '\033[36m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null; then red "docker bulunamadı"; exit 1; fi
if ! command -v pnpm >/dev/null; then red "pnpm bulunamadı (npm i -g pnpm)"; exit 1; fi

# 1) Reset isteğine göre volume'ları temizle
if [ "$RESET" -eq 1 ]; then
  cyan "→ docker compose down -v (DB + node_modules sıfırlanır)"
  docker compose down -v
fi

# 2) Build + up
if [ "$NO_BUILD" -eq 1 ]; then
  cyan "→ docker compose up -d (rebuild atlandı)"
  docker compose up -d
else
  cyan "→ docker compose up -d --build api web"
  docker compose up -d --build api web
fi

# 3) API health bekle
cyan "→ API health bekleniyor (http://localhost:7051/api/health)"
for i in {1..40}; do
  if curl -fsS http://localhost:7051/api/health >/dev/null 2>&1; then
    green "✓ API up"
    break
  fi
  sleep 1
  if [ "$i" -eq 40 ]; then
    red "API 40s içinde ayağa kalkmadı. Loglar:"
    docker compose logs --tail=80 api
    exit 1
  fi
done

# 4) DB push (schema değişiklerini uygula)
cyan "→ prisma db push"
docker compose exec -T api pnpm --filter api db:push || {
  red "db:push hatalı. Loglar için: docker compose logs api"
  exit 1
}

# 5) Reset isteğinde seed çalıştır (DB temizliği)
if [ "$RESET" -eq 1 ]; then
  cyan "→ seed (DB temizleniyor; mock data yok)"
  docker compose run --rm api pnpm --filter api seed
fi

green "
========================================
  API:    http://localhost:7051
  Web:    http://localhost:7052
  DB:     localhost:7050  (provit/provit)
========================================
"

if [ "$NO_MOBILE" -eq 1 ]; then
  green "Mobil başlatılmadı. Logları takip etmek için: docker compose logs -f api web"
  exit 0
fi

# 6) Mobil bağımlılıklar (eksikse)
if [ ! -d apps/mobile/node_modules ]; then
  cyan "→ pnpm install (mobile dahil)"
  pnpm install
fi

# 7) Mobil Metro foreground (Ctrl+C ile durur). EAS build / publish yapmaz.
cyan "→ pnpm --filter mobile start --clear"
green "QR'ı iPhone Expo Go ile okut. Bilgisayarın aynı Wi-Fi'da olmalı."
exec pnpm --filter mobile start --clear
