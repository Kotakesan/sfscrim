import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database, D1Result } from "@cloudflare/workers-types";

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext();
  if (!env.DB) {
    throw new Error(
      "D1 binding 'DB' is not available. Check wrangler.jsonc d1_databases config.",
    );
  }
  return env.DB;
}

export async function queryAll<T>(
  sql: string,
  params: ReadonlyArray<string | number | null> = [],
): Promise<T[]> {
  const db = await getDb();
  const result: D1Result<T> = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return result.results ?? [];
}

export async function queryFirst<T>(
  sql: string,
  params: ReadonlyArray<string | number | null> = [],
): Promise<T | null> {
  const db = await getDb();
  const row = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return row ?? null;
}

export async function execute(
  sql: string,
  params: ReadonlyArray<string | number | null> = [],
): Promise<void> {
  const db = await getDb();
  await db
    .prepare(sql)
    .bind(...params)
    .run();
}
