import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Listing, formatPrice, formatArea, isPromoActive, isRecentlyBumped } from "../lib/mock/listings";
import { isLandType } from "../lib/propertyTypes";
import { buildListingTitle } from "../lib/listingTitle";
import { placeById, placeName } from "../lib/places";
import { MetroBadge } from "./MetroBadge";
import { useLanguage } from "../lib/i18n/languages";
import { usePressShrink } from "../lib/animations";

type Props = {
  listing: Listing;
  variant?: "carousel" | "feed";
  cardWidth?: number; // carousel only — fixed card width (default 260)
  favorited: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

const NEW_WINDOW_MS = 72 * 60 * 60 * 1000;
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

export function PropertyCard({ listing, variant = "feed", cardWidth = 260, favorited, onToggleFavorite, onPress }: Props) {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const press = usePressShrink(0.97);
  const carousel = variant === "carousel";
  // Region + metro shown in the location row below → drop both from the title.
  const title = buildListingTitle(listing, t, lang, { withMetro: false, withRegion: false });
  const station = listing.metroId ? placeById(listing.metroId) : undefined; // user-picked metro, never inferred
  const regionName = placeById(listing.placeId) ? placeName(placeById(listing.placeId)!, lang) : listing.district;

  const isNew = (() => {
    const ts = new Date(listing.createdAt).getTime();
    return Number.isFinite(ts) && Date.now() - ts < NEW_WINDOW_MS;
  })();

  // Promotion: tier badge only while active (promoted_until > now). Boost is
  // orthogonal — shown when there's balance or a recent bump (can co-exist).
  const tier = isPromoActive(listing) ? listing.promoTier : "none";
  const boosted = isRecentlyBumped(listing);

  // Feed-only photo swiper: slide width = measured photo-block width; current
  // index drives the live counter. Carousel keeps a static first photo (nested
  // horizontal scrolls inside the recommended carousel would fight gestures).
  const [slideW, setSlideW] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const useSwiper = !carousel && slideW > 0 && listing.photos.length > 1;

  // Press-and-hold scale lives on the inner Pressables (slides / body) via
  // press.onPressIn/Out; a clean tap opens detail. Never wrap the whole card in
  // a Pressable — its responder swallows the photo swipe.
  const handleTap = onPress;

  return (
    <View style={carousel ? { width: cardWidth } : { alignSelf: "stretch" }}>
      <Animated.View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          },
          press.style,
        ]}
      >
        {/* Photo fills the card width to the edges; all corners rounded to match
            the card (24). Gradient/price/badges/counter live inside this block. */}
        <View
          onLayout={(e) => setSlideW(e.nativeEvent.layout.width)}
          style={{ alignSelf: "stretch", height: carousel ? 196 : 210, borderRadius: 24, overflow: "hidden", backgroundColor: colors.bg }}
        >
          {useSwiper ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / slideW))
              }
            >
              {listing.photos.map((item, i) => (
                <Pressable
                  key={i}
                  onPress={handleTap}
                  onPressIn={press.onPressIn}
                  onPressOut={press.onPressOut}
                  unstable_pressDelay={60}
                  style={{ width: slideW, height: "100%" }}
                >
                  <Image source={{ uri: item }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Pressable
              onPress={handleTap}
              onPressIn={press.onPressIn}
              onPressOut={press.onPressOut}
              unstable_pressDelay={60}
              style={{ width: "100%", height: "100%" }}
            >
              <Image source={{ uri: listing.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </Pressable>
          )}

          {/* Bottom third darkening for price legibility. pointerEvents none so it
              never intercepts the horizontal photo swipe. */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"]}
            locations={[0, 0.5, 1]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" }}
          />

          {/* Badges top-left: promo tier (or NEW), with optional Boost below.
              Active VIP/Premium outrank NEW (promo hides NEW). */}
          <View pointerEvents="none" style={{ position: "absolute", top: 12, left: 12, gap: 6, alignItems: "flex-start" }}>
            {tier === "premium" ? (
              <View style={badgePill(PREMIUM_GOLD)}>
                <Image source={require("../assets/icons/promo/clay-crown.png")} resizeMode="contain" style={{ width: 16, height: 13 }} />
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.5 }}>
                  {t("home.badgePremium")}
                </Text>
              </View>
            ) : tier === "vip" ? (
              <View style={badgePill(VIP_RED)}>
                <Image source={require("../assets/icons/promo/clay-star.png")} resizeMode="contain" style={{ width: 14, height: 14 }} />
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.5 }}>
                  {t("home.badgeVip")}
                </Text>
              </View>
            ) : isNew ? (
              <View style={badgePill(brand.magenta)}>
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.5 }}>
                  {t("home.badgeNew")}
                </Text>
              </View>
            ) : null}
            {boosted && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: brand.blue,
                  opacity: 0.9,
                }}
              >
                <Image source={require("../assets/icons/promo/clay-arrow.png")} resizeMode="contain" style={{ width: 11, height: 13 }} />
                <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: 9, letterSpacing: 0.2 }}>
                  {t("home.badgeBoosted")}
                </Text>
              </View>
            )}
          </View>

          {/* Favorite */}
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
              backgroundColor: mode === "dark" ? "rgba(20,18,24,0.6)" : "rgba(255,255,255,0.85)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={favorited ? "heart" : "heart-outline"} size={18} color={favorited ? brand.magenta : colors.text} />
          </Pressable>

          {/* Info — price + title + district (+ metro) over the gradient; specs in feed.
              Same "info on photo" style for both variants. */}
          <View pointerEvents="none" style={{ position: "absolute", left: 14, right: 14, bottom: 12 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: carousel ? 20 : 24, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 4 }}
            >
              {formatPrice(listing.priceAzn)}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: "rgba(255,255,255,0.95)", fontFamily: font.medium, fontSize: 13, marginTop: 3, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
            >
              {title}
            </Text>
            {/* District + metro on ONE row; metro only when the user picked one */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, marginLeft: 3, color: "rgba(255,255,255,0.9)", fontFamily: font.regular, fontSize: 12, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
              >
                {regionName}
              </Text>
              {station && (
                <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 10 }}>
                  <MetroBadge />
                  <Text
                    numberOfLines={1}
                    style={{ marginLeft: 4, color: "rgba(255,255,255,0.9)", fontFamily: font.regular, fontSize: 12, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
                  >
                    {placeName(station, lang)}
                  </Text>
                </View>
              )}
            </View>
            {/* Specs — feed only (compact line, like the detail overlay) */}
            {!carousel && (
              <Text
                numberOfLines={1}
                style={{ color: "rgba(255,255,255,0.9)", fontFamily: font.medium, fontSize: 12, marginTop: 4, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
              >
                {[
                  !isLandType(listing.propertyType) ? `${listing.rooms} ${t("home.roomsUnit")}` : null,
                  formatArea(listing, t),
                  listing.floor != null && listing.floorTotal != null
                    ? `${listing.floor}/${listing.floorTotal} ${t("home.floorUnit")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("  •  ")}
              </Text>
            )}
          </View>

          {/* Photo counter — live index when swiping (only when >1 photo) */}
          {listing.photoCount > 1 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                height: 28,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                backgroundColor: "rgba(0,0,0,0.5)",
                paddingHorizontal: 10,
                borderRadius: 999,
              }}
            >
              <Ionicons name="image-outline" size={13} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: 12 }}>
                {`${photoIndex + 1}/${listing.photoCount}`}
              </Text>
            </View>
          )}
        </View>

      </Animated.View>
    </View>
  );
}

