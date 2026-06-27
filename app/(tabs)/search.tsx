import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedRef,
  useAnimatedReaction,
  useSharedValue,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useScrollCtx } from "../../lib/scrollContext";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { SearchBar } from "../../components/SearchBar";
import { DealTypeChips } from "../../components/DealTypeChips";
import { FilterChipsRow } from "../../components/FilterChipsRow";
import { PropertyCardRow } from "../../components/PropertyCardRow";
import { SearchMap } from "../../components/SearchMap";
import { BottomSheet } from "../../components/BottomSheet";
import { LoadingState, ErrorState } from "../../components/ListState";
import { useFavorites } from "../../lib/favorites";
import { useFilters, filterListings } from "../../lib/filters-state";
import { Listing, isPromoActive, formatPrice, formatArea } from "../../lib/mock/listings";
import { fetchFeed } from "../../lib/api/listings";
import { fetchViewedIds } from "../../lib/api/listingViews";
import { useAuth } from "../../lib/auth";
import { buildListingTitle } from "../../lib/listingTitle";
import { useLanguage } from "../../lib/i18n/languages";
import { useDraggableSheet, useSheetScrollGesture } from "../../lib/animations";

type SortKey = "default" | "priceAsc" | "priceDesc" | "newest";

const SORTS: { key: SortKey; labelKey: string }[] = [
  { key: "default", labelKey: "search.sortDefault" },
  { key: "priceAsc", labelKey: "search.sortPriceAsc" },
  { key: "priceDesc", labelKey: "search.sortPriceDesc" },
  { key: "newest", labelKey: "search.sortNewest" },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null); // tapped map pin
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { filters, setDealType, activeCount } = useFilters();
  const { user } = useAuth();

  // Feed from Supabase (same active set as Home), refetched on focus.
  const [feed, setFeed] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    fetchFeed()
      .then(setFeed)
      .catch(() => setError(true));
  }, []);

  // Listings the user already opened → "Viewed" badge. Loaded with the feed on
  // focus, so returning from a listing already shows the badge. Guests: empty.
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const loadViewed = useCallback(() => {
    if (!user?.id) {
      setViewedIds(new Set());
      return;
    }
    fetchViewedIds(user.id)
      .then((ids) => setViewedIds(new Set(ids)))
      .catch(() => {}); // a failed read must never break search → no badges
  }, [user?.id]);

  const { scrollY } = useScrollCtx();
  useFocusEffect(useCallback(() => { scrollY.value = withSpring(0, { damping: 18, stiffness: 120 }); load(); loadViewed(); }, [load, loadViewed, scrollY]));
  const loading = feed === null && !error;

  // Stable rotation for the Premium/VIP bands so paid listings share exposure.
  // Each id gets ONE random value (kept in a ref) and reuses it across refetches —
  // so returning from a listing (which refetches the feed) never reshuffles the
  // already-shown order. Only genuinely new ids get a fresh random.
  const rotationRef = useRef<Record<string, number>>({});
  const rotation = useMemo(() => {
    const map = rotationRef.current;
    for (const l of feed ?? []) {
      if (map[l.id] === undefined) map[l.id] = Math.random();
    }
    return map;
  }, [feed]);

  const results = useMemo(() => {
    // Active filters first (incl. deal type), then the free-text query on top.
    const base = filterListings(feed ?? [], filters);
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? base
      : base.filter(
          (l) =>
            buildListingTitle(l, t, lang).toLowerCase().includes(q) ||
            l.district.toLowerCase().includes(q),
        );

    // Promotion bands first (Premium > VIP > normal) — paid listings stay on top
    // even under price sort (bina.az behavior). Within a band, the user's sort
    // applies; for default/newest the paid bands rotate and the normal band
    // floats bumped listings up via max(createdAt, lastBumpedAt).
    const band = (l: Listing) => (isPromoActive(l) ? (l.promoTier === "premium" ? 0 : 1) : 2);
    const freshness = (l: Listing) =>
      Math.max(new Date(l.createdAt).getTime(), l.lastBumpedAt ? new Date(l.lastBumpedAt).getTime() : 0);

    const arr = [...filtered];
    arr.sort((a, b) => {
      const ba = band(a);
      const bb = band(b);
      if (ba !== bb) return ba - bb; // band is the primary key, always
      if (sort === "priceAsc") return a.priceAzn - b.priceAzn;
      if (sort === "priceDesc") return b.priceAzn - a.priceAzn;
      // default / newest:
      if (ba < 2) return (rotation[a.id] ?? 0) - (rotation[b.id] ?? 0); // paid bands rotate
      return freshness(b) - freshness(a); // normal band: newest, bumped floats up
    });
    return arr;
  }, [feed, query, filters, sort, t, lang, rotation]);

  const sortLabel = t(SORTS.find((s) => s.key === sort)!.labelKey);

  // ── Draggable sheet (3 snap points). translateY of a top:0 sheet:
  //   collapsed — peek ~120px (handle + count + sort); the map owns the screen.
  //   mid       — ~46% down (default on open).
  //   expanded  — stops just below the top overlay so search/chips stay visible.
  const OVERLAY_H = insets.top + 176; // search + deal chips + filter chips block
  // Floating glass tab bar reach above the screen bottom (pill ~58 + bottom:8 + center "+").
  const TAB_BAR_SPACE = insets.bottom + 96;
  // Collapsed peek must show the handle + a full selected card ABOVE the tab bar.
  const collapsedY = Math.round(height - TAB_BAR_SPACE - 150);
  const expandedY = OVERLAY_H;
  const midY = Math.round(height * 0.46);
  const { pan: sheetPan, sheetStyle, translateY: sheetTranslateY } = useDraggableSheet(collapsedY, expandedY, midY);

  // Selecting a pin collapses the sheet to show just that card; clearing the
  // selection (and first open) returns it to the mid list view.
  const selectedListing = selectedId ? results.find((l) => l.id === selectedId) ?? null : null;
  useEffect(() => {
    sheetTranslateY.value = withSpring(selectedId ? collapsedY : midY, { damping: 24, stiffness: 220, overshootClamping: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Content scroll inside the sheet, coordinated with the drag (as on detail).
  const sheetScrollY = useSharedValue(0);
  const onSheetScroll = useAnimatedScrollHandler((e) => {
    sheetScrollY.value = e.contentOffset.y;
    // Feed the tab bar's scrollY ONLY while the sheet is expanded (list mode) → it
    // collapses on scroll like other screens. Otherwise (map mode) keep it full.
    scrollY.value = sheetTranslateY.value <= expandedY + 8 ? e.contentOffset.y : 0;
  });
  const listRef = useAnimatedRef<Animated.FlatList<Listing>>();
  const { pan: contentPan } = useSheetScrollGesture(sheetTranslateY, collapsedY, expandedY, midY, sheetScrollY, listRef);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  useAnimatedReaction(
    () => sheetTranslateY.value,
    (ty) => {
      runOnJS(setScrollEnabled)(ty <= expandedY + 8);
      // Left expanded (map/mid mode) → reset the tab bar to full immediately.
      if (ty > expandedY + 8) scrollY.value = 0;
    },
    [expandedY],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} pointerEvents="box-none">
      {/* Map background — full screen, under everything */}
      <View style={StyleSheet.absoluteFill}>
        <SearchMap listings={results} selectedId={selectedId} onSelectListing={setSelectedId} />
      </View>

      {/* Draggable sheet — the results list. The outer frame is top:0 + ~2 screens
          tall (so the body never gaps at the bottom); it's box-none + transparent so
          the empty area the translateY leaves above the body never eats map taps. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: height + collapsedY,
          },
          sheetStyle,
        ]}
      >
        {/* Visible body — opaque; only this catches taps (everything above it is map). */}
        <View
          pointerEvents="auto"
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
        {/* Handle — drag target */}
        <GestureDetector gesture={sheetPan}>
          <View style={{ paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
        </GestureDetector>

        {selectedListing ? (
          /* Selected pin → single preview card (sheet collapsed) */
          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <Pressable
              onPress={() => router.push(`/property/${selectedListing.id}`)}
              style={({ pressed }) => ({
                flexDirection: "row",
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
                opacity: pressed ? 0.95 : 1,
              })}
            >
              <Image source={{ uri: selectedListing.image }} style={{ width: 110, height: 104 }} resizeMode="cover" />
              <View style={{ flex: 1, padding: 12, gap: 4, justifyContent: "center" }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
                  {formatPrice(selectedListing.priceAzn)}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {buildListingTitle(selectedListing, t, lang)}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {[formatArea(selectedListing, t), selectedListing.rooms > 0 ? `${selectedListing.rooms} ${t("home.roomsUnit")}` : null]
                    .filter(Boolean)
                    .join("  ·  ")}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedId(null)}
                hitSlop={8}
                style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(20,18,24,0.55)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </Pressable>
          </View>
        ) : loading ? (
          <LoadingState colors={colors} />
        ) : error ? (
          <ErrorState colors={colors} onRetry={load} />
        ) : (
          <>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", paddingHorizontal: 16, paddingBottom: 8 }}>
              {t("search.resultsCount", { count: results.length })}
            </Text>
            {/* Sort — tappable (outside the drag gesture) */}
            <Pressable
              onPress={() => setSortOpen(true)}
              hitSlop={8}
              style={({ pressed }) => ({ position: "absolute", top: 22, right: 16, flexDirection: "row", alignItems: "center", gap: 5, opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="swap-vertical-outline" size={17} color={brand.violet} />
              <Text style={{ color: brand.violet, fontSize: 13, fontWeight: "600" }}>{sortLabel}</Text>
            </Pressable>

            <GestureDetector gesture={contentPan}>
              <Animated.FlatList
                ref={listRef}
                scrollEnabled={scrollEnabled}
                onScroll={onSheetScroll}
                scrollEventThrottle={16}
                data={results}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: height - expandedY }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: TAB_BAR_SPACE + 24, flexGrow: 1 }}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                ListEmptyComponent={
                  <Placeholder colors={colors} icon="search-outline" title={t("search.emptyTitle")} desc={t("search.emptyDesc")} />
                }
                renderItem={({ item }) => (
                  <PropertyCardRow
                    listing={item}
                    viewed={viewedIds.has(item.id)}
                    favorited={isFavorite(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                    onPress={() => router.push(`/property/${item.id}`)}
                  />
                )}
              />
            </GestureDetector>
          </>
        )}
        </View>
      </Animated.View>

      {/* Top overlay — search + deal chips + filter chips, over the map */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          gap: 12,
          backgroundColor: colors.bg,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onPressFilter={() => router.push("/filters")}
            filterBadge={activeCount}
          />
        </View>
        <DealTypeChips value={filters.dealType} onChange={setDealType} />
        <FilterChipsRow onPressType={() => {}} onPressRooms={() => {}} onPressBuild={() => {}} />
      </View>

      {/* Sort picker */}
      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)}>
        <Text
          style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center", paddingTop: 6, paddingBottom: 8 }}
        >
          {t("search.sort")}
        </Text>
        {SORTS.map((s, i) => {
          const active = s.key === sort;
          return (
            <Pressable
              key={s.key}
              onPress={() => {
                setSort(s.key);
                setSortOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderTopWidth: i === 0 ? 1 : 0,
                borderBottomWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: active ? brand.violet : colors.text, fontSize: 16, fontWeight: active ? "700" : "500" }}>
                {t(s.labelKey)}
              </Text>
              {active && <Ionicons name="checkmark-circle" size={22} color={brand.violet} />}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

function Placeholder({
  colors,
  icon,
  title,
  desc,
}: {
  colors: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
      <Ionicons name={icon} size={48} color={colors.textSecondary} />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>{desc}</Text>
    </View>
  );
}
