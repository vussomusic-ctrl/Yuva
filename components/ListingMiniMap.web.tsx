import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";

type Props = {
  lat: number;
  lng: number;
  district?: string;
};

// Web fallback: react-native-maps is a native module and doesn't run on web, so
// we show a themed card (same height, no layout jump). Still tappable — Linking
// opens Google Maps in a new tab.
export default function ListingMiniMap({ lat, lng, district }: Props) {
  const { colors, mode } = useTheme();
  const { t } = useTranslation();

  const open = () =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});

  return (
    <Pressable
      onPress={open}
      style={{
        height: 180,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: mode === "dark" ? "#15171C" : "#E8EAF1",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Ionicons name="location" size={40} color={brand.magenta} />

      <View
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
          backgroundColor: mode === "dark" ? "rgba(20,18,24,0.85)" : "rgba(255,255,255,0.92)",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: brand.violet, fontSize: 12, fontWeight: "700" }}>
          {t("propertyDetail.viewMap")}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={brand.violet} />
      </View>
    </Pressable>
  );
}
