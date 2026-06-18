import { View, Text, Pressable } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { BAKU_CENTER } from "../lib/places";
import { Listing } from "../lib/mock/listings";

type Props = {
  listings: Listing[];
  onOpenListing: (id: string) => void;
  onOpenMap: () => void;
};

// Compact price pin label: 245000 → "245k ₼", 1400 → "1400 ₼". (Same as SearchMap.)
const pinPrice = (azn: number) => (azn >= 10000 ? `${Math.round(azn / 1000)}k ₼` : `${azn} ₼`);

// Center a touch SOUTH of Baku so pins sit in the upper half and the bottom
// strip (where Apple renders the "Maps" logo, bottom-left) stays clear/readable.
const REGION = {
  latitude: BAKU_CENTER.lat - 0.05,
  longitude: BAKU_CENTER.lng,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

/**
 * Home "Nearby" mini-map: a compact, NON-pannable city overview with price pins.
 * Map gestures are disabled (scroll/zoom/rotate/pitch) so it never steals the
 * vertical page scroll — only the pins (→ listing) and the "open map" badge
 * (→ full search map) are tappable.
 */
export function NearbyMap({ listings, onOpenListing, onOpenMap }: Props) {
  const { colors, mode } = useTheme();
  const { t } = useTranslation();

  const pins = listings.filter((l) => l.lat !== 0 && l.lng !== 0).slice(0, 15);

  return (
    <View
      style={{
        height: 220,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={REGION}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {pins.map((l) => (
          <Marker
            key={l.id}
            coordinate={{ latitude: l.lat, longitude: l.lng }}
            onPress={() => onOpenListing(l.id)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: brand.violet,
                borderWidth: 1.5,
                borderColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 3,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>{pinPrice(l.priceAzn)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* "Open full map" badge — bottom-right */}
      <Pressable
        onPress={onOpenMap}
        hitSlop={8}
        style={{
          position: "absolute",
          bottom: 30,
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
        <Text style={{ color: brand.violet, fontSize: 12, fontWeight: "700" }}>{t("home.openMap")}</Text>
        <Ionicons name="chevron-forward" size={14} color={brand.violet} />
      </Pressable>
    </View>
  );
}
