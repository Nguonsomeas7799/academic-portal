import 'dotenv/config';
import pg from 'pg';
import { spawnSync } from 'node:child_process';
let testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  const local = new URL(process.env.DATABASE_URL ?? '');
  if (
    !['localhost', '127.0.0.1'].includes(local.hostname) ||
    local.pathname !== '/academic' ||
    process.env.NODE_ENV === 'production'
  )
    throw new Error(
      'Set TEST_DATABASE_URL pointing to a dedicated database whose name ends in _test.',
    );
  const client = new pg.Client({ connectionString: local.href });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = 'academic_test'");
    if (!exists.rowCount) await client.query('CREATE DATABASE academic_test');
  } finally {
    await client.end();
  }
  local.pathname = '/academic_test';
  testUrl = local.href;
}
const target = new URL(testUrl);
const appDatabase = new URL(process.env.DATABASE_URL ?? '');
const sameDatabase =
  target.hostname === appDatabase.hostname &&
  (target.port || '5432') === (appDatabase.port || '5432') &&
  target.pathname === appDatabase.pathname;
if (!/^\/[A-Za-z0-9_]+_test$/.test(target.pathname) || sameDatabase)
  throw new Error('Refusing to run database tests outside a separate *_test database.');
const childEnv = { ...process.env, DATABASE_URL: testUrl };
const commands = process.argv.includes('--e2e')
  ? [
      ['prisma', 'migrate', 'deploy'],
      ['tsx', 'prisma/seed.ts'],
      ['playwright', 'test'],
    ]
  : [
      ['prisma', 'migrate', 'deploy'],
      ['vitest', 'run', '--config', 'vitest.db.config.ts'],
    ];
for (const args of commands) {
  const result = spawnSync('npx', args, { env: childEnv, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
