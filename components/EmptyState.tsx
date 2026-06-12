import { Text, Image, Pressable, ImageSourcePropType } from "react-native";
import Animated from "react-native-reanimated";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useMountFadeScale } from "../lib/animations";

type Props = {
  // Optional so the same component can render text-only (e.g. a place with no
  // illustration yet). When present, a clay illustration sits on top.
  image?: ImageSourcePropType;
  title?: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void };
};

/** Shared empty / error state: clay illustration + title + subtitle + optional
 *  CTA, fading/scaling in on mount. Colors from theme, fonts via font.* only. */
export function EmptyState({ image, title, subtitle, cta }: Props) {
  const { colors } = useTheme();
  const enter = useMountFadeScale();

  return (
    <Animated.View
      style={[{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }, enter]}
    >
      {image ? <Image source={image} resizeMode="contain" style={{ width: 180, height: 180 }} /> : null}

      {title ? (
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.text, textAlign: "center" }}>
          {title}
        </Text>
      ) : null}

      {subtitle ? (
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {cta ? (
        <Pressable
          onPress={cta.onPress}
          style={({ pressed }) => ({
            marginTop: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: brand.violet,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 15 }}>{cta.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
