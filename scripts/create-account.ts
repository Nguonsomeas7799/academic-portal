import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { roles } from '../src/lib/permissions';
import { password, email } from '../src/lib/validation';
import { hashPassword } from '../src/lib/password';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  const data = z
    .object({ email, name: z.string().trim().min(2).max(120), password, role: z.enum(roles) })
    .parse({
      email: process.env.ACCOUNT_EMAIL,
      name: process.env.ACCOUNT_NAME,
      password: process.env.ACCOUNT_PASSWORD,
      role: process.env.ACCOUNT_ROLE,
    });
  const passwordHash = await hashPassword(data.password);
  await db.$transaction(async (tx) => {
    const student =
      data.role === 'STUDENT'
        ? await tx.student.findUnique({ where: { email: data.email } })
        : null;
    const lecturer =
      data.role === 'LECTURER'
        ? await tx.lecturer.findUnique({ where: { email: data.email } })
        : null;
    if (data.role === 'STUDENT' && (!student || student.userId || student.status === 'ARCHIVED'))
      throw new Error('Create an unlinked, non-archived student with the same email first.');
    if (data.role === 'LECTURER' && (!lecturer || lecturer.userId))
      throw new Error('Create an unlinked lecturer with the same email first.');
    const user = await tx.user.create({
      data: { email: data.email, name: data.name, role: data.role, passwordHash },
    });
    if (student) await tx.student.update({ where: { id: student.id }, data: { userId: user.id } });
    if (lecturer)
      await tx.lecturer.update({ where: { id: lecturer.id }, data: { userId: user.id } });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PROVISION_ACCOUNT',
        entity: 'User',
        entityId: user.id,
        details: { role: data.role, source: 'trusted-administrator-cli' },
      },
    });
  });
  console.log(
    'Account created. No passwords were logged. Existing accounts are never overwritten.',
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof z.ZodError
        ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
        : error.code === 'P2002'
          ? 'An account with this email already exists.'
          : error.message,
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
