import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Listing, formatPrice, isPromoActive } from "../lib/mock/listings";
import { buildListingTitle } from "../lib/listingTitle";
import { placeById, placeName } from "../lib/places";

type Lang = "az" | "ru" | "en";

const VIP_RED = "#E5322D";
const PREMIUM_GOLD = "#E0A526";

// Status → dot/text colour + i18n key.
const STATUS_COLOR: Record<string, string> = {
  active: "#3DB06B",
  moderation: brand.orange,
  sold: brand.blue,
  archived: "#9AA0A6",
};
const STATUS_KEY: Record<string, string> = {
  active: "myListings.statusActive",
  moderation: "myListings.statusModeration",
  sold: "myListings.statusSold",
  archived: "myListings.statusArchived",
};

// ISO → "14.08" (no date-fns in the project; a tiny local formatter).
const shortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type Props = {
  listing: Listing;
  colors: { text: string; textSecondary: string; card: string; border: string; bg: string };
  lang: Lang;
  onPress: () => void;
  onMenu: () => void;
};

/**
 * Compact owner row for "Мои объявления": photo left (100×100), price / title /
 * location + status badge in the middle, a "⋯" menu button on the right. No
 * action buttons inline (they live in the actions sheet). Views are not shown —
 * the count isn't surfaced to the app yet.
 */
export function OwnerListingRow({ listing, colors, lang, onPress, onMenu }: Props) {
  const { t } = useTranslation();
  const place = placeById(listing.placeId);
  const regionName = place ? placeName(place, lang) : listing.district;
  const station = listing.metroId ? placeById(listing.metroId) : undefined;
  const stationName = station ? placeName(station, lang) : null;
  const promoted = isPromoActive(listing);
  const tier = promoted ? listing.promoTier : "none";
  const status = listing.status ?? "active";
  const statusColor = STATUS_COLOR[status] ?? colors.textSecondary;

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, flexDirection: "row", opacity: pressed ? 0.7 : 1 })}>
        {/* Photo — left, square */}
        <View style={{ width: 100, height: 100, backgroundColor: colors.bg }}>
          <Image source={{ uri: listing.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          {tier === "premium" ? (
            <View style={[pill, { backgroundColor: PREMIUM_GOLD }]}>
              <Image source={require("../assets/icons/promo/clay-crown.png")} resizeMode="contain" style={{ width: 12, height: 10 }} />
              <Text style={badgeText}>{t("home.badgePremium")}</Text>
            </View>
          ) : tier === "vip" ? (
            <View style={[pill, { backgroundColor: VIP_RED }]}>
              <Image source={require("../assets/icons/promo/clay-star.png")} resizeMode="contain" style={{ width: 11, height: 11 }} />
              <Text style={badgeText}>{t("home.badgeVip")}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center", gap: 3 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 16 }}>
            {formatPrice(listing.priceAzn)}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.medium, fontSize: 13 }}>
            {buildListingTitle(listing, t, lang, { withMetro: false, withRegion: false })}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>
            {stationName ? `${regionName} · ${stationName}` : regionName}
          </Text>
          {/* Status badge (+ promoted expiry) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
            <Text style={{ color: statusColor, fontFamily: font.semibold, fontSize: 12 }}>
              {t(STATUS_KEY[status] ?? STATUS_KEY.active)}
            </Text>
            {promoted && listing.promotedUntil ? (
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 11 }}>
                {`· ${t("myListings.promoUntil", { date: shortDate(listing.promotedUntil) })}`}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* ⋯ actions menu */}
      <Pressable
        onPress={onMenu}
        hitSlop={8}
        accessibilityLabel={t("myListings.actionsTitle")}
        style={({ pressed }) => ({ paddingHorizontal: 12, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const pill = {
  position: "absolute",
  top: 6,
  left: 6,
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 6,
} as const;

const badgeText = { color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 9, letterSpacing: 0.3 } as const;
