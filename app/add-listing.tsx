import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
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
import { brand, tints, TintKey, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import Animated from "react-native-reanimated";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import { Segmented } from "../components/Segmented";
import { usePressScale } from "../lib/animations";
import { ClayToggle } from "../components/ClayToggle";
import { TintCard } from "../components/TintCard";
import { MapPickerOverlay } from "../components/MapPickerOverlay";
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

const TOTAL_STEPS = 8;

// Premium type cards (step 2) — clay category icons + pastel tints per theme.
const TYPE_CARDS: { type: PropertyTypeKey; icon: number; labelKey: string; tint: { light: string; dark: string } }[] = [
  { type: "apartment", icon: require("../assets/icons/categories/menziller.png"), labelKey: "filters.typeApartment", tint: { light: "#F0E9FB", dark: "#241B33" } },
  { type: "house", icon: require("../assets/icons/categories/evler.png"), labelKey: "filters.typeHouse", tint: { light: "#E5F0FB", dark: "#1A2530" } },
  { type: "land", icon: require("../assets/icons/categories/torpaq.png"), labelKey: "filters.typeLand", tint: { light: "#E8F5EA", dark: "#1A2A1E" } },
  { type: "object", icon: require("../assets/icons/categories/obyektler.png"), labelKey: "filters.typeObject", tint: { light: "#FBEFE5", dark: "#30251A" } },
];
const GRID_GAP = 12;
const PHOTO_SIZE = (Dimensions.get("window").width - 32 - GRID_GAP * 2) / 3;

export default function AddListingModal() {
  const { t } = useTranslation();
  const { current: lang, languages } = useLanguage();
  const { colors, mode } = useTheme();
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
  const [phoneLocal, setPhoneLocal] = useState(""); // local part; "+994" prefix is fixed in UI
  const [telegram, setTelegram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  // Characteristics (step 5)
  const [buildingSeries, setBuildingSeries] = useState<string | null>(null);
  const [complexName, setComplexName] = useState("");
  const [builtYear, setBuiltYear] = useState("");
  const [material, setMaterial] = useState<string | null>(null);
  const [renovation, setRenovation] = useState<string | null>(null);
  const [heating, setHeating] = useState<string | null>(null);
  // Land
  const [landPurpose, setLandPurpose] = useState<string | null>(null);
  const [utilGas, setUtilGas] = useState(false);
  const [utilWater, setUtilWater] = useState(false);
  const [utilElectricity, setUtilElectricity] = useState(false);
  const [utilSewage, setUtilSewage] = useState(false);
  const [roadAccess, setRoadAccess] = useState(false);
  // Commercial
  const [commercialType, setCommercialType] = useState<string | null>(null);
  const [separateEntrance, setSeparateEntrance] = useState(false);
  const [shopfront, setShopfront] = useState(false);
  // Rent terms
  const [deposit, setDeposit] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [commissionNegotiable, setCommissionNegotiable] = useState(false);
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [kidsAllowed, setKidsAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [minTerm, setMinTerm] = useState("");
  const [prepayment, setPrepayment] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [mortgage, setMortgage] = useState(false);
  const [description, setDescription] = useState("");

  const [locationSheet, setLocationSheet] = useState(false);
  const [showMap, setShowMap] = useState(false);
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
        // Strip +994 / country code / leading zeros → local part for the input.
        setPhoneLocal((f.phone ?? "").replace(/[^\d]/g, "").replace(/^994/, "").replace(/^0+/, ""));
        setTelegram(f.telegram ?? "");
        setWhatsapp(f.whatsapp ?? "");
        setBuildingSeries(f.buildingSeries ?? null);
        setComplexName(f.complexName ?? "");
        setBuiltYear(f.builtYear ?? "");
        setMaterial(f.material ?? null);
        setRenovation(f.renovation ?? null);
        setHeating(f.heating ?? null);
        setLandPurpose(f.landPurpose ?? null);
        setUtilGas(f.utilGas ?? false);
        setUtilWater(f.utilWater ?? false);
        setUtilElectricity(f.utilElectricity ?? false);
        setUtilSewage(f.utilSewage ?? false);
        setRoadAccess(f.roadAccess ?? false);
        setCommercialType(f.commercialType ?? null);
        setSeparateEntrance(f.separateEntrance ?? false);
        setShopfront(f.shopfront ?? false);
        setDeposit(f.deposit ?? "");
        setCommissionPercent(f.commissionPercent ?? "");
        setCommissionNegotiable(f.commissionNegotiable ?? false);
        setUtilitiesIncluded(f.utilitiesIncluded ?? false);
        setKidsAllowed(f.kidsAllowed ?? false);
        setPetsAllowed(f.petsAllowed ?? false);
        setMinTerm(f.minTerm ?? "");
        setPrepayment(f.prepayment ?? "");
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
  const isResidential = propertyType === "apartment" || propertyType === "house";

  // Enum options for the characteristics dropdowns (labels via i18n).
  const opts = (group: string, keys: string[]) => keys.map((k) => ({ key: k, label: t(`addListing.${group}.${k}`) }));
  const SERIES_OPTS = opts("seriesOpts", ["kiev", "leningrad", "stalinka", "khrushchevka", "other"]);
  const MATERIAL_OPTS = opts("materialOpts", ["monolith", "brick", "panel", "block", "other"]);
  const RENOVATION_OPTS = opts("renovationOpts", ["euro", "designer", "cosmetic", "rough", "none"]);
  const HEATING_OPTS = opts("heatingOpts", ["kombi", "central", "gas", "none"]);
  const LAND_PURPOSE_OPTS = opts("landPurposeOpts", ["residential", "commercial", "agricultural"]);
  const COMMERCIAL_OPTS = opts("commercialTypeOpts", ["office", "shop", "warehouse", "restaurant", "beauty", "other"]);
  const isCommercial = propertyType === "object";
  const isRent = dealType === "rent";

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

  const openMapPicker = () => setShowMap(true);

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
  const phoneOk = phoneLocal.length === 9; // AZ mobile local part = exactly 9 digits
  const step1Valid = photos.length > 0;
  const step2Valid = propertyType != null;
  const step3Valid = Number(price) > 0 && Number(area) > 0 && (isLand || Number(rooms) > 0);
  const step4Valid = placeId != null || picked != null; // a place OR a map pin
  const step7Valid = phoneOk;
  const canNext =
    step === 1 ? step1Valid
    : step === 2 ? step2Valid
    : step === 3 ? step3Valid
    : step === 4 ? step4Valid
    : step === 7 ? step7Valid
    : true; // steps 5/6 (characteristics/amenities) + 8 (preview) — no gate

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
      phone: `+994${phoneLocal}`,
      telegram,
      whatsapp,
      buildingSeries: propertyType === "apartment" && buildType === "secondary" ? buildingSeries : null,
      complexName: propertyType === "apartment" ? complexName.trim() || undefined : undefined,
      builtYear: propertyType === "house" ? builtYear || undefined : undefined,
      material: propertyType === "house" ? material : null,
      renovation: isResidential ? renovation : null,
      heating: isResidential ? heating : null,
      // Land
      landPurpose: isLand ? landPurpose : null,
      utilGas: isLand ? utilGas : false,
      utilWater: isLand ? utilWater : false,
      utilElectricity: isLand ? utilElectricity : false,
      utilSewage: isLand ? utilSewage : false,
      roadAccess: isLand ? roadAccess : false,
      // Commercial
      commercialType: isCommercial ? commercialType : null,
      separateEntrance: isCommercial ? separateEntrance : false,
      shopfront: isCommercial ? shopfront : false,
      // Rent terms (residential rent)
      deposit: isRent ? deposit || undefined : undefined,
      commissionNegotiable: isRent ? commissionNegotiable : false,
      commissionPercent: isRent && !commissionNegotiable ? commissionPercent || undefined : undefined,
      utilitiesIncluded: isRent ? utilitiesIncluded : false,
      kidsAllowed: isRent ? kidsAllowed : false,
      petsAllowed: isRent ? petsAllowed : false,
      minTerm: isRent ? minTerm || undefined : undefined,
      prepayment: isRent ? prepayment || undefined : undefined,
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
    t("addListing.step5Title"),
    t("addListing.step6Title"),
    t("addListing.step7Title"),
    t("addListing.step8Title"),
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
    promoTier: "none",
    bumpsRemaining: 0,
    ownerId: user?.id ?? "",
    dealType,
    propertyType: propertyType ?? "apartment",
    buildType,
    baths: isLand ? 0 : Number(baths) || 1,
    furnished: isLand ? false : furnished,
    mortgage,
    ownerPhone: `+994${phoneLocal}`,
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
        {Array.from({ length: TOTAL_STEPS }, (_, i) =>
          i < step ? (
            <LinearGradient
              key={i}
              colors={brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, height: 4, borderRadius: 2 }}
            />
          ) : (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          ),
        )}
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
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {TYPE_CARDS.map((card) => (
                    <TypeCard
                      key={card.type}
                      icon={card.icon}
                      label={t(card.labelKey)}
                      tint={card.tint[mode]}
                      active={propertyType === card.type}
                      colors={colors}
                      onPress={() => setPropertyType(card.type)}
                    />
                  ))}
                </View>
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
            <View style={{ gap: 18, paddingTop: 16 }}>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, marginBottom: 2 }}>
                {t("addListing.step3Subtitle")}
              </Text>

              {/* Hero price card */}
              <TintCard tint="violet">
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: font.medium, fontSize: 13 }}>
                      {t("filters.price")}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <TextInput
                        value={price}
                        onChangeText={setPrice}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        style={{ flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 30, padding: 0 }}
                      />
                      {/* Currency pill — static, not a dropdown */}
                      <View style={{ backgroundColor: "#FFFFFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 18 }}>₼</Text>
                      </View>
                    </View>
                  </View>
                  {/* TODO: replace with clay building PNG from assets/icons */}
                  <Ionicons name="business" size={56} color={brand.violet} style={{ marginLeft: 8 }} />
                </View>
              </TintCard>

              {/* Area — full width clay field-card */}
              <NumCard
                colors={colors}
                tint="violet"
                icon={require("../assets/icons/promo/clay-ruler.png")}
                label={t("addListing.areaCardLabel")}
                value={area}
                onChangeText={setArea}
              />

              {!isLand && (
                <>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <NumCard
                      colors={colors}
                      tint="blue"
                      icon={require("../assets/icons/promo/clay-bed.png")}
                      label={t("filters.rooms")}
                      value={rooms}
                      onChangeText={setRooms}
                      style={{ flex: 1 }}
                    />
                    <NumCard
                      colors={colors}
                      tint="magenta"
                      ionicon="water"
                      label={t("filters.baths")}
                      value={baths}
                      onChangeText={setBaths}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <NumCard
                      colors={colors}
                      tint="peach"
                      icon={require("../assets/icons/promo/clay-stairs.png")}
                      label={t("filters.floor")}
                      value={floor}
                      onChangeText={setFloor}
                      style={{ flex: 1 }}
                    />
                    <NumCard
                      colors={colors}
                      tint="green"
                      icon={require("../assets/icons/promo/clay-house.png")}
                      label={t("addListing.floorTotal")}
                      value={floorTotal}
                      onChangeText={setFloorTotal}
                      style={{ flex: 1 }}
                    />
                  </View>
                </>
              )}

              {!isLand && (
                <ToggleCard
                  colors={colors}
                  ionicon="bed-outline"
                  label={t("addListing.furnishedLabel")}
                  value={furnished}
                  onValueChange={setFurnished}
                />
              )}
              <ToggleCard
                colors={colors}
                ionicon="card-outline"
                label={t("addListing.mortgageLabel")}
                value={mortgage}
                onValueChange={setMortgage}
              />

              {/* Auto-generated title — read-only live preview */}
              <TintCard tint="violet" style={{ gap: 4 }}>
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
              </TintCard>
            </View>
          )}

          {step === 4 && (
            <View style={{ gap: 18, paddingTop: 16 }}>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, marginBottom: 2 }}>
                {t("addListing.step4Subtitle")}
              </Text>

              {/* Location selector card — cascading region → Baku area (+ metro) */}
              <TintCard tint="violet" onPress={() => setLocationSheet(true)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {/* TODO: replace with clay pin PNG */}
                  <Ionicons name="location" size={26} color={brand.violet} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: font.medium, fontSize: 12 }}>
                      {t("addListing.locationLabel")}
                    </Text>
                    <Text
                      style={{
                        color: placeId ? colors.text : colors.textSecondary,
                        fontFamily: font.medium,
                        fontSize: 16,
                        marginTop: 2,
                      }}
                    >
                      {placeId ? locationLabel : t("addListing.selectLocation")}
                    </Text>
                    {metroId && (
                      <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginTop: 2 }}>
                        {t("filters.metro")}: {placeName(placeById(metroId)!, lang)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </View>
              </TintCard>

              {/* Map point — non-interactive preview when picked, invite card otherwise */}
              {picked ? (
                <>
                  <TintCard tint="violet" onPress={openMapPicker} style={{ padding: 0 }}>
                    {/* inner clip keeps the map/footer rounded without clipping the card shadow */}
                    <View style={{ borderRadius: 20, overflow: "hidden" }}>
                      <View style={{ width: "100%", height: 200 }}>
                        <MapView
                          provider={PROVIDER_DEFAULT}
                          style={{ width: "100%", height: 200 }}
                          pointerEvents="none"
                          scrollEnabled={false}
                          zoomEnabled={false}
                          rotateEnabled={false}
                          pitchEnabled={false}
                          region={{ latitude: picked.lat, longitude: picked.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                        />
                        {/* Centered clay pin overlay (TODO: clay PNG) */}
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
                          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons
                              name="location"
                              size={40}
                              color={brand.magenta}
                              style={{
                                marginBottom: 40,
                                textShadowColor: "rgba(0,0,0,0.3)",
                                textShadowRadius: 4,
                                textShadowOffset: { width: 0, height: 2 },
                              }}
                            />
                          </View>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 15 }}>{t("addListing.pointSelected")}</Text>
                          <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginTop: 2 }}>
                            {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </View>
                    </View>
                  </TintCard>
                  <SecondaryButton label={t("addListing.changePoint")} onPress={openMapPicker} />
                </>
              ) : (
                <TintCard
                  tint="violet"
                  onPress={openMapPicker}
                  style={{ height: 120, alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {/* TODO: replace with clay pin PNG */}
                  <Ionicons name="map-outline" size={36} color={brand.violet} />
                  <Text style={{ color: brand.violet, fontFamily: font.medium, fontSize: 16 }}>{t("addListing.pickOnMap")}</Text>
                  <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>{t("addListing.pickHint")}</Text>
                </TintCard>
              )}
            </View>
          )}

          {step === 5 && (
            <View style={{ gap: 18, paddingTop: 16 }}>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, marginBottom: 2 }}>
                {t("addListing.step5Subtitle")}
              </Text>

              {isResidential && (
                <Section title={t("addListing.characteristics")} colors={colors}>
                  {propertyType === "apartment" && (
                    <>
                      {buildType === "secondary" && (
                        <EnumCard
                          colors={colors}
                          tint="violet"
                          ionicon="business"
                          label={t("addListing.seriesLabel")}
                          value={buildingSeries}
                          options={SERIES_OPTS}
                          onChange={setBuildingSeries}
                          placeholder={t("addListing.notSelected")}
                        />
                      )}
                      <NumCard
                        colors={colors}
                        tint="peach"
                        ionicon="business-outline"
                        label={t("addListing.complexName")}
                        value={complexName}
                        onChangeText={setComplexName}
                        placeholder={t("addListing.complexNamePlaceholder")}
                        keyboardType="default"
                      />
                    </>
                  )}

                  {propertyType === "house" && (
                    <>
                      <EnumCard
                        colors={colors}
                        tint="violet"
                        ionicon="construct"
                        label={t("addListing.materialLabel")}
                        value={material}
                        options={MATERIAL_OPTS}
                        onChange={setMaterial}
                        placeholder={t("addListing.notSelected")}
                      />
                      <NumCard
                        colors={colors}
                        tint="green"
                        ionicon="calendar"
                        label={t("addListing.builtYear")}
                        value={builtYear}
                        onChangeText={setBuiltYear}
                        placeholder="2020"
                      />
                    </>
                  )}

                  <EnumCard
                    colors={colors}
                    tint="blue"
                    ionicon="brush"
                    label={t("addListing.renovationLabel")}
                    value={renovation}
                    options={RENOVATION_OPTS}
                    onChange={setRenovation}
                    placeholder={t("addListing.notSelected")}
                  />
                  <EnumCard
                    colors={colors}
                    tint="magenta"
                    ionicon="flame"
                    label={t("addListing.heatingLabel")}
                    value={heating}
                    options={HEATING_OPTS}
                    onChange={setHeating}
                    placeholder={t("addListing.notSelected")}
                  />
                </Section>
              )}

              {propertyType === "land" && (
                <Section title={t("addListing.landCharacteristics")} colors={colors}>
                  <EnumCard
                    colors={colors}
                    tint="green"
                    ionicon="compass"
                    label={t("addListing.landPurposeLabel")}
                    value={landPurpose}
                    options={LAND_PURPOSE_OPTS}
                    onChange={setLandPurpose}
                    placeholder={t("addListing.notSelected")}
                  />
                  <Field label={t("addListing.utilitiesGroupLabel")} colors={colors}>
                    <ToggleCard colors={colors} ionicon="flame" label={t("addListing.utilGas")} value={utilGas} onValueChange={setUtilGas} />
                    <ToggleCard colors={colors} ionicon="water" label={t("addListing.utilWater")} value={utilWater} onValueChange={setUtilWater} />
                    <ToggleCard colors={colors} ionicon="flash" label={t("addListing.utilElectricity")} value={utilElectricity} onValueChange={setUtilElectricity} />
                    <ToggleCard colors={colors} ionicon="water-outline" label={t("addListing.utilSewage")} value={utilSewage} onValueChange={setUtilSewage} />
                  </Field>
                  <ToggleCard colors={colors} ionicon="car" label={t("addListing.roadAccess")} value={roadAccess} onValueChange={setRoadAccess} />
                </Section>
              )}

              {propertyType === "object" && (
                <Section title={t("addListing.commercialCharacteristics")} colors={colors}>
                  <EnumCard
                    colors={colors}
                    tint="violet"
                    ionicon="storefront"
                    label={t("addListing.commercialTypeLabel")}
                    value={commercialType}
                    options={COMMERCIAL_OPTS}
                    onChange={setCommercialType}
                    placeholder={t("addListing.notSelected")}
                  />
                  <ToggleCard colors={colors} ionicon="log-in" label={t("addListing.separateEntrance")} value={separateEntrance} onValueChange={setSeparateEntrance} />
                  <ToggleCard colors={colors} ionicon="storefront-outline" label={t("addListing.shopfront")} value={shopfront} onValueChange={setShopfront} />
                </Section>
              )}

              {isRent && isResidential && (
                <TintCard tint="violet" style={{ gap: 12 }}>
                  <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 16 }}>{t("addListing.rentConditions")}</Text>
                  <NumCard
                    colors={colors}
                    tint="violet"
                    ionicon="cash"
                    label={t("addListing.depositLabel")}
                    value={deposit}
                    onChangeText={setDeposit}
                    placeholder="0"
                  />
                  {/* Commission — ONE card: negotiable toggle + conditional % (logic unchanged) */}
                  <TintCard tint="violet">
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Ionicons name="calculator" size={26} color={tints.violet.shadow} />
                      <Text style={{ flex: 1, color: colors.textSecondary, fontFamily: font.medium, fontSize: 12 }}>
                        {t("addListing.commissionAgentLabel")}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <Text style={{ color: colors.text, fontFamily: font.medium, fontSize: 14 }}>
                        {t("addListing.commissionNegotiableLabel")}
                      </Text>
                      <ClayToggle value={commissionNegotiable} onValueChange={setCommissionNegotiable} />
                    </View>
                    {commissionNegotiable ? (
                      <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 10 }}>
                        {t("addListing.commissionNegotiableHint")}
                      </Text>
                    ) : (
                      <View style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <TextInput
                            value={commissionPercent}
                            onChangeText={(txt) => {
                              const digits = txt.replace(/[^0-9]/g, "");
                              if (digits === "") return setCommissionPercent("");
                              const n = parseInt(digits, 10);
                              setCommissionPercent(n > 100 ? "100" : String(n));
                            }}
                            keyboardType="numeric"
                            placeholder={t("addListing.commissionPercentPlaceholder")}
                            placeholderTextColor={colors.textSecondary}
                            style={{ flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 20, padding: 0, backgroundColor: "transparent" }}
                          />
                          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 20 }}>%</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginTop: 4 }}>
                          {t("addListing.commissionPercentHint")}
                        </Text>
                      </View>
                    )}
                  </TintCard>
                  <ToggleCard colors={colors} ionicon="bulb" label={t("addListing.utilitiesIncluded")} value={utilitiesIncluded} onValueChange={setUtilitiesIncluded} />
                  <ToggleCard colors={colors} ionicon="happy" label={t("addListing.kidsAllowed")} value={kidsAllowed} onValueChange={setKidsAllowed} />
                  <ToggleCard colors={colors} ionicon="paw" label={t("addListing.petsAllowed")} value={petsAllowed} onValueChange={setPetsAllowed} />
                  <NumCard colors={colors} tint="violet" ionicon="time" label={t("addListing.minTerm")} value={minTerm} onChangeText={setMinTerm} placeholder="6" />
                  <NumCard colors={colors} tint="violet" ionicon="card" label={t("addListing.prepayment")} value={prepayment} onChangeText={setPrepayment} placeholder="1" />
                </TintCard>
              )}
            </View>
          )}

          {step === 6 && (
            <View style={{ gap: 18, paddingTop: 4 }}>
              <Section title={t("addListing.step6Title")} colors={colors}>
                <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>
                  {t("addListing.comingSoon")}
                </Text>
              </Section>
            </View>
          )}

          {step === 7 && (
            <View style={{ gap: 18, paddingTop: 4 }}>
              <Field label={t("addListing.phoneLabel")} colors={colors}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontFamily: font.medium, fontSize: 15, marginRight: 6 }}>+994</Text>
                  <TextInput
                    value={phoneLocal}
                    onChangeText={(text) => setPhoneLocal(text.replace(/[^\d]/g, "").replace(/^0+/, "").slice(0, 9))}
                    placeholder=""
                    keyboardType="phone-pad"
                    maxLength={9}
                    style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 15 }}
                  />
                </View>
              </Field>

              <Field label={t("addListing.telegramLabel")} colors={colors}>
                <Input
                  colors={colors}
                  value={telegram}
                  onChangeText={setTelegram}
                  placeholder={t("addListing.telegramPlaceholder")}
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </Field>

              <Field label={t("addListing.whatsappLabel")} colors={colors}>
                <Input
                  colors={colors}
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  placeholder={t("addListing.whatsappPlaceholder")}
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
            </View>
          )}

          {step === 8 && (
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
                <SummaryRow colors={colors} label={t("addListing.phoneLabel")} value={`+994 ${phoneLocal}`} />
                {telegram.trim() !== "" && (
                  <SummaryRow colors={colors} label={t("addListing.telegramLabel")} value={telegram.trim()} />
                )}
                {whatsapp.trim() !== "" && (
                  <SummaryRow colors={colors} label={t("addListing.whatsappLabel")} value={whatsapp.trim()} />
                )}
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

      {/* Map point picker — full-screen overlay (NOT a nested modal → gestures live) */}
      <MapPickerOverlay
        visible={showMap}
        startPlaceId={placeId}
        startCoords={picked}
        onConfirm={(c) => {
          setPicked(c);
          setShowMap(false);
        }}
        onCancel={() => setShowMap(false)}
      />
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
    <View style={{ gap: 16, paddingTop: 4 }}>
      <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>{t("addListing.photosHint")}</Text>

      {/* Main uploader — large dashed clay card above the preview grid */}
      {canAddMore && (
        <TintCard
          tint="violet"
          onPress={onAdd}
          style={{
            height: 190,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: "rgba(139,63,214,0.4)",
          }}
        >
          <LinearGradient
            colors={brand.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: brand.magenta,
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <Ionicons name="camera" size={40} color="#FFFFFF" />
            <View style={{ position: "absolute", bottom: 6, right: 6 }}>
              <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            </View>
          </LinearGradient>
          <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 17, marginTop: 14 }}>
            {t("addListing.addPhoto")}
          </Text>
          <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 4 }}>
            {t("addListing.uploaderHint")}
          </Text>
        </TintCard>
      )}

      {/* Grid header — title + counter */}
      {photos.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>{t("addListing.uploadedPhotos")}</Text>
          <Text style={{ fontFamily: font.bold, fontSize: 16 }}>
            <Text style={{ color: brand.violet }}>{photos.length}</Text>
            <Text style={{ color: colors.textSecondary }}>/10</Text>
          </Text>
        </View>
      )}

      {/* Drag-to-reorder grid. Drag only from the photo (Sortable.Handle) — the
          remove/cover overlays sit outside the handle so taps reach them. */}
      {photos.length > 0 && (
        <Sortable.Grid
          columns={3}
          data={photos}
          keyExtractor={(p) => p.uri}
          customHandle
          dragActivationDelay={250}
          dragActivationFailOffset={12}
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
                  borderRadius: 16,
                  backgroundColor: "transparent",
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                {/* Handle is a direct child of the item root (keeps drag working);
                    the image rounds itself so no clipping parent is needed. */}
                <Sortable.Handle style={{ width: "100%", height: "100%" }}>
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: "100%", height: "100%", borderRadius: 16 }}
                    resizeMode="cover"
                  />
                </Sortable.Handle>

                {/* Cover badge — top-left (by identity, not index) */}
                {isCover && (
                  <LinearGradient
                    colors={brand.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="star" size={11} color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 11 }}>{t("addListing.cover")}</Text>
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
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  }}
                >
                  <Ionicons name="close" size={16} color={brand.magenta} />
                </Pressable>
              </View>
            );
          }}
        />
      )}

    </View>
  );
}

// --- Shared local form bits ---
function TypeCard({
  icon,
  label,
  tint,
  active,
  colors,
  onPress,
}: {
  icon: number;
  label: string;
  tint: string;
  active: boolean;
  colors: Theme;
  onPress: () => void;
}) {
  const press = usePressScale(0.96);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ width: "48%" }}>
      <Animated.View
        style={[
          {
            aspectRatio: 1.15,
            borderRadius: 20,
            backgroundColor: active ? tint : colors.card,
            borderWidth: 2,
            borderColor: active ? brand.violet : "transparent",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            paddingVertical: 16,
            shadowColor: active ? brand.violet : "#000",
            shadowOpacity: active ? 0.18 : 0.05,
            shadowRadius: active ? 12 : 6,
            shadowOffset: { width: 0, height: active ? 4 : 2 },
            elevation: active ? 4 : 1,
          },
          press.style,
        ]}
      >
        <Image source={icon} style={{ width: 52, height: 52 }} resizeMode="contain" />
        <Text numberOfLines={1} style={{ color: active ? brand.violet : colors.text, fontFamily: active ? font.bold : font.medium, fontSize: 14 }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Clay number field-card: tinted card + icon (PNG or Ionicons) + label over a
// borderless transparent numeric input that blends into the card surface.
function NumCard({
  colors,
  tint,
  icon,
  ionicon,
  label,
  value,
  onChangeText,
  placeholder = "0",
  keyboardType = "numeric",
  style,
}: {
  colors: Theme;
  tint: TintKey;
  icon?: number;
  ionicon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: "numeric" | "default";
  style?: object;
}) {
  return (
    <TintCard tint={tint} style={[{ paddingVertical: 12 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {icon != null ? (
          <Image source={icon} style={{ width: 36, height: 36 }} resizeMode="contain" />
        ) : (
          <Ionicons name={ionicon!} size={32} color={tints[tint].shadow} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontFamily: font.medium, fontSize: 12 }}>{label}</Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType={keyboardType}
            style={{ color: colors.text, fontFamily: font.bold, fontSize: 20, padding: 0, backgroundColor: "transparent" }}
          />
        </View>
      </View>
    </TintCard>
  );
}

// Clay enum field-card: tinted card + icon + label over the chosen value + a
// bottom-sheet radio list. A clay-styled sibling of EnumField (the global
// EnumPickerSheet stays untouched) — reuses the same BottomSheet primitive and
// the identical options/value/onChange contract (no forked selection logic).
function EnumCard({
  colors,
  tint,
  ionicon,
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  colors: Theme;
  tint: TintKey;
  ionicon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);
  return (
    <>
      <TintCard tint={tint} onPress={() => setOpen(true)}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name={ionicon} size={26} color={tints[tint].shadow} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: font.medium, fontSize: 12 }}>{label}</Text>
            <Text
              style={{
                color: value ? colors.text : colors.textSecondary,
                fontFamily: font.medium,
                fontSize: 16,
                marginTop: 2,
              }}
            >
              {selected ? selected.label : placeholder}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </TintCard>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 17, textAlign: "center", paddingTop: 6, paddingBottom: 10 }}>
          {label}
        </Text>
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable
              key={o.key}
              onPress={() => {
                onChange(o.key);
                setOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: active ? brand.violet : colors.text, fontFamily: active ? font.bold : font.medium, fontSize: 16 }}>
                {o.label}
              </Text>
              <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? brand.violet : colors.textSecondary} />
            </Pressable>
          );
        })}
      </BottomSheet>
    </>
  );
}

// Clay toggle field-card: tinted card + icon + label + ClayToggle (step 3).
function ToggleCard({
  colors,
  ionicon,
  label,
  value,
  onValueChange,
}: {
  colors: Theme;
  ionicon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <TintCard tint="violet" style={{ paddingVertical: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons name={ionicon} size={22} color={brand.violet} />
        <Text style={{ flex: 1, color: colors.text, fontFamily: font.semibold, fontSize: 16 }}>{label}</Text>
        <ClayToggle value={value} onValueChange={onValueChange} />
      </View>
    </TintCard>
  );
}

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
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
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
      <ClayToggle value={value} onValueChange={onValueChange} />
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
