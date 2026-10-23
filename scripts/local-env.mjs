import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
if (existsSync('.env')) {
  console.log('.env already exists; preserved without changes.');
} else {
  const password = randomBytes(24).toString('hex');
  writeFileSync(
    '.env',
    `DATABASE_URL="postgresql://academic:${password}@127.0.0.1:5432/academic?schema=public"\nPOSTGRES_PASSWORD="${password}"\nAPP_ORIGIN="http://localhost:3000"\nCOOKIE_SECURE=false\n`,
    { mode: 0o600, flag: 'wx' },
  );
  console.log(
    'Created ignored .env with a random local database password. No accounts have been created.',
  );
}
