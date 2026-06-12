// Shared async-state UI for list/detail screens: a centered spinner while
// loading and an error illustration with a Retry button (via EmptyState).

import { View, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { brand, Theme } from "../lib/theme/colors";
import { EmptyState } from "./EmptyState";

export function LoadingState({ colors }: { colors: Theme }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <ActivityIndicator size="large" color={brand.violet} />
    </View>
  );
}

// Signature unchanged (colors kept for the 13 call sites). colors now come from
// the theme inside EmptyState, so the param is no longer read here.
export function ErrorState({ colors, onRetry }: { colors: Theme; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      image={require("../assets/icons/empty/error-state.png")}
      title={t("common.loadError")}
      cta={{ label: t("common.retry"), onPress: onRetry }}
    />
  );
}
