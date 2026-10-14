import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../components/ui";
import { DatabaseProvider } from "../data/DatabaseProvider";
import { AppLock } from "../security/AppLock";
import "../reminders";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppLock>
        <DatabaseProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.text },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ title: "PainTrack" }} />
            <Stack.Screen name="pain/new" options={{ title: "Log pain", presentation: "modal" }} />
            <Stack.Screen name="dose/new" options={{ title: "Log medication", presentation: "modal" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
        </DatabaseProvider>
      </AppLock>
    </SafeAreaProvider>
  );
}
