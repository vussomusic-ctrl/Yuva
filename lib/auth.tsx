// Auth state for the whole app (ЗАХОД 4 — stage 1).
// Wraps Supabase auth: exposes the current session, the matching `profiles`
// row, and signUp / signIn / signOut. The `profiles` row is created by the
// `on_auth_user_created` DB trigger from signUp metadata — we NEVER insert it
// here (that would duplicate the primary key), we only read/update it.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type UserRole = "user" | "agent";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  verified: boolean;
};

export type SignUpInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

type AuthResult = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const PROFILE_COLUMNS = "id, full_name, avatar_url, phone, role, verified";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", uid)
      .single();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    let active = true;

    // Restore a persisted session on boot.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (active) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // React to sign-in / sign-out / token refresh. Keep the callback sync
    // (fire-and-forget the profile load) to avoid the documented deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) loadProfile(next.user.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({
    fullName,
    email,
    phone,
    password,
  }) => {
    // Confirm email is OFF → this returns a session immediately. The trigger
    // turns options.data into the profiles row.
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: "user",
        },
      },
    });
    return { error: error?.message ?? null };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Map a Supabase auth error message to an i18n key (auth.* namespace).
export function authErrorKey(message: string | null): string {
  if (!message) return "auth.errGeneric";
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "auth.errEmailTaken";
  if (m.includes("invalid login credentials")) return "auth.errInvalidCredentials";
  if (m.includes("password")) return "auth.errWeakPassword";
  if (m.includes("email")) return "auth.errInvalidEmail";
  return "auth.errGeneric";
}
