/**
 * On boot, when the hosted database is configured: creates any missing tables (Better Auth's,
 * then ours). Safe to run every time; self-hosted copies skip it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return;
  try {
    const [{ getMigrations }, { auth }, { db, SCHEMA }] = await Promise.all([
      import("better-auth/db/migration"),
      import("./server/auth"),
      import("./server/db"),
    ]);
    await (await getMigrations(auth().options)).runMigrations();
    await db().query(SCHEMA);
  } catch (e) {
    console.error("[db] couldn't prepare the database:", e);
  }
}
