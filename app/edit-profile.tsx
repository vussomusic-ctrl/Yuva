import { useState } from "react";
import { View, Text, Image, Pressable, TextInput, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Header } from "./my-listings";
import { Segmented } from "../components/Segmented";
import { PrimaryButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useAuth, UserRole } from "../lib/auth";
import { updateProfile, uploadAvatar } from "../lib/api/profile";

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [role, setRole] = useState<UserRole>(profile?.role ?? "user");
  // Locally picked avatar (uri for preview + base64 for upload-on-save). Null
  // until the user picks a new one — then Save uploads it.
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [localAvatarB64, setLocalAvatarB64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewUri = localAvatarUri ?? profile?.avatar_url ?? null;

  // Pick + downscale to 512px JPEG (avatars don't need full res). Keep base64
  // for the upload on Save (atomic — nothing hits Storage until you save).
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("addListing.photoPermission"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (res.canceled || !res.assets?.[0]) return;

    const a = res.assets[0];
    const ctx = ImageManipulator.manipulate(a.uri);
    if (Math.max(a.width, a.height) > 512) {
      if (a.width >= a.height) ctx.resize({ width: 512 });
      else ctx.resize({ height: 512 });
    }
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    setLocalAvatarUri(out.uri);
    setLocalAvatarB64(out.base64 ?? null);
  };

  const onSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      let newUrl: string | undefined;
      if (localAvatarB64) newUrl = await uploadAvatar(user.id, localAvatarB64);
      await updateProfile({ full_name: name.trim(), role, avatar_url: newUrl ?? undefined });
      await refreshProfile();
      router.back();
    } catch {
      Alert.alert(t("editProfile.errSave"));
    } finally {
      setSaving(false);
    }
  };

  // Route guard: editing requires an account. Guests reaching this screen
  // (deep link, or the profile avatar tap) get a clay guest state — same
  // EmptyState pattern as elsewhere. No redirect, so Back still works.
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <Header
          colors={colors}
          title={t("editProfile.title")}
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
        />
        <EmptyState
          image={require("../assets/auth/bird-lock.png")}
          title={t("editProfile.guestPrompt")}
          cta={{ label: t("profile.login"), onPress: () => router.replace("/login") }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("editProfile.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 24 }}
      >
        {/* Avatar — tap to pick; camera badge signals it's editable */}
        <View style={{ alignItems: "center" }}>
          <Pressable onPress={pickAvatar}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: colors.card, borderWidth: 3, borderColor: colors.card }}
              />
            ) : (
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: brand.violet,
                  borderWidth: 3,
                  borderColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person" size={52} color="#FFFFFF" />
              </View>
            )}
            <LinearGradient
              colors={brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.bg,
              }}
            >
              <Ionicons name="camera" size={17} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          <Pressable onPress={pickAvatar} hitSlop={8} style={({ pressed }) => ({ marginTop: 10, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 14 }}>
              {previewUri ? t("editProfile.changePhoto") : t("editProfile.pickPhoto")}
            </Text>
          </Pressable>
        </View>

        {/* Name */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontFamily: font.semibold, fontSize: 13 }}>
            {t("editProfile.nameLabel")}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("createAccount.fullNamePlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={{
              color: colors.text,
              fontFamily: font.regular,
              fontSize: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          />
        </View>

        {/* Account type — owner (DB role "user") / agent */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontFamily: font.semibold, fontSize: 13 }}>
            {t("editProfile.accountType")}
          </Text>
          <Segmented
            options={[
              { key: "user", label: t("editProfile.typeOwner") },
              { key: "agent", label: t("editProfile.typeAgent") },
            ]}
            value={role}
            onChange={(k) => setRole(k as UserRole)}
          />
        </View>

        <PrimaryButton label={t("editProfile.save")} onPress={onSave} disabled={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}
