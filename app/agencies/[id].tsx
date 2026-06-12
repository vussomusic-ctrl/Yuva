import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { Header } from "../my-listings";
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <Header
        colors={colors}
        title={agency?.name ?? t("agencies.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/agencies"))}
      />

      {loading ? (
        <LoadingState colors={colors} />
      ) : error || !agency ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Agency header: logo + name + contacts (only filled ones) */}
          <View style={{ alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 }}>
            {agency.logoUrl ? (
              <Image
                source={{ uri: agency.logoUrl }}
                style={{ width: 96, height: 96, borderRadius: 20, backgroundColor: colors.card }}
              />
            ) : (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  backgroundColor: brand.violet,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 40 }}>
                  {agency.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 22, textAlign: "center" }}>
              {agency.name}
            </Text>
            {(agency.phone || agency.email || agency.website) && (
              <View style={{ flexDirection: "row", gap: 10 }}>
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
    </SafeAreaView>
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
