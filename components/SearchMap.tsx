import { useEffect, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { Listing, formatPrice, formatArea } from "../lib/mock/listings";
import { BAKU_CENTER } from "../lib/places";
import { buildListingTitle } from "../lib/listingTitle";
import { useLanguage } from "../lib/i18n/languages";

type Props = {
  listings: Listing[];
  onOpen: (id: string) => void;
};

// Compact pin label: 245000 → "245k ₼", 1400 → "1400 ₼".
const pinPrice = (azn: number) => (azn >= 10000 ? `${Math.round(azn / 1000)}k ₼` : `${azn} ₼`);

const INITIAL_REGION = {
  latitude: BAKU_CENTER.lat,
  longitude: BAKU_CENTER.lng,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

/**
 * Search — Map (native). Shows price pins for the SAME filtered set as the list.
 * Tap a pin → bottom preview card → tap it → Property Detail.
 * (Clustering left for later — react-native-maps-clustering isn't bundled with
 * the SDK; a handful of pins render fine without it.)
 */
export function SearchMap({ listings, onOpen }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { current: lang } = useLanguage();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = listings.find((l) => l.id === selectedId) ?? null;

  // Let custom markers render their views, then freeze them for performance.
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const id = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(id);
  }, [selectedId, listings]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        onPress={() => setSelectedId(null)}
      >
        {listings.map((l) => {
          const active = l.id === selectedId;
          return (
            <Marker
              key={l.id}
              coordinate={{ latitude: l.lat, longitude: l.lng }}
              onPress={() => setSelectedId(l.id)}
              tracksViewChanges={tracking}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: active ? brand.magenta : brand.violet,
                  borderWidth: 1.5,
                  borderColor: "#FFFFFF",
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 3,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>
                  {pinPrice(l.priceAzn)}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Empty state overlay (filters matched nothing) */}
      {listings.length === 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 20,
                paddingVertical: 16,
                alignItems: "center",
                gap: 6,
              }}
            >
              <Ionicons name="search-outline" size={32} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                {t("search.emptyTitle")}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Selected listing preview (mini card) → Property Detail */}
      {selected && (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 16 }}>
          <Pressable
            onPress={() => onOpen(selected.id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
              opacity: pressed ? 0.95 : 1,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            })}
          >
            <Image source={{ uri: selected.image }} style={{ width: 96, height: 96 }} resizeMode="cover" />
            <View style={{ flex: 1, padding: 12, gap: 4, justifyContent: "center" }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                {formatPrice(selected.priceAzn)}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                {buildListingTitle(selected, t, lang)}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 13 }}>
                {formatArea(selected, t)} · {selected.rooms} {t("home.roomsUnit")}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedId(null)}
              hitSlop={8}
              style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(20,18,24,0.55)", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={15} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        </View>
      )}
    </View>
  );
}
