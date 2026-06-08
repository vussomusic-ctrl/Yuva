// Supabase client (ЗАХОД 4 — stage 1).
// URL + anon key come from .env via EXPO_PUBLIC_* (embedded at build time).
// Session is persisted in AsyncStorage and auto-refreshed, so the user stays
// logged in across app restarts.

import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — check yuva-app/.env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No OAuth deep-link callback to parse (native handles its own session).
    detectSessionInUrl: false,
  },
});

// Pause/resume token auto-refresh with app foreground/background (native only;
// on web the tab lifecycle handles this). Recommended by the Supabase RN guide.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
