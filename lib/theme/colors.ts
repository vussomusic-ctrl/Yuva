export const brand = {
  violet: "#8B3FD6",
  orange: "#F5921E",
  magenta: "#EC2D8E",
  blue: "#2E7FE8",
  gradient: ["#8B3FD6", "#EC2D8E"] as const,
};

// Pastel surface tints + matching shadow colors for raised "clay/3D" cards.
// Light-mode values; dark currently mirrors them (revisit per-theme later).
export const tints = {
  violet: { bg: "#F3EDFB", shadow: "#8B3FD6" },
  blue: { bg: "#EAF1FC", shadow: "#2E7FE8" },
  green: { bg: "#ECF7EE", shadow: "#3DB06B" },
  peach: { bg: "#FCF1E8", shadow: "#F5921E" },
  magenta: { bg: "#FCEAF3", shadow: "#EC2D8E" },
} as const;

export type TintKey = keyof typeof tints;

export type Theme = {
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  tabBar: string;
  tabInactive: string;
  brandTitle: string;
  // Destructive actions (e.g. log out). Brighter in dark for legibility.
  danger: string;
  // Single smooth top→bottom page gradient (no hard seam).
  bgGradient: readonly [string, string];
};

export const lightTheme: Theme = {
  bg: "#F7F7F9",
  card: "#FFFFFF",
  text: "#1B1B1F",
  textSecondary: "#6B6B73",
  border: "#E5E5E7",
  tabBar: "#FFFFFF",
  tabInactive: "#9E9EA6",
  // Deep violet used for the brand wordmark on light backgrounds.
  brandTitle: "#490081",
  danger: "#E5484D",
  bgGradient: ["#EBE3F0", "#F7F7F9"],
};

export const darkTheme: Theme = {
  bg: "#121212",
  card: "#1E1E1E",
  text: "#F7F7F9",
  textSecondary: "#A0A0A8",
  border: "#2A2A2E",
  tabBar: "#1A1A1A",
  tabInactive: "#6B6B73",
  // Light violet keeps the wordmark legible on the Obsidian background.
  brandTitle: "#F0DBFF",
  danger: "#FF6B6B",
  // Violet-tinted Obsidian fading to near-black — same continuous gradient idea.
  bgGradient: ["#1A1320", "#121212"],
};
