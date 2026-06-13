import { View, Text, Image, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Listing, formatPrice, isPromoActive, isRecentlyBumped } from "../lib/mock/listings";
import { buildListingTitle } from "../lib/listingTitle";
import { useLanguage } from "../lib/i18n/languages";
import { usePressShrink } from "../lib/animations";

type Props = {
  listing: Listing;
  favorited: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

const NEW_WINDOW_MS = 72 * 60 * 60 * 1000;
const VIP_RED = "#E5322D";
const PREMIUM_GOLD = "#E0A526";

/**
 * Compact 2-column card for the Home "New listings" grid. Smaller than the
 * carousel/feed PropertyCard (paid listings stay larger) — fixed-height photo,
 * price + title + district, the same promo/NEW badges and favorite heart.
 */
export function PropertyCardCompact({ listing, favorited, onToggleFavorite, onPress }: Props) {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const press = usePressShrink(0.97);
  const title = buildListingTitle(listing, t, lang);

  const isNew = (() => {
    const ts = new Date(listing.createdAt).getTime();
    return Number.isFinite(ts) && Date.now() - ts < NEW_WINDOW_MS;
  })();
  const tier = isPromoActive(listing) ? listing.promoTier : "none";
  const boosted = isRecentlyBumped(listing);

  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          },
          press.style,
        ]}
      >
        {/* Photo */}
        <View style={{ height: 100, backgroundColor: colors.border }}>
          {listing.image ? (
            <Image source={{ uri: listing.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="image-outline" size={26} color={colors.textSecondary} />
            </View>
          )}

          {/* Badges top-left: promo tier (or NEW) + optional boost */}
          <View pointerEvents="none" style={{ position: "absolute", top: 8, left: 8, gap: 4, alignItems: "flex-start" }}>
            {tier === "premium" ? (
              <View style={badgePill(PREMIUM_GOLD)}>
                <Ionicons name="star" size={9} color="#FFFFFF" />
                <Text style={badgeText}>{t("home.badgePremium")}</Text>
              </View>
            ) : tier === "vip" ? (
              <View style={badgePill(VIP_RED)}>
                <Text style={badgeText}>{t("home.badgeVip")}</Text>
              </View>
            ) : isNew ? (
              <View style={badgePill(brand.magenta)}>
                <Text style={badgeText}>{t("home.badgeNew")}</Text>
              </View>
            ) : null}
            {boosted && (
              <View style={{ ...badgePill(brand.blue), opacity: 0.9 }}>
                <Ionicons name="arrow-up" size={8} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Favorite */}
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: mode === "dark" ? "rgba(20,18,24,0.6)" : "rgba(255,255,255,0.85)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={favorited ? "heart" : "heart-outline"} size={15} color={favorited ? brand.magenta : colors.text} />
          </Pressable>
        </View>

        {/* Info */}
        <View style={{ paddingHorizontal: 10, paddingTop: 6, paddingBottom: 10, gap: 3 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 15 }}>
            {formatPrice(listing.priceAzn)}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.medium, fontSize: 12 }}>
            {title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text numberOfLines={1} style={{ flex: 1, color: colors.textSecondary, fontFamily: font.regular, fontSize: 11 }}>
              {listing.district}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const badgePill = (bg: string) =>
  ({
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: bg,
  }) as const;

const badgeText = { color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 9, letterSpacing: 0.4 } as const;
