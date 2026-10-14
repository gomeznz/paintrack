import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./ui";

const LEVELS = Array.from({ length: 11 }, (_, i) => i);

/** 0–10 Numeric Rating Scale as a row of large tap targets. */
export function IntensityPicker({ value, onChange, label }: { value: number; onChange(v: number): void; label: string }) {
  return (
    <View style={styles.wrap} accessibilityLabel={label}>
      <View style={styles.row}>
        {LEVELS.map((level) => {
          const selected = level === value;
          return (
            <Pressable
              key={level}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${level} out of 10`}
              onPress={() => onChange(level)}
              style={[styles.cell, { borderColor: colors.scale[level] }, selected && { backgroundColor: colors.scale[level] }]}
            >
              <Text style={[styles.text, selected && styles.textSelected]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.ends}>
        <Text style={styles.endText}>No pain</Text>
        <Text style={styles.endText}>Worst imaginable</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: "row", gap: 3 },
  cell: {
    flex: 1,
    aspectRatio: 0.8,
    minHeight: 40,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  text: { fontSize: 15, fontWeight: "600", color: colors.text },
  textSelected: { color: "#FFFFFF" },
  ends: { flexDirection: "row", justifyContent: "space-between" },
  endText: { fontSize: 12, color: colors.muted },
});
