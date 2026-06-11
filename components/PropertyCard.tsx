import { View, Text, Image, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { Listing, formatPrice, formatArea } from "../lib/mock/listings";
import { isLandType } from "../lib/propertyTypes";
import { buildListingTitle } from "../lib/listingTitle";
import { useLanguage } from "../lib/i18n/languages";
import { usePressScale } from "../lib/animations";

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

export function PropertyCard({ listing, variant = "feed", favorited, onToggleFavorite, onPress }: Props) {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const press = usePressScale();
  const carousel = variant === "carousel";
  const title = buildListingTitle(listing, t, lang);

  const isNew = (() => {
    const ts = new Date(listing.createdAt).getTime();
    return Number.isFinite(ts) && Date.now() - ts < NEW_WINDOW_MS;
  })();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={carousel ? { width: 260 } : { alignSelf: "stretch" }}
    >
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
        {/* Photo flush to the card top, full width; only the top corners round
            (they inherit the card radius). Bottom edge straight — content sits
            on the card below it. */}
        <View style={{ width: "100%", aspectRatio: carousel ? 4 / 3 : 16 / 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", backgroundColor: colors.bg }}>
          <Image source={{ uri: listing.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />

          {/* Bottom third darkening for price legibility */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%" }}
          />

          {/* NEW badge — listings younger than 72h */}
          {isNew && (
            <View
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                backgroundColor: brand.magenta,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>
                {t("home.badgeNew")}
              </Text>
            </View>
          )}

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
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              position: "absolute",
              bottom: 12,
              left: 14,
              right: 72,
              color: "#FFFFFF",
              fontSize: 26,
              fontWeight: "800",
            }}
          >
            {formatPrice(listing.priceAzn)}
          </Text>

          {/* Photo counter — only when more than one photo */}
          {listing.photoCount > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "rgba(0,0,0,0.45)",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Ionicons name="image-outline" size={13} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>{`1/${listing.photoCount}`}</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={{ padding: 14, gap: 8 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
            {title}
          </Text>

          {!carousel && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>
                {listing.district}
              </Text>
            </View>
          )}

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
        </View>
      </Animated.View>
    </Pressable>
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
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}
