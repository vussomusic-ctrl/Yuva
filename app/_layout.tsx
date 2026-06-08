import "../global.css";
import "../lib/i18n";

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../lib/theme/ThemeContext";
import { AuthProvider, useAuth } from "../lib/auth";
import { FavoritesProvider } from "../lib/favorites";
import { FiltersProvider } from "../lib/filters-state";
import { MapPickProvider } from "../lib/map-pick";

// Auth-aware navigation: a logged-in user who lands on the splash/welcome/auth
// screens (e.g. after an app restart with a restored session) is sent straight
// into the app. Guests are NOT forced out of the tabs — they can browse.
function useAuthRedirect() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const top = segments[0]; // undefined on splash ("/")
    const inAuthFlow =
      top === undefined ||
      top === "welcome" ||
      top === "login" ||
      top === "create-account";
    if (session && inAuthFlow) router.replace("/home");
  }, [session, loading, segments, router]);
}

function RootInner() {
  const { mode, colors } = useTheme();
  useAuthRedirect();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="property/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="my-listings" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="add-listing" options={{ presentation: "modal" }} />
        <Stack.Screen name="filters" options={{ presentation: "modal" }} />
        <Stack.Screen name="map-picker" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <FiltersProvider>
              <MapPickProvider>
                <RootInner />
              </MapPickProvider>
            </FiltersProvider>
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
