import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BottomSheet } from "./BottomSheet";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { Place, placeName } from "../lib/places";

type Lang = "az" | "ru" | "en";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  searchPlaceholder: string;
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  lang: Lang;
  allowClear?: boolean;
  clearLabel?: string;
};

/**
 * Single-select place picker (search + list) used by Add Listing for region and
 * metro. Search matches across az/ru/en so it works in any keyboard layout.
 * (The Search filters screen uses MULTI-select chips — a different mode.)
 */
export function PlacePickerSheet({
  visible,
  onClose,
  title,
  searchPlaceholder,
  places,
  selectedId,
  onSelect,
  lang,
  allowClear,
  clearLabel,
}: Props) {
  const { colors } = useTheme();
  const [q, setQ] = useState("");

  // Reset the query each time the sheet is dismissed.
  useEffect(() => {
    if (!visible) setQ("");
  }, [visible]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return places;
    return places.filter((p) => `${p.az} ${p.ru} ${p.en}`.toLowerCase().includes(query));
  }, [q, places]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text
        style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center", paddingTop: 6, paddingBottom: 10 }}
      >
        {title}
      </Text>

      {/* Search */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginHorizontal: 16,
          marginBottom: 8,
          height: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bg,
          paddingHorizontal: 12,
        }}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          style={{ flex: 1, color: colors.text, fontSize: 15 }}
        />
        {q.length > 0 && (
          <Pressable onPress={() => setQ("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        style={{ maxHeight: 380 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          allowClear ? (
            <Row
              label={clearLabel ?? "—"}
              active={selectedId == null}
              muted
              colors={colors}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Row
            label={placeName(item, lang)}
            active={item.id === selectedId}
            colors={colors}
            onPress={() => {
              onSelect(item.id);
              onClose();
            }}
          />
        )}
      />
    </BottomSheet>
  );
}

function Row({
  label,
  active,
  muted,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  muted?: boolean;
  colors: { text: string; textSecondary: string; border: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: active ? brand.violet : muted ? colors.textSecondary : colors.text,
          fontSize: 16,
          fontWeight: active ? "700" : "500",
        }}
      >
        {label}
      </Text>
      {active && <Ionicons name="checkmark-circle" size={22} color={brand.violet} />}
    </Pressable>
  );
}
