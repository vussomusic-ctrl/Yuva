import { View, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { PrimaryButton } from "../components/Button";

// Web fallback: react-native-maps is native-only. Show a themed placeholder with
// the same "Route" action (Linking opens Google Maps directions in a tab).
export default function PropertyMapWeb() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; district?: string }>();

  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const district = params.district ?? "";

  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));
  const route = () =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <View style={{ height: 56, justifyContent: "center" }}>
        <Text
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          {t("propertyDetail.locationTitle")}
        </Text>
        <Pressable onPress={close} hitSlop={10} style={({ pressed }) => ({ paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
        <Ionicons name="location" size={48} color={brand.magenta} />
        {district !== "" && (
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", textAlign: "center" }}>
            {district}
          </Text>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <PrimaryButton label={t("propertyDetail.route")} onPress={route} />
      </View>
    </SafeAreaView>
  );
}
