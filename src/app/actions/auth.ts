'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { createSession, requireUser, SESSION_COOKIE, tokenHash } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { loginSchema, password, type ActionState } from '@/lib/validation';
import { z } from 'zod';
import { createHash } from 'node:crypto';

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Enter a valid email address and password.' };
  const { email, password: input } = parsed.data;
  const key = createHash('sha256').update(email).digest('hex');
  // Increment before verifying, atomically, so concurrent requests cannot bypass the limit.
  const [attempt] = await db.$queryRaw<{ failures: number }[]>`
    INSERT INTO "LoginAttempt" ("key", "failures", "windowStart") VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "failures" = CASE WHEN "LoginAttempt"."windowStart" < NOW() - INTERVAL '15 minutes' THEN 1 ELSE "LoginAttempt"."failures" + 1 END,
      "windowStart" = CASE WHEN "LoginAttempt"."windowStart" < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE "LoginAttempt"."windowStart" END
    RETURNING "failures"`;
  if (attempt.failures > 5)
    return { error: 'Too many sign-in attempts. Please wait 15 minutes before trying again.' };
  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(
    input,
    user?.passwordHash ?? `scrypt-v2:${'0'.repeat(32)}:${'0'.repeat(128)}`,
  );
  if (!user || !valid || user.disabled) return { error: 'The email or password is incorrect.' };
  await db.$transaction([
    db.loginAttempt.deleteMany({ where: { key } }),
    db.auditLog.create({
      data: { actorId: user.id, action: 'SIGN_IN', entity: 'User', entityId: user.id },
    }),
  ]);
  await createSession(user.id);
  redirect('/dashboard');
}

export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  jar.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: password,
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, { message: 'Passwords must match.' })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(parsed.data.currentPassword, stored.passwordHash)))
    return { error: 'Your current password is incorrect.' };
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.auditLog.create({
      data: { actorId: user.id, action: 'CHANGE_PASSWORD', entity: 'User', entityId: user.id },
    }),
  ]);
  await createSession(user.id);
  return { success: 'Password updated. All other sessions have been signed out.' };
}

export async function setLocaleAction(form: FormData) {
  const locale = form.get('locale') === 'km' ? 'km' : 'en';
  (await cookies()).set('locale', locale, {
    sameSite: 'lax',
    path: '/',
    maxAge: 31536000,
    httpOnly: true,
  });
}
