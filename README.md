# Provit

Görev oluştur → ata → gerçekleştir → ispat → onay sistemi. 3 uygulamadan oluşan bir monorepo:

- **`apps/api`** — Node.js + Express + Prisma + PostgreSQL (TypeScript, `tsx` runner)
- **`apps/web`** — React 18 + Vite (TypeScript)
- **`apps/mobile`** — Expo SDK 51 + React Native (TypeScript)
- **`packages/shared`** — zod şemaları, enum'lar, dış servis adapter interface'leri

Tasarım yön A — sıcak krem zemin + zeytin yeşili aksan. Görsel referans: [spec/design/Provit Design.html](spec/design/Provit%20Design.html). Detaylı build spec: [spec/design/CLAUDE_CODE_SPEC.md](spec/design/CLAUDE_CODE_SPEC.md).

---

## Çalıştırma — iki yol

> **Mobile her iki yolda da yerelden çalışır** (Expo, cihazın LAN üzerinden bağlanması için host network'e ihtiyaç duyar — macOS Docker Desktop'ta `network_mode: host` çalışmaz).

### Yol A — Full docker (önerilen, tek komut)

Postgres + API + Web container'da çalışır. Sadece Docker yeterli; Node/pnpm host'ta gerekmez.

```bash
# 1) İlk kurulum: build + install + db push (yaklaşık 2-3 dk)
docker compose up -d

# 2) Seed (sadece ilk açılışta veya verileri sıfırlamak için)
docker compose run --rm api pnpm --filter api seed

# Hepsi ayakta:
#   API:  http://localhost:7051  (health: /api/health)
#   Web:  http://localhost:7052
#   DB:   localhost:7050  (provit/provit)

# Logları izle
docker compose logs -f api web

# Durdur
docker compose down

# Her şeyi sıfırla (DB + node_modules dahil)
docker compose down -v
```

Hot reload **çalışır** — host'ta `apps/` veya `packages/` içinde dosya değiştirirsen container içindeki tsx-watch / Vite HMR algılar. (macOS'ta polling açık olduğu için biraz ek CPU; kapatmak istersen compose'daki `CHOKIDAR_USEPOLLING` env'ini sil.)

#### Mobile (her iki yolda da aynı)
```bash
# Host'ta:
pnpm install                       # ilk seferde
pnpm --filter mobile start         # Expo dev server
# Telefonda Expo Go ile QR kodu okut. Bilgisayarın aynı Wi-Fi'da olmalı.
```

`apps/mobile/app.json` içindeki `extra.apiUrl` değeri telefonun erişebileceği bir IP olmalı. Localhost telefondan görünmez — gerekiyorsa makinen LAN IP'sine değiştir (örn. `http://192.168.1.50:4000`).

---

### Yol B — Lokal dev (postgres docker, api/web yerel)

Daha hızlı hot reload, daha düşük kaynak. pnpm + Node 20+ host'ta gerekli.

```bash
# 0) pnpm yoksa
npm install -g pnpm

# 1) Sadece postgres'i kaldır
docker compose up -d postgres

# 2) Bağımlılıklar + DB
pnpm install
pnpm --filter api db:push
pnpm --filter api seed

# 3) API + Web paralel
pnpm dev
```

API ve web servislerini `docker compose up postgres` ile başlattığın için diğerleri başlamaz. Sadece postgres ayakta kalır.

---

## Test hesapları

Mock auth herhangi bir parolayı kabul eder.

| E-posta | Rol |
|---|---|
| `admin@provit.test` | Tüm takımlarda yönetici |
| `ayse@provit.test` | Bahçeşehir manager |
| `mehmet@provit.test` | Bahçeşehir member |
| `kemal@provit.test` | Kadıköy manager |
| `zeynep@provit.test` | Kadıköy member |
| `ali@provit.test` | Ataşehir manager |
| `fatma@provit.test` | Ataşehir member |
| `elif@provit.test` | Kadıköy member |

## Akış (spec-01)

1. Takım yönetimi — `/teams`
2. Soru grupları + sorular — `/checklists`
3. Görev grupları (wizard 3 adım: meta → tasks → DAG bağımlılıklar) — `/task-groups`
4. Atama oluştur (TaskGroup × Team × tarih, opsiyonel approver) — `/assignments/new`
5. Mobilde görev gerçekleştirme — Today tab → TaskWizard (foto + checklist)
6. Onay kuyruğu — Web `/approvals` veya Mobile Approvals tab
7. Bildirimler — her durum geçişinde mock push + Notification kaydı

## Dış servis adapter'leri (mock)

`spec-01.md`'deki dış servisler `packages/shared/src/adapters.ts` interface'leri olarak tanımlandı, `apps/api/src/adapters/mock/` altında implemente edildi.

| spec-01 | Adapter | Mock davranışı |
|---|---|---|
| Agentechauth | `AuthAdapter` + `TeamsAdapter` | Seed'deki kullanıcı/takımları kullanır; herhangi parola geçer. |
| Notifit | `PushAdapter` | Console log + `Notification` tablosuna insert. |
| Fiload | `FilesAdapter` | `apps/api/uploads/` klasörüne local PUT; `key` = uuid. |

`apps/api/src/adapters/http/agentechauth.ts` gerçek Agentechauth HTTP istemcisini sağlar.
`AUTH_MODE=agentech` + `AGENTECHAUTH_API_KEY` set edildiğinde `/api/auth/login`,
`/api/teams`, `/api/teams/:id/members`, `/api/teams/:id/available-users`,
`/api/auth/refresh`, `/api/auth/profile` Agentechauth servisini kullanır; aksi
takdirde mock yollar devrededir. Login'de upstream access/refresh token'lar
`User` üzerine yazılır; `requireAuth` korumasındaki uçlar gerektiğinde 60 sn
buffer ile otomatik refresh eder.

## Komutlar

### Docker
```bash
docker compose up -d                              # tüm dev servisleri
docker compose run --rm api pnpm --filter api seed
docker compose logs -f api web
docker compose restart api
docker compose down                                # durdur (volume tut)
docker compose down -v                             # her şeyi sil
docker compose build --no-cache api web            # Dockerfile değişti
```

### Lokal (host'ta)
```bash
pnpm dev                                           # api + web paralel
pnpm seed
pnpm db:push
pnpm test                                          # backend testleri
pnpm --filter api typecheck
pnpm --filter web build
pnpm --filter mobile start
```

## Klasör yapısı

```
provit/
├─ docker-compose.yml          # postgres + deps + api + web
├─ Dockerfile.dev              # ortak dev imajı (node:20 + pnpm)
├─ pnpm-workspace.yaml
├─ apps/
│  ├─ api/                     # Node + Express + Prisma (TS, tsx runner)
│  │  ├─ prisma/{schema.prisma, seed.ts}
│  │  └─ src/
│  │     ├─ index.ts auth.ts db.ts errors.ts log.ts config.ts
│  │     ├─ routes/            # 10 route
│  │     ├─ services/          # deps (cycle + unblock), recurrence
│  │     ├─ adapters/mock/     # auth, teams, files, push
│  │     └─ jobs/              # cron (recurrence + reminders)
│  ├─ web/                     # Vite + React (TS) — 11 sayfa
│  └─ mobile/                  # Expo + RN (TS) — 9 ekran
└─ packages/
   └─ shared/                  # zod schemas, enums, adapter interfaces (TS)
```

## DoD — kabul kriterleri

1. ✅ `docker compose up -d` postgres + api + web ayakta
2. ✅ `docker compose run --rm api pnpm --filter api seed` hatasız
3. ✅ http://localhost:7051/api/health → `{ ok: true }`; http://localhost:7052 Login açar
4. ✅ `admin@provit.test` ile login → Dashboard'da bugünkü atamalar
5. ✅ `/task-groups` wizard yeni grup oluşturur, dependsOn döngüsü 400 ile reddedilir
6. ✅ `/approvals` onay verir, kuyruktan düşer, notification düşer
7. ✅ Expo Go ile mobile bağlanır, login → Today dolu
8. ✅ Mobil TaskWizard: foto → mock upload → checklist → tamamla → web approvals'a düşer
9. ✅ Tüm ekranlar Yön A token'larıyla render olur

## Sık sorunlar

- **`pnpm: command not found`** (Yol B) → `npm install -g pnpm`
- **Docker'da web boş sayfa** → `docker compose logs web` — pnpm install bitti mi? `deps` servisi başarıyla bittiyse api/web başlar.
- **Mobile cihazdan API'ye erişemiyor** → `apps/mobile/app.json`'daki `extra.apiUrl`'i `localhost` değil bilgisayarının LAN IP'si olarak ayarla, Expo'yu yeniden başlat.
- **Docker'da hot reload çalışmıyor** → polling açık (`CHOKIDAR_USEPOLLING=true`); container restart edip dene: `docker compose restart api web`.
- **Verileri sıfırlamak istiyorum** → `docker compose down -v && docker compose up -d && docker compose run --rm api pnpm --filter api seed`

## Bilinçli kapsam dışı

- Gerçek SSO / OIDC, gerçek S3, gerçek Expo push gönderimi (interface'ler hazır, sadece adapter swap)
- Multi-tenant, audit log
- E2E test (Playwright/Detox)
- CI/CD

## Lisans

Internal — Flo / Provit.
