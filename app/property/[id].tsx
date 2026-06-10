import { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { ListingDetail, formatPrice, formatArea } from "../../lib/mock/listings";
import { isLandType } from "../../lib/propertyTypes";
import { fetchListingDetail } from "../../lib/api/listings";
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

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ok">("loading");
  const [page, setPage] = useState(0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  const load = useCallback(() => {
    if (!id) {
      setStatus("notfound");
      return;
    }
    setStatus("loading");
    fetchListingDetail(id)
      .then((d) => {
        if (d) {
          setListing(d);
          setStatus("ok");
        } else {
          setStatus("notfound");
        }
      })
      .catch(() => setStatus("error"));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (status !== "ok" || !listing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <Header colors={colors} title="" onBack={goBack} />
        {status === "loading" && <LoadingState colors={colors} />}
        {status === "error" && <ErrorState colors={colors} onRetry={load} />}
        {status === "notfound" && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
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
        </View>

        {/* Body */}
        <View style={{ paddingHorizontal: 20, marginTop: -4, paddingTop: 24 }}>
          {/* Price + title + location */}
          <Text style={{ color: brand.violet, fontSize: 26, fontWeight: "800" }}>
            {formatPrice(listing.priceAzn)}
          </Text>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 4 }}>
            {title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{listing.district}</Text>
          </View>

          {/* Specs row */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <SpecCard colors={colors} icon="resize-outline" label={t("propertyDetail.area")} value={formatArea(listing, t)} />
            {!isLandType(listing.propertyType) && (
              <SpecCard colors={colors} icon="bed-outline" label={t("propertyDetail.rooms")} value={`${listing.rooms}`} />
            )}
            {listing.floor != null && listing.floorTotal != null && (
              <SpecCard
                colors={colors}
                icon="layers-outline"
                label={t("propertyDetail.floor")}
                value={`${listing.floor}/${listing.floorTotal}`}
              />
            )}
          </View>

          {/* Description — only if the seller wrote one */}
          {listing.description.trim() !== "" && (
            <Section title={t("propertyDetail.description")} colors={colors}>
              <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
                {showingTranslation ? translated : listing.description}
              </Text>

              {translating ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <ActivityIndicator size="small" color={brand.violet} />
                  <Text style={{ color: brand.violet, fontSize: 14, fontWeight: "600" }}>
                    {t("propertyDetail.translating")}
                  </Text>
                </View>
              ) : showingTranslation ? (
                <Pressable onPress={() => setShowOriginal(true)} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={{ color: brand.violet, fontSize: 14, fontWeight: "700" }}>
                    {t("propertyDetail.showOriginal")}
                  </Text>
                </Pressable>
              ) : origLang !== lang ? (
                <Pressable onPress={onTranslate} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={{ color: brand.violet, fontSize: 14, fontWeight: "700" }}>
                    {t("propertyDetail.translate")}
                  </Text>
                </Pressable>
              ) : null}
            </Section>
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
                      <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{t(meta.labelKey)}</Text>
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
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{listing.agent.name}</Text>
            {listing.agent.verified && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="shield-checkmark" size={13} color={brand.blue} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t("propertyDetail.verifiedAgent")}</Text>
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
            <Text numberOfLines={1} style={{ color: brand.violet, fontSize: 14, fontWeight: "700" }}>
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
            <Text numberOfLines={1} style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>WhatsApp</Text>
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
                <Text numberOfLines={1} style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
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
  label,
  value,
}: {
  colors: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 12,
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={20} color={brand.violet} />
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: Theme; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}
