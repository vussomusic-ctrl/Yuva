import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./Button";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { usePressShrink } from "../lib/animations";
import { AMENITY_GROUPS } from "../lib/amenities";

// Matches SOFT_BORDER in app/filters.tsx (chip border on light bg).
const SOFT_BORDER = "rgba(0,0,0,0.10)";

type Props = {
  visible: boolean;
  onClose: () => void;
  selected: string[]; // amenity keys currently applied
  onApply: (keys: string[]) => void;
};

export function AmenitiesFilterSheet({ visible, onClose, selected, onApply }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  const [draft, setDraft] = useState<string[]>(selected);

  // Re-seed the draft each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (key: string) =>
    setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));

  const reset = () => setDraft([]);
  const apply = () => {
    onApply(draft);
    onClose();
  };

  const count = draft.length;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ height: height * 0.72 }}>
        {/* Header — X closes (cancel), centered title */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
          <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", marginRight: 34, color: colors.text, fontFamily: font.bold, fontSize: 17 }}>
            {t("filters.amenities")}
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {AMENITY_GROUPS.map((g) => (
            <View key={g.titleKey} style={{ marginBottom: 8 }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: font.bold,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  paddingTop: 16,
                  paddingBottom: 10,
                }}
              >
                {t(g.titleKey)}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {g.items.map((it) => (
                  <AmenityChip
                    key={it.key}
                    label={t(it.labelKey)}
                    active={draft.includes(it.key)}
                    onPress={() => toggle(it.key)}
                    textColor={colors.text}
                    cardColor={colors.card}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer: reset + apply(N) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable onPress={reset} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 15 }}>{t("location.reset")}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={`${t("location.done")}${count > 0 ? ` (${count})` : ""}`} onPress={apply} />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

// Minimal duplicate of FilterChip (app/filters.tsx) — that one is a local,
// unexported function. Same pill styling + press-shrink so the two visually match.
function AmenityChip({
  label,
  active,
  onPress,
  textColor,
  cardColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  textColor: string;
  cardColor: string;
}) {
  const press = usePressShrink(0.96);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 11,
            backgroundColor: active ? brand.violet : cardColor,
            borderWidth: 1,
            borderColor: active ? brand.violet : SOFT_BORDER,
          },
          press.style,
        ]}
      >
        <Text style={{ color: active ? "#FFFFFF" : textColor, fontFamily: font.medium, fontSize: 14 }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
