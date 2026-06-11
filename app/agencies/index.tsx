import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { Header } from "../my-listings";
import { LoadingState, ErrorState } from "../../components/ListState";
import { fetchPartnerAgencies } from "../../lib/api/agencies";
import { Agency } from "../../lib/adapters/agency";

export default function AgenciesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [list, setList] = useState<Agency[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetchPartnerAgencies()
      .then(setList)
      .catch(() => setError(true));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = list === null && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("agencies.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
      />

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <FlatList
          data={list ?? []}
          keyExtractor={(a) => a.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 16, gap: 12, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
              <Ionicons name="business-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                {t("agencies.empty")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <AgencyCard colors={colors} agency={item} onPress={() => router.push(`/agencies/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AgencyCard({ colors, agency, onPress }: { colors: Theme; agency: Agency; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        maxWidth: "48%", // keeps a lone last card from stretching full-width
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        alignItems: "center",
        gap: 10,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {agency.logoUrl ? (
        <Image
          source={{ uri: agency.logoUrl }}
          style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: colors.bg }}
        />
      ) : (
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            backgroundColor: brand.violet,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "800" }}>
            {agency.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text numberOfLines={2} style={{ color: colors.text, fontSize: 14, fontWeight: "700", textAlign: "center" }}>
        {agency.name}
      </Text>
    </Pressable>
  );
}
