import "../global.css";
import "../lib/i18n";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../lib/theme/ThemeContext";
import { FavoritesProvider } from "../lib/favorites";
import { FiltersProvider } from "../lib/filters-state";
import { MapPickProvider } from "../lib/map-pick";

function RootInner() {
  const { mode, colors } = useTheme();
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
        <FavoritesProvider>
          <FiltersProvider>
            <MapPickProvider>
              <RootInner />
            </MapPickProvider>
          </FiltersProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
