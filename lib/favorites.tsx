import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * App-wide saved/favorites state. ONE source of truth so the heart on a
 * PropertyCard (Home, Search, …) and the Saved screen always agree — both read
 * and write the same set of listing ids. In-memory only for now; persist to
 * Supabase `favorites` (user_id, listing_id) later.
 */
type FavoritesContextValue = {
  ids: string[];
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue>({
  ids: [],
  isFavorite: () => false,
  toggle: () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, isFavorite, toggle }),
    [ids, isFavorite, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
