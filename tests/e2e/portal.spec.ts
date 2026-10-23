import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomBytes } from 'node:crypto';
import { hashPassword } from '../../src/lib/password';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const prefix = `E2E-${randomBytes(4).toString('hex')}`;
const privatePassword = randomBytes(20).toString('hex');
let temporaryUserId = '';
let createdStudentId = '';
async function login(page: Page, role = 'admin', secret = process.env.DEMO_PASSWORD!) {
  await page.goto('/login');
  await page
    .getByLabel('Email address', { exact: true })
    .fill(role.includes('@') ? role : `${role}@demo.academic.test`);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test.beforeAll(async () => {
  if (!process.env.DEMO_PASSWORD) throw new Error('DEMO_PASSWORD is required for browser tests.');
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw new Error('Browser tests require a dedicated *_test database.');
  temporaryUserId = (
    await db.user.create({
      data: {
        name: 'E2E account',
        email: `${prefix}@test.invalid`.toLowerCase(),
        role: 'ADMIN',
        passwordHash: await hashPassword(privatePassword),
      },
    })
  ).id;
});
test.afterAll(async () => {
  if (createdStudentId) {
    await db.auditLog.deleteMany({ where: { entityId: createdStudentId } });
    await db.attendanceRecord.deleteMany({ where: { studentId: createdStudentId } });
    await db.enrollment.deleteMany({ where: { studentId: createdStudentId } });
    await db.student.deleteMany({ where: { id: createdStudentId } });
  }
  if (temporaryUserId) {
    await db.auditLog.deleteMany({ where: { actorId: temporaryUserId } });
    await db.user.deleteMany({ where: { id: temporaryUserId } });
  }
  await db.$disconnect();
});

test('unauthenticated pages and exports require authentication', async ({ page, request }) => {
  await page.goto('/students');
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get('/api/export?type=students')).status()).toBe(401);
});
test('sign-in creates a secure opaque session and logout revokes it', async ({ page }) => {
  await login(page);
  const cookie = (await page.context().cookies()).find((c) => c.name === 'academic_session')!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('Lax');
  expect(cookie.value).toMatch(/^[a-f0-9]{64}$/);
  const digest = createHash('sha256').update(cookie.value).digest('hex');
  expect(await db.session.count({ where: { tokenHash: digest } })).toBe(1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await db.session.count({ where: { tokenHash: digest } })).toBe(0);
});
test('administrator registers, searches, edits, enrolls and archives a student', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('link', { name: 'Add student', exact: true }).click();
  await page.getByLabel('First name', { exact: true }).fill('សុខា');
  await page.getByLabel('Last name', { exact: true }).fill(prefix);
  await page
    .getByLabel('Email address', { exact: true })
    .fill(`${prefix}@student.test`.toLowerCase());
  await page.getByLabel('Department', { exact: true }).selectOption('demo-dept-0');
  await page.getByRole('button', { name: 'Register student' }).click();
  await expect(page).toHaveURL(/\/students$/);
  const record = await db.student.findUniqueOrThrow({
    where: { email: `${prefix}@student.test`.toLowerCase() },
  });
  createdStudentId = record.id;
  await page.getByRole('textbox', { name: 'Search students', exact: true }).fill(prefix);
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('table')).toContainText(`សុខា ${prefix}`);
  await page.getByRole('link', { name: `View សុខា ${prefix}`, exact: true }).click();
  await page.getByRole('link', { name: 'Edit record' }).click();
  await page.getByLabel('Phone (optional)', { exact: true }).fill('+855 12 345 678');
  await page.getByRole('button', { name: 'Save student record' }).click();
  await expect(page).toHaveURL(new RegExp(`/students/${record.id}$`));
  await expect(page.getByText('+855 12 345 678', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add enrollment' }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Class section')
    .selectOption(`demo-section-0-${new Date().getUTCFullYear()}`);
  await page.getByRole('button', { name: 'Enroll student', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Student enrolled.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('table').first()).toContainText('Introduction to Computing');
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Archive student', exact: true }).click();
  await expect(page.getByText('archived', { exact: true })).toBeVisible();
  expect((await db.student.findUniqueOrThrow({ where: { id: record.id } })).status).toBe(
    'ARCHIVED',
  );
});
test('student sees only their own record and their own export rows', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/students/demo-student-1');
  await expect(page.getByRole('heading', { name: 'This record isn’t available.' })).toBeVisible();
  await page.goto('/students/demo-student-0');
  await expect(page.getByRole('heading', { name: 'Sokha Chan' })).toBeVisible();
  const denied = await page.request.get('/api/export?type=students');
  expect(denied.status()).toBe(403);
  const own = await page.request.get('/api/export?type=attendance');
  expect(own.status()).toBe(200);
  const csv = await own.text();
  expect(csv).toContain('DEMO-STU-0001');
  expect(csv).not.toContain('DEMO-STU-0002');
  await page.goto('/students/new');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/audit');
  await expect(page).toHaveURL(/\/dashboard$/);
});
test('assigned lecturer records attendance and cannot open another class roster', async ({
  page,
}) => {
  await login(page, 'lecturer');
  await page.goto('/attendance');
  await page
    .getByLabel('Class section')
    .selectOption(`demo-section-0-${new Date().getUTCFullYear()}`);
  await page.getByRole('button', { name: 'Load class roster' }).click();
  await page.getByRole('button', { name: 'Mark all present', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Attendance for Sokha Chan', exact: true })
    .selectOption('LATE');
  await page.getByRole('button', { name: 'Save attendance', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Attendance saved for the entire class.' }),
  ).toBeVisible();
  await page.goto(`/attendance?section=demo-section-1-${new Date().getUTCFullYear()}`);
  await expect(page.getByRole('heading', { name: 'This record isn’t available.' })).toBeVisible();
});
test('accountant has no academic or audit permissions', async ({ page }) => {
  await login(page, 'accountant');
  await expect(
    page.getByText('Billing and payment workflows are planned for the finance phase.', {
      exact: false,
    }),
  ).toBeVisible();
  for (const path of ['/students', '/academics', '/attendance', '/reports', '/audit']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  expect((await page.request.get('/api/export?type=attendance')).status()).toBe(403);
});
test('password change verifies current password and revokes other sessions', async ({
  page,
  browser,
}) => {
  const email = `${prefix}@test.invalid`.toLowerCase();
  const second = await browser.newPage();
  try {
    await login(page, email, privatePassword);
    await login(second, email, privatePassword);
    await page.goto('/settings');
    await page.getByLabel('Current password', { exact: true }).fill('incorrect-current-password');
    await page.getByLabel('New password', { exact: true }).fill(privatePassword + 'x');
    await page.getByLabel('Confirm new password', { exact: true }).fill(privatePassword + 'x');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      'Your current password is incorrect.',
    );
    await page.getByLabel('Current password', { exact: true }).fill(privatePassword);
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Password updated.' })).toBeVisible();
    await second.goto('/dashboard');
    await expect(second).toHaveURL(/\/login$/);
  } finally {
    await second.close();
  }
});
test('mobile navigation, Khmer shell and dark mode remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('link', { name: 'Students', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle color theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Change language' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'km');
  await expect(page.getByRole('heading', { name: 'និស្សិត', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('database-backed dashboard and reports render without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await expect(page.getByText('Welcome back, Alex', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attendance overview' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  for (const path of [
    '/reports',
    '/lecturers',
    '/academics?view=courses',
    '/academics?view=departments',
    '/academics?view=terms',
    '/academics?view=rooms',
    '/audit',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('We couldn’t load this workspace.')).toHaveCount(0);
  }
  await page.goto('/search?q=Computing');
  await expect(page.getByRole('heading', { name: 'Introduction to Computing' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('login throttling rejects repeated invalid attempts', async ({ page }) => {
  const email = `${prefix}-nonexistent@test.invalid`.toLowerCase();
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(privatePassword);
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
    await expect(page.locator('p[role=alert]')).toContainText(
      i < 5 ? 'The email or password is incorrect.' : 'Too many sign-in attempts.',
    );
  }
});
