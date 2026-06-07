import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Tiny shared store to hand a picked map coordinate from the Map Picker screen
 * back to the (still-mounted) Add Listing form — expo-router's `back()` can't
 * return a value, and we must NOT remount Add Listing (would lose its form state).
 *
 * Lifecycle: Add Listing calls `clear()` once on mount (start of a new listing);
 * Map Picker calls `setPicked()` then `router.back()`; Add Listing reads `picked`
 * directly. Going to the picker and back does NOT remount Add Listing, so the
 * pick is never cleared on focus/return.
 */
export type Coords = { lat: number; lng: number };

type MapPickContextValue = {
  picked: Coords | null;
  setPicked: (c: Coords) => void;
  clear: () => void;
};

const MapPickContext = createContext<MapPickContextValue>({
  picked: null,
  setPicked: () => {},
  clear: () => {},
});

export function MapPickProvider({ children }: { children: React.ReactNode }) {
  const [picked, setPickedState] = useState<Coords | null>(null);

  const setPicked = useCallback((c: Coords) => setPickedState(c), []);
  const clear = useCallback(() => setPickedState(null), []);

  const value = useMemo<MapPickContextValue>(() => ({ picked, setPicked, clear }), [picked, setPicked, clear]);

  return <MapPickContext.Provider value={value}>{children}</MapPickContext.Provider>;
}

export function useMapPick() {
  return useContext(MapPickContext);
}
