import { useEffect, useState } from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Segmented } from "../components/Segmented";
import { RegionPickerSheet } from "../components/RegionPickerSheet";
import { BottomSheet } from "../components/BottomSheet";
import { PropertyCard } from "../components/PropertyCard";
import { PrimaryButton, SecondaryButton } from "../components/Button";
import { LoadingState } from "../components/ListState";
import { DEALS, DealKey } from "../lib/dealTypes";
import { PROPERTY_TYPES, PropertyTypeKey } from "../lib/propertyTypes";
import { BUILD_TYPES, BuildKey } from "../lib/buildTypes";
import { placeById, placeName, coordsForPlace, regionOfPlace } from "../lib/places";
import { useLanguage } from "../lib/i18n/languages";
import { buildListingTitle } from "../lib/listingTitle";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import Sortable from "react-native-sortables";
import { formatPrice, Listing } from "../lib/mock/listings";
import { createListing, updateListing, fetchListingRow } from "../lib/api/listings";
import { generateDescription } from "../lib/api/ai";
import { ListingFormInput, PhotoItem, rowToForm, rowToPhotoItems } from "../lib/adapters/listing";
import { useAuth } from "../lib/auth";
import { useMapPick } from "../lib/map-pick";

const TOTAL_STEPS = 4;
const GRID_GAP = 12;
const PHOTO_SIZE = (Dimensions.get("window").width - 32 - GRID_GAP * 2) / 3;

export default function AddListingModal() {
  const { t } = useTranslation();
  const { current: lang, languages } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  // Publishing requires an account (owner_id + RLS). Send guests to login.
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Edit prefill gate: don't render the form (and never let Save fire) until
  // every field has been seeded from the row.
  const [editStatus, setEditStatus] = useState<"loading" | "ok" | "notfound" | "error">(
    isEdit ? "loading" : "ok",
  );

  const [step, setStep] = useState(1);

  // One form state for the whole flow. Photos: existing (rowId/storagePath) or
  // new (compressed base64 to upload). `uri` is the preview source for both.
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dealType, setDealType] = useState<DealKey>("sale");
  const [propertyType, setPropertyType] = useState<PropertyTypeKey | null>(null);
  const [buildType, setBuildType] = useState<BuildKey>("new");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [rooms, setRooms] = useState("");
  const [baths, setBaths] = useState("");
  const [floor, setFloor] = useState("");
  const [floorTotal, setFloorTotal] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [metroId, setMetroId] = useState<string | null>(null);
  const [phone, setPhone] = useState("+994");
  const [furnished, setFurnished] = useState(false);
  const [mortgage, setMortgage] = useState(false);
  const [description, setDescription] = useState("");

  const [locationSheet, setLocationSheet] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false); // AI description language sheet
  const [generating, setGenerating] = useState(false);

  // Map-picked coordinates come back via the shared store (router can't return a
  // value). `clear()` runs ONLY on mount = start of a new listing — NOT on focus
  // /return from the picker (this screen stays mounted under the picker), so a
  // freshly placed pin is never wiped.
  const { picked, clear: clearPick, setPicked } = useMapPick();
  useEffect(() => {
    if (!isEdit) clearPick(); // create: fresh pin. edit: seeded from row below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Edit: load the row, prefill EVERY field, then flip status to "ok" (only
  // after all setters, so an empty-default frame can't leak into Save).
  useEffect(() => {
    if (!isEdit || !id) return;
    let active = true;
    fetchListingRow(id)
      .then((row) => {
        if (!active) return;
        if (!row) {
          setEditStatus("notfound");
          return;
        }
        const f = rowToForm(row);
        setDealType(f.dealType);
        setPropertyType(f.propertyType);
        setBuildType(f.buildType);
        setPrice(f.price);
        setArea(f.area);
        setRooms(f.rooms);
        setBaths(f.baths);
        setFloor(f.floor);
        setFloorTotal(f.floorTotal);
        setPlaceId(f.placeId);
        setMetroId(f.metroId);
        setPhone(f.phone);
        setFurnished(f.furnished);
        setMortgage(f.mortgage);
        setDescription(f.description);
        setPhotos(rowToPhotoItems(row));
        if (row.lat != null && row.lng != null) setPicked({ lat: row.lat, lng: row.lng });
        setEditStatus("ok");
      })
      .catch(() => {
        if (active) setEditStatus("error");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  // Bail out (no blank form under Save) if the listing is gone / failed to load.
  useEffect(() => {
    if (editStatus === "notfound" || editStatus === "error") {
      Alert.alert(t("common.loadError"));
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editStatus]);

  const isLand = propertyType === "land";

  // Location field label: region name, or "Bakı › Area" when inside Baku.
  const locationLabel = (() => {
    if (!placeId) return "";
    const p = placeById(placeId);
    if (!p) return "";
    if (placeId !== "baku" && regionOfPlace(placeId) === "baku") {
      return `${placeName(placeById("baku")!, lang)} › ${placeName(p, lang)}`;
    }
    return placeName(p, lang);
  })();

  // Auto-generated title (bina.az style), live in the current UI language.
  const generatedTitle = buildListingTitle(
    {
      buildType,
      propertyType,
      rooms,
      areaM2: isLand ? "" : area,
      landAreaSot: isLand ? area : undefined,
      placeId,
      metroId,
    },
    t,
    lang,
  );

  const openMapPicker = () =>
    router.push({
      pathname: "/map-picker",
      params: {
        ...(placeId ? { placeId } : {}),
        ...(picked ? { lat: String(picked.lat), lng: String(picked.lng) } : {}),
      },
    });

  // --- Photos (create) ---
  // Pick from gallery → compress each (≤1280 long side, JPEG 0.7) right here, so
  // the form state already holds the compressed base64 (createListing only
  // uploads, never compresses). Capped at 10.
  const addPhoto = async () => {
    if (photos.length >= 10) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("addListing.photoPermission"));
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10 - photos.length,
      quality: 1,
    });
    if (res.canceled || !res.assets) return;

    const compressed = await Promise.all(
      res.assets.map(async (a) => {
        const ctx = ImageManipulator.manipulate(a.uri);
        if (Math.max(a.width, a.height) > 1280) {
          if (a.width >= a.height) ctx.resize({ width: 1280 });
          else ctx.resize({ height: 1280 });
        }
        const img = await ctx.renderAsync();
        const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
        return { uri: out.uri, base64: out.base64, kind: "new" as const };
      }),
    );
    setPhotos((p) => [...p, ...compressed].slice(0, 10));
  };
  const removePhoto = (uri: string) => setPhotos((p) => p.filter((x) => x.uri !== uri));

  // Move a photo to the front (cover) by identity — robust under drag reorder.
  // Drag itself reorders via Sortable.Grid's onDragEnd → setPhotos(data).
  // sort is derived from array index on Save (updateListing/createListing).
  const makeCover = (uri: string) =>
    setPhotos((prev) => {
      const item = prev.find((p) => p.uri === uri);
      return item ? [item, ...prev.filter((p) => p.uri !== uri)] : prev;
    });

  // --- AI description ---
  // Enough facts to describe? (type + area + a place/pin).
  const canGenerate =
    propertyType != null && Number(area) > 0 && (placeId != null || picked != null);

  // Human-readable location in the chosen language (region › Baku area, + metro).
  const resolveLocation = (targetLang: "az" | "ru" | "en"): string => {
    if (!placeId) return "";
    const p = placeById(placeId);
    if (!p) return "";
    const base =
      placeId !== "baku" && regionOfPlace(placeId) === "baku"
        ? `${placeName(placeById("baku")!, targetLang)} › ${placeName(p, targetLang)}`
        : placeName(p, targetLang);
    const metro = metroId ? `, ${placeName(placeById(metroId)!, targetLang)}` : "";
    return base + metro;
  };

  const applyDescription = (text: string) => {
    if (description.trim() === "") {
      setDescription(text);
    } else {
      Alert.alert(t("addListing.replaceDescTitle"), t("addListing.replaceDescMsg"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("addListing.replace"), onPress: () => setDescription(text) },
      ]);
    }
  };

  const onGenerate = async (targetLang: "az" | "ru" | "en") => {
    setGenOpen(false);
    if (!canGenerate || generating) return;
    setGenerating(true);
    try {
      const text = await generateDescription(
        {
          dealType,
          propertyType: propertyType!,
          buildType: isLand ? null : buildType,
          area: Number(area) || null,
          areaUnit: isLand ? "sot" : "m2",
          rooms: isLand ? null : Number(rooms) || null,
          baths: isLand ? null : Number(baths) || null,
          floor: isLand ? null : Number(floor) || null,
          floorTotal: isLand ? null : Number(floorTotal) || null,
          price: Number(price) || null,
          currency: "₼",
          furnished: isLand ? false : furnished,
          mortgage,
          location: resolveLocation(targetLang),
        },
        targetLang,
      );
      applyDescription(text);
    } catch {
      Alert.alert(t("addListing.errGenerate"));
    } finally {
      setGenerating(false);
    }
  };

  // --- Validation (gates the Next button per step) ---
  const phoneOk = phone.replace(/[^\d]/g, "").length >= 9;
  const step1Valid = photos.length > 0;
  const step2Valid = propertyType != null;
  const step3Valid =
    Number(price) > 0 &&
    Number(area) > 0 &&
    (placeId != null || picked != null) && // a place OR a map pin is enough
    phoneOk &&
    (isLand || Number(rooms) > 0);
  const canNext =
    step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : true;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));
  const goNext = () => step < TOTAL_STEPS && canNext && setStep(step + 1);
  const goBack = () => step > 1 && setStep(step - 1);

  const publish = async () => {
    if (!user || publishing) return;
    setPublishError(null);
    setPublishing(true);

    // Map pin wins; otherwise fall back to the place centre (also the web path).
    const coords = picked ?? coordsForPlace(placeId);
    const form: ListingFormInput = {
      dealType,
      propertyType: propertyType!,
      buildType,
      price,
      area,
      rooms,
      baths,
      floor,
      floorTotal,
      placeId,
      metroId,
      district: placeId ? placeName(placeById(placeId)!, "az") : "",
      phone,
      furnished,
      mortgage,
      description,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };

    if (isEdit) {
      const res = await updateListing(id!, form, user.id, photos);
      setPublishing(false);
      if (!res.ok) {
        setPublishError(res.step === "photos" ? t("addListing.errPhotos") : t("addListing.errSave"));
        return;
      }
    } else {
      const res = await createListing(
        form,
        user.id,
        photos.map((p) => ({ base64: p.base64 ?? "" })),
      );
      setPublishing(false);
      if (!res.ok) {
        // Surface both failure modes explicitly — don't pretend it worked.
        setPublishError(res.step === "photos" ? t("addListing.errPhotos") : t("addListing.errSave"));
        return;
      }
    }

    setPublished(true);
    // Confirm, then land on My listings (refetches on focus → shows the change).
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
    image: photos[0]?.uri ?? "",
    photos: photos.map((p) => p.uri),
    photoCount: photos.length,
    priceAzn: Number(price) || 0,
    areaM2: isLand ? 0 : Number(area) || 0,
    landAreaSot: isLand ? Number(area) || 0 : undefined,
    rooms: isLand ? 0 : Number(rooms) || 0,
    floor: !isLand && floor ? Number(floor) : undefined,
    floorTotal: !isLand && floorTotal ? Number(floorTotal) : undefined,
    district: placeId ? placeName(placeById(placeId)!, lang) : "",
    placeId: placeId ?? "",
    metroId: metroId ?? undefined,
    premium: false,
    ownerId: user?.id ?? "",
    dealType,
    propertyType: propertyType ?? "apartment",
    buildType,
    baths: isLand ? 0 : Number(baths) || 1,
    furnished: isLand ? false : furnished,
    mortgage,
    ownerPhone: phone.trim(),
    createdAt: new Date().toISOString(),
    ...(picked ?? coordsForPlace(placeId)),
  };

  // Edit prefill in flight → spinner only (form not rendered, Save can't fire).
  if (isEdit && editStatus === "loading") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
        <View style={{ height: 56, justifyContent: "center", paddingHorizontal: 16 }}>
          <Pressable onPress={close} hitSlop={10} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <LoadingState colors={colors} />
      </SafeAreaView>
    );
  }

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
            fontFamily: font.bold,
            fontSize: 18,
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
          <Text style={{ color: colors.textSecondary, fontFamily: font.bold, fontSize: 14 }}>
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
              onMakeCover={makeCover}
              onReorder={setPhotos}
              canAddMore={photos.length < 10}
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
              {/* Auto-generated title — read-only live preview */}
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: font.bold,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {t("addListing.titlePreview")}
                </Text>
                <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 15 }}>
                  {generatedTitle || t("addListing.titlePlaceholder")}
                </Text>
              </View>

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

              {/* Location — cascading region → Baku area (+ optional metro) */}
              <Field label={t("addListing.locationLabel")} colors={colors}>
                <Pressable
                  onPress={() => setLocationSheet(true)}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: placeId ? colors.text : colors.textSecondary, fontFamily: font.regular, fontSize: 15 }}>
                      {placeId ? locationLabel : t("addListing.selectLocation")}
                    </Text>
                    {metroId && (
                      <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginTop: 2 }}>
                        {t("filters.metro")}: {placeName(placeById(metroId)!, lang)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
              </Field>

              {/* Map pin picker — exact building point (overrides rayon centre) */}
              <Field label={t("addListing.mapPointLabel")} colors={colors}>
                <Pressable
                  onPress={openMapPicker}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: picked ? brand.violet : colors.border,
                    backgroundColor: colors.card,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <Ionicons name={picked ? "location" : "map-outline"} size={20} color={brand.violet} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontFamily: picked ? font.bold : font.medium, fontSize: 15 }}>
                        {picked ? t("addListing.pointSelected") : t("addListing.pickOnMap")}
                      </Text>
                      {picked && (
                        <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginTop: 2 }}>
                          {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
                <Pressable
                  onPress={() => setGenOpen(true)}
                  disabled={!canGenerate || generating}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: brand.violet,
                    opacity: !canGenerate || generating ? 0.45 : pressed ? 0.7 : 1,
                  })}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color={brand.violet} />
                  ) : (
                    <Ionicons name="sparkles-outline" size={18} color={brand.violet} />
                  )}
                  <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 15 }}>
                    {generating ? t("addListing.generating") : t("addListing.generate")}
                  </Text>
                </Pressable>
                {!canGenerate && (
                  <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>
                    {t("addListing.generateHint")}
                  </Text>
                )}
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
              <Text style={{ color: colors.textSecondary, fontFamily: font.semibold, fontSize: 14 }}>
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
                <SummaryRow
                  colors={colors}
                  label={t("filters.area")}
                  value={
                    isLand
                      ? `${Number(area) || 0} ${t("listingTitle.sotUnit")}`
                      : `${Number(area) || 0} ${t("listingTitle.areaUnit")}`
                  }
                />
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
                <SummaryRow colors={colors} label={t("filters.region")} value={placeId ? placeName(placeById(placeId)!, lang) : "—"} />
                <SummaryRow colors={colors} label={t("filters.metro")} value={metroId ? placeName(placeById(metroId)!, lang) : "—"} />
                <SummaryRow
                  colors={colors}
                  label={t("addListing.mapPointLabel")}
                  value={picked ? `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : "—"}
                />
                <SummaryRow colors={colors} label={t("addListing.phoneLabel")} value={phone.trim()} />
                {!isLand && (
                  <SummaryRow colors={colors} label={t("filters.furnished")} value={furnished ? "✓" : "—"} />
                )}
                <SummaryRow colors={colors} label={t("filters.mortgage")} value={mortgage ? "✓" : "—"} isLast />
              </View>

              {description.trim() !== "" && (
                <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, lineHeight: 20 }}>{description.trim()}</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Publish error (e.g. insert failed, or photos failed after create) */}
        {publishError && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#FCE8E8",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Ionicons name="alert-circle" size={20} color="#BA1A1A" />
              <Text style={{ flex: 1, color: "#8C1D18", fontFamily: font.regular, fontSize: 13 }}>{publishError}</Text>
            </View>
          </View>
        )}

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
          {step > 1 && <SecondaryButton label={t("addListing.back")} onPress={goBack} disabled={publishing} style={{ flex: 1 }} />}
          {step < TOTAL_STEPS ? (
            <PrimaryButton label={t("addListing.next")} onPress={goNext} disabled={!canNext} style={{ flex: 2 }} />
          ) : (
            <PrimaryButton
              label={
                publishing
                  ? t("addListing.publishing")
                  : isEdit
                    ? t("addListing.save")
                    : t("addListing.publish")
              }
              onPress={publish}
              disabled={publishing}
              style={{ flex: 2 }}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Location picker — cascading region → Baku area + metro */}
      <RegionPickerSheet
        visible={locationSheet}
        onClose={() => setLocationSheet(false)}
        placeId={placeId}
        metroId={metroId}
        onSelectPlace={(id) => setPlaceId(id)}
        onSelectMetro={(id) => setMetroId(id)}
        lang={lang}
      />

      {/* AI description — pick the language to generate in */}
      <BottomSheet visible={genOpen} onClose={() => setGenOpen(false)}>
        <Text
          style={{ color: colors.text, fontFamily: font.bold, fontSize: 17, textAlign: "center", paddingTop: 6, paddingBottom: 8 }}
        >
          {t("addListing.descLang")}
        </Text>
        {languages.map((l, i) => {
          const active = l.code === lang;
          return (
            <Pressable
              key={l.code}
              onPress={() => onGenerate(l.code as "az" | "ru" | "en")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: i === 0 ? 1 : 0,
                borderBottomWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: active ? brand.violet : colors.text, fontFamily: active ? font.bold : font.medium, fontSize: 16 }}>
                {l.name}
              </Text>
              {active && <Ionicons name="sparkles" size={20} color={brand.violet} />}
            </Pressable>
          );
        })}
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
              <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 15 }}>
                {t(isEdit ? "addListing.updatedTitle" : "addListing.publishedTitle")}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13 }}>
                {t(isEdit ? "addListing.updatedDesc" : "addListing.publishedDesc")}
              </Text>
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
  onMakeCover,
  onReorder,
  canAddMore,
}: {
  colors: Theme;
  t: (k: string) => string;
  photos: PhotoItem[];
  onAdd: () => void;
  onRemove: (uri: string) => void;
  onMakeCover: (uri: string) => void;
  onReorder: (next: PhotoItem[]) => void;
  canAddMore: boolean;
}) {
  const coverUri = photos[0]?.uri;
  return (
    <View style={{ gap: 12, paddingTop: 4 }}>
      <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>{t("addListing.photosHint")}</Text>

      {/* Drag-to-reorder grid. Drag only from the photo (Sortable.Handle) — the
          remove/cover overlays sit outside the handle so taps reach them. */}
      {photos.length > 0 && (
        <Sortable.Grid
          columns={3}
          data={photos}
          keyExtractor={(p) => p.uri}
          customHandle
          rowGap={GRID_GAP}
          columnGap={GRID_GAP}
          onDragEnd={({ data }) => onReorder(data)}
          renderItem={({ item }) => {
            const isCover = item.uri === coverUri;
            return (
              <View
                style={{
                  width: "100%",
                  height: PHOTO_SIZE,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Sortable.Handle style={{ width: "100%", height: "100%" }}>
                  <Image source={{ uri: item.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                </Sortable.Handle>

                {/* Cover pill — top-left (by identity, not index) */}
                {isCover && (
                  <LinearGradient
                    colors={brand.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ position: "absolute", top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}
                  >
                    <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 9, letterSpacing: 0.5 }}>
                      {t("addListing.cover").toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}

                {/* Remove — top-right (outside handle → tappable) */}
                <Pressable
                  onPress={() => onRemove(item.uri)}
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

                {/* Make cover — bottom-right star (hidden on the current cover) */}
                {!isCover && (
                  <Pressable
                    onPress={() => onMakeCover(item.uri)}
                    accessibilityLabel={t("addListing.makeCover")}
                    hitSlop={6}
                    style={{
                      position: "absolute",
                      bottom: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "rgba(20,18,24,0.7)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="star" size={14} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Add tile — OUTSIDE the sortable grid (not draggable) */}
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
          <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 12 }}>{t("addListing.addPhoto")}</Text>
        </Pressable>
      )}
    </View>
  );
}

// --- Shared local form bits ---
function Section({ title, colors, children }: { title: string; colors: Theme; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>{title}</Text>
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
      <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 14 }}>{label}</Text>
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
        fontFamily: font.regular,
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
      <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 16 }}>{label}</Text>
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
      <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 14, flexShrink: 1, textAlign: "right", marginLeft: 12 }}>
        {value}
      </Text>
    </View>
  );
}
