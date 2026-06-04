import { Tabs } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../lib/theme/ThemeContext";
import { brand } from "../../lib/theme/colors";

function AddTabIcon({ focused }: { focused: boolean }) {
  return (
    <LinearGradient
      colors={[brand.violet, brand.magenta]}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        opacity: focused ? 1 : 0.85,
      }}
    >
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </LinearGradient>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.violet,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 85,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("tabs.search"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => <AddTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chat"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
