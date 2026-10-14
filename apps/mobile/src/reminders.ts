import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Daily check-in reminders. The text is deliberately generic: notifications
 * show on lock screens and smartwatches and are visible to anyone nearby, so
 * they must never mention pain, medication names or doses.
 */

export const REMINDER_CONTENT = { title: "PainTrack", body: "Time for a quick check-in." } as const;
export const REMINDER_TIMES = [
  { label: "8 am", hour: 8, minute: 0 },
  { label: "1 pm", hour: 13, minute: 0 },
  { label: "6 pm", hour: 18, minute: 0 },
  { label: "9 pm", hour: 21, minute: 0 },
] as const;

const CHANNEL_ID = "reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Check-in reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Replaces all scheduled reminders with one per chosen time. */
export async function scheduleReminders(times: readonly { hour: number; minute: number }[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const { hour, minute } of times) {
    await Notifications.scheduleNotificationAsync({
      content: { ...REMINDER_CONTENT },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
}
