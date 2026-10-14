# New Zealand compliance checklist

Not legal advice. Have this reviewed by a NZ privacy and health-law adviser
before launch.

## Privacy Act 2020 and the Health Information Privacy Code 2020

The app collects "health information", so the **HIPC 2020** rules apply in
place of the general privacy principles.

- [ ] Appoint a privacy officer.
- [ ] Privacy statement in plain English (and te reo Māori): what's
      collected, why, where it's stored, who can see it (nobody but you and
      the people you share with).
- [ ] Rule 1 / data minimisation: collect only what the feature needs. No
      NHI number unless a feature truly needs it.
- [ ] Rules 6 and 7, access and correction: patients can view, export and
      edit everything (trivial when the data lives on their device).
- [ ] Rule 5, security safeguards: covered by ARCHITECTURE.md and THREAT_MODEL.md.
- [ ] Rule 12, cross-border disclosure: host in NZ; list any overseas
      sub-processors (e.g. email provider) and what they receive.
- [ ] Notifiable privacy breaches: an incident-response plan that covers
      notifying the Office of the Privacy Commissioner and affected people
      as soon as practicable.
- [ ] A Privacy Impact Assessment, using the OPC template.
- [ ] A retention and deletion policy; account deletion removes all server data.

## Health sector security

- [ ] Align with the **Health Information Security Framework (HISO 10029)**.
      GPs and health organisations increasingly ask vendors about it.
- [ ] Independent penetration test before launch and annually after.
- [ ] Build against OWASP ASVS Level 2 (server) and OWASP MASVS L2 (mobile).

## Medical device / software regulation

- [ ] Keep v1 a **record-keeping and reminder** tool: no dose calculations,
      no "safe to take another dose" advice, no interaction checking.
- [ ] Before adding any feature that interprets data or advises on
      treatment, get regulatory advice. Check Medsafe's current position on
      software as a medical device; NZ's therapeutic products legislation
      has been changing.

## Consumer and commercial

- [ ] Terms of use that say clearly it isn't a substitute for clinical advice.
- [ ] Fair Trading Act: security and privacy claims in marketing must be
      accurate. "We cannot read your data" is true under this design; keep
      it true.
- [ ] No selling or advertising use of health data, ever. Put it in the
      privacy statement as a commitment.
