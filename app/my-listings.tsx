import { View, Text, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { Theme } from "../lib/theme/colors";
import { PropertyCard } from "../components/PropertyCard";
import { useFavorites } from "../lib/favorites";
import { getListingsByOwner } from "../lib/mock/listings";
import { currentUser } from "../lib/mock/user";

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();

  const myListings = getListingsByOwner(currentUser.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("myListings.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
      />

      <FlatList
        data={myListings}
        keyExtractor={(l) => l.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={
          <EmptyState
            colors={colors}
            icon="pricetags-outline"
            title={t("myListings.emptyTitle")}
            desc={t("myListings.emptyDesc")}
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            listing={item}
            variant="feed"
            favorited={isFavorite(item.id)}
            onToggleFavorite={() => toggle(item.id)}
            onPress={() => router.push(`/property/${item.id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

export function Header({ colors, title, onBack }: { colors: Theme; title: string; onBack: () => void }) {
  return (
    <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
      <Pressable onPress={onBack} hitSlop={10} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}

export function EmptyState({
  colors,
  icon,
  title,
  desc,
}: {
  colors: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
      <Ionicons name={icon} size={48} color={colors.textSecondary} />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>{desc}</Text>
    </View>
  );
}
