import { DoseUnit, Route, type MedicationDose } from "@paintrack/core/model";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput } from "react-native";
import { Button, Chip, ChipRow, colors, Screen, Section, styles as ui } from "../../components/ui";
import { useDatabase } from "../../data/DatabaseProvider";
import { recentMedications, saveRecord } from "../../data/records";
import { ROUTE_LABELS } from "../../format";

const WHEN = [
  { label: "Just now", minutes: 0 },
  { label: "15 min ago", minutes: 15 },
  { label: "30 min ago", minutes: 30 },
  { label: "1 hour ago", minutes: 60 },
  { label: "2 hours ago", minutes: 120 },
  { label: "4 hours ago", minutes: 240 },
] as const;

export default function NewDose() {
  const { db, changed } = useDatabase();
  const [recent, setRecent] = useState<MedicationDose["medication"][]>([]);
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<MedicationDose["unit"]>("tablet");
  const [route, setRoute] = useState<MedicationDose["route"]>("oral");
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    recentMedications(db).then(setRecent);
  }, [db]);

  const save = async () => {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!name.trim()) return Alert.alert("Which medication?", "Enter the medication name.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return Alert.alert("How much?", "Enter the amount you took.");
    setSaving(true);
    try {
      const dose: MedicationDose = {
        kind: "dose",
        id: Crypto.randomUUID(),
        takenAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
        medication: { name: name.trim(), ...(strength.trim() ? { strength: strength.trim() } : {}) },
        amount: parsedAmount,
        unit,
        route,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      await saveRecord(db, dose);
      changed();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save", "Please check your entry and try again.");
    }
  };

  return (
    <Screen>
      {recent.length > 0 && (
        <Section title="Recent">
          <ChipRow>
            {recent.map((med) => {
              const label = med.strength ? `${med.name} ${med.strength}` : med.name;
              return (
                <Chip
                  key={label}
                  label={label}
                  selected={name === med.name && strength === (med.strength ?? "")}
                  onPress={() => {
                    setName(med.name);
                    setStrength(med.strength ?? "");
                  }}
                />
              );
            })}
          </ChipRow>
        </Section>
      )}

      <Section title="Medication">
        <TextInput
          style={ui.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Paracetamol"
          placeholderTextColor={colors.muted}
          maxLength={200}
          autoCapitalize="words"
          autoComplete="off"
          importantForAutofill="no"
        />
        <TextInput
          style={ui.input}
          value={strength}
          onChangeText={setStrength}
          placeholder="Strength, e.g. 500 mg (optional)"
          placeholderTextColor={colors.muted}
          maxLength={200}
          autoComplete="off"
          importantForAutofill="no"
        />
      </Section>

      <Section title="How much?">
        <TextInput
          style={ui.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          accessibilityLabel="Amount"
          maxLength={8}
        />
        <ChipRow>
          {DoseUnit.options.map((u) => (
            <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
          ))}
        </ChipRow>
      </Section>

      <Section title="How was it taken?">
        <ChipRow>
          {Route.options.map((r) => (
            <Chip key={r} label={ROUTE_LABELS[r]} selected={route === r} onPress={() => setRoute(r)} />
          ))}
        </ChipRow>
      </Section>

      <Section title="When?">
        <ChipRow>
          {WHEN.map((w) => (
            <Chip key={w.minutes} label={w.label} selected={minutesAgo === w.minutes} onPress={() => setMinutesAgo(w.minutes)} />
          ))}
        </ChipRow>
      </Section>

      <Section title="Notes (optional)">
        <TextInput
          style={[ui.input, { minHeight: 60, textAlignVertical: "top" }]}
          multiline
          maxLength={2000}
          value={notes}
          onChangeText={setNotes}
          placeholderTextColor={colors.muted}
          autoComplete="off"
          importantForAutofill="no"
        />
      </Section>

      <Text style={ui.muted}>PainTrack records what you took. It doesn't give dosing advice; follow your prescriber's or pharmacist's instructions.</Text>
      <Button title={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
    </Screen>
  );
}
