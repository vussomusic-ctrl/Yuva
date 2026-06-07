import { View, Text, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { Listing, formatPrice } from "../lib/mock/listings";
import { buildListingTitle } from "../lib/listingTitle";
import { useLanguage } from "../lib/i18n/languages";

type Props = {
  listing: Listing;
  variant?: "carousel" | "feed";
  favorited: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

export function PropertyCard({ listing, variant = "feed", favorited, onToggleFavorite, onPress }: Props) {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const carousel = variant === "carousel";
  const title = buildListingTitle(listing, t, lang);

  const glassBg = mode === "dark" ? "rgba(20,18,24,0.72)" : "rgba(255,255,255,0.85)";
  const heartBg = mode === "dark" ? "rgba(20,18,24,0.6)" : "rgba(255,255,255,0.85)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        // Carousel = fixed width (horizontal scroll). Feed = stretch to the parent
        // (list cell / column) so the width is always definite and the image's
        // aspectRatio can resolve a finite height — full width but not full screen.
        ...(carousel ? { width: 260 } : { alignSelf: "stretch" }),
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        opacity: pressed ? 0.95 : 1,
      })}
    >
      {/* Image */}
      <View style={{ width: "100%", aspectRatio: carousel ? 4 / 3 : 16 / 10, backgroundColor: colors.bg }}>
        <Image source={{ uri: listing.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />

        {/* PREMIUM badge */}
        {listing.premium && (
          <LinearGradient
            colors={brand.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              {t("home.premium").toUpperCase()}
            </Text>
          </LinearGradient>
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
            backgroundColor: heartBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={favorited ? "heart" : "heart-outline"}
            size={18}
            color={favorited ? brand.magenta : colors.text}
          />
        </Pressable>

        {/* Price */}
        <View
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            backgroundColor: glassBg,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: colors.text, fontSize: carousel ? 16 : 18, fontWeight: "800" }}>
            {formatPrice(listing.priceAzn)}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: carousel ? 12 : 16, gap: carousel ? 4 : 8 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: carousel ? 15 : 17, fontWeight: carousel ? "600" : "700" }}>
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

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginTop: carousel ? 0 : 4,
            paddingTop: carousel ? 0 : 10,
            borderTopWidth: carousel ? 0 : 1,
            borderTopColor: colors.border,
          }}
        >
          <Spec icon="resize-outline" text={`${listing.areaM2} m²`} color={colors.textSecondary} />
          <Spec icon="bed-outline" text={`${listing.rooms} ${t("home.roomsUnit")}`} color={colors.textSecondary} />
          {!carousel && listing.floor != null && listing.floorTotal != null && (
            <Spec
              icon="layers-outline"
              text={`${listing.floor}/${listing.floorTotal} ${t("home.floorUnit")}`}
              color={colors.textSecondary}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Spec({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ color, fontSize: 13, fontWeight: "500" }}>{text}</Text>
    </View>
  );
}
