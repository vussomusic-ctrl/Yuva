import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";

// Derive the prop type from expo-router's Tabs (v56 vendors its own bottom-tabs).
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

type TabMeta = {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

const TAB_META: Record<string, TabMeta> = {
  home: { icon: "home-outline", activeIcon: "home", labelKey: "tabs.home" },
  search: { icon: "search-outline", activeIcon: "search", labelKey: "tabs.search" },
  chat: { icon: "chatbubble-outline", activeIcon: "chatbubble", labelKey: "tabs.chat" },
  profile: { icon: "person-outline", activeIcon: "person", labelKey: "tabs.profile" },
};

export function BottomTabBar({ state, navigation }: TabBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 10,
        paddingBottom: insets.bottom + 8,
        paddingHorizontal: 8,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        // Center Add — a raised gradient action that opens Add Listing as a modal.
        if (route.name === "add") {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={t("tabs.add")}
              onPress={() => router.push("/add-listing")}
              style={{ flex: 1, alignItems: "center" }}
            >
              <LinearGradient
                colors={brand.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -26,
                  shadowColor: brand.violet,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Ionicons name="add" size={30} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          );
        }

        const meta = TAB_META[route.name];
        if (!meta) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const tint = isFocused ? brand.violet : colors.tabInactive;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={t(meta.labelKey)}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}
          >
            <Ionicons name={isFocused ? meta.activeIcon : meta.icon} size={24} color={tint} />
            <Text style={{ fontSize: 11, fontWeight: "600", color: tint }}>{t(meta.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
