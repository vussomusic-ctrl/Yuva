// Shared async-state UI for list/detail screens: a centered spinner while
// loading and an error message with a Retry button. Empty states stay per
// screen (they reuse EmptyState from my-listings).

import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { brand, Theme } from "../lib/theme/colors";

export function LoadingState({ colors }: { colors: Theme }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <ActivityIndicator size="large" color={brand.violet} />
    </View>
  );
}

export function ErrorState({ colors, onRetry }: { colors: Theme; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" }}>
        {t("common.loadError")}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: brand.violet,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="refresh" size={18} color={brand.violet} />
        <Text style={{ color: brand.violet, fontSize: 15, fontWeight: "700" }}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}
