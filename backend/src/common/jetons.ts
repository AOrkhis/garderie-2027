import { createHash, randomBytes } from 'crypto';

export function genererJeton(): { jeton: string; hash: string } {
  const jeton = randomBytes(32).toString('hex');
  return { jeton, hash: hacherJeton(jeton) };
}

export function hacherJeton(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex');
}
