import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSharedValue, withTiming, withSpring, useAnimatedReaction, runOnJS, Easing } from "react-native-reanimated";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import Supercluster from "supercluster";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
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

  // Spiderfy: a synthetic (same-coord) cluster fans its pins out on tap. `spread`
  // (0→1) animates the fan radius; spreadVal mirrors it to JS for re-rendered coords.
  const [spiderId, setSpiderId] = useState<string | null>(null); // expanded synthetic coordKey
  const spread = useSharedValue(0);
  const [spreadVal, setSpreadVal] = useState(0);
  useAnimatedReaction(
    () => spread.value,
    (v) => { runOnJS(setSpreadVal)(v); },
  );

  // Camera tracking — region settles only at gesture end (onRegionChangeComplete,
  // never mid-pan). Drives the zoom + bbox that supercluster will use in stage 3.
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const zoom = Math.round(Math.log2(360 / region.longitudeDelta));
  const bbox = useMemo<[number, number, number, number]>(
    () => [
      region.longitude - region.longitudeDelta / 2, // west
      region.latitude - region.latitudeDelta / 2, // south
      region.longitude + region.longitudeDelta / 2, // east
      region.latitude + region.latitudeDelta / 2, // north
    ],
    [region],
  );

  // GeoJSON points for supercluster (coordinates are [lng, lat], drop invalid coords).
  const points = useMemo(
    () =>
      listings
        .filter((l) => l.lat && l.lng)
        .map((l) => ({
          type: "Feature" as const,
          properties: { cluster: false, listingId: l.id, listing: l },
          geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] },
        })),
    [listings],
  );

  const clusterIndex = useMemo(() => {
    const idx = new Supercluster({ radius: 60, maxZoom: 16 });
    idx.load(points);
    return idx;
  }, [points]);

  const clusters = useMemo(() => {
    try {
      return clusterIndex.getClusters(bbox, zoom);
    } catch {
      return [];
    }
  }, [clusterIndex, bbox, zoom]);

  // Collapse stacked singles: several listings at the SAME coordinate (test data
  // or a building with many units) never separate even at maxZoom, so supercluster
  // returns them as overlapping single pins. Fold same-coord singles into a
  // synthetic cluster (a count circle) that zooms instead of expanding.
  const displayClusters = useMemo(() => {
    const out: typeof clusters = [];
    const singlesByCoord = new Map<string, typeof clusters>();
    for (const c of clusters) {
      if (c.properties.cluster === true) {
        out.push(c);
        continue;
      }
      const [lng, lat] = c.geometry.coordinates;
      const key = `${lng.toFixed(5)},${lat.toFixed(5)}`;
      const arr = singlesByCoord.get(key) ?? [];
      arr.push(c);
      singlesByCoord.set(key, arr);
    }
    for (const [key, group] of singlesByCoord) {
      if (group.length === 1) {
        out.push(group[0]);
      } else {
        const [lng, lat] = group[0].geometry.coordinates;
        out.push({
          type: "Feature",
          properties: {
            cluster: true,
            synthetic: true,
            point_count: group.length,
            cluster_id: -1, // fake — never pass to getClusterExpansionZoom
            coordKey: key,
            listings: group.map((g) => g.properties.listing),
          },
          geometry: { type: "Point", coordinates: [lng, lat] },
        } as (typeof clusters)[number]);
      }
    }
    return out;
  }, [clusters]);

  const openSpider = (coordKey: string) => {
    setSpiderId(coordKey);
    spread.value = withSpring(1, { damping: 20, stiffness: 150, mass: 0.8 }); // soft fan-out, slight inertia
  };
  const closeSpider = () => {
    spread.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }); // collapse, then drop pins
    setTimeout(() => setSpiderId(null), 200);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={setRegion}
        onPress={() => {
          if (justSelectedRef.current) return; // phantom press right after a pin tap
          if (spiderId) closeSpider(); // empty-map tap collapses an open spider
          onSelectListing(null);
        }}
      >
        {displayClusters.map((c) => {
          const [lng, lat] = c.geometry.coordinates;

          // Cluster → brand circle with the count; tap zooms in (real) or spiders (synthetic).
          if (c.properties.cluster === true) {
            const isSynthetic = c.properties.synthetic === true;
            const count = c.properties.point_count as number;
            const coordKey = c.properties.coordKey as string | undefined;

            // Expanded synthetic → fan the listings out (animated by spreadVal).
            if (isSynthetic && spiderId === coordKey) {
              const spiderListings = c.properties.listings as Listing[];
              // Fixed zoom-relative radius (between the too-tight 30 and the far 55);
              // one ring, angle step 360/N. No count multiplier (it ballooned at N=10).
              const R = 42 / Math.pow(2, zoom);
              return (
                <Fragment key={`spider-${coordKey}`}>
                  {spiderListings.map((sl, i) => {
                    const angle = (2 * Math.PI * i) / spiderListings.length;
                    const offLng = Math.cos(angle) * R * spreadVal;
                    const offLat = Math.sin(angle) * R * spreadVal;
                    const slActive = sl.id === selectedId;
                    return (
                      <Marker
                        key={`spider-${sl.id}`}
                        coordinate={{ latitude: lat + offLat, longitude: lng + offLng }}
                        onPress={() => {
                          justSelectedRef.current = true;
                          onSelectListing(sl.id);
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
                            backgroundColor: slActive ? brand.magenta : brand.violet,
                            borderWidth: 1.5,
                            borderColor: "#FFFFFF",
                            shadowColor: "#000",
                            shadowOpacity: 0.25,
                            shadowRadius: 3,
                            shadowOffset: { width: 0, height: 1 },
                            elevation: 3,
                          }}
                        >
                          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>{pinPrice(sl.priceAzn)}</Text>
                        </View>
                      </Marker>
                    );
                  })}
                </Fragment>
              );
            }

            const key = isSynthetic ? `syn-${coordKey}` : `cluster-${c.properties.cluster_id}`;
            return (
              <Marker
                key={key}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => {
                  justSelectedRef.current = true; // keep the phantom map press from clearing selection
                  if (isSynthetic) {
                    if (spiderId === coordKey) closeSpider();
                    else openSpider(coordKey as string);
                  } else {
                    const expansionZoom = Math.min(clusterIndex.getClusterExpansionZoom(c.properties.cluster_id as number), 16);
                    const newDelta = 360 / Math.pow(2, expansionZoom);
                    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: newDelta, longitudeDelta: newDelta }, 350);
                  }
                  setTimeout(() => { justSelectedRef.current = false; }, 400);
                }}
                tracksViewChanges={tracking}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    minWidth: 48,
                    height: 48,
                    paddingHorizontal: 6,
                    borderRadius: 999,
                    backgroundColor: brand.violet,
                    borderWidth: 2.5,
                    borderColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16 }}>{count}</Text>
                </View>
              </Marker>
            );
          }

          // Single listing → the existing price pin (unchanged behavior).
          const listing = c.properties.listing as Listing;
          const active = listing.id === selectedId;
          return (
            <Marker
              key={listing.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => {
                justSelectedRef.current = true;
                onSelectListing(listing.id);
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
                  {pinPrice(listing.priceAzn)}
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
