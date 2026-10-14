import type { MedicationDose, PainEntry } from "@paintrack/core/model";

const LOCALE = "en-NZ";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

/** "Today", "Yesterday" or e.g. "Monday 12 October". */
export function formatDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const UNIT_LABELS: Partial<Record<MedicationDose["unit"], [string, string]>> = {
  tablet: ["tablet", "tablets"],
  capsule: ["capsule", "capsules"],
  patch: ["patch", "patches"],
  drop: ["drop", "drops"],
  puff: ["puff", "puffs"],
  unit: ["unit", "units"],
  sachet: ["sachet", "sachets"],
};

export function formatDose(dose: Pick<MedicationDose, "amount" | "unit">): string {
  const plural = UNIT_LABELS[dose.unit];
  const unit = plural ? plural[dose.amount === 1 ? 0 : 1] : dose.unit;
  return `${dose.amount} ${unit}`;
}

export function maxIntensity(entry: Pick<PainEntry, "locations">): number {
  return entry.locations.reduce((max, loc) => Math.max(max, loc.intensity), 0);
}

export const ROUTE_LABELS: Record<MedicationDose["route"], string> = {
  oral: "By mouth",
  sublingual: "Under tongue",
  topical: "On skin",
  transdermal: "Patch",
  inhaled: "Inhaled",
  intranasal: "Nasal",
  rectal: "Rectal",
  injection: "Injection",
  other: "Other",
};

export const QUALITY_LABELS: Record<PainEntry["locations"][number]["qualities"][number], string> = {
  aching: "Aching",
  burning: "Burning",
  stabbing: "Stabbing",
  shooting: "Shooting",
  throbbing: "Throbbing",
  cramping: "Cramping",
  tingling: "Tingling",
  numb: "Numb",
  dull: "Dull",
  sharp: "Sharp",
  pressure: "Pressure",
};
