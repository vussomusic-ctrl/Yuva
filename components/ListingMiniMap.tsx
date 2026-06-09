import { View, Text, Pressable, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";

type Props = {
  lat: number;
  lng: number;
  district?: string;
};

// Read-only mini-map for Property Detail: a non-interactive preview with one
// marker; tapping opens the location in the maps app. Gestures are disabled so
// it never fights the parent ScrollView (pointerEvents="none" lets the tap
// reach the wrapping Pressable). Street-level delta (single point), unlike the
// Search map's wide city overview.
export default function ListingMiniMap({ lat, lng, district }: Props) {
  const { colors, mode } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  // Open the in-app full-screen location view (interactive map + Route).
  const open = () =>
    router.push(
      `/property-map?lat=${lat}&lng=${lng}&district=${encodeURIComponent(district ?? "")}`,
    );

  return (
    <Pressable
      onPress={open}
      style={{
        height: 180,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} />
      </MapView>

      {/* "open" affordance (tap → full-screen map) */}
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
