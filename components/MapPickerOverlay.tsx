import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { PROVIDER_DEFAULT, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { PrimaryButton } from "./Button";
import { coordsForPlace, BAKU_CENTER } from "../lib/places";

// Rough Azerbaijan bounding box — device location outside it falls back to Baku.
const inAzerbaijan = (lat: number, lng: number) =>
  lat >= 38.3 && lat <= 41.95 && lng >= 44.6 && lng <= 50.7;

const toRegion = (lat: number, lng: number): Region => ({
  latitude: lat,
  longitude: lng,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
});

type Props = {
  visible: boolean;
  startPlaceId?: string | null;
  startCoords?: { lat: number; lng: number } | null;
  onConfirm: (c: { lat: number; lng: number }) => void;
  onCancel: () => void;
};

/**
 * Full-screen map point picker rendered as an absolute-fill OVERLAY inside the
 * Add Listing form (NOT a react-native Modal — a modal-over-modal kills the
 * Apple Maps gestures on first open). Coordinates flow out via onConfirm; the
 * form owns the picked value (useMapPick). "Drag the map under the fixed pin."
 */
export function MapPickerOverlay({ visible, startPlaceId, startCoords, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);

  // Synchronous best-guess start: previous pin → selected place → Baku centre.
  const start =
    startCoords != null && !Number.isNaN(startCoords.lat) && !Number.isNaN(startCoords.lng)
      ? { lat: startCoords.lat, lng: startCoords.lng }
      : startPlaceId
        ? coordsForPlace(startPlaceId)
        : BAKU_CENTER;

  // The map centre = pin position (crosshair is fixed to screen centre).
  const [center, setCenter] = useState({ lat: start.lat, lng: start.lng });

  // Overlay stays mounted (returns null when hidden), so re-sync center to the
  // start each time it opens — mirrors the old screen's fresh-mount behaviour.
  useEffect(() => {
    if (visible) setCenter({ lat: start.lat, lng: start.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    // No explicit start (no place, no previous pin) → try device location.
    if (!visible || startCoords != null || startPlaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return; // keep Baku fallback, don't block
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        if (cancelled || !inAzerbaijan(latitude, longitude)) return;
        mapRef.current?.animateToRegion(toRegion(latitude, longitude), 600);
      } catch {
        // ignore — Baku fallback stays
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: colors.bg }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
          {/* Header: X (left) + title. No logo. */}
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
              {t("mapPicker.title")}
            </Text>
            <Pressable onPress={onCancel} hitSlop={10} style={({ pressed }) => ({ paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={{ flex: 1 }}
              initialRegion={toRegion(start.lat, start.lng)}
              onRegionChangeComplete={(r) => setCenter({ lat: r.latitude, lng: r.longitude })}
            />

            {/* Fixed crosshair pin — overlay, never intercepts gestures */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {/* pin lifted so its tip rests on the exact screen centre */}
                <Ionicons name="location" size={44} color={brand.magenta} style={{ marginBottom: 44 }} />
                {/* small ground dot at the true centre */}
                <View
                  style={{
                    position: "absolute",
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "rgba(0,0,0,0.35)",
                  }}
                />
              </View>
            </View>

            {/* Hint chip */}
            <View style={{ position: "absolute", top: 12, left: 16, right: 16, alignItems: "center" }} pointerEvents="none">
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{t("mapPicker.hint")}</Text>
              </View>
            </View>
          </View>

          {/* Confirm */}
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
            <PrimaryButton label={t("mapPicker.confirm")} onPress={() => onConfirm({ lat: center.lat, lng: center.lng })} />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </View>
  );
}
