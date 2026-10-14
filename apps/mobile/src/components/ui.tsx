import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

export const colors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  text: "#1B1F24",
  muted: "#5B6470",
  border: "#D9DEE5",
  primary: "#1F5FAD",
  primaryText: "#FFFFFF",
  selected: "#E3EDFA",
  danger: "#B42318",
  // 0–10 pain scale, green → amber → red.
  scale: [
    "#2E7D32", "#4E8F2E", "#6EA12A", "#8FB226", "#B0B822",
    "#C9A21D", "#D98A1A", "#E06F18", "#D9531A", "#C9381E", "#B21F24",
  ],
} as const;

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: 16, gap: 20, paddingBottom: 48 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: "600" },
  buttonTextSecondary: { color: colors.primary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  chipSelected: { backgroundColor: colors.selected, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 15 },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  label: { fontSize: 15, color: colors.muted },
  muted: { fontSize: 14, color: colors.muted },
});
