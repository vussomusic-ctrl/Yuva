import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Linking,
  Share,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { ListingDetail, formatPrice, formatArea, isPromoActive, isRecentlyBumped } from "../../lib/mock/listings";
import { isLandType } from "../../lib/propertyTypes";
import { pluralSuffix } from "../../lib/i18n/plural";
import { fetchListingDetail } from "../../lib/api/listings";
import { bumpListing } from "../../lib/api/promo";
import { useFavorites } from "../../lib/favorites";
import { useAuth } from "../../lib/auth";
import { getOrCreateConversation } from "../../lib/api/chats";
import { LoadingState, ErrorState } from "../../components/ListState";
import { BottomSheet } from "../../components/BottomSheet";
import { PhotoGallery } from "../../components/PhotoGallery";
import ListingMiniMap from "../../components/ListingMiniMap";
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedRef, useAnimatedReaction, runOnJS, useAnimatedStyle, interpolate } from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { useDraggableSheet, useSheetScrollGesture } from "../../lib/animations";
import { Header } from "../my-listings";
import { buildListingTitle } from "../../lib/listingTitle";
import { useLanguage } from "../../lib/i18n/languages";
import { detectLang } from "../../lib/langDetect";
import { translateDescription } from "../../lib/api/ai";

const VIP_RED = "#E5322D";
const PREMIUM_GOLD = "#E0A526";

const badgePill = (bg: string) =>
  ({
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: bg,
  }) as const;

const AMENITY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = {
  parking: { icon: "car-outline", labelKey: "propertyDetail.amParking" },
  elevator: { icon: "swap-vertical-outline", labelKey: "propertyDetail.amElevator" },
  renovation: { icon: "construct-outline", labelKey: "propertyDetail.amRenovation" },
  furniture: { icon: "bed-outline", labelKey: "propertyDetail.amFurniture" },
  internet: { icon: "wifi-outline", labelKey: "propertyDetail.amInternet" },
  security: { icon: "shield-checkmark-outline", labelKey: "propertyDetail.amSecurity" },
  seaview: { icon: "water-outline", labelKey: "propertyDetail.amSeaView" },
  kitchen: { icon: "restaurant-outline", labelKey: "propertyDetail.amKitchen" },
};

export default function PropertyDetailScreen() {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Draggable content card: collapsed (lower) ↔ expanded (under the header).
  // Collapsed: card peeks ~240px — handle + the full first specs row, then clean
  // card padding (the promo block's pink stays hidden). Expanded: under header.
  const collapsedSheetY = Math.round(height - insets.bottom - 240);
  // Expanded: card top sits just below the header buttons (~insets.top+8..48),
  // covering the top-left promo badge (insets.top+56) — nothing peeks above.
  const expandedSheetY = insets.top + 50;
  const { pan: sheetPan, sheetStyle, translateY: sheetTranslateY } = useDraggableSheet(collapsedSheetY, expandedSheetY);

  const { isFavorite, toggle } = useFavorites();
  const { user } = useAuth();
  const [creatingChat, setCreatingChat] = useState(false);
  const [contactSheet, setContactSheet] = useState(false);
  // Description translation (in-memory cache per target language; per screen).
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const transCache = useRef<Map<string, string>>(new Map());
  const hasDataRef = useRef(false); // true once the listing is loaded (silent refetch after)

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ok">("loading");
  const [page, setPage] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const scrollY = useSharedValue(0);
  const onContentScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { pan: contentPan } = useSheetScrollGesture(
    sheetTranslateY,
    collapsedSheetY,
    expandedSheetY,
    scrollY,
    scrollRef,
  );
  const [scrollEnabled, setScrollEnabled] = useState(false);
  useAnimatedReaction(
    () => sheetTranslateY.value,
    (ty) => {
      // Enable content scroll only when the sheet is (near) fully expanded.
      const expanded = ty <= expandedSheetY + 8;
      runOnJS(setScrollEnabled)(expanded);
    },
    [expandedSheetY],
  );

  const photoParallaxStyle = useAnimatedStyle(() => {
    // Photo canvas drifts up as the sheet expands (collapsedSheetY -> expandedSheetY).
    // Parallax: photo moves slower than the sheet for depth.
    const ty = interpolate(
      sheetTranslateY.value,
      [expandedSheetY, collapsedSheetY],
      [-(collapsedSheetY - expandedSheetY) * 0.35, 0],
      "clamp",
    );
    const scale = interpolate(
      sheetTranslateY.value,
      [expandedSheetY, collapsedSheetY],
      [1.04, 1],
      "clamp",
    );
    return { transform: [{ translateY: ty }, { scale }] };
  });

  // Migrating favorite heart: flies from header (collapsed) to bottom panel (expanded).
  const heartFlyStyle = useAnimatedStyle(() => {
    // Start: header, left of share (base left = width-106, top = insets.top+8).
    // Finish: panel left slot (left ~20, vertically centered on the Связаться button).
    const startLeft = width - 106;
    const startTop = insets.top + 8;
    const finishLeft = 20;
    const finishTop = height - insets.bottom - 42 - 20; // button center Y minus half heart (40/2)
    const tx = interpolate(
      sheetTranslateY.value,
      [collapsedSheetY, expandedSheetY],
      [0, finishLeft - startLeft],
      "clamp",
    );
    const ty = interpolate(
      sheetTranslateY.value,
      [collapsedSheetY, expandedSheetY],
      [0, finishTop - startTop],
      "clamp",
    );
    return { transform: [{ translateX: tx }, { translateY: ty }] };
  });

  const contactBtnStyle = useAnimatedStyle(() => {
    // Button shrinks to free the heart slot as the sheet expands (heart lands).
    const ml = interpolate(
      sheetTranslateY.value,
      [collapsedSheetY, expandedSheetY],
      [0, 64],
      "clamp",
    );
    return { marginLeft: ml };
  });
  const [bumping, setBumping] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  // Focus-refetch with a SILENT mode: spinner only on the first load; on returns
  // (e.g. after a promo purchase) refresh quietly and keep the old data on error.
  const load = useCallback(() => {
    if (!id) {
      setStatus("notfound");
      return;
    }
    if (!hasDataRef.current) setStatus("loading");
    fetchListingDetail(id)
      .then((d) => {
        if (d) {
          setListing(d);
          hasDataRef.current = true;
          setStatus("ok");
        } else if (!hasDataRef.current) {
          setStatus("notfound");
        }
      })
      .catch(() => {
        if (!hasDataRef.current) setStatus("error"); // silent refetch keeps shown data
      });
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (status !== "ok" || !listing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <Header colors={colors} title="" onBack={goBack} />
        {status === "loading" && <LoadingState colors={colors} />}
        {status === "error" && <ErrorState colors={colors} onRetry={load} />}
        {status === "notfound" && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>
              {t("common.loadError")}
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Title is derived on the fly in the current language (no stored string).
  const title = buildListingTitle(listing, t, lang);

  // Translate: show the button only when the description's language differs from
  // the UI language. Tap caches per target language, so toggling is free.
  const origLang = detectLang(listing.description);
  const onTranslate = async () => {
    const cached = transCache.current.get(lang);
    if (cached) {
      setTranslated(cached);
      setShowOriginal(false);
      return;
    }
    setTranslating(true);
    try {
      const out = await translateDescription(listing.description, lang as "az" | "ru" | "en");
      transCache.current.set(lang, out);
      setTranslated(out);
      setShowOriginal(false);
    } catch {
      Alert.alert(t("propertyDetail.errTranslate"));
    } finally {
      setTranslating(false);
    }
  };
  const showingTranslation = translated != null && !showOriginal;

  // Message the seller: guest → login; own listing → button hidden; else
  // get-or-create the conversation and open it.
  const isOwnListing = !!user && listing.ownerId === user.id;

  // Promo signals (public — shown on the gallery for everyone).
  const tier = isPromoActive(listing) ? listing.promoTier : "none";
  const boosted = isRecentlyBumped(listing);

  // Spend a bump (owner only). Optimistic: decrement + light "boosted" now,
  // reconcile/rollback on the DB result. Busy flag blocks repeat taps.
  const onBumpNow = async () => {
    if (bumping) return;
    const prev = listing.bumpsRemaining;
    const prevBumpedAt = listing.lastBumpedAt;
    setBumping(true);
    setListing((l) => (l ? { ...l, bumpsRemaining: prev - 1, lastBumpedAt: new Date().toISOString() } : l));

    const res = await bumpListing(listing.id);
    setBumping(false);
    if (res.ok) {
      setListing((l) => (l ? { ...l, bumpsRemaining: res.bumpsRemaining } : l));
    } else {
      setListing((l) => (l ? { ...l, bumpsRemaining: prev, lastBumpedAt: prevBumpedAt } : l));
      if (res.reason === "empty") Alert.alert(t("promote.bumpEmptyTitle"), t("promote.bumpEmptyMsg"));
      else Alert.alert(t("common.loadError"));
    }
  };

  const onMessage = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const cid = await getOrCreateConversation(listing.id, listing.ownerId);
      router.push(`/chat/${cid}`);
    } catch {
      Alert.alert(t("common.loadError"));
    } finally {
      setCreatingChat(false);
    }
  };

  const onShare = () =>
    Share.share({ message: `${title} — ${formatPrice(listing.priceAzn)} · Yuva` }).catch(() => {});

  // Seller phone drives Call + WhatsApp. On desktop web tel:/wa.me may be a no-op;
  // .catch keeps it from throwing. On a phone both open the native apps.
  const phoneDigits = listing.ownerPhone.replace(/[^\d]/g, "");
  // Local part for display (drop the +994 country code).
  const displayPhone = phoneDigits.replace(/^994/, "");
  // Normalize to digits (handles any stored format). NOTE: tel: does nothing on
  // the iOS simulator (no phone app) — test Call on a real device.
  const call = () => {
    if (!phoneDigits) return;
    Linking.openURL(`tel:+${phoneDigits}`).catch(() => {});
  };
  const openWhatsApp = () => {
    const text = encodeURIComponent(
      t("propertyDetail.waMessage", { title, price: formatPrice(listing.priceAzn) }),
    );
    Linking.openURL(`https://wa.me/${phoneDigits}?text=${text}`).catch(() => {});
  };
  const hasPhone = phoneDigits.length > 0;
  // Normalize the (free-form) telegram field to a bare username; hide if empty.
  const tgUser = (listing.ownerTelegram ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .replace(/\s/g, "");
  const openTelegram = () => Linking.openURL(`https://t.me/${tgUser}`).catch(() => {});

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const overlayBtn = {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: mode === "dark" ? "rgba(20,18,24,0.7)" : "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  };

  // Distance from screen bottom to the collapsed card's top edge — used to sit
  // the photo info/gradient just above the card so there's never a white gap.
  const collapsedGap = height - collapsedSheetY;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Photo hero — full-screen background layer (card rides over it) */}
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height, overflow: "hidden" }, photoParallaxStyle]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onGalleryScroll}
          scrollEventThrottle={16}
        >
          {listing.gallery.map((uri, i) => (
            <Pressable key={i} onPress={() => setGalleryOpen(true)}>
              <Image source={{ uri }} style={{ width, height }} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>

        {/* Dark fade just above the collapsed card so the white info stays legible */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.9)"]}
          locations={[0, 0.8, 1]}
          style={{ position: "absolute", left: 0, right: 0, bottom: collapsedGap - 28, height: 248 }}
          pointerEvents="none"
        />

        {/* Promo badges — top-left over the photo */}
        {(tier !== "none" || boosted) && (
          <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 56, left: 16, gap: 6, alignItems: "flex-start" }}>
            {tier === "premium" ? (
              <View style={badgePill(PREMIUM_GOLD)}>
                <Image source={require("../../assets/icons/promo/clay-crown.png")} resizeMode="contain" style={{ width: 16, height: 13 }} />
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.5 }}>
                  {t("home.badgePremium")}
                </Text>
              </View>
            ) : tier === "vip" ? (
              <View style={badgePill(VIP_RED)}>
                <Image source={require("../../assets/icons/promo/clay-star.png")} resizeMode="contain" style={{ width: 14, height: 14 }} />
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.5 }}>
                  {t("home.badgeVip")}
                </Text>
              </View>
            ) : null}
            {boosted && (
              <View style={{ ...badgePill(brand.blue), opacity: 0.9 }}>
                <Image source={require("../../assets/icons/promo/clay-arrow.png")} resizeMode="contain" style={{ width: 13, height: 15 }} />
                <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: 9, letterSpacing: 0.2 }}>
                  {t("home.badgeBoosted")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Info overlay — price / specs / district in white, just above the card edge */}
        <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20, bottom: collapsedGap + 16, gap: 6 }}>
          {listing.gallery.length > 1 && (
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
              {listing.gallery.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === page ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === page ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                  }}
                />
              ))}
            </View>
          )}
          <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 28 }}>{formatPrice(listing.priceAzn)}</Text>
          <Text style={{ color: "rgba(255,255,255,0.92)", fontFamily: font.semibold, fontSize: 15 }}>
            {[!isLandType(listing.propertyType) ? `${listing.rooms} ${t("propertyDetail.rooms")}` : null, formatArea(listing, t)]
              .filter(Boolean)
              .join("  •  ")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="location-outline" size={15} color="#FFFFFF" />
            <Text style={{ color: "rgba(255,255,255,0.92)", fontFamily: font.regular, fontSize: 14 }}>{listing.district}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Content card — draggable sheet (translateY) between collapsed/expanded */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            // Extra-tall so the bottom edge stays below the screen at any
            // translateY (expanded → collapsed) — nothing peeks out underneath.
            height: height + collapsedSheetY,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle — pan here to move the sheet (5c-1: two snap positions) */}
        <GestureDetector gesture={sheetPan}>
          <View style={{ paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
        </GestureDetector>

        {/* Content — internal scroll (viewport capped at expanded visible height) */}
        <GestureDetector gesture={contentPan}>
          <Animated.ScrollView
            ref={scrollRef}
            scrollEnabled={scrollEnabled}
            onScroll={onContentScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: height - expandedSheetY }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 124 }}
          >
          {/* Specs row — clay icons in colored circles (up to 4 cells) */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
            <SpecCard
              colors={colors}
              icon={require("../../assets/icons/promo/clay-ruler.png")}
              iconStyle={{ width: 30, height: 37 }}
              tintBg="#FFEDD5"
              label={t("propertyDetail.area")}
              value={formatArea(listing, t)}
            />
            {!isLandType(listing.propertyType) && (
              <SpecCard
                colors={colors}
                icon={require("../../assets/icons/promo/clay-bed.png")}
                iconStyle={{ width: 36, height: 32 }}
                tintBg="#F3E8FF"
                label={t("propertyDetail.rooms")}
                value={`${listing.rooms}`}
              />
            )}
            {listing.floor != null && listing.floorTotal != null && (
              <SpecCard
                colors={colors}
                icon={require("../../assets/icons/promo/clay-stairs.png")}
                iconStyle={{ width: 32, height: 33 }}
                tintBg="#DBEAFE"
                label={t("propertyDetail.floor")}
                value={`${listing.floor}/${listing.floorTotal}`}
              />
            )}
            {!isLandType(listing.propertyType) && (
              <SpecCard
                colors={colors}
                icon={require("../../assets/icons/promo/clay-compass.png")}
                iconStyle={{ width: 28, height: 35 }}
                tintBg="#FFE4E1"
                label={t("propertyDetail.buildTypeLabel")}
                value={listing.buildType === "new" ? t("filters.buildNew") : t("filters.buildSecondary")}
              />
            )}
          </View>

          {/* Owner-only promotion management — soft lilac→pink gradient block */}
          {isOwnListing && (
            <LinearGradient
              colors={["#F3EAFF", "#FCE9F2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ marginTop: 24, padding: 16, borderRadius: 20 }}
            >
              <Text style={{ color: "#2A2533", fontFamily: font.bold, fontSize: 17, marginBottom: 14 }}>
                {t("promote.manageTitle")}
              </Text>

              {/* Status card (full width) */}
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
                {tier !== "none" && (
                  <Image
                    source={tier === "premium" ? require("../../assets/icons/promo/clay-crown.png") : require("../../assets/icons/promo/clay-star.png")}
                    resizeMode="contain"
                    style={tier === "premium" ? { width: 54, height: 44 } : { width: 50, height: 50 }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#8E8896", fontFamily: font.regular, fontSize: 12 }}>{t("promote.statusLabel")}</Text>
                  <Text style={{ color: "#2A2533", fontFamily: font.bold, fontSize: 18, marginTop: 2 }}>
                    {tier === "premium" ? t("promote.tierPremium") : tier === "vip" ? t("promote.tierVip") : t("promote.statusNormal")}
                  </Text>
                  {tier !== "none" && listing.promotedUntil && (
                    <Text style={{ marginTop: 4, fontSize: 12 }}>
                      <Text style={{ color: "#8E8896", fontFamily: font.regular }}>{t("promote.activeUntilPrefix")} </Text>
                      <Text style={{ color: brand.magenta, fontFamily: font.bold }}>
                        {new Date(listing.promotedUntil).toLocaleDateString(lang, { day: "numeric", month: "long" })}
                      </Text>
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => router.push(`/promote/${listing.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#EAD9F7",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 12 }}>{t("promote.details")}</Text>
                  <Ionicons name="chevron-forward" size={14} color={brand.violet} />
                </Pressable>
              </View>

              {/* Two cards: bumps (left) + promotion (right), each with its own CTA */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                {/* Bumps */}
                <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14 }}>
                        <Text style={{ color: brand.violet, fontFamily: font.extrabold, fontSize: 18 }}>{listing.bumpsRemaining}</Text>
                        <Text style={{ color: "#2A2533", fontFamily: font.medium }}>
                          {" "}
                          {t(`promote.bumpsWord_${pluralSuffix(lang, listing.bumpsRemaining)}`, { count: listing.bumpsRemaining })}
                        </Text>
                      </Text>
                      <Text style={{ marginTop: 4, color: "#8E8896", fontFamily: font.regular, fontSize: 11 }}>
                        {t("promote.boostHint")}
                      </Text>
                    </View>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                      <Image source={require("../../assets/icons/promo/clay-arrow.png")} resizeMode="contain" style={{ width: 20, height: 23 }} />
                    </View>
                  </View>
                  <Pressable
                    onPress={listing.bumpsRemaining > 0 ? onBumpNow : undefined}
                    disabled={listing.bumpsRemaining === 0 || bumping}
                    style={({ pressed }) => ({ marginTop: 12, opacity: listing.bumpsRemaining === 0 ? 0.45 : bumping ? 0.6 : pressed ? 0.9 : 1 })}
                  >
                    <LinearGradient
                      colors={brand.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 12 }}
                    >
                      <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 14 }}>{t("promote.bumpNow")}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Promotion */}
                <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: "#2A2533", fontFamily: font.bold, fontSize: 14 }}>
                        {t("promote.title")}
                      </Text>
                      <Text style={{ marginTop: 4, color: "#8E8896", fontFamily: font.regular, fontSize: 11 }}>
                        {t("promote.promoteSub")}
                      </Text>
                    </View>
                    <Image source={require("../../assets/icons/promo/clay-rocket.png")} resizeMode="contain" style={{ width: 34, height: 41 }} />
                  </View>
                  <Pressable
                    onPress={() => router.push(`/promote/${listing.id}`)}
                    style={({ pressed }) => ({ marginTop: 12, opacity: pressed ? 0.9 : 1 })}
                  >
                    <LinearGradient
                      colors={brand.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 12 }}
                    >
                      <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 14 }}>{t("promote.promoteCta")}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Description — full text, full width (no house, no collapse) */}
          {listing.description.trim() !== "" && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 17, marginBottom: 12 }}>
                {t("propertyDetail.description")}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 15, lineHeight: 22 }}>
                {showingTranslation ? translated : listing.description}
              </Text>

              {translating ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <ActivityIndicator size="small" color={brand.violet} />
                  <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 14 }}>
                    {t("propertyDetail.translating")}
                  </Text>
                </View>
              ) : showingTranslation ? (
                <Pressable onPress={() => setShowOriginal(true)} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 14 }}>
                    {t("propertyDetail.showOriginal")}
                  </Text>
                </Pressable>
              ) : origLang !== lang ? (
                <Pressable onPress={onTranslate} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 14 }}>
                    {t("propertyDetail.translate")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Amenities — hidden when none are set */}
          {listing.amenities.length > 0 && (
            <Section title={t("propertyDetail.amenities")} colors={colors}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {listing.amenities.map((key) => {
                  const meta = AMENITY_META[key];
                  if (!meta) return null;
                  return (
                    <View
                      key={key}
                      style={{ width: "50%", flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}
                    >
                      <Ionicons name={meta.icon} size={20} color={brand.violet} />
                      <Text style={{ color: colors.text, fontFamily: font.regular, fontSize: 14, flex: 1 }}>{t(meta.labelKey)}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          )}

          {/* Location map — real mini-map + marker; hidden when no coords
              (adapter coalesces null→0, so a 0/0 listing has no point). */}
          {listing.lat !== 0 && listing.lng !== 0 && (
            <Section title={t("propertyDetail.locationTitle")} colors={colors}>
              <ListingMiniMap lat={listing.lat} lng={listing.lng} district={listing.district} />
            </Section>
          )}
          </Animated.ScrollView>
        </GestureDetector>
      </Animated.View>

      {/* Gallery overlay controls (back / share / favorite) */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Pressable onPress={goBack} hitSlop={6} style={overlayBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={onShare} hitSlop={6} style={overlayBtn}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Migrating favorite heart: flies header (collapsed) -> panel (expanded) */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: insets.top + 8,
            left: width - 106,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: mode === "dark" ? "rgba(20,18,24,0.7)" : "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
          },
          heartFlyStyle,
        ]}
      >
        <Pressable onPress={() => toggle(listing.id)} hitSlop={10}>
          <Ionicons
            name={isFavorite(listing.id) ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite(listing.id) ? brand.magenta : colors.text}
          />
        </Pressable>
      </Animated.View>

      {/* Fixed bottom bar: favorite + one big "Contact" button (opens sheet) */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          gap: 12,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 14,
        }}
      >
        <Animated.View style={[{ flex: 1 }, contactBtnStyle]}>
          <Pressable onPress={() => setContactSheet(true)} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.9 : 1 })}>
            <LinearGradient
              colors={brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 16 }}>{t("propertyDetail.contactButton")}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {/* Contact sheet — owner card + Linking options */}
      <PhotoGallery
        visible={galleryOpen}
        photos={listing.gallery}
        initialIndex={page}
        onClose={() => setGalleryOpen(false)}
      />

      <BottomSheet visible={contactSheet} onClose={() => setContactSheet(false)}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8 }}>
          <Pressable onPress={() => setContactSheet(false)} hitSlop={8} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", marginRight: 34, color: colors.text, fontFamily: font.bold, fontSize: 17 }}>
            {t("propertyDetail.contactSheetTitle")}
          </Text>
        </View>

        {/* Owner card */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 }}>
          {listing.agent.avatar ? (
            <Image source={{ uri: listing.agent.avatar }} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bg }} />
          ) : (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person" size={26} color="#FFFFFF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>{listing.agent.name}</Text>
            <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 2 }}>
              {listing.agent.agency ? listing.agent.agency.name : listing.agent.role === "agent" ? t("profile.roleAgent") : t("profile.roleUser")}
            </Text>
          </View>
          {listing.agent.verified && <Ionicons name="shield-checkmark" size={18} color={brand.blue} />}
        </View>

        {/* Options */}
        {hasPhone && (
          <ContactRow icon="logo-whatsapp" tint="#25D366" label={t("propertyDetail.contactWhatsapp")} colors={colors}
            onPress={() => { setContactSheet(false); openWhatsApp(); }} />
        )}
        {hasPhone && (
          <ContactRow icon="call" tint={brand.violet} label={t("propertyDetail.contactCall")} sub={displayPhone} colors={colors}
            onPress={() => { setContactSheet(false); call(); }} />
        )}
        {tgUser !== "" && (
          <ContactRow icon="paper-plane" tint="#2AABEE" label={t("propertyDetail.contactTelegram")} colors={colors}
            onPress={() => { setContactSheet(false); openTelegram(); }} />
        )}
        {!isOwnListing && (
          <ContactRow icon="chatbubble-ellipses" tint={brand.magenta} label={t("propertyDetail.contactMessage")} colors={colors}
            onPress={() => { setContactSheet(false); onMessage(); }} />
        )}

        <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, textAlign: "center", paddingHorizontal: 24, paddingTop: 14, paddingBottom: 4 }}>
          {t("propertyDetail.contactPrivacy")}
        </Text>
      </BottomSheet>
    </View>
  );
}

function ContactRow({
  icon,
  tint,
  label,
  sub,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  sub?: string;
  colors: Theme;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

function SpecCard({
  colors,
  icon,
  iconStyle,
  tintBg,
  label,
  value,
}: {
  colors: Theme;
  icon: ImageSourcePropType;
  iconStyle: { width: number; height: number };
  tintBg: string;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 12,
        gap: 6,
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: tintBg, alignItems: "center", justifyContent: "center" }}>
        <Image source={icon} resizeMode="contain" style={iconStyle} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{ color: colors.text, fontFamily: font.bold, fontSize: 14, textAlign: "center" }}
      >
        {value}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.medium, fontSize: 12, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: Theme; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 17, marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}
