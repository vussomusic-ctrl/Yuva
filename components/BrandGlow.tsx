import { View } from "react-native";
import { brand } from "../lib/theme/colors";

/**
 * Soft, organic radial brand glow.
 *
 * react-native-svg isn't in the project, so instead of a real radial gradient
 * we layer several low-opacity brand-coloured circles with slight offsets.
 * Overlapping the translucent rings produces a smooth bloom that fades into the
 * background — no plate, box or hard edge behind the logo (per the brand rules).
 */
const RINGS = [
  { size: 340, color: brand.violet, opacity: 0.04, x: 0, y: -12 },
  { size: 312, color: brand.blue, opacity: 0.04, x: 30, y: 20 },
  { size: 286, color: brand.magenta, opacity: 0.05, x: -30, y: 14 },
  { size: 256, color: brand.violet, opacity: 0.05, x: 16, y: -8 },
  { size: 228, color: brand.orange, opacity: 0.06, x: 22, y: -20 },
  { size: 204, color: brand.magenta, opacity: 0.07, x: -16, y: 12 },
  { size: 180, color: brand.violet, opacity: 0.08, x: -6, y: 6 },
  { size: 152, color: brand.magenta, opacity: 0.09, x: 8, y: 4 },
  { size: 128, color: brand.violet, opacity: 0.1, x: 0, y: 2 },
  { size: 104, color: brand.violet, opacity: 0.11, x: 0, y: 0 },
];

export function BrandGlow({ size = 340 }: { size?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {RINGS.map((ring, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            width: ring.size,
            height: ring.size,
            borderRadius: ring.size / 2,
            backgroundColor: ring.color,
            opacity: ring.opacity,
            transform: [{ translateX: ring.x }, { translateY: ring.y }],
          }}
        />
      ))}
    </View>
  );
}
