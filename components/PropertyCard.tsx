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
import { useLanguage } from "../lib/i18n/languages";
import { usePressShrink } from "../lib/animations";

type Props = {
  listing: Listing;
  variant?: "carousel" | "feed";
  favorited: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

// Pastel chips behind spec icons — same gamut as the Home category tints.
const SPEC_TINT = {
  area: { light: "#EFE7FB", dark: "#2A2138", icon: brand.violet },
  rooms: { light: "#E3EEFB", dark: "#1E2A3C", icon: brand.blue },
  floor: { light: "#FBE7F1", dark: "#331C2A", icon: brand.magenta },
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

export function PropertyCard({ listing, variant = "feed", favorited, onToggleFavorite, onPress }: Props) {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const press = usePressShrink(0.97);
  const carousel = variant === "carousel";
  const title = buildListingTitle(listing, t, lang);

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
    <View style={carousel ? { width: 260 } : { alignSelf: "stretch" }}>
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
          style={{ alignSelf: "stretch", height: carousel ? 150 : 210, borderRadius: 24, overflow: "hidden", backgroundColor: colors.bg }}
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
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%" }}
          />

          {/* Badges top-left: promo tier (or NEW), with optional Boost below.
              Active VIP/Premium outrank NEW (promo hides NEW). */}
          <View pointerEvents="none" style={{ position: "absolute", top: 12, left: 12, gap: 6, alignItems: "flex-start" }}>
            {tier === "premium" ? (
              <View style={badgePill(PREMIUM_GOLD)}>
                <Ionicons name="star" size={11} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.5 }}>
                  {t("home.badgePremium")}
                </Text>
              </View>
            ) : tier === "vip" ? (
              <View style={badgePill(VIP_RED)}>
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
                <Ionicons name="arrow-up" size={9} color="#FFFFFF" />
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

          {/* Price — bounded width (left/right) so long values shrink instead of
              colliding with the photo counter */}
          <Text
            pointerEvents="none"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              position: "absolute",
              bottom: 12,
              left: 14,
              right: 72,
              color: "#FFFFFF",
              fontFamily: font.extrabold,
              fontSize: 26,
            }}
          >
            {formatPrice(listing.priceAzn)}
          </Text>

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

        {/* Body — tap opens detail. Pressable lives here (not wrapping the card),
            so it never competes with the photo swiper above. */}
        <Pressable
          onPress={handleTap}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={{ paddingHorizontal: 10, paddingTop: 6, paddingBottom: 16 }}
        >
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 17 }}>
            {title}
          </Text>

          {!carousel && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, flex: 1 }}>
                {listing.district}
              </Text>
            </View>
          )}

          {/* Divider between title/location and specs. Explicit hairline pair —
              the theme `border` token is too faint as a 1px line on the card. */}
          <View
            style={{
              height: 1.5,
              backgroundColor: mode === "dark" ? "#2E2838" : "#E4DEF0",
              opacity: 1,
              alignSelf: "stretch",
              marginVertical: 12,
            }}
          />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2 }}>
            <Spec kind="area" icon="resize-outline" text={formatArea(listing, t)} colors={colors} mode={mode} />
            {!isLandType(listing.propertyType) && (
              <Spec kind="rooms" icon="bed-outline" text={`${listing.rooms} ${t("home.roomsUnit")}`} colors={colors} mode={mode} />
            )}
            {listing.floor != null && listing.floorTotal != null && (
              <Spec
                kind="floor"
                icon="layers-outline"
                text={`${listing.floor}/${listing.floorTotal} ${t("home.floorUnit")}`}
                colors={colors}
                mode={mode}
              />
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Spec({
  kind,
  icon,
  text,
  colors,
  mode,
}: {
  kind: keyof typeof SPEC_TINT;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: Theme;
  mode: "light" | "dark";
}) {
  const tint = SPEC_TINT[kind];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mode === "dark" ? tint.dark : tint.light,
        }}
      >
        <Ionicons name={icon} size={15} color={tint.icon} />
      </View>
      <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 13 }}>{text}</Text>
    </View>
  );
}
