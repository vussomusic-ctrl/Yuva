import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { usePressScale } from "../../lib/animations";
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
          numColumns={3}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingVertical: 16, gap: 10, flexGrow: 1 }}
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
  const press = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ flex: 1, maxWidth: "31%" }}>
      <Animated.View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            alignItems: "center",
            gap: 8,
          },
          press.style,
        ]}
      >
        {agency.logoUrl ? (
          <Image
            source={{ uri: agency.logoUrl }}
            style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.bg }}
          />
        ) : (
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: brand.violet,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>
              {agency.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
          {agency.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
