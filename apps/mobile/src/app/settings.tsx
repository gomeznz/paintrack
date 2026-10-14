import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { Button, Chip, ChipRow, Screen, Section, styles as ui } from "../components/ui";
import { eraseEverything } from "../data/database";
import { useDatabase } from "../data/DatabaseProvider";
import { getSetting, setSetting } from "../data/records";
import { ensurePermission, REMINDER_TIMES, scheduleReminders } from "../reminders";
import { useAppLock } from "../security/AppLock";
import { LOCK_TIMEOUTS } from "../security/lockPolicy";

const REMINDERS_KEY = "reminders";

export default function Settings() {
  const { db } = useDatabase();
  const { lockNow, timeoutMs, setTimeoutMs } = useAppLock();
  const [reminders, setReminders] = useState<string[]>([]);

  useEffect(() => {
    getSetting(db, REMINDERS_KEY).then((stored) => {
      if (!stored) return;
      try {
        const labels: unknown = JSON.parse(stored);
        if (Array.isArray(labels)) setReminders(labels.filter((l): l is string => typeof l === "string"));
      } catch {
        // Ignore a corrupt setting; the user can choose again.
      }
    });
  }, [db]);

  const toggleReminder = async (label: string) => {
    const next = reminders.includes(label) ? reminders.filter((l) => l !== label) : [...reminders, label];
    if (next.length > reminders.length && !(await ensurePermission())) {
      Alert.alert("Notifications are off", "Allow notifications for PainTrack in your phone's settings to get reminders.");
      return;
    }
    await scheduleReminders(REMINDER_TIMES.filter((t) => next.includes(t.label)));
    await setSetting(db, REMINDERS_KEY, JSON.stringify(next));
    setReminders(next);
  };

  const confirmErase = () =>
    Alert.alert(
      "Delete all your data?",
      "Every pain and medication entry on this phone will be permanently erased. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            await scheduleReminders([]);
            await eraseEverything(db);
            // Locking unmounts every screen, so nothing touches the closed
            // database; unlocking starts afresh with a new key.
            lockNow();
          },
        },
      ],
    );

  return (
    <Screen>
      <Section title="Daily check-in reminders">
        <ChipRow>
          {REMINDER_TIMES.map((t) => (
            <Chip key={t.label} label={t.label} selected={reminders.includes(t.label)} onPress={() => toggleReminder(t.label)} />
          ))}
        </ChipRow>
        <Text style={ui.muted}>Reminders just say "Time for a quick check-in" so nothing private shows on your lock screen.</Text>
      </Section>

      <Section title="Lock PainTrack when I leave it">
        <ChipRow>
          {LOCK_TIMEOUTS.map((t) => (
            <Chip key={t.ms} label={t.label} selected={timeoutMs === t.ms} onPress={() => setTimeoutMs(t.ms)} />
          ))}
        </ChipRow>
        <Button title="Lock now" variant="secondary" onPress={lockNow} />
      </Section>

      <Section title="Your privacy">
        <Text style={ui.muted}>
          Your entries are stored only on this phone, in an encrypted database. The key is kept in your phone's secure
          storage and is never backed up or sent anywhere. There are no ads, analytics or trackers in PainTrack.
        </Text>
        <Text style={ui.muted}>
          Because nothing is backed up yet, deleting the app or losing your phone will lose your entries. Encrypted backup
          and sharing with your health professionals are coming.
        </Text>
      </Section>

      <Section title="Delete data">
        <Button title="Delete all my data" variant="danger" onPress={confirmErase} />
      </Section>
    </Screen>
  );
}
