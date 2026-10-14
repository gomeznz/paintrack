import { z } from "zod";

/**
 * Health records. These are only ever stored on a server in encrypted form
 * (see crypto.ts); the server never parses them.
 *
 * Every schema is strict: unknown keys are rejected rather than silently
 * carried along, so nothing unexpected ends up inside an encrypted record.
 */

export const SCHEMA_VERSION = 1;

/** Body map regions. Fixed codes so entries are comparable over time. */
export const BODY_REGIONS = [
  "head",
  "face",
  "jaw",
  "neck",
  "shoulder",
  "upper_arm",
  "elbow",
  "forearm",
  "wrist",
  "hand",
  "chest",
  "abdomen",
  "upper_back",
  "mid_back",
  "lower_back",
  "pelvis",
  "hip",
  "buttock",
  "groin",
  "thigh",
  "knee",
  "lower_leg",
  "ankle",
  "foot",
] as const;

export const BodyRegion = z.enum(BODY_REGIONS);
export const BodySide = z.enum(["left", "right", "midline", "both"]);
export const BodySurface = z.enum(["front", "back"]);

export const PainQuality = z.enum([
  "aching",
  "burning",
  "stabbing",
  "shooting",
  "throbbing",
  "cramping",
  "tingling",
  "numb",
  "dull",
  "sharp",
  "pressure",
]);

/** 0–10 Numeric Rating Scale. */
export const PainIntensity = z.int().min(0).max(10);

const Timestamp = z.iso.datetime({ offset: true });
const Id = z.uuid();
const ShortText = z.string().trim().max(200);
const Notes = z.string().trim().max(2000);

export const PainLocation = z.strictObject({
  region: BodyRegion,
  side: BodySide,
  surface: BodySurface,
  intensity: PainIntensity,
  qualities: z.array(PainQuality).max(PainQuality.options.length).default([]),
});

export const PainEntry = z.strictObject({
  kind: z.literal("pain"),
  id: Id,
  recordedAt: Timestamp,
  locations: z.array(PainLocation).min(1).max(50),
  overallIntensity: PainIntensity,
  triggers: z.array(ShortText).max(20).default([]),
  notes: Notes.optional(),
});

export const DoseUnit = z.enum([
  "mg",
  "mcg",
  "g",
  "mL",
  "tablet",
  "capsule",
  "patch",
  "drop",
  "puff",
  "unit",
  "sachet",
]);

export const Route = z.enum([
  "oral",
  "sublingual",
  "topical",
  "transdermal",
  "inhaled",
  "intranasal",
  "rectal",
  "injection",
  "other",
]);

export const Medication = z.strictObject({
  name: ShortText.min(1),
  /** NZ Medicines Terminology concept id, when chosen from the catalogue. */
  nzmtId: z.string().regex(/^\d{6,18}$/).optional(),
  strength: ShortText.optional(),
});

export const MedicationDose = z.strictObject({
  kind: z.literal("dose"),
  id: Id,
  takenAt: Timestamp,
  /** When the dose was due, if it was part of a schedule. */
  scheduledFor: Timestamp.optional(),
  medication: Medication,
  amount: z.number().positive().max(100_000),
  unit: DoseUnit,
  route: Route,
  notes: Notes.optional(),
});

export const HealthRecord = z.discriminatedUnion("kind", [PainEntry, MedicationDose]);

export type BodyRegion = z.infer<typeof BodyRegion>;
export type PainLocation = z.infer<typeof PainLocation>;
export type PainEntry = z.infer<typeof PainEntry>;
export type MedicationDose = z.infer<typeof MedicationDose>;
export type HealthRecord = z.infer<typeof HealthRecord>;
