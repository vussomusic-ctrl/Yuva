import { createContext, useContext, ReactNode } from "react";
import { useSharedValue, SharedValue } from "react-native-reanimated";

type ScrollCtx = { scrollY: SharedValue<number> };

const ScrollContext = createContext<ScrollCtx | null>(null);

export function ScrollProvider({ children }: { children: ReactNode }) {
  const scrollY = useSharedValue(0);
  return <ScrollContext.Provider value={{ scrollY }}>{children}</ScrollContext.Provider>;
}

export function useScrollCtx() {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error("useScrollCtx must be used within ScrollProvider");
  return ctx;
}
