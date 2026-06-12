// Tiny AsyncStorage wrapper — the single place for app-level persisted flags
// (onboarding, future toggles). Reads swallow errors → null, so a storage hiccup
// can never block app start. Writes also swallow (a lost flag isn't fatal).

import AsyncStorage from "@react-native-async-storage/async-storage";

/** Persisted flag keys live here so they're not stringly-typed at call sites. */
export const ONBOARDING_SEEN = "onboarding_seen";

/** Read a stored string, or null if absent / on any read error. */
export async function get(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store a string value. Errors are swallowed (best-effort persistence). */
export async function set(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // best-effort — a lost flag isn't fatal
  }
}

/** Remove a stored key. Errors are swallowed (best-effort). */
export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // best-effort
  }
}
