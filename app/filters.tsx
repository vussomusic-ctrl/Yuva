import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Segmented } from "../components/Segmented";
import { LocationFilterSheet } from "../components/LocationFilterSheet";
import { DEALS, DealKey } from "../lib/dealTypes";
import { PROPERTY_TYPES, PropertyTypeKey } from "../lib/propertyTypes";
import { BUILD_TYPES, BuildKey } from "../lib/buildTypes";
import { ROOMS } from "../lib/roomTypes";
import { placeById, placeName } from "../lib/places";
import { useLanguage } from "../lib/i18n/languages";
import { useFilters, DEFAULT_FILTERS } from "../lib/filters-state";

const BATHS = ["1", "2", "3", "4+"];

const toggleIn = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

export default function FiltersModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { current: lang } = useLanguage();
  const { filters, apply } = useFilters();

  // Draft state — seeded from the currently active filters so reopening the
  // modal reflects what's applied. Committed to the shared store on "Göstər".
  const [dealType, setDealType] = useState<DealKey>(filters.dealType);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(filters.propertyTypes);
  const [buildType, setBuildType] = useState<BuildKey | null>(filters.buildType);
  const [priceMin, setPriceMin] = useState(filters.priceMin);
  const [priceMax, setPriceMax] = useState(filters.priceMax);
  const [rooms, setRooms] = useState<string[]>(filters.rooms);
  const [baths, setBaths] = useState<string[]>(filters.baths);
  const [areaMin, setAreaMin] = useState(filters.areaMin);
  const [areaMax, setAreaMax] = useState(filters.areaMax);
  const [regions, setRegions] = useState<string[]>(filters.regions);
  const [metro, setMetro] = useState<string[]>(filters.metro);
  const [floorMin, setFloorMin] = useState(filters.floorMin);
  const [floorMax, setFloorMax] = useState(filters.floorMax);
  const [furnished, setFurnished] = useState(filters.furnished);
  const [mortgage, setMortgage] = useState(filters.mortgage);
  const [locOpen, setLocOpen] = useState(false);

  const locCount = regions.length + metro.length;
  const locSummary =
    locCount === 0
      ? t("location.any")
      : (() => {
          const first = placeById(regions[0] ?? metro[0]);
          const name = first ? placeName(first, lang) : "";
          return locCount > 1 ? `${name} +${locCount - 1}` : name;
        })();

  const close = () => (router.canGoBack() ? router.back() : router.replace("/search"));

  const applyAndClose = () => {
    apply({
      dealType,
      propertyTypes: propertyTypes as PropertyTypeKey[],
      buildType,
      priceMin,
      priceMax,
      rooms,
      baths,
      areaMin,
      areaMax,
      regions,
      metro,
      floorMin,
      floorMax,
      furnished,
      mortgage,
    });
    close();
  };

  // Clear resets the narrowing filters (keeps the chosen deal type) and applies
  // immediately, so the underlying Search list returns to showing everything.
  const clearAll = () => {
    setPropertyTypes([]);
    setBuildType(null);
    setPriceMin("");
    setPriceMax("");
    setRooms([]);
    setBaths([]);
    setAreaMin("");
    setAreaMax("");
    setRegions([]);
    setMetro([]);
    setFloorMin("");
    setFloorMax("");
    setFurnished(false);
    setMortgage(false);
    apply({ ...DEFAULT_FILTERS, dealType });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      {/* Header: X (left) · title (center) · Clear (right) — no logo */}
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
          {t("filters.title")}
        </Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}
        >
          <Pressable onPress={close} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Pressable onPress={clearAll} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 15 }}>{t("filters.clear")}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 24 }}
      >
        {/* Deal type */}
        <Section title={t("filters.dealType")} colors={colors}>
          <Segmented
            options={DEALS.map((d) => ({ key: d.key, label: t(d.labelKey) }))}
            value={dealType}
            onChange={(k) => setDealType(k as DealKey)}
          />
        </Section>

        {/* Property type */}
        <Section title={t("filters.propertyType")} colors={colors}>
          <ChipWrap>
            {PROPERTY_TYPES.map((p) => (
              <FilterChip
                key={p.key}
                label={t(p.labelKey)}
                active={propertyTypes.includes(p.key)}
                onPress={() => setPropertyTypes((a) => toggleIn(a, p.key))}
                colors={colors}
              />
            ))}
          </ChipWrap>
        </Section>

        {/* Building type (single-select; tap active to reset to "any") */}
        <Section title={t("filters.buildType")} colors={colors}>
          <ChipWrap>
            {BUILD_TYPES.map((b) => (
              <FilterChip
                key={b.key}
                label={t(b.labelKey)}
                active={buildType === b.key}
                onPress={() => setBuildType((cur) => (cur === b.key ? null : b.key))}
                colors={colors}
              />
            ))}
          </ChipWrap>
        </Section>

        {/* Price */}
        <Section title={t("filters.price")} colors={colors}>
          <RangeRow
            colors={colors}
            minVal={priceMin}
            maxVal={priceMax}
            onMin={setPriceMin}
            onMax={setPriceMax}
            minPh={t("filters.min")}
            maxPh={t("filters.max")}
          />
        </Section>

        {/* Rooms */}
        <Section title={t("filters.rooms")} colors={colors}>
          <ChipWrap>
            {ROOMS.map((r) => (
              <FilterChip
                key={r}
                label={r}
                active={rooms.includes(r)}
                onPress={() => setRooms((a) => toggleIn(a, r))}
                colors={colors}
              />
            ))}
          </ChipWrap>
        </Section>

        {/* Bathrooms */}
        <Section title={t("filters.baths")} colors={colors}>
          <ChipWrap>
            {BATHS.map((b) => (
              <FilterChip
                key={b}
                label={b}
                active={baths.includes(b)}
                onPress={() => setBaths((a) => toggleIn(a, b))}
                colors={colors}
              />
            ))}
          </ChipWrap>
        </Section>

        {/* Area */}
        <Section title={t("filters.area")} colors={colors}>
          <RangeRow
            colors={colors}
            minVal={areaMin}
            maxVal={areaMax}
            onMin={setAreaMin}
            onMax={setAreaMax}
            minPh={t("filters.min")}
            maxPh={t("filters.max")}
          />
        </Section>

        {/* Location — opener + summary chips (cascading sheet) */}
        <Section title={t("location.label")} colors={colors}>
          <Pressable
            onPress={() => setLocOpen(true)}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              numberOfLines={1}
              style={{ flex: 1, color: locCount ? colors.text : colors.textSecondary, fontFamily: font.regular, fontSize: 15 }}
            >
              {locSummary}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Pressable>

          {locCount > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {regions.map((id) => {
                const p = placeById(id);
                const whole = p?.kind === "area" && p.type === "rayon";
                return (
                  <LocChip
                    key={`r-${id}`}
                    label={p ? placeName(p, lang) : id}
                    note={whole ? t("location.wholeRayon") : undefined}
                    colors={colors}
                    onRemove={() => setRegions((a) => a.filter((x) => x !== id))}
                  />
                );
              })}
              {metro.map((id) => {
                const p = placeById(id);
                return (
                  <LocChip
                    key={`m-${id}`}
                    label={p ? placeName(p, lang) : id}
                    note={t("filters.metro")}
                    colors={colors}
                    onRemove={() => setMetro((a) => a.filter((x) => x !== id))}
                  />
                );
              })}
            </View>
          )}
        </Section>

        {/* Floor */}
        <Section title={t("filters.floor")} colors={colors}>
          <RangeRow
            colors={colors}
            minVal={floorMin}
            maxVal={floorMax}
            onMin={setFloorMin}
            onMax={setFloorMax}
            minPh={t("filters.min")}
            maxPh={t("filters.max")}
          />
        </Section>

        {/* Toggles */}
        <ToggleRow
          colors={colors}
          label={t("filters.furnished")}
          value={furnished}
          onValueChange={setFurnished}
        />
        <ToggleRow
          colors={colors}
          label={t("filters.mortgage")}
          value={mortgage}
          onValueChange={setMortgage}
        />
      </ScrollView>

      {/* Sticky apply (PRIMARY brand gradient) */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <Pressable onPress={applyAndClose} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
          <LinearGradient
            colors={brand.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 17 }}>{t("filters.apply")}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <LocationFilterSheet
        visible={locOpen}
        onClose={() => setLocOpen(false)}
        regions={regions}
        metro={metro}
        onApply={(r, m) => {
          setRegions(r);
          setMetro(m);
        }}
        lang={lang}
      />
    </SafeAreaView>
  );
}

function LocChip({
  label,
  note,
  colors,
  onRemove,
}: {
  label: string;
  note?: string;
  colors: Theme;
  onRemove: () => void;
}) {
  return (
    <Pressable
      onPress={onRemove}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: brand.violet,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: 13 }}>
        {label}
        {note ? ` · ${note}` : ""}
      </Text>
      <Ionicons name="close" size={14} color="#FFFFFF" />
    </Pressable>
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

function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}

function FilterChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: active ? brand.violet : colors.card,
        borderWidth: 1,
        borderColor: active ? brand.violet : colors.border,
      }}
    >
      <Text style={{ color: active ? "#FFFFFF" : colors.text, fontFamily: font.semibold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function RangeRow({
  colors,
  minVal,
  maxVal,
  onMin,
  onMax,
  minPh,
  maxPh,
}: {
  colors: Theme;
  minVal: string;
  maxVal: string;
  onMin: (s: string) => void;
  onMax: (s: string) => void;
  minPh: string;
  maxPh: string;
}) {
  const box = {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    justifyContent: "center" as const,
  };
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={box}>
        <TextInput
          value={minVal}
          onChangeText={onMin}
          placeholder={minPh}
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
          style={{ color: colors.text, fontFamily: font.regular, fontSize: 15 }}
        />
      </View>
      <View style={box}>
        <TextInput
          value={maxVal}
          onChangeText={onMax}
          placeholder={maxPh}
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
          style={{ color: colors.text, fontFamily: font.regular, fontSize: 15 }}
        />
      </View>
    </View>
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
