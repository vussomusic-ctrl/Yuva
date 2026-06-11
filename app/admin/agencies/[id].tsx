import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, TextInput, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../../lib/theme/ThemeContext";
import { brand, Theme } from "../../../lib/theme/colors";
import { font } from "../../../lib/theme/typography";
import { Header } from "../../my-listings";
import { LoadingState, ErrorState } from "../../../components/ListState";
import { PrimaryButton } from "../../../components/Button";
import { fetchAgencyById, fetchAgencyAgents, AgencyAgent } from "../../../lib/api/agencies";
import {
  updateAgency,
  uploadAgencyLogo,
  setAgentAgency,
  searchProfiles,
  SearchedProfile,
} from "../../../lib/api/admin";

export default function AdminAgencyEditScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [isPartner, setIsPartner] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [agents, setAgents] = useState<AgencyAgent[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedProfile[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const reloadAgents = useCallback(() => {
    if (!id) return;
    fetchAgencyAgents(id).then(setAgents).catch(() => {});
  }, [id]);

  // Initial load: form fields + agents. useEffect (not focus) so re-focus never
  // clobbers unsaved edits; agents refetch locally after bind/unbind.
  useEffect(() => {
    if (!id) return;
    setError(false);
    setLoaded(false);
    Promise.all([fetchAgencyById(id), fetchAgencyAgents(id)])
      .then(([ag, ags]) => {
        if (ag) {
          setName(ag.name);
          setPhone(ag.phone ?? "");
          setEmail(ag.email ?? "");
          setWebsite(ag.website ?? "");
          setDescription(ag.description ?? "");
          setIsPartner(ag.isPartner);
          setLogoUrl(ag.logoUrl);
        }
        setAgents(ags);
        setLoaded(!!ag);
        if (!ag) setError(true);
      })
      .catch(() => setError(true));
  }, [id]);

  const onSave = () => {
    if (!id || saving) return;
    setSaving(true);
    updateAgency(id, {
      name,
      phone: phone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      description: description.trim() || null,
      isPartner,
    })
      .then(() => Alert.alert(t("admin.saved")))
      .catch(() => Alert.alert(t("editProfile.errSave")))
      .finally(() => setSaving(false));
  };

  const pickLogo = async () => {
    if (!id) return;
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
    try {
      const a = res.assets[0];
      const ctx = ImageManipulator.manipulate(a.uri);
      if (Math.max(a.width, a.height) > 512) {
        if (a.width >= a.height) ctx.resize({ width: 512 });
        else ctx.resize({ height: 512 });
      }
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      const url = await uploadAgencyLogo(id, out.base64 ?? "");
      await updateAgency(id, { logoUrl: url });
      setLogoUrl(url);
    } catch {
      Alert.alert(t("editProfile.errSave"));
    }
  };

  const onChangeQuery = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      searchProfiles(text).then(setResults).catch(() => setResults([]));
    }, 400);
  };

  const onBind = (p: SearchedProfile) => {
    if (!id) return;
    setAgentAgency(p.id, id)
      .then(() => {
        setQuery("");
        setResults([]);
        reloadAgents();
      })
      .catch(() => Alert.alert(t("editProfile.errSave")));
  };

  const onUnbind = (agentId: string) => {
    Alert.alert(t("admin.unbindTitle"), t("admin.unbindMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("admin.unbind"),
        style: "destructive",
        onPress: () =>
          setAgentAgency(agentId, null).then(reloadAgents).catch(() => Alert.alert(t("editProfile.errSave"))),
      },
    ]);
  };

  const loading = !loaded && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <Header
        colors={colors}
        title={name || t("settings.manageAgencies")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/admin/agencies"))}
      />

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={() => router.replace(`/admin/agencies/${id}`)} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }}
        >
          {/* Logo */}
          <View style={{ alignItems: "center", gap: 10 }}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={{ width: 96, height: 96, borderRadius: 20, backgroundColor: colors.card }} />
            ) : (
              <View style={{ width: 96, height: 96, borderRadius: 20, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 40 }}>
                  {(name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Pressable onPress={pickLogo} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 14 }}>{t("admin.changeLogo")}</Text>
            </Pressable>
          </View>

          {/* Form */}
          <LabeledInput colors={colors} label={t("admin.nameLabel")} value={name} onChangeText={setName} />
          <LabeledInput colors={colors} label={t("admin.phoneLabel")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <LabeledInput colors={colors} label={t("admin.emailLabel")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <LabeledInput colors={colors} label={t("admin.websiteLabel")} value={website} onChangeText={setWebsite} autoCapitalize="none" />
          <LabeledInput colors={colors} label={t("admin.descriptionLabel")} value={description} onChangeText={setDescription} multiline />

          {/* Partner switch */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
            <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 15 }}>{t("admin.partner")}</Text>
            <Switch
              value={isPartner}
              onValueChange={setIsPartner}
              trackColor={{ false: colors.border, true: brand.violet }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
            />
          </View>

          <PrimaryButton label={t("editProfile.save")} onPress={onSave} disabled={saving} />

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

          {/* Current agents */}
          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 18 }}>{t("agencies.agents")}</Text>
          {agents.map((ag) => (
            <View key={ag.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {ag.avatarUrl ? (
                <Image source={{ uri: ag.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card }} />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                </View>
              )}
              <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: font.semibold, fontSize: 15 }}>
                {ag.fullName ?? ""}
              </Text>
              {ag.verified && <Ionicons name="shield-checkmark" size={16} color={brand.blue} />}
              <Pressable onPress={() => onUnbind(ag.id)} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ color: colors.danger, fontFamily: font.bold, fontSize: 13 }}>{t("admin.unbind")}</Text>
              </Pressable>
            </View>
          ))}

          {/* Bind a new agent */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginTop: 4,
            }}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder={t("admin.searchPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 15, padding: 0 }}
            />
          </View>

          {results.map((p) => {
            const here = p.agencyId === id;
            const elsewhere = p.agencyId != null && p.agencyId !== id;
            return (
              <Pressable
                key={p.id}
                onPress={() => !here && onBind(p)}
                disabled={here}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 4,
                  opacity: here ? 0.5 : pressed ? 0.6 : 1,
                })}
              >
                {p.avatarUrl ? (
                  <Image source={{ uri: p.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card }} />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="person" size={20} color="#FFFFFF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.semibold, fontSize: 15 }}>
                    {p.fullName ?? ""}
                  </Text>
                  {(here || elsewhere) && (
                    <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>
                      {here ? t("admin.alreadyHere") : t("admin.inOtherAgency")}
                    </Text>
                  )}
                </View>
                {!here && <Ionicons name="add-circle" size={22} color={brand.violet} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LabeledInput({
  colors,
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  colors: Theme;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary, fontFamily: font.semibold, fontSize: 13 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
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
          ...(multiline ? { minHeight: 100, textAlignVertical: "top" } : null),
        }}
      />
    </View>
  );
}
