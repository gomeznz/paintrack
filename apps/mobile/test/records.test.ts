/// <reference types="node" />
import type { MedicationDose, PainEntry } from "@paintrack/core/model";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteRecord,
  getSetting,
  listRecords,
  migrate,
  recentMedications,
  saveRecord,
  setSetting,
  type Db,
  type SqlValue,
} from "../src/data/records";

/** Adapts Node's synchronous SQLite to the async interface expo-sqlite exposes. */
function nodeDb(): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  return {
    raw,
    execAsync: async (sql) => void raw.exec(sql),
    runAsync: async (sql, params: SqlValue[]) => raw.prepare(sql).run(...params),
    getAllAsync: async <T,>(sql: string, params: SqlValue[]) => raw.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T,>(sql: string, params: SqlValue[]) => (raw.prepare(sql).get(...params) as T) ?? null,
  };
}

const pain = (recordedAt: string, intensity = 6): PainEntry => ({
  kind: "pain",
  id: randomUUID(),
  recordedAt,
  locations: [{ region: "knee", side: "left", surface: "front", intensity, qualities: ["aching"] }],
  overallIntensity: intensity,
  triggers: [],
});

const dose = (takenAt: string, name = "Paracetamol", strength = "500 mg"): MedicationDose => ({
  kind: "dose",
  id: randomUUID(),
  takenAt,
  medication: { name, strength },
  amount: 2,
  unit: "tablet",
  route: "oral",
});

let db: ReturnType<typeof nodeDb>;
beforeEach(async () => {
  db = nodeDb();
  await migrate(db);
});

describe("migrations", () => {
  it("are idempotent", async () => {
    await migrate(db);
    const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version", []);
    expect(row?.user_version).toBe(1);
  });
});

describe("records", () => {
  it("saves and lists newest first, sorting correctly across UTC offsets", async () => {
    // 09:00 NZDT is 20:00 UTC the previous day, so it's earlier than 08:30Z.
    const a = await saveRecord(db, pain("2026-10-14T09:00:00+13:00"));
    const b = await saveRecord(db, dose("2026-10-13T20:30:00Z"));
    const c = await saveRecord(db, pain("2026-10-14T12:00:00+13:00"));
    expect((await listRecords(db)).map((r) => r.id)).toEqual([c.id, b.id, a.id]);
  });

  it("refuses invalid records", async () => {
    const invalid: PainEntry = { ...pain("2026-10-14T09:00:00+13:00"), overallIntensity: 42 };
    await expect(saveRecord(db, invalid)).rejects.toThrow();
    expect(await listRecords(db)).toEqual([]);
  });

  it("skips rows that fail validation when reading", async () => {
    await saveRecord(db, pain("2026-10-14T09:00:00+13:00"));
    db.raw.exec(`INSERT INTO records VALUES ('x', 'pain', '2026-10-15T00:00:00Z', '{"kind":"pain","bogus":true}', '')`);
    expect(await listRecords(db)).toHaveLength(1);
  });

  it("updates in place when saved again with the same id", async () => {
    const entry = await saveRecord(db, pain("2026-10-14T09:00:00+13:00", 3));
    const edited: PainEntry = { ...(entry as PainEntry), overallIntensity: 8 };
    await saveRecord(db, edited);
    const all = await listRecords(db);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ overallIntensity: 8 });
  });

  it("deletes", async () => {
    const entry = await saveRecord(db, dose("2026-10-14T09:00:00+13:00"));
    await deleteRecord(db, entry.id);
    expect(await listRecords(db)).toEqual([]);
  });

  it("lists distinct recent medications, most recent first", async () => {
    await saveRecord(db, dose("2026-10-12T08:00:00+13:00", "Ibuprofen", "200 mg"));
    await saveRecord(db, dose("2026-10-13T08:00:00+13:00", "Paracetamol"));
    await saveRecord(db, dose("2026-10-14T08:00:00+13:00", "paracetamol", "500 MG"));
    expect((await recentMedications(db)).map((m) => m.name)).toEqual(["paracetamol", "Ibuprofen"]);
  });
});

describe("settings", () => {
  it("round-trips and overwrites", async () => {
    expect(await getSetting(db, "reminders")).toBeNull();
    await setSetting(db, "reminders", "[]");
    await setSetting(db, "reminders", '["8 am"]');
    expect(await getSetting(db, "reminders")).toBe('["8 am"]');
  });
});
