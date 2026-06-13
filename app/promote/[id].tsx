import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { Segmented } from "../../components/Segmented";
import { PrimaryButton } from "../../components/Button";
import { LoadingState, ErrorState } from "../../components/ListState";
import { usePressScale } from "../../lib/animations";
import { ListingDetail, formatPrice } from "../../lib/mock/listings";
import { fetchListingDetail } from "../../lib/api/listings";
import { buildListingTitle } from "../../lib/listingTitle";
import { useLanguage } from "../../lib/i18n/languages";
import { activatePromo, PromoChoice, PROMO_PRICING } from "../../lib/api/promo";

type Tier = "boost" | "vip" | "premium";

const VIP_RED = "#E5322D";
const PREMIUM_GOLD = "#E0A526";

const TIERS: { tier: Tier; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { tier: "premium", icon: "star", color: PREMIUM_GOLD },
  { tier: "vip", icon: "ribbon", color: VIP_RED },
  { tier: "boost", icon: "arrow-up", color: brand.blue },
];

// Mid-ish default pack for a tier.
const midPack = (tier: Tier) => Math.floor((PROMO_PRICING[tier].length - 1) / 2);

export default function PromoteScreen() {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [tier, setTier] = useState<Tier>("premium");
  const [pack, setPack] = useState<number>(midPack("premium"));
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setStatus("loading");
    fetchListingDetail(id)
      .then((l) => {
        setListing(l);
        setStatus(l ? "ok" : "error");
      })
      .catch(() => setStatus("error"));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const selectTier = (next: Tier) => {
    setTier(next);
    setPack(midPack(next));
  };

  const packs = PROMO_PRICING[tier];
  const current = packs[pack] ?? packs[0];
  const choice: PromoChoice =
    tier === "boost" ? { tier: "boost", bumps: (current as { n: number }).n } : { tier, days: (current as { days: number }).days };

  const packLabel = (p: (typeof packs)[number]) =>
    tier === "boost"
      ? t("promote.packBumps", { count: (p as { n: number }).n })
      : t("promote.packDays", { count: (p as { days: number }).days });

  const onActivate = async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      await activatePromo(id, choice);
      router.back();
      Alert.alert(t("promote.done"));
    } catch {
      Alert.alert(t("common.loadError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", marginRight: 34, color: colors.text, fontFamily: font.bold, fontSize: 18 }}>
          {t("promote.title")}
        </Text>
      </View>

      {status === "loading" ? (
        <LoadingState colors={colors} />
      ) : status === "error" || !listing ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>
              {t("promote.subtitle")}
            </Text>

            {/* Mini preview */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              {listing.image ? (
                <Image source={{ uri: listing.image }} style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.border }} />
              ) : (
                <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.semibold, fontSize: 14 }}>
                  {buildListingTitle(listing, t, lang)}
                </Text>
                <Text style={{ color: brand.violet, fontFamily: font.extrabold, fontSize: 15, marginTop: 2 }}>
                  {formatPrice(listing.priceAzn)}
                </Text>
              </View>
            </View>

            {/* Tier cards */}
            <View style={{ gap: 10 }}>
              {TIERS.map((tc) => (
                <TierCard
                  key={tc.tier}
                  tier={tc.tier}
                  icon={tc.icon}
                  color={tc.color}
                  title={t(`promote.tier${cap(tc.tier)}`)}
                  desc={t(`promote.tier${cap(tc.tier)}Desc`)}
                  selected={tier === tc.tier}
                  colors={colors}
                  onPress={() => selectTier(tc.tier)}
                />
              ))}
            </View>

            {/* Pack selector for the chosen tier */}
            <Segmented
              options={packs.map((p, i) => ({ key: String(i), label: packLabel(p) }))}
              value={String(pack)}
              onChange={(k) => setPack(Number(k))}
            />

            {/* Price */}
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
              <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 28 }}>
                {`${current.price} ₼`}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 16, textDecorationLine: "line-through" }}>
                {`${current.oldPrice} ₼`}
              </Text>
            </View>
          </ScrollView>

          {/* Activate */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <PrimaryButton label={t("promote.activate", { price: current.price })} onPress={onActivate} disabled={loading} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function TierCard({
  icon,
  color,
  title,
  desc,
  selected,
  colors,
  onPress,
}: {
  tier: Tier;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  desc: string;
  selected: boolean;
  colors: { text: string; textSecondary: string; border: string; card: string };
  onPress: () => void;
}) {
  const press = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: selected ? brand.violet : colors.border,
            backgroundColor: selected ? "rgba(139,63,214,0.06)" : colors.card,
          },
          press.style,
        ]}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: color }}>
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 2 }}>{desc}</Text>
        </View>
        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={22}
          color={selected ? brand.violet : colors.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
}
