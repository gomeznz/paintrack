import type { HealthRecord } from "@paintrack/core/model";
import { Link, router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { describeLocation } from "../body/regions";
import { Button, colors, Screen, styles as ui } from "../components/ui";
import { useDatabase } from "../data/DatabaseProvider";
import { deleteRecord, listRecords, occurredAt } from "../data/records";
import { dayKey, formatDay, formatDose, formatTime } from "../format";

export default function Home() {
  const { db, version, changed } = useDatabase();
  const [records, setRecords] = useState<HealthRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    listRecords(db).then((r) => active && setRecords(r));
    return () => {
      active = false;
    };
  }, [db, version]);

  const days = useMemo(() => {
    const groups: { key: string; label: string; records: HealthRecord[] }[] = [];
    for (const record of records ?? []) {
      const at = occurredAt(record);
      const key = dayKey(at);
      const last = groups.at(-1);
      if (last?.key === key) last.records.push(record);
      else groups.push({ key, label: formatDay(at), records: [record] });
    }
    return groups;
  }, [records]);

  const confirmDelete = (record: HealthRecord) =>
    Alert.alert("Delete this entry?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRecord(db, record.id);
          changed();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" accessibilityLabel="Settings" style={styles.headerLink}>
              Settings
            </Link>
          ),
        }}
      />
      <View style={styles.actions}>
        <Button title="Log pain" onPress={() => router.push("/pain/new")} style={styles.action} />
        <Button title="Log medication" onPress={() => router.push("/dose/new")} style={styles.action} />
      </View>

      {records && records.length === 0 && (
        <View style={ui.card}>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={ui.muted}>
            Your entries are stored only on this phone, encrypted. Start by logging how you feel right now.
          </Text>
        </View>
      )}

      {days.map((day) => (
        <View key={day.key} style={styles.day}>
          <Text style={styles.dayTitle} accessibilityRole="header">
            {day.label}
          </Text>
          {day.records.map((record) => (
            <Pressable
              key={record.id}
              onLongPress={() => confirmDelete(record)}
              accessibilityHint="Long press to delete"
              style={ui.card}
            >
              {record.kind === "pain" ? <PainRow entry={record} /> : <DoseRow dose={record} />}
            </Pressable>
          ))}
        </View>
      ))}
    </Screen>
  );
}

function PainRow({ entry }: { entry: Extract<HealthRecord, { kind: "pain" }> }) {
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: colors.scale[entry.overallIntensity] }]}>
        <Text style={styles.badgeText}>{entry.overallIntensity}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>
          Pain {entry.overallIntensity}/10 · {formatTime(entry.recordedAt)}
        </Text>
        <Text style={ui.muted}>
          {entry.locations.map((l) => `${describeLocation(l)} ${l.intensity}`).join(", ")}
        </Text>
        {entry.notes ? <Text style={ui.muted}>{entry.notes}</Text> : null}
      </View>
    </View>
  );
}

function DoseRow({ dose }: { dose: Extract<HealthRecord, { kind: "dose" }> }) {
  return (
    <View style={styles.row}>
      <View style={[styles.badge, styles.doseBadge]}>
        <Text style={styles.badgeText}>℞</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>
          {dose.medication.name}
          {dose.medication.strength ? ` ${dose.medication.strength}` : ""} · {formatTime(dose.takenAt)}
        </Text>
        <Text style={ui.muted}>{formatDose(dose)}</Text>
        {dose.notes ? <Text style={ui.muted}>{dose.notes}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerLink: { color: colors.primary, fontSize: 16 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  day: { gap: 8 },
  dayTitle: { fontSize: 15, fontWeight: "600", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  doseBadge: { backgroundColor: colors.primary },
  badgeText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
