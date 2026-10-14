import { PainQuality, type PainEntry } from "@paintrack/core/model";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { AREA_BY_KEY, describeLocation, type MapArea, type Surface } from "../../body/regions";
import { BodyMap } from "../../components/BodyMap";
import { IntensityPicker } from "../../components/IntensityPicker";
import { Button, Chip, ChipRow, colors, Screen, Section, styles as ui } from "../../components/ui";
import { useDatabase } from "../../data/DatabaseProvider";
import { saveRecord } from "../../data/records";
import { QUALITY_LABELS } from "../../format";

type Quality = PainEntry["locations"][number]["qualities"][number];
interface Selection {
  intensity: number;
  qualities: Quality[];
}

const DEFAULT_INTENSITY = 5;

export default function NewPain() {
  const { db, changed } = useDatabase();
  const [surface, setSurface] = useState<Surface>("front");
  const [selected, setSelected] = useState<Map<string, Selection>>(new Map());
  const [overall, setOverall] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const intensities = useMemo(
    () => new Map([...selected].map(([key, s]) => [key, s.intensity])),
    [selected],
  );
  const highest = Math.max(0, ...intensities.values());
  const overallValue = overall ?? highest;

  const update = (key: string, change: (s: Selection) => Selection | null) =>
    setSelected((prev) => {
      const next = new Map(prev);
      const current = next.get(key) ?? { intensity: DEFAULT_INTENSITY, qualities: [] };
      const result = change(current);
      if (result) next.set(key, result);
      else next.delete(key);
      return next;
    });

  const toggleArea = (area: MapArea) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(area.key)) next.delete(area.key);
      else next.set(area.key, { intensity: DEFAULT_INTENSITY, qualities: [] });
      return next;
    });

  const save = async () => {
    if (selected.size === 0) {
      Alert.alert("Where does it hurt?", "Tap at least one area on the body map.");
      return;
    }
    setSaving(true);
    try {
      const entry: PainEntry = {
        kind: "pain",
        id: Crypto.randomUUID(),
        recordedAt: new Date().toISOString(),
        locations: [...selected].map(([key, s]) => {
          const area = AREA_BY_KEY.get(key)!;
          return { region: area.region, side: area.side, surface: area.surface, intensity: s.intensity, qualities: s.qualities };
        }),
        overallIntensity: overallValue,
        triggers: [],
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      await saveRecord(db, entry);
      changed();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save", "Please check your entry and try again.");
    }
  };

  return (
    <Screen>
      <BodyMap surface={surface} onSurfaceChange={setSurface} selected={intensities} onToggle={toggleArea} />

      {[...selected].map(([key, s]) => {
        const area = AREA_BY_KEY.get(key)!;
        const name = describeLocation(area);
        return (
          <View key={key} style={ui.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={ui.sectionTitle}>{name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} onPress={() => update(key, () => null)} hitSlop={12}>
                <Text style={{ color: colors.danger, fontSize: 15 }}>Remove</Text>
              </Pressable>
            </View>
            <IntensityPicker label={`${name} pain`} value={s.intensity} onChange={(v) => update(key, (c) => ({ ...c, intensity: v }))} />
            <Text style={ui.label}>What does it feel like?</Text>
            <ChipRow>
              {PainQuality.options.map((q) => (
                <Chip
                  key={q}
                  label={QUALITY_LABELS[q]}
                  selected={s.qualities.includes(q)}
                  onPress={() =>
                    update(key, (c) => ({
                      ...c,
                      qualities: c.qualities.includes(q) ? c.qualities.filter((x) => x !== q) : [...c.qualities, q],
                    }))
                  }
                />
              ))}
            </ChipRow>
          </View>
        );
      })}

      {selected.size > 0 && (
        <Section title="Overall, how bad is your pain right now?">
          <IntensityPicker label="Overall pain" value={overallValue} onChange={setOverall} />
        </Section>
      )}

      <Section title="Notes (optional)">
        <TextInput
          style={[ui.input, { minHeight: 80, textAlignVertical: "top" }]}
          multiline
          maxLength={2000}
          value={notes}
          onChangeText={setNotes}
          placeholder="What were you doing? Anything that helped?"
          placeholderTextColor={colors.muted}
          autoCorrect
          // Keep health notes out of keyboard learning / cloud suggestions where the OS allows.
          autoComplete="off"
          importantForAutofill="no"
        />
      </Section>

      <Button title={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
    </Screen>
  );
}
