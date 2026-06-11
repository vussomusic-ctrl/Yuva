import { View } from "react-native";

import { SegmentedControl } from "./SegmentedControl";
import { DEALS, DealKey } from "../lib/dealTypes";

export type { DealKey } from "../lib/dealTypes";

type Props = {
  value: DealKey;
  onChange: (k: DealKey) => void;
};

/**
 * Deal-type segment (Satılır / Kirayə) — a thin wrapper over SegmentedControl.
 * Keeps its own horizontal margin so Home & Search don't need to wrap it.
 */
export function DealTypeChips({ value, onChange }: Props) {
  return (
    <View style={{ marginHorizontal: 16 }}>
      <SegmentedControl items={DEALS} value={value} onChange={(k) => onChange(k as DealKey)} />
    </View>
  );
}
