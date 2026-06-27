import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { Listing } from "../lib/mock/listings";
import { BAKU_CENTER } from "../lib/places";

type Props = {
  listings: Listing[];
  selectedId: string | null; // controlled by the parent (sheet shows the selected card)
  onSelectListing: (id: string | null) => void; // pin tap → id; empty-map tap → null
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
 * Search — Map (native). Price pins for the SAME filtered set as the list.
 * Controlled: the parent owns `selectedId` and renders the selected card in the
 * draggable sheet (no preview card here — it would sit under the sheet).
 */
export function SearchMap({ listings, selectedId, onSelectListing }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // A custom Marker tap falls through and ALSO triggers MapView.onPress (a phantom
  // empty-map tap that would instantly clear the selection). This flag swallows
  // that follow-up press for a short window after a real pin tap.
  const justSelectedRef = useRef(false);

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
        onPress={() => {
          if (justSelectedRef.current) return; // phantom press right after a pin tap
          onSelectListing(null);
        }}
      >
        {listings.map((l) => {
          const active = l.id === selectedId;
          return (
            <Marker
              key={l.id}
              coordinate={{ latitude: l.lat, longitude: l.lng }}
              onPress={() => {
                justSelectedRef.current = true;
                onSelectListing(l.id);
                setTimeout(() => { justSelectedRef.current = false; }, 300);
              }}
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
    </View>
  );
}
