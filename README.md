# Academia — Academic Portal

A functional first phase of a college management system, built with Next.js App Router, React, TypeScript, PostgreSQL, Prisma, Tailwind, shadcn-style UI primitives, React Hook Form/Zod, TanStack Table, Recharts and Lucide.

This is the **academic core**, not the complete thirteen-module system. All visible workflow controls connect to real server actions or routes and PostgreSQL. See [the implementation plan](docs/IMPLEMENTATION_PLAN.md) for the remaining phases and [the administrator guide](docs/ADMIN_GUIDE.md) for permissions and operations.

## Implemented

- Six roles, secure opaque database sessions, salted scrypt passwords, login throttling, session revocation and password changes.
- Database-backed role-aware overview, attendance charts, department distribution, class schedules and shared announcements.
- Student registration, generated IDs, detail views, editing and non-destructive archival; department/status filters, search, sorting and pagination.
- Lecturer creation/editing, department and course creation/editing, academic terms and classrooms, weekly class sections with room and lecturer conflict detection.
- Enrollment with concurrency-safe capacity and student timetable checks; withdrawal before attendance is recorded.
- Attendance entry for a complete roster, previous-session editing with before/after audit details, student attendance history, scoped CSV exports and printable reports.
- Server-side role checks and student/lecturer ownership checks; transactionally recorded academic changes; administrator audit search and pagination.
- Responsive mobile navigation, collapsible desktop sidebar, light/dark mode, English/Khmer navigation and common controls, bundled Inter and Noto Sans Khmer fonts. Domain-specific form copy and reports are currently English.

## Quick start

Prerequisites: Node.js 22 or 24, npm, Docker with Compose. PostgreSQL 17 is used locally; an existing PostgreSQL instance can also be configured using `DATABASE_URL`.

```bash
cd /workspace/academic-portal  # or your existing checkout directory
npm ci
npm run setup:local           # creates ignored .env with a random DB password; preserves existing .env
docker compose up -d --wait db
npm run db:generate
npm run db:migrate
```

For an **empty real deployment**, provision an administrator (below), then start the app. For an **isolated demo**, first choose a unique password using a silent prompt:

```bash
read -rs -p "Demo password (12+ characters): " DEMO_PASSWORD
export DEMO_PASSWORD
npm run db:seed
unset DEMO_PASSWORD
npm run dev
```

Open the local app on port 3000 in a normal local-development environment. Cloud onboarding validates it with internal requests; it does not provide a localhost preview link.

The seed creates 32 sample students, 6 lecturers, 8 courses/classes, attendance and announcements. All accounts and academic identifiers are labeled as demo content. Accounts are:

| Role                | Email                           |
| ------------------- | ------------------------------- |
| Super administrator | `superadmin@demo.academic.test` |
| Administrator       | `admin@demo.academic.test`      |
| Registrar           | `registrar@demo.academic.test`  |
| Lecturer            | `lecturer@demo.academic.test`   |
| Student             | `student@demo.academic.test`    |
| Accountant          | `accountant@demo.academic.test` |

Every new demo account uses `DEMO_PASSWORD`; no password is hardcoded. Re-seeding preserves existing accounts/passwords and academic data and only creates missing demo rows. Never seed a production database. This cloud checkout has a random demo password in its ignored, mode-600 `.env`; view it privately in the workspace if needed. Do not commit or paste that file.

## Provision accounts

Account creation requires trusted shell/database access. There is no public registration or default administrator password.

```bash
export ACCOUNT_EMAIL="administrator@your-university.edu"
export ACCOUNT_NAME="Campus Administrator"
export ACCOUNT_ROLE="SUPER_ADMIN"
read -rs -p "Initial password (12+ characters): " ACCOUNT_PASSWORD
export ACCOUNT_PASSWORD
npm run account:create
unset ACCOUNT_PASSWORD ACCOUNT_EMAIL ACCOUNT_NAME ACCOUNT_ROLE
```

Use `ADMIN`, `REGISTRAR`, `LECTURER`, `STUDENT`, or `ACCOUNTANT` as appropriate. A student or lecturer record with the **same email** must already exist before provisioning its linked portal account. Existing accounts are never overwritten. The application currently has no self-service recovery, MFA, user-management screen or reactivation workflow. Use a reviewed administrator procedure for those tasks.

## Configuration

Copy `.env.example` only when configuring manually; never overwrite an existing `.env`. `setup:local` does not overwrite files.

| Variable                         | Purpose                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection string; required. Use appropriately verified TLS for remote databases.                                                                                  |
| `POSTGRES_PASSWORD`              | Local Compose database credential; generated by `setup:local`.                                                                                                                |
| `COOKIE_SECURE`                  | `false` only for HTTP local development; **true** for HTTPS deployments. Defaults to secure in production unless explicitly false.                                            |
| `APP_ORIGIN`                     | Documented public origin for deployment/runbooks. Next.js itself checks Server Action `Origin` against the request host; this setting does not weaken or override that check. |
| `DEMO_PASSWORD`                  | Optional seed-only password; 12–128 characters. Never sent to a client.                                                                                                       |
| `TEST_DATABASE_URL`              | Optional dedicated PostgreSQL database ending in `_test`. Tests refuse the application database.                                                                              |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | Optional system Chromium path. This cloud machine uses `/usr/bin/chromium`.                                                                                                   |

Package installation needs `registry.npmjs.org` and Prisma CLI downloads need `binaries.prisma.sh`, with TLS and artifact verification enabled. Browser downloads, when a system browser is unavailable, additionally require the destinations reported by `npx playwright install chromium` (typically `cdn.playwright.dev` and its redirect host). No external email or payment service is needed for this phase.

## Development and verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

Without a system Chromium installation, run `npx playwright install --with-deps chromium` first, then omit `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Set `PLAYWRIGHT_BROWSERS_PATH` to a writable directory when the default cache is read-only.

The DB runner creates `academic_test` only when the configured app DB is the local `academic` database; otherwise explicitly supply a separate `TEST_DATABASE_URL` ending in `_test`. It applies real migrations and runs integration checks using uniquely scoped records. Browser tests seed the test database and start the production build on port **3100**, which must be free. Set `DEMO_PASSWORD` for the seed. Run them after `npm run build`. Browser screenshots and HTML results are ignored generated artifacts. Trace capture is disabled to avoid recording password interactions. See [validation results](docs/VALIDATION.md).

```bash
npm run build
npm start                   # production server, default port 3000
```

Cloud tasks already have isolated workspaces: use this checkout and do not create a worktree unless explicitly requested. Dependency files and the database persist separately from live processes; PostgreSQL and Next.js must be started again after restoration. Compose stores PostgreSQL in a named Docker volume. **The cloud filesystem snapshot does not establish that Docker volumes are restored.** Keep tested backups outside the container and use the backup/restore runbook before relying on a restored environment.

## Data model and structure

`prisma/schema.prisma` models users, role enums, sessions, throttling, faculties, departments, programs, students, lecturers, academic years, semesters, courses, classrooms, class sections, enrollments, attendance, announcements and audit logs. Migrations enforce foreign keys, unique constraints, capacity/credit ranges, valid class times and term dates. Programs/faculties are schema foundations; their management screens are planned later. Roles are a fixed least-privilege matrix rather than user-editable permissions.

```text
src/app/(portal)/    Protected pages and role-specific views
src/app/actions/     Authenticated, validated server mutations
src/app/api/export/  Authorized CSV export route
src/components/     Forms, shell, charts, tables and UI primitives
src/lib/            Authentication, permissions, scoping and validation
prisma/             Schema, migrations and explicit demo seed
scripts/            Local config, secure provisioning, isolated test runner
tests/              Unit, PostgreSQL integration and browser checks
docs/               Plan, administrator runbook, validation report
```

## Current limitations

Finance/payments, grading/transcripts/exams, assignments/submissions, QR attendance, uploads/photos, full monthly calendars, room-reservation editing, bulk CSV/Excel import, Excel/PDF file generation, targeted notifications/email, scholarships, promotion, backups UI and school-wide settings are **not implemented**. Use browser print for printable reports. Accountants have announcements/profile access until finance is delivered. There are no nonfunctional navigation entries for these modules.

Before production use, complete an independent security/accessibility review, configure verified database TLS and HTTPS/cookies, add perimeter rate limits and operational monitoring, decide on MFA/password recovery and data retention, enforce privileged database roles, and test backup restoration. CSP currently allows inline scripts/styles for Next.js and chart rendering; nonce-based CSP is a future hardening task. Audit records are append-only through the app, not cryptographically tamper-proof against a database administrator. There are no private file uploads to secure in this phase.
