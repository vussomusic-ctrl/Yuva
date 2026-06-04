import "../global.css";
import "../lib/i18n";

import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../lib/theme/ThemeContext";

function RootInner() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootInner />
    </ThemeProvider>
  );
}
