# Security policy

## Reporting a vulnerability

Please don't open a public issue. Email **security@<your-domain>** (to be
set up) with details and steps to reproduce. We aim to acknowledge reports
within 2 working days.

## Rules for contributors

- Health data never leaves the device unencrypted. All encryption goes
  through `packages/core`; don't call crypto primitives elsewhere.
- Never log, send to analytics, or put in a notification any health field,
  medication name or share secret.
- No third-party analytics, advertising or tracking SDKs.
- Any new data field, network call or third-party service needs a
  [threat model](docs/THREAT_MODEL.md) update in the same pull request.
