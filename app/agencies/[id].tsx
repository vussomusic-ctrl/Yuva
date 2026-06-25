import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { LoadingState, ErrorState } from "../../components/ListState";
import { PropertyCard } from "../../components/PropertyCard";
import { useFavorites } from "../../lib/favorites";
import {
  fetchAgencyById,
  fetchAgencyAgents,
  fetchAgencyListings,
  AgencyAgent,
} from "../../lib/api/agencies";
import { Agency } from "../../lib/adapters/agency";
import { Listing } from "../../lib/mock/listings";

// Website links may omit the scheme — Linking needs one.
const normalizeUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default function AgencyDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const [agency, setAgency] = useState<Agency | null>(null);
  const [agents, setAgents] = useState<AgencyAgent[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setError(false);
    setLoaded(false);
    Promise.all([fetchAgencyById(id), fetchAgencyAgents(id), fetchAgencyListings(id)])
      .then(([a, ag, ls]) => {
        setAgency(a);
        setAgents(ag);
        setListings(ls);
        setLoaded(true);
      })
      .catch(() => setError(true));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = !loaded && !error;

  const onBack = () => (router.canGoBack() ? router.back() : router.replace("/agencies"));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />

      {loading ? (
        <LoadingState colors={colors} />
      ) : error || !agency ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* FB-style cover — full width, bleeds under the status bar */}
          {agency.coverUrl ? (
            <Image source={{ uri: agency.coverUrl }} style={{ width: "100%", height: 180, backgroundColor: colors.card }} resizeMode="cover" />
          ) : (
            <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "100%", height: 180 }} />
          )}

          {/* Logo overlapping the cover bottom-left + name + contacts (left-aligned) */}
          <View style={{ paddingHorizontal: 16 }}>
            {agency.logoUrl ? (
              <Image
                source={{ uri: agency.logoUrl }}
                style={{ width: 88, height: 88, borderRadius: 20, marginTop: -44, borderWidth: 3, borderColor: colors.bg, backgroundColor: colors.card }}
              />
            ) : (
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 20,
                  marginTop: -44,
                  borderWidth: 3,
                  borderColor: colors.bg,
                  backgroundColor: brand.violet,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 36 }}>
                  {agency.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 22, marginTop: 12 }}>
              {agency.name}
            </Text>

            {(agency.phone || agency.email || agency.website) && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                {agency.phone && (
                  <ContactButton icon="call" onPress={() => Linking.openURL(`tel:${agency.phone}`).catch(() => {})} />
                )}
                {agency.email && (
                  <ContactButton icon="mail" onPress={() => Linking.openURL(`mailto:${agency.email}`).catch(() => {})} />
                )}
                {agency.website && (
                  <ContactButton
                    icon="globe-outline"
                    onPress={() => Linking.openURL(normalizeUrl(agency.website!)).catch(() => {})}
                  />
                )}
              </View>
            )}
          </View>

          {/* About — only when filled */}
          {agency.description ? (
            <View style={{ marginTop: 16 }}>
              <SectionTitle colors={colors} text={t("agencies.about")} />
              <Text style={{ color: colors.text, fontFamily: font.regular, fontSize: 14, lineHeight: 21, paddingHorizontal: 16 }}>
                {agency.description}
              </Text>
            </View>
          ) : null}

          {/* Agents */}
          {agents.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <SectionTitle colors={colors} text={t("agencies.agents")} />
              <View style={{ paddingHorizontal: 16, gap: 14 }}>
                {agents.map((ag) => (
                  <View key={ag.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {ag.avatarUrl ? (
                      <Image
                        source={{ uri: ag.avatarUrl }}
                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: brand.violet,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="person" size={22} color="#FFFFFF" />
                      </View>
                    )}
                    <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: font.semibold, fontSize: 15 }}>
                      {ag.fullName ?? ""}
                    </Text>
                    {ag.verified && <Ionicons name="shield-checkmark" size={16} color={brand.blue} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Listings — reuse the Home/Search card */}
          {listings.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <SectionTitle colors={colors} text={t("agencies.listings")} />
              <View style={{ paddingHorizontal: 16, gap: 16 }}>
                {listings.map((l) => (
                  <PropertyCard
                    key={l.id}
                    listing={l}
                    variant="feed"
                    favorited={isFavorite(l.id)}
                    onToggleFavorite={() => toggleFavorite(l.id)}
                    onPress={() => router.push(`/property/${l.id}`)}
                  />
                ))}
              </View>
            </View>
          )}

          {agents.length === 0 && listings.length === 0 && (
            <View style={{ alignItems: "center", padding: 32 }}>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, textAlign: "center" }}>
                {t("agencies.emptyAgency")}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Back — overlay on the cover, always visible */}
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => ({ position: "absolute", top: insets.top + 6, left: 12, opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

function ContactButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: brand.violet,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={brand.violet} />
    </Pressable>
  );
}

function SectionTitle({ colors, text }: { colors: Theme; text: string }) {
  return (
    <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 18, marginHorizontal: 16, marginBottom: 12 }}>
      {text}
    </Text>
  );
}
