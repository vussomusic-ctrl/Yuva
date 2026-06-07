import { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Linking,
  Share,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { getListingDetail, formatPrice } from "../../lib/mock/listings";
import { buildListingTitle } from "../../lib/listingTitle";
import { useLanguage } from "../../lib/i18n/languages";

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

  const listing = getListingDetail(id ?? "");
  const [favorited, setFavorited] = useState(false);
  const [page, setPage] = useState(0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.text }}>Not found</Text>
      </View>
    );
  }

  // Title is derived on the fly in the current language (no stored string).
  const title = buildListingTitle(listing, t, lang);

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

          {/* Bottom fade into the page */}
          <LinearGradient
            colors={["transparent", colors.bg]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 }}
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
        <View style={{ paddingHorizontal: 20, marginTop: -4 }}>
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
            <SpecCard colors={colors} icon="resize-outline" label={t("propertyDetail.area")} value={`${listing.areaM2} m²`} />
            <SpecCard colors={colors} icon="bed-outline" label={t("propertyDetail.rooms")} value={`${listing.rooms}`} />
            {listing.floor != null && listing.floorTotal != null && (
              <SpecCard
                colors={colors}
                icon="layers-outline"
                label={t("propertyDetail.floor")}
                value={`${listing.floor}/${listing.floorTotal}`}
              />
            )}
          </View>

          {/* Description */}
          <Section title={t("propertyDetail.description")} colors={colors}>
            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              {listing.description}
            </Text>
          </Section>

          {/* Amenities */}
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

          {/* Map stub */}
          <Section title={t("propertyDetail.locationTitle")} colors={colors}>
            <View
              style={{
                height: 180,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: mode === "dark" ? "#15171C" : "#E8EAF1",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* faux streets */}
              <View style={{ position: "absolute", top: 50, left: 0, right: 0, height: 6, backgroundColor: mode === "dark" ? "#23262E" : "#D5D9E4" }} />
              <View style={{ position: "absolute", top: 120, left: 0, right: 0, height: 4, backgroundColor: mode === "dark" ? "#23262E" : "#D5D9E4" }} />
              <View style={{ position: "absolute", top: 0, bottom: 0, left: "60%", width: 5, backgroundColor: mode === "dark" ? "#23262E" : "#D5D9E4" }} />
              <Ionicons name="location" size={40} color={brand.magenta} />

              {/* address overlay */}
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  right: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: mode === "dark" ? "rgba(20,18,24,0.85)" : "rgba(255,255,255,0.92)",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "600", flex: 1 }}>
                  {listing.district}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Text style={{ color: brand.violet, fontSize: 12, fontWeight: "700" }}>{t("propertyDetail.viewMap")}</Text>
                  <Ionicons name="chevron-forward" size={14} color={brand.violet} />
                </View>
              </View>
            </View>
          </Section>
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
          <Pressable onPress={() => setFavorited((f) => !f)} hitSlop={6} style={overlayBtn}>
            <Ionicons
              name={favorited ? "heart" : "heart-outline"}
              size={20}
              color={favorited ? brand.magenta : colors.text}
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
          <Image
            source={{ uri: listing.agent.avatar }}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bg }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{listing.agent.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="shield-checkmark" size={13} color={brand.blue} />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t("propertyDetail.verifiedAgent")}</Text>
            </View>
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

          {/* PRIMARY — message (chat stub), brand gradient */}
          <Pressable onPress={() => router.push("/chat")} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.9 : 1 })}>
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
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
              <Text numberOfLines={1} style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                {t("propertyDetail.write")}
              </Text>
            </LinearGradient>
          </Pressable>
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
