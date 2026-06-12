import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { BrandGlow } from "../components/BrandGlow";
import { get, ONBOARDING_SEEN } from "../lib/storage";

const LANGUAGES = [
  { code: "az", label: "Azərbaycan" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
] as const;

export default function SplashScreen() {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const active = pending ?? i18n.language;

  // Preload the onboarding flag on mount so the tap handler routes instantly
  // (defaults to "not seen" → first-run guests get onboarding).
  const seen = useRef(false);
  useEffect(() => {
    get(ONBOARDING_SEEN).then((v) => {
      seen.current = v === "1";
    });
  }, []);

  const onSelect = (code: string) => {
    setPending(code);
    i18n.changeLanguage(code);
    // Let the highlight register, then go to onboarding (first run) or welcome.
    setTimeout(() => router.replace(seen.current ? "/welcome" : "/onboarding"), 240);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, overflow: "hidden" }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 480,
          alignSelf: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          gap: 32,
        }}
      >
        {/* Logo + brand wordmark */}
        <View style={{ alignSelf: "center", alignItems: "center", gap: 16, maxWidth: 360 }}>
          <View
            style={{
              width: 240,
              height: 240,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrandGlow size={340} />
            <Image
              source={require("../assets/yuva-logo.png")}
              resizeMode="contain"
              style={{ width: 196, height: 196 }}
            />
          </View>
          <Text
            style={{
              fontSize: 44,
              fontWeight: "900",
              letterSpacing: -1,
              color: colors.brandTitle,
            }}
          >
            Yuva
          </Text>
          <Text
            style={{
              fontSize: 17,
              textAlign: "center",
              maxWidth: 250,
              color: colors.textSecondary,
            }}
          >
            {t("splash.subtitle")}
          </Text>
        </View>

        {/* Language selection card */}
        <View
          style={{
            alignSelf: "stretch",
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 24,
            gap: 14,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: mode === "dark" ? 0.4 : 0.1,
            shadowRadius: 24,
            elevation: 6,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 4,
              color: colors.text,
            }}
          >
            {t("splash.selectLanguage")}
          </Text>

          {LANGUAGES.map((lang) => (
            <LanguageButton
              key={lang.code}
              label={lang.label}
              selected={active === lang.code}
              onPress={() => onSelect(lang.code)}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function LanguageButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  // Selected = PRIMARY (brand gradient, white text).
  if (selected) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
        <LinearGradient
          colors={[brand.violet, brand.magenta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 16,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: brand.violet,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>{label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    );
  }

  // Unselected = SECONDARY (outlined, brand-violet border + text).
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: brand.violet,
        backgroundColor: "transparent",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: brand.violet, fontSize: 17, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
