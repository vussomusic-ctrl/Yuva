import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { BrandGlow } from "../components/BrandGlow";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();

  return (
    <LinearGradient colors={colors.bgGradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          <View style={{ flex: 1, justifyContent: "center", gap: 40 }}>
            {/* Logo + tagline — transparent logo on a soft brand glow, no plate */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 260,
                  height: 200,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BrandGlow size={360} />
                <Image
                  source={require("../assets/yuva-logo.png")}
                  resizeMode="contain"
                  style={{ width: 240, height: 130 }}
                />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  textAlign: "center",
                  letterSpacing: 0.3,
                  maxWidth: 300,
                  marginTop: 12,
                  color: colors.text,
                }}
              >
                {t("welcome.subtitle")}
              </Text>
            </View>

            {/* Action card */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 24,
                gap: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: mode === "dark" ? 0.4 : 0.08,
                shadowRadius: 24,
                elevation: 6,
              }}
            >
              {/* PRIMARY — brand gradient */}
              <Pressable
                onPress={() => router.push("/create-account")}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <LinearGradient
                  colors={brand.gradient}
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
                  <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
                    {t("welcome.createAccount")}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>

              {/* SECONDARY — outlined */}
              <Pressable
                onPress={() => {
                  // TODO: Login flow — stub for now.
                }}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: brand.violet,
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: brand.violet, fontSize: 17, fontWeight: "600" }}>
                  {t("welcome.login")}
                </Text>
              </Pressable>

              {/* Divider */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: colors.textSecondary,
                  }}
                >
                  {t("welcome.or")}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>

              {/* TERTIARY — text link */}
              <Pressable
                onPress={() => router.replace("/home")}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 4 })}
              >
                <Text
                  style={{
                    color: brand.violet,
                    fontSize: 15,
                    fontWeight: "600",
                    textAlign: "center",
                    textDecorationLine: "underline",
                  }}
                >
                  {t("welcome.guest")}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Legal footer */}
          <Text
            style={{
              fontSize: 11,
              lineHeight: 16,
              textAlign: "center",
              maxWidth: 320,
              alignSelf: "center",
              marginBottom: 16,
              color: colors.textSecondary,
            }}
          >
            {t("welcome.legalPre")}
            <Text style={{ color: colors.text, fontWeight: "500", textDecorationLine: "underline" }}>
              {t("welcome.terms")}
            </Text>
            {t("welcome.legalAnd")}
            <Text style={{ color: colors.text, fontWeight: "500", textDecorationLine: "underline" }}>
              {t("welcome.privacy")}
            </Text>
            {t("welcome.legalEnd")}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
