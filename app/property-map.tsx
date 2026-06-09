import { View, Text, Pressable, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { PrimaryButton } from "../components/Button";

// Full-screen, read-only location view for a listing. Interactive map (zoom/pan)
// + a fixed marker; "Route" opens turn-by-turn directions in the maps app.
// Coords arrive via params from the detail mini-map.
export default function PropertyMapScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; district?: string }>();

  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const district = params.district ?? "";
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));
  const route = () =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      {/* Header: X (left) + title (center) */}
      <View style={{ height: 56, justifyContent: "center" }}>
        <Text
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          {t("propertyDetail.locationTitle")}
        </Text>
        <Pressable onPress={close} hitSlop={10} style={({ pressed }) => ({ paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      {valid ? (
        <View style={{ flex: 1 }}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} />
          </MapView>

          {district !== "" && (
            <View style={{ position: "absolute", top: 12, left: 16, right: 16, alignItems: "center" }} pointerEvents="none">
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  maxWidth: "100%",
                }}
              >
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>
                  {district}
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
          <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: "center" }}>
            {district}
          </Text>
        </View>
      )}

      {/* Route → external maps directions */}
      {valid && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <PrimaryButton label={t("propertyDetail.route")} onPress={route} />
        </View>
      )}
    </SafeAreaView>
  );
}
