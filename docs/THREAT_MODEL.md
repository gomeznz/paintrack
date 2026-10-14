# Threat model (v0.1)

Living document. Update it before building any feature that adds data,
network calls, third-party services or integrations.

## Assets

1. Health records: pain entries, medications, doses, notes.
2. The fact that a person uses the app at all (it can imply chronic pain
   or opioid use).
3. Account credentials and sessions.
4. Share links and PINs.

## Adversaries and mitigations

| # | Threat | Mitigation | Residual risk |
|---|---|---|---|
| T1 | Attacker breaches the server, database or backups | End-to-end encryption; the server holds no keys | Metadata exposure (emails, activity timing) |
| T2 | Malicious or careless insider / cloud provider | Same as T1; least-privilege access; audit logging | As T1 |
| T3 | Server tampers with ciphertext (swap, replay, extend share) | AEAD with associated data binding ids and expiry | Server can withhold or delete data (availability, not confidentiality) |
| T4 | Server serves malicious viewer JavaScript to steal share keys | Subresource Integrity, strict CSP, viewer hosted separately from the API with reproducible builds; longer term, a signed viewer | **Highest remaining risk for web-based sharing.** Track and revisit. |
| T5 | Account takeover (phishing, credential stuffing) | Passkeys, no SMS, rate limiting; takeover alone doesn't reveal data without the data key | Attacker could delete synced ciphertext; keep versioned backups |
| T6 | Lost or stolen phone | Data key in hardware keystore behind biometrics; encrypted local DB; auto-lock | Unlocked phone in an attacker's hands |
| T7 | Share link forwarded or leaked (email, screenshot) | Expiry ≤ 90 days, revocation, view counts, optional PIN given separately | A link without a PIN is a bearer token for its lifetime |
| T8 | Offline PIN guessing (attacker has link and envelope) | Argon2id at MODERATE limits; 6–10 digits | A determined attacker with GPUs can brute-force a 6-digit PIN; the link key is still required |
| T9 | Leaks through notifications, analytics, crash reports, logs | Generic notification text; no third-party analytics or ad SDKs; health fields never logged; crash reports scrubbed | Needs code review discipline; add lint rules |
| T10 | Supply chain (a malicious npm package) | Lockfile, Dependabot, minimal dependencies, CI audit, pinned GitHub Actions | Ongoing |
| T11 | Coercion or intimate-partner access to the phone | App-level lock separate from the phone unlock; option to hide the app name and icon on the home screen | Partial |
| T12 | Lost device and lost recovery code | Clear onboarding; prompt to confirm the code is saved | Data loss by design |

## Out of scope for v0.1

- A compromised OS or rooted device.
- Nation-state adversaries.
