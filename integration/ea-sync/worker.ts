// EA → Supabase replication worker.
// Polls EA's MySQL every N seconds and upserts changed rows into
// Supabase Postgres so Metabase + bcgov can read from one source of truth.

import mysql from 'mysql2/promise';
import { env } from '../shared/env.ts';
import { admin } from '../shared/supabase.ts';

const POLL_MS = 30_000;

const STATUS_MAP: Record<string, string> = {
  pending: 'requested',
  confirmed: 'accepted',
  cancelled: 'cancelled',
};

async function syncOnce(pool: mysql.Pool, lastSyncedAt: Date): Promise<Date> {
  const [rows] = await pool.query<any[]>(
    `select a.*, l.name as language_name
       from ea_appointments a
       left join ea_languages l on l.id = a.language_id
      where a.update_datetime > ?
      order by a.update_datetime asc`,
    [lastSyncedAt]
  );

  if (rows.length === 0) return lastSyncedAt;

  const records = rows.map((r) => ({
    id: r.id,
    source: 'easyappointments',
    court_id: r.location_id ? `LOC_${r.location_id}` : null,
    language: r.language_name ?? null,
    required_level: r.credential_level ?? null,
    interpreter_id: r.id_users_provider,
    customer_id: r.id_users_customer,
    status: STATUS_MAP[r.status] ?? 'requested',
    starts_at: r.start_datetime,
    ends_at: r.end_datetime,
    case_number: r.case_number ?? null,
    case_name: r.case_name ?? null,
    courtroom: r.courtroom ?? null,
    notes: r.notes ?? null,
    created_at: r.create_datetime,
    updated_at: r.update_datetime,
  }));

  const { error } = await admin.from('bookings_mirror').upsert(records, { onConflict: 'id' });
  if (error) throw error;

  console.log(`[ea-sync] mirrored ${records.length} bookings`);
  return rows[rows.length - 1].update_datetime as Date;
}

async function main() {
  const pool = mysql.createPool(env.ea.db);
  let cursor = new Date(Date.now() - 365 * 86400000); // backfill last year on cold start

  // simple loop; production swap to MySQL binlog via mysql2 replication API
  while (true) {
    try {
      cursor = await syncOnce(pool, cursor);
    } catch (e) {
      console.error('[ea-sync] error', e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
