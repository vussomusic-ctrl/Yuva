import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";

/**
 * Add Listing — modal stub. The full multi-step flow (photos → deal type →
 * property type → details → publish) comes later. Opened from the center tab.
 */
export default function AddListingModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Contextual header: title + close (no logo) */}
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          {t("addListing.title")}
        </Text>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
          hitSlop={12}
          style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
          Tezliklə / Скоро / Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
