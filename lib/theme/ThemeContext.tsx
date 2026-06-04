import React, { createContext, useContext, useState, useCallback } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, Theme } from "./colors";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  colors: lightTheme,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Follow the device appearance by default; a manual toggle (future Settings
  // screen) can override it for the rest of the session.
  const system = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(null);

  const mode: ThemeMode = override ?? (system === "dark" ? "dark" : "light");

  const toggleTheme = useCallback(() => {
    setOverride(mode === "light" ? "dark" : "light");
  }, [mode]);

  const colors = mode === "light" ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
