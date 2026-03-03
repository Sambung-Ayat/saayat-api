### Prompt: NestJS Backend for Sambung Ayat (Clone Backend Logic)

**Context**

Saya punya project Next.js bernama `sambung-ayat` yang backend‑nya saat ini menggunakan:

- Prisma + PostgreSQL
- Supabase Auth (OAuth, hanya Google yang dipakai realnya)
- API route di `app/api/*` untuk:
  - generate soal sambung ayat
  - validasi jawaban + pencatatan progress, streak, dan poin
  - leaderboard
  - data surah per juz
  - user profile (display name, stats, delete account)
- Konsep **guest user** (user anonim) dengan cookie `guest_id` yang nanti di-merge ke user “asli” ketika login.

Saya ingin memisahkan backend ini menjadi **backend terpisah menggunakan NestJS**, dengan **logic bisnis yang sama persis** (boleh ada sedikit penyesuaian teknis), tapi dengan stack berikut:

- Framework backend: **NestJS**
- DB: **PostgreSQL**
- ORM: **TypeORM**
- Validasi & transformasi: **class-validator** + **class-transformer**
- Auth: **Passport.js** dengan **OAuth 2 Google saja** (tidak ada login email/password sama sekali)
- Caching / helper: **Redis** (untuk cache hal yang sesuai, misalnya data surah per juz)
- Tambahan: **Docker Compose** untuk Postgres + Redis

Tugas kamu: bangun struktur backend NestJS lengkap (entity, module, service, controller, guard, middleware, config, dsb.) berdasarkan spesifikasi detail di bawah dan generate skeleton kode + implementasi utama.

---

### 1. Data Model (TypeORM Entities)

Gunakan PostgreSQL dengan TypeORM, dan buat entity yang mengikuti schema berikut (ini adaptasi 1:1 dari Prisma schema saya):

#### 1.1 `User` entity

Field:

- `id: string`  
  - Primary key, default UUID v4.
- `createdAt: Date`  
  - Default `now()`.
- `lastActiveAt: Date`  
  - Selalu diupdate setiap aktivitas relevan (mis. jawaban benar, update stats).
- `isGuest: boolean` (default `true`)  
  - `true` untuk guest user (berbasis `guest_id` cookie).
  - `false` untuk user yang sudah terhubung ke akun Google.
- `email: string | null` (unique, nullable)  
  - Terisi hanya untuk user non-guest yang login via Google.
- `provider: string | null`  
  - Misalnya `"google"`.
- `displayName: string | null`  
  - Nama tampilan user.
- `totalCorrect: number` (default 0)  
- `totalAttempted: number` (default 0)  
- `currentStreak: number` (default 0)  
  - Streak harian (berapa hari berturut‑turut user aktif dan menjawab benar).
- `longestStreak: number` (default 0)  
- `currentCorrectStreak: number` (default 0)  
  - Streak jawaban benar berturut‑turut.
- `longestCorrectStreak: number` (default 0)  
- `totalPoints: number` (default 0)

Relasi:

- `sessions: Session[]`
- `answers: Answer[]`

#### 1.2 `Session` entity

Field:

- `id: string` (UUID pk)
- `userId: string` (FK → `User.id`)
- `startedAt: Date` (default `now()`)
- `endedAt: Date | null`
- `totalQuestions: number` (default 0)
- `correctAnswers: number` (default 0)
- `comboStreak: number` (default 0)  
  - Streak jawaban benar berturut‑turut **di dalam sesi ini**.
- `maxCombo: number` (default 0)
- `totalPoints: number` (default 0)
- `maxQuestions: number` (default 10)  
  - Limit jumlah soal di sesi ini.

Relasi:

- `user: User`
- `answers: Answer[]`

#### 1.3 `Answer` entity

Field:

- `id: string` (UUID pk)
- `userId: string` (FK → `User.id`)
- `sessionId: string | null` (FK → `Session.id`, nullable)
- `ayahId: number`  
  - Global ayah number (1–6236).
- `isCorrect: boolean`
- `createdAt: Date` (default `now()`)

Relasi:

- `user: User`
- `session: Session | null`

---

### 2. Tipe Data Quran & Question (DTO/Interface)

Adaptasi dari `types/quran.ts` di project asal. Definisikan tipe dan DTO berikut di NestJS:

- `Ayah`:
  - `number: number` (global ayah number)
  - `text: string`
  - `surah: { number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType }`
  - `numberInSurah: number`
  - `juz, manzil, page, ruku, hizbQuarter`
  - `sajda: boolean | { id; recommended; obligatory }`
  - `audio?: string`
  - `translation?: string`

- `QuestionOption`:
  - `id: number` (global ayah number)
  - `text: string`
  - `surah: number`
  - `ayah: number`

- `Question` (yang dikirim ke frontend):
  - `currentAyah: { id, text, surah, surahName?, surahEnglishName?, ayah, audio?, translation? }`
  - `options: QuestionOption[]`

- Internal type `GeneratedQuestion`:
  - Sama seperti `Question` tapi ada tambahan:
  - `correctAyahId: number`

- `ValidationRequestDTO` (class-validator):
  - `selectedAyahId: number` (required, integer)
  - `currentAyahId: number` (required, integer)
  - `sessionLimit?: number` (optional, integer; default 10 ketika tidak diisi)

- `ValidationResponseDTO`:
  - `isCorrect: boolean`
  - Optional:
    - `currentStreak?: number`
    - `longestStreak?: number`
    - `currentCorrectStreak?: number`
    - `comboStreak?: number`
    - `pointsGained?: number`
    - `totalPoints?: number`
    - `remainingQuestions?: number`
    - `sessionFinished?: boolean`
    - `correctAyah?: { id, text, surah, ayah }` (hanya jika `isCorrect === false`)

Gunakan `class-validator` + `class-transformer` di DTO request, dan kembalikan response sesuai type di atas.

---

### 3. Auth & User Management (Passport Google OAuth2 + Guest User)

#### 3.1 Strategi Auth

- Gunakan **Passport.js** di NestJS dengan strategy:
  - `passport-google-oauth20` atau setara.
- Hanya sediakan login via Google OAuth2:
  - Tidak ada login email/password lokal.
  - Endpoint login misalnya `/auth/google` → redirect ke Google.
  - Callback misalnya `/auth/google/callback`.

#### 3.2 Model & Persistensi User saat Login

Di callback Google:

1. Ambil profile Google:
   - Use `profile.id`, `profile.emails[0].value`, `profile.displayName`, dsb.
2. Mapping ke database:
   - Cari `User` dengan `email = googleEmail` atau misalnya dengan kombinasi `provider = 'google'` + `providerId` (boleh buat kolom baru `providerId` jika perlu, atau gunakan `id` sebagai `providerId`).
   - Jika belum ada:
     - Buat `User` baru:
       - `isGuest = false`
       - `email = googleEmail`
       - `provider = 'google'`
       - `displayName = profile.displayName` atau nama default `"Hamba Allah"` jika kosong
       - Statistik awal (streak, poin) 0, **kecuali** nanti ada merge dari guest (lihat poin guest).
   - Jika sudah ada:
     - Pakai user tersebut.

3. Simpan informasi user dalam session / JWT:
   - Boleh gunakan:
     - Session berbasis cookie (misal `express-session` + store)
     - Atau JWT di cookie httpOnly
   - Yang penting: di request berikutnya, kita bisa dapat `userId` untuk dipakai di service.

#### 3.3 Guest User via Cookie `guest_id`

Replikasi konsep guest user dari project asal:

- Jika user belum login Google:
  - Backend tetap ingin track progres user (streak, poin, dsb.) sebagai **guest**.
- Mekanisme:
  - Gunakan cookie `guest_id` (string UUID).
  - Middleware/guard global:
    - Jika request tidak punya session user **dan** tidak ada `guest_id`:
      - Generate UUID -> set cookie `guest_id` (httpOnly, secure di prod, path `/`).
      - Buat `User` baru di DB:
        - `id = guest_id`
        - `isGuest = true`
        - `displayName` default misalnya `Hamba-<4digit rand>`.
        - Stats awal 0.
    - Jika sudah ada `guest_id`, pastikan user guest-nya ada di DB; kalau belum, create seperti di atas (handle possible race).
- `getCurrentUser` equivalent di Nest:
  - Service (misalnya `AuthUserService`) yang:
    - Jika ada session user (hasil login Google) → return user non-guest dari DB (create jika belum ada).
    - Kalau tidak ada session user:
      - Ambil `guest_id` dari cookie.
      - Cari atau create guest user seperti di atas.
    - Return instance `User`.

#### 3.4 Merge Guest → Logged-In User di Callback

Di callback Google (setelah sukses auth):

- Cek apakah request punya cookie `guest_id`:
  - Jika ada:
    1. Ambil guest user by `id = guest_id` (harus `isGuest = true`).
    2. Ambil / create user non-guest berdasarkan info Google (lihat 3.2).
    3. Merge statistik:
       - `totalCorrect`: `user.totalCorrect + guest.totalCorrect`
       - `totalAttempted`: `user.totalAttempted + guest.totalAttempted`
       - `totalPoints`: `user.totalPoints + guest.totalPoints`
       - Streak:
         - Boleh gunakan logika sederhana: ambil **max** dari `currentStreak`, `longestStreak`, `currentCorrectStreak`, `longestCorrectStreak` (atau boleh copy logika yang sama seperti di project asal: _untuk total_ dijumlah, streak pakai logika wajar).
    4. Pindahkan semua data relasi:
       - `Answer`: semua row `userId = guest_id` → update ke `user.id`.
       - `Session`: semua row `userId = guest_id` → update ke `user.id`.
    5. Hapus `guest` user dari DB.
    6. Hapus cookie `guest_id`.
- Setelah merge, user yang aktif adalah user Google (non-guest), dan session auth diset sesuai.

#### 3.5 Endpoint terkait user

Adaptasi berikut:

- `GET /user/current`:
  - Sama seperti `app/api/user/current/route.ts`.
  - Harus:
    - Mengambil user melalui service `getCurrentUser` (bisa return guest atau logged-in).
    - Jika tidak ada user sama sekali (harusnya tidak terjadi jika guest logic benar) → 401.
  - Response:
    - `{ id, email, displayName, isGuest, totalCorrect, totalPoints, longestStreak }`

- `PUT /user/display-name`:
  - Hanya untuk user yang **authenticated via Google** (bukan guest).
  - Validasi body dengan DTO:
    - `displayName: string` (required, max 50 chars, trim).
  - Ambil user dari session (bukan guest).
  - Update `displayName` di DB.
  - Kembalikan `{ success: true, user: { id, displayName, email } }`.

- `DELETE /user`:
  - Hanya untuk user auth Google.
  - Flow:
    - Ambil `userId` dari session.
    - Di dalam transaction:
      - Hapus semua `Answer` dengan `userId`.
      - Hapus semua `Session` dengan `userId`.
      - Hapus `User`.
    - Logout user (hapus session / token).
    - Kembalikan `{ success: true, message: 'Account deleted successfully' }`.

---

### 4. Game Logic: Question + Validation + Session/Stats

#### 4.1 Endpoint: `GET /question`

Adaptasi dari `app/api/question/route.ts`:

Request (query params):

- `juz` (bisa multiple, mis: `?juz=1&juz=2` atau `?juz=1,2`)
  - Kumpulan angka 1–30.
- `surah` (optional; string, bisa single atau koma-separator; forward saja ke generator untuk filter).
- `lang` (`'id' | 'en'`, default `'id'` kalau tidak valid/diisi).

Behavior:

1. Parse `juz`:
   - Normalisasi: kumpulkan semua nilai, split `,`, trim, filter kosong, parse `int`.
   - Hilangkan duplikat (Set).
   - Validasi: jika ada angka di luar 1–30 atau parse error → 400 dengan pesan `"Invalid Juz number. Must be between 1 and 30."`.
   - Representasi final:
     - Jika tidak ada `juz` → berarti tidak filter khusus (generator bebas).
     - Jika satu angka → kirim sebagai single number.
     - Jika banyak → kirim array.
2. `lang`:
   - Jika `'en'` → English; lainnya `'id'`.
3. Panggil service `QuestionService.generateQuestion(juz?, surah?, lang)`:
   - Service ini akan:
     - Mengambil ayat dari sumber eksternal (lihat 5).
     - Memilih satu ayat sebagai `currentAyah` dan beberapa opsi next ayah sebagai `options`.
     - Mengembalikan `GeneratedQuestion` (yang berisi `correctAyahId`).
4. Response ke client berupa `Question` PUBLIC:
   - Jangan expose `correctAyahId`.
   - Hanya kirim `currentAyah` dan `options`.

#### 4.2 Endpoint: `POST /validate`

Adaptasi dari `app/api/validate/route.ts` dengan logic yang sama:

Request body (JSON):

- `selectedAyahId: number` (required)
- `currentAyahId: number` (required)
- `sessionLimit?: number` (optional, default 10)

Langkah:

1. Validasi input (`class-validator`).
   - Jika `selectedAyahId` atau `currentAyahId` missing → 400 `{ error: 'Missing selectedAyahId or currentAyahId' }`.
2. Panggil service `QuranService.fetchNextAyah(currentAyahId)`:
   - Harus mengembalikan `Ayah` yang merupakan **ayat berikutnya** dari `currentAyahId`.
3. Tentukan:
   - `isCorrect = (nextAyah.number === selectedAyahId)`.
4. **Simpan progress untuk user**:
   - Ambil user via `getCurrentUser`:
     - Bisa guest atau logged-in; kalau tidak ada user, boleh skip DB update dengan try/catch (seperti di kode asal).
   - Jika user ada:
     1. Cari session aktif:
        - `Session` dengan `userId = user.id` dan `endedAt IS NULL`.
     2. Tentukan `targetLimit = sessionLimit || 10`.
     3. Jika session ada tapi:
        - `totalQuestions >= (maxQuestions || 10)` **atau**
        - `(maxQuestions || 10) !== targetLimit`  
        maka:
        - Tutup session lama: set `endedAt = now()`.
        - Anggap tidak ada session aktif lagi.
     4. Jika tidak ada session aktif, buat session baru:
        - `userId = user.id`
        - `maxQuestions = targetLimit`.
     5. Ambil `maxQuestions = session.maxQuestions || 10`.
     6. Hitung streak harian:
        - `now = new Date()`, `lastActive = user.lastActiveAt`.
        - `isSameDay = now.toDateString() === lastActive.toDateString()`
        - `yesterday = now - 1 day`
        - `isYesterday = yesterday.toDateString() === lastActive.toDateString()`
        - `newCurrentStreak = user.currentStreak`
        - `newCurrentCorrectStreak = user.currentCorrectStreak || 0`
     7. Sistem poin & combo (harus sama):
        - Jika `isCorrect`:
          - Jika `isSameDay`:
            - `newCurrentStreak = max(user.currentStreak, 1)` (tidak naik hari, tapi minimal 1).
          - Else if `isYesterday`:
            - `newCurrentStreak += 1`.
          - Else:
            - `newCurrentStreak = 1` (streak reset).
          - `newCurrentCorrectStreak += 1`.
          - Combo & poin:
            - `newComboStreak = session.comboStreak + 1`.
            - `basePoint = 10`.
            - Jika `newComboStreak >= 3`:
              - `bonus = newComboStreak * 5`.
            - else:
              - `bonus = 0`.
            - `gainedPoint = basePoint + bonus`.
        - Jika `!isCorrect`:
          - `newCurrentCorrectStreak = 0`.
          - `newComboStreak = 0`.
          - `gainedPoint = 0`.
     8. Update session:
        - `newMaxCombo = max(session.maxCombo, newComboStreak)`.
        - `newTotalQuestions = session.totalQuestions + 1`.
        - `isSessionFinished = newTotalQuestions >= maxQuestions`.
        - Update session row:
          - `totalQuestions += 1`
          - `correctAnswers += 1` (hanya jika `isCorrect`)
          - `comboStreak = newComboStreak`
          - `maxCombo = newMaxCombo`
          - `totalPoints += gainedPoint`
          - `endedAt = now` jika `isSessionFinished`.
     9. Simpan `Answer`:
        - `userId = user.id`
        - `sessionId = session.id`
        - `ayahId = currentAyahId`
        - `isCorrect = isCorrect`.
     10. Update `User` stats:
         - `totalAttempted += 1`
         - `totalCorrect += 1` (kalau `isCorrect`)
         - `currentStreak = newCurrentStreak` (hanya kalau `isCorrect`)
         - `longestStreak = newCurrentStreak > user.longestStreak ? newCurrentStreak : user.longestStreak` (hanya kalau `isCorrect`)
         - `currentCorrectStreak = newCurrentCorrectStreak`
         - `longestCorrectStreak` diupdate kalau `newCurrentCorrectStreak` melebihi nilai sebelumnya.
         - `totalPoints += gainedPoint`
         - `lastActiveAt = now` kalau `isCorrect`.
5. Response:
   - Selalu kembalikan:
     - `isCorrect`
     - Jika `isCorrect`:
       - `currentStreak`
       - `longestStreak`
       - `currentCorrectStreak`
     - Jika user & session ada:
       - `comboStreak: newComboStreak`
       - `pointsGained: gainedPoint`
       - `totalPoints: updatedSession.totalPoints`
       - `remainingQuestions: maxQuestions - newTotalQuestions`
       - `sessionFinished: isSessionFinished`
     - Jika `!isCorrect`:
       - `correctAyah: { id: nextAyah.number, text: nextAyah.text, surah: nextAyah.surah.number, ayah: nextAyah.numberInSurah }`
   - Jika terjadi error tak terduga:
     - 500 `{ error: 'Validation failed' }`.

---

### 5. Surah per Juz & Quran Data

#### 5.1 Endpoint: `GET /surahs`

Adaptasi `app/api/surahs/route.ts`:

Query:

- `juz` (required, bisa multiple/komposisi seperti di `/question`).

Flow:

1. Jika `juz` tidak ada → 400 `{ error: 'Juz parameter is required' }`.
2. Parse `juz`:
   - Sama cara parsing seperti `/question`.
3. Validasi:
   - Minimal 1 angka valid; semua harus 1–30.
   - Kalau tidak valid → 400 `{ error: 'Invalid Juz number' }`.
4. Untuk setiap `juz`:
   - Panggil `QuranService.fetchJuz(juz)` untuk dapat list `Ayah`.
   - Dari list ayah, bentuk map `surahId -> { id, name, englishName }`.
   - Ambil unique surah, sort by `id`.
   - Cache hasil per `juz` memakai Redis (`key` misalnya `juz:<num>:surahs`).
5. Gabungkan surah semua juz yang diminta ke satu set global (tidak duplikat), sort by `id`.
6. Response: array `{ id: number; name: string; englishName: string }[]`.

Gunakan Redis untuk cache `surahsForJuz` per nomor juz.

#### 5.2 Quran Service

- Buat `QuranModule` dan `QuranService` yang bertanggung jawab untuk:
  - `fetchJuz(juz: number): Promise<Ayah[]>`
  - `fetchNextAyah(currentAyahId: number): Promise<Ayah>`
  - `generateQuestion(juz?: number | number[], surah?: string, lang: 'id' | 'en'): Promise<GeneratedQuestion>`
- Implementasi boleh:
  - Memanggil public Quran API yang sama (misal `api.alquran.cloud` atau sesuai project asal).
  - Tambahkan caching Redis untuk panggilan yang sering (terutama `fetchJuz`).

---

### 6. Leaderboard

#### 6.1 Endpoint: `GET /leaderboard`

Adaptasi `app/api/leaderboard/route.ts`:

Query:

- `sortBy?: 'correct' | 'daily' | 'default'` (default `'default'` kalau tidak valid/diisi).

Behavior:

1. Tentukan `orderBy`:
   - Jika `sortBy === 'correct'`:
     - Sort desc by:
       1. `longestCorrectStreak`
       2. `totalCorrect`
   - Jika `sortBy === 'daily'`:
     - Sort desc by:
       1. `longestStreak`
       2. `totalCorrect`
   - Default:
     - Sort desc by:
       1. `totalPoints`
       2. `longestStreak`
2. Ambil top users (10 besar) dengan:
   - `isGuest = false`
   - Field yang dikembalikan:
     - `id`
     - `displayName`
     - `longestStreak`
     - `longestCorrectStreak`
     - `totalCorrect`
     - `totalPoints`
3. Ambil current user dari auth (session Google):
   - Jika ada user:
     - Ambil datanya dari DB (field sama seperti di atas).
     - Hitung ranking global user tersebut dengan **logika sama**:
       - Hitung `betterUsersCount` = jumlah user (non-guest) yang **lebih baik** berdasarkan rule `sortBy`:
         - `sortBy === 'correct'`:
           - User lain dengan:
             - `longestCorrectStreak > user.longestCorrectStreak`, atau
             - `longestCorrectStreak == user.longestCorrectStreak` **dan** `totalCorrect > user.totalCorrect`.
         - `sortBy === 'daily'`:
           - User lain dengan:
             - `longestStreak > user.longestStreak`, atau
             - `longestStreak == user.longestStreak` **dan** `totalCorrect > user.totalCorrect`.
         - Default:
           - User lain dengan:
             - `totalPoints > user.totalPoints`, atau
             - `totalPoints == user.totalPoints` **dan** `longestStreak > user.longestStreak`.
       - `currentUserRank = betterUsersCount + 1`.
4. Response:
   - `{ topUsers, currentUser }`
   - `currentUser`:
     - `null` jika tidak login.
     - Jika ada: `{ id, displayName, longestStreak, longestCorrectStreak, totalCorrect, totalPoints, rank }`.

---

### 7. Struktur NestJS & Modul

Buat struktur kira‑kira seperti ini (boleh menyesuaikan, tapi jaga separation of concerns):

- `AppModule`
- `AuthModule`
  - Passport Google strategy
  - Auth controller (`/auth/google`, `/auth/google/callback`)
  - Session/JWT setup
  - Guard untuk route protected (untuk user Google only).
- `UsersModule`
  - `UsersService` (CRUD dan helper untuk `User`)
  - `CurrentUserGuard` atau decorator `@CurrentUser()`.
- `GameModule`
  - `QuestionController` (`/question`)
  - `ValidationController` (`/validate`)
  - `GameService` (logic session, poin, streak) – gunakan `UsersService` + `SessionsRepository` + `AnswersRepository`.
- `LeaderboardModule`
  - `LeaderboardController` (`/leaderboard`)
  - `LeaderboardService`.
- `QuranModule`
  - `QuranService` (fetch ayat, generate question).
- `SessionsModule` (opsional; bisa digabung ke `GameModule`).
- `DatabaseModule`
  - TypeORM setup (Postgres).
- `RedisModule`
  - Redis client injectable.

Gunakan DTO + Pipes (`ValidationPipe`) global dengan `whitelist` dan `forbidNonWhitelisted`.

---

### 8. Docker Compose

Selain backend NestJS, buat juga file `docker-compose.yml` dengan requirement berikut:

- Service: `postgres`
  - Image: `postgres:17-alpine`
  - Environment:
    - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - Expose port (misal `5432`).
  - Volume untuk data persistence.
- Service: `redis`
  - Image: `redis:latest`
  - Expose port (misal `6379`).
- (Opsional) Service: `backend`
  - Build dari Dockerfile NestJS.
  - Depend on `postgres` dan `redis`.
  - Environment:
    - `DATABASE_URL` (Postgres connection string)
    - `REDIS_URL`/`REDIS_HOST` + `REDIS_PORT`
    - Google OAuth config: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
    - Session/JWT secret.

Pastikan connection string TypeORM di NestJS diarahkan ke Postgres dari docker-compose.

---

### 9. Output yang Diharapkan

Ketika menjalankan prompt ini, tolong:

- Generate:
  - Entity TypeORM (`User`, `Session`, `Answer`).
  - DTO class untuk request/response (validation).
  - Module, Controller, Service untuk:
    - Auth (Passport Google)
    - User (current, display name, delete)
    - Question
    - Validation (game logic)
    - Surahs/juz
    - Leaderboard
  - Service Quran eksternal (boleh stub dengan satu provider API yang jelas).
  - Setup TypeORM + PostgreSQL.
  - Setup Redis client dan pemakaian di surah/juz & caching lain yang relevan.
  - `docker-compose.yml` untuk Postgres 17 (alpine) + Redis latest (dan optionally backend).
- Jaga agar:
  - **Logic bisnis (poin, streak, session, leaderboard, guest merge)** tetap sama seperti yang sudah dijelaskan.
  - Struktur & kode idiomatis NestJS (decorator, module, dependency injection).
  - Gunakan TypeScript penuh.
