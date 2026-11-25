import { db } from "./db";

/**
 * The spelling flywheel: word fixes creators make become preferred spellings once at least
 * MIN_PEOPLE different people made the same fix in the same language and script.
 *
 * Only fixes from people who have bought credits count. Accounts are free to make, so
 * otherwise anyone with a few throwaway emails could teach every user a wrong (or offensive)
 * spelling; paid accounts make that expensive.
 */
const MIN_PEOPLE = 3;
const cache = new Map<string, { at: number; list: string[] }>();

export async function saveCorrections(userId: string, language: string, script: string, pairs: { before: string; after: string }[]) {
  for (const p of pairs) {
    await db().query("insert into corrections (user_id, language, script, before, after) values ($1, $2, $3, $4, $5)", [
      userId,
      language,
      script,
      p.before,
      p.after,
    ]);
  }
}

/** "nhi → nahi" lines for the spelling pass. Cached for 10 minutes; empty without a database. */
export async function communitySpellings(language: string, script: string): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  const key = `${language}:${script}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.list;
  try {
    const { rows } = await db().query<{ before: string; after: string }>(
      `select lower(before) as before, after from corrections
       where language = $1 and script = $2
         and user_id in (select user_id from credit_ledger where kind = 'topup')
       group by lower(before), after
       having count(distinct user_id) >= $3
       order by count(distinct user_id) desc, count(*) desc
       limit 60`,
      [language, script, MIN_PEOPLE],
    );
    const list = rows.map((r) => `${r.before} → ${r.after}`);
    cache.set(key, { at: Date.now(), list });
    return list;
  } catch {
    return [];
  }
}
