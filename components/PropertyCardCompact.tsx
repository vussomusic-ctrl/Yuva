import { View, Text, Image, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Listing, formatPrice, isPromoActive, isRecentlyBumped } from "../lib/mock/listings";
import { buildListingTitle } from "../lib/listingTitle";
import { placeById, placeName } from "../lib/places";
import { MetroBadge } from "./MetroBadge";
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
  // Region + metro shown in the location row below → drop both from the title.
  const title = buildListingTitle(listing, t, lang, { withMetro: false, withRegion: false });
  const station = listing.metroId ? placeById(listing.metroId) : undefined; // user-picked metro, never inferred
  const regionName = placeById(listing.placeId) ? placeName(placeById(listing.placeId)!, lang) : listing.district;

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
            aspectRatio: 1,
            borderRadius: 16,
            backgroundColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          },
          press.style,
        ]}
      >
        {/* Photo fills the whole card; clip wrapper keeps it rounded (card shadow stays) */}
        <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: colors.border }}>
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
                <Image source={require("../assets/icons/promo/clay-crown.png")} resizeMode="contain" style={{ width: 14, height: 12 }} />
                <Text style={badgeText}>{t("home.badgePremium")}</Text>
              </View>
            ) : tier === "vip" ? (
              <View style={badgePill(VIP_RED)}>
                <Image source={require("../assets/icons/promo/clay-star.png")} resizeMode="contain" style={{ width: 12, height: 12 }} />
                <Text style={badgeText}>{t("home.badgeVip")}</Text>
              </View>
            ) : isNew ? (
              <View style={badgePill(brand.magenta)}>
                <Text style={badgeText}>{t("home.badgeNew")}</Text>
              </View>
            ) : null}
            {boosted && (
              <View style={{ ...badgePill(brand.blue), opacity: 0.9 }}>
                <Image source={require("../assets/icons/promo/clay-arrow.png")} resizeMode="contain" style={{ width: 10, height: 12 }} />
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

          {/* Bottom darkening — stronger, for 3 lines of white text over the photo */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"]}
            locations={[0, 0.5, 1]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" }}
          />

          {/* Info — price + title + district in white, over the gradient */}
          <View pointerEvents="none" style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 18, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 4 }}
            >
              {formatPrice(listing.priceAzn)}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: "rgba(255,255,255,0.95)", fontFamily: font.medium, fontSize: 12.5, marginTop: 3, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
            >
              {title}
            </Text>
            {/* District + metro on ONE row; district shrinks first, metro only when picked */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.9)" />
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, marginLeft: 3, color: "rgba(255,255,255,0.9)", fontFamily: font.regular, fontSize: 11, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
              >
                {regionName}
              </Text>
              {station && (
                <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
                  <MetroBadge size={13} />
                  <Text
                    numberOfLines={1}
                    style={{ marginLeft: 4, color: "rgba(255,255,255,0.9)", fontFamily: font.regular, fontSize: 11, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
                  >
                    {placeName(station, lang)}
                  </Text>
                </View>
              )}
            </View>
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
