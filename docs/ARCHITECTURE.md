# Architecture

## Guiding principle

**The server must not be able to read health data.** A complete compromise of
our servers, database, backups, or a malicious insider should expose only
ciphertext and minimal account metadata. This is the main lesson of recent NZ
health-portal breaches: when a server holds readable patient records, a
single compromise exposes all of them.

## Components

```
┌──────────────────────┐        ciphertext only        ┌──────────────────────┐
│  Patient mobile app  │ ─────────────────────────────▶│   Sync / share API   │
│  (iOS + Android)     │◀───────────────────────────── │   (NZ-hosted)        │
│                      │                               │                      │
│  • encrypted SQLite  │                               │  • accounts (email,  │
│  • data key in OS    │                               │    passkeys)         │
│    keystore          │                               │  • encrypted records │
│  • all crypto here   │                               │  • share envelopes   │
└──────────┬───────────┘                               │  • audit log         │
           │ share link (key in #fragment)             └──────────▲───────────┘
           ▼                                                      │ envelope
┌──────────────────────┐                                          │
│  Clinician viewer    │ ─────────────────────────────────────────┘
│  (static web page)   │   decrypts in the browser; the key never
│                      │   reaches the server
└──────────────────────┘
```

| Package | Purpose | Status |
|---|---|---|
| `packages/core` | Data model, validation, all cryptography | Started |
| `apps/mobile` | Patient app (Expo / React Native, TypeScript) | Local-only v1 |
| `apps/server` | Accounts, encrypted sync, share storage | Planned |
| `apps/viewer` | Clinician share viewer (static site) | Planned |

## Keys

| Key | Where it lives | Protects |
|---|---|---|
| **Data key** (256-bit, random) | Device keystore (iOS Keychain / Android Keystore, biometric-gated) | Every health record |
| **Recovery code** (160-bit, shown once at sign-up) | Written down by the patient | Wraps the data key for account recovery and new devices |
| **Share key** (256-bit, random per share, optionally mixed with a PIN) | URL fragment of the share link | One share snapshot |

## Cryptography (`packages/core/src/crypto.ts`, `share.ts`)

- libsodium only; no hand-rolled primitives.
- XChaCha20-Poly1305 AEAD for all data, with random 192-bit nonces.
- Associated data binds each ciphertext to its record id and schema version
  (records), or share id and expiry (shares). The server can't swap,
  replay under another id, or extend a share's expiry without detection.
- Argon2id for anything derived from a human-held secret (recovery code, share PIN).
- Every decrypted payload is re-validated against a strict schema before use.

## Sharing with clinicians

1. The patient chooses a date range and record types, an expiry (default 14
   days, maximum 90) and optionally a 6–10 digit PIN.
2. The app encrypts a snapshot and uploads only the envelope.
3. The patient sends the link, or shows a QR code in the consult, and tells
   the clinician the PIN in person.
4. The clinician opens the link; the viewer decrypts locally. They can print
   or save a PDF for the patient's clinical record.
5. The patient sees each share, how many times it has been viewed and when,
   and can revoke it at any time (the server deletes the envelope).

**Later phases:**
- Verified clinician accounts, checked against the Health Provider Index and
  the responsible authority registers (e.g. Medical Council, Nursing Council).
- Delivery into practice management systems (e.g. via HealthLink). Each
  integration widens the attack surface, so each one needs its own threat
  model first.

## What the server can see (metadata)

Account email, passkey public keys, number and size of encrypted records,
sync timestamps, share ids, expiry and view counts, and IP addresses in
short-retention security logs. Keep this list short and document every
addition.

## Hosting

- NZ data residency: e.g. AWS Asia Pacific (Auckland), Azure New Zealand
  North, or an NZ-owned provider such as Catalyst Cloud if you want to avoid
  foreign-jurisdiction access questions entirely. Because the data is
  end-to-end encrypted, the provider choice is defence in depth, not the
  main protection.
- Managed Postgres in a private network only; no public database endpoint.
- Secrets in a secrets manager; least-privilege IAM; infrastructure as code.
- Encrypted backups, with restores tested.

## Authentication

- Passkeys (WebAuthn) as the primary sign-in; an authenticator app (TOTP) as
  fallback. No SMS codes.
- Short-lived access tokens, rotating refresh tokens, a session list the
  user can revoke.
- Biometric or device-PIN unlock every time the app opens, with auto-lock.
- Server sign-in alone never gives access to health data; that also needs
  the data key, which only the patient's devices or recovery code hold.
