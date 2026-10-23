import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import type { Role } from '@prisma/client';
import { db } from './db';
export const SESSION_COOKIE = 'academic_session';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const getUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { include: { student: true, lecturer: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabled) return null;
  const { passwordHash: omittedPassword, ...user } = session.user;
  void omittedPassword;
  return user;
});
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;
export async function requireUser(allowedRoles?: Role[]) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect('/dashboard');
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.session.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } }),
  ]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure:
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'),
    path: '/',
    expires: expiresAt,
  });
}
