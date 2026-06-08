import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { SecondaryButton } from "../components/Button";

/**
 * Map Picker — web fallback. react-native-maps is a native module and crashes on
 * web, so the browser shows a themed placeholder. No coordinate is picked here;
 * Add Listing falls back to `coordsForPlace(placeId)` on web.
 */
export default function MapPickerWeb() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const back = () => (router.canGoBack() ? router.back() : router.replace("/add-listing"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <View style={{ height: 56, justifyContent: "center", paddingHorizontal: 16 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{t("mapPicker.title")}</Text>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
        <Ionicons name="map-outline" size={48} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: "center" }}>
          {t("mapPicker.webOnly")}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <SecondaryButton label={t("addListing.back")} onPress={back} />
      </View>
    </SafeAreaView>
  );
}
