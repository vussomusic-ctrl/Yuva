import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { router } from "expo-router";

import { useAuth } from "./auth";
import { fetchFavoriteIds, addFavorite, removeFavorite } from "./api/favorites";

/**
 * App-wide saved/favorites state, backed by Supabase `favorites` (per-user).
 * ONE source of truth: the heart on a PropertyCard (Home/Search/…), the Detail
 * screen and the Saved list all read/write the same id set.
 *
 * - Loads the user's ids on session restore AND on fresh login (reacts to
 *   user?.id), clears to [] on logout.
 * - `toggle` is the single gate: blocks until `ready`, redirects guests to
 *   /login, then updates optimistically and rolls back the affected id on a
 *   DB error.
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
  const { user, loading: authLoading } = useAuth();

  const [ids, setIds] = useState<string[]>([]);
  // `ready` gates toggles: false while auth is restoring or favorites are
  // loading, so a tap on an outline heart can't write a ghost row before the
  // real ids arrive. Set true in BOTH resolve and reject so it never sticks.
  const [ready, setReady] = useState(false);

  // Snapshot of the latest ids for synchronous reads inside toggle (avoids a
  // stale closure without putting ids in toggle's deps).
  const idsRef = useRef<string[]>(ids);
  useEffect(() => { idsRef.current = ids; }, [ids]);

  useEffect(() => {
    // Auth still restoring the session → not ready, don't fetch or redirect.
    if (authLoading) {
      setReady(false);
      return;
    }
    // Logged out / guest → empty set, ready (so the toggle gate sends to login).
    if (!user) {
      setIds([]);
      setReady(true);
      return;
    }
    // User present (restore or fresh login). Clear last user's ids immediately,
    // then load this user's. `active` guards against an out-of-order response
    // when the user switches mid-flight.
    let active = true;
    setIds([]);
    setReady(false);
    fetchFavoriteIds(user.id)
      .then((list) => {
        if (active) {
          setIds(list);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true); // never leave hearts permanently un-tappable
      });
    return () => { active = false; };
  }, [user?.id, authLoading]);

  const toggle = useCallback(
    (id: string) => {
      if (!ready) return; // ids not loaded yet — ignore the tap
      if (!user) {
        router.push("/login"); // guest: soft redirect, tap is NOT replayed
        return;
      }

      const wasFav = idsRef.current.includes(id);

      // Optimistic, functional (fresh against concurrent toggles).
      setIds((prev) =>
        wasFav ? prev.filter((x) => x !== id) : prev.includes(id) ? prev : [...prev, id],
      );

      const op = wasFav ? removeFavorite(user.id, id) : addFavorite(user.id, id);
      op.catch(() => {
        // Roll back ONLY this id's membership (safe w.r.t. other concurrent toggles).
        setIds((prev) =>
          wasFav
            ? prev.includes(id) ? prev : [...prev, id]
            : prev.filter((x) => x !== id),
        );
      });
    },
    [ready, user],
  );

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
