import { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { PROVIDER_DEFAULT, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { fetchFeed } from "../lib/api/listings";
import { Listing } from "../lib/mock/listings";
import { PriceMarker } from "../components/PriceMarker";
import { BAKU_CENTER } from "../lib/places";

// Fit the camera to all pins: midpoint center + padded span (floor at 0.05 so a
// tight cluster isn't over-zoomed). 0–1 listings → centred default near Baku.
function regionForListings(ls: Listing[]): Region {
  if (ls.length < 2) {
    const c = ls[0] ?? { lat: BAKU_CENTER.lat, lng: BAKU_CENTER.lng };
    return { latitude: c.lat, longitude: c.lng, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const l of ls) {
    minLat = Math.min(minLat, l.lat);
    maxLat = Math.max(maxLat, l.lat);
    minLng = Math.min(minLng, l.lng);
    maxLng = Math.max(maxLng, l.lng);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.05),
  };
}

/**
 * Full-screen interactive map (card-push, immersive — no header bar). Shows
 * price pins for every active listing with coordinates. Tap a pin → it turns
 * magenta (selection); tapping empty map clears it. (Listing card → step 2.)
 */
export default function MapScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // iOS fires both the marker's onPress AND the map's onPress on a pin tap; this
  // guard lets the map-press clear only when it wasn't a pin tap (last ~350ms).
  const lastPinPress = useRef(0);

  useEffect(() => {
    let active = true;
    fetchFeed()
      .then((feed) => {
        if (active) setListings(feed.filter((l) => l.lat !== 0 && l.lng !== 0));
      })
      .catch(() => {
        if (active) setListings([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const region = useMemo(() => regionForListings(listings ?? []), [listings]);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {listings === null ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={brand.violet} />
        </View>
      ) : (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onPress={() => {
            if (Date.now() - lastPinPress.current < 350) return; // pin tap — keep selection
            setSelectedId(null);
          }}
        >
          {listings.map((l) => (
            <PriceMarker
              key={l.id}
              coordinate={{ latitude: l.lat, longitude: l.lng }}
              price={l.priceAzn}
              active={l.id === selectedId}
              onPress={() => {
                lastPinPress.current = Date.now();
                setSelectedId(l.id);
              }}
            />
          ))}
        </MapView>
      )}

      {/* Floating back button — top-left (keeps bottom-left clear for Apple's logo) */}
      <Pressable
        onPress={back}
        hitSlop={8}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Ionicons name="chevron-back" size={24} color="#1B1B1F" />
      </Pressable>
    </View>
  );
}
