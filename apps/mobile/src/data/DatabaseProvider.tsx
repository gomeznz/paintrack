import type { SQLiteDatabase } from "expo-sqlite";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button, colors } from "../components/ui";
import { DatabaseUnavailableError, eraseEverything, openDatabase } from "./database";

interface DatabaseContextValue {
  db: SQLiteDatabase;
  /** Bumped after every write so screens know to reload. */
  version: number;
  changed(): void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function useDatabase(): DatabaseContextValue {
  const value = useContext(DatabaseContext);
  if (!value) throw new Error("useDatabase must be used inside <DatabaseProvider>");
  return value;
}

/** Opens the encrypted database on mount and closes it on unmount (i.e. on lock). */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<DatabaseUnavailableError | Error | null>(null);
  const [version, setVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let opened: SQLiteDatabase | null = null;
    let cancelled = false;
    openDatabase()
      .then((database) => {
        if (cancelled) return database.closeAsync();
        opened = database;
        setDb(database);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e : new Error(String(e))));
    return () => {
      cancelled = true;
      setDb(null);
      void opened?.closeAsync().catch(() => {});
    };
  }, [attempt]);

  const changed = useCallback(() => setVersion((v) => v + 1), []);

  if (error) {
    const resettable = error instanceof DatabaseUnavailableError && error.resettable;
    return (
      <View style={styles.centred}>
        <Text style={styles.title}>Your records can't be opened</Text>
        <Text style={styles.body}>
          {resettable
            ? "The key that protects your records isn't available on this phone, for example because they were restored from a backup onto a new device. They can't be recovered here. You can start again with an empty diary."
            : error.message}
        </Text>
        {resettable && (
          <Button
            title="Start again (erases old records)"
            variant="danger"
            onPress={async () => {
              await eraseEverything();
              setError(null);
              setAttempt((a) => a + 1);
            }}
          />
        )}
      </View>
    );
  }

  if (!db) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator />
      </View>
    );
  }

  return <DatabaseContext.Provider value={{ db, version, changed }}>{children}</DatabaseContext.Provider>;
}

const styles = StyleSheet.create({
  centred: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center" },
  body: { fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 22 },
});
