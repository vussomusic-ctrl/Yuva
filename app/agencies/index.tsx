import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, FlatList, TextInput, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { usePressScale } from "../../lib/animations";
import { LoadingState, ErrorState } from "../../components/ListState";
import { EmptyState } from "../../components/EmptyState";
import { fetchPartnerAgencies } from "../../lib/api/agencies";
import { Agency } from "../../lib/adapters/agency";

export default function AgenciesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [list, setList] = useState<Agency[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = (list ?? []).filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  const load = useCallback(() => {
    setError(false);
    fetchPartnerAgencies()
      .then(setList)
      .catch(() => setError(true));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPartnerAgencies()
      .then((data) => {
        setList(data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setRefreshing(false));
  }, []);

  const loading = list === null && !error;
  const onBack = () => (router.canGoBack() ? router.back() : router.replace("/profile"));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />

      {/* Hero — single clay banner (key bird + houses) */}
      <View
        style={{
          height: 230,
          backgroundColor: "#8A3BB5",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: "hidden",
        }}
      >
        <Image source={require("../../assets/agencies/agencies-hero-v3.png")} style={{ position: "absolute", top: 0, left: 0, right: 0, width: "100%", height: 250, transform: [{ translateY: -20 }] }} resizeMode="cover" />

        <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          {/* Back */}
          <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Title + subtitle — bottom-left (banner keeps the right side clear for the bird) */}
          <View style={{ flex: 1, justifyContent: "flex-start", marginTop: 16, paddingRight: 120 }}>
            <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 28 }}>{t("agencies.title")}</Text>
            <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.92)", fontFamily: font.regular, fontSize: 14, lineHeight: 19, marginTop: 4 }}>
              {t("agencies.subtitle")}
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 4,
          height: 52,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("agencies.searchPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 15, padding: 0, letterSpacing: 0 }}
        />
      </View>

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 + insets.bottom, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.violet} colors={[brand.violet]} />}
          ListEmptyComponent={
            <EmptyState
              image={require("../../assets/icons/empty/empty-agencies.png")}
              title={t("agencies.emptyTitle")}
              subtitle={t("agencies.empty")}
            />
          }
          renderItem={({ item }) => (
            <AgencyCard colors={colors} agency={item} onPress={() => router.push(`/agencies/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

function AgencyCard({ colors, agency, onPress }: { colors: Theme; agency: Agency; onPress: () => void }) {
  const { t } = useTranslation();
  const press = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          },
          press.style,
        ]}
      >
        {/* Logo in a light plate so dark logos don't blend into a dark card */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 6,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          {agency.logoUrl ? (
            <Image source={{ uri: agency.logoUrl }} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#FFFFFF" }} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 26 }}>{agency.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Center */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>
            {agency.name}
          </Text>
          {agency.description ? (
            <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 3 }}>
              {agency.description}
            </Text>
          ) : null}
          {/* Active-listings count badge (always shown) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 5,
              marginTop: 7,
              backgroundColor: "rgba(139,63,214,0.12)",
              borderRadius: 8,
              paddingVertical: 4,
              paddingHorizontal: 10,
            }}
          >
            <Ionicons name="business" size={14} color={brand.violet} />
            <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 12 }}>
              {t("agencies.listingsCount", { count: agency.listingsCount })}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Animated.View>
    </Pressable>
  );
}
