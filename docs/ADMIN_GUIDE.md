# Administrator guide

## Role permissions in this phase

| Capability                                  | Super admin | Admin       | Registrar   | Lecturer         | Student     | Accountant          |
| ------------------------------------------- | ----------- | ----------- | ----------- | ---------------- | ----------- | ------------------- |
| Own account / password / noticeboard        | Yes         | Yes         | Yes         | Yes              | Yes         | Yes                 |
| Campus academic dashboard                   | Yes         | Yes         | Yes         | Assigned classes | Own records | No academic metrics |
| Register/edit/archive students              | Yes         | Yes         | Yes         | No               | No          | No                  |
| View student contacts and emergency details | Yes         | Yes         | Yes         | No               | Own only    | No                  |
| Manage departments/courses/lecturers        | Yes         | Yes         | Yes         | No               | No          | No                  |
| Create terms, classrooms and class sections | Yes         | Yes         | Yes         | No               | No          | No                  |
| Manage enrollments                          | Yes         | Yes         | Yes         | No               | No          | No                  |
| Record attendance                           | All classes | All classes | All classes | Assigned classes | No          | No                  |
| Attendance reports / CSV                    | All         | All         | All         | Assigned classes | Own records | No                  |
| Student registry CSV                        | Yes         | Yes         | Yes         | No               | No          | No                  |
| Publish campus announcements                | Yes         | Yes         | Yes         | No               | No          | No                  |
| View audit trail                            | Yes         | Yes         | No          | No               | No          | No                  |

Super admin and admin have the same application privileges in phase 1. Provisioning accounts is a trusted shell operation. This avoids exposing an incomplete privilege-management UI. The registrar can publish campus announcements; lecturers cannot post arbitrary messages to the whole campus.

## First real academic setup

1. Migrate an empty PostgreSQL database and provision a super administrator. Do not seed real deployments.
2. In **Academics → Departments**, add departments. Add lecturers in **Lecturers** and courses in **Academics → Course catalog**.
3. Add academic terms (with academic year and date range) and classrooms with capacities.
4. Create class sections with a course, lecturer, term, room, weekday, local start/end time, and capacity. All class times use Asia/Phnom_Penh.
5. Register students and choose departments. Open a student record to add enrollment. The server rejects full classes, inactive students and timetable conflicts. Enrollments across terms whose date ranges overlap also receive conflict checks.
6. Provision linked student/lecturer accounts with `npm run account:create` using matching email addresses. Distribute initial passwords over a secure channel and ask users to change them.
7. Lecturers open **Attendance**, choose an assigned section/date, mark everyone, then save. Blank statuses are not assumed present. Future dates and dates outside the academic term are rejected. Session dates can differ from the weekly class day to support makeup classes.
8. Review **Reports** and **Audit trail**. Exports are limited to 10,000 rows and fail explicitly rather than silently truncating.

## Archiving and history

Archiving is a confirmed operation. It retains enrollments and attendance, disables linked portal login and removes all that account's sessions. Editing an archived record back to active does **not** automatically reactivate its user account; reviewed administrator recovery is required. Withdrawal is allowed only before attendance exists for that student/class. This phase deliberately has no hard-delete controls for academic records.

Updating a linked student's email/name updates their portal login identity in the same transaction. A duplicate email aborts the entire transaction. Updating lecturer identity works the same way. Department changes do not silently transfer existing course enrollments.

Attendance changes write previous and new statuses into an audit entry in the same transaction. Concurrent enrollment locks prevent capacity overbooking. A shared scheduling lock protects against concurrent room/lecturer double booking. Section/semester editing beyond course descriptions is deferred; do not modify historical class schedules casually through database tools.

## Security operations

- Sessions have random 256-bit opaque tokens; only SHA-256 token hashes are stored. Cookies are HttpOnly, SameSite=Lax, with an eight-hour fixed expiry. Enable `COOKIE_SECURE=true` for HTTPS.
- Password hashes use Node's salted scrypt. Password changes require the current password, revoke all sessions and issue a fresh session for the current browser.
- Login is limited to five attempts per normalized email per fifteen-minute window using an atomic PostgreSQL counter. Add trusted reverse-proxy/IP limits for broader abuse resistance. A known email can be temporarily locked by repeated invalid attempts, so plan support procedures.
- Every sensitive server action authenticates and authorizes its caller. Hidden navigation is not relied on for authorization. Students cannot read classmates' records or export them; lecturers see only assigned class rosters and attendance.
- Server Actions rely on Next.js same-origin checks. Forward trusted `Host`/`X-Forwarded-Host` headers correctly behind a proxy. Do not add wildcard allowed origins. Multi-instance deployments need shared database sessions and consistent Next.js build/encryption configuration.
- Use a restricted PostgreSQL application role and separate migration/admin credentials in production. The local Compose superuser is only for development. Encrypt connections/backups and restrict operator access.
- No upload endpoint, payment provider or email service is exposed yet. Do not paste credentials into source, chat or screenshots. Application logs do not print password or session values.
- Successful sign-ins, password changes, provisioning, exports and sensitive academic mutations are audited. Failed login counts are stored for throttling; detailed failed-login telemetry and alerting are not implemented yet.

## Backup and restore

Backups are operator commands; no in-app backup function is claimed. For local Compose:

```bash
mkdir -p .data/backups
chmod 700 .data/backups
docker compose exec -T db pg_dump -U academic -d academic -Fc > .data/backups/academic.dump
chmod 600 .data/backups/academic.dump
docker compose exec -T db pg_restore --list < .data/backups/academic.dump > .data/backups/manifest.txt
```

The dump contains personal data; move it to protected durable storage, encrypt it, and apply a retention policy. Verify restoration into a **new empty database**, never the running database:

```bash
docker compose exec -T db createdb -U academic academic_restore_check
docker compose exec -T db pg_restore -U academic -d academic_restore_check --no-owner --exit-on-error < .data/backups/academic.dump
docker compose exec -T db psql -U academic -d academic_restore_check -c 'SELECT COUNT(*) FROM "Student";'
```

The restore-check database is retained for review. Remove it only after confirming it is no longer needed. Do not run `docker compose down -v`, `prisma migrate reset`, or destructive restore commands against a database containing user data. Cloud snapshots of workspace files do not prove Docker volume persistence or disaster recovery.
