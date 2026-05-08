# Provit — Claude Code Build Spec

> **Amaç:** Bu doküman, Claude Code'a verildiğinde **3 ayrı projeyi (BE / Web / Mobile)** mock data ile sıfırdan ayağa kaldırması için yeterli olmalıdır. Her bölüm net, eksiksiz ve karar verilmiş halde yazılmıştır. Belirsizlik bırakılmamıştır; gri alanlar varsayım olarak işaretlenmiştir.
>
> **Tasarım referansı:** `Provit Design.html` (Yön A — sıcak krem + zeytin yeşili).

---

## 0. Proje özeti

**Provit**, ekipler için **Görev oluşturma → Atama → Gerçekleştirme → İspat → Onay** sistemidir. Yöneticiler checklist ve görev grupları tanımlar, takımlara atar; üyeler sahada mobil uygulamayla görevleri tamamlar (foto + checklist + zaman damgası); yöneticiler ispatları onaylar.

**Domain dili (Türkçe):** Takım, Üye, Yönetici, Soru Grubu, Soru, Görev Grubu, Görev, Atama, Çalıştırma (Run), İspat, Onay.

---

## 1. Stack — kararlaştırılmış

### Backend (`apps/api`)
- **Runtime:** Node.js 20+ (ESM, `"type": "module"`)
- **Framework:** Express 4
- **DB:** PostgreSQL 16 (Docker ile)
- **ORM:** Prisma 5
- **Validation:** Zod 3
- **Auth:** JWT (HS256) — dış servis adaptörünün döndürdüğü user için yerel token üretiyoruz
- **Scheduler:** node-cron (recurrence + reminders)
- **Loglama:** pino
- **Dış servisler:** **interface + mock implementasyon** olarak yazılır (auth, teams, files, push). Production'a geçişte sadece adaptör değişir.

### Web (`apps/web`)
- **Framework:** React 18 + Vite 5
- **Routing:** react-router-dom 6
- **State/data:** @tanstack/react-query 5
- **Forms:** react-hook-form + zod
- **Stil:** plain CSS (CSS variables ile token sistemi) — tasarım referansından birebir
- **HTTP:** fetch tabanlı `api.js` helper (Bearer token, JSON)

### Mobile (`apps/mobile`)
- **Framework:** Expo SDK 51 (managed)
- **Dil:** React Native (JavaScript, TS değil)
- **Routing:** @react-navigation/native + native-stack + bottom-tabs
- **State/data:** @tanstack/react-query
- **Push:** expo-notifications
- **Camera:** expo-camera + expo-image-picker
- **Storage:** @react-native-async-storage/async-storage (token)

### Monorepo
- **pnpm workspaces** (root `pnpm-workspace.yaml`)
- Klasörler: `apps/api`, `apps/web`, `apps/mobile`, `packages/shared` (zod şemaları + sabitler)
- Her app'ın kendi `package.json`'ı var; bağımsız çalışır.

### Geliştirme ortamı
- `docker-compose.yml` — sadece postgres servisi
- `.env.example` her app'ta — gerçek `.env` git'e girmez
- Tek komutla başlatma: kök dizinde `pnpm dev` → API + Web paralel; mobile için ayrıca `pnpm --filter mobile start`

---

## 2. Veri modeli — Prisma şeması (kesin)

```prisma
// apps/api/prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id           String   @id @default(cuid())
  externalId   String   @unique  // dış auth servisinden
  email        String   @unique
  displayName  String
  avatarUrl    String?
  createdAt    DateTime @default(now())

  memberships  TeamMember[]
  taskRuns     TaskRun[]    @relation("Assignee")
  decisions    Approval[]   @relation("Approver")
}

model TeamRef {
  id          String   @id @default(cuid())
  externalId  String?  @unique  // dış team servisi
  name        String
  code        String   @unique
  createdAt   DateTime @default(now())

  members     TeamMember[]
  assignments Assignment[]
}

enum TeamRole { MANAGER  MEMBER }

model TeamMember {
  id      String    @id @default(cuid())
  team    TeamRef   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamId  String
  user    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId  String
  role    TeamRole  @default(MEMBER)

  @@unique([teamId, userId])
}

model QuestionGroup {
  id        String     @id @default(cuid())
  name      String
  createdAt DateTime   @default(now())
  questions Question[]
  tasks     Task[]
}

enum AnswerType { YES_NO  YES_NO_NA  TEXT  NUMBER }

model Question {
  id          String        @id @default(cuid())
  group       QuestionGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  groupId     String
  text        String
  answerType  AnswerType    @default(YES_NO)
  weight      Int           @default(3)  // 1-5
  required    Boolean       @default(true)
  order       Int
}

model TaskGroup {
  id                  String   @id @default(cuid())
  name                String
  description         String?
  requiresApproval    Boolean  @default(false)  // grup sonu onay (task'lar override edebilir)
  minFiles            Int      @default(0)
  recurrence          String?  // null | "DAILY" | "WEEKLY:1,3,5" | "MONTHLY:1"
  createdAt           DateTime @default(now())

  tasks       Task[]
  assignments Assignment[]
}

model Task {
  id                String         @id @default(cuid())
  group             TaskGroup      @relation(fields: [groupId], references: [id], onDelete: Cascade)
  groupId           String
  name              String
  description       String?
  order             Int
  estimatedMinutes  Int            @default(15)
  minFiles          Int            @default(0)
  requiresApproval  Boolean        @default(false)
  questionGroup     QuestionGroup? @relation(fields: [questionGroupId], references: [id])
  questionGroupId   String?
  // dependsOn: bu task başlamadan önce tamamlanmış olması gereken task ID'leri (aynı grup içinde)
  dependsOn         String[]       @default([])
}

enum AssignmentStatus { SCHEDULED  ACTIVE  COMPLETED  CANCELLED }

model Assignment {
  id              String           @id @default(cuid())
  group           TaskGroup        @relation(fields: [groupId], references: [id])
  groupId         String
  team            TeamRef          @relation(fields: [teamId], references: [id])
  teamId          String
  startsAt        DateTime
  endsAt          DateTime
  approverId      String?          // null = grubun varsayılanı
  status          AssignmentStatus @default(SCHEDULED)
  createdAt       DateTime         @default(now())

  runs            TaskGroupRun[]
}

enum RunStatus { PENDING  IN_PROGRESS  COMPLETED  CANCELLED }

model TaskGroupRun {
  id            String      @id @default(cuid())
  assignment    Assignment  @relation(fields: [assignmentId], references: [id])
  assignmentId  String
  date          DateTime    // recurrence'tan üretilen instance günü
  status        RunStatus   @default(PENDING)

  taskRuns      TaskRun[]
}

enum TaskRunStatus { BLOCKED  PENDING  IN_PROGRESS  AWAITING_APPROVAL  DONE  APPROVED  REJECTED }

model TaskRun {
  id          String         @id @default(cuid())
  run         TaskGroupRun   @relation(fields: [runId], references: [id], onDelete: Cascade)
  runId       String
  task        Task           @relation(fields: [taskId], references: [id])
  taskId      String
  assignee    User?          @relation("Assignee", fields: [assigneeId], references: [id])
  assigneeId  String?
  status      TaskRunStatus  @default(BLOCKED)
  startedAt   DateTime?
  completedAt DateTime?

  proofs      Proof[]
  answers     Answer[]
  approvals   Approval[]

  @@unique([runId, taskId])
}

model Proof {
  id         String   @id @default(cuid())
  taskRun    TaskRun  @relation(fields: [taskRunId], references: [id], onDelete: Cascade)
  taskRunId  String
  key        String   // dış file servisindeki obje anahtarı
  filename   String
  mime       String
  sizeBytes  Int
  uploadedAt DateTime @default(now())
}

model Answer {
  id          String   @id @default(cuid())
  taskRun     TaskRun  @relation(fields: [taskRunId], references: [id], onDelete: Cascade)
  taskRunId   String
  question    Question @relation(fields: [questionId], references: [id])
  questionId  String
  value       String   // "EVET" | "HAYIR" | "NA" | serbest metin | sayı
  note        String?
}

enum ApprovalDecision { PENDING  APPROVED  CHANGES_REQUESTED }

model Approval {
  id         String           @id @default(cuid())
  taskRun    TaskRun          @relation(fields: [taskRunId], references: [id], onDelete: Cascade)
  taskRunId  String
  approver   User?            @relation("Approver", fields: [approverId], references: [id])
  approverId String?
  decision   ApprovalDecision @default(PENDING)
  comment    String?
  decidedAt  DateTime?
  createdAt  DateTime         @default(now())
}

model Notification {
  id         String   @id @default(cuid())
  userId     String
  kind       String   // "ASSIGNMENT_NEW" | "TASK_DUE_SOON" | "APPROVAL_REQUESTED" | "APPROVAL_RESULT" | ...
  title      String
  body       String
  data       Json?
  readAt     DateTime?
  createdAt  DateTime @default(now())
}
```

---

## 3. İş kuralları (kesin)

1. **dependsOn döngü:** Task oluşturulurken aynı grup içinde topolojik sıralama yapılır; döngü oluşursa 400.
2. **dependsOn kilit:** TaskRun status `BLOCKED` ile başlar; tüm `dependsOn` task'larının TaskRun'ları `APPROVED` (onay gerekiyorsa) veya `DONE` (gerekmiyorsa) olduğunda otomatik `PENDING`'e geçer.
3. **Min dosya:** TaskRun `DONE`'a geçmeden önce `proofs.length >= task.minFiles` olmalı.
4. **Checklist:** Task'a bağlı `questionGroup` varsa, tüm `required` sorular cevaplanmadan `DONE`'a geçilemez.
5. **Onay:** `requiresApproval = true` ise tamamlanma `AWAITING_APPROVAL` → onaylanırsa `APPROVED`, reddedilirse `REJECTED` (yeniden çalışma için `IN_PROGRESS`'e döner, sayaç artar).
6. **Atama tarihleri:** `endsAt > startsAt`. Recurrence varsa `startsAt`+`endsAt` aralığı tek bir instance penceresi olarak yorumlanır; her gün/hafta için ayrı `TaskGroupRun` üretilir.
7. **Grup sonu onayı:** Atamada `approverId` set edilmişse grubun varsayılanını ezer.
8. **Bildirimler:** Her durum geçişinde `Notification` üretilir + push adaptörüne gönderilir (mock).

---

## 4. REST API yüzeyi (kesin)

Tüm endpoint'ler `/api` prefix'iyle, JSON, JWT Bearer (login hariç).

### Auth
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }` (mock: herhangi bir password kabul)
- `GET  /api/auth/me` — token sahibinin user + memberships

### Teams
- `GET    /api/teams`
- `POST   /api/teams`  `{ name, code }`
- `POST   /api/teams/sync/:externalId` — dış servisten yenile
- `GET    /api/teams/users/search?q=`
- `POST   /api/teams/:teamId/members`  `{ userId, role }`
- `DELETE /api/teams/:teamId/members/:userId`
- `POST   /api/teams/:teamId/members/:userId/role`  `{ role }`

### Question Groups
- `GET    /api/question-groups`
- `POST   /api/question-groups`  `{ name }`
- `GET    /api/question-groups/:id`
- `PUT    /api/question-groups/:id`  `{ name }`
- `DELETE /api/question-groups/:id`
- `POST   /api/question-groups/:id/questions`  `{ questions: [...] }` (full replace)

### Task Groups & Tasks
- `GET    /api/task-groups`
- `POST   /api/task-groups`  `{ name, description?, requiresApproval?, minFiles?, recurrence?, tasks: [...] }`
- `GET    /api/task-groups/:id`
- `PUT    /api/task-groups/:id`
- `DELETE /api/task-groups/:id`
- `POST   /api/task-groups/:id/tasks/reorder`  `{ taskIds: [...] }`

### Assignments
- `GET    /api/assignments?teamId=&status=&from=&to=`
- `POST   /api/assignments`  `{ groupId, teamId, startsAt, endsAt, approverId? }`
- `POST   /api/assignments/quick`  `{ groupId, target: { kind: "TEAM" | "USER", id }, when: "NOW" | "TODAY" | "TOMORROW" | ISO }` — mobil hızlı atama
- `PUT    /api/assignments/:id`
- `POST   /api/assignments/:id/cancel`

### Task Runs (mobil için)
- `GET    /api/task-runs/mine/today` — login user için bugünkü açık task run'lar
- `GET    /api/task-runs/mine/stats` — `{ completedToday, completedWeek, streak }`
- `GET    /api/task-runs/pool` — havuz listesi. Query: `scope=mine|team|all`, `teamId`, `status` (CSV), `from`, `to`, `groupId`, `q` (arama)
- `GET    /api/task-runs/:id` — detay (task, run, proofs, answers)
- `POST   /api/task-runs/:id/start` → `IN_PROGRESS`
- `POST   /api/task-runs/:id/answer`  `{ questionId, value, note? }`
- `POST   /api/task-runs/:id/proof`  `{ key, filename, mime, sizeBytes }` (yükleme dış servisten önce yapılır)
- `POST   /api/task-runs/:id/complete` → `DONE` veya `AWAITING_APPROVAL`

### Approvals
- `GET  /api/approvals/queue?teamId=&overdue=`
- `POST /api/approvals/:id/decide`  `{ decision: "APPROVED" | "CHANGES_REQUESTED", comment? }`
- `POST /api/approvals/bulk-decide`  `{ ids: [...], decision, comment? }`

### Files (presigned URL)
- `POST /api/files/upload-url`  `{ filename, mime, sizeBytes }` → `{ key, uploadUrl, headers }`
- `GET  /api/files/download/:key` → `{ url }` (kısa ömürlü)

### Reports
- `GET /api/reports/overview?from=&to=&teamId=` → `{ kpis, daily, teamScores }`

### Notifications
- `GET  /api/notifications?unread=`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/push-token`  `{ token }` (Expo push token kayıt)

---

## 5. Dış servis adaptörleri (interface + mock)

`packages/shared/src/adapters/` altında interface'ler, `apps/api/src/adapters/mock/` altında mock'lar.

```ts
// AuthAdapter
authenticate(email, password) → { externalId, email, displayName, avatarUrl? }

// TeamsAdapter
getTeam(externalId) → { externalId, name, code, members: [{ userId, role }] }
searchUsers(query) → User[]

// FilesAdapter
createUploadUrl({ filename, mime, sizeBytes }) → { key, uploadUrl, headers }
createDownloadUrl(key) → { url }

// PushAdapter
sendToUser(userId, { title, body, data })  // mock: console.log + DB insert
```

**Mock davranış:**
- Auth: önceden seed edilmiş 8 kullanıcı; herhangi bir password kabul.
- Teams: sabit 3 takım (Bahçeşehir, Kadıköy, Ataşehir).
- Files: `uploadUrl` aslında local `apps/api/uploads/` klasörüne PUT alır; `key` = uuid + ext.
- Push: gerçek gönderim yok; `Notification` tablosuna yazılır + log.

---

## 6. Mock data seed (kesin)

`apps/api/prisma/seed.js`:
- 8 kullanıcı (admin@provit.test + 7 üye)
- 3 takım, her takımda 1 manager + 2-3 üye
- 2 soru grubu: "Açılış Kontrolü" (5 soru), "Kapanış Kontrolü" (4 soru)
- 3 task group:
  - "Sabah Açılış Rutini" (4 task, recurrence DAILY, dependsOn zinciri)
  - "Haftalık Stok Kontrolü" (3 task, recurrence WEEKLY:1)
  - "Aylık Bakım" (5 task, no recurrence)
- 6 atama (geçmiş + bugün + gelecek karışık) → otomatik run + taskRun üretimi
- Bugünkü atama için bazı taskRun'lar `DONE`, bazıları `AWAITING_APPROVAL`, bazıları `BLOCKED`
- 4 bekleyen approval

`pnpm --filter api seed` ile çalışır.

---

## 7. Web ekranları (Yön A — Provit Design.html birebir)

| Route                | Sayfa            | İçerik                                                                |
|----------------------|------------------|-----------------------------------------------------------------------|
| `/login`             | Login            | Email + password, "test hesapları" hint kutusu                         |
| `/`                  | Dashboard        | Bugünkü ajanda timeline + KPI + onay bekleyenler özeti                |
| `/teams`             | Teams            | Sol takım listesi, sağ üye yönetimi (rol + ekle/çıkar)                |
| `/checklists`        | Checklists       | Sol soru grupları, sağ soru editörü (sıralama + ağırlık + zorunluluk) |
| `/task-groups`       | Task Groups      | Liste + "Yeni" wizard (3 adım: grup → tasks → dependsOn DAG)          |
| `/task-groups/:id`   | Task Group detay | Düzenleme + atama listesi                                              |
| `/assignments/new`   | Atama oluştur    | TaskGroup × Team × tarih + approver override                          |
| `/timeline`          | Timeline         | Kanban / Gantt toggle (status sütunları / gün × takım grid)           |
| `/approvals`         | Approvals        | Sol kuyruk (filtre + bulk seç), sağ detay (foto + cevap diff)         |
| `/reports`           | Reports          | KPI kartları, günlük tamamlanma çizgisi, takım × gün heatmap          |
| `/notifications`     | Notifications    | Liste + okundu işaretle                                                |

**Tasarım tokenları (Yön A):**
```css
--bg: #FAF8F4;        /* sıcak krem */
--surface: #FFFFFF;
--ink: #1F2A1C;       /* koyu zeytin-siyah */
--ink-soft: #6B7568;
--mute: #9AA392;
--line: #EEE9E0;
--accent: #5C7A4F;    /* zeytin yeşili */
--accent-soft: #DCE6D2;
--warn: #C97B3B;
--danger: #A8332B;
--radius: 12px;
--shadow: 0 1px 2px rgba(31,42,28,.04), 0 8px 24px rgba(31,42,28,.06);
```

Fontlar: Inter Tight (UI), Instrument Serif (büyük başlık), Geist Mono (monospace etiketler).

---

## 8. Mobil ekranları (Expo)

| Route          | Ekran          | İçerik                                                          |
|----------------|----------------|-----------------------------------------------------------------|
| Login          | Login          | Email + password                                                |
| Today          | Tab 1          | Selamlama + ilerleme barı + grup kartları + task listesi        |
| Pool           | Tab 2          | Havuz: segment (Bana/Takım/Tümü) + filtre çipleri + liste       |
| Approvals      | Tab 3 (manager)| Kart akışı: foto thumbs + cevap özeti + Onay/Düzelt             |
| Profile        | Tab 4          | Avatar, takımlar, KPI, bildirim ayarı, çıkış                    |
| TaskWizard     | Modal          | Adım adım: başlat → foto çek → checklist → tamamla              |
| QuickAssign    | Modal (FAB)    | Hızlı atama: görev grubu → kişi/takım → ne zaman                |
| TaskGroupDetail| Stack          | Atama kapsamı + task listesi (status renkleri)                  |
| Notifications  | Stack          | Liste                                                            |

**Push:** İlk açılışta token al → `/api/notifications/push-token`'a gönder.

---

## 9. Test hesapları (mock)

```
admin@provit.test  / herhangi   → 3 takımın yöneticisi
ayse@provit.test   / herhangi   → Bahçeşehir manager
mehmet@provit.test / herhangi   → Bahçeşehir member
zeynep@provit.test / herhangi   → Kadıköy member
...
```

---

## 10. Kabul kriterleri (DoD)

Claude Code'un teslim ettiğinde aşağıdakiler ÇALIŞIYOR olmalı:

1. `docker compose up -d` → postgres ayakta
2. `pnpm install && pnpm --filter api db:push && pnpm --filter api seed`
3. `pnpm dev` → API (4000) + Web (5173) açık
4. Web'te `admin@provit.test` ile giriş → Dashboard'da bugünkü atamalar görünüyor
5. `/task-groups` → wizard ile yeni grup oluşturulabiliyor (DAG döngüsü engelleniyor)
6. `/approvals` → bekleyen onaya tıklanıyor, onaylanınca kuyruktan düşüyor + notification düşüyor
7. `pnpm --filter mobile start` → Expo Go ile bağlanılıyor; aynı kullanıcıyla login → Today ekranı dolu
8. Mobil TaskWizard: foto seç → mock upload → checklist doldur → tamamla → web tarafı approvals'a düşüyor
9. Tüm ekranlar `Provit Design.html`'deki Yön A görseliyle eşleşiyor (renk, tipografi, boşluk)

---

## 11. Klasör yapısı (kesin)

```
provit/
├─ docker-compose.yml
├─ package.json            (workspaces root, scripts: dev/seed/test)
├─ pnpm-workspace.yaml
├─ Provit Design.html      (görsel referans — değiştirme)
├─ CLAUDE_CODE_SPEC.md     (bu dosya)
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  └─ seed.js
│  │  ├─ src/
│  │  │  ├─ index.js              (express bootstrap)
│  │  │  ├─ db.js                 (prisma client)
│  │  │  ├─ auth.js               (jwt middleware)
│  │  │  ├─ errors.js
│  │  │  ├─ routes/
│  │  │  │  ├─ auth.js
│  │  │  │  ├─ teams.js
│  │  │  │  ├─ questionGroups.js
│  │  │  │  ├─ taskGroups.js
│  │  │  │  ├─ assignments.js
│  │  │  │  ├─ taskRuns.js
│  │  │  │  ├─ approvals.js
│  │  │  │  ├─ files.js
│  │  │  │  ├─ reports.js
│  │  │  │  └─ notifications.js
│  │  │  ├─ services/
│  │  │  │  ├─ deps.js            (dependsOn cycle + unblock)
│  │  │  │  ├─ recurrence.js      (run instance üretimi)
│  │  │  │  └─ teams.js
│  │  │  ├─ adapters/
│  │  │  │  └─ mock/              (auth, teams, files, push)
│  │  │  └─ jobs/
│  │  │     ├─ recurrence.js      (cron)
│  │  │     └─ reminders.js       (cron)
│  │  ├─ uploads/                 (gitignore)
│  │  ├─ .env.example
│  │  └─ package.json
│  ├─ web/
│  │  ├─ index.html
│  │  ├─ vite.config.js
│  │  ├─ src/
│  │  │  ├─ main.jsx              (router)
│  │  │  ├─ api.js
│  │  │  ├─ auth.jsx              (context + ProtectedRoute)
│  │  │  ├─ styles.css            (tasarım tokenları)
│  │  │  ├─ components/           (Card, Button, Modal, EmptyState, …)
│  │  │  └─ pages/                (Login, Dashboard, Teams, Checklists,
│  │  │                            TaskGroups, Assignments, Timeline,
│  │  │                            Approvals, Reports, Notifications)
│  │  └─ package.json
│  └─ mobile/
│     ├─ App.js
│     ├─ app.json
│     ├─ src/
│     │  ├─ api.js
│     │  ├─ auth.js
│     │  ├─ theme.js
│     │  ├─ navigation.js
│     │  ├─ push.js
│     │  └─ screens/              (Login, Today, Approvals, Profile,
│     │                            TaskWizard, TaskGroupDetail, Notifications)
│     └─ package.json
└─ packages/
   └─ shared/
      ├─ src/
      │  ├─ schemas.js            (zod)
      │  ├─ enums.js
      │  └─ adapters.js           (interface tipleri)
      └─ package.json
```

---

## 12. Yapma listesi — Claude Code için sıralı adımlar

1. Monorepo iskeleti + `docker-compose.yml` + workspace config
2. `apps/api`: prisma şeması → `db:push` → seed → temel express bootstrap → auth middleware
3. `apps/api`: route'lar (önce auth, teams, question-groups, task-groups; sonra assignments, task-runs, approvals, files, reports, notifications)
4. `apps/api`: dependsOn servisi + recurrence cron + reminder cron
5. `apps/api`: mock adapter'lar (auth, teams, files local disk, push log)
6. `apps/api`: minimal vitest ile dependsOn döngü testi + recurrence testi
7. `apps/web`: Vite kurulum + tasarım tokenları + auth context + Login + Dashboard
8. `apps/web`: kalan sayfalar (Teams, Checklists, TaskGroups wizard, Timeline, Approvals, Reports, Notifications)
9. `apps/mobile`: Expo init + auth + tab navigator + Today
10. `apps/mobile`: TaskWizard (camera + upload + checklist) + Approvals + Profile
11. Push entegrasyonu (mock — token kayıt akışı tamamen çalışsın)
12. README — çalıştırma talimatları + test hesapları + bilinen mock sınırları

---

## 13. Bilinçli kapsam dışı (production'a hazırlanırken eklenecek)

- Gerçek SSO / OIDC bağlantısı
- Gerçek S3 / object storage
- Gerçek Expo push gönderimi (sadece mock — adaptör hazır)
- Çoklu organizasyon (multi-tenant)
- Audit log
- E2E test (Playwright/Detox)
- CI/CD

Bu öğelerin **interface'leri hazır**; production geçişi tek dosya değişikliği olmalı.

---

**Bitiş kriteri:** Bir geliştirici bu repo'yu klonlayıp `pnpm install && docker compose up -d && pnpm --filter api db:push && pnpm --filter api seed && pnpm dev` çalıştırdığında 60 saniye içinde web + api ayakta olmalı; `pnpm --filter mobile start` ile mobile dev menüsüne girilebilmeli.
