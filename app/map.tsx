import { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator, StyleSheet, Animated, Image, Text, InteractionManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { PROVIDER_DEFAULT, Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { fetchFeed } from "../lib/api/listings";
import { Listing, formatPrice, formatArea } from "../lib/mock/listings";
import { isLandType } from "../lib/propertyTypes";
import { buildListingTitle } from "../lib/listingTitle";
import { useLanguage } from "../lib/i18n/languages";
import { PriceMarker } from "../components/PriceMarker";
import { BAKU_CENTER } from "../lib/places";

// Off-screen offset for the slide-in listing card (px below its resting spot).
const CARD_HIDDEN = 240;

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

// Stable immediate region (Baku default) for the FIRST frame. Mounting MapView
// unconditionally with a constant initialRegion — instead of behind the async
// fetch — is what keeps Apple Maps' gestures bound (a late mount leaves them dead).
const INITIAL_REGION = regionForListings([]);

/**
 * Full-screen interactive map (card-push, immersive — no header bar). Shows
 * price pins for every active listing with coordinates. Tap a pin → it turns
 * magenta (selection); tapping empty map clears it. (Listing card → step 2.)
 */
export default function MapScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { t } = useTranslation();
  const { current: lang } = useLanguage();

  const [listings, setListings] = useState<Listing[] | null>(null);
  // Defer the native MapView until the push transition finishes — mounting it
  // mid-transition leaves Apple Maps' gestures unbound (dead pan/zoom/tap).
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardData, setCardData] = useState<Listing | null>(null); // last selected — kept while card slides out
  // iOS fires both the marker's onPress AND the map's onPress on a pin tap; this
  // guard lets the map-press clear only when it wasn't a pin tap (last ~350ms).
  const lastPinPress = useRef(0);
  const cardY = useRef(new Animated.Value(CARD_HIDDEN)).current;
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region | null>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setMapReady(true));
    return () => task.cancel();
  }, []);

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

  // Slide the listing card in (selected) / out (cleared). No camera move here.
  useEffect(() => {
    Animated.timing(cardY, {
      toValue: selectedId ? 0 : CARD_HIDDEN,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [selectedId, cardY]);

  // Fit the camera to the pins once listings resolve. initialRegion is read once
  // at mount (stable Baku default), so the fit now lives here instead. Gated on
  // mapReady: if listings land before the map mounts, animateToRegion would hit a
  // null ref — this reruns once the map is up.
  useEffect(() => {
    if (mapReady && listings && listings.length > 0) {
      mapRef.current?.animateToRegion(regionForListings(listings), 500);
    }
  }, [listings, mapReady]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* MapView mounts only AFTER the push transition settles (mapReady) — a
          mid-transition mount leaves Apple Maps' gestures unbound. Constant
          initialRegion; pins arrive as children, camera fits via the effect. */}
      {mapReady && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
          initialRegion={INITIAL_REGION}
          onRegionChangeComplete={(r) => {
            regionRef.current = r;
          }}
          onPress={() => {
            if (Date.now() - lastPinPress.current < 350) return; // pin tap — keep selection
            setSelectedId(null);
          }}
        >
          {(listings ?? []).map((l) => (
            <PriceMarker
              key={l.id}
              coordinate={{ latitude: l.lat, longitude: l.lng }}
              price={l.priceAzn}
              active={l.id === selectedId}
              onPress={() => {
                lastPinPress.current = Date.now();
                setSelectedId(l.id);
                setCardData(l);
                // Lift the selected pin above the incoming card (zoom preserved).
                const r = regionRef.current ?? region;
                mapRef.current?.animateToRegion(
                  {
                    latitude: l.lat - r.latitudeDelta * 0.3,
                    longitude: l.lng,
                    latitudeDelta: r.latitudeDelta,
                    longitudeDelta: r.longitudeDelta,
                  },
                  300,
                );
              }}
            />
          ))}
        </MapView>
      )}

      {/* Loading — overlay while the map mounts / listings load; taps pass through */}
      {(!mapReady || listings === null) && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.05)" }]}
        >
          <ActivityIndicator color={brand.violet} />
        </View>
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

      {/* Slide-in listing card — content held in cardData so it stays visible while sliding out */}
      {cardData && (
        <Animated.View
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: insets.bottom + 12,
            transform: [{ translateY: cardY }],
            backgroundColor: colors.card,
            borderRadius: 20,
            flexDirection: "row",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Pressable onPress={() => router.push(`/property/${cardData.id}`)} style={{ flex: 1, flexDirection: "row" }}>
            <Image source={{ uri: cardData.image }} style={{ width: 100, height: 100 }} resizeMode="cover" />
            <View style={{ flex: 1, padding: 12, justifyContent: "center", gap: 3 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 17 }}>
                {formatPrice(cardData.priceAzn)}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.medium, fontSize: 13 }}>
                {buildListingTitle(cardData, t, lang)}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>
                {[
                  !isLandType(cardData.propertyType) ? `${cardData.rooms} ${t("home.roomsUnit")}` : null,
                  formatArea(cardData, t),
                ]
                  .filter(Boolean)
                  .join("  •  ")}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setSelectedId(null)}
            hitSlop={8}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "rgba(20,18,24,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={15} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}
