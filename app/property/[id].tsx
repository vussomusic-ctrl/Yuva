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
import ListingMiniMap from "../../components/ListingMiniMap";
import { Header } from "../my-listings";
import { buildListingTitle } from "../../lib/listingTitle";
import { useLanguage } from "../../lib/i18n/languages";
import { detectLang } from "../../lib/langDetect";
import { translateDescription } from "../../lib/api/ai";

const WHATSAPP_GREEN = "#25D366";
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
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { isFavorite, toggle } = useFavorites();
  const { user } = useAuth();
  const [creatingChat, setCreatingChat] = useState(false);
  // Description translation (in-memory cache per target language; per screen).
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const transCache = useRef<Map<string, string>>(new Map());
  const hasDataRef = useRef(false); // true once the listing is loaded (silent refetch after)

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ok">("loading");
  const [page, setPage] = useState(0);
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
  const call = () => Linking.openURL(`tel:${listing.ownerPhone}`).catch(() => {});
  const openWhatsApp = () => {
    const text = encodeURIComponent(
      t("propertyDetail.waMessage", { title, price: formatPrice(listing.priceAzn) }),
    );
    Linking.openURL(`https://wa.me/${phoneDigits}?text=${text}`).catch(() => {});
  };

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

  const galleryHeight = 360;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Gallery */}
        <View style={{ width, height: galleryHeight }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onGalleryScroll}
            scrollEventThrottle={16}
          >
            {listing.gallery.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width, height: galleryHeight }} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Bottom fade into the page — balanced: top ~40% stays clear (photo
              untouched), then a soft graduated haze dissolves into the bg at the
              bottom (translucent mid-stop keeps it gentle, not a hard step). */}
          <LinearGradient
            colors={[
              "transparent",
              "transparent",
              mode === "dark" ? "rgba(18,18,18,0.25)" : "rgba(247,247,249,0.25)",
              colors.bg,
            ]}
            locations={[0, 0.4, 0.72, 1]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 75 }}
            pointerEvents="none"
          />

          {/* Pagination dots */}
          <View
            style={{
              position: "absolute",
              bottom: 28,
              alignSelf: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
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

          {/* Promo badges — overlay INSIDE the gallery (scroll away with the photo,
              below the fixed header controls). Public: VIP/Premium + recent Boost. */}
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
        </View>

        {/* Body */}
        <View style={{ paddingHorizontal: 20, marginTop: -4, paddingTop: 24 }}>
          {/* Price + title + location */}
          <Text style={{ color: brand.violet, fontFamily: font.extrabold, fontSize: 26 }}>
            {formatPrice(listing.priceAzn)}
          </Text>
          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 20, marginTop: 4 }}>
            {title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>{listing.district}</Text>
          </View>

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
        </View>
      </ScrollView>

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
          <Pressable onPress={() => toggle(listing.id)} hitSlop={6} style={overlayBtn}>
            <Ionicons
              name={isFavorite(listing.id) ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite(listing.id) ? brand.magenta : colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Fixed seller contact panel */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 14,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {listing.agent.avatar ? (
            <Image
              source={{ uri: listing.agent.avatar }}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bg }}
            />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: brand.violet,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {/* Agency line — only for agents who belong to one. Logo optional.
                Taps through to the agency page. */}
            {listing.agent.role === "agent" && listing.agent.agency && (
              <Pressable
                onPress={() => router.push(`/agencies/${listing.agent.agency!.id}`)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 2,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                {listing.agent.agency.logoUrl ? (
                  <Image
                    source={{ uri: listing.agent.agency.logoUrl }}
                    style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: colors.bg }}
                  />
                ) : null}
                <Text numberOfLines={1} style={{ flex: 1, color: colors.textSecondary, fontFamily: font.semibold, fontSize: 13 }}>
                  {listing.agent.agency.name}
                </Text>
              </Pressable>
            )}
            <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>{listing.agent.name}</Text>
            <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 2 }}>
              {listing.agent.role === "agent" ? t("profile.roleAgent") : t("profile.roleUser")}
            </Text>
            {listing.agent.verified && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="shield-checkmark" size={13} color={brand.blue} />
                <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13 }}>{t("propertyDetail.verifiedAgent")}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* SECONDARY — call (outline) */}
          <Pressable
            onPress={call}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: brand.violet,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="call-outline" size={18} color={brand.violet} />
            <Text numberOfLines={1} style={{ color: brand.violet, fontFamily: font.bold, fontSize: 14 }}>
              {t("propertyDetail.call")}
            </Text>
          </Pressable>

          {/* WhatsApp — primary sales channel */}
          <Pressable
            onPress={openWhatsApp}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: WHATSAPP_GREEN,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="logo-whatsapp" size={19} color="#FFFFFF" />
            <Text numberOfLines={1} style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 14 }}>WhatsApp</Text>
          </Pressable>

          {/* PRIMARY — message the seller (gradient). Hidden on your own listing. */}
          {!isOwnListing && (
            <Pressable onPress={onMessage} disabled={creatingChat} style={({ pressed }) => ({ flex: 1, opacity: pressed || creatingChat ? 0.9 : 1 })}>
              <LinearGradient
                colors={brand.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 14,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {creatingChat ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
                )}
                <Text numberOfLines={1} style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 14 }}>
                  {t("propertyDetail.write")}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </View>
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
