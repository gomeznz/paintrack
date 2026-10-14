# PainTrack

A pain, medication and dose tracker for New Zealanders, built so that
**nobody but the patient, and the clinicians they choose to share with, can
read their health data**. That includes us.

- Patients record where it hurts on a body map, how much (0–10), and which
  medications they took, how much and when.
- Records are encrypted on the device before they go anywhere. Our servers
  store only ciphertext.
- Patients share a time-limited, optionally PIN-protected snapshot with
  their GP, specialist or physio through a link that decrypts in the
  clinician's browser.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [NZ compliance checklist](docs/COMPLIANCE_NZ.md)
- [Security policy](SECURITY.md)

## Layout

```
packages/core   data model, validation and all cryptography
apps/mobile     patient app (Expo / React Native), see apps/mobile/README.md
apps/           sync server and clinician viewer (to come)
```

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
```

## Roadmap

1. **Core**: data model, record encryption, recovery, sharing. *(done)*
2. **Mobile app (local-only)**: body map, pain entry, medication log,
   encrypted on-device storage, biometric lock, reminders with generic text.
   *(first version done)*
3. **Clinician viewer**: static page that opens share links, plus PDF export.
4. **Server**: passkey accounts, encrypted sync, share storage with expiry,
   revocation and view counts, hosted in NZ.
5. **Pre-launch**: privacy impact assessment, penetration test, privacy
   statement, incident-response plan.
