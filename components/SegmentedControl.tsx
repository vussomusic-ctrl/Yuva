import { useEffect, useState } from "react";
import { View, Pressable, Text, LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useSpringSlide } from "../lib/animations";

export type SegmentItem = { key: string; labelKey: string };

type Props = {
  items: SegmentItem[];
  value: string;
  onChange: (key: string) => void;
};

/**
 * Generic animated segmented control: pastel capsule with a brand-gradient pill
 * that springs between segments (useSpringSlide). One style source for all
 * segments in the app. Full-width — the caller controls outer margin.
 */
export function SegmentedControl({ items, value, onChange }: Props) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();

  const activeIndex = Math.max(0, items.findIndex((i) => i.key === value));
  const slide = useSpringSlide(activeIndex);
  const [segW, setSegW] = useState(0);

  // Follow external value changes (e.g. filters reset).
  const { slideTo } = slide;
  useEffect(() => {
    slideTo(activeIndex);
  }, [activeIndex, slideTo]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = (e.nativeEvent.layout.width - 8) / items.length; // minus padding*2
    setSegW(w);
    slide.setSegmentWidth(w);
  };

  const track = mode === "dark" ? "#241E2E" : "#F1EDF7";

  return (
    <View
      onLayout={onLayout}
      style={{
        height: 44,
        borderRadius: 999,
        backgroundColor: track,
        padding: 4,
        flexDirection: "row",
      }}
    >
      {/* Sliding gradient pill */}
      {segW > 0 && (
        <Animated.View
          style={[
            { position: "absolute", left: 4, top: 4, bottom: 4, width: segW, borderRadius: 999 },
            slide.style,
          ]}
        >
          <LinearGradient
            colors={brand.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderRadius: 999 }}
          />
        </Animated.View>
      )}

      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: active ? "#FFFFFF" : colors.textSecondary,
                fontFamily: active ? font.bold : font.semibold,
                fontSize: 14,
              }}
            >
              {t(it.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
