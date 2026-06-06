import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { Segmented } from "../components/Segmented";
import { DEALS, DealKey } from "../lib/dealTypes";
import { PROPERTY_TYPES, PropertyTypeKey } from "../lib/propertyTypes";
import { bakuRayons } from "../lib/mock/regions";
import { useFilters, DEFAULT_FILTERS } from "../lib/filters-state";

const ROOMS = ["1", "2", "3", "4", "5+"];

const toggleIn = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

export default function FiltersModal() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { filters, apply } = useFilters();

  // Draft state — seeded from the currently active filters so reopening the
  // modal reflects what's applied. Committed to the shared store on "Göstər".
  const [dealType, setDealType] = useState<DealKey>(filters.dealType);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(filters.propertyTypes);
  const [priceMin, setPriceMin] = useState(filters.priceMin);
  const [priceMax, setPriceMax] = useState(filters.priceMax);
  const [rooms, setRooms] = useState<string[]>(filters.rooms);
  const [areaMin, setAreaMin] = useState(filters.areaMin);
  const [areaMax, setAreaMax] = useState(filters.areaMax);
  const [regions, setRegions] = useState<string[]>(filters.regions);
  const [floorMin, setFloorMin] = useState(filters.floorMin);
  const [floorMax, setFloorMax] = useState(filters.floorMax);
  const [furnished, setFurnished] = useState(filters.furnished);
  const [mortgage, setMortgage] = useState(filters.mortgage);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/search"));

  const applyAndClose = () => {
    apply({
      dealType,
      propertyTypes: propertyTypes as PropertyTypeKey[],
      priceMin,
      priceMax,
      rooms,
      areaMin,
      areaMax,
      regions,
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
    setPriceMin("");
    setPriceMax("");
    setRooms([]);
    setAreaMin("");
    setAreaMax("");
    setRegions([]);
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
            fontSize: 18,
            fontWeight: "700",
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
            <Text style={{ color: brand.violet, fontSize: 15, fontWeight: "600" }}>{t("filters.clear")}</Text>
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

        {/* Region / district */}
        <Section title={t("filters.region")} colors={colors}>
          <ChipWrap>
            {bakuRayons.map((r) => (
              <FilterChip
                key={r}
                label={r}
                active={regions.includes(r)}
                onPress={() => setRegions((a) => toggleIn(a, r))}
                colors={colors}
              />
            ))}
          </ChipWrap>
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
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>{t("filters.apply")}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, colors, children }: { title: string; colors: Theme; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{title}</Text>
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
      <Text style={{ color: active ? "#FFFFFF" : colors.text, fontSize: 13, fontWeight: "600" }}>{label}</Text>
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
          style={{ color: colors.text, fontSize: 15 }}
        />
      </View>
      <View style={box}>
        <TextInput
          value={maxVal}
          onChangeText={onMax}
          placeholder={maxPh}
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
          style={{ color: colors.text, fontSize: 15 }}
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
