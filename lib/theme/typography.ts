// App font system — Inter (@expo-google-fonts/inter), loaded in app/_layout.tsx.
// RN ignores numeric fontWeight on custom fonts: each weight is its OWN family.
// Always pick a weight from `font` (fontFamily) — never set fontWeight alongside.

import type { TextStyle } from "react-native";

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export type FontWeightName = keyof typeof font;

/** Convenience builder for a text style: text("bold", 17, colors.text). */
export function text(weight: FontWeightName, size: number, color?: string): TextStyle {
  return { fontFamily: font[weight], fontSize: size, ...(color ? { color } : null) };
}
