import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

export type Who = { uid: string } | 'anon' | 'service';

export interface TestDb {
  raw: PGlite;
  /** Run SQL as a given Supabase role (RLS applies except for 'service'). */
  as(who: Who, sql: string, params?: unknown[]): Promise<Record<string, any>[]>;
  /** Run SQL as the database owner (test setup only). */
  admin(sql: string, params?: unknown[]): Promise<Record<string, any>[]>;
  newUser(email?: string): Promise<string>;
}

export async function makeDb(opts: { beforeMigrations?: string } = {}): Promise<TestDb> {
  const raw = new PGlite();
  await raw.exec(readFileSync(join(__dirname, 'supabase-shim.sql'), 'utf8'));
  if (opts.beforeMigrations) await raw.exec(opts.beforeMigrations);
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) await raw.exec(readFileSync(join(MIGRATIONS, f), 'utf8'));

  const run = async (sql: string, params?: unknown[]) => (await raw.query(sql, params as any[])).rows as Record<string, any>[];

  return {
    raw,
    admin: run,
    async as(who, sql, params) {
      const role = who === 'anon' ? 'anon' : who === 'service' ? 'service_role' : 'authenticated';
      const sub = typeof who === 'object' ? who.uid : '';
      await raw.exec(`select set_config('request.jwt.claim.sub', '${sub}', false); select set_config('request.jwt.claim.role', '${role}', false); set role ${role};`);
      try {
        return await run(sql, params);
      } finally {
        await raw.exec('reset role');
      }
    },
    async newUser(email = `u${Math.random().toString(36).slice(2)}@example.com`) {
      const r = await run('insert into auth.users (email) values ($1) returning id', [email]);
      return r[0].id as string;
    },
  };
}

/** Assert a query is rejected by Postgres (privilege or RLS), returning the error message. */
export async function denied(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e: any) {
    return String(e.message ?? e);
  }
  throw new Error('Expected the database to reject this, but it succeeded');
}

export const daysAgo = (n: number) => `now() - interval '${n} days'`;
