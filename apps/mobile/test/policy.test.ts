import { describe, expect, it } from "vitest";
import { formatDay, formatDose } from "../src/format";
import { DEFAULT_LOCK_TIMEOUT_MS, parseLockTimeout, shouldLockOnReturn } from "../src/security/lockPolicy";

describe("lock policy", () => {
  it("locks once the timeout has passed", () => {
    expect(shouldLockOnReturn(1_000, 1_000 + 59_999, 60_000)).toBe(false);
    expect(shouldLockOnReturn(1_000, 1_000 + 60_000, 60_000)).toBe(true);
  });

  it("locks immediately with a zero timeout", () => {
    expect(shouldLockOnReturn(1_000, 1_000, 0)).toBe(true);
  });

  it("locks if the clock went backwards", () => {
    expect(shouldLockOnReturn(10_000, 5_000, 60_000)).toBe(true);
  });

  it("doesn't lock if the app never went to the background", () => {
    expect(shouldLockOnReturn(null, 5_000, 0)).toBe(false);
  });

  it("only accepts known timeouts", () => {
    expect(parseLockTimeout("0")).toBe(0);
    expect(parseLockTimeout("300000")).toBe(300_000);
    expect(parseLockTimeout("999999999")).toBe(DEFAULT_LOCK_TIMEOUT_MS);
    expect(parseLockTimeout(null)).toBe(DEFAULT_LOCK_TIMEOUT_MS);
    expect(parseLockTimeout("")).toBe(DEFAULT_LOCK_TIMEOUT_MS);
  });
});

describe("formatting", () => {
  it("pluralises dose units", () => {
    expect(formatDose({ amount: 1, unit: "tablet" })).toBe("1 tablet");
    expect(formatDose({ amount: 2, unit: "tablet" })).toBe("2 tablets");
    expect(formatDose({ amount: 500, unit: "mg" })).toBe("500 mg");
  });

  it("names today and yesterday", () => {
    const now = new Date(2026, 9, 14, 12);
    expect(formatDay(new Date(2026, 9, 14, 8).toISOString(), now)).toBe("Today");
    expect(formatDay(new Date(2026, 9, 13, 23).toISOString(), now)).toBe("Yesterday");
  });
});
