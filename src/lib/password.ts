import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const derive = (password: string, salt: string, N: number, p: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, 64, { N, r: 8, p, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await derive(password, salt, 32768, 3);
  return `scrypt-v2:${salt}:${derived.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, key] = stored.split(':');
  if (
    !['scrypt', 'scrypt-v2'].includes(algorithm) ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(key ?? '')
  )
    return false;
  // Legacy hashes are accepted for existing development accounts; all new hashes use v2.
  const derived = await derive(
    password,
    salt,
    algorithm === 'scrypt-v2' ? 32768 : 16384,
    algorithm === 'scrypt-v2' ? 3 : 1,
  );
  return timingSafeEqual(derived, Buffer.from(key, 'hex'));
}
