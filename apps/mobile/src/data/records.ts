import { HealthRecord, type MedicationDose } from "@paintrack/core/model";

/**
 * The subset of expo-sqlite's SQLiteDatabase this module uses. Kept narrow
 * so tests can run the same SQL against Node's built-in SQLite.
 */
export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
}
export type SqlValue = string | number | null;

const MIGRATIONS = [
  `CREATE TABLE records (
     id TEXT PRIMARY KEY NOT NULL,
     kind TEXT NOT NULL,
     occurred_at TEXT NOT NULL,
     body TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX records_occurred_at ON records (occurred_at DESC);
   CREATE TABLE settings (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version", []);
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    try {
      await db.execAsync(`BEGIN; ${MIGRATIONS[version]} PRAGMA user_version = ${version + 1}; COMMIT;`);
    } catch (error) {
      await db.execAsync("ROLLBACK;").catch(() => {});
      throw error;
    }
  }
}

export function occurredAt(record: HealthRecord): string {
  return record.kind === "pain" ? record.recordedAt : record.takenAt;
}

export async function saveRecord(db: Db, record: HealthRecord): Promise<HealthRecord> {
  const parsed = HealthRecord.parse(record);
  // Stored as UTC so ORDER BY sorts chronologically whatever the offset.
  const sortKey = new Date(occurredAt(parsed)).toISOString();
  await db.runAsync(
    `INSERT INTO records (id, kind, occurred_at, body, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET kind = excluded.kind, occurred_at = excluded.occurred_at,
       body = excluded.body, updated_at = excluded.updated_at`,
    [parsed.id, parsed.kind, sortKey, JSON.stringify(parsed), new Date().toISOString()],
  );
  return parsed;
}

export async function listRecords(db: Db, limit = 500): Promise<HealthRecord[]> {
  const rows = await db.getAllAsync<{ body: string }>(
    "SELECT body FROM records ORDER BY occurred_at DESC LIMIT ?",
    [limit],
  );
  // Re-validate on the way out too: never trust what's on disk blindly.
  return rows.flatMap((row) => {
    const result = HealthRecord.safeParse(JSON.parse(row.body));
    return result.success ? [result.data] : [];
  });
}

export async function deleteRecord(db: Db, id: string): Promise<void> {
  await db.runAsync("DELETE FROM records WHERE id = ?", [id]);
}

/** Distinct medications from recent doses, most recently used first. */
export async function recentMedications(db: Db, limit = 8): Promise<MedicationDose["medication"][]> {
  const rows = await db.getAllAsync<{ body: string }>(
    "SELECT body FROM records WHERE kind = 'dose' ORDER BY occurred_at DESC LIMIT 200",
    [],
  );
  const seen = new Map<string, MedicationDose["medication"]>();
  for (const row of rows) {
    const result = HealthRecord.safeParse(JSON.parse(row.body));
    if (!result.success || result.data.kind !== "dose") continue;
    const med = result.data.medication;
    const key = `${med.name.toLowerCase()}|${(med.strength ?? "").toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, med);
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}
