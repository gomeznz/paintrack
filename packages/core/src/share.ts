import sodium from "libsodium-wrappers-sumo";
import { z } from "zod";
import { b64, DecryptionError, deriveFromSecret, open, unb64 } from "./crypto.js";
import { HealthRecord } from "./model.js";

/**
 * Patient-to-clinician sharing without the server being able to read it.
 *
 * 1. The patient picks a date range and the records to include. The app
 *    builds a ShareSnapshot and encrypts it under a fresh random share key.
 * 2. The ciphertext (ShareEnvelope) is uploaded with an expiry. The server
 *    stores it, counts views and deletes it on expiry or revocation.
 * 3. The link given to the clinician carries the key in the URL fragment
 *    (`https://…/s/<id>#<key>`). Browsers never send the fragment to the
 *    server, so the server never sees the key.
 * 4. Optionally the patient also sets a PIN and tells it to the clinician
 *    separately (e.g. in the consult). The key then also depends on the PIN,
 *    so a forwarded or leaked link alone is not enough to read the share.
 * 5. The clinician's browser fetches the envelope and decrypts locally.
 */

const Timestamp = z.iso.datetime({ offset: true });

export const ShareSnapshot = z.strictObject({
  v: z.literal(1),
  /** What the patient chose to call themselves on this share. Optional. */
  patientLabel: z.string().trim().max(100).optional(),
  createdAt: Timestamp,
  expiresAt: Timestamp,
  range: z.strictObject({ from: Timestamp, to: Timestamp }),
  records: z.array(HealthRecord).max(10_000),
});
export type ShareSnapshot = z.infer<typeof ShareSnapshot>;

export interface ShareEnvelope {
  v: 1;
  id: string;
  expiresAt: string;
  /** Present when the share is PIN-protected. */
  pin?: { salt: string; opsLimit: number; memLimit: number };
  nonce: string;
  ciphertext: string;
}

export interface CreatedShare {
  /** Upload this. Contains no readable health data. */
  envelope: ShareEnvelope;
  /** Goes in the URL fragment only. Never send it to the server. */
  linkSecret: string;
}

export const MAX_SHARE_DAYS = 90;
const PIN_PATTERN = /^\d{6,10}$/;

/** The id and expiry are authenticated, so the server can't alter either. */
function shareAad(id: string, expiresAt: string): Uint8Array {
  return sodium.from_string(`paintrack/share/v1/${id}/${expiresAt}`);
}

function shareKey(linkKey: Uint8Array, pinKey: Uint8Array | null): Uint8Array {
  if (!pinKey) return linkKey;
  return sodium.crypto_generichash(32, pinKey, linkKey);
}

export function createShare(snapshot: ShareSnapshot, options: { id: string; pin?: string }): CreatedShare {
  const parsed = ShareSnapshot.parse(snapshot);
  const created = Date.parse(parsed.createdAt);
  const expires = Date.parse(parsed.expiresAt);
  if (expires <= created || expires - created > MAX_SHARE_DAYS * 86_400_000) {
    throw new RangeError(`Share expiry must be within ${MAX_SHARE_DAYS} days of creation`);
  }

  const linkKey = sodium.randombytes_buf(32);
  let pinParams: ShareEnvelope["pin"];
  let pinKey: Uint8Array | null = null;
  if (options.pin !== undefined) {
    if (!PIN_PATTERN.test(options.pin)) throw new RangeError("PIN must be 6–10 digits");
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    // A short PIN is guessable offline once someone has both the link and
    // the envelope, so this uses costlier Argon2id limits than recovery does.
    pinParams = {
      salt: b64(salt),
      opsLimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      memLimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    };
    pinKey = deriveFromSecret(options.pin, salt, pinParams.opsLimit, pinParams.memLimit);
  }

  const key = shareKey(linkKey, pinKey);
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    JSON.stringify(parsed),
    shareAad(options.id, parsed.expiresAt),
    null,
    nonce,
    key,
  );
  if (pinKey) {
    sodium.memzero(key);
    sodium.memzero(pinKey);
  }

  return {
    envelope: {
      v: 1,
      id: options.id,
      expiresAt: parsed.expiresAt,
      ...(pinParams ? { pin: pinParams } : {}),
      nonce: b64(nonce),
      ciphertext: b64(ciphertext),
    },
    linkSecret: b64(linkKey),
  };
}

export class ShareExpiredError extends Error {
  constructor() {
    super("This share has expired");
    this.name = "ShareExpiredError";
  }
}

export class SharePinRequiredError extends Error {
  constructor() {
    super("This share needs the PIN the patient gave you");
    this.name = "SharePinRequiredError";
  }
}

export function openShare(
  envelope: ShareEnvelope,
  linkSecret: string,
  options: { pin?: string; now?: Date } = {},
): ShareSnapshot {
  const now = options.now ?? new Date();
  if (Date.parse(envelope.expiresAt) <= now.getTime()) throw new ShareExpiredError();

  let pinKey: Uint8Array | null = null;
  if (envelope.pin) {
    if (options.pin === undefined) throw new SharePinRequiredError();
    pinKey = deriveFromSecret(options.pin, unb64(envelope.pin.salt), envelope.pin.opsLimit, envelope.pin.memLimit);
  }

  const key = shareKey(unb64(linkSecret), pinKey);
  const plaintext = open(envelope.ciphertext, envelope.nonce, shareAad(envelope.id, envelope.expiresAt), key);
  const snapshot = ShareSnapshot.parse(JSON.parse(sodium.to_string(plaintext)));
  if (snapshot.expiresAt !== envelope.expiresAt) throw new DecryptionError();
  return snapshot;
}

export function buildShareUrl(baseUrl: string, created: CreatedShare): string {
  const url = new URL(`s/${encodeURIComponent(created.envelope.id)}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.hash = created.linkSecret;
  return url.toString();
}

export function parseShareUrl(link: string): { id: string; linkSecret: string } {
  const url = new URL(link);
  const match = url.pathname.match(/\/s\/([^/]+)$/);
  const linkSecret = url.hash.slice(1);
  if (!match?.[1] || !linkSecret) throw new Error("Not a valid share link");
  return { id: decodeURIComponent(match[1]), linkSecret };
}
