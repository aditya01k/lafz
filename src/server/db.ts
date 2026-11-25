import { Pool } from "pg";

/**
 * Postgres for the hosted version only: Better Auth's own tables (user, session, account,
 * verification) plus these. Created at boot by instrumentation.ts. Self-hosting needs none of it.
 */
export const SCHEMA = `
create table if not exists profiles (
  user_id text primary key references "user"(id) on delete cascade,
  -- The Dodo Payments customer, made at first checkout so every webhook names the user.
  customer_id text unique
);

-- Every credit change, as seconds of video. The balance is the sum. A payment, a refund and a
-- transcription each have a unique ref, so a webhook delivered twice can't count twice.
create table if not exists credit_ledger (
  id bigserial primary key,
  user_id text not null references "user"(id) on delete cascade,
  seconds integer not null,
  kind text not null check (kind in ('topup', 'use', 'refund', 'revoke', 'grant')),
  ref text unique,
  note text not null default '',
  at timestamptz not null default now()
);
create index if not exists credit_ledger_user on credit_ledger (user_id, at desc);

-- Which pack each checkout was for, in case the payment comes back without its metadata.
create table if not exists checkouts (
  session_id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  pack text not null,
  created_at timestamptz not null default now()
);

-- Small key/value settings, e.g. the Dodo product made for each credit pack.
create table if not exists settings (
  key text primary key,
  value text not null
);
`;

const g = globalThis as { lafzPool?: Pool };

export function db(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return (g.lafzPool ??= new Pool({ connectionString: url, max: 10 }));
}
