# Academic Portal implementation plan

The repository was empty at the start of this implementation. Use the existing checkout; cloud tasks are already isolated and do not need a worktree.

## Phase 1 — working academic core (this delivery)

- Next.js App Router, TypeScript, Tailwind, shadcn-style primitives, accessible responsive shell, light/dark mode, English/Khmer navigation and common labels.
- PostgreSQL + Prisma migrations, normalized academic records, database constraints, explicit demo seed.
- Opaque database sessions, scrypt password hashing, login throttling, server-side role and record ownership checks, auditable mutations.
- Role-aware dashboards, student create/edit/archive, lecturer creation, departments and courses, scheduled sections, capacity-checked enrollment, lecturer attendance entry, student self-service views.
- Database search, filters, pagination and sorting, CSV exports with spreadsheet injection protection, printable academic reports, audit viewer, password changes and announcements.
- Unit, database and browser checks; setup, backup and administrator documentation.

## Phase 2 — assessment and operations

Implement grading policies, assessments, approval workflows, GPA/transcripts, assignments and safe private file storage, full calendar/room reservation UX, student promotion, lecturer leave/workload, bulk import with preview and validation. Add Excel/PDF export and full Khmer translations (phase 1 translates the shell and common controls).

## Phase 3 — finance and communications

Implement fee structures, invoices, partial manual payments with immutable ledger/audits, scholarships/discounts, reconciliations, financial reporting, role-targeted notifications and optional email. Integrate online payments only after selecting an authorized provider. Accountant currently has dashboard/announcements/profile access only; no finance functionality is claimed.

## Architecture

`src/app/(portal)` contains protected server-rendered pages. `src/app/actions` contains validated server mutations. `src/lib/auth.ts`, `permissions.ts` and `queries.ts` enforce authentication, role and row access. Client components handle forms, tables and charts; PostgreSQL remains the source of truth. `prisma` owns the data model, versioned migrations and explicit demo seed. No production credentials or passwords are embedded in source.

Mutations use transactions and audit entries together. Enrollment and attendance lock their section/session to serialize concurrent writes. Calendar conflicts are checked under a shared transaction lock. Export routes enforce the same ownership constraints as pages. Future features are documented here, not exposed as nonfunctional buttons.
