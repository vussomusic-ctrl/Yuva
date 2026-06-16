import { useState } from "react";
import { Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BottomSheet } from "./BottomSheet";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";

export type EnumOption = { key: string; label: string };

type Props = {
  label: string; // sheet title (wrap the trigger row in a <Field label> outside)
  value: string | null; // selected key, or null when nothing chosen
  options: EnumOption[];
  onChange: (key: string) => void;
  placeholder?: string; // shown on the row when value is null
};

/**
 * Single-select enum field: a form row showing the chosen value + chevron;
 * tapping opens a bottom sheet with a radio list. Built on the project's
 * BottomSheet (no new sheet mechanism). For premium listing enums (material,
 * renovation, heating, series, …).
 */
export default function EnumField({ label, value, options, onChange, placeholder }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 50,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: value ? colors.text : colors.textSecondary, fontFamily: font.regular, fontSize: 15 }}>
          {selected ? selected.label : placeholder ?? "—"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text
          style={{ color: colors.text, fontFamily: font.bold, fontSize: 17, textAlign: "center", paddingTop: 6, paddingBottom: 10 }}
        >
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
              <Text
                style={{ color: active ? brand.violet : colors.text, fontFamily: active ? font.bold : font.medium, fontSize: 16 }}
              >
                {o.label}
              </Text>
              <Ionicons
                name={active ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={active ? brand.violet : colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </BottomSheet>
    </>
  );
}
