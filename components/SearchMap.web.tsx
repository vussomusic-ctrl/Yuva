import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { Listing } from "../lib/mock/listings";

type Props = {
  listings: Listing[];
  onOpen: (id: string) => void;
};

/**
 * Search — Map (web fallback). react-native-maps is a native module and does not
 * run on web, so the browser shows a themed placeholder instead of crashing.
 * The list view remains fully functional on web.
 */
export function SearchMap(_props: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
      <Ionicons name="map-outline" size={48} color={colors.textSecondary} />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{t("search.viewMap")}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
        {t("search.mapSoon")}
      </Text>
    </View>
  );
}
