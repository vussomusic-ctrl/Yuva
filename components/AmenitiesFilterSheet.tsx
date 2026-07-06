import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./Button";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { FilterChip, ChipWrap } from "./FilterChip";
import { AMENITY_GROUPS } from "../lib/amenities";

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
              <ChipWrap>
                {g.items.map((it) => (
                  <FilterChip
                    key={it.key}
                    label={t(it.labelKey)}
                    active={draft.includes(it.key)}
                    onPress={() => toggle(it.key)}
                    colors={colors}
                  />
                ))}
              </ChipWrap>
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
