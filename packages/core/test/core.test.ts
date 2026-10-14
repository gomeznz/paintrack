import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildShareUrl,
  createShare,
  decryptRecord,
  DecryptionError,
  encryptRecord,
  generateDataKey,
  generateRecoveryCode,
  HealthRecord,
  openShare,
  parseShareUrl,
  ready,
  ShareExpiredError,
  SharePinRequiredError,
  unwrapDataKey,
  wrapDataKey,
  type MedicationDose,
  type PainEntry,
  type ShareSnapshot,
} from "../src/index.js";

beforeAll(async () => {
  await ready;
});

// Fast Argon2id parameters so the test suite stays quick.
const FAST = { opsLimit: 1, memLimit: 8192 * 1024 };

const pain = (): PainEntry => ({
  kind: "pain",
  id: randomUUID(),
  recordedAt: "2026-10-14T08:30:00+13:00",
  locations: [{ region: "lower_back", side: "midline", surface: "back", intensity: 7, qualities: ["aching", "shooting"] }],
  overallIntensity: 7,
  triggers: ["gardening"],
});

const dose = (): MedicationDose => ({
  kind: "dose",
  id: randomUUID(),
  takenAt: "2026-10-14T08:45:00+13:00",
  medication: { name: "Paracetamol", strength: "500 mg" },
  amount: 2,
  unit: "tablet",
  route: "oral",
});

describe("model", () => {
  it("accepts valid records", () => {
    expect(HealthRecord.parse(pain()).kind).toBe("pain");
    expect(HealthRecord.parse(dose()).kind).toBe("dose");
  });

  it("rejects out-of-range intensity, unknown regions and unknown keys", () => {
    expect(() => HealthRecord.parse({ ...pain(), overallIntensity: 11 })).toThrow();
    expect(() =>
      HealthRecord.parse({ ...pain(), locations: [{ ...pain().locations[0], region: "tail" }] }),
    ).toThrow();
    expect(() => HealthRecord.parse({ ...dose(), extra: "smuggled" })).toThrow();
    expect(() => HealthRecord.parse({ ...dose(), amount: -1 })).toThrow();
  });
});

describe("record encryption", () => {
  it("round-trips and the ciphertext holds no plaintext", async () => {
    const key = generateDataKey();
    const record = dose();
    const enc = encryptRecord(record, key);
    expect(enc.ciphertext).not.toContain("Paracetamol");
    expect(decryptRecord(enc, key)).toEqual(record);
  });

  it("fails with the wrong key", () => {
    const enc = encryptRecord(pain(), generateDataKey());
    expect(() => decryptRecord(enc, generateDataKey())).toThrow(DecryptionError);
  });

  it("fails if the server swaps a ciphertext onto another record id", () => {
    const key = generateDataKey();
    const a = encryptRecord(pain(), key);
    const b = encryptRecord(pain(), key);
    expect(() => decryptRecord({ ...a, id: b.id }, key)).toThrow(DecryptionError);
  });

  it("uses a fresh nonce every time", () => {
    const key = generateDataKey();
    const record = pain();
    expect(encryptRecord(record, key).nonce).not.toBe(encryptRecord(record, key).nonce);
  });
});

describe("recovery", () => {
  it("unwraps the data key with the recovery code, tolerating formatting", () => {
    const key = generateDataKey();
    const code = generateRecoveryCode();
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
    const wrapped = wrapDataKey(key, code, FAST);
    expect(unwrapDataKey(wrapped, code.toLowerCase().replace(/-/g, " "))).toEqual(key);
  });

  it("rejects the wrong recovery code", () => {
    const wrapped = wrapDataKey(generateDataKey(), generateRecoveryCode(), FAST);
    expect(() => unwrapDataKey(wrapped, generateRecoveryCode())).toThrow(DecryptionError);
  });
});

describe("sharing", () => {
  const snapshot = (): ShareSnapshot => ({
    v: 1,
    patientLabel: "A. Patient",
    createdAt: "2026-10-14T09:00:00+13:00",
    expiresAt: "2026-10-28T09:00:00+13:00",
    range: { from: "2026-10-01T00:00:00+13:00", to: "2026-10-14T23:59:59+13:00" },
    records: [pain(), dose()],
  });
  const during = new Date("2026-10-20T00:00:00+13:00");

  it("opens via the link, and the key never appears in the envelope", () => {
    const created = createShare(snapshot(), { id: randomUUID() });
    const link = buildShareUrl("https://share.example.nz", created);
    expect(JSON.stringify(created.envelope)).not.toContain(created.linkSecret);

    const { id, linkSecret } = parseShareUrl(link);
    expect(id).toBe(created.envelope.id);
    expect(openShare(created.envelope, linkSecret, { now: during }).records).toHaveLength(2);
  });

  it("refuses to open after expiry", () => {
    const created = createShare(snapshot(), { id: randomUUID() });
    expect(() =>
      openShare(created.envelope, created.linkSecret, { now: new Date("2026-10-29T00:00:00+13:00") }),
    ).toThrow(ShareExpiredError);
  });

  it("detects a server extending the expiry", () => {
    const created = createShare(snapshot(), { id: randomUUID() });
    const tampered = { ...created.envelope, expiresAt: "2027-10-28T09:00:00+13:00" };
    expect(() => openShare(tampered, created.linkSecret, { now: during })).toThrow(DecryptionError);
  });

  // Each PIN derivation runs Argon2id at production cost, which is
  // deliberately slow, so this test needs more than the default timeout.
  it("requires the correct PIN when one is set", { timeout: 30_000 }, () => {
    const created = createShare(snapshot(), { id: randomUUID(), pin: "482913" });
    expect(() => openShare(created.envelope, created.linkSecret, { now: during })).toThrow(SharePinRequiredError);
    expect(() => openShare(created.envelope, created.linkSecret, { now: during, pin: "000000" })).toThrow(
      DecryptionError,
    );
    expect(openShare(created.envelope, created.linkSecret, { now: during, pin: "482913" }).patientLabel).toBe(
      "A. Patient",
    );
  });

  it("rejects weak PINs and over-long expiry", () => {
    expect(() => createShare(snapshot(), { id: randomUUID(), pin: "1234" })).toThrow(RangeError);
    expect(() => createShare({ ...snapshot(), expiresAt: "2027-06-01T00:00:00+12:00" }, { id: randomUUID() })).toThrow(
      RangeError,
    );
  });
});
