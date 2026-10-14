import sodium from "libsodium-wrappers-sumo";
import { HealthRecord, SCHEMA_VERSION } from "./model.js";

/**
 * Client-side encryption. All of this runs on the patient's device (or, for
 * shares, in the clinician's browser). The server only ever stores the
 * EncryptedRecord / ShareEnvelope ciphertexts and cannot decrypt them.
 *
 * Primitives (libsodium):
 * - XChaCha20-Poly1305 (IETF) AEAD for all data, with random 192-bit nonces.
 * - Argon2id for anything derived from a human-held secret.
 */

export const ready = sodium.ready;

const KEY_BYTES = 32;

/** Per-user data key. Generated on device, kept in the OS keystore. */
export type DataKey = Uint8Array & { readonly __brand: "DataKey" };

export function generateDataKey(): DataKey {
  return sodium.crypto_aead_xchacha20poly1305_ietf_keygen() as DataKey;
}

export interface EncryptedRecord {
  v: 1;
  id: string;
  nonce: string;
  ciphertext: string;
}

/**
 * The record id, kind and schema version are bound in as associated data, so
 * the server can't swap ciphertexts between records or replay an old record
 * under a different id without decryption failing.
 */
function recordAad(id: string): Uint8Array {
  return sodium.from_string(`paintrack/record/v${SCHEMA_VERSION}/${id}`);
}

export function encryptRecord(record: HealthRecord, key: DataKey): EncryptedRecord {
  const parsed = HealthRecord.parse(record);
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    JSON.stringify(parsed),
    recordAad(parsed.id),
    null,
    nonce,
    key,
  );
  return { v: 1, id: parsed.id, nonce: b64(nonce), ciphertext: b64(ciphertext) };
}

export function decryptRecord(enc: EncryptedRecord, key: DataKey): HealthRecord {
  const plaintext = open(enc.ciphertext, enc.nonce, recordAad(enc.id), key);
  const record = HealthRecord.parse(JSON.parse(sodium.to_string(plaintext)));
  if (record.id !== enc.id) throw new DecryptionError();
  return record;
}

/**
 * Account recovery. At sign-up the app shows the patient a random recovery
 * code; the data key is wrapped under an Argon2id key derived from it and
 * the wrapped key is stored on the server. Losing both the device and the
 * code means the data is unrecoverable; that is the price of the server
 * being unable to read it.
 */
export interface WrappedKey {
  v: 1;
  salt: string;
  opsLimit: number;
  memLimit: number;
  nonce: string;
  ciphertext: string;
}

/** 20 random bytes as 32 Crockford base32 characters, grouped for reading. */
export function generateRecoveryCode(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = sodium.randombytes_buf(20);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.match(/.{4}/g)!.join("-");
}

function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

const wrapAad = () => sodium.from_string("paintrack/wrapped-data-key/v1");

export function wrapDataKey(
  key: DataKey,
  recoveryCode: string,
  // The recovery code carries 160 bits of entropy, so Argon2id here is
  // defence in depth rather than the main protection; INTERACTIVE keeps it
  // usable on low-end phones.
  limits = { opsLimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, memLimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE },
): WrappedKey {
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const kek = deriveFromSecret(normaliseRecoveryCode(recoveryCode), salt, limits.opsLimit, limits.memLimit);
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(key, wrapAad(), null, nonce, kek);
  sodium.memzero(kek);
  return { v: 1, salt: b64(salt), ...limits, nonce: b64(nonce), ciphertext: b64(ciphertext) };
}

export function unwrapDataKey(wrapped: WrappedKey, recoveryCode: string): DataKey {
  const kek = deriveFromSecret(
    normaliseRecoveryCode(recoveryCode),
    unb64(wrapped.salt),
    wrapped.opsLimit,
    wrapped.memLimit,
  );
  try {
    return open(wrapped.ciphertext, wrapped.nonce, wrapAad(), kek) as DataKey;
  } finally {
    sodium.memzero(kek);
  }
}

// ---------------------------------------------------------------------------
// Internals shared with share.ts

export class DecryptionError extends Error {
  constructor() {
    super("Decryption failed: wrong key or tampered data");
    this.name = "DecryptionError";
  }
}

export function deriveFromSecret(secret: string, salt: Uint8Array, opsLimit: number, memLimit: number): Uint8Array {
  return sodium.crypto_pwhash(KEY_BYTES, secret, salt, opsLimit, memLimit, sodium.crypto_pwhash_ALG_ARGON2ID13);
}

export function open(ciphertextB64: string, nonceB64: string, aad: Uint8Array, key: Uint8Array): Uint8Array {
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, unb64(ciphertextB64), aad, unb64(nonceB64), key);
  } catch {
    throw new DecryptionError();
  }
}

export function b64(bytes: Uint8Array): string {
  return sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export function unb64(text: string): Uint8Array {
  return sodium.from_base64(text, sodium.base64_variants.URLSAFE_NO_PADDING);
}
