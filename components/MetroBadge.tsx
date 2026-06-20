import { View, Text } from "react-native";

import { font } from "../lib/theme/typography";

/** Native metro mark — green circle with a white "M" (no PNG/asset). */
export function MetroBadge({ size = 16 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#0F9D58",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: Math.round(size * 0.62), lineHeight: Math.round(size * 0.75) }}>
        M
      </Text>
    </View>
  );
}
