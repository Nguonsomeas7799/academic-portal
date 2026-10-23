# Validation report — 23 October 2026

The phase-1 academic development workflow was validated in the current cloud instance. This report does not claim that the full planned school management system, production deployment, cloud publication or fresh-task restoration is complete.

## Final results

| Check                                                                                    | Outcome                                                                                          |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Clean dependency installation through `scripts/environment-install.sh` (`npm ci`)        | Passed; existing `.env` and database records preserved                                           |
| PostgreSQL 17 Compose health check                                                       | Passed                                                                                           |
| Prisma client generation                                                                 | Passed, Prisma 7.10.1 with PostgreSQL driver adapter                                             |
| Two versioned PostgreSQL migrations                                                      | Applied successfully; repeat deployment found no pending migrations                              |
| Database/schema drift check                                                              | Passed; no difference detected                                                                   |
| ESLint (TypeScript, React Hooks, JSX accessibility rules)                                | Passed, no errors or warnings                                                                    |
| TypeScript `tsc --noEmit`                                                                | Passed                                                                                           |
| Prettier check                                                                           | Passed                                                                                           |
| Vitest unit checks                                                                       | **19 passed**, none skipped                                                                      |
| Real PostgreSQL integration checks                                                       | **8 passed**, none skipped, using the separate `academic_test` database                          |
| Optimized Next.js production build                                                       | Passed                                                                                           |
| Chromium browser checks against the production build                                     | **10 passed**, none skipped                                                                      |
| `npm audit --audit-level=high`                                                           | Passed; **zero known vulnerabilities across all installed dependencies** at the time of this run |
| Current-instance development-server sign-in, dashboard, authorized student CSV, sign-out | Passed; export contained exactly 32 demo students; zero browser runtime errors                   |
| PostgreSQL backup and restore into a separate new database                               | Passed; restored 32 students, 6 lecturers and 8 class sections                                   |
| Secret/generated artifact exclusion                                                      | `.env`, database dump and `node_modules` ignored; `.env` and dump permissions are `0600`         |

## What the tests exercise

Unit checks exercise salted password hashes and verification, the permission matrix for all six roles, student ownership, CSV formula-injection mitigation, Unicode names, input validation and schedule overlaps.

Integration checks use real transactions and database constraints to exercise registration and audit persistence, duplicate-email rejection, student/lecturer write denial, competing enrollment requests without overfilling, lecturer/room scheduling conflicts, partial-roster and unauthorized attendance rejection, idempotent attendance updates with history, future-date rejection, historical enrollment retention, and archiving with account/session revocation.

Browser checks exercise authentication redirects, HttpOnly opaque session cookies and logout revocation, administrator student registration/search/edit/enrollment/archive, student record privacy and scoped exports, assigned lecturer attendance and forbidden class access, accountant restrictions, password reauthentication and other-session revocation, mobile navigation at 390px, Khmer shell selection, dark mode, dashboard/report/search rendering, and login throttling. A real development-server check additionally verified the prepared application database, independently of the browser test database.

Earlier failures were diagnosed and corrected: accessible labels were separated from form hints and select options; failed form submissions preserve entered values; the browser tests now account for archive-dialog removal and newly enrolled attendance roster members; test cleanup removes generated attendance before deleting its fixture student. All listed final suites completed successfully after those corrections.

## Reproduction

From the existing checkout:

```bash
bash scripts/environment-install.sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
npm audit --audit-level=high
npx prisma migrate status
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

Browser tests require `DEMO_PASSWORD` in the process environment or ignored `.env` and a dedicated test database. The test runner creates the local test database when permitted, migrates/seeds it and starts the production build on port 3100. Browser tests use only generated fixtures and demo content. Password interactions are not recorded in traces; trace capture is disabled. Reports and screenshots are ignored artifacts.

## Bounds of verification

Chromium was tested; Firefox, Safari, real mobile hardware, load/concurrency at production scale, a full WCAG audit, penetration testing and external deployment were not performed. Development English/Khmer shell support is verified; form/report copy is not fully translated. Advanced finance, grades, assignments, uploads, QR attendance and other deferred modules are not implemented or tested. A package advisory scan is not an application security audit.

The backup restore check used `academic_restore_check_20261023`; it did not overwrite the application database. The restore-check database is retained for inspection. A protected dump is retained at `.data/backups/academic.dump` so the workspace snapshot can recover demo data when Docker volumes are not restored. Workspace snapshot restoration in a new cloud task and environment publication remain unverified; the reusable startup instructions explicitly restart services and restore only an empty database.
