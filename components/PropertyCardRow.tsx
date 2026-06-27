import { View, Text, Image, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Listing, formatPrice, isPromoActive } from "../lib/mock/listings";
import { buildListingTitle } from "../lib/listingTitle";
import { placeById, placeName } from "../lib/places";
import { MetroBadge } from "./MetroBadge";
import { useLanguage } from "../lib/i18n/languages";
import { usePressShrink } from "../lib/animations";

type Props = {
  listing: Listing;
  viewed?: boolean;
  favorited: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

const VIP_RED = "#E5322D";
const PREMIUM_GOLD = "#E0A526";
const VERIFIED_GREEN = "#0F9D58"; // same green as the metro mark

// Compact relative time from createdAt (real data) → "5 ч назад" / "3 дн назад".
function timeAgo(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "";
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return t("search.timeJustNow");
  if (h < 24) return t("search.timeHoursAgo", { count: h });
  return t("search.timeDaysAgo", { count: Math.floor(h / 24) });
}

/** Bayut-style listing card: photo on top (full width), data below on the card. */
export function PropertyCardRow({ listing, viewed, favorited, onToggleFavorite, onPress }: Props) {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const press = usePressShrink(0.97);

  const place = placeById(listing.placeId);
  const regionName = place ? placeName(place, lang) : listing.district;
  const station = listing.metroId ? placeById(listing.metroId) : undefined;
  const stationName = station ? placeName(station, lang) : null;
  const tier = isPromoActive(listing) ? listing.promoTier : "none";
  const area = listing.landAreaSot ? `${listing.landAreaSot} sot` : `${listing.areaM2} m²`;

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        },
        press.style,
      ]}
    >
      <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} unstable_pressDelay={60}>
        <View style={{ borderRadius: 16, overflow: "hidden" }}>
          {/* Photo — top, full width */}
          <View style={{ width: "100%", height: 185, backgroundColor: colors.bg }}>
            <Image source={{ uri: listing.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />

            {/* Promo tier — top-left */}
            {tier === "premium" ? (
              <View style={[pill, { backgroundColor: PREMIUM_GOLD, top: 12, left: 12 }]}>
                <Image source={require("../assets/icons/promo/clay-crown.png")} resizeMode="contain" style={{ width: 14, height: 12 }} />
                <Text style={badgeText}>{t("home.badgePremium")}</Text>
              </View>
            ) : tier === "vip" ? (
              <View style={[pill, { backgroundColor: VIP_RED, top: 12, left: 12 }]}>
                <Image source={require("../assets/icons/promo/clay-star.png")} resizeMode="contain" style={{ width: 13, height: 13 }} />
                <Text style={badgeText}>{t("home.badgeVip")}</Text>
              </View>
            ) : null}

            {/* Favorite — white circle, top-right */}
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={8}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: mode === "dark" ? "rgba(20,18,24,0.6)" : "rgba(255,255,255,0.9)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={favorited ? "heart" : "heart-outline"} size={18} color={favorited ? brand.magenta : colors.text} />
            </Pressable>

            {/* Photo counter — bottom-left */}
            {listing.photoCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 7,
                  backgroundColor: "rgba(0,0,0,0.55)",
                }}
              >
                <Ionicons name="images-outline" size={12} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: 11 }}>{listing.photoCount}</Text>
              </View>
            )}

            {/* "Viewed" glass badge — bottom-right (counter is bottom-left, no overlap) */}
            {viewed && (
              <View
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  borderRadius: 10,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
              >
                <BlurView
                  intensity={28}
                  tint="light"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    overflow: "hidden",
                    borderWidth: 0.5,
                    borderColor: "rgba(255,255,255,0.4)",
                  }}
                >
                  <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontFamily: font.medium, fontSize: 12 }}>{t("search.viewedBadge")}</Text>
                </BlurView>
              </View>
            )}
          </View>

          {/* Data — below the photo, on the card */}
          <View style={{ padding: 14 }}>
            {/* Price + deal badge */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.text, fontFamily: font.extrabold, fontSize: 22 }}>
                {formatPrice(listing.priceAzn)}
              </Text>
              <View style={{ marginLeft: 8, backgroundColor: brand.violet + "1A", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 12 }}>
                  {t(listing.dealType === "rent" ? "home.dealRent" : "home.dealSale")}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.medium, fontSize: 14, marginTop: 6 }}>
              {buildListingTitle(listing, t, lang, { withMetro: false, withRegion: false })}
            </Text>

            {/* Spec row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 7 }}>
              {listing.rooms > 0 && <Spec icon="bed-outline" text={String(listing.rooms)} colors={colors} />}
              <Spec icon="resize-outline" text={area} colors={colors} />
              {listing.floor != null && (
                <Spec icon="layers-outline" text={listing.floorTotal ? `${listing.floor}/${listing.floorTotal}` : String(listing.floor)} colors={colors} />
              )}
            </View>

            {/* Location + metro */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text numberOfLines={1} style={{ flexShrink: 1, marginLeft: 4, color: colors.textSecondary, fontFamily: font.regular, fontSize: 13 }}>
                {regionName}
              </Text>
              {stationName && (
                <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8, gap: 4 }}>
                  <MetroBadge size={14} />
                  <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13 }}>
                    {stationName}
                  </Text>
                </View>
              )}
            </View>

            {/* Agency (only when present) */}
            {listing.agencyName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                {listing.agencyLogo ? (
                  <Image source={{ uri: listing.agencyLogo }} style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg }} />
                ) : (
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 11 }}>{listing.agencyName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={{ flex: 1, color: colors.textSecondary, fontFamily: font.medium, fontSize: 13 }}>
                  {listing.agencyName}
                </Text>
                {listing.agencyVerified && <Ionicons name="checkmark-circle" size={15} color={VERIFIED_GREEN} />}
                <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 11, marginLeft: 4 }}>
                  {timeAgo(listing.createdAt, t)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Spec({ icon, text, colors }: { icon: keyof typeof Ionicons.glyphMap; text: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={15} color={brand.violet} />
      <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

const pill = {
  position: "absolute",
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 7,
  paddingVertical: 3,
  borderRadius: 7,
} as const;

const badgeText = { color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.3 } as const;
