import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { Segmented } from "../components/Segmented";
import { BottomSheet } from "../components/BottomSheet";
import { PropertyCard } from "../components/PropertyCard";
import { PrimaryButton, SecondaryButton } from "../components/Button";
import { DEALS, DealKey } from "../lib/dealTypes";
import { PROPERTY_TYPES, PropertyTypeKey } from "../lib/propertyTypes";
import { BUILD_TYPES, BuildKey } from "../lib/buildTypes";
import { bakuRayons, coordsForDistrict } from "../lib/mock/regions";
import { stockListingPhotos } from "../lib/mock/photos";
import { addListing, formatPrice, Listing } from "../lib/mock/listings";
import { currentUser } from "../lib/mock/user";

const TOTAL_STEPS = 4;
const GRID_GAP = 12;
const PHOTO_SIZE = (Dimensions.get("window").width - 32 - GRID_GAP * 2) / 3;

export default function AddListingModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState(1);

  // One form state for the whole flow.
  const [photos, setPhotos] = useState<string[]>([]);
  const [dealType, setDealType] = useState<DealKey>("sale");
  const [propertyType, setPropertyType] = useState<PropertyTypeKey | null>(null);
  const [buildType, setBuildType] = useState<BuildKey>("new");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [rooms, setRooms] = useState("");
  const [baths, setBaths] = useState("");
  const [floor, setFloor] = useState("");
  const [floorTotal, setFloorTotal] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [phone, setPhone] = useState("+994");
  const [furnished, setFurnished] = useState(false);
  const [mortgage, setMortgage] = useState(false);
  const [description, setDescription] = useState("");

  const [regionSheet, setRegionSheet] = useState(false);
  const [published, setPublished] = useState(false);

  const isLand = propertyType === "land";

  // --- Photos ---
  const addPhoto = () => {
    const next = stockListingPhotos.find((u) => !photos.includes(u));
    if (next) setPhotos((p) => [...p, next]);
  };
  const removePhoto = (u: string) => setPhotos((p) => p.filter((x) => x !== u));

  // --- Validation (gates the Next button per step) ---
  const phoneOk = phone.replace(/[^\d]/g, "").length >= 9;
  const step1Valid = photos.length > 0;
  const step2Valid = propertyType != null;
  const step3Valid =
    title.trim() !== "" &&
    Number(price) > 0 &&
    Number(area) > 0 &&
    region != null &&
    phoneOk &&
    (isLand || Number(rooms) > 0);
  const canNext =
    step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : true;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));
  const goNext = () => step < TOTAL_STEPS && canNext && setStep(step + 1);
  const goBack = () => step > 1 && setStep(step - 1);

  const publish = () => {
    addListing({
      image: photos[0],
      priceAzn: Number(price),
      areaM2: Number(area),
      rooms: isLand ? 0 : Number(rooms || 0),
      floor: !isLand && floor ? Number(floor) : undefined,
      floorTotal: !isLand && floorTotal ? Number(floorTotal) : undefined,
      district: region!,
      title: title.trim(),
      premium: false,
      ownerId: currentUser.id,
      ownerPhone: phone.trim(),
      dealType,
      propertyType: propertyType!,
      buildType,
      baths: isLand ? 0 : Number(baths) || 1,
      furnished: isLand ? false : furnished,
      mortgage,
      createdAt: new Date().toISOString(),
      ...coordsForDistrict(region!),
    });
    setPublished(true);
    // Confirm, then land on My listings so the new listing is visible.
    setTimeout(() => router.replace("/my-listings"), 1300);
  };

  const stepTitle = [
    "",
    t("addListing.step1Title"),
    t("addListing.step2Title"),
    t("addListing.step3Title"),
    t("addListing.step4Title"),
  ][step];

  // Preview listing built from the current form (Step 4 + PropertyCard reuse).
  const previewListing: Listing = {
    id: "preview",
    image: photos[0] ?? "",
    priceAzn: Number(price) || 0,
    areaM2: Number(area) || 0,
    rooms: isLand ? 0 : Number(rooms) || 0,
    floor: !isLand && floor ? Number(floor) : undefined,
    floorTotal: !isLand && floorTotal ? Number(floorTotal) : undefined,
    district: region ?? "",
    title: title.trim() || t("addListing.titlePlaceholder"),
    premium: false,
    ownerId: currentUser.id,
    dealType,
    propertyType: propertyType ?? "apartment",
    buildType,
    baths: isLand ? 0 : Number(baths) || 1,
    furnished: isLand ? false : furnished,
    mortgage,
    ownerPhone: phone.trim(),
    createdAt: new Date().toISOString(),
    ...coordsForDistrict(region ?? ""),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      {/* Header: X (left) · step title (center) · step count (right). No logo. */}
      <View style={{ height: 56, justifyContent: "center" }}>
        <Text
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          {stepTitle}
        </Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}
        >
          <Pressable onPress={close} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "700" }}>
            {step}/{TOTAL_STEPS}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? brand.violet : colors.border }}
          />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 20 }}
        >
          {step === 1 && (
            <Step1Photos
              colors={colors}
              t={t}
              photos={photos}
              onAdd={addPhoto}
              onRemove={removePhoto}
              canAddMore={photos.length < stockListingPhotos.length}
            />
          )}

          {step === 2 && (
            <View style={{ gap: 24, paddingTop: 4 }}>
              <Section title={t("filters.dealType")} colors={colors}>
                <Segmented
                  options={DEALS.map((d) => ({ key: d.key, label: t(d.labelKey) }))}
                  value={dealType}
                  onChange={(k) => setDealType(k as DealKey)}
                />
              </Section>
              <Section title={t("filters.propertyType")} colors={colors}>
                <Segmented
                  options={PROPERTY_TYPES.map((p) => ({ key: p.key, label: t(p.labelKey) }))}
                  value={propertyType ?? ""}
                  onChange={(k) => setPropertyType(k as PropertyTypeKey)}
                />
              </Section>
              {!isLand && (
                <Section title={t("filters.buildType")} colors={colors}>
                  <Segmented
                    options={BUILD_TYPES.map((b) => ({ key: b.key, label: t(b.labelKey) }))}
                    value={buildType}
                    onChange={(k) => setBuildType(k as BuildKey)}
                  />
                </Section>
              )}
            </View>
          )}

          {step === 3 && (
            <View style={{ gap: 18, paddingTop: 4 }}>
              <Field label={t("addListing.titleLabel")} colors={colors}>
                <Input
                  colors={colors}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("addListing.titlePlaceholder")}
                />
              </Field>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <Field label={t("filters.price")} colors={colors} style={{ flex: 1 }}>
                  <Input colors={colors} value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
                </Field>
                <Field label={t("filters.area")} colors={colors} style={{ flex: 1 }}>
                  <Input colors={colors} value={area} onChangeText={setArea} placeholder="0" keyboardType="numeric" />
                </Field>
              </View>

              {!isLand && (
                <>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Field label={t("filters.rooms")} colors={colors} style={{ flex: 1 }}>
                      <Input colors={colors} value={rooms} onChangeText={setRooms} placeholder="0" keyboardType="numeric" />
                    </Field>
                    <Field label={t("filters.baths")} colors={colors} style={{ flex: 1 }}>
                      <Input colors={colors} value={baths} onChangeText={setBaths} placeholder="0" keyboardType="numeric" />
                    </Field>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Field label={t("filters.floor")} colors={colors} style={{ flex: 1 }}>
                      <Input colors={colors} value={floor} onChangeText={setFloor} placeholder="0" keyboardType="numeric" />
                    </Field>
                    <Field label={t("addListing.floorTotal")} colors={colors} style={{ flex: 1 }}>
                      <Input
                        colors={colors}
                        value={floorTotal}
                        onChangeText={setFloorTotal}
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </Field>
                  </View>
                </>
              )}

              <Field label={t("filters.region")} colors={colors}>
                <Pressable
                  onPress={() => setRegionSheet(true)}
                  style={({ pressed }) => ({
                    height: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: region ? colors.text : colors.textSecondary, fontSize: 15 }}>
                    {region ?? t("addListing.selectRegion")}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
              </Field>

              <Field label={t("addListing.phoneLabel")} colors={colors}>
                <Input
                  colors={colors}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t("addListing.phonePlaceholder")}
                  keyboardType="phone-pad"
                />
              </Field>

              <Field label={t("addListing.descriptionLabel")} colors={colors}>
                <Input
                  colors={colors}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("addListing.descriptionPlaceholder")}
                  multiline
                />
              </Field>

              {!isLand && (
                <ToggleRow colors={colors} label={t("filters.furnished")} value={furnished} onValueChange={setFurnished} />
              )}
              <ToggleRow colors={colors} label={t("filters.mortgage")} value={mortgage} onValueChange={setMortgage} />
            </View>
          )}

          {step === 4 && (
            <View style={{ gap: 16, paddingTop: 4 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600" }}>
                {t("addListing.reviewTitle")}
              </Text>
              <PropertyCard
                listing={previewListing}
                variant="feed"
                favorited={false}
                onToggleFavorite={() => {}}
                onPress={() => {}}
              />

              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                }}
              >
                <SummaryRow
                  colors={colors}
                  label={t("filters.dealType")}
                  value={t(DEALS.find((d) => d.key === dealType)!.labelKey)}
                />
                <SummaryRow
                  colors={colors}
                  label={t("filters.propertyType")}
                  value={propertyType ? t(PROPERTY_TYPES.find((p) => p.key === propertyType)!.labelKey) : "—"}
                />
                {!isLand && (
                  <SummaryRow
                    colors={colors}
                    label={t("filters.buildType")}
                    value={t(BUILD_TYPES.find((b) => b.key === buildType)!.labelKey)}
                  />
                )}
                <SummaryRow colors={colors} label={t("filters.price")} value={formatPrice(Number(price) || 0)} />
                <SummaryRow colors={colors} label={t("filters.area")} value={`${Number(area) || 0} m²`} />
                {!isLand && (
                  <SummaryRow colors={colors} label={t("filters.rooms")} value={rooms || "—"} />
                )}
                {!isLand && (
                  <SummaryRow colors={colors} label={t("filters.baths")} value={baths || "—"} />
                )}
                {!isLand && floor !== "" && (
                  <SummaryRow
                    colors={colors}
                    label={t("filters.floor")}
                    value={floorTotal ? `${floor}/${floorTotal}` : floor}
                  />
                )}
                <SummaryRow colors={colors} label={t("filters.region")} value={region ?? "—"} />
                <SummaryRow colors={colors} label={t("addListing.phoneLabel")} value={phone.trim()} />
                {!isLand && (
                  <SummaryRow colors={colors} label={t("filters.furnished")} value={furnished ? "✓" : "—"} />
                )}
                <SummaryRow colors={colors} label={t("filters.mortgage")} value={mortgage ? "✓" : "—"} isLast />
              </View>

              {description.trim() !== "" && (
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{description.trim()}</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom action bar */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          {step > 1 && <SecondaryButton label={t("addListing.back")} onPress={goBack} style={{ flex: 1 }} />}
          {step < TOTAL_STEPS ? (
            <PrimaryButton label={t("addListing.next")} onPress={goNext} disabled={!canNext} style={{ flex: 2 }} />
          ) : (
            <PrimaryButton label={t("addListing.publish")} onPress={publish} style={{ flex: 2 }} />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Region picker (reuses BottomSheet) */}
      <BottomSheet visible={regionSheet} onClose={() => setRegionSheet(false)}>
        <Text
          style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center", paddingTop: 6, paddingBottom: 8 }}
        >
          {t("filters.region")}
        </Text>
        <ScrollView style={{ maxHeight: 360 }}>
          {bakuRayons.map((r, i) => {
            const active = r === region;
            return (
              <Pressable
                key={r}
                onPress={() => {
                  setRegion(r);
                  setRegionSheet(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  borderTopWidth: i === 0 ? 1 : 0,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: active ? brand.violet : colors.text, fontSize: 16, fontWeight: active ? "700" : "500" }}>
                  {r}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={22} color={brand.violet} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>

      {/* Publish confirmation toast */}
      {published && (
        <View style={{ position: "absolute", top: 80, left: 16, right: 16, alignItems: "center" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              maxWidth: 420,
            }}
          >
            <LinearGradient
              colors={brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{t("addListing.publishedTitle")}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t("addListing.publishedDesc")}</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// --- Step 1 ---
function Step1Photos({
  colors,
  t,
  photos,
  onAdd,
  onRemove,
  canAddMore,
}: {
  colors: Theme;
  t: (k: string) => string;
  photos: string[];
  onAdd: () => void;
  onRemove: (u: string) => void;
  canAddMore: boolean;
}) {
  return (
    <View style={{ gap: 12, paddingTop: 4 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t("addListing.photosHint")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
        {photos.map((uri, idx) => (
          <View
            key={uri}
            style={{
              width: PHOTO_SIZE,
              height: PHOTO_SIZE,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            {/* Cover badge on the first photo */}
            {idx === 0 && (
              <LinearGradient
                colors={brand.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 4, alignItems: "center" }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>
                  {t("addListing.cover").toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <Pressable
              onPress={() => onRemove(uri)}
              hitSlop={6}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "rgba(20,18,24,0.7)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}

        {canAddMore && (
          <Pressable
            onPress={onAdd}
            style={({ pressed }) => ({
              width: PHOTO_SIZE,
              height: PHOTO_SIZE,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: brand.violet,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="add" size={28} color={brand.violet} />
            <Text style={{ color: brand.violet, fontSize: 12, fontWeight: "700" }}>{t("addListing.addPhoto")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// --- Shared local form bits ---
function Section({ title, colors, children }: { title: string; colors: Theme; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  colors,
  style,
  children,
}: {
  label: string;
  colors: Theme;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[{ gap: 8 }, style]}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{label}</Text>
      {children}
    </View>
  );
}

function Input({
  colors,
  multiline,
  ...props
}: {
  colors: Theme;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: "numeric" | "default" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={colors.textSecondary}
      style={{
        minHeight: multiline ? 96 : 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 0,
        color: colors.text,
        fontSize: 15,
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

function ToggleRow({
  colors,
  label,
  value,
  onValueChange,
}: {
  colors: Theme;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: brand.violet }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function SummaryRow({
  colors,
  label,
  value,
  isLast,
}: {
  colors: Theme;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 11,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 12 }}>
        {value}
      </Text>
    </View>
  );
}
