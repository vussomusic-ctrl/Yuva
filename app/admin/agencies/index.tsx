import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../../lib/theme/ThemeContext";
import { brand, Theme } from "../../../lib/theme/colors";
import { font } from "../../../lib/theme/typography";
import { Header } from "../../my-listings";
import { LoadingState, ErrorState } from "../../../components/ListState";
import { EmptyState } from "../../../components/EmptyState";
import { fetchAllAgencies, createAgency } from "../../../lib/api/admin";
import { Agency } from "../../../lib/adapters/agency";

export default function AdminAgenciesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [list, setList] = useState<Agency[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetchAllAgencies()
      .then(setList)
      .catch(() => setError(true));
  }, []);
  // Refetch on focus so edits made in the [id] editor show on return.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = list === null && !error;

  // Alert.prompt is iOS-only — fine here (admin is a single iOS user).
  const onCreate = () => {
    Alert.prompt(
      t("admin.newAgency"),
      t("admin.namePrompt"),
      (name) => {
        const trimmed = (name ?? "").trim();
        if (!trimmed) return;
        createAgency(trimmed)
          .then((a) => router.push(`/admin/agencies/${a.id}`))
          .catch(() => Alert.alert(t("admin.errCreate")));
      },
      "plain-text",
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <Header
        colors={colors}
        title={t("settings.manageAgencies")}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ListHeaderComponent={
            <Pressable
              onPress={onCreate}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: brand.violet,
                marginBottom: 6,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="add" size={20} color={brand.violet} />
              <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 15 }}>{t("admin.create")}</Text>
            </Pressable>
          }
          ListEmptyComponent={
            <EmptyState
              image={require("../../../assets/icons/empty/empty-admin.png")}
              title={t("admin.emptyTitle")}
              subtitle={t("admin.empty")}
            />
          }
          renderItem={({ item }) => (
            <AgencyRow colors={colors} agency={item} t={t} onPress={() => router.push(`/admin/agencies/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AgencyRow({
  colors,
  agency,
  t,
  onPress,
}: {
  colors: Theme;
  agency: Agency;
  t: (k: string) => string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {agency.logoUrl ? (
        <Image source={{ uri: agency.logoUrl }} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bg }} />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 20 }}>
            {agency.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 16 }}>
        {agency.name}
      </Text>
      {agency.isPartner && (
        <View style={{ backgroundColor: "rgba(139,63,214,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 11 }}>{t("admin.partner")}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}
