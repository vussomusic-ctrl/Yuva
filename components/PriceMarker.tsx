import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Marker } from "react-native-maps";

import { brand } from "../lib/theme/colors";

/** Compact pin label: 245000 → "245k ₼", 1400 → "1400 ₼". */
export const pinPrice = (azn: number) => (azn >= 10000 ? `${Math.round(azn / 1000)}k ₼` : `${azn} ₼`);

type Props = {
  coordinate: { latitude: number; longitude: number };
  price: number;
  active: boolean;
  onPress: () => void;
};

/**
 * Map price pin (violet, magenta when active). RN-Maps caches the marker as a
 * bitmap, so a color change wouldn't repaint — we flip tracksViewChanges on for
 * ~400ms whenever `active` changes, then freeze again for performance.
 */
export function PriceMarker({ coordinate, price, active, onPress }: Props) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const id = setTimeout(() => setTracking(false), 400);
    return () => clearTimeout(id);
  }, [active]);

  return (
    <Marker coordinate={coordinate} onPress={onPress} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={tracking}>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: active ? brand.magenta : brand.violet,
          borderWidth: 1.5,
          borderColor: "#FFFFFF",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 3,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>{pinPrice(price)}</Text>
      </View>
    </Marker>
  );
}
