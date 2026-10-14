/** How long the app may sit in the background before it locks again. */
export const LOCK_TIMEOUTS = [
  { label: "Immediately", ms: 0 },
  { label: "After 1 minute", ms: 60_000 },
  { label: "After 5 minutes", ms: 5 * 60_000 },
] as const;

export const DEFAULT_LOCK_TIMEOUT_MS = 60_000;
const ALLOWED = new Set<number>(LOCK_TIMEOUTS.map((t) => t.ms));

export function parseLockTimeout(stored: string | null): number {
  if (stored === null || !/^\d+$/.test(stored)) return DEFAULT_LOCK_TIMEOUT_MS;
  const value = Number(stored);
  return ALLOWED.has(value) ? value : DEFAULT_LOCK_TIMEOUT_MS;
}

/**
 * Whether returning to the foreground should require unlocking again. A
 * clock that moved backwards (manual change, timezone tricks) locks too.
 */
export function shouldLockOnReturn(backgroundedAt: number | null, now: number, timeoutMs: number): boolean {
  if (backgroundedAt === null) return false;
  const elapsed = now - backgroundedAt;
  return elapsed < 0 || elapsed >= timeoutMs;
}
