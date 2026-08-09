import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, interpolate, Extrapolation, withSpring } from "react-native-reanimated";
import { useScrollCtx } from "../../lib/scrollContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { LinearGradient } from "expo-linear-gradient";
import { usePressScale, usePressShrink, useBreathe, useStaggerIn, useCrossfadeLoop, useCollapsingHero } from "../../lib/animations";
import { PropertyCard } from "../../components/PropertyCard";
import { PropertyCardCompact } from "../../components/PropertyCardCompact";
import { EmptyState } from "../../components/EmptyState";
import { LoadingState, ErrorState } from "../../components/ListState";
import { useLanguage } from "../../lib/i18n/languages";
import { useFavorites } from "../../lib/favorites";
import { useFilters } from "../../lib/filters-state";
import { PropertyTypeKey } from "../../lib/propertyTypes";
import { Listing, isPromoActive } from "../../lib/mock/listings";
import { buildListingTitle } from "../../lib/listingTitle";
import { fetchFeed, fetchListingsByIds } from "../../lib/api/listings";
import { getViewedIds } from "../../lib/recentlyViewed";
import { NearbyMap } from "../../components/NearbyMap";
import { unreadCount, subscribeNotifications } from "../../lib/api/notifications";
import { useAuth } from "../../lib/auth";

// Status-bar readability scrim under the collapsed hero — prepared but OFF.
const STATUS_SCRIM = false;

const CATEGORIES: { key: string; label: string; image: number; type: PropertyTypeKey }[] = [
  { key: "apartments", label: "home.catApartments", image: require("../../assets/icons/categories/menziller.png"), type: "apartment" },
  { key: "houses", label: "home.catHouses", image: require("../../assets/icons/categories/evler.png"), type: "house" },
  { key: "land", label: "home.catLand", image: require("../../assets/icons/categories/torpaq.png"), type: "land" },
  { key: "objects", label: "home.catObjects", image: require("../../assets/icons/categories/obyektler.png"), type: "object" },
];

// Pastel category tints (soft clay tiles), per category and theme. No theme
// token exists for these yet → local map. Dark = same hue at low lightness so
// the 3D icons (and their shadows) still read against the tile.
const CATEGORY_TINT: Record<string, { light: string; dark: string }> = {
  apartments: { light: "#EFE7FB", dark: "#2A2138" }, // violet
  houses: { light: "#E3EEFB", dark: "#1E2A3C" }, // blue
  land: { light: "#E5F4E3", dark: "#20301F" }, // green
  objects: { light: "#FBEFE0", dark: "#382B1C" }, // peach
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { scrollY } = useScrollCtx();
  // Local scroll value for the (future) collapsing hero — mirrors the real offset.
  // The global scrollY is still fed too (it drives the bottom tab bar collapse).
  const heroScrollY = useSharedValue(0);
  // Measured hero heights (prep for phase 2 — not read by anything yet).
  const heroHsv = useSharedValue(236); // full hero-card height
  const greetingHsv = useSharedValue(96); // greeting+mascot row height
  const [heroH, setHeroH] = useState(236); // reserves list top-padding under the pinned hero
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    heroScrollY.value = e.contentOffset.y;
  });
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const { current, cycleLanguage } = useLanguage();
  const { session } = useAuth();

  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { filters, apply } = useFilters();

  // Feed from Supabase. Refetch whenever Home regains focus (e.g. after publish).
  const [feed, setFeed] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);
  const [unread, setUnread] = useState(0); // live bell badge
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const load = useCallback(() => {
    setError(false);
    fetchFeed()
      .then(setFeed)
      .catch(() => setError(true));
  }, []);

  // Recently-viewed history → listings, reordered to the stored (most-recent) order.
  const loadRecent = useCallback(async () => {
    const ids = await getViewedIds();
    if (ids.length === 0) {
      setRecentlyViewed([]);
      return;
    }
    try {
      const fetched = await fetchListingsByIds(ids);
      const ordered = ids.map((id) => fetched.find((l) => l.id === id)).filter((l): l is Listing => !!l);
      setRecentlyViewed(ordered);
    } catch {
      // keep whatever was shown
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      scrollY.value = withSpring(0, { damping: 18, stiffness: 120 }); // expand bar on focus
      load();
      loadRecent();
      // Live unread count for the bell — guests have none.
      if (session) unreadCount().then(setUnread).catch(() => setUnread(0));
      else setUnread(0);
    }, [load, loadRecent, session, scrollY]),
  );

  // Realtime: a new notification → instant dot (refetch the exact count so it
  // never drifts vs reads from another device). Guests don't subscribe.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const unsub = subscribeNotifications(uid, () => {
      unreadCount().then(setUnread).catch(() => {});
    });
    return unsub;
  }, [session?.user?.id]);

  const loading = feed === null && !error;
  const recommended = (feed ?? []).filter((l) => l.promoTier === "premium" && isPromoActive(l));
  const nearby = (feed ?? []).filter((l) => l.lat !== 0 && l.lng !== 0);

  // Hero greeting by time of day (two-sided intervals; 0–4 and 22–23 → night).
  const h = new Date().getHours();
  const greetKey =
    h >= 5 && h < 12 ? "greetingMorning" : h >= 12 && h < 17 ? "greetingDay" : h >= 17 && h < 22 ? "greetingEvening" : "greetingNight";

  // Hero chip: the last viewed listing (Continue).
  const continueItem = recentlyViewed[0];

  // Hero mascot — soft breathing loop.
  const breatheStyle = useBreathe(1.04, 2200);

  // Hero background — two stacked gradients, the top one slowly crossfading in/out
  // for a gentle shimmer (deliberate, close tints — never acid).
  const crossfadeStyle = useCrossfadeLoop(7000);
  const heroGradA = mode === "dark" ? (["#1E1830", "#251B3B"] as const) : (["#F3EDFB", "#ECE3FA"] as const);
  const heroGradB = mode === "dark" ? (["#301733", "#3E1A45"] as const) : (["#FCE3EF", "#EBDDFA"] as const);

  // Collapsing hero — card shrinks to just the search bar as the list scrolls.
  const { progress, cardStyle, wrapperStyle, contentStyle, greetingStyle, chipsStyle, headerStyle, overlayStyle, heroBgStyle, pillShadowStyle } =
    useCollapsingHero(heroScrollY, heroHsv, greetingHsv);
  // Status-bar scrim opacity (only visible when docked). Rendered only if STATUS_SCRIM.
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.7, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Quick-preset chip → merge a patch onto the current filters and open Search.
  const goPreset = (patch: Partial<typeof filters>) => {
    apply({ ...filters, ...patch });
    router.navigate("/search");
  };

  // Hero chips as data (for the staggered cascade). Conditional ones spread in.
  type HeroChipDesc = { key: string; label: string; maxWidth?: number; onPress: () => void };
  const heroChips: HeroChipDesc[] = [
    ...(continueItem
      ? [{ key: "continue", label: t("home.chipContinue", { title: buildListingTitle(continueItem, t, current) }), maxWidth: 220, onPress: () => router.push(`/property/${continueItem.id}`) }]
      : []),
    ...(nearby.length > 0 ? [{ key: "nearby", label: t("home.chipNearby"), onPress: () => router.push("/map") }] : []),
    { key: "rent", label: t("home.chipRent"), onPress: () => goPreset({ dealType: "rent" }) },
    { key: "daily", label: t("home.chipDaily"), onPress: () => goPreset({ dealType: "rent", rentPeriod: "daily" }) },
    { key: "new", label: t("home.chipNew"), onPress: () => goPreset({ buildType: "new" }) },
    { key: "euro", label: t("home.chipEuro"), onPress: () => goPreset({ renovation: ["euro"] }) },
    { key: "price", label: t("home.chipPrice"), onPress: () => goPreset({ priceMax: "100000" }) },
    { key: "sea", label: t("home.chipSea"), onPress: () => goPreset({ amenities: ["sea"] }) },
    { key: "metro", label: t("home.chipMetro"), onPress: () => goPreset({ amenities: ["metro"] }) },
  ];

  const { width: winW } = useWindowDimensions();

  const openListing = (id: string) => router.push(`/property/${id}`);

  // Tap a category → carry the deal type (from the shared store) + chosen
  // property type into the filter state, then jump to the Search tab.
  const openCategory = (type: PropertyTypeKey) => {
    apply({ ...filters, propertyTypes: [type] });
    router.navigate("/search");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={[]}>
      {/* Header — Home is allowed the brand logo (transparent PNG, no plate).
          Slides up + fades on collapse (headerStyle) so the search bar docks under
          the status bar; pointerEvents off once hidden. */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: insets.top,
            left: 0,
            right: 0,
            zIndex: 20,
            height: 56,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
          },
          headerStyle,
        ]}
      >
        <Image
          source={require("../../assets/yuva-logo.png")}
          resizeMode="contain"
          style={{ width: 92, height: 30 }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => router.push("/notifications")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("notifications.title")}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unread > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: brand.magenta,
                  borderWidth: 1.5,
                  borderColor: colors.bg,
                }}
              />
            )}
          </Pressable>
          <Pressable
            onPress={cycleLanguage}
            hitSlop={10}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: brand.violet, fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1 }}>
              {current.toUpperCase()}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Status-bar readability scrim — prepared, OFF by default. Above the list,
          under the header; visible only when docked. */}
      {STATUS_SCRIM && (
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 15 }, scrimStyle]}
        >
          <LinearGradient colors={[colors.bg, colors.bg + "00"]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}

      <View style={{ flex: 1 }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: heroH + 24 + insets.top + 56, paddingBottom: insets.bottom + 96, gap: 24 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Categories — first content under the header (clean showcase) */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16 }}>
          {CATEGORIES.map((c) => (
            <Category
              key={c.key}
              image={c.image}
              label={t(c.label)}
              colors={colors}
              bg={CATEGORY_TINT[c.key][mode === "dark" ? "dark" : "light"]}
              onPress={() => openCategory(c.type)}
            />
          ))}
        </View>

        {loading && <View style={{ height: 240 }}><LoadingState colors={colors} /></View>}
        {error && <View style={{ height: 240 }}><ErrorState colors={colors} onRetry={load} /></View>}

        {!loading && !error && (
          <>
            {/* Recommended carousel — only when there are premium listings */}
            {recommended.length > 0 && (
              <View style={{ gap: 12 }}>
                <SectionHeader
                  title={`✨ ${t("home.recommended")}`}
                  action={t("home.seeAll")}
                  colors={colors}
                  onAction={() => router.push("/search")}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={winW - 16}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                >
                  {recommended.map((l) => (
                    <PropertyCard
                      key={l.id}
                      listing={l}
                      variant="carousel"
                      cardWidth={winW - 32}
                      favorited={isFavorite(l.id)}
                      onToggleFavorite={() => toggleFavorite(l.id)}
                      onPress={() => openListing(l.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* New listings feed */}
            <View style={{ gap: 16 }}>
              <SectionHeader
                title={`🔥 ${t("home.newListings")}`}
                action={t("home.seeAll")}
                colors={colors}
                onAction={() => router.push("/rail-list?kind=new")}
              />
              {(feed ?? []).length === 0 ? (
                <EmptyState
                  image={require("../../assets/icons/empty/empty-home.png")}
                  title={t("home.emptyTitle")}
                  subtitle={t("home.emptyDesc")}
                />
              ) : (
                // Horizontal rail — compact cards scroll sideways (≈2.5 visible).
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                >
                  {(feed ?? []).map((l) => (
                    <View key={l.id} style={{ width: 170 }}>
                      <PropertyCardCompact
                        listing={l}
                        favorited={isFavorite(l.id)}
                        onToggleFavorite={() => toggleFavorite(l.id)}
                        onPress={() => openListing(l.id)}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Recently viewed — only when the user has history */}
            {recentlyViewed.length > 0 && (
              <View style={{ gap: 16 }}>
                <SectionHeader
                  title={`👀 ${t("home.recentlyViewed")}`}
                  action={t("home.seeAll")}
                  colors={colors}
                  onAction={() => router.push("/rail-list?kind=recent")}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                >
                  {recentlyViewed.map((l) => (
                    <View key={l.id} style={{ width: 170 }}>
                      <PropertyCardCompact
                        listing={l}
                        favorited={isFavorite(l.id)}
                        onToggleFavorite={() => toggleFavorite(l.id)}
                        onPress={() => openListing(l.id)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Nearby — compact map with price pins; only with geo-located listings */}
            {nearby.length > 0 && (
              <View style={{ gap: 16 }}>
                <SectionHeader
                  title={`📍 ${t("home.nearby")}`}
                  action={t("home.seeAll")}
                  colors={colors}
                  onAction={() => router.push("/search")}
                />
                <View style={{ paddingHorizontal: 16 }}>
                  <NearbyMap
                    listings={nearby}
                    onOpenListing={(id) => openListing(id)}
                    onOpenMap={() => router.push("/map")}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>

      {/* Hero — pinned collapsing overlay above the scroll. The card height, the
          content slide, and the greeting/chips fade all interpolate off heroScrollY.
          On collapse the card morphs into a full-bleed bar: side inset 16→0 and
          corner radii 24→0 (from wrapperStyle / cardStyle), clipping the list edge. */}
      <Animated.View style={[{ position: "absolute", top: insets.top + 56, left: 0, right: 0, zIndex: 10 }, overlayStyle]}>
        <Animated.View style={wrapperStyle}>
          <Animated.View
            style={[
              {
                overflow: "hidden",
                shadowColor: brand.violet,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 4,
              },
              cardStyle,
            ]}
          >
            {/* Background group — underlay + both gradients (B crossfades over A). The
                whole group fades out on collapse (heroBgStyle) → transparent dock, so
                the list scrolls behind the pill and under the status bar. */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, heroBgStyle]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === "dark" ? "#1E1830" : "#F3EDFB" }]} />
              <LinearGradient
                colors={heroGradA}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, crossfadeStyle]}>
                <LinearGradient colors={heroGradB} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
              </Animated.View>
            </Animated.View>

            {/* Content — above the gradients, padded. Measured HERE (not on the card,
                whose height is animated → would loop the paddingTop). Layout height is
                unaffected by the collapse transform, so it stays the full hero height. */}
            <Animated.View
              onLayout={(e) => {
                const hgt = e.nativeEvent.layout.height;
                setHeroH(hgt);
                heroHsv.value = hgt;
              }}
              style={[{ padding: 18, gap: 16 }, contentStyle]}
            >
            <Animated.View
              onLayout={(e) => { greetingHsv.value = e.nativeEvent.layout.height; }}
              style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, greetingStyle]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 22 }}>
                  {t(`home.${greetKey}`)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13 }}>
                  {t("home.heroSubtitle")}
                </Text>
              </View>
              <Animated.View style={breatheStyle}>
                <Image source={require("../../assets/mascot/bird-nest.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
              </Animated.View>
            </Animated.View>

            {/* Pill wrapper carries the docked shadow (only when floating free). */}
            <Animated.View style={[{ borderRadius: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 }, pillShadowStyle]}>
            <Pressable
              onPress={() => router.navigate("/search")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                height: 50,
                borderRadius: 25,
                backgroundColor: mode === "dark" ? "rgba(255,255,255,0.08)" : "#FFFFFF",
                paddingHorizontal: 14,
                gap: 10,
              }}
            >
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <Text style={{ flex: 1, color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>
                {t("home.heroSearchPlaceholder")}
              </Text>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="options-outline" size={18} color="#FFFFFF" />
              </View>
            </Pressable>
            </Animated.View>

            {/* Smart chips — scroll sideways, cascade in on mount */}
            <Animated.View style={chipsStyle}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              style={{ marginTop: 12 }}
            >
              {heroChips.map((c, i) => (
                <ChipItem key={c.key} index={i} label={c.label} colors={colors} mode={mode} maxWidth={c.maxWidth} onPress={c.onPress} />
              ))}
            </ScrollView>
            </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
  colors,
}: {
  title: string;
  action: string;
  onAction: () => void;
  colors: Theme;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 18 }}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 13 }}>{action}</Text>
      </Pressable>
    </View>
  );
}

// Pill chip inside the hero card — reads on the tinted hero background.
// Wrapper that gives each chip a staggered fade+slide-in on mount. Hooks can't
// run inside .map, so the per-index animation lives here as its own component.
function ChipItem({
  index,
  label,
  colors,
  mode,
  maxWidth,
  onPress,
}: {
  index: number;
  label: string;
  colors: Theme;
  mode: string;
  maxWidth?: number | string;
  onPress: () => void;
}) {
  const enter = useStaggerIn(index);
  return (
    <Animated.View style={enter}>
      <HeroChip label={label} colors={colors} mode={mode} maxWidth={maxWidth} onPress={onPress} />
    </Animated.View>
  );
}

function HeroChip({
  label,
  colors,
  mode,
  onPress,
  maxWidth,
}: {
  label: string;
  colors: Theme;
  mode: string;
  onPress: () => void;
  maxWidth?: number | string;
}) {
  // Spring-scale press feedback (same preset as FilterChip / cards) + a light dim.
  const press = usePressShrink(0.95);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={({ pressed }) => ({ maxWidth: maxWidth as any, opacity: pressed ? 0.9 : 1 })}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.7)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
          },
          press.style,
        ]}
      >
        <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.medium, fontSize: 13 }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function Category({
  image,
  label,
  colors,
  bg,
  onPress,
}: {
  image: number;
  label: string;
  colors: Theme;
  bg: string;
  onPress: () => void;
}) {
  const press = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ flex: 1 }}>
      <Animated.View
        style={[
          {
            aspectRatio: 1.0, // square tile
            borderRadius: 22,
            backgroundColor: bg,
            paddingVertical: 12,
            paddingHorizontal: 8,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          },
          press.style,
        ]}
      >
        {/* Icon is the hero — fixed size, contain (no %/aspectRatio on the Image
            itself: it breaks layout inside an aspectRatio tile). */}
        <Image source={image} style={{ width: 44, height: 44 }} resizeMode="contain" />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ color: colors.text, fontFamily: font.bold, fontSize: 11 }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
