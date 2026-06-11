import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { usePressScale, useMountFadeScale } from "../lib/animations";

// Brand diagonal — vibrant in both themes (per brand rules), never recolored.
const WELCOME_GRADIENT = ["#8B3FD6", "#EC2D8E", "#F5921E"] as const;

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const logoStyle = useMountFadeScale();

  return (
    <LinearGradient colors={WELCOME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 28 }}>
          {/* Logo + tagline — transparent logo straight on the gradient (no plate) */}
          <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }, logoStyle]}>
            <Image source={require("../assets/yuva-logo-white.png")} resizeMode="contain" style={{ width: 240, height: 130 }} />
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 16,
                lineHeight: 24,
                textAlign: "center",
                letterSpacing: 0.3,
                maxWidth: 300,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {t("welcome.subtitle")}
            </Text>
          </Animated.View>

          {/* Actions — straight on the gradient, no card */}
          <View style={{ gap: 12, paddingBottom: 8 }}>
            <WelcomeButton variant="primary" label={t("welcome.createAccount")} onPress={() => router.push("/create-account")} />
            <WelcomeButton variant="outline" label={t("welcome.login")} onPress={() => router.push("/login")} />
            <Pressable
              onPress={() => router.replace("/home")}
              style={({ pressed }) => ({ paddingVertical: 10, alignItems: "center", opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#FFFFFF" }}>{t("welcome.guest")}</Text>
            </Pressable>
          </View>

          {/* Legal */}
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 11,
              lineHeight: 16,
              textAlign: "center",
              maxWidth: 320,
              alignSelf: "center",
              marginBottom: 12,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {t("welcome.legalPre")}
            <Text style={{ color: "#FFFFFF", textDecorationLine: "underline" }}>{t("welcome.terms")}</Text>
            {t("welcome.legalAnd")}
            <Text style={{ color: "#FFFFFF", textDecorationLine: "underline" }}>{t("welcome.privacy")}</Text>
            {t("welcome.legalEnd")}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function WelcomeButton({
  variant,
  label,
  onPress,
}: {
  variant: "primary" | "outline";
  label: string;
  onPress: () => void;
}) {
  const press = usePressScale();
  const primary = variant === "primary";
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            paddingVertical: 16,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: primary ? "#FFFFFF" : "transparent",
            borderWidth: primary ? 0 : 1.5,
            borderColor: "rgba(255,255,255,0.9)",
          },
          press.style,
        ]}
      >
        <Text style={{ fontFamily: font.bold, fontSize: 17, color: primary ? brand.violet : "#FFFFFF" }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
