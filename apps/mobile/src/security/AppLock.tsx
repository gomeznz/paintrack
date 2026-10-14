import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { Button, colors } from "../components/ui";
import { parseLockTimeout, shouldLockOnReturn } from "./lockPolicy";

/**
 * Gates the whole app behind Face ID / fingerprint / device passcode.
 *
 * While locked, nothing below this component is rendered, so the database
 * provider unmounts and closes the database. When the app goes to the
 * background a plain cover replaces the content, so health data doesn't show
 * in the app switcher.
 */

const TIMEOUT_KEY = "paintrack.lock-timeout";

type LockState = "checking" | "no-device-security" | "locked" | "unlocked";

interface LockContextValue {
  lockNow(): void;
  timeoutMs: number;
  setTimeoutMs(ms: number): Promise<void>;
}

const LockContext = createContext<LockContextValue | null>(null);

export function useAppLock(): LockContextValue {
  const value = useContext(LockContext);
  if (!value) throw new Error("useAppLock must be used inside <AppLock>");
  return value;
}

export function AppLock({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LockState>("checking");
  const [covered, setCovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutMs, setTimeoutState] = useState(() => parseLockTimeout(null));
  const backgroundedAt = useRef<number | null>(null);
  const authenticating = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    setError(null);
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        setState("no-device-security");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock PainTrack",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        backgroundedAt.current = null;
        setState("unlocked");
      } else if (result.error === "passcode_not_set" || result.error === "not_enrolled") {
        setState("no-device-security");
      } else {
        setState("locked");
        if (result.error !== "user_cancel" && result.error !== "system_cancel" && result.error !== "app_cancel") {
          setError("Couldn't confirm it's you. Try again.");
        }
      }
    } finally {
      authenticating.current = false;
    }
  }, []);

  useEffect(() => {
    SecureStore.getItemAsync(TIMEOUT_KEY)
      .then((stored) => setTimeoutState(parseLockTimeout(stored)))
      .catch(() => {});
    void unlock();
  }, [unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        setCovered(false);
        if (shouldLockOnReturn(backgroundedAt.current, Date.now(), timeoutMs)) {
          setState((s) => (s === "unlocked" ? "locked" : s));
        }
        backgroundedAt.current = null;
      } else {
        // "inactive" (iOS app switcher, notification centre) or "background".
        setCovered(true);
        if (next === "background" && backgroundedAt.current === null) backgroundedAt.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, [timeoutMs]);

  const setTimeoutMs = useCallback(async (ms: number) => {
    await SecureStore.setItemAsync(TIMEOUT_KEY, String(ms));
    setTimeoutState(ms);
  }, []);

  const lockNow = useCallback(() => setState("locked"), []);

  if (state === "unlocked") {
    return (
      <LockContext.Provider value={{ lockNow, timeoutMs, setTimeoutMs }}>
        {children}
        {covered && <View style={[StyleSheet.absoluteFill, styles.cover]} />}
      </LockContext.Provider>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.cover, styles.centred]}>
      <Text style={styles.title}>PainTrack</Text>
      {state === "no-device-security" ? (
        <>
          <Text style={styles.body}>
            To protect your health records, PainTrack needs your phone to have a screen lock (a passcode, PIN,
            fingerprint or Face ID). Set one up in your phone's settings, then try again.
          </Text>
          <Button title="Try again" onPress={unlock} />
        </>
      ) : (
        <>
          <Text style={styles.body}>Your records are locked.</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          {state === "locked" && <Button title="Unlock" onPress={unlock} />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { backgroundColor: colors.background },
  centred: { alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  body: { fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 22 },
  error: { fontSize: 15, color: colors.danger, textAlign: "center" },
});
